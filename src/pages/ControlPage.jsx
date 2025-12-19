import React, { useState, useEffect } from 'react';
import { Calendar, User, ChevronRight, X, Package, Edit2, Save } from 'lucide-react';

export default function ControlPage({ employeeInventory = [], employees = [], inventory = [] }) {
    const [history, setHistory] = useState([]);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/verifications')
            .then(res => res.json())
            .then(data => {
                setHistory(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch history:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-center text-slate-400 mt-12">Lade Historie...</div>;

    // Helper to get inventory for an employee
    const getEmployeeItems = (name) => {
        return employeeInventory.filter(i => i.employee_name === name);
    };

    // Manual Update Handler
    const handleUpdateStock = (employeeName, itemId, newQuantity) => {
        fetch('/api/employee-inventory/manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeName, itemId, quantity: parseInt(newQuantity) })
        })
            .then(res => res.json())
            .then(data => {
                if (!data.success) alert("Fehler beim Speichern");
            })
            .catch(err => alert("Netzwerkfehler"));
    };

    return (
        <div className="animate-fade-in pb-24 max-w-4xl mx-auto">

            {/* Employee Inventory Section */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-violet-400">
                    <Package className="w-6 h-6" />
                    Mitarbeiter Lager
                </h2>

                <div className="grid grid-cols-1 gap-4">
                    {employees.map((emp, idx) => {
                        const empName = typeof emp === 'string' ? emp : emp.name;
                        return (
                            <EmployeeInventoryCard
                                key={idx}
                                name={empName}
                                items={getEmployeeItems(empName)}
                                allInventory={inventory}
                                onUpdate={handleUpdateStock}
                            />
                        );
                    })}
                </div>
            </section>

            <div className="space-y-3">
                {history.length === 0 ? (
                    <div className="text-center text-slate-500 py-12 bg-slate-900/50 rounded-xl border border-white/5">
                        Keine Einträge vorhanden.
                    </div>
                ) : (
                    history.map((entry, index) => (
                        <div
                            key={index}
                            onClick={() => setSelectedEntry(entry)}
                            className="bg-slate-800/50 hover:bg-slate-800 border border-white/5 rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-200">{entry.verifier}</div>
                                    <div className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleString()}</div>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                        </div>
                    ))
                )}
            </div>

            {/* Detail Modal */}
            {selectedEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Kontrolle Details</h3>
                            <button onClick={() => setSelectedEntry(null)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="flex justify-between mb-6 bg-slate-800/50 p-4 rounded-lg">
                                <div>
                                    <div className="text-xs text-slate-400 uppercase">Prüfer</div>
                                    <div className="font-bold text-lg">{selectedEntry.verifier}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 uppercase">Zeitpunkt</div>
                                    <div className="font-mono">{new Date(selectedEntry.timestamp).toLocaleString()}</div>
                                </div>
                            </div>

                            <h4 className="font-bold text-slate-400 mb-3 text-sm uppercase">Bestand zum Zeitpunkt der Prüfung</h4>
                            <div className="space-y-1">
                                {selectedEntry.snapshot.map(item => (
                                    <div key={item.id} className="flex justify-between p-2 hover:bg-white/5 rounded border-b border-white/5 last:border-0 text-sm">
                                        <span className="text-slate-300">{item.name}</span>
                                        <span className="font-mono text-slate-400">{item.current.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmployeeInventoryCard({ name, items, allInventory, onUpdate }) {
    const [expanded, setExpanded] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    const startEdit = (id, current) => {
        setEditingId(id);
        setEditValue(current);
    };

    const saveEdit = (id) => {
        onUpdate(name, id, editValue);
        setEditingId(null);
    };

    return (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden">
            <div
                onClick={() => setExpanded(!expanded)}
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
                        {name.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-200">{name}</span>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
                        {items.length} Items
                    </span>
                </div>
                <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </div>

            {expanded && (
                <div className="border-t border-slate-800 p-4 bg-slate-950/30">
                    {items.length === 0 ? (
                        <div className="text-center text-slate-500 text-sm py-2">Leer</div>
                    ) : (
                        <div className="space-y-2">
                            {items.map(item => {
                                const itemDef = allInventory.find(i => i.id === item.item_id);
                                const itemName = itemDef ? itemDef.name : `Item #${item.item_id}`;

                                return (
                                    <div key={item.item_id} className="flex justify-between items-center text-sm bg-slate-900/50 p-2 rounded border border-slate-800">
                                        <span className="text-slate-300">{itemName}</span>

                                        {editingId === item.item_id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-16 bg-slate-950 border border-violet-500 rounded px-1 py-0.5 text-right text-white"
                                                />
                                                <button onClick={() => saveEdit(item.item_id)} className="text-emerald-400 hover:text-emerald-300">
                                                    <Save className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-300">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-violet-300 font-bold">{item.quantity}</span>
                                                <button onClick={() => startEdit(item.item_id, item.quantity)} className="text-slate-600 hover:text-violet-400">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
