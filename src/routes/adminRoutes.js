import express from 'express';
import { getDb, closeDb } from '../db/database.js';
import { initialEmployees } from '../data/initialEmployees.js';
import { initialPrices } from '../data/initialPrices.js';
import { initialInventory } from '../data/initialData.js';
import { initialPersonnel } from '../data/initialPersonnel.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(path.dirname(__filename))); // Go up from src/routes to root

const router = express.Router();

const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'Administrator') return next();
    return res.status(403).json({ error: 'Unauthorized' });
};

const isBuchhaltungOrAdmin = (req, res, next) => {
    if (req.isAuthenticated() && (req.user.role === 'Buchhaltung' || req.user.role === 'Administrator')) return next();
    return res.status(403).json({ error: 'Unauthorized' });
};

// USERS
router.get('/users', isAdmin, async (req, res) => {
    try {
        const db = await getDb();
        const users = await db.all('SELECT * FROM users');
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Database error" });
    }
});

router.put('/users/:discordId', isAdmin, async (req, res) => {
    try {
        const { role, employeeName, isHaendler, isLagerist } = req.body;
        const { discordId } = req.params;
        const db = await getDb();
        await db.run('UPDATE users SET role = ?, employeeName = ?, isHaendler = ?, isLagerist = ? WHERE discordId = ?', role, employeeName, isHaendler, isLagerist, discordId);
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Database error" });
    }
});

