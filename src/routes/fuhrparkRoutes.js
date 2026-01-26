import express from 'express';
import { getDb } from '../db/database.js';
import { serverLog, LogCategory } from '../services/serverLogger.js';

const router = express.Router();

// Middleware: Check if user is Fuhrparkmanager or Admin
const isFuhrparkOrAdmin = (req, res, next) => {
    if (req.isAuthenticated() && (req.user.role === 'Fuhrparkmanager' || req.user.role === 'Administrator')) {
        return next();
    }
    res.status(403).json({ error: 'Zugriff verweigert' });
};

// GET all vehicles
router.get('/fuhrpark', isFuhrparkOrAdmin, async (req, res) => {
    try {
        const db = await getDb();
        const vehicles = await db.all('SELECT * FROM fuhrpark ORDER BY kennzeichen');
        res.json(vehicles);
    } catch (err) {
        console.error('Error fetching vehicles:', err);
        res.status(500).json({ error: 'Fehler beim Laden der Fahrzeuge' });
    }
});

// POST new vehicle
router.post('/fuhrpark', isFuhrparkOrAdmin, async (req, res) => {
    try {
        const { kennzeichen, fahrzeugtyp, lastService, lastTank, needsReperkit, notes } = req.body;
        const db = await getDb();

        const result = await db.run(
            'INSERT INTO fuhrpark (kennzeichen, fahrzeugtyp, lastService, lastTank, needsReperkit, notes) VALUES (?, ?, ?, ?, ?, ?)',
            kennzeichen, fahrzeugtyp || '', lastService || '', lastTank || '', needsReperkit ? 1 : 0, notes || ''
        );

        const newVehicle = await db.get('SELECT * FROM fuhrpark WHERE id = ?', result.lastID);

        await serverLog(LogCategory.CONTENT, `Fahrzeug hinzugefügt: ${kennzeichen}`, { vehicle: newVehicle, addedBy: req.user?.username });

        res.json(newVehicle);
    } catch (err) {
        console.error('Error adding vehicle:', err);
        res.status(500).json({ error: 'Fehler beim Hinzufügen des Fahrzeugs' });
    }
});

// PUT update vehicle
router.put('/fuhrpark/:id', isFuhrparkOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { kennzeichen, fahrzeugtyp, lastService, lastTank, needsReperkit, notes } = req.body;
        const db = await getDb();

        await db.run(
            'UPDATE fuhrpark SET kennzeichen = ?, fahrzeugtyp = ?, lastService = ?, lastTank = ?, needsReperkit = ?, notes = ? WHERE id = ?',
            kennzeichen, fahrzeugtyp || '', lastService || '', lastTank || '', needsReperkit ? 1 : 0, notes || '', id
        );

        await serverLog(LogCategory.CONTENT, `Fahrzeug aktualisiert: ${kennzeichen}`, { id, updatedBy: req.user?.username });

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating vehicle:', err);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Fahrzeugs' });
    }
});

// DELETE vehicle
router.delete('/fuhrpark/:id', isFuhrparkOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDb();

        const vehicle = await db.get('SELECT * FROM fuhrpark WHERE id = ?', id);
        await db.run('DELETE FROM fuhrpark WHERE id = ?', id);

        await serverLog(LogCategory.CONTENT, `Fahrzeug gelöscht: ${vehicle?.kennzeichen}`, { id, deletedBy: req.user?.username });

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting vehicle:', err);
        res.status(500).json({ error: 'Fehler beim Löschen des Fahrzeugs' });
    }
});

export default router;
