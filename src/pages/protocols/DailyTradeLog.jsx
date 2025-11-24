import React, { useState } from 'react';

export default function DailyTradeLog({ logs }) {
    const [viewMode, setViewMode] = useState('both'); // 'both', 'purchase', 'sale'

    // Filter for today's logs (mocking date filter for now, showing all)
    // In a real app, we'd filter by date.

    const purchases = logs.filter(l => l.type === 'in' && l.category === 'trade');
    const sales = logs.filter(l => l.type === 'out' && l.category === 'trade');

    // Helper to format currency
    const formatMoney = (amount) => `$${amount.toLocaleString()}`;

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-200">Tagesprotokoll An & Verkauf</h2>

                {/* View Controls */}
                <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                    <button
                        onClick={() => setViewMode('purchase')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'purchase'
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                    >
                        Ankauf
                    </button>
                    <button
                        onClick={() => setViewMode('sale')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'sale'
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                    >
                        Verkauf
                    </button>
                    <button
                        onClick={() => setViewMode('both')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'both'
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                    >
                        Beides
                    </button>
                </div>
            </div>

            <div className={`grid gap-0 border border-slate-700 rounded-lg overflow-hidden ${viewMode === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
                }`}>
                {/* Ankauf Section */}
                {(viewMode === 'both' || viewMode === 'purchase') && (
                    <div className={`bg-slate-800/50 ${viewMode === 'both' ? '' : 'w-full'}`}>
                        <div className="bg-slate-700 p-2 text-center font-bold text-slate-200 border-b border-slate-600">
                            Ankauf
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                                    <tr>
                                        <th className="px-3 py-2">Datum</th>
                                        <th className="px-3 py-2">Mitarbeiter</th>
                                        <th className="px-3 py-2">Ausgaben (Stk)</th>
                                        <th className="px-3 py-2">Eingang</th>
                                        <th className="px-3 py-2">Material</th>
                                        <th className="px-3 py-2">Gesamtkosten</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {purchases.map((log, idx) => (
                                        <tr key={idx} className="hover:bg-slate-700/50">
                                            <td className="px-3 py-2 text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</td>
                                            <td className="px-3 py-2 font-medium text-emerald-400 bg-emerald-900/20">{log.depositor}</td>
                                            <td className="px-3 py-2 text-slate-300">{formatMoney(log.price)}</td>
                                            <td className="px-3 py-2 text-slate-300">{log.quantity}</td>
                                            <td className="px-3 py-2 text-red-300 bg-red-900/10">{log.itemName}</td>
                                            <td className="px-3 py-2 font-bold text-slate-200">{formatMoney(log.price * log.quantity)}</td>
                                        </tr>
                                    ))}
                                    {purchases.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-3 py-8 text-center text-slate-500 italic">Keine Ankäufe gefunden</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Verkauf Section */}
                {(viewMode === 'both' || viewMode === 'sale') && (
                    <div className={`bg-slate-800/50 ${viewMode === 'both' ? 'border-l border-slate-700' : ''}`}>
                        <div className="bg-slate-700 p-2 text-center font-bold text-slate-200 border-b border-slate-600">
                            Verkauf
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                                    <tr>
                                        <th className="px-3 py-2">Datum</th>
                                        <th className="px-3 py-2">Mitarbeiter</th>
                                        <th className="px-3 py-2">Eingang (Stk)</th>
                                        <th className="px-3 py-2">Ausgang</th>
                                        <th className="px-3 py-2">Material</th>
                                        <th className="px-3 py-2">Gesamtkosten</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {sales.map((log, idx) => (
                                        <tr key={idx} className="hover:bg-slate-700/50">
                                            <td className="px-3 py-2 text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</td>
                                            <td className="px-3 py-2 font-medium text-emerald-400 bg-emerald-900/20">{log.depositor}</td>
                                            <td className="px-3 py-2 text-slate-300">{formatMoney(log.price)}</td>
                                            <td className="px-3 py-2 text-slate-300">{log.quantity}</td>
                                            <td className="px-3 py-2 text-red-300 bg-red-900/10">{log.itemName}</td>
                                            <td className="px-3 py-2 font-bold text-slate-200">{formatMoney(log.price * log.quantity)}</td>
                                        </tr>
                                    ))}
                                    {sales.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-3 py-8 text-center text-slate-500 italic">Keine Verkäufe gefunden</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
