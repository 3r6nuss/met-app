import React, { useState, useMemo } from 'react';
import {
    ShoppingCart, TrendingUp, TrendingDown, Calendar, Download,
    ArrowDownRight, ArrowUpRight, Package, Users, DollarSign,
    ChevronLeft, ChevronRight
} from 'lucide-react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function DailyTradeLog({ logs }) {
    const [viewMode, setViewMode] = useState('both');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Process trade data
    const tradeData = useMemo(() => {
        const selectedStart = new Date(selectedDate);
        selectedStart.setHours(0, 0, 0, 0);
        const selectedEnd = new Date(selectedDate);
        selectedEnd.setHours(23, 59, 59, 999);

        const filteredLogs = logs.filter(l =>
            l.itemName !== 'Korrektur Geschäftskonto' &&
            !l.msg?.includes('Korrektur Geschäftskonto') &&
            l.price !== 0 &&
            l.itemName && l.itemName !== 'Unbekannt' &&
            l.category === 'trade'
        );

        const dayLogs = filteredLogs.filter(l => {
            const d = new Date(l.timestamp);
            return d >= selectedStart && d <= selectedEnd;
        });

        const purchases = dayLogs
            .filter(l => l.type === 'in')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const sales = dayLogs
            .filter(l => l.type === 'out')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const totalPurchases = purchases.reduce((sum, l) => sum + Math.abs(l.price * l.quantity), 0);
        const totalSales = sales.reduce((sum, l) => sum + Math.abs(l.price * l.quantity), 0);
        const profit = totalSales - totalPurchases;

        const purchaseItems = purchases.reduce((sum, l) => sum + l.quantity, 0);
        const saleItems = sales.reduce((sum, l) => sum + l.quantity, 0);

        return {
            purchases,
            sales,
            totalPurchases,
            totalSales,
            profit,
            purchaseItems,
            saleItems,
            purchaseCount: purchases.length,
            saleCount: sales.length
        };
    }, [logs, selectedDate]);

    // Pagination
    const currentData = viewMode === 'purchase' ? tradeData.purchases :
        viewMode === 'sale' ? tradeData.sales :
            [...tradeData.purchases, ...tradeData.sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const totalPages = Math.ceil(currentData.length / itemsPerPage);
    const paginatedData = currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // CSV Export
    const downloadCSV = () => {
        const headers = ['Datum', 'Uhrzeit', 'Typ', 'Mitarbeiter', 'Material', 'Menge', 'Preis/Stk', 'Gesamt'];
        const rows = currentData.map(log => [
            formatDate(log.timestamp),
            formatTime(log.timestamp),
            log.type === 'in' ? 'Ankauf' : 'Verkauf',
            log.depositor,
            log.itemName,
            log.quantity,
            log.price.toFixed(2),
            (log.price * log.quantity).toFixed(2)
        ]);

        const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Tagesprotokoll_${selectedDate}.csv`;
        link.click();
    };

    // Navigate dates
    const navigateDate = (direction) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + direction);
        setSelectedDate(date.toISOString().split('T')[0]);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 flex items-center gap-3">
                        <ShoppingCart className="w-8 h-8 text-amber-400" />
                        Tagesprotokoll
                    </h1>
                    <p className="text-slate-400 mt-1">An- und Verkäufe im Überblick</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Navigation */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-xl border border-slate-700">
                        <button
                            onClick={() => navigateDate(-1)}
                            className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <Calendar className="w-4 h-4 text-amber-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-none text-slate-200 text-sm focus:ring-0 p-0"
                        />
                        <button
                            onClick={() => navigateDate(1)}
                            className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                        <button
                            onClick={() => { setViewMode('purchase'); setCurrentPage(1); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'purchase'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                }`}
                        >
                            <ArrowDownRight className="w-4 h-4" />
                            Ankauf
                        </button>
                        <button
                            onClick={() => { setViewMode('sale'); setCurrentPage(1); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'sale'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                }`}
                        >
                            <ArrowUpRight className="w-4 h-4" />
                            Verkauf
                        </button>
                        <button
                            onClick={() => { setViewMode('both'); setCurrentPage(1); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'both'
                                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                }`}
                        >
                            Beides
                        </button>
                    </div>

                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-blue-500/10">
                            <ArrowDownRight className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-slate-400 text-sm font-medium">Ankäufe</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-400">{formatCurrency(tradeData.totalPurchases)}</div>
                    <div className="text-xs text-slate-500 mt-1">{tradeData.purchaseCount} Transaktionen · {tradeData.purchaseItems} Stk</div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-emerald-500/10">
                            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-slate-400 text-sm font-medium">Verkäufe</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(tradeData.totalSales)}</div>
                    <div className="text-xs text-slate-500 mt-1">{tradeData.saleCount} Transaktionen · {tradeData.saleItems} Stk</div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 hover:border-violet-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-violet-500/10">
                            <DollarSign className="w-5 h-5 text-violet-400" />
                        </div>
                        <span className="text-slate-400 text-sm font-medium">Tagesgewinn</span>
                    </div>
                    <div className={`text-2xl font-bold ${tradeData.profit >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
                        {formatCurrency(tradeData.profit)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        Marge: {tradeData.totalSales > 0 ? ((tradeData.profit / tradeData.totalSales) * 100).toFixed(1) : 0}%
                    </div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 hover:border-amber-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-amber-500/10">
                            <Package className="w-5 h-5 text-amber-400" />
                        </div>
                        <span className="text-slate-400 text-sm font-medium">Gesamt Transaktionen</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-400">{tradeData.purchaseCount + tradeData.saleCount}</div>
                    <div className="text-xs text-slate-500 mt-1">{tradeData.purchaseItems + tradeData.saleItems} Items gehandelt</div>
                </div>
            </div>

            {/* TRADE TABLE */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50">
                            <tr className="text-slate-400 text-xs uppercase tracking-wider">
                                <th className="px-4 py-4">Zeit</th>
                                <th className="px-4 py-4">Typ</th>
                                <th className="px-4 py-4">Mitarbeiter</th>
                                <th className="px-4 py-4">Material</th>
                                <th className="px-4 py-4 text-right">Menge</th>
                                <th className="px-4 py-4 text-right">Preis/Stk</th>
                                <th className="px-4 py-4 text-right">Gesamt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {paginatedData.map((log, idx) => {
                                const isPurchase = log.type === 'in';
                                const total = Math.abs(log.price * log.quantity);

                                return (
                                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors text-slate-300">
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium">{formatTime(log.timestamp)}</div>
                                            <div className="text-xs text-slate-500">{formatDate(log.timestamp)}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isPurchase
                                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                {isPurchase ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                                {isPurchase ? 'Ankauf' : 'Verkauf'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                                                    {log.depositor?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <span className="font-medium">{log.depositor}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-200 text-sm">
                                                {log.itemName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-400">{log.quantity}</td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-400">{formatCurrency(Math.abs(log.price))}</td>
                                        <td className={`px-4 py-3 text-right font-mono font-bold ${isPurchase ? 'text-blue-400' : 'text-emerald-400'}`}>
                                            {isPurchase ? '-' : '+'}{formatCurrency(total)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <div className="text-lg font-medium">Keine Transaktionen</div>
                                        <div className="text-sm">An diesem Tag wurden keine Handelsaktivitäten erfasst</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/30 border-t border-slate-700/30">
                        <div className="text-sm text-slate-400">
                            Seite {currentPage} von {totalPages} ({currentData.length} Einträge)
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
