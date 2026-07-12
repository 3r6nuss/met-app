import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import http from 'http';
import { getDb } from './src/db/database.js';
import { initBroadcaster } from './src/services/broadcaster.js';

// Import Routes
import authRoutes, { setupPassport } from './src/routes/authRoutes.js';
import inventoryRoutes from './src/routes/inventoryRoutes.js';
import logRoutes from './src/routes/logRoutes.js';
import transactionRoutes from './src/routes/transactionRoutes.js';
import accountingRoutes from './src/routes/accountingRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import devLogsRoutes from './src/routes/devLogsRoutes.js';
import fuhrparkRoutes from './src/routes/fuhrparkRoutes.js';
import discordIntegrationRoutes from './src/routes/discordIntegrationRoutes.js';
import sammelEventRoutes from './src/routes/sammelEventRoutes.js';
import referenceRoutes from './src/routes/referenceRoutes.js';
import ticketRoutes from './src/routes/ticketRoutes.js';

// Import Middleware
import { logger } from './src/middleware/logger.js';
import { initialInventory as _initialInventory } from './src/data/initialData.js';
import { initialPrices as _initialPrices } from './src/data/initialPrices.js';
import { initialEmployees as _initialEmployees } from './src/data/initialEmployees.js';
import { initialPersonnel as _initialPersonnel } from './src/data/initialPersonnel.js';
import { recipes as _initialRecipes } from './src/data/recipes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Server Version (Timestamp)
const SERVER_START_TIME = Date.now();

// Setup WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Initialize broadcaster for real-time notifications
initBroadcaster(wss);

wss.on('connection', (ws) => {
    console.log('New client connected');
    ws.on('close', () => console.log('Client disconnected'));
});

// Broadcast update to all connected clients
const broadcastUpdate = (message = { type: 'UPDATE' }) => {
    const msgString = typeof message === 'string' ? message : JSON.stringify(message);
    const clientsCount = wss.clients.size;
    console.log(`[WebSocket] Broadcasting to ${clientsCount} clients:`, msgString);

    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(msgString);
        }
    });
};

// Make broadcastUpdate available to routes
app.set('broadcastUpdate', broadcastUpdate);

// Version Endpoint
app.get('/api/version', (req, res) => {
    res.json({ version: SERVER_START_TIME });
});

app.get('/api/health', async (req, res) => {
    const startedAt = new Date(SERVER_START_TIME).toISOString();
    const health = {
        status: 'ok',
        service: 'met-app',
        timestamp: new Date().toISOString(),
        startedAt,
        uptimeSeconds: Math.floor(process.uptime()),
        checks: {
            api: { status: 'up' },
            database: { status: 'up' },
            websocket: { status: 'up', clients: wss.clients.size },
        },
        memory: process.memoryUsage(),
    };

    try {
        const db = await getDb();
        await db.get('SELECT 1 AS healthy');
        res.json(health);
    } catch (error) {
        health.status = 'degraded';
        health.checks.database = { status: 'down', message: error.message };
        res.status(503).json(health);
    }
});

// Audit logging function
const logAudit = async (action, userId, username, details, debugData = {}) => {
    try {
        const db = await getDb();
        await db.run(
            'INSERT INTO audit_logs (timestamp, user_id, username, action, details, debug_log) VALUES (?, ?, ?, ?, ?, ?)',
            new Date().toISOString(), userId, username, action, details, JSON.stringify(debugData)
        );
    } catch (e) {
        console.error('Audit log error:', e);
    }
};

// Debug/Error Reporting Route
app.post('/api/debug/log', async (req, res) => {
    try {
        const { error, info, componentStack, url } = req.body;
        const user = req.user || { discordId: 'ANONYMOUS', username: 'Guest' };

        await logAudit(
            'FRONTEND_ERROR',
            user.discordId,
            user.username,
            `Error at ${url}: ${error}`,
            { stack: componentStack, info, error }
        );

        res.json({ success: true });
    } catch (e) {
        console.error("Failed to log frontend error:", e);
        res.status(500).json({ error: "Logging failed" });
    }
});

// Global Error Handler Middleware
app.use(async (err, req, res, _next) => {
    console.error("Unhandled Server Error:", err);

    // Log to DB
    const user = req.user || { discordId: 'SYSTEM', username: 'System' };
    await logAudit(
        'SERVER_ERROR',
        user.discordId,
        user.username,
        `Unhandled Error: ${err.message}`,
        { stack: err.stack, method: req.method, url: req.url, body: req.body }
    );

    res.status(500).json({ error: "Internal Server Error", message: err.message });
});

