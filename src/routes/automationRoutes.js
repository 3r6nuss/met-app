import express from 'express';
import { automationService } from '../services/automationService.js';
import { getDb } from '../db/database.js';
import { logAccounting } from '../services/serverLogger.js';

const router = express.Router();

// Middleware to ensure only authorized users access this
const isAuth = (req, res, next) => {
    if (req.isAuthenticated() && (req.user.role === 'Buchhaltung' || req.user.role === 'Administrator')) {
        return next();
    }
    // For development, we might be lenient, but strictly:
    return res.status(403).json({ error: 'Unauthorized' });
};

// GET Analysis Data
router.get('/automation/analysis', isAuth, async (req, res) => {
    try {
        const trafficData = await automationService.analyzeTraffic(200); // Analyze last 200 logs
        const recommendations = await automationService.calculateRecommendations();

        res.json({
            success: true,
            analysis: trafficData,
            recommendations: recommendations
        });
    } catch (error) {
        console.error("Automation Analysis Error:", error);
        res.status(500).json({ error: "Analysis failed" });
    }
});

// POST Execute Recommendation
router.post('/automation/execute', isAuth, async (req, res) => {
    const { type, data } = req.body;
    const db = await getDb();

    try {
        let resultMsg = "";

        if (type === 'CLOSE_WEEK') {
            const { employeeName } = data;
            // Close all pending for this user up to NOW
            const now = new Date().toISOString();
            await db.run(
                `UPDATE logs SET status = 'outstanding' WHERE depositor = ? AND status = 'pending'`,
                employeeName
            );
            resultMsg = `Wochenabschluss für ${employeeName} durchgeführt.`;
            await logAccounting('AUTO_CLOSE_WEEK', resultMsg, data, req.user?.username);
        }
        else if (type === 'PAYOUT') {
            const { employeeName } = data;
            await db.run(
                `UPDATE logs SET status = 'paid' WHERE depositor = ? AND status = 'outstanding'`,
                employeeName
            );
            resultMsg = `Auszahlung für ${employeeName} verbucht.`;
            await logAccounting('AUTO_PAYOUT', resultMsg, data, req.user?.username);
        }
        else if (type === 'FIX_STOCK') {
            const { itemId } = data;
            await db.run(`UPDATE inventory SET current = 0 WHERE id = ?`, itemId);
            resultMsg = `Bestand für Item ${itemId} korrigiert (0).`;
            await logAccounting('AUTO_FIX_STOCK', resultMsg, data, req.user?.username);
        }
        else {
            return res.status(400).json({ error: "Unknown Action Type" });
        }

        // Notify Clients
        if (req.app.get('broadcastUpdate')) req.app.get('broadcastUpdate')();

        res.json({ success: true, message: resultMsg });

    } catch (error) {
        console.error("Automation Execution Error:", error);
        res.status(500).json({ error: "Execution failed" });
    }
});

export default router;
