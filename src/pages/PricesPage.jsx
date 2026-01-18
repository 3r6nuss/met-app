import React, { useState, useEffect } from 'react';
import { DollarSign, Edit2, Save, Loader2 } from 'lucide-react';
import { useDeveloperConsole } from '../context/DeveloperConsoleContext';

export default function PricesPage() {
    const [prices, setPrices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedPrices, setEditedPrices] = useState([]);

    const { log } = useDeveloperConsole();

    useEffect(() => {
        fetch('/api/prices')
            .then(res => res.json())
            .then(data => {
                setPrices(data);
                setEditedPrices(data);
                setIsLoading(false);
                log('API', 'Prices Fetched', { count: data.length });
            })
            .catch(err => {
                console.error("Failed to fetch prices:", err);
                setIsLoading(false);
                log('ERROR', 'Fetch Prices Failed', err);
            });
    }, []);

    const handlePriceChange = (index, field, value) => {
        const newPrices = [...editedPrices];
        newPrices[index] = { ...newPrices[index], [field]: value };
        setEditedPrices(newPrices);
    };

    const handleSave = () => {
        setIsLoading(true);

        // Calculate diffs
        const changes = [];
        editedPrices.forEach((newItem, index) => {
            const oldItem = prices[index];
            if (!oldItem) return;

            const itemChanges = {};
            let hasChanged = false;

            ['ek', 'vk', 'lohn', 'note', 'noteVK'].forEach(field => {
                if (newItem[field] != oldItem[field]) {
                    hasChanged = true;
                    itemChanges[field] = { old: oldItem[field], new: newItem[field] };
                }
            });

            if (hasChanged) {
                changes.push({
                    item: newItem.name,
                    id: newItem.id,
                    changes: itemChanges
                });
            }
        });

        if (changes.length > 0) {
            log('STATE', 'Saving Price Changes', { count: changes.length, details: changes });
        } else {
            log('STATE', 'Saving Prices (No Changes Detected)', { count: editedPrices.length });
        }

        fetch('/api/prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editedPrices)
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setPrices(editedPrices);
                    setIsEditing(false);
                    log('API', 'Prices Updated Successfully');
                } else {
                    log('ERROR', 'Price Update Failed (Server)', data);
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to save prices:", err);
                setIsLoading(false);
                log('ERROR', 'Price Update Network Error', err);
            });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="glass-panel rounded-xl p-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
                        <DollarSign className="w-7 h-7 text-emerald-400" />
                        Preisliste
                    </h1>
                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-600"
                            >
                                <Edit2 className="w-4 h-4" />
                                Bearbeiten
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Speichern
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="glass-panel rounded-xl p-6">
                {isLoading && !isEditing ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-700">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-800 text-slate-300 uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-6 py-4">Produkt</th>
                                    <th className="px-6 py-4 text-right text-amber-400">EK (Einkauf)</th>
                                    <th className="px-6 py-4 text-right text-emerald-400">VK (Verkauf)</th>
                                    <th className="px-6 py-4 text-right text-blue-400">Lohn</th>
                                    <th className="px-6 py-4 text-left text-slate-400">Notiz (Ankauf)</th>
                                    <th className="px-6 py-4 text-left text-slate-400">Notiz (Verkauf)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {(isEditing ? editedPrices : prices).map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-3 font-medium text-slate-200">{item.name}</td>
                                        <td className="px-6 py-3 text-right text-slate-300 font-mono">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={item.ek}
                                                    onChange={(e) => handlePriceChange(idx, 'ek', e.target.value)}
                                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right w-24 focus:border-violet-500 outline-none"
                                                />
                                            ) : (
                                                item.ek ? `$${item.ek.toLocaleString()}` : '-'
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right text-slate-300 font-mono">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={item.vk}
                                                    onChange={(e) => handlePriceChange(idx, 'vk', e.target.value)}
                                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right w-24 focus:border-violet-500 outline-none"
                                                />
                                            ) : (
                                                item.vk ? `$${item.vk.toLocaleString()}` : '-'
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right text-slate-300 font-mono">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={item.lohn}
                                                    onChange={(e) => handlePriceChange(idx, 'lohn', e.target.value)}
                                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right w-24 focus:border-violet-500 outline-none"
                                                />
                                            ) : (
                                                item.lohn ? `$${item.lohn}` : '-'
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-left text-slate-400 text-xs">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={item.note || ''}
                                                    onChange={(e) => handlePriceChange(idx, 'note', e.target.value)}
                                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-full focus:border-violet-500 outline-none"
                                                    placeholder="Notiz..."
                                                />
                                            ) : (
                                                item.note && (
                                                    <span className={`px-2 py-1 rounded ${item.note.includes('Kein Ankauf') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                        item.note.includes('Ankauf bis') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                            'bg-slate-800 text-slate-400'
                                                        }`}>
                                                        {item.note}
                                                    </span>
                                                )
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-left text-slate-400 text-xs">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={item.noteVK || ''}
                                                    onChange={(e) => handlePriceChange(idx, 'noteVK', e.target.value)}
                                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-full focus:border-violet-500 outline-none"
                                                    placeholder="Notiz..."
                                                />
                                            ) : (
                                                item.noteVK && (
                                                    <span className={`px-2 py-1 rounded ${item.noteVK.includes('Kein Verkauf') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                        item.noteVK.includes('Verkauf bis') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                            'bg-slate-800 text-slate-400'
                                                        }`}>
                                                        {item.noteVK}
                                                    </span>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
