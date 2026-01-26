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
        const { kennzeichen, fahrzeugtyp, besitzer, kilometerstand, lastServiceKm, needsService, lastTank, lastTankTime, needsReparaturkit, notes } = req.body;
        const db = await getDb();

        const result = await db.run(
            'INSERT INTO fuhrpark (kennzeichen, fahrzeugtyp, besitzer, kilometerstand, lastServiceKm, needsService, lastTank, lastTankTime, needsReparaturkit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            kennzeichen, fahrzeugtyp || '', besitzer || '', kilometerstand || '', lastServiceKm || '', needsService ? 1 : 0, lastTank || '', lastTankTime || '', needsReparaturkit ? 1 : 0, notes || ''
        );

        const newVehicle = await db.get('SELECT * FROM fuhrpark WHERE id = ?', result.lastID);

        await serverLog(LogCategory.CONTENT, `Fuhrpark: Fahrzeug hinzugefügt - ${kennzeichen}`, {
            vehicle: newVehicle,
            addedBy: req.user?.username
        });

        // Broadcast update to all clients
        const broadcastUpdate = req.app.get('broadcastUpdate');
        if (broadcastUpdate) broadcastUpdate({ type: 'UPDATE' });

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
        const { kennzeichen, fahrzeugtyp, besitzer, kilometerstand, lastServiceKm, needsService, lastTank, lastTankTime, needsReparaturkit, notes } = req.body;
        const db = await getDb();

        // Get old vehicle for diff logging
        const oldVehicle = await db.get('SELECT * FROM fuhrpark WHERE id = ?', id);

        await db.run(
            'UPDATE fuhrpark SET kennzeichen = ?, fahrzeugtyp = ?, besitzer = ?, kilometerstand = ?, lastServiceKm = ?, needsService = ?, lastTank = ?, lastTankTime = ?, needsReparaturkit = ?, notes = ? WHERE id = ?',
            kennzeichen, fahrzeugtyp || '', besitzer || '', kilometerstand || '', lastServiceKm || '', needsService ? 1 : 0, lastTank || '', lastTankTime || '', needsReparaturkit ? 1 : 0, notes || '', id
        );

        // Build changes log
        const changes = [];
        if (oldVehicle) {
            if (oldVehicle.kennzeichen !== kennzeichen) changes.push(`Kennzeichen: ${oldVehicle.kennzeichen} → ${kennzeichen}`);
            if (oldVehicle.besitzer !== besitzer) changes.push(`Besitzer: ${oldVehicle.besitzer || '-'} → ${besitzer || '-'}`);
            if (oldVehicle.kilometerstand !== kilometerstand) changes.push(`Km: ${oldVehicle.kilometerstand || '-'} → ${kilometerstand || '-'}`);
            if (oldVehicle.lastServiceKm !== lastServiceKm) changes.push(`Service-Km: ${oldVehicle.lastServiceKm || '-'} → ${lastServiceKm || '-'}`);
            if (Boolean(oldVehicle.needsService) !== Boolean(needsService)) changes.push(`Service benötigt: ${oldVehicle.needsService ? 'Ja' : 'Nein'} → ${needsService ? 'Ja' : 'Nein'}`);
            if (oldVehicle.lastTank !== lastTank) changes.push(`Tankung: ${oldVehicle.lastTank || '-'} → ${lastTank || '-'}`);
            if (oldVehicle.lastTankTime !== lastTankTime) changes.push(`Tank-Zeit: ${oldVehicle.lastTankTime || '-'} → ${lastTankTime || '-'}`);
            if (Boolean(oldVehicle.needsReparaturkit) !== Boolean(needsReparaturkit)) changes.push(`Reparaturkit: ${oldVehicle.needsReparaturkit ? 'benötigt' : 'OK'} → ${needsReparaturkit ? 'benötigt' : 'OK'}`);
        }

        await serverLog(LogCategory.CONTENT, `Fuhrpark: Fahrzeug aktualisiert - ${kennzeichen}`, {
            id,
            changes: changes.length > 0 ? changes : ['Keine wesentlichen Änderungen'],
            updatedBy: req.user?.username
        });

        // Broadcast update to all clients
        const broadcastUpdate = req.app.get('broadcastUpdate');
        if (broadcastUpdate) broadcastUpdate({ type: 'UPDATE' });

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

        await serverLog(LogCategory.CONTENT, `Fuhrpark: Fahrzeug gelöscht - ${vehicle?.kennzeichen}`, {
            id,
            vehicle,
            deletedBy: req.user?.username
        });

        // Broadcast update to all clients
        const broadcastUpdate = req.app.get('broadcastUpdate');
        if (broadcastUpdate) broadcastUpdate({ type: 'UPDATE' });

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting vehicle:', err);
        res.status(500).json({ error: 'Fehler beim Löschen des Fahrzeugs' });
    }
});

export default router;
