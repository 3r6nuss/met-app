import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../src/db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

async function readJson(filename) {
    try {
        const data = await fs.readFile(path.join(ROOT_DIR, 'data', filename), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.warn(`Could not read ${filename}:`, error.message);
        return [];
    }
}

async function migrate() {
    const db = await getDb();
    console.log('Database connected.');

    // 1. Inventory
    const inventory = await readJson('inventory.json');
    if (inventory.length > 0) {
        const stmt = await db.prepare('INSERT OR REPLACE INTO inventory (id, name, category, current, target, min, unit, price, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const item of inventory) {
            await stmt.run(item.id, item.name, item.category, item.current, item.target, item.min, item.unit, item.price, item.image);
        }
        await stmt.finalize();
        console.log(`Migrated ${inventory.length} inventory items.`);
    }

    // 2. Logs
    const logs = await readJson('logs.json');
    if (logs.length > 0) {
        const stmt = await db.prepare('INSERT OR REPLACE INTO logs (timestamp, type, category, itemId, itemName, quantity, depositor, price, msg, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const log of logs) {
            await stmt.run(
                log.timestamp || new Date().toISOString(), // Ensure timestamp exists
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
        console.log(`Migrated ${logs.length} logs.`);
    }

    // 3. Employees
    const employees = await readJson('employees.json');
    if (employees.length > 0) {
        const stmt = await db.prepare('INSERT OR IGNORE INTO employees (name) VALUES (?)');
        for (const emp of employees) {
            await stmt.run(emp);
        }
        await stmt.finalize();
        console.log(`Migrated ${employees.length} employees.`);
    }

    // 4. Prices
    const prices = await readJson('prices.json');
    if (prices.length > 0) {
        const stmt = await db.prepare('INSERT OR IGNORE INTO prices (name, ek, vk, lohn, note) VALUES (?, ?, ?, ?, ?)');
        for (const price of prices) {
            await stmt.run(price.name, price.ek, price.vk, price.lohn, price.note);
        }
        await stmt.finalize();
        console.log(`Migrated ${prices.length} prices.`);
    }

    // 5. Verifications
    const verifications = await readJson('verifications.json');
    if (verifications.length > 0) {
        const stmt = await db.prepare('INSERT OR REPLACE INTO verifications (timestamp, verifier, snapshot) VALUES (?, ?, ?)');
        for (const v of verifications) {
            await stmt.run(v.timestamp, v.verifier, JSON.stringify(v.snapshot));
        }
        await stmt.finalize();
        console.log(`Migrated ${verifications.length} verifications.`);
    }

    console.log('Migration complete.');
}

migrate().catch(console.error);