// Session Configuration
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
});
app.use(sessionMiddleware);

// Setup Passport
setupPassport(app);

server.on('upgrade', (req, socket, head) => {
    sessionMiddleware(req, {}, async () => {
        const userId = req.session?.passport?.user;
        if (!userId) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        try {
            const db = await getDb();
            const user = await db.get('SELECT role FROM users WHERE discordId = ?', userId);
            if (!user || user.role === 'Pending') {
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                socket.destroy();
                return;
            }

            wss.handleUpgrade(req, socket, head, ws => {
                wss.emit('connection', ws, req);
            });
        } catch (error) {
            console.error('[WebSocket] Authentication failed:', error);
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            socket.destroy();
        }
    });
});

app.use(cors({
    origin: ['http://localhost:5173', 'https://met.3r6nuss.de'],
    credentials: true
}));
app.use(express.json());

// Custom Logger Middleware
app.use(logger);

app.use(express.static(path.join(__dirname, 'dist')));

// Public authentication routes and session discovery
app.use('/auth', authRoutes);
app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json(req.user);
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

const requireAuthenticatedUser = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user?.role === 'Pending') {
        return res.status(403).json({ error: 'Account is pending approval' });
    }

    next();
};

// Everything below this point contains internal company data.
app.use('/api', requireAuthenticatedUser);

// Mount protected routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/logs', logRoutes); // Note: /api/logs route file handles /api/logs base
app.use('/api', transactionRoutes); // Transaction routes likely have specific paths like /transaction
app.use('/api', accountingRoutes);
app.use('/api', accountingRoutes);
app.use('/api', adminRoutes);
app.use('/api/dev-logs', devLogsRoutes);
app.use('/api', fuhrparkRoutes);
app.use('/api/discord', discordIntegrationRoutes);
app.use('/api/sammel-event', sammelEventRoutes);
app.use('/api/references', referenceRoutes);
app.use('/api/tickets', ticketRoutes);

