import React, { useState, useEffect } from 'react';
import { Car, Fuel, Wrench, AlertTriangle, Plus, Save, Trash2, Edit2, X, Check, Calendar, User } from 'lucide-react';

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
        lastService: '',
        needsService: false,
        lastTank: '',
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
                setNewVehicle({ kennzeichen: '', fahrzeugtyp: '', besitzer: '', lastService: '', needsService: false, lastTank: '', needsReparaturkit: false, notes: '' });
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

    const setTankToday = async (vehicle) => {
        const today = new Date().toISOString().split('T')[0];
        const updated = { ...vehicle, lastTank: today };
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
                            <input
                                type="date"
                                placeholder="Letzter Service"
                                value={newVehicle.lastService}
                                onChange={(e) => setNewVehicle({ ...newVehicle, lastService: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none flex-1"
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
                            <button
                                type="button"
                                onClick={() => setNewVehicle({ ...newVehicle, lastTank: new Date().toISOString().split('T')[0] })}
                                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                                title="Heute setzen"
                            >
                                <Calendar size={18} />
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
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none md:col-span-2"
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
                        <input
                            type="date"
                            value={editingVehicle.lastService || ''}
                            onChange={(e) => setEditingVehicle({ ...editingVehicle, lastService: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none"
                        />
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
                            <button
                                type="button"
                                onClick={() => setEditingVehicle({ ...editingVehicle, lastTank: new Date().toISOString().split('T')[0] })}
                                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                                title="Heute setzen"
                            >
                                <Calendar size={18} />
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
                <table className="w-full min-w-[900px]">
                    <thead className="bg-slate-900/60">
                        <tr className="text-left text-slate-400 text-sm uppercase">
                            <th className="p-4">Kennzeichen</th>
                            <th className="p-4">Typ</th>
                            <th className="p-4">Besitzer</th>
                            <th className="p-4">Service</th>
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
                            vehicles.map((vehicle) => (
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
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleNeedsService(vehicle)}
                                                className={`p-1.5 rounded-lg transition-colors ${vehicle.needsService
                                                        ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                                        : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700'
                                                    }`}
                                                title={vehicle.needsService ? 'Service benötigt!' : 'Service OK'}
                                            >
                                                <Wrench size={14} />
                                            </button>
                                            <span className="text-slate-300 text-sm">{vehicle.lastService || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setTankToday(vehicle)}
                                                className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg transition-colors"
                                                title="Tankung auf heute setzen"
                                            >
                                                <Fuel size={14} />
                                            </button>
                                            <span className="text-slate-300 text-sm">{vehicle.lastTank || '-'}</span>
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
                            ))
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
