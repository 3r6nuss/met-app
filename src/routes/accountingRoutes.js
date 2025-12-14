import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

const isBuchhaltungOrAdmin = (req, res, next) => {
    if (req.isAuthenticated() && (req.user.role === 'Buchhaltung' || req.user.role === 'Administrator')) {
        return next();
    }
    return res.status(403).json({ error: 'Unauthorized' });
};

// PAY LOGS
router.post('/accounting/pay', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const { logIds, status } = req.body;
        const targetStatus = status || 'paid';
        const db = await getDb();
        await db.run('BEGIN TRANSACTION');
        const placeholders = logIds.map(() => '?').join(',');
        await db.run(`UPDATE logs SET status = ? WHERE timestamp IN (${placeholders})`, targetStatus, ...logIds);
        await db.run('COMMIT');
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error paying logs:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// CLOSE WEEK
router.post('/accounting/close-week', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const { weekEnd, employeeName } = req.body;
        const db = await getDb();
        await db.run(`UPDATE logs SET status = 'outstanding' WHERE depositor = ? AND status = 'pending' AND timestamp <= ?`, employeeName, weekEnd);
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error closing week:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// PAY OUTSTANDING
router.post('/accounting/pay-outstanding', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const { employeeName } = req.body;
        const db = await getDb();
        await db.run(`UPDATE logs SET status = 'paid' WHERE depositor = ? AND status = 'outstanding'`, employeeName);
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error paying outstanding:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// BALANCES
router.get('/accounting/balances', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const db = await getDb();
        const rows = await db.all(`SELECT depositor, SUM(price * quantity) as balance FROM logs WHERE status = 'outstanding' GROUP BY depositor`);
        const balances = {};
        rows.forEach(row => balances[row.depositor] = row.balance);
        res.json(balances);
    } catch (error) {
        console.error("Error fetching balances:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// USER BALANCE
router.get('/user/balance', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    try {
        const db = await getDb();
        const result = await db.get(`SELECT SUM(price * quantity) as balance FROM logs WHERE depositor = ? AND status = 'outstanding'`, req.user.employeeName);
        res.json({ balance: result.balance || 0 });
    } catch (error) {
        console.error("Error fetching balance:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// EMPLOYEE INVENTORY
router.get('/employee-inventory', async (req, res) => {
    try {
        const db = await getDb();
        const inventory = await db.all('SELECT * FROM employee_inventory');
        res.json(inventory);
    } catch (error) {
        console.error("Error fetching employee inventory:", error);
        res.status(500).json({ error: "Database error" });
    }
});

router.post('/employee-inventory/manual', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const { employeeName, itemId, quantity } = req.body;
        const db = await getDb();
        if (quantity <= 0) {
            await db.run('DELETE FROM employee_inventory WHERE employee_name = ? AND item_id = ?', employeeName, itemId);
        } else {
            await db.run('INSERT OR REPLACE INTO employee_inventory (employee_name, item_id, quantity) VALUES (?, ?, ?)', employeeName, itemId, quantity);
        }
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating employee inventory:", error);
        res.status(500).json({ error: "Database error" });
    }
});

router.post('/employee-inventory/consume', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator' && req.user.role !== 'Lager')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { employeeName, items } = req.body;
        const db = await getDb();
        await db.run('BEGIN TRANSACTION');
        for (const item of items) {
            const current = await db.get('SELECT quantity FROM employee_inventory WHERE employee_name = ? AND item_id = ?', employeeName, item.itemId);
            if (!current || current.quantity < item.quantity) throw new Error(`Insufficient stock for item ${item.itemId}`);
            const newQty = current.quantity - item.quantity;
            if (newQty <= 0) {
                await db.run('DELETE FROM employee_inventory WHERE employee_name = ? AND item_id = ?', employeeName, item.itemId);
            } else {
                await db.run('UPDATE employee_inventory SET quantity = ? WHERE employee_name = ? AND item_id = ?', newQty, employeeName, item.itemId);
            }
        }
        await db.run('COMMIT');
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error consuming ingredients:", error);
        res.status(500).json({ error: error.message || "Database error" });
    }
});

// RECIPES
router.get('/recipes', async (req, res) => {
    try {
        const db = await getDb();
        const recipes = await db.all('SELECT * FROM recipes');
        const structuredRecipes = {};
        for (const r of recipes) {
            if (!structuredRecipes[r.product_id]) structuredRecipes[r.product_id] = { inputs: [] };
            structuredRecipes[r.product_id].inputs.push({ id: r.ingredient_id, quantity: r.quantity });
        }
        res.json(structuredRecipes);
    } catch (error) {
        console.error("Error fetching recipes:", error);
        res.status(500).json({ error: "Database error" });
    }
});

router.post('/recipes', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const { productId, inputs } = req.body;
        const db = await getDb();
        await db.run('BEGIN TRANSACTION');
        await db.run('DELETE FROM recipes WHERE product_id = ?', productId);
        const stmt = await db.prepare('INSERT INTO recipes (product_id, ingredient_id, quantity) VALUES (?, ?, ?)');
        for (const input of inputs) await stmt.run(productId, input.id, input.quantity);
        await stmt.finalize();
        await db.run('COMMIT');
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving recipe:", error);
        res.status(500).json({ error: "Database error" });
    }
});

router.delete('/recipes/:productId', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const { productId } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM recipes WHERE product_id = ?', productId);
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting recipe:", error);
        res.status(500).json({ error: "Database error" });
    }
});

export default router;
