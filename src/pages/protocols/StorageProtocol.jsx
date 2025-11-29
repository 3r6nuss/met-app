import React, { useState, useMemo } from 'react';
import { Archive, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function StorageProtocol({ logs }) {
    const [filterType, setFilterType] = useState('all'); // 'all', 'in', 'out'

    const processedLogs = useMemo(() => {
        return logs.filter(log => {
            // Only internal storage logs
            if (log.category !== 'internal') return false;

            if (filterType === 'all') return true;
            return log.type === filterType;
        });
    }, [logs, filterType]);

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
                    <Archive className="w-6 h-6 text-violet-400" />
                    Lagerprotokoll
                </h2>

                {/* Filter Controls */}
                <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === 'all'
                                ? 'bg-violet-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                    >
                        Alle
                    </button>
                    <button
                        onClick={() => setFilterType('in')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${filterType === 'in'
                                ? 'bg-emerald-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                    >
                        <ArrowDownCircle className="w-4 h-4" />
                        Einlagern
                    </button>
                    <button
                        onClick={() => setFilterType('out')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${filterType === 'out'
                                ? 'bg-red-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                    >
                        <ArrowUpCircle className="w-4 h-4" />
                        Auslagern
                    </button>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-900 text-slate-400 font-bold">
                            <tr>
                                <th className="px-6 py-4">Zeitpunkt</th>
                                <th className="px-6 py-4">Aktion</th>
                                <th className="px-6 py-4">Produkt</th>
                                <th className="px-6 py-4 text-right">Menge</th>
                                <th className="px-6 py-4">Mitarbeiter</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {processedLogs.map((log, idx) => (
                                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleString('de-DE')}
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.type === 'in' ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                                <ArrowDownCircle className="w-3 h-3" /> Einlagern
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-400 bg-red-900/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                                <ArrowUpCircle className="w-3 h-3" /> Auslagern
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-200">{log.itemName}</td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-300">{log.quantity}</td>
                                    <td className="px-6 py-4 text-slate-300">
                                        <span className="bg-slate-700/50 px-2 py-1 rounded text-xs">
                                            {log.depositor}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {processedLogs.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">
                                        Keine Lagerbewegungen gefunden.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
