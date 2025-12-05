import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import dotenv from 'dotenv';
import { getDb, closeDb } from './src/db/database.js';
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
            const { role, employeeName, isHaendler, isLagerist } = req.body;
            const { discordId } = req.params;
            const db = await getDb();
            await db.run('UPDATE users SET role = ?, employeeName = ?, isHaendler = ?, isLagerist = ? WHERE discordId = ?', role, employeeName, isHaendler, isLagerist, discordId);
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
        // Check for sortOrder column and migrate if needed
        try {
            const tableInfo = await db.all("PRAGMA table_info(inventory)");
            const hasSortOrder = tableInfo.some(col => col.name === 'sortOrder');
            if (!hasSortOrder) {
                console.log("Migrating inventory table: Adding sortOrder column...");
                await db.run("ALTER TABLE inventory ADD COLUMN sortOrder INTEGER DEFAULT 0");

                // Initialize sortOrder based on current ID order or just 0
                // We can leave it as 0 for now, or update it.
            }
        } catch (e) {
            console.error("Migration error (inventory):", e);
        }

        const inventory = await db.all('SELECT * FROM inventory ORDER BY sortOrder ASC, id ASC');
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
        // Ensure sortOrder column exists (duplicate check but safe)
        try {
            const tableInfo = await db.all("PRAGMA table_info(inventory)");
            if (!tableInfo.some(col => col.name === 'sortOrder')) {
                await db.run("ALTER TABLE inventory ADD COLUMN sortOrder INTEGER DEFAULT 0");
            }
        } catch (e) { }

        const stmt = await db.prepare('INSERT OR REPLACE INTO inventory (id, name, category, current, target, min, unit, price, image, priority, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

        let index = 0;
        for (const item of newData) {
            await stmt.run(item.id, item.name, item.category, item.current, item.target, item.min, item.unit, item.price, item.image, item.priority || null, index++);
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

// PUT Inventory Priority (Buchhaltung/Admin only)
app.put('/api/inventory/:id/priority', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { id } = req.params;
        const { priority } = req.body; // 'high', 'medium', 'low', or null
        const db = await getDb();

        await db.run('UPDATE inventory SET priority = ? WHERE id = ?', priority || null, id);

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating priority:", error);
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
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const newPrices = req.body;
        const db = await getDb();

        await db.run('BEGIN TRANSACTION');
        await db.run('DELETE FROM prices');
        const stmt = await db.prepare('INSERT INTO prices (name, ek, vk, lohn, note, noteVK) VALUES (?, ?, ?, ?, ?, ?)');
        for (const p of newPrices) {
            await stmt.run(p.name, p.ek, p.vk, p.lohn, p.note, p.noteVK || '');
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
        const stmtPrice = await db.prepare('INSERT INTO prices (name, ek, vk, lohn, note, noteVK) VALUES (?, ?, ?, ?, ?, ?)');
        for (const p of initialPrices) {
            await stmtPrice.run(p.name, p.ek, p.vk, p.lohn, p.note, p.noteVK || '');
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

    // Migration: Add noteVK column to prices if it doesn't exist
    try {
        const pricesInfo = await db.all("PRAGMA table_info(prices)");
        const hasNoteVK = pricesInfo.some(col => col.name === 'noteVK');
        if (!hasNoteVK) {
            console.log("Migrating prices table: Adding noteVK column...");
            await db.run("ALTER TABLE prices ADD COLUMN noteVK TEXT DEFAULT ''");
        }
    } catch (e) {
        console.error("Migration error (prices):", e);
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

    // Contacts
    await db.run(`CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT,
        name TEXT,
        second_name TEXT,
        plz TEXT,
        info TEXT
    )`);

    // Ads
    await db.run(`CREATE TABLE IF NOT EXISTS ads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        description TEXT
    )`);

    // Beginner Guide
    await db.run(`CREATE TABLE IF NOT EXISTS beginner_guide (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT
    )`);

    // Seed Beginner Guide if empty
    const guideCount = await db.get('SELECT COUNT(*) as count FROM beginner_guide');
    if (guideCount.count === 0) {
        console.log("Seeding Beginner Guide...");
        const initialGuide = {
            header: {
                title: "M.E.T. LOGISTIC",
                subtitle: "QUICK-START-GUIDE"
            },
            sections: [
                {
                    id: "ansprechpartner",
                    title: "Ansprechpartner",
                    icon: "Users",
                    color: "violet",
                    content: [
                        { type: "list", items: ["Emil Bergmann - CEO", "Patrick Miller - Stv. Leitung", "Emma West - Stv. Leitung"] }
                    ]
                },
                {
                    id: "einstempeln",
                    title: "Einstempeln und Funk",
                    icon: "Radio",
                    color: "fuchsia",
                    content: [
                        {
                            type: "list", items: [
                                "<strong>Einstempeln:</strong> F5 - Job/Fraktion - Multijob Menü",
                                "<strong>Zeiterfassung:</strong> F5 - Job/Fraktion - Dutymenü",
                                "<strong>Funk:</strong> Handy öffnen - Funk-App öffnen - <strong>192.11</strong> oben eingeben - verbinden",
                                "<strong>GPS:</strong> Rechtsklick auf das GPS-Gerät - <strong>19211</strong> eingeben - Schalter nach rechts Stellen - Verbinden"
                            ]
                        }
                    ]
                },
                {
                    id: "abmeldung",
                    title: "Abmeldung",
                    icon: "LogOut",
                    color: "red",
                    content: [
                        {
                            type: "list", items: [
                                "Wenn du weißt, dass du nicht da sein wirst, melde dich bitte ab in 'Abmeldungen'.",
                                "Bei spontan auftretenden Ereignissen bitte ab dem 3. Tag abmelden."
                            ]
                        }
                    ]
                },
                {
                    id: "umgang",
                    title: "Umgang miteinander",
                    icon: "Heart",
                    color: "pink",
                    content: [
                        { type: "text", value: "Wir sehen uns als eine Familie. Das bedeutet:", className: "text-lg font-semibold text-red-400 mb-4" },
                        {
                            type: "list", items: [
                                "Wir unterstützen uns gegenseitig.",
                                "Wir reden offen, aber respektvoll miteinander.",
                                "Probleme werden intern angesprochen und gemeinsam gelöst.",
                                "Wir lassen einander aussprechen und fallen niemandem ins Wort.",
                                "Unstimmigkeiten werden friedlich geklärt.",
                                "Private Auseinandersetzungen haben im beruflichen Umfeld nichts zu suchen."
                            ]
                        }
                    ]
                },
                {
                    id: "fahrzeuge",
                    title: "Umgang mit Fahrzeugen",
                    icon: "Truck",
                    color: "blue",
                    content: [
                        {
                            type: "list", items: [
                                "Keine riskante Fahrweise oder unnötige Beschädigungen.",
                                "Fahrzeuge werden ordnungsgemäß abgestellt und nicht unbeaufsichtigt herum stehen gelassen.",
                                "<span class='font-semibold text-red-400'>➜ Fehlverhalten führt zu Sanktionen.</span>"
                            ]
                        }
                    ]
                },
                {
                    id: "sammelorte",
                    title: "Sammelorte",
                    icon: "MapPin",
                    color: "emerald",
                    content: [
                        {
                            type: "key-value", items: [
                                { key: "Aramid", value: "862" },
                                { key: "Schwarzpulver", value: "961" },
                                { key: "Tabak Blätter", value: "2039" },
                                { key: "Kohle", value: "4014" },
                                { key: "Weintrauben", value: "5008" },
                                { key: "E-Schrott", value: "9253" },
                                { key: "Eisen", value: "9005" }
                            ]
                        }
                    ]
                },
                {
                    id: "herstellungsorte",
                    title: "Herstellungsorte",
                    icon: "MapPin",
                    color: "amber",
                    content: [
                        {
                            type: "key-value", items: [
                                { key: "P-Clips", value: "710" },
                                { key: "Tabak", value: "2002" },
                                { key: "Weinkisten", value: "5001" },
                                { key: "Stahl", value: "10072" },
                                { key: "Platinen", value: "10072" },
                                { key: "Westen", value: "10099" }
                            ]
                        }
                    ]
                },
                {
                    id: "was-tun",
                    title: "Was tun, wenn...?",
                    icon: "AlertTriangle",
                    color: "cyan",
                    content: [
                        { type: "scenario", title: "... dein Fahrzeug voll ist und niemand anwesend ist, mit dem du die Ware einlagern kannst?", text: "Dann kannst du dir einen LKW ausparken, der als Frei in der Job Garage gekennzeichnet ist. Und mit diesem Weiterarbeiten. Falls kein LKW mehr frei sein sollte, kannst du dir einen LKW von einem Kollegen ausparken. Bitte Informiere diesen per SMS darüber." },
                        { type: "scenario", title: "... du alleine im Dienst bist und jemand bezüglich An- und Verkaufen anruft?", text: "Dann sagst du der Person die Anruft, dass sie bitte später noch einmal anrufen soll, da momentan keiner da ist, der Ankaufen kann." }
                    ]
                }
            ]
        };
        await db.run('INSERT INTO beginner_guide (content) VALUES (?)', JSON.stringify(initialGuide));
    }

    // Partners
    await db.run(`CREATE TABLE IF NOT EXISTS partners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        partner_offer TEXT,
        met_offer TEXT,
        info TEXT
    )`);

    // Personnel
    await db.run(`CREATE TABLE IF NOT EXISTS personnel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        phone TEXT,
        truck_license INTEGER DEFAULT 0,
        contract TEXT,
        license_plate TEXT,
        second_job TEXT
    )`);

    // Violations
    await db.run(`CREATE TABLE IF NOT EXISTS violations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        personnel_id INTEGER,
        date TEXT,
        violation TEXT,
        remark TEXT,
        percentage INTEGER,
        FOREIGN KEY(personnel_id) REFERENCES personnel(id) ON DELETE CASCADE
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

// --- PERSONNEL ENDPOINTS ---

// GET Personnel (with violations)
app.get('/api/personnel', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const db = await getDb();
        const personnel = await db.all('SELECT * FROM personnel');

        // Fetch violations for each person
        // This is N+1 but acceptable for small datasets. A JOIN would be better but requires reshaping.
        for (const p of personnel) {
            p.violations = await db.all('SELECT * FROM violations WHERE personnel_id = ? ORDER BY date DESC', p.id);
        }

        res.json(personnel);
    } catch (error) {
        console.error("Error fetching personnel:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Personnel (Add/Update)
app.post('/api/personnel', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { id, name, phone, truck_license, contract, license_plate, second_job } = req.body;
        const db = await getDb();

        if (id) {
            // Update
            await db.run('UPDATE personnel SET name = ?, phone = ?, truck_license = ?, contract = ?, license_plate = ?, second_job = ? WHERE id = ?',
                name, phone, truck_license ? 1 : 0, contract, license_plate, second_job, id);
        } else {
            // Insert
            await db.run('INSERT INTO personnel (name, phone, truck_license, contract, license_plate, second_job) VALUES (?, ?, ?, ?, ?, ?)',
                name, phone, truck_license ? 1 : 0, contract, license_plate, second_job);
        }

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving personnel:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE Personnel
app.delete('/api/personnel/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM personnel WHERE id = ?', id);
        await db.run('DELETE FROM violations WHERE personnel_id = ?', id); // Manual cascade if FK not enforced
        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting personnel:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Violation
app.post('/api/violations', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { personnel_id, date, violation, remark, percentage } = req.body;
        const db = await getDb();
        await db.run('INSERT INTO violations (personnel_id, date, violation, remark, percentage) VALUES (?, ?, ?, ?, ?)',
            personnel_id, date, violation, remark, percentage);
        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving violation:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE Violation
app.delete('/api/violations/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM violations WHERE id = ?', id);
        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting violation:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// --- PARTNERS ENDPOINTS ---

// GET Partners
app.get('/api/partners', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const db = await getDb();
        const partners = await db.all('SELECT * FROM partners');
        res.json(partners);
    } catch (error) {
        console.error("Error fetching partners:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Partners (Add/Update)
app.post('/api/partners', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { id, name, partner_offer, met_offer, info } = req.body;
        const db = await getDb();

        if (id) {
            // Update
            await db.run('UPDATE partners SET name = ?, partner_offer = ?, met_offer = ?, info = ? WHERE id = ?', name, partner_offer, met_offer, info, id);
        } else {
            // Insert
            await db.run('INSERT INTO partners (name, partner_offer, met_offer, info) VALUES (?, ?, ?, ?)', name, partner_offer, met_offer, info);
        }

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving partner:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE Partner
app.delete('/api/partners/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM partners WHERE id = ?', id);
        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting partner:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// --- ADS ENDPOINTS ---

// GET Ads
app.get('/api/ads', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const db = await getDb();
        const ads = await db.all('SELECT * FROM ads');
        res.json(ads);
    } catch (error) {
        console.error("Error fetching ads:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Ads (Add/Update)
app.post('/api/ads', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { id, content, description } = req.body;
        const db = await getDb();

        if (id) {
            await db.run('UPDATE ads SET content = ?, description = ? WHERE id = ?', content, description, id);
        } else {
            await db.run('INSERT INTO ads (content, description) VALUES (?, ?)', content, description);
        }

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving ad:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE Ad
app.delete('/api/ads/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM ads WHERE id = ?', id);
        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting ad:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// --- BEGINNER GUIDE ENDPOINTS ---

// GET Guide
app.get('/api/guide', async (req, res) => {
    try {
        const db = await getDb();
        const guide = await db.get('SELECT * FROM beginner_guide LIMIT 1');
        if (guide) {
            res.json(JSON.parse(guide.content));
        } else {
            res.json(null);
        }
    } catch (error) {
        console.error("Error fetching guide:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Guide (Update)
app.post('/api/guide', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const content = req.body;
        const db = await getDb();

        // Check if exists
        const existing = await db.get('SELECT id FROM beginner_guide LIMIT 1');

        if (existing) {
            await db.run('UPDATE beginner_guide SET content = ? WHERE id = ?', JSON.stringify(content), existing.id);
        } else {
            await db.run('INSERT INTO beginner_guide (content) VALUES (?)', JSON.stringify(content));
        }

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving guide:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// --- CONTACTS ENDPOINTS ---

// GET Contacts
app.get('/api/contacts', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const db = await getDb();
        const contacts = await db.all('SELECT * FROM contacts');
        res.json(contacts);
    } catch (error) {
        console.error("Error fetching contacts:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Contacts (Add/Update)
app.post('/api/contacts', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { id, phone, name, second_name, plz, info } = req.body;
        const db = await getDb();

        if (id) {
            // Update
            await db.run('UPDATE contacts SET phone = ?, name = ?, second_name = ?, plz = ?, info = ? WHERE id = ?', phone, name, second_name, plz, info, id);
        } else {
            // Insert
            await db.run('INSERT INTO contacts (phone, name, second_name, plz, info) VALUES (?, ?, ?, ?, ?)', phone, name, second_name, plz, info);
        }

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving contact:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE Contact
app.delete('/api/contacts/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM contacts WHERE id = ?', id);
        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting contact:", error);
        res.status(500).json({ error: "Database error" });
    }
});

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

// POST Pay Outstanding (Mark all outstanding as paid)
app.post('/api/accounting/pay-outstanding', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { employeeName } = req.body;
        const db = await getDb();

        await db.run(`UPDATE logs 
            SET status = 'paid' 
            WHERE depositor = ? 
            AND status = 'outstanding'`,
            employeeName);

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error paying outstanding:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Pay Week (Mark pending logs in week as paid)
app.post('/api/accounting/pay-week', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { employeeName, weekEnd } = req.body;
        const db = await getDb();

        // Mark 'pending' logs <= weekEnd as 'paid'
        await db.run(`UPDATE logs 
            SET status = 'paid' 
            WHERE depositor = ? 
            AND status = 'pending' 
            AND timestamp <= ?`,
            employeeName, weekEnd);

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error paying week:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET All Balances (for Buchhaltung view)
app.get('/api/accounting/balances', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const db = await getDb();
        const rows = await db.all(`
            SELECT depositor, SUM(price * quantity) as balance 
            FROM logs 
            WHERE status = 'outstanding' 
            GROUP BY depositor
        `);

        const balances = {};
        rows.forEach(row => {
            balances[row.depositor] = row.balance;
        });

        res.json(balances);
    } catch (error) {
        console.error("Error fetching balances:", error);
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

// POST Logs (Generic logging)
app.post('/api/logs', async (req, res) => {
    try {
        const logEntry = req.body;
        const db = await getDb();

        const entry = {
            timestamp: logEntry.timestamp || new Date().toISOString(),
            type: logEntry.type || 'info',
            category: logEntry.category || 'general',
            itemId: logEntry.itemId || null,
            itemName: logEntry.itemName || null,
            quantity: logEntry.quantity || 0,
            depositor: logEntry.depositor || 'System',
            price: logEntry.price || 0,
            msg: logEntry.msg || '',
            time: logEntry.time || new Date().toLocaleTimeString(),
            status: 'pending'
        };

        // Retry loop for log insertion to handle timestamp collisions
        let logInserted = false;
        let retries = 0;
        let currentTimestamp = entry.timestamp;

        while (!logInserted && retries < 5) {
            try {
                await db.run(
                    'INSERT INTO logs (timestamp, type, category, itemId, itemName, quantity, depositor, price, msg, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    currentTimestamp, entry.type, entry.category, entry.itemId, entry.itemName, entry.quantity, entry.depositor, entry.price, entry.msg, entry.time, entry.status
                );
                logInserted = true;
            } catch (e) {
                if (e.code === 'SQLITE_CONSTRAINT') {
                    console.warn(`Timestamp collision for ${currentTimestamp}, retrying...`);
                    // Increment timestamp by 1ms
                    const date = new Date(currentTimestamp);
                    date.setMilliseconds(date.getMilliseconds() + 1);
                    currentTimestamp = date.toISOString();
                    retries++;
                } else {
                    throw e;
                }
            }
        }

        if (!logInserted) {
            console.error("Failed to insert log after retries due to timestamp collision");
            res.status(500).json({ error: "Failed to save log" });
            return;
        }

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving log:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// --- ORDERS FEATURE ---

// Initialize Orders Table
const initOrdersTable = async () => {
    const db = await getDb();
    await db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT,
        quantity INTEGER,
        requester TEXT,
        status TEXT DEFAULT 'open',
        timestamp TEXT,
        note TEXT
    )`);
};
initOrdersTable().catch(console.error);

// GET Orders
app.get('/api/orders', async (req, res) => {
    try {
        const db = await getDb();
        const orders = await db.all('SELECT * FROM orders ORDER BY timestamp DESC');
        res.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST Order (Create)
app.post('/api/orders', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const { itemName, quantity, note } = req.body;
        const requester = req.user.employeeName || req.user.username;
        const timestamp = new Date().toISOString();

        const db = await getDb();
        await db.run(
            'INSERT INTO orders (item_name, quantity, requester, status, timestamp, note) VALUES (?, ?, ?, ?, ?, ?)',
            itemName, quantity, requester, 'open', timestamp, note
        );

        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// PUT Order (Update Status)
app.put('/api/orders/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const { id } = req.params;
        const { status } = req.body;
        const db = await getDb();
        await db.run('UPDATE orders SET status = ? WHERE id = ?', status, id);
        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE Order
app.delete('/api/orders/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM orders WHERE id = ?', id);
        broadcastUpdate();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting order:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// UNIFIED TRANSACTION HANDLER
app.post('/api/transaction', async (req, res) => {
    let db;
    try {
        const { type, itemId, quantity, depositor, price, category, timestamp, skipInventory, itemName: providedItemName } = req.body;
        // type: 'in' (Einlagern) or 'out' (Auslagern)
        // category: 'internal' or 'trade'
        // skipInventory: true for special bookings (Sonderbuchung)

        db = await getDb();
        await db.run('BEGIN TRANSACTION');

        let itemName = providedItemName;

        if (!skipInventory) {
            // 1. Update Main Inventory
            const item = await db.get('SELECT * FROM inventory WHERE id = ?', itemId);
            if (!item) throw new Error("Item not found");
            itemName = item.name;

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

                    // Cleanup: Remove items with 0 quantity
                    await db.run('DELETE FROM employee_inventory WHERE employee_name = ? AND quantity <= 0', depositor);
                }
            }
        }

        // 3. Log Transaction
        const logEntry = {
            timestamp: timestamp || new Date().toISOString(),
            type,
            category,
            itemId: itemId || null,
            itemName: itemName || 'Unbekannt',
            quantity,
            depositor,
            price,
            msg: `${type === 'in' ? (category === 'trade' ? 'Gekauft' : (skipInventory ? 'Sonderbuchung' : 'Eingelagert')) : (category === 'trade' ? 'Verkauft' : 'Ausgelagert')}: ${quantity}x ${itemName} (${depositor})`,
            time: new Date().toLocaleTimeString()
        };

        // Retry loop for log insertion to handle timestamp collisions
        let logInserted = false;
        let retries = 0;
        let currentTimestamp = logEntry.timestamp;

        while (!logInserted && retries < 5) {
            try {
                await db.run(
                    'INSERT INTO logs (timestamp, type, category, itemId, itemName, quantity, depositor, price, msg, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    currentTimestamp, logEntry.type, logEntry.category, logEntry.itemId, logEntry.itemName, logEntry.quantity, logEntry.depositor, logEntry.price, logEntry.msg, logEntry.time, 'pending'
                );
                logInserted = true;
            } catch (err) {
                if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('logs.timestamp')) {
                    // Collision detected, add 1ms and retry
                    const date = new Date(currentTimestamp);
                    date.setMilliseconds(date.getMilliseconds() + 1 + Math.floor(Math.random() * 10)); // Add random 1-10ms
                    currentTimestamp = date.toISOString();
                    retries++;
                } else {
                    throw err; // Re-throw other errors
                }
            }
        }

        if (!logInserted) throw new Error("Failed to generate unique timestamp for log");

        await db.run('COMMIT');
        broadcastUpdate();
        res.json({ success: true, log: logEntry });

    } catch (error) {
        if (db) {
            try {
                await db.run('ROLLBACK');
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError);
            }
        }
        console.error("Transaction error:", error);
        res.status(500).json({ error: error.message || "Transaction failed" });
    }
});

// POST Backup
app.post('/api/backup', async (req, res) => {
    try {
        // Database is located in /app/data/database.sqlite in Docker (and ./data/database.sqlite locally)
        const dbPath = path.join(__dirname, 'data', 'database.sqlite');

        // Save backups to /app/data/backups so they persist in the volume
        const backupDir = path.join(__dirname, 'data', 'backups');

        // Use dynamic import for fs/promises to keep it compatible if top-level await is an issue (though it shouldn't be in modules)
        // or just to match the style.
        const fs = (await import('fs/promises')).default;

        await fs.mkdir(backupDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `database_${timestamp}.sqlite`);

        await fs.copyFile(dbPath, backupPath);

        console.log(`${new Date().toISOString()} - Backup created at ${backupPath}`);
        res.json({ success: true, message: "Backup created successfully", path: backupPath });
    } catch (error) {
        console.error("Backup failed:", error);
        res.status(500).json({ error: "Backup failed: " + error.message });
    }
});

// GET Backups
app.get('/api/backups', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'Buchhaltung' && req.user.role !== 'Administrator')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const backupDir = path.join(__dirname, 'data', 'backups');
        const fs = (await import('fs/promises')).default;

        // Check if dir exists
        try {
            await fs.access(backupDir);
        } catch {
            return res.json([]); // No backups yet
        }

        const files = await fs.readdir(backupDir);
        const backups = [];

        for (const file of files) {
            if (file.endsWith('.sqlite')) {
                const stats = await fs.stat(path.join(backupDir, file));
                backups.push({
                    name: file,
                    size: stats.size,
                    created: stats.birthtime
                });
            }
        }

        // Sort by creation time desc
        backups.sort((a, b) => new Date(b.created) - new Date(a.created));

        res.json(backups);
    } catch (error) {
        console.error("Error fetching backups:", error);
        res.status(500).json({ error: "Failed to fetch backups" });
    }
});

// POST Restore Backup
app.post('/api/restore', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { filename } = req.body;
        if (!filename) return res.status(400).json({ error: "Filename required" });

        const backupPath = path.join(__dirname, 'data', 'backups', filename);
        const dbPath = path.join(__dirname, 'data', 'database.sqlite');
        const fs = (await import('fs/promises')).default;

        // Verify backup exists
        try {
            await fs.access(backupPath);
        } catch {
            return res.status(404).json({ error: "Backup file not found" });
        }

        console.log(`Restoring backup from ${backupPath}...`);

        // 1. Close DB Connection
        await closeDb();

        // 2. Replace DB File
        await fs.copyFile(backupPath, dbPath);

        // 3. Re-open DB (handled by next request to getDb)
        // But let's verify it opens
        await getDb();

        console.log("Restore successful.");
        broadcastUpdate();
        res.json({ success: true, message: "Restore successful" });
    } catch (error) {
        console.error("Restore failed:", error);
        res.status(500).json({ error: "Restore failed: " + error.message });
    }
});

// DELETE Backup
app.delete('/api/backups/:filename', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const { filename } = req.params;
        const backupPath = path.join(__dirname, 'data', 'backups', filename);
        const fs = (await import('fs/promises')).default;

        await fs.unlink(backupPath);

        console.log(`Deleted backup ${filename}`);
        res.json({ success: true });
    } catch (error) {
        console.error("Delete backup failed:", error);
        res.status(500).json({ error: "Delete failed: " + error.message });
    }
});

// Catch-all for SPA (Express 5 compatible)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

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
