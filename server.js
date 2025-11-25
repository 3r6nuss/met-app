import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { initialInventory } from './src/data/initialData.js';
import { initialPrices } from './src/data/initialPrices.js';
import { initialEmployees } from './src/data/initialEmployees.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'inventory.json');
const VERIFICATIONS_FILE = path.join(__dirname, 'verifications.json');
const LOGS_FILE = path.join(__dirname, 'logs.json');
const EMPLOYEES_FILE = path.join(__dirname, 'employees.json');
const PRICES_FILE = path.join(__dirname, 'prices.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist'))); // Serve frontend files

// Logging Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

console.log(`Data File: ${DATA_FILE}`);
console.log(`Verifications File: ${VERIFICATIONS_FILE}`);
console.log(`Logs File: ${LOGS_FILE}`);
console.log(`Employees File: ${EMPLOYEES_FILE}`);
console.log(`Prices File: ${PRICES_FILE}`);

// Helper to read data
async function readData(file, defaultData = []) {
    try {
        const data = await fs.readFile(file, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return defaultData;
    }
}

// Helper to write data
async function writeData(file, data) {
    try {
        await fs.writeFile(file, JSON.stringify(data, null, 2));
        console.log(`${new Date().toISOString()} - Successfully wrote to ${path.basename(file)}`);
    } catch (error) {
        console.error(`${new Date().toISOString()} - ERROR writing to ${path.basename(file)}:`, error);
        throw error;
    }
}

// GET Inventory
app.get('/api/inventory', async (req, res) => {
    const data = await readData(DATA_FILE, initialInventory);
    res.json(data);
});

// POST Inventory (Update)
app.post('/api/inventory', async (req, res) => {
    const newData = req.body;
    await writeData(DATA_FILE, newData);
    res.json({ success: true });
});

// GET Verifications
app.get('/api/verifications', async (req, res) => {
    const data = await readData(VERIFICATIONS_FILE, []);
    res.json(data);
});

// POST Verifications
app.post('/api/verifications', async (req, res) => {
    const newEntry = req.body;
    const history = await readData(VERIFICATIONS_FILE, []);
    const newHistory = [newEntry, ...history];
    await writeData(VERIFICATIONS_FILE, newHistory);
    res.json({ success: true });
});

// GET Logs
app.get('/api/logs', async (req, res) => {
    const data = await readData(LOGS_FILE, []);
    res.json(data);
});

// POST Logs
app.post('/api/logs', async (req, res) => {
    const newEntry = req.body;
    const history = await readData(LOGS_FILE, []);
    const newHistory = [newEntry, ...history];
    await writeData(LOGS_FILE, newHistory);
    res.json({ success: true });
});

// PUT Logs (Update all)
app.put('/api/logs', async (req, res) => {
    const newLogs = req.body;
    await writeData(LOGS_FILE, newLogs);
    res.json({ success: true });
});

// GET Employees
app.get('/api/employees', async (req, res) => {
    const data = await readData(EMPLOYEES_FILE, initialEmployees);
    res.json(data);
});

// POST Employees
app.post('/api/employees', async (req, res) => {
    const newData = req.body;
    await writeData(EMPLOYEES_FILE, newData);
    res.json({ success: true });
});

// GET Prices
app.get('/api/prices', async (req, res) => {
    const data = await readData(PRICES_FILE, initialPrices);
    res.json(data);
});

// POST Prices
app.post('/api/prices', async (req, res) => {
    const newData = req.body;
    await writeData(PRICES_FILE, newData);
    res.json({ success: true });
});

// POST Reset
app.post('/api/reset', async (req, res) => {
    await writeData(DATA_FILE, initialInventory);
    await writeData(VERIFICATIONS_FILE, []);
    await writeData(LOGS_FILE, []);
    await writeData(EMPLOYEES_FILE, initialEmployees);
    await writeData(PRICES_FILE, initialPrices);
    res.json(initialInventory);
});

// POST Backup
app.post('/api/backup', async (req, res) => {
    try {
        const backupDir = path.join(__dirname, 'backups');
        await fs.mkdir(backupDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        await fs.copyFile(DATA_FILE, path.join(backupDir, `inventory_${timestamp}.json`));
        await fs.copyFile(LOGS_FILE, path.join(backupDir, `logs_${timestamp}.json`));
        await fs.copyFile(EMPLOYEES_FILE, path.join(backupDir, `employees_${timestamp}.json`));
        await fs.copyFile(VERIFICATIONS_FILE, path.join(backupDir, `verifications_${timestamp}.json`));

        console.log(`${new Date().toISOString()} - Backup created at ${backupDir}`);
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
