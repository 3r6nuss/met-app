/**
 * Log Matcher Service
 * Matches Discord logs against MET system transaction logs
 * Detects discrepancies like missing transactions or amount mismatches
 */

import { getDb } from '../db/database.js';

// Fuzzy string matching using Levenshtein distance
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase()) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    return dp[m][n];
}

function fuzzyMatch(str1, str2) {
    if (!str1 || !str2) return 0;
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    const distance = levenshteinDistance(str1, str2);
    return (maxLen - distance) / maxLen;
}

/**
 * Match a Discord log against MET system logs
 * @param {string} discordMessageId - The Discord message ID to match
 * @returns {Promise<Object>} Match result
 */
export async function matchDiscordLog(discordMessageId) {
    const db = await getDb();

    // Get the Discord log
    const discordLog = await db.get(
        'SELECT * FROM discord_logs WHERE discord_message_id = ?',
        discordMessageId
    );

    if (!discordLog) {
        console.error(`[LogMatcher] Discord log ${discordMessageId} not found`);
        return null;
    }

    const { parsed_type, employee_name, amount, log_timestamp, reason } = discordLog;

    // Skip if already matched or ignored
    if (discordLog.match_status === 'matched' || discordLog.match_status === 'ignored') {
        return { status: 'already_processed', discordLog };
    }

    // Determine what we're looking for
    const isAnkauf = parsed_type === 'abhebung';
    const isVerkauf = parsed_type === 'rechnung';

    // Time window for matching (±60 minutes from the log timestamp)
    const logTime = new Date(log_timestamp || discordLog.created_at);
    const windowStart = new Date(logTime.getTime() - 60 * 60 * 1000);
    const windowEnd = new Date(logTime.getTime() + 60 * 60 * 1000);

    // Find matching logs in the MET system
    // For Abhebung (cash withdrawal for purchase) → look for 'in' transactions (buying stock)
    // For Rechnung (invoice paid) → look for 'out' transactions (selling to customer)
    const matchType = isAnkauf ? 'in' : 'out';

    // Get already matched timestamps to exclude them
    const alreadyMatched = await db.all(`
        SELECT matched_log_id FROM discord_logs 
        WHERE matched_log_id IS NOT NULL 
        AND match_status = 'matched'
    `);
    const matchedTimestamps = new Set();
    alreadyMatched.forEach(row => {
        if (row.matched_log_id) {
            row.matched_log_id.split(',').forEach(ts => matchedTimestamps.add(ts.trim()));
        }
    });

    let query = `
        SELECT * FROM logs 
        WHERE timestamp BETWEEN ? AND ?
        AND type = ?
    `;
    const params = [windowStart.toISOString(), windowEnd.toISOString(), matchType];

    // Try to filter by employee if available
    if (employee_name) {
        query += ` AND (depositor LIKE ? OR depositor LIKE ?)`;
        params.push(`%${employee_name}%`, `%${employee_name.split(' ')[0]}%`);
    }

    let candidates = await db.all(query, ...params);

    // Filter out already matched logs
    candidates = candidates.filter(log => !matchedTimestamps.has(log.timestamp));

    if (candidates.length === 0) {
        // No matches found
        await db.run(`
            UPDATE discord_logs 
            SET match_status = 'discrepancy', 
                discrepancy_type = 'no_match',
                discrepancy_details = ?
            WHERE id = ?
        `, JSON.stringify({
            message: 'Keine passenden Transaktionen im MET-System gefunden',
            searchWindow: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
            expectedType: matchType
        }), discordLog.id);

        console.log(`[LogMatcher] No match found for Discord log ${discordMessageId}`);
        return { status: 'no_match', discordLog, candidates: [] };
    }

    // Calculate aggregated amount from matching logs
    // Group by depositor to find best employee match
    const employeeGroups = {};

    for (const log of candidates) {
        const depositor = log.depositor || 'unknown';
        if (!employeeGroups[depositor]) {
            employeeGroups[depositor] = {
                logs: [],
                totalAmount: 0,
                matchScore: fuzzyMatch(depositor, employee_name || '')
            };
        }
        employeeGroups[depositor].logs.push(log);
        employeeGroups[depositor].totalAmount += (log.price || 0) * (log.quantity || 1);
    }

    // Find best matching employee group
    let bestMatch = null;
    let bestScore = 0;

    for (const [depositor, group] of Object.entries(employeeGroups)) {
        const score = group.matchScore + (group.totalAmount > 0 ? 0.1 : 0);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = { depositor, ...group };
        }
    }

    if (!bestMatch) {
        bestMatch = {
            depositor: 'aggregated',
            logs: candidates,
            totalAmount: candidates.reduce((sum, log) => sum + (log.price || 0) * (log.quantity || 1), 0),
            matchScore: 0
        };
    }

    // Calculate discrepancy
    const discrepancy = bestMatch.totalAmount - (amount || 0);
    const discrepancyPercent = amount ? Math.abs(discrepancy / amount) * 100 : 0;

    // Determine match quality
    // Allow up to 10% discrepancy as acceptable (could be discounts, rounding, etc.)
    const tolerancePercent = 10;
    const isAmountMatch = discrepancyPercent <= tolerancePercent;

    if (isAmountMatch) {
        // Good match!
        const matchedLogIds = bestMatch.logs.map(l => l.timestamp).join(',');

        await db.run(`
            UPDATE discord_logs 
            SET match_status = 'matched',
                matched_log_id = ?,
                discrepancy_type = NULL,
                discrepancy_details = ?
            WHERE id = ?
        `, matchedLogIds, JSON.stringify({
            matchedLogs: bestMatch.logs.length,
            systemAmount: bestMatch.totalAmount,
            discordAmount: amount,
            difference: discrepancy,
            differencePercent: discrepancyPercent.toFixed(2)
        }), discordLog.id);

        console.log(`[LogMatcher] Matched Discord log ${discordMessageId}: ${bestMatch.totalAmount}$ (system) ≈ ${amount}$ (discord)`);
        return {
            status: 'matched',
            discordLog,
            matchedLogs: bestMatch.logs,
            systemAmount: bestMatch.totalAmount,
            discordAmount: amount,
            discrepancy,
            discrepancyPercent
        };
    } else {
        // Amount mismatch - potential discount or error
        const matchedLogIds = bestMatch.logs.map(l => l.timestamp).join(',');

        await db.run(`
            UPDATE discord_logs 
            SET match_status = 'discrepancy',
                matched_log_id = ?,
                discrepancy_type = 'amount_mismatch',
                discrepancy_details = ?
            WHERE id = ?
        `, matchedLogIds, JSON.stringify({
            message: discrepancy > 0
                ? `System zeigt mehr als Discord (möglicher Rabatt: ${Math.abs(discrepancy).toLocaleString()}$)`
                : `Discord zeigt mehr als System (fehlende Buchungen: ${Math.abs(discrepancy).toLocaleString()}$)`,
            matchedLogs: bestMatch.logs.length,
            systemAmount: bestMatch.totalAmount,
            discordAmount: amount,
            difference: discrepancy,
            differencePercent: discrepancyPercent.toFixed(2),
            isPotentialDiscount: discrepancy > 0,
            isMissingTransaction: discrepancy < 0
        }), discordLog.id);

        console.log(`[LogMatcher] Discrepancy found for ${discordMessageId}: ${bestMatch.totalAmount}$ (system) vs ${amount}$ (discord) = ${discrepancy}$ difference`);
        return {
            status: 'discrepancy',
            discordLog,
            matchedLogs: bestMatch.logs,
            systemAmount: bestMatch.totalAmount,
            discordAmount: amount,
            discrepancy,
            discrepancyPercent
        };
    }
}

