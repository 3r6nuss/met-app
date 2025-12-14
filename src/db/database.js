import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../data/database.sqlite');

let dbInstance = null;

export async function getDb() {
    if (dbInstance) return dbInstance;

    dbInstance = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            current INTEGER DEFAULT 0,
            target INTEGER DEFAULT NULL,
            min INTEGER DEFAULT 0,
            unit TEXT,
            price REAL DEFAULT 0,
            image TEXT
        );

        CREATE TABLE IF NOT EXISTS logs (
            timestamp TEXT PRIMARY KEY,
            type TEXT,
            category TEXT,
            itemId INTEGER,
            itemName TEXT,
            quantity INTEGER,
            depositor TEXT,
            price REAL,
            msg TEXT,
            time TEXT
        );

        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            ek REAL,
            vk REAL,
            lohn REAL,
            note TEXT
        );

        CREATE TABLE IF NOT EXISTS verifications (
            timestamp TEXT PRIMARY KEY,
            verifier TEXT,
            snapshot TEXT
        );

        CREATE TABLE IF NOT EXISTS users (
            discordId TEXT PRIMARY KEY,
            username TEXT,
            discriminator TEXT,
            avatar TEXT,
            role TEXT DEFAULT 'Benutzer',
            employeeName TEXT,
            isHaendler BOOLEAN DEFAULT 0,
            isLagerist BOOLEAN DEFAULT 0
        );
    `);

    // Migration: Add isHaendler column if it doesn't exist
    try {
        const tableInfo = await dbInstance.all("PRAGMA table_info(users)");
        const hasIsHaendler = tableInfo.some(col => col.name === 'isHaendler');
        if (!hasIsHaendler) {
            await dbInstance.run("ALTER TABLE users ADD COLUMN isHaendler BOOLEAN DEFAULT 0");
            console.log("Migrated database: Added isHaendler column to users table.");
        }

        const hasIsLagerist = tableInfo.some(col => col.name === 'isLagerist');
        if (!hasIsLagerist) {
            await dbInstance.run("ALTER TABLE users ADD COLUMN isLagerist BOOLEAN DEFAULT 0");
            console.log("Migrated database: Added isLagerist column to users table.");
        }
    } catch (error) {
        console.error("Migration error:", error);
    }

    // Migration: Add priority column to inventory if it doesn't exist
    try {
        const inventoryInfo = await dbInstance.all("PRAGMA table_info(inventory)");
        const hasPriority = inventoryInfo.some(col => col.name === 'priority');
        if (!hasPriority) {
            await dbInstance.run("ALTER TABLE inventory ADD COLUMN priority TEXT DEFAULT NULL");
            console.log("Migrated database: Added priority column to inventory table.");
        }
    } catch (error) {
        console.error("Migration error:", error);
    }

    // Migration: Add debug_log column to audit_logs if it doesn't exist
    try {
        const auditInfo = await dbInstance.all("PRAGMA table_info(audit_logs)");
        const hasDebugLog = auditInfo.some(col => col.name === 'debug_log');
        if (!hasDebugLog) {
            await dbInstance.run("ALTER TABLE audit_logs ADD COLUMN debug_log TEXT DEFAULT NULL");
            console.log("Migrated database: Added debug_log column to audit_logs table.");
        }
    } catch (error) {
        console.error("Migration error (audit_logs):", error);
    }

    return dbInstance;
}

export async function closeDb() {
    if (dbInstance) {
        await dbInstance.close();
        dbInstance = null;
        console.log("Database connection closed.");
    }
}
