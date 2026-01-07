import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

// GET Logs
router.get('/', async (req, res) => {
    try {
        const db = await getDb();
        // Limit to 50000 as requested
        const logs = await db.all('SELECT * FROM developer_logs ORDER BY id DESC LIMIT 50000');
        res.json(logs.reverse()); // Send back in chronological order? Or reverse order? Client fliplist is fine.
        // Usually, logs are appended, so Client expects oldest first? Or newest?
        // Context.jsx does `setLogs(prev => [...prev, newLog])`. So it expects array of logs.
        // If we fetch, we usually replace the whole array.
        // Let's return Chronological for the client to render easily.
        // "ORDER BY id DESC LIMIT 50000" gets the *latest* 50000.
        // Then .reverse() to put them back in chronological order (Oldest -> Newest).
    } catch (error) {
        console.error("Error fetching developer logs:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Log
router.post('/', async (req, res) => {
    try {
        const { category, message, details, timestamp } = req.body;
        const db = await getDb();
        const detailStr = typeof details === 'object' ? JSON.stringify(details) : details;

        await db.run(
            'INSERT INTO developer_logs (timestamp, category, message, details) VALUES (?, ?, ?, ?)',
            timestamp || new Date().toISOString(), category, message, detailStr
        );

        // Optional: Prune if too many?
        // Doing a count(*) every time might be slow. Maybe 1/100 chance?
        if (Math.random() < 0.01) {
            const count = await db.get('SELECT COUNT(*) as c FROM developer_logs');
            if (count.c > 60000) { // Buffer above 50000
                // Keep only last 50000
                await db.run(`DELETE FROM developer_logs WHERE id NOT IN (SELECT id FROM developer_logs ORDER BY id DESC LIMIT 50000)`);
                console.log("Pruned developer logs");
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Error saving developer log:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// CLEAR Logs
router.delete('/', async (req, res) => {
    try {
        const db = await getDb();
        await db.run('DELETE FROM developer_logs');
        res.json({ success: true });
    } catch (error) {
        console.error("Error clearing developer logs:", error);
        res.status(500).json({ error: "Database error" });
    }
});

export default router;
