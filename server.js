import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './src/db/database.js';
import { initialInventory } from './src/data/initialData.js';
import { initialPrices } from './src/data/initialPrices.js';
import { initialEmployees } from './src/data/initialEmployees.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist'))); // Serve frontend files

// Logging Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// GET Inventory
app.get('/api/inventory', async (req, res) => {
    try {
        const db = await getDb();
        const inventory = await db.all('SELECT * FROM inventory');
        if (inventory.length === 0) {
            res.json(initialInventory);
        } else {
            res.json(inventory);
        }
    } catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Inventory (Update)
// Note: Ideally, we should update specific items, but for compatibility with existing frontend logic
// which sends the entire array, we will update items individually in a transaction.
app.post('/api/inventory', async (req, res) => {
    try {
        const newData = req.body;
        const db = await getDb();

        await db.run('BEGIN TRANSACTION');
        const stmt = await db.prepare('INSERT OR REPLACE INTO inventory (id, name, category, current, min, unit, price, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

        for (const item of newData) {
            await stmt.run(item.id, item.name, item.category, item.current, item.min, item.unit, item.price, item.image);
        }

        await stmt.finalize();
        await db.run('COMMIT');

        res.json({ success: true });
    } catch (error) {
        console.error("Error updating inventory:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET Verifications
app.get('/api/verifications', async (req, res) => {
    try {
        const db = await getDb();
        const verifications = await db.all('SELECT * FROM verifications ORDER BY timestamp DESC');
        // Parse snapshot JSON
        const parsedVerifications = verifications.map(v => ({
            ...v,
            snapshot: JSON.parse(v.snapshot)
        }));
        res.json(parsedVerifications);
    } catch (error) {
        console.error("Error fetching verifications:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Verifications
app.post('/api/verifications', async (req, res) => {
    try {
        const { timestamp, verifier, snapshot } = req.body;
        const db = await getDb();
        await db.run(
            'INSERT INTO verifications (timestamp, verifier, snapshot) VALUES (?, ?, ?)',
            timestamp || new Date().toISOString(),
            verifier,
            JSON.stringify(snapshot)
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving verification:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET Logs
app.get('/api/logs', async (req, res) => {
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
app.post('/api/logs', async (req, res) => {
    try {
        const log = req.body;
        const db = await getDb();
        await db.run(
            'INSERT INTO logs (timestamp, type, category, itemId, itemName, quantity, depositor, price, msg, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            log.timestamp || new Date().toISOString(),
            log.type,
            log.category,
            log.itemId,
            log.itemName,
            log.quantity,
            log.depositor,
            log.price,
            log.msg,
            log.time
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving log:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// PUT Logs (Update all - mostly used for deleting logs in current frontend logic)
app.put('/api/logs', async (req, res) => {
    try {
        const newLogs = req.body;
        const db = await getDb();

        // This is inefficient but matches current frontend behavior which sends the full filtered list
        // A better approach would be DELETE /api/logs/:timestamp
        await db.run('BEGIN TRANSACTION');
        await db.run('DELETE FROM logs'); // Clear all

        const stmt = await db.prepare('INSERT INTO logs (timestamp, type, category, itemId, itemName, quantity, depositor, price, msg, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const log of newLogs) {
            await stmt.run(
                log.timestamp,
                log.type,
                log.category,
                log.itemId,
                log.itemName,
                log.quantity,
                log.depositor,
                log.price,
                log.msg,
                log.time
            );
        }
        await stmt.finalize();
        await db.run('COMMIT');

        res.json({ success: true });
    } catch (error) {
        console.error("Error updating logs:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET Employees
app.get('/api/employees', async (req, res) => {
    try {
        const db = await getDb();
        const employees = await db.all('SELECT name FROM employees');
        if (employees.length === 0) {
            res.json(initialEmployees);
        } else {
            res.json(employees.map(e => e.name));
        }
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Employees
app.post('/api/employees', async (req, res) => {
    try {
        const newEmployees = req.body; // Array of strings
        const db = await getDb();

        await db.run('BEGIN TRANSACTION');
        await db.run('DELETE FROM employees');
        const stmt = await db.prepare('INSERT INTO employees (name) VALUES (?)');
        for (const name of newEmployees) {
            await stmt.run(name);
        }
        await stmt.finalize();
        await db.run('COMMIT');

        res.json({ success: true });
    } catch (error) {
        console.error("Error updating employees:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET Prices
app.get('/api/prices', async (req, res) => {
    try {
        const db = await getDb();
        const prices = await db.all('SELECT * FROM prices');
        if (prices.length === 0) {
            res.json(initialPrices);
        } else {
            res.json(prices);
        }
    } catch (error) {
        console.error("Error fetching prices:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Prices
app.post('/api/prices', async (req, res) => {
    try {
        const newPrices = req.body;
        const db = await getDb();

        await db.run('BEGIN TRANSACTION');
        await db.run('DELETE FROM prices');
        const stmt = await db.prepare('INSERT INTO prices (name, ek, vk, lohn, note) VALUES (?, ?, ?, ?, ?)');
        for (const p of newPrices) {
            await stmt.run(p.name, p.ek, p.vk, p.lohn, p.note);
        }
        await stmt.finalize();
        await db.run('COMMIT');

        res.json({ success: true });
    } catch (error) {
        console.error("Error updating prices:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Reset
app.post('/api/reset', async (req, res) => {
    try {
        const db = await getDb();
        await db.run('BEGIN TRANSACTION');

        // Reset Inventory
        await db.run('DELETE FROM inventory');
        const stmtInv = await db.prepare('INSERT INTO inventory (id, name, category, current, min, unit, price, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const item of initialInventory) {
            await stmtInv.run(item.id, item.name, item.category, item.current, item.min, item.unit, item.price, item.image);
        }
        await stmtInv.finalize();

        // Reset Others
        await db.run('DELETE FROM logs');
        await db.run('DELETE FROM verifications');

        await db.run('DELETE FROM employees');
        const stmtEmp = await db.prepare('INSERT INTO employees (name) VALUES (?)');
        for (const name of initialEmployees) {
            await stmtEmp.run(name);
        }
        await stmtEmp.finalize();

        await db.run('DELETE FROM prices');
        const stmtPrice = await db.prepare('INSERT INTO prices (name, ek, vk, lohn, note) VALUES (?, ?, ?, ?, ?)');
        for (const p of initialPrices) {
            await stmtPrice.run(p.name, p.ek, p.vk, p.lohn, p.note);
        }
        await stmtPrice.finalize();

        await db.run('COMMIT');
        res.json(initialInventory);
    } catch (error) {
        console.error("Error resetting database:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Backup
app.post('/api/backup', async (req, res) => {
    // SQLite backup is just copying the file
    try {
        const backupDir = path.join(__dirname, 'backups');
        // fs/promises is not imported, need to import it or use sync methods if we want to keep it simple
        // But let's stick to the pattern.
        const fs = (await import('fs/promises')).default;

        await fs.mkdir(backupDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dbPath = path.join(__dirname, 'database.sqlite');
        const backupPath = path.join(backupDir, `database_${timestamp}.sqlite`);

        await fs.copyFile(dbPath, backupPath);

        console.log(`${new Date().toISOString()} - Backup created at ${backupPath}`);
        res.json({ success: true, message: "Backup created successfully" });
    } catch (error) {
        console.error("Backup failed:", error);
        res.status(500).json({ error: "Backup failed" });
    }
});

// Catch-all for SPA (Express 5 compatible)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