router.delete('/users/:discordId', isAdmin, async (req, res) => {
    try {
        const { discordId } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM users WHERE discordId = ?', discordId);
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// EMPLOYEES
router.get('/employees', async (req, res) => {
    try {
        const db = await getDb();
        const employees = await db.all('SELECT name FROM employees');
        if (employees.length === 0) res.json(initialEmployees);
        else res.json(employees.map(e => e.name));
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ error: "Database error" });
    }
});

router.post('/employees', async (req, res) => {
    try {
        const newEmployees = req.body;
        const db = await getDb();
        await db.run('BEGIN TRANSACTION');
        await db.run('DELETE FROM employees');
        const stmt = await db.prepare('INSERT INTO employees (name) VALUES (?)');
        for (const name of newEmployees) await stmt.run(name);
        await stmt.finalize();
        await db.run('COMMIT');
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating employees:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// PRICES
router.get('/prices', async (req, res) => {
    try {
        const db = await getDb();
        const prices = await db.all('SELECT * FROM prices');
        if (prices.length === 0) res.json(initialPrices);
        else res.json(prices);
    } catch (error) {
        console.error("Error fetching prices:", error);
        res.status(500).json({ error: "Database error" });
    }
});

router.post('/prices', isAdmin, async (req, res) => {
    try {
        const newPrices = req.body;
        const db = await getDb();
        await db.run('BEGIN TRANSACTION');
        await db.run('DELETE FROM prices');
        const stmt = await db.prepare('INSERT INTO prices (name, ek, vk, lohn, note, noteVK) VALUES (?, ?, ?, ?, ?, ?)');
        for (const p of newPrices) await stmt.run(p.name, p.ek, p.vk, p.lohn, p.note, p.noteVK || '');
        await stmt.finalize();
        await db.run('COMMIT');
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating prices:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// CONTENT ROUTES (Ads, Guide, Hausordnung, Partners, Contacts, Personnel)
// For brevity, these are grouped here as "Admin/Content"

const createContentRoutes = (table, pathName) => {
    router.get(`/${pathName}`, async (req, res) => {
        try {
            const db = await getDb();
            const data = await db.all(`SELECT * FROM ${table}`);
            res.json(data);
        } catch (e) { res.status(500).json({ error: "DB Error" }); }
    });
    // Add POST/DELETE if needed, mostly consistent pattern.
    // Since schemas differ, better not to genericize too much logic blindly.
};

// PERSONNEL
router.get('/personnel', async (req, res) => {
    try {
        const db = await getDb();
        const personnel = await db.all('SELECT * FROM personnel');
        for (const p of personnel) {
            p.violations = await db.all('SELECT * FROM violations WHERE personnel_id = ? ORDER BY date DESC', p.id);
        }
        res.json(personnel);
    } catch (error) { res.status(500).json({ error: "Database error" }); }
});

router.post('/personnel', isAdmin, async (req, res) => {
    try {
        const { id, name, phone, truck_license, contract, license_plate, second_job } = req.body;
        const db = await getDb();
        if (id) {
            await db.run('UPDATE personnel SET name = ?, phone = ?, truck_license = ?, contract = ?, license_plate = ?, second_job = ? WHERE id = ?', name, phone, truck_license ? 1 : 0, contract, license_plate, second_job, id);
        } else {
            await db.run('INSERT INTO personnel (name, phone, truck_license, contract, license_plate, second_job) VALUES (?, ?, ?, ?, ?, ?)', name, phone, truck_license ? 1 : 0, contract, license_plate, second_job);
        }
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Database error" }); }
});

router.delete('/personnel/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM personnel WHERE id = ?', id);
        await db.run('DELETE FROM violations WHERE personnel_id = ?', id);
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Database error" }); }
});

// VIOLATIONS
router.post('/violations', isAdmin, async (req, res) => {
    try {
        const { personnel_id, date, violation, remark, percentage } = req.body;
        const db = await getDb();
        await db.run('INSERT INTO violations (personnel_id, date, violation, remark, percentage) VALUES (?, ?, ?, ?, ?)', personnel_id, date, violation, remark, percentage);
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Database error" }); }
});

router.delete('/violations/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM violations WHERE id = ?', id);
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Database error" }); }
});

// PARTNERS
router.get('/partners', isAdmin, async (req, res) => {
    try { const db = await getDb(); res.json(await db.all('SELECT * FROM partners')); } catch (e) { res.status(500).json({ error: "DB Error" }); }
});
router.post('/partners', isAdmin, async (req, res) => { /* Similar logic to personnel, implementation skipped for brevity but included in full file if needed */
    try {
        const { id, name, partner_offer, met_offer, info } = req.body;
        const db = await getDb();
        if (id) await db.run('UPDATE partners SET name = ?, partner_offer = ?, met_offer = ?, info = ? WHERE id = ?', name, partner_offer, met_offer, info, id);
        else await db.run('INSERT INTO partners (name, partner_offer, met_offer, info) VALUES (?, ?, ?, ?)', name, partner_offer, met_offer, info);
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});
router.delete('/partners/:id', isAdmin, async (req, res) => {
    try { const { id } = req.params; const db = await getDb(); await db.run('DELETE FROM partners WHERE id = ?', id); if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')(); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

// ADS
router.get('/ads', isAdmin, async (req, res) => { try { const db = await getDb(); res.json(await db.all('SELECT * FROM ads')); } catch (e) { res.status(500).json({ error: "DB Error" }); } });
router.post('/ads', isAdmin, async (req, res) => { try { const { id, content, description } = req.body; const db = await getDb(); if (id) await db.run('UPDATE ads SET content = ?, description = ? WHERE id = ?', content, description, id); else await db.run('INSERT INTO ads (content, description) VALUES (?, ?)', content, description); if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')(); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "DB Error" }); } });
router.delete('/ads/:id', isAdmin, async (req, res) => { try { const { id } = req.params; const db = await getDb(); await db.run('DELETE FROM ads WHERE id = ?', id); if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')(); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "DB Error" }); } });

// CONTACTS
router.get('/contacts', isAdmin, async (req, res) => { try { const db = await getDb(); res.json(await db.all('SELECT * FROM contacts')); } catch (e) { res.status(500).json({ error: "DB Error" }); } });
router.post('/contacts', isAdmin, async (req, res) => { try { const { id, phone, name, second_name, plz, info } = req.body; const db = await getDb(); if (id) await db.run('UPDATE contacts SET phone = ?, name = ?, second_name = ?, plz = ?, info = ? WHERE id = ?', phone, name, second_name, plz, info, id); else await db.run('INSERT INTO contacts (phone, name, second_name, plz, info) VALUES (?, ?, ?, ?, ?)', phone, name, second_name, plz, info); if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')(); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "DB Error" }); } });
router.delete('/contacts/:id', isAdmin, async (req, res) => { try { const { id } = req.params; const db = await getDb(); await db.run('DELETE FROM contacts WHERE id = ?', id); if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')(); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "DB Error" }); } });

// GUIDE
router.get('/guide', async (req, res) => { try { const db = await getDb(); const guide = await db.get('SELECT * FROM beginner_guide LIMIT 1'); res.json(guide ? JSON.parse(guide.content) : null); } catch (e) { res.status(500).json({ error: "DB Error" }); } });
router.post('/guide', isAdmin, async (req, res) => { try { const content = req.body; const db = await getDb(); const existing = await db.get('SELECT id FROM beginner_guide LIMIT 1'); if (existing) await db.run('UPDATE beginner_guide SET content = ? WHERE id = ?', JSON.stringify(content), existing.id); else await db.run('INSERT INTO beginner_guide (content) VALUES (?)', JSON.stringify(content)); if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')(); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "DB Error" }); } });

// HAUSORDNUNG
router.get('/hausordnung', async (req, res) => { try { const db = await getDb(); const data = await db.get('SELECT * FROM hausordnung LIMIT 1'); res.json(data ? JSON.parse(data.content) : { header: { title: "HAUSORDNUNG", subtitle: "M.E.T. Logistic" }, sections: [] }); } catch (e) { res.status(500).json({ error: "DB Error" }); } });
router.post('/hausordnung', isAdmin, async (req, res) => { try { const content = req.body; const db = await getDb(); const existing = await db.get('SELECT id FROM hausordnung LIMIT 1'); if (existing) await db.run('UPDATE hausordnung SET content = ? WHERE id = ?', JSON.stringify(content), existing.id); else await db.run('INSERT INTO hausordnung (content) VALUES (?)', JSON.stringify(content)); if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')(); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "DB Error" }); } });

// BACKUPS
router.post('/backup', async (req, res) => {
    try {
        const dbPath = path.join(__dirname, 'data', 'database.sqlite');
        const backupDir = path.join(__dirname, 'data', 'backups');
        const fs = (await import('fs/promises')).default;
        await fs.mkdir(backupDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `database_${timestamp}.sqlite`);
        await fs.copyFile(dbPath, backupPath);
        res.json({ success: true, message: "Backup created", path: backupPath });
    } catch (error) { res.status(500).json({ error: "Backup failed: " + error.message }); }
});

router.get('/backups', isBuchhaltungOrAdmin, async (req, res) => {
    try {
        const backupDir = path.join(__dirname, 'data', 'backups');
        const fs = (await import('fs/promises')).default;
        try { await fs.access(backupDir); } catch { return res.json([]); }
        const files = await fs.readdir(backupDir);
        const backups = [];
        for (const file of files) {
            if (file.endsWith('.sqlite')) {
                const stats = await fs.stat(path.join(backupDir, file));
                backups.push({ name: file, size: stats.size, created: stats.birthtime });
            }
        }
        backups.sort((a, b) => new Date(b.created) - new Date(a.created));
        res.json(backups);
    } catch (e) { res.status(500).json({ error: "Failed to fetch backups" }); }
});

router.delete('/backups/:filename', isAdmin, async (req, res) => {
    try {
        const { filename } = req.params;
        const backupPath = path.join(__dirname, 'data', 'backups', filename);
        const fs = (await import('fs/promises')).default;
        await fs.unlink(backupPath);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Delete failed" }); }
});

router.post('/restore', isAdmin, async (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) return res.status(400).json({ error: "Filename required" });
        const backupPath = path.join(__dirname, 'data', 'backups', filename);
        const dbPath = path.join(__dirname, 'data', 'database.sqlite');
        const fs = (await import('fs/promises')).default;
        await closeDb();
        await fs.copyFile(backupPath, dbPath);
        await getDb(); // Reopen
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Restore failed: " + e.message }); }
});

// RESET (Admin)
router.post('/reset', async (req, res) => {
    try {
        const db = await getDb();
        await db.run('BEGIN TRANSACTION');

        await db.run('DELETE FROM inventory');
        const stmtInv = await db.prepare('INSERT INTO inventory (id, name, category, current, target, min, unit, price, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const item of initialInventory) {
            await stmtInv.run(item.id, item.name, item.category, item.current || 0, item.target || null, item.min || 0, item.unit || '', item.price || 0, item.image || '');
        }
        await stmtInv.finalize();

        await db.run('DELETE FROM logs');
        await db.run('DELETE FROM verifications');

        // Reset Employees (keep defaults)
        await db.run('DELETE FROM employees');
        const stmtEmp = await db.prepare('INSERT INTO employees (name) VALUES (?)');
        for (const name of initialEmployees) await stmtEmp.run(name);
        await stmtEmp.finalize();

        // Reset Prices
        await db.run('DELETE FROM prices');
        const stmtPrice = await db.prepare('INSERT INTO prices (name, ek, vk, lohn, note, noteVK) VALUES (?, ?, ?, ?, ?, ?)');
        for (const p of initialPrices) await stmtPrice.run(p.name, p.ek, p.vk, p.lohn, p.note, p.noteVK || '');
        await stmtPrice.finalize();

        // Reset Personnel
        await db.run('DELETE FROM personnel');
        const stmtPers = await db.prepare('INSERT INTO personnel (name, phone, truck_license, contract, license_plate, second_job) VALUES (?, ?, ?, ?, ?, ?)');
        for (const p of initialPersonnel) await stmtPers.run(p.name, p.phone, p.truck_license, p.contract, p.license_plate, p.second_job);
        await stmtPers.finalize();

        await db.run('COMMIT');
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json(initialInventory);
    } catch (error) {
        console.error("Error resetting database:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// SUPER ADMIN AUDIT
const SUPER_ADMIN_IDS = ['823276402320998450', '690510884639866960'];
router.get('/audit-logs', async (req, res) => {
    if (!req.isAuthenticated() || !SUPER_ADMIN_IDS.includes(req.user.discordId)) return res.status(403).json({ error: 'Unauthorized' });
    try {
        const db = await getDb();
        const logs = await db.all('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000');
        res.json(logs);
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});



// VERIFICATIONS
router.get('/verifications', async (req, res) => {
    try {
        const db = await getDb();
        const verifications = await db.all('SELECT * FROM verifications ORDER BY timestamp DESC');
        res.json(verifications.map(v => ({ ...v, snapshot: JSON.parse(v.snapshot) })));
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

router.post('/verifications', async (req, res) => {
    try {
        const { timestamp, verifier, snapshot } = req.body;
        const db = await getDb();
        await db.run('INSERT INTO verifications (timestamp, verifier, snapshot) VALUES (?, ?, ?)', timestamp || new Date().toISOString(), verifier, JSON.stringify(snapshot));
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

export default router;
