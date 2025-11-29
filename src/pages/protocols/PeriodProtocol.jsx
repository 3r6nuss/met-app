import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, Package } from 'lucide-react';

export default function PeriodProtocol({ logs }) {
    const [periodType, setPeriodType] = useState('month'); // 'week', 'month', 'year'
    const [reportMode, setReportMode] = useState('production'); // 'production', 'trade'
    const [currentDate, setCurrentDate] = useState(new Date());

    // Helper: Get start and end of period
    const getPeriodRange = (date, type) => {
        const start = new Date(date);
        const end = new Date(date);

        if (type === 'week') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (type === 'month') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
        } else if (type === 'year') {
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
        }
        return { start, end };
    };

    const periodLabel = useMemo(() => {
        const { start, end } = getPeriodRange(currentDate, periodType);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        if (periodType === 'year') return start.getFullYear().toString();
        if (periodType === 'month') return start.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
        return `${start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }, [currentDate, periodType]);

    const navigatePeriod = (direction) => {
        const newDate = new Date(currentDate);
        if (periodType === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
        if (periodType === 'month') newDate.setMonth(newDate.getMonth() + direction);
        if (periodType === 'year') newDate.setFullYear(newDate.getFullYear() + direction);
        setCurrentDate(newDate);
    };

    const processedData = useMemo(() => {
        const { start, end } = getPeriodRange(currentDate, periodType);

        // Filter logs by date
        const periodLogs = logs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= start && logDate <= end;
        });

        const stats = {};

        periodLogs.forEach(log => {
            if (!stats[log.itemName]) {
                stats[log.itemName] = {
                    name: log.itemName,
                    producedQty: 0,
                    producedValue: 0,
                    boughtQty: 0,
                    boughtCost: 0,
                    soldQty: 0,
                    soldRevenue: 0
                };
            }

            const value = (log.price || 0) * (log.quantity || 0);

            if (reportMode === 'production') {
                // Production: Only count 'in' logs that are NOT trade (so internal production/collection)
                // OR count all 'in' logs? User said "wieviel man wovon produziert / gesammelt hat"
                // Usually 'internal' category is production/collection. 'trade' is buying.
                if (log.type === 'in' && log.category === 'internal') {
                    stats[log.itemName].producedQty += log.quantity;
                    stats[log.itemName].producedValue += value;
                }
            } else {
                // Trade: Count 'trade' category logs
                if (log.category === 'trade') {
                    if (log.type === 'in') { // Buying
                        stats[log.itemName].boughtQty += log.quantity;
                        stats[log.itemName].boughtCost += value;
                    } else if (log.type === 'out') { // Selling
                        stats[log.itemName].soldQty += log.quantity;
                        stats[log.itemName].soldRevenue += value;
                    }
                }
            }
        });

        // Convert to array and filter out empty entries
        return Object.values(stats).filter(item => {
            if (reportMode === 'production') return item.producedQty > 0;
            return item.boughtQty > 0 || item.soldQty > 0;
        }).sort((a, b) => a.name.localeCompare(b.name));

    }, [logs, currentDate, periodType, reportMode]);

    const formatMoney = (amount) => amount.toLocaleString('de-DE', { style: 'currency', currency: 'USD' }).replace('$', '$');

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700">

                {/* Period Selector */}
                <div className="flex bg-slate-800 p-1 rounded-lg">
                    {['week', 'month', 'year'].map(type => (
                        <button
                            key={type}
                            onClick={() => setPeriodType(type)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${periodType === type
                                    ? 'bg-violet-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                }`}
                        >
                            {type === 'week' ? 'Woche' : type === 'month' ? 'Monat' : 'Jahr'}
                        </button>
                    ))}
                </div>

                {/* Date Navigation */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigatePeriod(-1)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2 text-lg font-bold text-slate-200 min-w-[200px] justify-center">
                        <Calendar className="w-5 h-5 text-violet-400" />
                        {periodLabel}
                    </div>
                    <button onClick={() => navigatePeriod(1)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {/* Mode Selector */}
                <div className="flex bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setReportMode('production')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${reportMode === 'production'
                                ? 'bg-emerald-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                            }`}
                    >
                        <Package className="w-4 h-4" />
                        Produktion
                    </button>
                    <button
                        onClick={() => setReportMode('trade')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${reportMode === 'trade'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                            }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Handel
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-900 text-slate-400 font-bold">
                            <tr>
                                <th className="px-6 py-4">Produkt</th>
                                {reportMode === 'production' ? (
                                    <>
                                        <th className="px-6 py-4 text-right">Produziert / Gesammelt</th>
                                        <th className="px-6 py-4 text-right">Wert (Lohn)</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-4 text-right text-red-400">Eingekauft (Menge)</th>
                                        <th className="px-6 py-4 text-right text-red-400">Ausgaben</th>
                                        <th className="px-6 py-4 text-right text-emerald-400">Verkauft (Menge)</th>
                                        <th className="px-6 py-4 text-right text-emerald-400">Einnahmen</th>
                                        <th className="px-6 py-4 text-right">Gewinn / Verlust</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {processedData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-200">{item.name}</td>

                                    {reportMode === 'production' ? (
                                        <>
                                            <td className="px-6 py-4 text-right text-slate-300">{item.producedQty}</td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-400">{formatMoney(item.producedValue)}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 text-right text-slate-300">{item.boughtQty}</td>
                                            <td className="px-6 py-4 text-right text-red-400">{formatMoney(item.boughtCost)}</td>
                                            <td className="px-6 py-4 text-right text-slate-300">{item.soldQty}</td>
                                            <td className="px-6 py-4 text-right text-emerald-400">{formatMoney(item.soldRevenue)}</td>
                                            <td className={`px-6 py-4 text-right font-bold ${item.soldRevenue - item.boughtCost >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {formatMoney(item.soldRevenue - item.boughtCost)}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}

                            {processedData.length === 0 && (
                                <tr>
                                    <td colSpan={reportMode === 'production' ? 3 : 6} className="px-6 py-12 text-center text-slate-500 italic">
                                        Keine Daten für diesen Zeitraum gefunden.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {/* Footer Totals */}
                        {processedData.length > 0 && (
                            <tfoot className="bg-slate-900/80 font-bold text-slate-200 border-t-2 border-slate-600">
                                <tr>
                                    <td className="px-6 py-4 uppercase tracking-wider text-xs text-slate-400">Gesamt</td>
                                    {reportMode === 'production' ? (
                                        <>
                                            <td className="px-6 py-4 text-right">{processedData.reduce((a, b) => a + b.producedQty, 0)}</td>
                                            <td className="px-6 py-4 text-right text-emerald-400">
                                                {formatMoney(processedData.reduce((a, b) => a + b.producedValue, 0))}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 text-right">{processedData.reduce((a, b) => a + b.boughtQty, 0)}</td>
                                            <td className="px-6 py-4 text-right text-red-400">
                                                {formatMoney(processedData.reduce((a, b) => a + b.boughtCost, 0))}
                                            </td>
                                            <td className="px-6 py-4 text-right">{processedData.reduce((a, b) => a + b.soldQty, 0)}</td>
                                            <td className="px-6 py-4 text-right text-emerald-400">
                                                {formatMoney(processedData.reduce((a, b) => a + b.soldRevenue, 0))}
                                            </td>
                                            <td className={`px-6 py-4 text-right ${processedData.reduce((a, b) => a + (b.soldRevenue - b.boughtCost), 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {formatMoney(processedData.reduce((a, b) => a + (b.soldRevenue - b.boughtCost), 0))}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
