import React, { useState, useEffect } from 'react';
import { Car, Fuel, Wrench, AlertTriangle, Plus, Save, Trash2, Edit2, X, Check } from 'lucide-react';

export default function FuhrparkPage({ user }) {
    const isAdmin = user?.role === 'Administrator';
    const isFuhrpark = user?.role === 'Fuhrparkmanager' || isAdmin;

    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newVehicle, setNewVehicle] = useState({
        kennzeichen: '',
        fahrzeugtyp: '',
        lastService: '',
        lastTank: '',
        needsReperkit: false,
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
                setNewVehicle({ kennzeichen: '', fahrzeugtyp: '', lastService: '', lastTank: '', needsReperkit: false, notes: '' });
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

    const toggleReperkit = async (vehicle) => {
        const updated = { ...vehicle, needsReperkit: !vehicle.needsReperkit };
        await handleUpdateVehicle(updated);
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
                            type="date"
                            placeholder="Letzter Service"
                            value={newVehicle.lastService}
                            onChange={(e) => setNewVehicle({ ...newVehicle, lastService: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none"
                        />
                        <input
                            type="date"
                            placeholder="Letzte Tankung"
                            value={newVehicle.lastTank}
                            onChange={(e) => setNewVehicle({ ...newVehicle, lastTank: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none"
                        />
                        <label className="flex items-center gap-2 text-slate-300">
                            <input
                                type="checkbox"
                                checked={newVehicle.needsReperkit}
                                onChange={(e) => setNewVehicle({ ...newVehicle, needsReperkit: e.target.checked })}
                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                            />
                            Reperkit benötigt
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

            {/* Vehicle List */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-900/60">
                        <tr className="text-left text-slate-400 text-sm uppercase">
                            <th className="p-4">Kennzeichen</th>
                            <th className="p-4">Fahrzeugtyp</th>
                            <th className="p-4">Letzter Service</th>
                            <th className="p-4">Letzte Tankung</th>
                            <th className="p-4 text-center">Reperkit</th>
                            <th className="p-4">Notizen</th>
                            <th className="p-4 text-center">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {vehicles.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-slate-500">
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
                                            <Wrench size={14} className="text-amber-400" />
                                            {vehicle.lastService || '-'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Fuel size={14} className="text-emerald-400" />
                                            {vehicle.lastTank || '-'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => toggleReperkit(vehicle)}
                                            className={`p-2 rounded-lg transition-colors ${vehicle.needsReperkit
                                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                    : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700'
                                                }`}
                                            title={vehicle.needsReperkit ? 'Reperkit benötigt!' : 'Reperkit OK'}
                                        >
                                            {vehicle.needsReperkit ? (
                                                <AlertTriangle size={18} />
                                            ) : (
                                                <Check size={18} />
                                            )}
                                        </button>
                                    </td>
                                    <td className="p-4 text-slate-400 text-sm">{vehicle.notes || '-'}</td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => setEditingId(vehicle.id)}
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
            <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Reperkit benötigt</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                    <span>Reperkit OK</span>
                </div>
            </div>
        </div>
    );
}
