import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// ============================================
// CONFIG: Products for the competition
// ============================================

// GET /config - Load active products
router.get('/config', async (req, res) => {
    try {
        const db = await getDb();
        const products = await db.all('SELECT * FROM sammel_config WHERE active = 1');
        res.json(products);
    } catch (err) {
        console.error('[SammelEvent] Config load error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /config/products - Set products for the competition (max 3)
router.post('/config/products', async (req, res) => {
    try {
        const db = await getDb();
        const { products } = req.body; // Array of product_name strings

        if (!Array.isArray(products) || products.length > 3) {
            return res.status(400).json({ error: 'Maximal 3 Produkte erlaubt' });
        }

        // Deactivate all
        await db.run('UPDATE sammel_config SET active = 0');

        // Insert or update each product
        for (const name of products) {
            const existing = await db.get('SELECT id FROM sammel_config WHERE product_name = ?', name);
            if (existing) {
                await db.run('UPDATE sammel_config SET active = 1 WHERE id = ?', existing.id);
            } else {
                await db.run('INSERT INTO sammel_config (product_name, active) VALUES (?, 1)', name);
            }
        }

        const updated = await db.all('SELECT * FROM sammel_config WHERE active = 1');
        res.json({ success: true, products: updated });
    } catch (err) {
        console.error('[SammelEvent] Config save error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SETTINGS: Event date range
// ============================================

// GET /settings - Load event settings
router.get('/settings', async (req, res) => {
    try {
        const db = await getDb();
        const settings = await db.get('SELECT * FROM sammel_settings WHERE id = 1');
        res.json(settings || { start_date: null, end_date: null });
    } catch (err) {
        console.error('[SammelEvent] Settings load error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /settings - Update event settings
router.put('/settings', async (req, res) => {
    try {
        const db = await getDb();
        const { start_date, end_date } = req.body;
        await db.run(
            'UPDATE sammel_settings SET start_date = ?, end_date = ? WHERE id = 1',
            start_date || null, end_date || null
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[SammelEvent] Settings save error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// TEAMS
// ============================================

// GET /teams - All teams with their members
router.get('/teams', async (req, res) => {
    try {
        const db = await getDb();
        const teams = await db.all('SELECT * FROM sammel_teams ORDER BY name');
        const members = await db.all('SELECT * FROM sammel_team_members');

        const teamsWithMembers = teams.map(team => ({
            ...team,
            members: members.filter(m => m.team_id === team.id)
        }));

        res.json(teamsWithMembers);
    } catch (err) {
        console.error('[SammelEvent] Teams load error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /teams - Create a team
router.post('/teams', async (req, res) => {
    try {
        const db = await getDb();
        const { name, color } = req.body;

        if (!name) return res.status(400).json({ error: 'Teamname erforderlich' });

        const result = await db.run(
            'INSERT INTO sammel_teams (name, color) VALUES (?, ?)',
            name, color || '#8b5cf6'
        );

        res.json({ success: true, id: result.lastID });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Teamname existiert bereits' });
        }
        console.error('[SammelEvent] Team create error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /teams/:id - Update a team
router.put('/teams/:id', async (req, res) => {
    try {
        const db = await getDb();
        const { name, color } = req.body;

        await db.run(
            'UPDATE sammel_teams SET name = ?, color = ? WHERE id = ?',
            name, color, req.params.id
        );

        res.json({ success: true });
    } catch (err) {
        console.error('[SammelEvent] Team update error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /teams/:id - Delete a team
router.delete('/teams/:id', async (req, res) => {
    try {
        const db = await getDb();
        await db.run('DELETE FROM sammel_teams WHERE id = ?', req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('[SammelEvent] Team delete error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// TEAM MEMBERS
// ============================================

// POST /teams/:id/members - Add employee to team
router.post('/teams/:id/members', async (req, res) => {
    try {
        const db = await getDb();
        const { employee_name } = req.body;
        const teamId = req.params.id;

        if (!employee_name) return res.status(400).json({ error: 'Mitarbeitername erforderlich' });

        // Check if employee is already in a team
        const existing = await db.get('SELECT * FROM sammel_team_members WHERE employee_name = ?', employee_name);
        if (existing) {
            // Move to new team
            await db.run('UPDATE sammel_team_members SET team_id = ? WHERE employee_name = ?', teamId, employee_name);
        } else {
            await db.run(
                'INSERT INTO sammel_team_members (team_id, employee_name) VALUES (?, ?)',
                teamId, employee_name
            );
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[SammelEvent] Member add error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /members/:id - Remove employee from team
router.delete('/members/:id', async (req, res) => {
    try {
        const db = await getDb();
        await db.run('DELETE FROM sammel_team_members WHERE id = ?', req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('[SammelEvent] Member remove error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENTRIES (Collection Log)
// ============================================

// GET /entries - All entries
router.get('/entries', async (req, res) => {
    try {
        const db = await getDb();
        const entries = await db.all(`
            SELECT e.*, t.name as team_name, t.color as team_color
            FROM sammel_entries e
            LEFT JOIN sammel_teams t ON e.team_id = t.id
            ORDER BY e.timestamp DESC
        `);
        res.json(entries);
    } catch (err) {
        console.error('[SammelEvent] Entries load error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /entries - Create a new entry
router.post('/entries', async (req, res) => {
    try {
        const db = await getDb();
        const { employee_name, product_name, quantity } = req.body;

        if (!employee_name || !product_name || !quantity) {
            return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
        }

        // Find the team of this employee
        const member = await db.get('SELECT team_id FROM sammel_team_members WHERE employee_name = ?', employee_name);
        if (!member) {
            return res.status(400).json({ error: 'Mitarbeiter ist keinem Team zugeordnet' });
        }

        const result = await db.run(
            'INSERT INTO sammel_entries (employee_name, team_id, product_name, quantity, timestamp) VALUES (?, ?, ?, ?, ?)',
            employee_name, member.team_id, product_name, quantity, new Date().toISOString()
        );

        res.json({ success: true, id: result.lastID });
    } catch (err) {
        console.error('[SammelEvent] Entry create error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /entries/:id - Delete an entry
router.delete('/entries/:id', async (req, res) => {
    try {
        const db = await getDb();
        await db.run('DELETE FROM sammel_entries WHERE id = ?', req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('[SammelEvent] Entry delete error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// STATS
// ============================================

// GET /stats - Team statistics
router.get('/stats', async (req, res) => {
    try {
        const db = await getDb();

        // Per-team totals
        const teamStats = await db.all(`
            SELECT 
                t.id as team_id,
                t.name as team_name,
                t.color as team_color,
                COALESCE(SUM(e.quantity), 0) as total_quantity
            FROM sammel_teams t
            LEFT JOIN sammel_entries e ON t.id = e.team_id
            GROUP BY t.id
            ORDER BY total_quantity DESC
        `);

        // Per-team per-product breakdown
        const productBreakdown = await db.all(`
            SELECT 
                t.id as team_id,
                e.product_name,
                SUM(e.quantity) as quantity
            FROM sammel_entries e
            JOIN sammel_teams t ON e.team_id = t.id
            GROUP BY t.id, e.product_name
        `);

        // Per-employee totals
        const employeeStats = await db.all(`
            SELECT 
                e.employee_name,
                e.team_id,
                t.name as team_name,
                t.color as team_color,
                SUM(e.quantity) as total_quantity
            FROM sammel_entries e
            JOIN sammel_teams t ON e.team_id = t.id
            GROUP BY e.employee_name
            ORDER BY total_quantity DESC
        `);

        // Get member counts per team
        const memberCounts = await db.all(`
            SELECT team_id, COUNT(*) as member_count
            FROM sammel_team_members
            GROUP BY team_id
        `);

        // Enrich team stats with product breakdown + avg per person
        const enrichedTeamStats = teamStats.map(team => {
            const mc = memberCounts.find(m => m.team_id === team.team_id);
            const memberCount = mc ? mc.member_count : 0;
            return {
                ...team,
                member_count: memberCount,
                avg_per_person: memberCount > 0 ? Math.round((team.total_quantity / memberCount) * 10) / 10 : 0,
                products: productBreakdown.filter(p => p.team_id === team.team_id)
            };
        });

        res.json({
            teams: enrichedTeamStats,
            employees: employeeStats
        });
    } catch (err) {
        console.error('[SammelEvent] Stats error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
