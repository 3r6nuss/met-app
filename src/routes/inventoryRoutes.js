import express from 'express';
import { getDb } from '../db/database.js';
import { broadcastUpdate } from '../../server.js'; // We will need to export broadcastUpdate from server.js

const router = express.Router();

// GET Inventory
router.get('/', async (req, res) => {
    try {
        const db = await getDb();
        const inventory = await db.all('SELECT * FROM inventory ORDER BY sortOrder ASC, id ASC');
        // Initial inventory fallback handled in frontend or simple empty check
        res.json(inventory);
    } catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Inventory (Update)
router.post('/', async (req, res) => {
    try {
        const newData = req.body;
        const db = await getDb();

        await db.run('BEGIN TRANSACTION');
        const stmt = await db.prepare('INSERT OR REPLACE INTO inventory (id, name, category, current, target, min, unit, price, image, priority, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

        let index = 0;
        for (const item of newData) {
            await stmt.run(item.id, item.name, item.category, item.current, item.target, item.min, item.unit, item.price, item.image, item.priority || null, index++);
        }

        await stmt.finalize();
        await db.run('COMMIT');

        // We need a way to trigger broadcast. 
        // Circular dependency might be an issue if we import broadcastUpdate directly from server.js if server.js imports this router.
        // Solution: Pass broadcast function to router or emit event.
        // For now, we'll assume we export a safe broadcast function or use a global/singleton event emitter.
        if (req.app.get('broadcastUpdate')) {
            req.app.get('broadcastUpdate')();
        }

        res.json({ success: true });
    } catch (error) {
        try { await db.run('ROLLBACK'); } catch (e) { }
        console.error("Error updating inventory:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// PUT Inventory Priority
router.put('/:id/priority', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { id } = req.params;
        const { priority } = req.body;
        const db = await getDb();

        await db.run('UPDATE inventory SET priority = ? WHERE id = ?', priority || null, id);

        if (req.app.get('broadcastUpdate')) {
            req.app.get('broadcastUpdate')();
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating priority:", error);
        res.status(500).json({ error: "Database error" });
    }
});

export default router;
