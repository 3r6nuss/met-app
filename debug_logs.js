
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'data/database.sqlite');

async function debugLogs() {
    try {
        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        console.log("Connected to database.");

        const inventory = await db.all("SELECT id, name, current FROM inventory LIMIT 5");
        console.log("First 5 inventory items:");
        inventory.forEach(item => {
            console.log(`ID: ${item.id}, Name: ${item.name}, Current: ${item.current}`);
        });

        const logCount = await db.get("SELECT COUNT(*) as count FROM logs");
        console.log(`Total logs: ${logCount.count}`);

        const allLogs = await db.all("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 5");
        console.log("Most recent 5 logs:");
        allLogs.forEach(log => {
            console.log(`[${log.timestamp}] ${log.depositor}: ${log.itemName} (${log.quantity}) - Cat: ${log.category}`);
        });

        await db.close();
    } catch (error) {
        console.error("Error:", error);
    }
}

debugLogs();
