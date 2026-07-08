/**
 * Ticket API Routes
 * Liefert Ticket-Liste und Transkripte für die Website.
 */

import express from 'express';
import { getDb } from '../db/database.js';
import { getDiscordBot } from '../services/discordBot.js';

const router = express.Router();

// Middleware: nur Buchhaltung / Administrator
function isStaffUser(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const role = req.user?.role;
    if (role !== 'Buchhaltung' && role !== 'Administrator') {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
}

// Middleware: nur Administrator (Konfiguration ändern)
function isAdminUser(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user?.role !== 'Administrator') {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
}

// ============================================
// KONFIGURATION (Kategorien & Rollen)
// ============================================

/**
 * GET /api/tickets/config/roles
 * Liefert die Rollen des Discord-Servers (für die Auswahl).
 */
router.get('/config/roles', isStaffUser, async (req, res) => {
    try {
        const bot = getDiscordBot();
        const roles = await bot.getGuildRoles();
        res.json({ roles });
    } catch (error) {
        console.error('[TicketRoutes] roles error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/tickets/config/categories
 * Liefert die Ticket-Kategorien inkl. der zugewiesenen Rollen.
 */
router.get('/config/categories', isStaffUser, async (req, res) => {
    try {
        const db = await getDb();
        const rows = await db.all('SELECT * FROM ticket_categories ORDER BY sort_order ASC, label ASC');
        const categories = rows.map(r => ({
            value: r.value,
            label: r.label,
            emoji: r.emoji,
            description: r.description,
            sort_order: r.sort_order,
            role_ids: safeParse(r.role_ids)
        }));
        res.json({ categories });
    } catch (error) {
        console.error('[TicketRoutes] categories error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/tickets/config/categories
 * Speichert die Rollen-Zuordnung pro Kategorie.
 * Body: { categories: [{ value, role_ids: [] }] }
 */
router.put('/config/categories', isAdminUser, async (req, res) => {
    try {
        const db = await getDb();
        const categories = Array.isArray(req.body?.categories) ? req.body.categories : [];
        for (const cat of categories) {
            if (!cat?.value) continue;
            const roleIds = Array.isArray(cat.role_ids) ? cat.role_ids.filter(Boolean).map(String) : [];
            await db.run(
                'UPDATE ticket_categories SET role_ids = ? WHERE value = ?',
                JSON.stringify(roleIds), cat.value
            );
        }
        const rows = await db.all('SELECT * FROM ticket_categories ORDER BY sort_order ASC, label ASC');
        res.json({
            success: true,
            categories: rows.map(r => ({
                value: r.value, label: r.label, emoji: r.emoji,
                description: r.description, sort_order: r.sort_order,
                role_ids: safeParse(r.role_ids)
            }))
        });
    } catch (error) {
        console.error('[TicketRoutes] save categories error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TICKETS & TRANSKRIPTE
// ============================================

/**
 * GET /api/tickets
 * Liste aller Tickets (neueste zuerst), optional gefiltert nach status/category.
 */
router.get('/', isStaffUser, async (req, res) => {
    try {
        const db = await getDb();
        const { status, category } = req.query;

        const conditions = [];
        const params = [];
        if (status) { conditions.push('status = ?'); params.push(status); }
        if (category) { conditions.push('category = ?'); params.push(category); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const tickets = await db.all(
            `SELECT t.*, (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS message_count
             FROM tickets t ${where} ORDER BY t.created_at DESC`,
            ...params
        );
        res.json({ tickets });
    } catch (error) {
        console.error('[TicketRoutes] list error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/tickets/:id
 * Einzelnes Ticket inklusive Transkript (Nachrichten).
 */
router.get('/:id', isStaffUser, async (req, res) => {
    try {
        const db = await getDb();
        const ticket = await db.get('SELECT * FROM tickets WHERE id = ?', req.params.id);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        const rows = await db.all(
            'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC',
            req.params.id
        );
        const messages = rows.map(m => ({
            ...m,
            is_bot: !!m.is_bot,
            attachments: safeParse(m.attachments)
        }));
        res.json({ ticket, messages });
    } catch (error) {
        console.error('[TicketRoutes] detail error:', error);
        res.status(500).json({ error: error.message });
    }
});

function safeParse(value) {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export default router;
