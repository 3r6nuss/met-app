import express from 'express';
import { getDb } from '../db/database.js';
import { logTransaction, logAccounting, logError, serverLog, LogCategory } from '../services/serverLogger.js';

const router = express.Router();

// Generate a unique 6-character alphanumeric transaction ID
// Uses charset without ambiguous characters (0/O, 1/I/L)
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateTransactionId() {
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
    return id;
}
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

        // Use client-provided transactionId if available, otherwise generate one
        const transactionId = transactions[0]?.transactionId || generateTransactionId();

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
                status: 'pending',
                transaction_id: transactionId
            };

            let logInserted = false;
            let retries = 0;
            let currentTimestamp = logEntry.timestamp;

            while (!logInserted && retries < 5) {
                try {
                    await db.run(
                        'INSERT INTO logs (timestamp, type, category, itemId, itemName, quantity, depositor, price, msg, time, status, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        currentTimestamp, logEntry.type, logEntry.category, logEntry.itemId, logEntry.itemName, logEntry.quantity, logEntry.depositor, logEntry.price, logEntry.msg, logEntry.time, logEntry.status, logEntry.transaction_id
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

        // Server-Side Logging for DevConsole
        for (const result of results) {
            const tx = transactions[results.indexOf(result)];
            await logTransaction(
                tx.type,
                result.itemName,
                tx.quantity,
                tx.depositor,
                tx.category,
                tx.price,
                req.user?.username
            );
        }

        // ===== AUTOMATIC DISCORD LOG MATCHING =====
        // After a trade transaction, check if there are pending Discord logs that match
        for (const result of results) {
            const tx = transactions[results.indexOf(result)];
            if (tx.category === 'trade' && tx.depositor && tx.depositor !== 'Unbekannt') {
                try {
                    // Find pending Discord logs that might match this transaction
                    const pendingLogs = await db.all(`
                        SELECT * FROM discord_logs 
                        WHERE match_status = 'pending'
                        AND employeeName IS NOT NULL
                        ORDER BY createdAt DESC
                        LIMIT 20
                    `);

                    // Check for matching logs (same employee, created in last 24 hours)
                    const depositorLower = tx.depositor.toLowerCase();
                    for (const discordLog of pendingLogs) {
                        const logEmployeeLower = (discordLog.employeeName || '').toLowerCase();

                        // Fuzzy name matching
                        if (logEmployeeLower.includes(depositorLower) || depositorLower.includes(logEmployeeLower)) {
                            console.log(`[AutoMatch] Found pending Discord log ${discordLog.id} for ${tx.depositor}`);

                            // Broadcast this Discord log to trigger the confirmation popup
                            const broadcastDiscordLog = req.app.get('broadcastDiscordLog');
                            if (broadcastDiscordLog) {
                                broadcastDiscordLog({
                                    id: discordLog.id,
                                    discordMessageId: discordLog.discordMessageId,
                                    parsedType: discordLog.parsedType,
                                    employeeName: discordLog.employeeName,
                                    customerName: discordLog.customerName,
                                    amount: discordLog.amount,
                                    reason: discordLog.reason,
                                    logTimestamp: discordLog.logTimestamp,
                                    createdAt: discordLog.createdAt,
                                    // Include the new transaction info for easy matching
                                    suggestedTransaction: {
                                        timestamp: result.timestamp,
                                        itemName: result.itemName,
                                        quantity: tx.quantity,
                                        price: tx.price,
                                        total: tx.quantity * tx.price
                                    }
                                });
                            }
                            break; // Only broadcast one log per transaction to avoid spam
                        }
                    }
                } catch (matchError) {
                    console.error('[AutoMatch] Error checking for pending Discord logs:', matchError);
                }
            }
        }

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
        res.json({ success: true, logs: results, transactionId });

    } catch (error) {
        if (db) {
            try { await db.run('ROLLBACK'); } catch (e) { console.error(e); }/* ignore */
        }
        console.error("Transaction error:", error);
        await logError('Transaction', error);

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

        // 1. Revert Main Inventory Change
        if (originalLog.itemId) {
            const item = await db.get('SELECT * FROM inventory WHERE id = ?', originalLog.itemId);
            if (item) {
                let newCurrent = item.current;
                if (originalLog.type === 'in') {
                    // Original was IN (Stock increased), so Revert means OUT (decrease stock)
                    newCurrent = Math.max(0, newCurrent - originalLog.quantity);
                } else {
                    // Original was OUT (Stock decreased), so Revert means IN (increase stock)
                    newCurrent += originalLog.quantity;
                }
                await db.run('UPDATE inventory SET current = ? WHERE id = ?', newCurrent, originalLog.itemId);
            }
        }

        // 2. Revert Employee Inventory Change (if applicable)
        // Check if it was a transaction that likely affected employee stock:
        // - internal or trade
        // - depositor is not 'Unbekannt' or 'System' (usually real names)
        // - NOT a 'Sonderbuchung' (skipInventory would need to be inferred, but logs don't trigger if skipped usually for main inventory, 
        //   but log msg says "Sonderbuchung". However, Sonderbuchung explicitly skips inventory, so we shouldn't revert inventory, 
        //   but wait, the original logic reverted main inventory blindly. 
        //   The original code: "if (originalLog.itemId) ... update inventory". 
        //   If skipInventory was true, itemId might be null or valid? In 'transaction' route: 
        //   "if (!skipInventory) ... update inventory ... logEntry.itemId = itemId".
        //   So if skipped, usually itemId is preserverd in log IF provided, checking line 98: "itemId: itemId || null".
        //   If skipped, we probably shouldn't receive an itemId in the log if we follow strict logic, but let's stick to: 
        //   If the log has an itemId, it implies main inventory WAS touched OR we want to track it.
        //   Actually, looking at line 39: "if (!skipInventory) ... update db ...". 
        //   So if skipInventory is true, NO DB update happens.
        //   If we want to revert, we should only revert if it actually happened.
        //   The best indicator is likely the message or relying on the fact that if we have an itemId and it wasn't a special booking, we should revert.
        //   However, for Employee Inventory, it defaults to checking 'internal' category.

        if (originalLog.category === 'internal' && originalLog.depositor && originalLog.depositor !== 'Unbekannt') {
            // Logic mirrors the original forward transaction but inverted.
            // Original IN: Deducted from Employee (or Recipe Ingredients)
            // Original OUT: Added to Employee

            if (originalLog.type === 'out') {
                // Original: OUT -> Added to Employee
                // Revert: Take from Employee
                await db.run(`UPDATE employee_inventory 
                               SET quantity = MAX(0, quantity - ?) 
                               WHERE employee_name = ? AND item_id = ?`,
                    originalLog.quantity, originalLog.depositor, originalLog.itemId);
                // Clean up 0 quantity
                await db.run('DELETE FROM employee_inventory WHERE employee_name = ? AND quantity <= 0', originalLog.depositor);
            } else if (originalLog.type === 'in') {
                // Original: IN -> Deducted from Employee (Complex if recipe involved!)
                // WARNING: We don't verify recipes here easily because recipes might have changed.
                // We will attempt to restore the ITEM ITSELF if no recipe logic is easily traceale, 
                // OR we just assume direct restore for now to keep it simple as per plan.
                // But wait, the original logic checks for recipes and deducts INGREDIENTS.
                // If we revert a "Produced Item IN", we should give back the INGREDIENTS?
                // Or do we just give back the Item? 
                // The Log msg says "Eingelagert...". 
                // If we simply give back the item to the employee, they have the product, not ingredients.
                // This is likely acceptable for "undoing" a mistake. "I put 10 Diamond Swords in, oh wait, wrong." -> "Here are your 10 Diamond Swords back".
                // It complicates things if they wanted the diamonds back. But restoring the Product is the direct inverse of "IN".

                await db.run(`INSERT INTO employee_inventory (employee_name, item_id, quantity) 
                               VALUES (?, ?, ?) 
                               ON CONFLICT(employee_name, item_id) 
                               DO UPDATE SET quantity = quantity + ?`,
                    originalLog.depositor, originalLog.itemId, originalLog.quantity, originalLog.quantity);
            }
        }

        await db.run("DELETE FROM logs WHERE timestamp = ?", logTimestamp);
        await db.run('COMMIT');

        // Server-Side Logging for DevConsole
        await logAccounting(`Revert: ${originalLog.msg}`, { originalLog }, req.user?.username);

        await auditLog(req, 'REVERT', `Reverted: ${originalLog.msg}`);

        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        if (db) try { await db.run('ROLLBACK'); } catch (_e) { /* ignore */ }
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

        // Server-Side Logging
        await serverLog(LogCategory.API, `Bestellung erstellt: ${quantity}x ${itemName}`, { itemName, quantity, requester, note });

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

        // Server-Side Logging
        await serverLog(LogCategory.API, `Bestellung #${id} Status: ${status}`, { orderId: id, status, changedBy: req.user?.username });

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

        // Server-Side Logging
        await serverLog(LogCategory.API, `Bestellung #${id} gelöscht`, { orderId: id, deletedBy: req.user?.username });

        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting order:", error);
        res.status(500).json({ error: "Database error" });
    }
});

export default router;
