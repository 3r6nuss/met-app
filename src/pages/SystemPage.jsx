import React, { useState } from 'react';
import { Save, RefreshCw, Trash2, UserPlus, FileText, ArrowUpRight, ArrowDownLeft, ShieldAlert, Edit2, X, Users } from 'lucide-react';
import UserManagement from '../components/UserManagement';

export default function SystemPage({ employees, onUpdateEmployees, logs, onDeleteLog, onReset, user }) {
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [activeTab, setActiveTab] = useState('employees'); // 'employees', 'system', 'logs'

    const isAdmin = user?.role === 'Administrator';

    const [editingIndex, setEditingIndex] = useState(null);
    const [editName, setEditName] = useState('');

    const startEdit = (index, currentName) => {
        setEditingIndex(index);
        setEditName(currentName);
    };

    const saveEdit = (index) => {
        if (editName.trim()) {
            const updatedEmployees = [...employees];
            updatedEmployees[index] = editName.trim();
            onUpdateEmployees(updatedEmployees);
            setEditingIndex(null);
        }
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditName('');
    };

    const handleAddEmployee = () => {
        if (newEmployeeName.trim()) {
            const updatedEmployees = [...employees, newEmployeeName.trim()];
            onUpdateEmployees(updatedEmployees);
            setNewEmployeeName('');
        }
    };

    const handleDeleteEmployee = (index) => {
        if (window.confirm(`Mitarbeiter "${employees[index]}" wirklich löschen?`)) {
            const updatedEmployees = employees.filter((_, i) => i !== index);
            onUpdateEmployees(updatedEmployees);
        }
    };

    const handleBackup = () => {
        fetch('/api/backup', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) alert("Backup erfolgreich erstellt!");
                else alert("Backup fehlgeschlagen!");
            })
            .catch(err => alert("Fehler: " + err));
    };

    const handleResetDatabase = () => {
        if (window.confirm("ACHTUNG: Dies löscht die GESAMTE Datenbank! Wirklich fortfahren?")) {
            onReset();
        }
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-200 flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-violet-400" />
                Systemverwaltung
            </h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-700 pb-1">
                <button
                    onClick={() => setActiveTab('employees')}
                    className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'employees' ? 'bg-slate-800 text-violet-400 border-t border-x border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Mitarbeiter
                </button>
                {isAdmin && (
                    <>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'users' ? 'bg-slate-800 text-violet-400 border-t border-x border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Benutzer
                        </button>
                        <button
                            onClick={() => setActiveTab('system')}
                            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'system' ? 'bg-slate-800 text-violet-400 border-t border-x border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            System & Backup
                        </button>
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'logs' ? 'bg-slate-800 text-violet-400 border-t border-x border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Logs
                        </button>
                    </>
                )}
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
                {/* Employee Management */}
                {activeTab === 'employees' && (
                    <div>
                        <h3 className="text-lg font-bold text-slate-300 mb-4">Mitarbeiter verwalten</h3>
                        <div className="flex gap-2 mb-6">
                            <input
                                type="text"
                                value={newEmployeeName}
                                onChange={(e) => setNewEmployeeName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddEmployee()}
                                placeholder="Neuer Mitarbeiter Name..."
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-violet-500"
                            />
                            <button
                                onClick={handleAddEmployee}
                                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <UserPlus className="w-4 h-4" />
                                Hinzufügen
                            </button>
                        </div>



                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {employees.map((emp, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-800/50 px-4 py-3 rounded-lg border border-slate-700/50">
                                    {editingIndex === idx ? (
                                        <div className="flex gap-2 flex-1 mr-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                                                autoFocus
                                            />
                                            <button onClick={() => saveEdit(idx)} className="text-emerald-400 hover:text-emerald-300"><Save className="w-4 h-4" /></button>
                                            <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-300"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-slate-300">{emp}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => startEdit(idx, emp)}
                                                    className="text-slate-500 hover:text-violet-400 p-2 transition-colors"
                                                    title="Umbenennen"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEmployee(idx)}
                                                    className="text-slate-500 hover:text-red-400 p-2 transition-colors"
                                                    title="Löschen"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {employees.length === 0 && (
                                <div className="text-slate-500 italic col-span-2 text-center py-4">Keine Mitarbeiter angelegt.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* User Management (Admin Only) */}
                {activeTab === 'users' && isAdmin && (
                    <UserManagement employees={employees} />
                )}

                {/* System Actions (Admin Only) */}
                {activeTab === 'system' && isAdmin && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-300 mb-4">Datenbank & Backup</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={handleBackup}
                                    className="flex items-center justify-center gap-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/50 p-6 rounded-xl transition-all group"
                                >
                                    <Save className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                    <div className="text-left">
                                        <div className="font-bold">Backup erstellen</div>
                                        <div className="text-xs opacity-70">Sichert die aktuelle Datenbank</div>
                                    </div>
                                </button>

                                <button
                                    onClick={handleResetDatabase}
                                    className="flex items-center justify-center gap-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 p-6 rounded-xl transition-all group"
                                >
                                    <RefreshCw className="w-8 h-8 group-hover:rotate-180 transition-transform duration-500" />
                                    <div className="text-left">
                                        <div className="font-bold">System Reset</div>
                                        <div className="text-xs opacity-70">Löscht ALLE Daten (Vorsicht!)</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Log Management (Admin Only) */}
                {activeTab === 'logs' && isAdmin && (
                    <div>
                        <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Letzte System-Logs ({logs.length})
                        </h3>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                            {logs.map((log, idx) => (
                                <div key={idx} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 text-sm hover:bg-slate-800/50 transition-colors group">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs text-slate-500">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </span>
                                        <button
                                            onClick={() => onDeleteLog(log.timestamp)}
                                            className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Eintrag löschen"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        {log.type === 'in' ? (
                                            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            <ArrowUpRight className="w-4 h-4 text-amber-400" />
                                        )}
                                        <span className="font-medium text-slate-200">
                                            {log.quantity}x {log.itemName}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">{log.depositor}</span>
                                        <span className="text-slate-500 font-mono">
                                            ${(log.price || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div className="text-center text-slate-500 py-8">Keine Logs vorhanden.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
