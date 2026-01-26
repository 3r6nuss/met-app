import React, { useState, useEffect } from 'react';
import { Car, Fuel, Wrench, AlertTriangle, Plus, Save, Trash2, Edit2, X, Check, Calendar, User, Gauge, Clock } from 'lucide-react';

export default function FuhrparkPage({ user }) {
    const isAdmin = user?.role === 'Administrator';
    const isFuhrpark = user?.role === 'Fuhrparkmanager' || isAdmin;

    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newVehicle, setNewVehicle] = useState({
        kennzeichen: '',
        fahrzeugtyp: '',
        besitzer: '',
        kilometerstand: '',
        lastServiceKm: '',
        needsService: false,
        lastTank: '',
        lastTankTime: '',
        needsReparaturkit: false,
        notes: ''
    });

    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            const res = await fetch('/api/fuhrpark');
            if (res.ok) {
                const data = await res.json();
                setVehicles(data);
            }
        } catch (err) {
            console.error('Error fetching vehicles:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddVehicle = async () => {
        if (!newVehicle.kennzeichen.trim()) return;
        try {
            const res = await fetch('/api/fuhrpark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newVehicle)
            });
            if (res.ok) {
                const added = await res.json();
                setVehicles([...vehicles, added]);
                setNewVehicle({ kennzeichen: '', fahrzeugtyp: '', besitzer: '', kilometerstand: '', lastServiceKm: '', needsService: false, lastTank: '', lastTankTime: '', needsReparaturkit: false, notes: '' });
                setShowAddForm(false);
            }
        } catch (err) {
            console.error('Error adding vehicle:', err);
        }
    };

    const handleUpdateVehicle = async (vehicle) => {
        try {
            const res = await fetch(`/api/fuhrpark/${vehicle.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vehicle)
            });
            if (res.ok) {
                setVehicles(vehicles.map(v => v.id === vehicle.id ? vehicle : v));
                setEditingId(null);
                setEditingVehicle(null);
            }
        } catch (err) {
            console.error('Error updating vehicle:', err);
        }
    };

    const handleDeleteVehicle = async (id) => {
        if (!window.confirm('Fahrzeug wirklich löschen?')) return;
        try {
            const res = await fetch(`/api/fuhrpark/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setVehicles(vehicles.filter(v => v.id !== id));
            }
        } catch (err) {
            console.error('Error deleting vehicle:', err);
        }
    };

    const toggleReparaturkit = async (vehicle) => {
        const updated = { ...vehicle, needsReparaturkit: !vehicle.needsReparaturkit };
        await handleUpdateVehicle(updated);
    };

    const toggleNeedsService = async (vehicle) => {
        const updated = { ...vehicle, needsService: !vehicle.needsService };
        await handleUpdateVehicle(updated);
    };

    const setTankNow = async (vehicle) => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const time = now.toTimeString().slice(0, 5);
        const updated = { ...vehicle, lastTank: today, lastTankTime: time };
        await handleUpdateVehicle(updated);
    };

    const markServiceDone = async (vehicle) => {
        const updated = {
            ...vehicle,
            lastServiceKm: vehicle.kilometerstand || vehicle.lastServiceKm,
            needsService: false
        };
        await handleUpdateVehicle(updated);
    };

    const startEditing = (vehicle) => {
        setEditingId(vehicle.id);
        setEditingVehicle({ ...vehicle });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingVehicle(null);
    };

    // Calculate km since last service
    const getKmSinceService = (vehicle) => {
        const current = parseInt(vehicle.kilometerstand) || 0;
        const lastService = parseInt(vehicle.lastServiceKm) || 0;
        if (current === 0 || lastService === 0) return null;
        return current - lastService;
    };

    if (!isFuhrpark) {
        return (
            <div className="text-center text-red-400 p-8">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
                <p className="text-xl">Zugriff verweigert</p>
            </div>
        );
    }

    if (loading) {
        return <div className="text-center text-violet-400 p-8">Lade Fuhrpark...</div>;
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500 flex items-center gap-4">
                        <Car className="w-10 h-10 text-cyan-400" />
                        Fuhrpark
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Fahrzeugverwaltung</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={18} />
                    Fahrzeug hinzufügen
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Neues Fahrzeug</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Kennzeichen *"
                            value={newVehicle.kennzeichen}
                            onChange={(e) => setNewVehicle({ ...newVehicle, kennzeichen: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Fahrzeugtyp"
                            value={newVehicle.fahrzeugtyp}
                            onChange={(e) => setNewVehicle({ ...newVehicle, fahrzeugtyp: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Besitzer"
                            value={newVehicle.besitzer}
                            onChange={(e) => setNewVehicle({ ...newVehicle, besitzer: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                        />
                        <div className="flex items-center gap-2">
                            <Gauge size={18} className="text-blue-400" />
                            <input
                                type="number"
                                placeholder="Kilometerstand"
                                value={newVehicle.kilometerstand}
                                onChange={(e) => setNewVehicle({ ...newVehicle, kilometerstand: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none flex-1"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Wrench size={18} className="text-amber-400" />
                            <input
                                type="number"
                                placeholder="Letzter Service (km)"
                                value={newVehicle.lastServiceKm}
                                onChange={(e) => setNewVehicle({ ...newVehicle, lastServiceKm: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none flex-1"
                            />
                        </div>
                        <label className="flex items-center gap-2 text-slate-300">
                            <input
                                type="checkbox"
                                checked={newVehicle.needsService}
                                onChange={(e) => setNewVehicle({ ...newVehicle, needsService: e.target.checked })}
                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-amber-600 focus:ring-amber-500"
                            />
                            Service benötigt
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                placeholder="Letzte Tankung"
                                value={newVehicle.lastTank}
                                onChange={(e) => setNewVehicle({ ...newVehicle, lastTank: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none flex-1"
                            />
                            <input
                                type="time"
                                value={newVehicle.lastTankTime}
                                onChange={(e) => setNewVehicle({ ...newVehicle, lastTankTime: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none w-28"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const now = new Date();
                                    setNewVehicle({
                                        ...newVehicle,
                                        lastTank: now.toISOString().split('T')[0],
                                        lastTankTime: now.toTimeString().slice(0, 5)
                                    });
                                }}
                                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                                title="Jetzt setzen"
                            >
                                <Clock size={18} />
                            </button>
                        </div>
                        <label className="flex items-center gap-2 text-slate-300">
                            <input
                                type="checkbox"
                                checked={newVehicle.needsReparaturkit}
                                onChange={(e) => setNewVehicle({ ...newVehicle, needsReparaturkit: e.target.checked })}
                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500"
                            />
                            Reparaturkit benötigt
                        </label>
                        <input
                            type="text"
                            placeholder="Notizen"
                            value={newVehicle.notes}
                            onChange={(e) => setNewVehicle({ ...newVehicle, notes: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleAddVehicle}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                        >
                            <Save size={16} />
                            Speichern
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            <X size={16} />
                            Abbrechen
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Form */}
            {editingId && editingVehicle && (
                <div className="bg-slate-800/60 border border-cyan-500/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Fahrzeug bearbeiten: {editingVehicle.kennzeichen}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Kennzeichen *"
                            value={editingVehicle.kennzeichen}
                            onChange={(e) => setEditingVehicle({ ...editingVehicle, kennzeichen: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Fahrzeugtyp"
                            value={editingVehicle.fahrzeugtyp || ''}
                            onChange={(e) => setEditingVehicle({ ...editingVehicle, fahrzeugtyp: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Besitzer"
                            value={editingVehicle.besitzer || ''}
                            onChange={(e) => setEditingVehicle({ ...editingVehicle, besitzer: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                        />
                        <div className="flex items-center gap-2">
                            <Gauge size={18} className="text-blue-400" />
                            <input
                                type="number"
                                placeholder="Kilometerstand"
                                value={editingVehicle.kilometerstand || ''}
                                onChange={(e) => setEditingVehicle({ ...editingVehicle, kilometerstand: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none flex-1"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Wrench size={18} className="text-amber-400" />
                            <input
                                type="number"
                                placeholder="Letzter Service (km)"
                                value={editingVehicle.lastServiceKm || ''}
                                onChange={(e) => setEditingVehicle({ ...editingVehicle, lastServiceKm: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none flex-1"
                            />
                        </div>
                        <label className="flex items-center gap-2 text-slate-300">
                            <input
                                type="checkbox"
                                checked={editingVehicle.needsService || false}
                                onChange={(e) => setEditingVehicle({ ...editingVehicle, needsService: e.target.checked })}
                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-amber-600 focus:ring-amber-500"
                            />
                            Service benötigt
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={editingVehicle.lastTank || ''}
                                onChange={(e) => setEditingVehicle({ ...editingVehicle, lastTank: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none flex-1"
                            />
                            <input
                                type="time"
                                value={editingVehicle.lastTankTime || ''}
                                onChange={(e) => setEditingVehicle({ ...editingVehicle, lastTankTime: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none w-28"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const now = new Date();
                                    setEditingVehicle({
                                        ...editingVehicle,
                                        lastTank: now.toISOString().split('T')[0],
                                        lastTankTime: now.toTimeString().slice(0, 5)
                                    });
                                }}
                                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                                title="Jetzt setzen"
                            >
                                <Clock size={18} />
                            </button>
                        </div>
                        <label className="flex items-center gap-2 text-slate-300">
                            <input
                                type="checkbox"
                                checked={editingVehicle.needsReparaturkit || false}
                                onChange={(e) => setEditingVehicle({ ...editingVehicle, needsReparaturkit: e.target.checked })}
                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500"
                            />
                            Reparaturkit benötigt
                        </label>
                        <input
                            type="text"
                            placeholder="Notizen"
                            value={editingVehicle.notes || ''}
                            onChange={(e) => setEditingVehicle({ ...editingVehicle, notes: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none md:col-span-2"
                        />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => handleUpdateVehicle(editingVehicle)}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                        >
                            <Save size={16} />
                            Speichern
                        </button>
                        <button
                            onClick={cancelEditing}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            <X size={16} />
                            Abbrechen
                        </button>
                    </div>
                </div>
            )}

            {/* Vehicle List */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                    <thead className="bg-slate-900/60">
                        <tr className="text-left text-slate-400 text-sm uppercase">
                            <th className="p-4">Kennzeichen</th>
                            <th className="p-4">Typ</th>
                            <th className="p-4">Besitzer</th>
                            <th className="p-4">Tacho / Service</th>
                            <th className="p-4">Tankung</th>
                            <th className="p-4 text-center">Rep.Kit</th>
                            <th className="p-4">Notizen</th>
                            <th className="p-4 text-center">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {vehicles.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="p-8 text-center text-slate-500">
                                    Keine Fahrzeuge vorhanden
                                </td>
                            </tr>
                        ) : (
                            vehicles.map((vehicle) => {
                                const kmSinceService = getKmSinceService(vehicle);
                                return (
                                    <tr key={vehicle.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="p-4">
                                            <span className="font-mono font-semibold text-white">{vehicle.kennzeichen}</span>
                                        </td>
                                        <td className="p-4 text-slate-300">{vehicle.fahrzeugtyp || '-'}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <User size={14} className="text-blue-400" />
                                                {vehicle.besitzer || '-'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Gauge size={14} className="text-blue-400" />
                                                    <span className="text-white font-mono">{vehicle.kilometerstand ? `${Number(vehicle.kilometerstand).toLocaleString('de-DE')} km` : '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => toggleNeedsService(vehicle)}
                                                        className={`p-1 rounded transition-colors ${vehicle.needsService
                                                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                                                : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700'
                                                            }`}
                                                        title={vehicle.needsService ? 'Service benötigt!' : 'Service OK'}
                                                    >
                                                        <Wrench size={12} />
                                                    </button>
                                                    <span className="text-xs text-slate-500">
                                                        {vehicle.lastServiceKm ? `@ ${Number(vehicle.lastServiceKm).toLocaleString('de-DE')} km` : 'Kein Service'}
                                                        {kmSinceService !== null && kmSinceService > 0 && (
                                                            <span className={`ml-1 ${kmSinceService > 10000 ? 'text-amber-400' : 'text-slate-400'}`}>
                                                                (+{kmSinceService.toLocaleString('de-DE')})
                                                            </span>
                                                        )}
                                                    </span>
                                                    {vehicle.needsService && (
                                                        <button
                                                            onClick={() => markServiceDone(vehicle)}
                                                            className="text-xs px-2 py-0.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded transition-colors"
                                                            title="Service als erledigt markieren"
                                                        >
                                                            ✓
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setTankNow(vehicle)}
                                                    className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg transition-colors"
                                                    title="Tankung jetzt setzen"
                                                >
                                                    <Fuel size={14} />
                                                </button>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300 text-sm">{vehicle.lastTank || '-'}</span>
                                                    {vehicle.lastTankTime && (
                                                        <span className="text-xs text-slate-500">{vehicle.lastTankTime} Uhr</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => toggleReparaturkit(vehicle)}
                                                className={`p-2 rounded-lg transition-colors ${vehicle.needsReparaturkit
                                                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                        : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700'
                                                    }`}
                                                title={vehicle.needsReparaturkit ? 'Reparaturkit benötigt!' : 'Reparaturkit OK'}
                                            >
                                                {vehicle.needsReparaturkit ? (
                                                    <AlertTriangle size={18} />
                                                ) : (
                                                    <Check size={18} />
                                                )}
                                            </button>
                                        </td>
                                        <td className="p-4 text-slate-400 text-sm max-w-[150px] truncate">{vehicle.notes || '-'}</td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => startEditing(vehicle)}
                                                    className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                                    title="Bearbeiten"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteVehicle(vehicle.id)}
                                                    className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors"
                                                    title="Löschen"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Reparaturkit benötigt</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span>Service benötigt</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                    <span>OK</span>
                </div>
            </div>
        </div>
    );
}
