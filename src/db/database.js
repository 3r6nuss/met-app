import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.TEST_DB_PATH || path.join(__dirname, '../../data/database.sqlite');

let dbInstance = null;

export async function getDb() {
    if (dbInstance) return dbInstance;

    dbInstance = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    await dbInstance.exec('PRAGMA foreign_keys = ON;');

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
            image TEXT,
            priority TEXT DEFAULT NULL,
            sortOrder INTEGER DEFAULT 0
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
            time TEXT,
            status TEXT DEFAULT 'pending'
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

        CREATE TABLE IF NOT EXISTS employee_inventory (employee_name TEXT, item_id INTEGER, quantity INTEGER, PRIMARY KEY (employee_name, item_id));
        CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, ingredient_id INTEGER, quantity INTEGER);
        CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT, name TEXT, second_name TEXT, plz TEXT, info TEXT);
        CREATE TABLE IF NOT EXISTS ads (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, description TEXT);
        CREATE TABLE IF NOT EXISTS beginner_guide (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT);
        CREATE TABLE IF NOT EXISTS hausordnung (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT);
        CREATE TABLE IF NOT EXISTS partners (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, partner_offer TEXT, met_offer TEXT, info TEXT);
        CREATE TABLE IF NOT EXISTS personnel (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, phone TEXT, truck_license INTEGER DEFAULT 0, contract TEXT, license_plate TEXT, second_job TEXT);
        CREATE TABLE IF NOT EXISTS violations (id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER, date TEXT, violation TEXT, remark TEXT, percentage INTEGER, FOREIGN KEY(personnel_id) REFERENCES personnel(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, user_id TEXT, username TEXT, action TEXT, details TEXT, debug_log TEXT DEFAULT NULL);
        CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, item_name TEXT, quantity INTEGER, requester TEXT, status TEXT DEFAULT 'open', timestamp TEXT, note TEXT);

        -- Discord Bot Integration Tables
        CREATE TABLE IF NOT EXISTS discord_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_message_id TEXT UNIQUE,
            channel_id TEXT,
            raw_content TEXT,
            parsed_type TEXT,
            employee_name TEXT,
            customer_name TEXT,
            amount REAL,
            reason TEXT,
            log_timestamp TEXT,
            matched_log_id TEXT,
            match_status TEXT DEFAULT 'pending',
            discrepancy_type TEXT,
            discrepancy_details TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS discrepancy_resolutions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_log_id INTEGER,
            resolved_by TEXT,
            resolution_type TEXT,
            old_value TEXT,
            new_value TEXT,
            note TEXT,
            resolved_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(discord_log_id) REFERENCES discord_logs(id)
        );

        -- Sammel-Event (Collection Competition)
        CREATE TABLE IF NOT EXISTS sammel_teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            color TEXT DEFAULT '#8b5cf6'
        );
        CREATE TABLE IF NOT EXISTS sammel_team_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_id INTEGER NOT NULL,
            employee_name TEXT NOT NULL,
            FOREIGN KEY(team_id) REFERENCES sammel_teams(id) ON DELETE CASCADE,
            UNIQUE(employee_name)
        );
        CREATE TABLE IF NOT EXISTS sammel_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS sammel_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_name TEXT NOT NULL,
            team_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(team_id) REFERENCES sammel_teams(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS sammel_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            start_date TEXT,
            end_date TEXT
        );
        INSERT OR IGNORE INTO sammel_settings (id) VALUES (1);
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

    // Migration: Add status column to employees if it doesn't exist
    try {
        const empInfo = await dbInstance.all("PRAGMA table_info(employees)");
        const hasStatus = empInfo.some(col => col.name === 'status');
        if (!hasStatus) {
            await dbInstance.run("ALTER TABLE employees ADD COLUMN status TEXT DEFAULT 'active'");
            console.log("Migrated database: Added status column to employees table.");
        }

        // Migration: Add visible_in_protocol column to employees
        const hasVisibleInProtocol = empInfo.some(col => col.name === 'visible_in_protocol');
        if (!hasVisibleInProtocol) {
            await dbInstance.run("ALTER TABLE employees ADD COLUMN visible_in_protocol INTEGER DEFAULT 1");
            console.log("Migrated database: Added visible_in_protocol column to employees table.");
        }

        // Migration: Add protocol_name column to employees
        const hasProtocolName = empInfo.some(col => col.name === 'protocol_name');
        if (!hasProtocolName) {
            await dbInstance.run("ALTER TABLE employees ADD COLUMN protocol_name TEXT DEFAULT NULL");
            console.log("Migrated database: Added protocol_name column to employees table.");
        }
    } catch (error) {
        console.error("Migration error (employees):", error);
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
