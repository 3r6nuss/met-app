import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import dotenv from 'dotenv';
import { getDb } from './src/db/database.js';
import { initialInventory } from './src/data/initialData.js';
import { initialPrices } from './src/data/initialPrices.js';
import { initialEmployees } from './src/data/initialEmployees.js';
import { WebSocketServer } from 'ws';
import http from 'http';
import { recipes as initialRecipes } from './src/data/recipes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user.id || user.discordId);
});

passport.deserializeUser(async (id, done) => {
    try {
        const db = await getDb();
        const user = await db.get('SELECT * FROM users WHERE discordId = ?', id);
        done(null, user || null);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const db = await getDb();
        const existingUser = await db.get('SELECT * FROM users WHERE discordId = ?', profile.id);

        // Hardcoded Admin Override
        const isSuperAdmin = profile.id === '823276402320998450';
        const forcedRole = isSuperAdmin ? 'Administrator' : undefined;

        if (existingUser) {
            const newRole = forcedRole || existingUser.role;
            await db.run('UPDATE users SET username = ?, discriminator = ?, avatar = ?, role = ? WHERE discordId = ?',
                profile.username, profile.discriminator, profile.avatar, newRole, profile.id);
            return done(null, { ...existingUser, ...profile, role: newRole });
        } else {
            const role = forcedRole || 'Pending';
            await db.run('INSERT INTO users (discordId, username, discriminator, avatar, role) VALUES (?, ?, ?, ?, ?)',
                profile.id, profile.username, profile.discriminator, profile.avatar, role);
            return done(null, { ...profile, role, employeeName: null });
        }
    } catch (err) {
        return done(err, null);
    }
}));

