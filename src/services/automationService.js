import { getDb } from '../db/database.js';

// Configuration for "Anomalies"
const ANOMALY_THRESHOLDS = {
    HIGH_QUANTITY: 1000,
    HIGH_PRICE: 1000000, // 1 Million
    REPEAT_FREQUENCY: 5 // If same user does same action 5 times in 1 minute (not implemented deeply yet)
};

export const automationService = {
    /**
     * Analyzes recent traffic for statistics and anomalies
     */
    async analyzeTraffic(limit = 100) {
        const db = await getDb();

        // Fetch recent logs
        const logs = await db.all(`
            SELECT * FROM logs 
            ORDER BY timestamp DESC 
            LIMIT ?
        `, limit);

        const analysis = {
            totalTraffic: logs.length,
            volumeMoved: 0,
            moneyMoved: 0,
            anomalies: [],
            activityByHour: {},
            topActors: {}
        };

        logs.forEach(log => {
            // Stats
            analysis.volumeMoved += Math.abs(log.quantity || 0);
            analysis.moneyMoved += Math.abs((log.price || 0) * (log.quantity || 0));

            // Activity by Hour
            const hour = new Date(log.timestamp).getHours();
            analysis.activityByHour[hour] = (analysis.activityByHour[hour] || 0) + 1;

            // Top Actors
            const actor = log.depositor || 'Unknown';
            analysis.topActors[actor] = (analysis.topActors[actor] || 0) + 1;

            // Anomaly Detection
            if (log.quantity > ANOMALY_THRESHOLDS.HIGH_QUANTITY) {
                analysis.anomalies.push({ type: 'HIGH_QUANTITY', severity: 'medium', log });
            }
            if ((log.price * log.quantity) > ANOMALY_THRESHOLDS.HIGH_PRICE) {
                analysis.anomalies.push({ type: 'HIGH_VALUE', severity: 'high', log });
            }
            // Smart Check: Selling Items but Price is Negative (Buying)?
            // In this system: 
            // type=out (Sell) usually means Income (Positive Value logic depends on implementation)
            // standard: 'out' of internal storage = Sold to customer? Or 'in' to internal = Produced?
            // Let's just flag if price is huge.
        });

        return analysis;
    },

    /**
     * Generates actionable recommendations (Auto-Pilot)
     */
    async calculateRecommendations() {
        const db = await getDb();
        const recommendations = [];

        // 1. Check for Pending Weeks (Employees with pending logs)
        // Group by depositor, count pending
        const pendingRows = await db.all(`
            SELECT depositor, COUNT(*) as count, SUM(price * quantity) as total_value
            FROM logs 
            WHERE status = 'pending' 
            GROUP BY depositor
        `);

        pendingRows.forEach(row => {
            if (row.count > 0) {
                recommendations.push({
                    id: `close-week-${row.depositor}-${Date.now()}`,
                    type: 'CLOSE_WEEK',
                    title: `Wochenabschluss: ${row.depositor}`,
                    description: `${row.count} Logs offen (${row.total_value} $). Woche abschließen?`,
                    impact: 'high',
                    data: { employeeName: row.depositor, amount: row.total_value }
                });
            }
        });

        // 2. Check for Outstanding Payouts
        const outstandingRows = await db.all(`
            SELECT depositor, SUM(price * quantity) as balance
            FROM logs 
            WHERE status = 'outstanding'
            GROUP BY depositor
            HAVING balance > 0
        `);

        outstandingRows.forEach(row => {
            recommendations.push({
                id: `payout-${row.depositor}-${Date.now()}`,
                type: 'PAYOUT',
                title: `Auszahlung: ${row.depositor}`,
                description: `Offener Betrag: ${row.balance} $. Jetzt auszahlen?`,
                impact: 'medium',
                data: { employeeName: row.depositor, amount: row.balance }
            });
        });

        // 3. Check for Negative Inventory (Data Integrity)
        // This is expensive to check perfectly, let's just check registered inventory
        const negativeStock = await db.all(`SELECT * FROM inventory WHERE current < 0`);
        negativeStock.forEach(item => {
            recommendations.push({
                id: `fix-stock-${item.id}`,
                type: 'FIX_STOCK',
                title: `Bestandsfehler: ${item.name}`,
                description: `Bestand ist negativ (${item.current}). Auf 0 setzen?`,
                impact: 'low',
                data: { itemId: item.id }
            });
        });

        return recommendations;
    }
};
