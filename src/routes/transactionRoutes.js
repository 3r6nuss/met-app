import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

const auditLog = async (req, action, details, debugSteps = []) => {
    if (!req.user) return;
    try {
        const db = await getDb();
        await db.run(
            'INSERT INTO audit_logs (timestamp, user_id, username, action, details, debug_log) VALUES (?, ?, ?, ?, ?, ?)',
            new Date().toISOString(), req.user.discordId || req.user.id, req.user.username, action, details, JSON.stringify(debugSteps)
        );
    } catch (e) {
        console.error('Audit log error:', e);
    }
}

// TRANSACTION HANDLER
router.post('/transaction', async (req, res) => {
    let db;
    const allDebugSteps = [];
    try {
        const body = req.body;
        const transactions = Array.isArray(body) ? body : [body];

        db = await getDb();
        await db.run('BEGIN TRANSACTION');

        const results = [];

        for (const transaction of transactions) {
            const { type, itemId, quantity, depositor, price, category, timestamp, skipInventory, itemName: providedItemName, warningIgnored } = transaction;
            const debugSteps = [];
            debugSteps.push(`Starting transaction processing for item ${itemId || providedItemName} (${type})`);

            let itemName = providedItemName;

            if (!skipInventory) {
                const item = await db.get('SELECT * FROM inventory WHERE id = ?', itemId);
                if (!item) {
                    debugSteps.push(`ERROR: Item with ID ${itemId} not found`);
                    throw new Error(`Item not found: ${itemId}`);
                }
                itemName = item.name;
                debugSteps.push(`Item found: ${itemName} (Current Stock: ${item.current})`);

                let newCurrent = item.current;
                if (type === 'in') {
                    newCurrent += quantity;
                    debugSteps.push(`IN: Increasing stock by ${quantity}. New: ${newCurrent}`);
                } else {
                    newCurrent = Math.max(0, newCurrent - quantity);
                    debugSteps.push(`OUT: Decreasing stock by ${quantity}. New: ${newCurrent}`);
                }
                await db.run('UPDATE inventory SET current = ? WHERE id = ?', newCurrent, itemId);

                if (category === 'internal' && depositor !== 'Unbekannt') {
                    debugSteps.push(`Internal transaction for ${depositor}. Updating employee inventory.`);
                    if (type === 'out') {
                        await db.run(`INSERT INTO employee_inventory (employee_name, item_id, quantity) 
                        VALUES (?, ?, ?) 
                        ON CONFLICT(employee_name, item_id) 
                        DO UPDATE SET quantity = quantity + ?`,
                            depositor, itemId, quantity, quantity);
                        debugSteps.push(`Added ${quantity} to ${depositor}'s inventory.`);
                    } else if (type === 'in') {
                        const recipeIngredients = await db.all('SELECT * FROM recipes WHERE product_id = ?', itemId);

                        if (recipeIngredients.length > 0) {
                            debugSteps.push(`Item has recipe with ${recipeIngredients.length} ingredients. Deducting from employee inventory.`);
                            for (const ing of recipeIngredients) {
                                const deductQty = ing.quantity * quantity;
                                await db.run(`UPDATE employee_inventory 
                                SET quantity = MAX(0, quantity - ?) 
                                WHERE employee_name = ? AND item_id = ?`,
                                    deductQty, depositor, ing.ingredient_id);
                                debugSteps.push(`Deducted ${deductQty} of Ingredient ID ${ing.ingredient_id} from ${depositor}.`);
                            }
                        } else {
                            await db.run(`UPDATE employee_inventory 
                            SET quantity = MAX(0, quantity - ?) 
                            WHERE employee_name = ? AND item_id = ?`,
                                quantity, depositor, itemId);
                            debugSteps.push(`No recipe. Deducted ${quantity} of ${itemName} from ${depositor}.`);
                        }
                        await db.run('DELETE FROM employee_inventory WHERE employee_name = ? AND quantity <= 0', depositor);
                    }
                }
            } else {
                debugSteps.push(`Skipping inventory update (Special Booking/Sonderbuchung).`);
            }

            const logEntry = {
                timestamp: timestamp || new Date().toISOString(),
                type,
                category,
                itemId: itemId || null,
                itemName: itemName || 'Unbekannt',
                quantity,
                depositor,
                price,
                msg: `${type === 'in' ? (category === 'trade' ? 'Gekauft' : (skipInventory ? 'Sonderbuchung' : 'Eingelagert')) : (category === 'trade' ? 'Verkauft' : 'Ausgelagert')}: ${quantity}x ${itemName} (${depositor})${warningIgnored ? ' (Warnung ignoriert)' : ''}`,
                time: new Date().toLocaleTimeString(),
                status: 'pending'
            };

            let logInserted = false;
            let retries = 0;
            let currentTimestamp = logEntry.timestamp;

            while (!logInserted && retries < 5) {
                try {
                    await db.run(
                        'INSERT INTO logs (timestamp, type, category, itemId, itemName, quantity, depositor, price, msg, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        currentTimestamp, logEntry.type, logEntry.category, logEntry.itemId, logEntry.itemName, logEntry.quantity, logEntry.depositor, logEntry.price, logEntry.msg, logEntry.time, logEntry.status
                    );
                    logInserted = true;
                    results.push(logEntry);
                    debugSteps.push(`Log entry created with timestamp ${currentTimestamp}`);
                } catch (err) {
                    if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('logs.timestamp')) {
                        const date = new Date(currentTimestamp);
                        date.setMilliseconds(date.getMilliseconds() + 1 + Math.floor(Math.random() * 10));
                        currentTimestamp = date.toISOString();
                        retries++;
                        debugSteps.push(`Timestamp collision. Retrying with ${currentTimestamp} (Attempt ${retries})`);
                    } else {
                        throw err;
                    }
                }
            }
            if (!logInserted) throw new Error("Failed to generate unique timestamp for log");

            allDebugSteps.push({ transactionIndex: transactions.indexOf(transaction), steps: debugSteps });
        }

        await db.run('COMMIT');

        if (req.user) {
            let summary = '';
            if (transactions.length > 1) {
                summary = `Batch: ${transactions.length} Items`;
            } else {
                const t = transactions[0];
                const r = results[0];
                let actionType = t.type === 'in' ? 'EINLAGERN' : 'AUSLAGERN';
                if (t.category === 'trade') actionType = t.type === 'in' ? 'EINKAUF' : 'VERKAUF';
                if (t.skipInventory) actionType = 'SONDERBUCHUNG';
                summary = `${actionType}: ${t.quantity}x ${r.itemName} (${t.depositor}) - $${t.price}`;
            }
            await auditLog(req, 'TRANSACTION', summary, allDebugSteps);
        }

        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true, logs: results });

    } catch (error) {
        if (db) {
            try { await db.run('ROLLBACK'); } catch (e) { }
        }
        console.error("Transaction error:", error);

        // Log the failure if possible
        if (req.user) {
            const failureSteps = [...allDebugSteps, { error: error.message, stack: error.stack }];
            await auditLog(req, 'TRANSACTION_FAILED', `Transaction failed: ${error.message}`, failureSteps);
        }

        res.status(500).json({ error: error.message || "Transaction failed" });
    }
});