app.use(cors({
    origin: ['http://localhost:5173', 'https://met.3r6nuss.de'], // Allow frontend dev server and production domain
    credentials: true // Allow cookies
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist'))); // Serve frontend files

// Auth Routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/'); // Successful auth
});

app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json(req.user);
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// GET All Users (Admin only)
app.get('/api/users', async (req, res) => {
    if (req.isAuthenticated() && req.user.role === 'Administrator') {
        try {
            const db = await getDb();
            const users = await db.all('SELECT * FROM users');
            res.json(users);
        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({ error: "Database error" });
        }
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
});

// PUT User (Update role/employee mapping)
app.put('/api/users/:discordId', async (req, res) => {
    if (req.isAuthenticated() && req.user.role === 'Administrator') {
        try {
            const { role, employeeName, isHaendler } = req.body;
            const { discordId } = req.params;
            const db = await getDb();
            await db.run('UPDATE users SET role = ?, employeeName = ?, isHaendler = ? WHERE discordId = ?', role, employeeName, isHaendler, discordId);
            broadcastUpdate();
            res.json({ success: true });
        } catch (error) {
            console.error("Error updating user:", error);
            res.status(500).json({ error: "Database error" });
        }
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
});

// DELETE User
app.delete('/api/users/:discordId', async (req, res) => {
    if (req.isAuthenticated() && req.user.role === 'Administrator') {
        try {
            const { discordId } = req.params;
            const db = await getDb();
            await db.run('DELETE FROM users WHERE discordId = ?', discordId);
            broadcastUpdate();
            res.json({ success: true });
        } catch (error) {
            console.error("Error deleting user:", error);
            res.status(500).json({ error: "Database error" });
        }
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
});

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
        const stmt = await db.prepare('INSERT OR REPLACE INTO inventory (id, name, category, current, target, min, unit, price, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

        for (const item of newData) {
            await stmt.run(item.id, item.name, item.category, item.current, item.target, item.min, item.unit, item.price, item.image);
        }

        await stmt.finalize();
        await db.run('COMMIT');

        broadcastUpdate();
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
        broadcastUpdate();
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
        broadcastUpdate();
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

        const stmt = await db.prepare('INSERT INTO logs (timestamp, type, category, itemId, itemName, quantity, depositor, price, msg, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
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
                log.time,
                log.status || 'pending'
            );
        }
        await stmt.finalize();
        await db.run('COMMIT');

        broadcastUpdate();
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

        broadcastUpdate();
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

        broadcastUpdate();
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
        const stmtInv = await db.prepare('INSERT INTO inventory (id, name, category, current, target, min, unit, price, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const item of initialInventory) {
            await stmtInv.run(item.id, item.name, item.category, item.current, item.target, item.min, item.unit, item.price, item.image);
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
        broadcastUpdate();
        res.json(initialInventory);
    } catch (error) {
        console.error("Error resetting database:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// --- NEW FEATURES: Employee Inventory & Recipes ---

// Initialize new tables & migrations
const initNewTables = async () => {
    const db = await getDb();

    // Migration: Add status column to logs if it doesn't exist
    try {
        const tableInfo = await db.all("PRAGMA table_info(logs)");
        const hasStatus = tableInfo.some(col => col.name === 'status');
        if (!hasStatus) {
            console.log("Migrating logs table: Adding status column...");
            await db.run("ALTER TABLE logs ADD COLUMN status TEXT DEFAULT 'pending'");
        }
    } catch (e) {
        console.error("Migration error:", e);
    }

    // Employee Inventory
    await db.run(`CREATE TABLE IF NOT EXISTS employee_inventory (
        employee_name TEXT,
        item_id INTEGER,
        quantity INTEGER,
        PRIMARY KEY (employee_name, item_id)
    )`);

    // Recipes
    await db.run(`CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        ingredient_id INTEGER,
        quantity INTEGER
    )`);

    // Check if recipes exist, if not populate
    const recipeCount = await db.get('SELECT COUNT(*) as count FROM recipes');
    if (recipeCount.count === 0) {
        console.log("Populating initial recipes...");
        const stmt = await db.prepare('INSERT INTO recipes (product_id, ingredient_id, quantity) VALUES (?, ?, ?)');
        for (const [productId, recipe] of Object.entries(initialRecipes)) {
            for (const input of recipe.inputs) {
                // We need to find the ID of the ingredient by name since recipes.js uses names
                // This is a bit tricky since we only have names in recipes.js. 
                // Ideally recipes.js should use IDs. 
                // For now, let's try to look up the ID from initialInventory.
                const ingredientItem = initialInventory.find(i => i.name === input.name);
                if (ingredientItem) {
                    await stmt.run(productId, ingredientItem.id, input.quantity);
                } else {
                    console.warn(`Ingredient ${input.name} not found in inventory for product ID ${productId}`);
                }
            }
        }
        await stmt.finalize();
    }
};

// Call init
initNewTables().catch(console.error);

// --- ACCOUNTING ENDPOINTS ---

// POST Pay (Mark logs as paid)
app.post('/api/accounting/pay', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { logIds, status } = req.body; // status can be 'paid' or 'pending' (to undo)
        const targetStatus = status || 'paid';

        const db = await getDb();
        await db.run('BEGIN TRANSACTION');

        // Use a loop or construct a WHERE IN clause
        const placeholders = logIds.map(() => '?').join(',');
        await db.run(`UPDATE logs SET status = ? WHERE timestamp IN (${placeholders})`, targetStatus, ...logIds);

        await db.run('COMMIT');
        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error paying logs:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Close Week (Move pending to outstanding)
app.post('/api/accounting/close-week', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { weekEnd, employeeName } = req.body; // weekEnd is ISO string of the Friday/Saturday cutoff
        const db = await getDb();

        // Move all 'pending' logs for this employee before or on this date to 'outstanding'
        // Actually, we should probably just mark everything visible in that week view as outstanding.
        // But let's rely on the timestamp.

        await db.run(`UPDATE logs 
            SET status = 'outstanding' 
            WHERE depositor = ? 
            AND status = 'pending' 
            AND timestamp <= ?`,
            employeeName, weekEnd);

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error closing week:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET User Balance
app.get('/api/user/balance', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const db = await getDb();
        // Calculate sum of price * quantity for all 'outstanding' logs for this user
        // Note: quantity is usually positive for 'in' (Einlagern/Lohn), but let's check logic.
        // Lohn is generated on 'in' (Einlagern) or 'out' (Verkauf)?
        // Usually Lohn is for 'Einlagern' (Production).
        // Let's assume all logs with a price > 0 are relevant.

        const result = await db.get(`
            SELECT SUM(price * quantity) as balance 
            FROM logs 
            WHERE depositor = ? 
            AND status = 'outstanding'`,
            req.user.employeeName);

        res.json({ balance: result.balance || 0 });
    } catch (error) {
        console.error("Error fetching balance:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET Employee Inventory
app.get('/api/employee-inventory', async (req, res) => {
    try {
        const db = await getDb();
        const inventory = await db.all('SELECT * FROM employee_inventory');
        res.json(inventory);
    } catch (error) {
        console.error("Error fetching employee inventory:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Employee Inventory (Manual Update)
app.post('/api/employee-inventory/manual', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { employeeName, itemId, quantity } = req.body;
        const db = await getDb();

        if (quantity <= 0) {
            await db.run('DELETE FROM employee_inventory WHERE employee_name = ? AND item_id = ?', employeeName, itemId);
        } else {
            await db.run('INSERT OR REPLACE INTO employee_inventory (employee_name, item_id, quantity) VALUES (?, ?, ?)', employeeName, itemId, quantity);
        }

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating employee inventory:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET Recipes
app.get('/api/recipes', async (req, res) => {
    try {
        const db = await getDb();
        const recipes = await db.all('SELECT * FROM recipes');

        // Group by product_id to match frontend expectation if needed, 
        // or send flat list. Let's send a structured object: { productId: { inputs: [{ id, quantity }] } }
        // Actually, let's stick to a flat list for the API and process on frontend, or structured.
        // Let's send structured to match existing recipes.js format somewhat.

        const structuredRecipes = {};
        for (const r of recipes) {
            if (!structuredRecipes[r.product_id]) {
                structuredRecipes[r.product_id] = { inputs: [] };
            }
            structuredRecipes[r.product_id].inputs.push({ id: r.ingredient_id, quantity: r.quantity });
        }

        res.json(structuredRecipes);
    } catch (error) {
        console.error("Error fetching recipes:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Recipe (Add/Update)
app.post('/api/recipes', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { productId, inputs } = req.body; // inputs: [{ id, quantity }]
        const db = await getDb();

        await db.run('BEGIN TRANSACTION');
        await db.run('DELETE FROM recipes WHERE product_id = ?', productId);

        const stmt = await db.prepare('INSERT INTO recipes (product_id, ingredient_id, quantity) VALUES (?, ?, ?)');
        for (const input of inputs) {
            await stmt.run(productId, input.id, input.quantity);
        }
        await stmt.finalize();
        await db.run('COMMIT');

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving recipe:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE Recipe
app.delete('/api/recipes/:productId', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { productId } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM recipes WHERE product_id = ?', productId);
        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting recipe:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// UNIFIED TRANSACTION HANDLER
app.post('/api/transaction', async (req, res) => {
    try {
        const { type, itemId, quantity, depositor, price, category } = req.body;
        // type: 'in' (Einlagern) or 'out' (Auslagern)
        // category: 'internal' or 'trade'

        const db = await getDb();
        await db.run('BEGIN TRANSACTION');

        // 1. Update Main Inventory
        const item = await db.get('SELECT * FROM inventory WHERE id = ?', itemId);
        if (!item) throw new Error("Item not found");

        let newCurrent = item.current;
        if (type === 'in') {
            newCurrent += quantity;
        } else {
            newCurrent = Math.max(0, newCurrent - quantity);
        }
        await db.run('UPDATE inventory SET current = ? WHERE id = ?', newCurrent, itemId);

        // 2. Update Employee Inventory (Only for internal transactions)
        if (category === 'internal' && depositor !== 'Unbekannt') {
            if (type === 'out') {
                // Auslagern: Warehouse -> Employee (Employee GAINS item)
                await db.run(`INSERT INTO employee_inventory (employee_name, item_id, quantity) 
                    VALUES (?, ?, ?) 
                    ON CONFLICT(employee_name, item_id) 
                    DO UPDATE SET quantity = quantity + ?`,
                    depositor, itemId, quantity, quantity);
            } else if (type === 'in') {
                // Einlagern: Employee -> Warehouse (Employee LOSES item OR ingredients)

                // Check for recipe
                const recipeIngredients = await db.all('SELECT * FROM recipes WHERE product_id = ?', itemId);

                if (recipeIngredients.length > 0) {
                    // It's a crafted item, deduct ingredients
                    for (const ing of recipeIngredients) {
                        const deductQty = ing.quantity * quantity;
                        await db.run(`UPDATE employee_inventory 
                            SET quantity = MAX(0, quantity - ?) 
                            WHERE employee_name = ? AND item_id = ?`,
                            deductQty, depositor, ing.ingredient_id);
                    }
                } else {
                    // Normal item, deduct item itself
                    await db.run(`UPDATE employee_inventory 
                        SET quantity = MAX(0, quantity - ?) 
                        WHERE employee_name = ? AND item_id = ?`,
                        quantity, depositor, itemId);
                }
            }
        }

        // 3. Log Transaction
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            category,
            itemId,
            itemName: item.name,
            quantity,
            depositor,
            price,
            msg: `${type === 'in' ? (category === 'trade' ? 'Gekauft' : 'Eingelagert') : (category === 'trade' ? 'Verkauft' : 'Ausgelagert')}: ${quantity}x ${item.name} (${depositor})`,
            time: new Date().toLocaleTimeString()
        };

        await db.run(
            'INSERT INTO logs (timestamp, type, category, itemId, itemName, quantity, depositor, price, msg, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            logEntry.timestamp, logEntry.type, logEntry.category, logEntry.itemId, logEntry.itemName, logEntry.quantity, logEntry.depositor, logEntry.price, logEntry.msg, logEntry.time, 'pending'
        );

        await db.run('COMMIT');
        broadcastUpdate();
        res.json({ success: true, log: logEntry });

    } catch (error) {
        await db.run('ROLLBACK');
        console.error("Transaction error:", error);
        res.status(500).json({ error: error.message || "Transaction failed" });
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

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('New client connected');
    ws.on('close', () => console.log('Client disconnected'));
});

// Broadcast update to all connected clients
const broadcastUpdate = () => {
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify({ type: 'UPDATE' }));
        }
    });
    console.log('Broadcasted update to all clients');
};

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
