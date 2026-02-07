/**
 * Discord Integration API Routes
 * Handles Discord log management, discrepancy resolution, and bot control
 */

import express from 'express';
import { getDb } from '../db/database.js';
import { getDiscordBot } from '../services/discordBot.js';
import {
    matchDiscordLog,
    getPendingDiscrepancies,
    resolveDiscrepancy,
    getMatchingStats
} from '../services/logMatcher.js';
import { parseLogWithAI } from '../services/geminiParser.js';

const router = express.Router();

// Middleware: Check if user is Buchhaltung or Admin
function isBuchhaltungOrAdmin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
}

// ============================================
// BOT CONTROL ENDPOINTS
// ============================================

/**
 * GET /api/discord/bot/status
 * Get the current status of the Discord bot
 */
router.get('/bot/status', isBuchhaltungOrAdmin, (req, res) => {
    const bot = getDiscordBot();
    res.json(bot.getStatus());
});

/**
 * POST /api/discord/bot/start
 * Start the Discord bot
 */
router.post('/bot/start', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const bot = getDiscordBot();
        await bot.start();
        res.json({ success: true, message: 'Bot starting...' });
    } catch (error) {
        console.error('[DiscordRoutes] Error starting bot:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/discord/bot/stop
 * Stop the Discord bot
 */
router.post('/bot/stop', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const bot = getDiscordBot();
        await bot.stop();
        res.json({ success: true, message: 'Bot stopped' });
    } catch (error) {
        console.error('[DiscordRoutes] Error stopping bot:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/discord/bot/fetch-history
 * Fetch historical messages from the configured channel
 */
router.post('/bot/fetch-history', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const { limit = 100 } = req.body;
        const bot = getDiscordBot();

        if (!bot.isRunning) {
            return res.status(400).json({ error: 'Bot is not running' });
        }

        const channelIds = process.env.DISCORD_LOG_CHANNEL_IDS?.split(',') || [];
        const results = [];

        for (const channelId of channelIds) {
            const messages = await bot.fetchHistoricalMessages(channelId.trim(), limit);
            results.push({ channelId: channelId.trim(), count: messages.length });
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error('[DiscordRoutes] Error fetching history:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// LOG ENDPOINTS
// ============================================

/**
 * GET /api/discord/logs
 * Get all Discord logs with optional filtering
 */
router.get('/logs', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const { status, limit = 100, offset = 0 } = req.query;
        const db = await getDb();

        let query = 'SELECT * FROM discord_logs';
        const params = [];

        if (status) {
            query += ' WHERE match_status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const logs = await db.all(query, ...params);
        const total = await db.get(
            status
                ? 'SELECT COUNT(*) as count FROM discord_logs WHERE match_status = ?'
                : 'SELECT COUNT(*) as count FROM discord_logs',
            ...(status ? [status] : [])
        );

        res.json({ logs, total: total.count });
    } catch (error) {
        console.error('[DiscordRoutes] Error fetching logs:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/discord/logs/:id
 * Get a single Discord log with matched system logs
 */
router.get('/logs/:id', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDb();

        const discordLog = await db.get('SELECT * FROM discord_logs WHERE id = ?', id);

        if (!discordLog) {
            return res.status(404).json({ error: 'Log not found' });
        }

        // Get matched system logs if available
        let matchedLogs = [];
        if (discordLog.matched_log_id) {
            const logIds = discordLog.matched_log_id.split(',');
            matchedLogs = await db.all(
                `SELECT * FROM logs WHERE timestamp IN (${logIds.map(() => '?').join(',')})`,
                ...logIds
            );
        }

        // Get resolution history
        const resolutions = await db.all(
            'SELECT * FROM discrepancy_resolutions WHERE discord_log_id = ? ORDER BY resolved_at DESC',
            id
        );

        res.json({
            discordLog,
            matchedLogs,
            resolutions,
            parsedDetails: discordLog.discrepancy_details ? JSON.parse(discordLog.discrepancy_details) : null
        });
    } catch (error) {
        console.error('[DiscordRoutes] Error fetching log details:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DISCREPANCY ENDPOINTS
// ============================================

/**
 * GET /api/discord/discrepancies
 * Get all pending discrepancies
 */
router.get('/discrepancies', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const discrepancies = await getPendingDiscrepancies();
        res.json(discrepancies);
    } catch (error) {
        console.error('[DiscordRoutes] Error fetching discrepancies:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/discord/discrepancy/:id/resolve
 * Resolve a discrepancy
 */
router.post('/discrepancy/:id/resolve', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, note, adjustedValue } = req.body;

        if (!type || !['adjusted', 'ignored', 'manual_match'].includes(type)) {
            return res.status(400).json({ error: 'Invalid resolution type' });
        }

        const result = await resolveDiscrepancy(parseInt(id), {
            type,
            note,
            adjustedValue,
            resolvedBy: req.user.username
        });

        if (req.app.get('broadcastUpdate')) {
            req.app.get('broadcastUpdate')();
        }

        res.json(result);
    } catch (error) {
        console.error('[DiscordRoutes] Error resolving discrepancy:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// USER CONFIRMATION ENDPOINTS
// ============================================

/**
 * GET /api/discord/my-recent-transactions
 * Get recent transactions for the current user to match against Discord logs
 */
router.get('/my-recent-transactions', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = await getDb();
        const { employeeName } = req.user;

        if (!employeeName) {
            return res.json({ transactions: [] });
        }

        // Get transactions from the last 12 hours for this employee (increased from 2h)
        const timeWindow = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

        // Get list of already matched log IDs to exclude them
        const matchedLogs = await db.all('SELECT matched_log_id FROM discord_logs WHERE match_status = "matched" AND matched_log_id IS NOT NULL');
        // Handle potential comma-separated IDs (though confirm uses single ID)
        const matchedIds = new Set();
        matchedLogs.forEach(log => {
            if (log.matched_log_id) {
                log.matched_log_id.split(',').forEach(id => matchedIds.add(id.trim()));
            }
        });

        const transactions = await db.all(`
            SELECT timestamp, type, category, itemName, quantity, price, depositor,
                   (quantity * price) as total
            FROM logs 
            WHERE depositor LIKE ?
            AND timestamp >= ?
            AND category = 'trade'
            ORDER BY timestamp DESC
            LIMIT 50
        `, `%${employeeName}%`, timeWindow);

        // Filter out transactions that are already matched
        const availableTransactions = transactions.filter(tx => !matchedIds.has(tx.timestamp));

        res.json({ transactions: availableTransactions });
    } catch (error) {
        console.error('[DiscordRoutes] Error fetching user transactions:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/discord/confirm/:id
 * User confirms a Discord log matches their transaction
 */
router.post('/confirm/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { id } = req.params;
        const { transactionTimestamp } = req.body;
        const db = await getDb();

        const discordLog = await db.get('SELECT * FROM discord_logs WHERE id = ?', id);

        if (!discordLog) {
            return res.status(404).json({ error: 'Discord log not found' });
        }

        // Check for price discrepancy and correct if needed
        const metLog = await db.get('SELECT * FROM logs WHERE timestamp = ?', transactionTimestamp);
        let resolutionNote = `User confirmed match with transaction at ${transactionTimestamp}`;

        if (metLog) {
            const metTotal = metLog.quantity * metLog.price;
            const diff = Math.abs(metTotal - discordLog.amount);

            // If difference is greater than 1 cent
            if (diff > 0.01) {
                console.log(`[DiscordRoutes] Discrepancy detected: MET ${metTotal} vs Discord ${discordLog.amount}`);

                // Calculate new price per unit to match Discord total
                // newPrice = discordAmount / quantity
                const newPrice = discordLog.amount / metLog.quantity;

                // Update the MET log with corrected price
                await db.run(
                    'UPDATE logs SET price = ? WHERE timestamp = ?',
                    newPrice,
                    transactionTimestamp
                );

                resolutionNote += `. Auto-corrected price from ${metLog.price} to ${newPrice} (Total: ${metTotal} -> ${discordLog.amount})`;
                console.log(`[DiscordRoutes] Auto-corrected price to ${newPrice}`);

                // Trigger broadcast update to refresh UI
                if (req.app.get('broadcastUpdate')) {
                    req.app.get('broadcastUpdate')({ type: 'UPDATE' });
                }
            }
        }

        // Update the discord log as matched
        await db.run(`
            UPDATE discord_logs 
            SET match_status = 'matched',
                matched_log_id = ?,
                discrepancy_type = NULL,
                discrepancy_details = ?
            WHERE id = ?
        `,
            transactionTimestamp,
            JSON.stringify({
                confirmedBy: req.user.username,
                confirmedAt: new Date().toISOString(),
                method: 'user_confirmation',
                autoCorrected: resolutionNote.includes('Auto-corrected')
            }),
            id
        );

        // Record the resolution
        await db.run(`
            INSERT INTO discrepancy_resolutions (
                discord_log_id, resolved_by, resolution_type,
                note, resolved_at
            ) VALUES (?, ?, 'user_confirmed', ?, datetime('now'))
        `,
            id,
            req.user.username,
            resolutionNote
        );

        if (req.app.get('broadcastUpdate')) {
            req.app.get('broadcastUpdate')();
        }

        res.json({ success: true, message: 'Confirmation saved' });
    } catch (error) {
        console.error('[DiscordRoutes] Error confirming log:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/discord/dismiss/:id
 * User dismisses a Discord log (not their transaction)
 */
router.post('/dismiss/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { id } = req.params;
        const db = await getDb();

        const discordLog = await db.get('SELECT * FROM discord_logs WHERE id = ?', id);

        if (!discordLog) {
            return res.status(404).json({ error: 'Discord log not found' });
        }

        // Just log that this user dismissed it, don't change status
        // (might belong to another user with similar name)
        await db.run(`
            INSERT INTO discrepancy_resolutions (
                discord_log_id, resolved_by, resolution_type,
                note, resolved_at
            ) VALUES (?, ?, 'user_dismissed', ?, datetime('now'))
        `,
            id,
            req.user.username,
            `${req.user.username} indicated this is not their transaction`
        );

        res.json({ success: true, message: 'Dismissal recorded' });
    } catch (error) {
        console.error('[DiscordRoutes] Error dismissing log:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/match/:id', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDb();

        const discordLog = await db.get('SELECT discord_message_id FROM discord_logs WHERE id = ?', id);

        if (!discordLog) {
            return res.status(404).json({ error: 'Log not found' });
        }

        // Reset status and re-match
        await db.run('UPDATE discord_logs SET match_status = ? WHERE id = ?', 'pending', id);
        const result = await matchDiscordLog(discordLog.discord_message_id);

        res.json(result);
    } catch (error) {
        console.error('[DiscordRoutes] Error re-matching:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// STATISTICS ENDPOINTS
// ============================================

/**
 * GET /api/discord/stats
 * Get matching statistics and overview
 */
router.get('/stats', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const stats = await getMatchingStats();
        res.json(stats);
    } catch (error) {
        console.error('[DiscordRoutes] Error fetching stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// WEBHOOK ENDPOINT (for external integrations)
// ============================================

/**
 * POST /api/discord/webhook
 * Receive and process a Discord log message externally
 */
router.post('/webhook', async (req, res) => {
    try {
        const { messageId, channelId, content, timestamp } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const db = await getDb();

        // Check if already processed
        if (messageId) {
            const existing = await db.get(
                'SELECT id FROM discord_logs WHERE discord_message_id = ?',
                messageId
            );
            if (existing) {
                return res.json({ success: true, message: 'Already processed', id: existing.id });
            }
        }

        // Parse with AI
        const parsedData = await parseLogWithAI(content);

        // Generate a unique message ID if not provided
        const finalMessageId = messageId || `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store in database
        const result = await db.run(`
            INSERT INTO discord_logs (
                discord_message_id, channel_id, raw_content, parsed_type,
                employee_name, customer_name, amount, reason,
                log_timestamp, match_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
            finalMessageId,
            channelId || 'webhook',
            content,
            parsedData.type,
            parsedData.employee,
            parsedData.customer,
            parsedData.amount,
            parsedData.reason,
            timestamp || new Date().toISOString(),
            'pending'
        );

        // Trigger matching
        await matchDiscordLog(finalMessageId);

        res.json({
            success: true,
            id: result.lastID,
            parsed: parsedData
        });
    } catch (error) {
        console.error('[DiscordRoutes] Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/discord/test-parse
 * Test the Gemini parser with a sample message
 */
router.post('/test-parse', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const parsed = await parseLogWithAI(content);
        res.json({ success: true, parsed });
    } catch (error) {
        console.error('[DiscordRoutes] Parse test error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