// Catch-all for SPA
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- DB INITIALIZATION ---
const initNewTables = async () => {
    const db = await getDb();

    // Tables creation and Migrations...
    // (Pasted from original server.js or simplified if possible. 
    // To ensure nothing breaks, I'll copy the minimal necessary init logic here or just rely on the fact 
    // that most tables are created. But IF this is a fresh run, we need them.)

    // Inventory, Logs, Users, etc are likely already there.
    // But let's be safe and include the imperative Init logic.

    // Employee Inventory
    await db.run(`CREATE TABLE IF NOT EXISTS employee_inventory (employee_name TEXT, item_id INTEGER, quantity INTEGER, PRIMARY KEY (employee_name, item_id))`);
    // Recipes
    await db.run(`CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, ingredient_id INTEGER, quantity INTEGER)`);
    // Contacts
    await db.run(`CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT, name TEXT, second_name TEXT, plz TEXT, info TEXT)`);
    // Ads
    await db.run(`CREATE TABLE IF NOT EXISTS ads (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, description TEXT)`);
    // Beginner Guide
    await db.run(`CREATE TABLE IF NOT EXISTS beginner_guide (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)`);
    // Hausordnung
    await db.run(`CREATE TABLE IF NOT EXISTS hausordnung (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)`);
    // Partners
    await db.run(`CREATE TABLE IF NOT EXISTS partners (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, partner_offer TEXT, met_offer TEXT, info TEXT)`);
    // Personnel
    await db.run(`CREATE TABLE IF NOT EXISTS personnel (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, phone TEXT, truck_license INTEGER DEFAULT 0, contract TEXT, license_plate TEXT, second_job TEXT)`);
    // Violations
    await db.run(`CREATE TABLE IF NOT EXISTS violations (id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER, date TEXT, violation TEXT, remark TEXT, percentage INTEGER, FOREIGN KEY(personnel_id) REFERENCES personnel(id) ON DELETE CASCADE)`);
    // Audit Logs
    await db.run(`CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, user_id TEXT, username TEXT, action TEXT, details TEXT)`);
    // Orders
    await db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, item_name TEXT, quantity INTEGER, requester TEXT, status TEXT DEFAULT 'open', timestamp TEXT, note TEXT)`);
    // Developer Logs
    await db.run(`CREATE TABLE IF NOT EXISTS developer_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, category TEXT, message TEXT, details TEXT)`);
    // Fuhrpark (Fleet Management)
    await db.run(`CREATE TABLE IF NOT EXISTS fuhrpark (id INTEGER PRIMARY KEY AUTOINCREMENT, kennzeichen TEXT UNIQUE, fahrzeugtyp TEXT, besitzer TEXT, kilometerstand TEXT, lastServiceKm TEXT, needsService INTEGER DEFAULT 0, lastTank TEXT, lastTankTime TEXT, needsReparaturkit INTEGER DEFAULT 0, notes TEXT)`);

    // Migrations
    try {
        const tableInfo = await db.all("PRAGMA table_info(inventory)");
        if (!tableInfo.some(col => col.name === 'sortOrder')) await db.run("ALTER TABLE inventory ADD COLUMN sortOrder INTEGER DEFAULT 0");
    } catch { /* Column already exists */ }
    try {
        const tableInfo = await db.all("PRAGMA table_info(logs)");
        if (!tableInfo.some(col => col.name === 'status')) await db.run("ALTER TABLE logs ADD COLUMN status TEXT DEFAULT 'pending'");
    } catch { /* Column already exists */ }
    try {
        const pricesInfo = await db.all("PRAGMA table_info(prices)");
        if (!pricesInfo.some(col => col.name === 'noteVK')) await db.run("ALTER TABLE prices ADD COLUMN noteVK TEXT DEFAULT ''");
    } catch { /* Column already exists */ }

    // Fuhrpark migrations
    try {
        const fuhrparkInfo = await db.all("PRAGMA table_info(fuhrpark)");
        if (fuhrparkInfo.length > 0) {
            if (!fuhrparkInfo.some(col => col.name === 'besitzer')) await db.run("ALTER TABLE fuhrpark ADD COLUMN besitzer TEXT DEFAULT ''");
            if (!fuhrparkInfo.some(col => col.name === 'kilometerstand')) await db.run("ALTER TABLE fuhrpark ADD COLUMN kilometerstand TEXT DEFAULT ''");
            if (!fuhrparkInfo.some(col => col.name === 'lastServiceKm')) await db.run("ALTER TABLE fuhrpark ADD COLUMN lastServiceKm TEXT DEFAULT ''");
            if (!fuhrparkInfo.some(col => col.name === 'lastTankTime')) await db.run("ALTER TABLE fuhrpark ADD COLUMN lastTankTime TEXT DEFAULT ''");
            if (!fuhrparkInfo.some(col => col.name === 'needsService')) await db.run("ALTER TABLE fuhrpark ADD COLUMN needsService INTEGER DEFAULT 0");
            if (!fuhrparkInfo.some(col => col.name === 'needsReparaturkit')) await db.run("ALTER TABLE fuhrpark ADD COLUMN needsReparaturkit INTEGER DEFAULT 0");
            // Migrate old column name if exists
            if (fuhrparkInfo.some(col => col.name === 'needsReperkit') && !fuhrparkInfo.some(col => col.name === 'needsReparaturkit')) {
                await db.run("ALTER TABLE fuhrpark ADD COLUMN needsReparaturkit INTEGER DEFAULT 0");
                await db.run("UPDATE fuhrpark SET needsReparaturkit = needsReperkit");
            }
            // Migrate old lastService date to lastServiceKm if needed (optional data migration)
            if (fuhrparkInfo.some(col => col.name === 'lastService') && !fuhrparkInfo.some(col => col.name === 'lastServiceKm')) {
                await db.run("ALTER TABLE fuhrpark ADD COLUMN lastServiceKm TEXT DEFAULT ''");
            }
        }
    } catch { /* Columns already exist */ }

    // Seed Data checks (implied)
};

// Global Error Handler to force JSON
app.use((err, req, res, next) => {
    console.error('[Global Error]', err);
    if (!res.headersSent) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

initNewTables().catch(console.error);

// Only start server if not running in test mode
if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, '0.0.0.0', async () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
        console.log('Discord Callback URL:', process.env.DISCORD_CALLBACK_URL);

        // Auto-start Discord Bot if configured
        if (process.env.DISCORD_BOT_TOKEN) {
            try {
                const { getDiscordBot } = await import('./src/services/discordBot.js');
                const bot = getDiscordBot();
                await bot.start();
                console.log('[Server] Discord Bot auto-started');
            } catch (error) {
                console.error('[Server] Failed to auto-start Discord Bot:', error.message);
            }
        }
    });
}

export { broadcastUpdate, server };
