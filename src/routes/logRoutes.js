import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

const auditLog = async (req, action, details) => {
    if (!req.user) return;
    try {
        const db = await getDb();
        await db.run(
            'INSERT INTO audit_logs (timestamp, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            new Date().toISOString(), req.user.discordId || req.user.id, req.user.username, action, details
        );
    } catch (e) {
        console.error('Audit log error:', e);
    }
}

// GET Logs
router.get('/', async (req, res) => {
    try {
        const db = await getDb();
        const logs = await db.all('SELECT * FROM logs ORDER BY timestamp DESC');
        res.json(logs);
    } catch (error) {
        console.error("Error fetching logs:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Logs
router.post('/', async (req, res) => {
    try {
        const log = req.body;
        const db = await getDb();
        await db.run(
            'INSERT INTO logs (timestamp, type, category, itemId, itemName, quantity, depositor, price, msg, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            log.timestamp || new Date().toISOString(),
            log.type,
            log.category,
            log.itemId,
            log.itemName,
            log.quantity,
            log.depositor,
            log.price,
            log.msg,
            log.time,
            log.status || 'pending'
        );

        console.log(`[LOG CREATED] ${log.msg} by ${req.user?.username || 'Unknown'}`);

        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving log:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE Log
router.delete('/:timestamp', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { timestamp } = req.params;
        const db = await getDb();

        const log = await db.get('SELECT * FROM logs WHERE timestamp = ?', timestamp);
        if (!log) {
            return res.status(404).json({ error: 'Log not found' });
        }

        // Reverse inventory change logic moved here? Or keep it simple?
        // Logic from original server.js:
        if (log.itemId) {
            const item = await db.get('SELECT * FROM inventory WHERE id = ?', log.itemId);
            if (item) {
                let newCurrent = item.current;
                if (log.type === 'in') {
                    newCurrent = Math.max(0, newCurrent - log.quantity);
                } else {
                    newCurrent += log.quantity;
                }
                await db.run('UPDATE inventory SET current = ? WHERE id = ?', newCurrent, log.itemId);
                console.log(`[LOG DELETE REVERSAL] Reversed ${log.quantity} for item ${log.itemId}. New qty: ${newCurrent}`);
            }
        }

        await db.run('DELETE FROM logs WHERE timestamp = ?', timestamp);

        await auditLog(req, 'DELETE_LOG', `Deleted log: ${log.msg}`);
        console.log(`[LOG DELETED] ${log.msg} deleted by ${req.user.username}`);

        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting log:", error);
        res.status(500).json({ error: "Database error" });
    }
});

export default router;
