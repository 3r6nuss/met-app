import { getDb } from './src/db/database.js';
import { matchDiscordLog } from './src/services/logMatcher.js';

async function debug() {
    const db = await getDb();

    // Get latest discord log
    const discordLog = await db.get('SELECT * FROM discord_logs WHERE id = 107');
    console.log('\n=== TESTING MATCH FOR LOG 107 ===');
    console.log('Employee:', discordLog.employee_name);
    console.log('Amount:', discordLog.amount);
    console.log('Log Timestamp:', discordLog.log_timestamp);
    console.log('Created At:', discordLog.created_at);

    // Calculate what the matcher will search for
    const logTime = new Date(discordLog.log_timestamp || discordLog.created_at);
    console.log('Parsed Time:', logTime.toISOString());

    const windowStart = new Date(logTime.getTime() - 60 * 60 * 1000);
    const windowEnd = new Date(logTime.getTime() + 60 * 60 * 1000);
    console.log('Search Window Start:', windowStart.toISOString());
    console.log('Search Window End:', windowEnd.toISOString());

    // Check what MET logs exist in that window
    const metLogs = await db.all(`
        SELECT timestamp, depositor, itemName, quantity, price, (quantity * price) as total 
        FROM logs 
        WHERE type = 'out'
        AND timestamp BETWEEN ? AND ?
    `, windowStart.toISOString(), windowEnd.toISOString());

    console.log('\nMET Logs in Window:', metLogs.length);
    console.table(metLogs);

    // Also show what the actual MET log timestamps look like
    console.log('\n=== Comparing Timestamps ===');
    const allMet = await db.all("SELECT timestamp FROM logs WHERE category = 'trade' ORDER BY timestamp DESC LIMIT 5");
    allMet.forEach(l => {
        const t = new Date(l.timestamp);
        console.log(`MET: ${l.timestamp} -> parsed: ${t.toISOString()}`);
    });

    // Reset and try matching
    await db.run('UPDATE discord_logs SET match_status = ?, discrepancy_type = NULL, matched_log_id = NULL WHERE id = ?', 'pending', 107);

    console.log('\n=== RUNNING MATCHER ===');
    const result = await matchDiscordLog(discordLog.discord_message_id);
    console.log('Result Status:', result?.status);
    if (result?.matchedLogs) {
        console.log('Matched Logs:', result.matchedLogs.length);
        console.log('System Amount:', result.systemAmount);
        console.log('Discord Amount:', result.discordAmount);
    }

    process.exit(0);
}

debug().catch(e => {
    console.error(e);
    process.exit(1);
});