/**
 * Get all pending discrepancies
 */
export async function getPendingDiscrepancies() {
    const db = await getDb();
    return db.all(`
        SELECT * FROM discord_logs 
        WHERE match_status = 'discrepancy'
        ORDER BY created_at DESC
    `);
}

/**
 * Resolve a discrepancy
 */
export async function resolveDiscrepancy(discordLogId, resolution) {
    const db = await getDb();

    const { type, note, adjustedValue, resolvedBy } = resolution;

    // Record the resolution
    await db.run(`
        INSERT INTO discrepancy_resolutions (
            discord_log_id, resolved_by, resolution_type,
            old_value, new_value, note, resolved_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `,
        discordLogId,
        resolvedBy,
        type,
        null, // old_value would need the current matched log values
        adjustedValue ? JSON.stringify({ amount: adjustedValue }) : null,
        note
    );

    // Update the discord log status
    await db.run(`
        UPDATE discord_logs 
        SET match_status = ?
        WHERE id = ?
    `, type === 'ignored' ? 'ignored' : 'matched', discordLogId);

    return { success: true, discordLogId, resolution };
}

/**
 * Get matching statistics
 */
export async function getMatchingStats() {
    const db = await getDb();

    const stats = await db.get(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN match_status = 'matched' THEN 1 ELSE 0 END) as matched,
            SUM(CASE WHEN match_status = 'discrepancy' THEN 1 ELSE 0 END) as discrepancies,
            SUM(CASE WHEN match_status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN match_status = 'ignored' THEN 1 ELSE 0 END) as ignored
        FROM discord_logs
    `);

    const recentDiscrepancies = await db.all(`
        SELECT * FROM discord_logs 
        WHERE match_status = 'discrepancy'
        ORDER BY created_at DESC
        LIMIT 10
    `);

    return { stats, recentDiscrepancies };
}

export default {
    matchDiscordLog,
    getPendingDiscrepancies,
    resolveDiscrepancy,
    getMatchingStats
};
