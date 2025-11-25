import React, { useState } from 'react';
import { Bug, RefreshCw, X, UserPlus, Trash2, Users, FileText, ArrowUpRight, ArrowDownLeft, Save } from 'lucide-react';

export default function DebugMenu({ onReset, employees = [], onUpdateEmployees, logs = [], onDeleteLog }) {
    const [isOpen, setIsOpen] = useState(false);
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [activeTab, setActiveTab] = useState('employees'); // 'employees' or 'logs'

    const handleAddEmployee = () => {
        if (newEmployeeName.trim()) {
            const updatedEmployees = [...employees, newEmployeeName.trim()];
            onUpdateEmployees(updatedEmployees);
            setNewEmployeeName('');
        }
    };

    const handleDeleteEmployee = (index) => {
        const updatedEmployees = employees.filter((_, i) => i !== index);
        onUpdateEmployees(updatedEmployees);
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

    return (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
            {isOpen && (
                <div className="bg-slate-900/90 backdrop-blur-md border border-red-500/30 p-4 rounded-lg shadow-2xl animate-fade-in w-96 max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10 flex-shrink-0">
                        <h3 className="font-bold text-red-400 flex items-center gap-2">
                            <Bug className="w-4 h-4" /> Debug Menu
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-4 flex-shrink-0">
                        <button
                            onClick={() => setActiveTab('employees')}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${activeTab === 'employees' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            Mitarbeiter
                        </button>
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${activeTab === 'logs' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            Protokolle
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1 pr-2">
                        {/* Employee Management Section */}
                        {activeTab === 'employees' && (
                            <div className="space-y-4">
                                {/* Actions Section */}
                                <div className="mb-4 p-3 bg-slate-800/50 rounded border border-slate-700">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">System Aktionen</h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={onReset}
                                            className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/50 py-2 rounded transition-all text-xs"
                                            title="Datenbank zurücksetzen"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Reset
                                        </button>
                                        <button
                                            onClick={handleBackup}
                                            className="flex-1 flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/50 py-2 rounded transition-all text-xs"
                                            title="Backup erstellen"
                                        >
                                            <Save className="w-3 h-3" />
                                            Backup
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Mitarbeiter ({employees.length})
                                    </h4>

                                    {/* Add Employee */}
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={newEmployeeName}
                                            onChange={(e) => setNewEmployeeName(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddEmployee()}
                                            placeholder="Name..."
                                            className="flex-1 bg-slate-800/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                                        />
                                        <button
                                            onClick={handleAddEmployee}
                                            className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/50 p-2 rounded transition-all"
                                            title="Mitarbeiter hinzufügen"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Employee List */}
                                    <div className="space-y-1">
                                        {employees.map((emp, idx) => (
                                            <div
                                                key={idx}
                                                className="flex justify-between items-center bg-slate-800/30 hover:bg-slate-800/50 px-3 py-2 rounded text-sm transition-colors"
                                            >
                                                <span className="text-slate-300">{emp}</span>
                                                <button
                                                    onClick={() => handleDeleteEmployee(idx)}
                                                    className="text-red-400 hover:text-red-300 p-1"
                                                    title="Löschen"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Log Management Section */}
                        {activeTab === 'logs' && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Letzte Einträge ({logs.length})
                                </h4>

                                {logs.length === 0 && (
                                    <div className="text-center text-slate-500 py-8 text-sm">
                                        Keine Protokolleinträge vorhanden.
                                    </div>
                                )}

                                {logs.map((log, idx) => (
                                    <div key={idx} className="bg-slate-800/30 border border-slate-700/50 rounded p-3 text-sm hover:bg-slate-800/50 transition-colors group">
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
                                                <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                                            ) : (
                                                <ArrowUpRight className="w-3 h-3 text-amber-400" />
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
                            </div>
                        )}
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-3 rounded-full shadow-lg transition-all ${isOpen
                    ? 'bg-red-500 text-white rotate-90'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                title="Debug Menu"
            >
                <Bug className="w-6 h-6" />
            </button>
        </div>
    );
}
