import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

/**
 * GET /api/references
 * Returns all matched and pending discord_logs with their system log counterparts
 * For matched entries, loads ALL products with the same transaction_id
 */
router.get('/', async (req, res) => {
    try {
        const db = await getDb();
        const discordLogs = await db.all(`
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
                d.discrepancy_details
            FROM discord_logs d
            WHERE d.reference_id IS NOT NULL
            ORDER BY d.created_at DESC
        `);

        // For each matched entry, load all system products with that reference_id
        const references = [];
        for (const d of discordLogs) {
            const entry = { ...d, system_products: [] };

            if (d.reference_id) {
                const products = await db.all(
                    `SELECT type, itemName, quantity, price, depositor, category, timestamp 
                     FROM logs WHERE transaction_id = ? ORDER BY timestamp ASC`,
                    d.reference_id
                );
                entry.system_products = products;

                // Backwards compat: set flat fields from first product
                if (products.length > 0) {
                    entry.system_type = products[0].type;
                    entry.system_item = products[0].itemName;
                    entry.system_quantity = products[0].quantity;
                    entry.system_price = products[0].price;
                    entry.system_depositor = products[0].depositor;
                    entry.system_category = products[0].category;
                    entry.system_timestamp = products[0].timestamp;
                }
            }

            references.push(entry);
        }

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
        const discordLogs = await db.all(`
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
                d.discrepancy_details
            FROM discord_logs d
            WHERE d.reference_id LIKE ?
            ORDER BY d.created_at DESC
        `, `%${id.toUpperCase()}%`);

        const results = [];
        for (const d of discordLogs) {
            const entry = { ...d, system_products: [] };
            if (d.reference_id) {
                const products = await db.all(
                    `SELECT type, itemName, quantity, price, depositor, category, timestamp 
                     FROM logs WHERE transaction_id = ? ORDER BY timestamp ASC`,
                    d.reference_id
                );
                entry.system_products = products;
                if (products.length > 0) {
                    entry.system_type = products[0].type;
                    entry.system_item = products[0].itemName;
                    entry.system_quantity = products[0].quantity;
                    entry.system_price = products[0].price;
                    entry.system_depositor = products[0].depositor;
                    entry.system_category = products[0].category;
                    entry.system_timestamp = products[0].timestamp;
                }
            }
            results.push(entry);
        }

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
            SELECT d.*
            FROM discord_logs d
            WHERE d.id = ?
        `, req.params.id);

        if (!ref) return res.status(404).json({ error: 'Not found' });

        // Load all system products
        if (ref.reference_id) {
            const products = await db.all(
                `SELECT type, itemName, quantity, price, depositor, category, timestamp 
                 FROM logs WHERE transaction_id = ? ORDER BY timestamp ASC`,
                ref.reference_id
            );
            ref.system_products = products;
            if (products.length > 0) {
                ref.system_type = products[0].type;
                ref.system_item = products[0].itemName;
                ref.system_quantity = products[0].quantity;
                ref.system_price = products[0].price;
                ref.system_depositor = products[0].depositor;
                ref.system_category = products[0].category;
                ref.system_timestamp = products[0].timestamp;
            }
        } else {
            ref.system_products = [];
        }

        res.json(ref);
    } catch (error) {
        console.error('[References] Detail error:', error);
        res.status(500).json({ error: 'Failed to fetch detail' });
    }
});

export default router;