// REVERT TRANSACTION (Super Admin)
const SUPER_ADMIN_IDS = ['823276402320998450', '690510884639866960'];
router.post('/transaction/revert', async (req, res) => {
    if (!req.isAuthenticated() || !SUPER_ADMIN_IDS.includes(req.user.discordId)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    let db;
    try {
        const { logTimestamp } = req.body;
        if (!logTimestamp) return res.status(400).json({ error: "Log timestamp required" });

        db = await getDb();
        const originalLog = await db.get('SELECT * FROM logs WHERE timestamp = ?', logTimestamp);
        if (!originalLog) return res.status(404).json({ error: "Log entry not found" });

        await db.run('BEGIN TRANSACTION');

        if (originalLog.itemId) {
            const item = await db.get('SELECT * FROM inventory WHERE id = ?', originalLog.itemId);
            if (item) {
                let newCurrent = item.current;
                if (originalLog.type === 'in') {
                    newCurrent = Math.max(0, newCurrent - originalLog.quantity);
                } else {
                    newCurrent += originalLog.quantity;
                }
                await db.run('UPDATE inventory SET current = ? WHERE id = ?', newCurrent, originalLog.itemId);
            }
        }

        await db.run("DELETE FROM logs WHERE timestamp = ?", logTimestamp);
        await db.run('COMMIT');

        await auditLog(req, 'REVERT', `Reverted: ${originalLog.msg}`);

        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        if (db) try { await db.run('ROLLBACK'); } catch (e) { }
        console.error("Revert error:", error);
        res.status(500).json({ error: error.message || "Revert failed" });
    }
});

// ORDERS
router.get('/orders', async (req, res) => {
    try {
        const db = await getDb();
        const orders = await db.all('SELECT * FROM orders ORDER BY timestamp DESC');
        res.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Database error" });
    }
});

router.post('/orders', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    try {
        const { itemName, quantity, note } = req.body;
        const requester = req.user.employeeName || req.user.username;
        const timestamp = new Date().toISOString();

        const db = await getDb();
        await db.run(
            'INSERT INTO orders (item_name, quantity, requester, status, timestamp, note) VALUES (?, ?, ?, ?, ?, ?)',
            itemName, quantity, requester, 'open', timestamp, note
        );

        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Database error" });
    }
});

router.put('/orders/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    try {
        const { id } = req.params;
        const { status } = req.body;
        const db = await getDb();
        await db.run('UPDATE orders SET status = ? WHERE id = ?', status, id);
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ error: "Database error" });
    }
});

router.delete('/orders/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM orders WHERE id = ?', id);
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting order:", error);
        res.status(500).json({ error: "Database error" });
    }
});

export default router;
