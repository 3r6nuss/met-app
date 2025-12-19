import React, { useState, useEffect } from 'react';
import { Save, Trash2, Eye, EyeOff, Plus, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VisibilityControlPage({ user }) {
    const [rules, setRules] = useState([]);
    const [logs, setLogs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form inputs
    const [newItem, setNewItem] = useState('');
    const [newEmployee, setNewEmployee] = useState('GLOBAL');
    const [newViewEmployee, setNewViewEmployee] = useState(true);
    const [newViewPeriod, setNewViewPeriod] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/visibility-rules').then(res => res.json()),
            fetch('/api/logs').then(res => res.json()), // To get unique item names
            fetch('/api/employees').then(res => res.json())
        ]).then(([rulesData, logsData, empData]) => {
            setRules(rulesData || []);
            setLogs(logsData || []);
            setEmployees(empData || []);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load data", err);
            setLoading(false);
        });
    }, []);

    // Extract unique booking names (items/categories)
    const uniqueItems = React.useMemo(() => {
        const set = new Set();
        // Add some defaults
        ['Auszahlung', 'E-Schrott', 'Sonderbuchung'].forEach(d => set.add(d));
        logs.forEach(l => {
            if (l.itemName) set.add(l.itemName);
        });
        return Array.from(set).sort();
    }, [logs]);

    const handleSave = () => {
        if (!newItem) return;

        const payload = {
            item_name: newItem,
            employee_name: newEmployee,
            view_employee_log: newViewEmployee,
            view_period_protocol: newViewPeriod
        };

        fetch('/api/visibility-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Reload rules
                    fetch('/api/visibility-rules').then(res => res.json()).then(setRules);
                    // Reset form (keep employee/flags?? Maybe specific workflow prefers reset)
                    // setNewItem(''); 
                } else {
                    alert("Fehler beim Speichern");
                }
            });
    };

    const handleDelete = (id) => {
        if (!confirm("Regel wirklich löschen?")) return;
        fetch(`/api/visibility-rules/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setRules(prev => prev.filter(r => r.id !== id));
                }
            });
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Lade Einstellungen...</div>;

    return (
        <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link to="/system" className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors text-slate-400">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                        Sichtbarkeit konfigurieren
                    </h1>
                    <p className="text-slate-400 text-sm">Steuere, welche Buchungen in welchen Protokollen angezeigt werden.</p>
                </div>
            </div>

            {/* CREATE RULE FORM */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 shadow-lg">
                <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-400" /> Neue Regel erstellen
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    {/* Item Selector */}
                    <div className="space-y-1">
                        <label className="text-xs uppercase font-bold text-slate-500">Buchung / Item Name</label>
                        <input
                            list="item-suggestions"
                            type="text"
                            value={newItem}
                            onChange={e => setNewItem(e.target.value)}
                            placeholder="z.B. E-Schrott"
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-3 py-2 focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                        <datalist id="item-suggestions">
                            {uniqueItems.map(i => <option key={i} value={i} />)}
                        </datalist>
                    </div>

                    {/* Employee Selector */}
                    <div className="space-y-1">
                        <label className="text-xs uppercase font-bold text-slate-500">Mitarbeiter</label>
                        <select
                            value={newEmployee}
                            onChange={e => setNewEmployee(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-3 py-2 outline-none"
                        >
                            <option value="GLOBAL" className="font-bold text-amber-400">★ ALLE (Global)</option>
                            {employees.map(e => (
                                <option key={e.id || e.name} value={e.name}>{e.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Toggles */}
                    <div className="flex flex-col gap-2 pb-1">
                        <label className="flex items-center justify-between bg-slate-800/50 px-3 py-1.5 rounded border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors">
                            <span className="text-xs font-bold text-slate-400">Mitarbeiter Protokoll?</span>
                            <div
                                onClick={() => setNewViewEmployee(!newViewEmployee)}
                                className={`w-8 h-4 rounded-full relative transition-colors ${newViewEmployee ? 'bg-emerald-500' : 'bg-slate-600'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${newViewEmployee ? 'left-4.5' : 'left-0.5'}`} style={{ left: newViewEmployee ? 'calc(100% - 14px)' : '2px' }} />
                            </div>
                        </label>
                        <label className="flex items-center justify-between bg-slate-800/50 px-3 py-1.5 rounded border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors">
                            <span className="text-xs font-bold text-slate-400">Zeitraum Protokoll?</span>
                            <div
                                onClick={() => setNewViewPeriod(!newViewPeriod)}
                                className={`w-8 h-4 rounded-full relative transition-colors ${newViewPeriod ? 'bg-emerald-500' : 'bg-slate-600'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${newViewPeriod ? 'left-4.5' : 'left-0.5'}`} style={{ left: newViewPeriod ? 'calc(100% - 14px)' : '2px' }} />
                            </div>
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={!newItem}
                            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 flex-1"
                        >
                            <Save className="w-4 h-4" /> Regel Speichern
                        </button>
                        <button
                            onClick={() => {
                                if (confirm("Daraus werden für ALLE bekannten Items Standard-Regeln (Sichtbar) generiert, falls noch keine existieren. Fortfahren?")) {
                                    setLoading(true);
                                    fetch('/api/visibility-rules/generate', { method: 'POST' })
                                        .then(res => res.json())
                                        .then(data => {
                                            alert(`Fertig! ${data.count} neue Regeln erstellt.`);
                                            // Reload
                                            window.location.reload();
                                        })
                                        .catch(() => {
                                            setLoading(false);
                                            alert("Fehler");
                                        });
                                }
                            }}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 rounded transition-all flex items-center justify-center gap-2"
                            title="Regeln aus DB generieren"
                        >
                            <div className="flex flex-col items-center leading-none">
                                <span className="text-xs">⚡</span>
                                <span className="text-[10px]">Auto</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* RULES LIST */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-400 uppercase tracking-wider">Aktive Regeln ({rules.length})</h2>

                <div className="grid grid-cols-1 gap-4">
                    {rules.map(rule => (
                        <div key={rule.id} className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors group">
                            <div className="flex items-center gap-6">
                                <div className="min-w-[200px]">
                                    <div className="text-xs text-slate-500 uppercase font-bold">Buchung</div>
                                    <div className="text-lg font-bold text-slate-200">{rule.item_name}</div>
                                </div>
                                <div className="min-w-[150px]">
                                    <div className="text-xs text-slate-500 uppercase font-bold">Mitarbeiter</div>
                                    <div className={`text-base font-bold ${rule.employee_name === 'GLOBAL' ? 'text-amber-400' : 'text-slate-300'}`}>
                                        {rule.employee_name === 'GLOBAL' ? '★ ALLE' : rule.employee_name}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[10px] uppercase text-slate-500">Mitarbeiter Prot.</span>
                                        {rule.view_employee_log ? (
                                            <span className="text-emerald-400 flex items-center gap-1 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-900/50"><Eye className="w-3 h-3" /> Sichtbar</span>
                                        ) : (
                                            <span className="text-red-400 flex items-center gap-1 bg-red-900/20 px-2 py-0.5 rounded border border-red-900/50"><EyeOff className="w-3 h-3" /> Versteckt</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[10px] uppercase text-slate-500">Zeitraum Prot.</span>
                                        {rule.view_period_protocol ? (
                                            <span className="text-emerald-400 flex items-center gap-1 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-900/50"><Eye className="w-3 h-3" /> Sichtbar</span>
                                        ) : (
                                            <span className="text-red-400 flex items-center gap-1 bg-red-900/20 px-2 py-0.5 rounded border border-red-900/50"><EyeOff className="w-3 h-3" /> Versteckt</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDelete(rule.id)}
                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Regel löschen"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}

                    {rules.length === 0 && (
                        <div className="p-8 text-center text-slate-500 italic border border-dashed border-slate-700 rounded-lg">
                            Keine Regeln definiert. Alle Buchungen werden standardmäßig angezeigt (außer interne Logik).
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
