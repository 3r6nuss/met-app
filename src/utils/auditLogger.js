import { getDb } from '../db/database.js';

export async function logAudit(action, userId, username, details, debugLog = null) {
    try {
        const db = await getDb();
        const timestamp = new Date().toISOString();
        await db.run(
            'INSERT INTO audit_logs (timestamp, user_id, username, action, details, debug_log) VALUES (?, ?, ?, ?, ?, ?)',
            timestamp,
            userId || 'SYSTEM',
            username || 'System',
            action,
            details,
            debugLog ? JSON.stringify(debugLog) : null
        );
        console.log(`[Audit] ${action}: ${details}`);
    } catch (error) {
        console.error("Failed to write to audit log:", error);
    }
}
