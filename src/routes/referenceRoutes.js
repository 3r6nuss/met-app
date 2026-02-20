import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

/**
 * GET /api/references
 * Returns all matched and pending discord_logs with their system log counterparts
 */
router.get('/', async (req, res) => {
    try {
        const db = await getDb();
        const references = await db.all(`
            SELECT 
                d.id,
                d.reference_id,
                d.discord_message_id,
                d.employee_name,
                d.customer_name,
                d.amount AS discord_amount,
                d.reason,
                d.parsed_type,
                d.match_status,
                d.matched_log_id,
                d.bot_reply_id,
                d.created_at,
                d.log_timestamp,
                d.discrepancy_details,
                l.type AS system_type,
                l.itemName AS system_item,
                l.quantity AS system_quantity,
                l.price AS system_price,
                l.depositor AS system_depositor,
                l.category AS system_category,
                l.timestamp AS system_timestamp
            FROM discord_logs d
            LEFT JOIN logs l ON d.matched_log_id = l.timestamp
            WHERE d.reference_id IS NOT NULL
            ORDER BY d.created_at DESC
        `);

        res.json(references);
    } catch (error) {
        console.error('[References] Error fetching:', error);
        res.status(500).json({ error: 'Failed to fetch references' });
    }
});

/**
 * GET /api/references/search?id=XYZ
 * Search by reference ID (partial match)
 */
router.get('/search', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.json([]);

        const db = await getDb();
        const results = await db.all(`
            SELECT 
                d.id,
                d.reference_id,
                d.discord_message_id,
                d.employee_name,
                d.customer_name,
                d.amount AS discord_amount,
                d.reason,
                d.parsed_type,
                d.match_status,
                d.matched_log_id,
                d.bot_reply_id,
                d.created_at,
                d.log_timestamp,
                d.discrepancy_details,
                l.type AS system_type,
                l.itemName AS system_item,
                l.quantity AS system_quantity,
                l.price AS system_price,
                l.depositor AS system_depositor,
                l.category AS system_category,
                l.timestamp AS system_timestamp
            FROM discord_logs d
            LEFT JOIN logs l ON d.matched_log_id = l.timestamp
            WHERE d.reference_id LIKE ?
            ORDER BY d.created_at DESC
        `, `%${id.toUpperCase()}%`);

        res.json(results);
    } catch (error) {
        console.error('[References] Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * GET /api/references/:id
 * Get full detail for a single reference entry
 */
router.get('/:id', async (req, res) => {
    try {
        const db = await getDb();
        const ref = await db.get(`
            SELECT 
                d.*,
                l.type AS system_type,
                l.itemName AS system_item,
                l.quantity AS system_quantity,
                l.price AS system_price,
                l.depositor AS system_depositor,
                l.category AS system_category,
                l.timestamp AS system_timestamp,
                l.msg AS system_msg
            FROM discord_logs d
            LEFT JOIN logs l ON d.matched_log_id = l.timestamp
            WHERE d.id = ?
        `, req.params.id);

        if (!ref) return res.status(404).json({ error: 'Not found' });

        res.json(ref);
    } catch (error) {
        console.error('[References] Detail error:', error);
        res.status(500).json({ error: 'Failed to fetch detail' });
    }
});

export default router;
