import React, { useState, useMemo } from 'react';
import {
    BookOpen, Calendar, ArrowUpRight, ArrowDownRight, Download,
    Filter, Search, TrendingUp, TrendingDown, DollarSign, FileText,
    ChevronLeft, ChevronRight, Wallet, Pencil, X, Check, Info
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

export default function CashBookProtocol({ logs = [], inventory = [], prices = [], onAdjustBalance, user }) {
    const [activeTab, setActiveTab] = useState('kassenbuch'); // 'kassenbuch' or 'konto'
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const itemsPerPage = 25;

    // ============ KASSENBUCH DATA ============
    const cashBookData = useMemo(() => {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);

        let entries = logs
            .filter(log => {
                const d = new Date(log.timestamp);
                return d >= start && d <= end;
            })
            .filter(log => {
                return log.category === 'trade' ||
                    log.itemName === 'Auszahlung' ||
                    (log.price && log.price !== 0);
            })
            .map((log, idx) => {
                const isIncome = log.type === 'out' && log.category === 'trade';
                const isExpense = log.type === 'in' && log.category === 'trade';
                const isPayout = log.itemName === 'Auszahlung';

                let amount = Math.abs((log.price || 0) * (log.quantity || 1));
                let type = 'neutral';
                let category = 'Sonstiges';

                if (isIncome) {
                    type = 'income';
                    category = 'Verkauf';
                } else if (isExpense) {
                    type = 'expense';
                    category = 'Ankauf';
                } else if (isPayout) {
                    type = 'expense';
                    category = 'Lohn';
                    amount = Math.abs(log.price || 0);
                } else if (log.price < 0) {
                    type = 'expense';
                    category = 'Sonderbuchung';
                    amount = Math.abs(log.price);
                } else if (log.price > 0) {
                    type = 'income';
                    category = 'Sonderbuchung';
                }

                return {
                    id: log.timestamp + idx,
                    timestamp: log.timestamp,
                    belegNr: `KB-${new Date(log.timestamp).getFullYear()}-${String(idx + 1).padStart(5, '0')}`,
                    description: log.itemName || log.msg || 'Transaktion',
                    quantity: log.quantity || 1,
                    depositor: log.depositor || 'System',
                    type,
                    category,
                    amount
                };
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (searchTerm) {
            entries = entries.filter(e =>
                e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.depositor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.belegNr.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (categoryFilter !== 'all') {
            entries = entries.filter(e => e.category === categoryFilter);
        }

        let runningBalance = 0;
        const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
        const totalExpense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);

        const entriesWithBalance = [...entries].reverse().map(entry => {
            if (entry.type === 'income') {
                runningBalance += entry.amount;
            } else if (entry.type === 'expense') {
                runningBalance -= entry.amount;
            }
            return { ...entry, balance: runningBalance };
        }).reverse();

        return {
            entries: entriesWithBalance,
            totalIncome,
            totalExpense,
            netBalance: totalIncome - totalExpense,
            totalEntries: entriesWithBalance.length
        };
    }, [logs, dateRange, searchTerm, categoryFilter]);

    // ============ GESCHÄFTSKONTO DATA ============
    const { currentBalance, currentInventoryValue, chartData, transactions } = useMemo(() => {
        let balance = 0;
        const dataPoints = [];
        const relevantTransactions = [];

        const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        sortedLogs.forEach(log => {
            let change = 0;
            let type = 'other';

            if (log.itemName === 'Auszahlung' || log.msg?.includes('Auszahlung')) {
                change = log.price * log.quantity;
                type = 'payout';
            } else if (log.category === 'trade' && log.type === 'in') {
                const p = typeof log.price === 'string' ? parseFloat(log.price.replace(',', '.')) : log.price;
                change = -(p * log.quantity);
                type = 'purchase';
            } else if (log.category === 'trade' && log.type === 'out') {
                const p = typeof log.price === 'string' ? parseFloat(log.price.replace(',', '.')) : log.price;
                change = p * log.quantity;
                type = 'sale';
            } else if (log.itemName === 'Korrektur Geschäftskonto' || log.msg?.includes('Korrektur Geschäftskonto')) {
                const p = typeof log.price === 'string' ? parseFloat(log.price.replace(',', '.')) : log.price;
                change = p;
                type = p >= 0 ? 'sale' : 'purchase';
            }

            if (change !== 0) {
                balance += change;
                const date = new Date(log.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

                dataPoints.push({ date, balance });

                relevantTransactions.unshift({
                    id: log.id,
                    date: new Date(log.timestamp).toLocaleString('de-DE'),
                    type,
                    amount: Math.abs(change),
                    isPositive: change > 0,
                    reason: log.itemName || log.msg,
                    balanceSnapshot: balance
                });
            }
        });

        const invValue = inventory.reduce((sum, item) => {
            const priceItem = prices.find(p => p.name === item.name);
            return sum + (item.current * (priceItem?.vk || 0));
        }, 0);

        const finalData = dataPoints.map(p => ({
            ...p,
            total: p.balance + invValue
        }));

        return {
            currentBalance: balance,
            currentInventoryValue: invValue,
            chartData: finalData,
            transactions: relevantTransactions
        };
    }, [logs, inventory, prices]);

    // ============ HANDLERS ============
    const totalPages = Math.ceil(cashBookData.entries.length / itemsPerPage);
    const paginatedEntries = cashBookData.entries.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const downloadCSV = () => {
        const headers = ['Beleg-Nr', 'Datum', 'Uhrzeit', 'Beschreibung', 'Kategorie', 'Person', 'Menge', 'Einnahme', 'Ausgabe', 'Saldo'];
        const rows = cashBookData.entries.map(e => [
            e.belegNr,
            formatDate(e.timestamp),
            formatTime(e.timestamp),
            e.description,
            e.category,
            e.depositor,
            e.quantity,
            e.type === 'income' ? e.amount.toFixed(2) : '',
            e.type === 'expense' ? e.amount.toFixed(2) : '',
            e.balance.toFixed(2)
        ]);

        const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Kassenbuch_${dateRange.start}_${dateRange.end}.csv`;
        link.click();
    };

    const handleStartEdit = () => {
        setEditValue(currentBalance.toString());
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        const newBal = parseFloat(editValue.toString().replace(',', '.'));
        if (isNaN(newBal)) return;

        const safeCurrentBalance = isNaN(currentBalance) ? 0 : currentBalance;
        const diff = newBal - safeCurrentBalance;
        if (diff === 0) {
            setIsEditing(false);
            return;
        }

        if (onAdjustBalance) {
            onAdjustBalance({
                amount: diff,
                reason: 'Korrektur Geschäftskonto',
                employee: user?.username || 'Admin'
            });
        }
        setIsEditing(false);
    };

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-emerald-400" />
                        Finanzen
                    </h1>
                    <p className="text-slate-400 mt-1">Kassenbuch & Geschäftskonto</p>
                </div>

                {/* TABS */}
                <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                    <button
                        onClick={() => setActiveTab('kassenbuch')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'kassenbuch'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Kassenbuch
                    </button>
                    <button
                        onClick={() => setActiveTab('konto')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'konto'
                                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                    >
                        <Wallet className="w-4 h-4" />
                        Geschäftskonto
                    </button>
                </div>
            </div>

            {/* ============ KASSENBUCH TAB ============ */}
            {activeTab === 'kassenbuch' && (
                <>
                    {/* DATE RANGE & EXPORT */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-xl border border-slate-700">
                            <Calendar className="w-4 h-4 text-emerald-400" />
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="bg-transparent border-none text-slate-200 text-sm focus:ring-0 p-0"
                            />
                            <span className="text-slate-500">–</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="bg-transparent border-none text-slate-200 text-sm focus:ring-0 p-0"
                            />
                        </div>
                        <button
                            onClick={downloadCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            CSV Export
                        </button>
                    </div>

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-emerald-500/10">
                                    <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                                </div>
                                <span className="text-slate-400 text-sm font-medium">Einnahmen</span>
                            </div>
                            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(cashBookData.totalIncome)}</div>
                        </div>

                        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-red-500/10">
                                    <ArrowDownRight className="w-5 h-5 text-red-400" />
                                </div>
                                <span className="text-slate-400 text-sm font-medium">Ausgaben</span>
                            </div>
                            <div className="text-2xl font-bold text-red-400">{formatCurrency(cashBookData.totalExpense)}</div>
                        </div>

                        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-violet-500/10">
                                    <DollarSign className="w-5 h-5 text-violet-400" />
                                </div>
                                <span className="text-slate-400 text-sm font-medium">Saldo</span>
                            </div>
                            <div className={`text-2xl font-bold ${cashBookData.netBalance >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
                                {formatCurrency(cashBookData.netBalance)}
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-blue-500/10">
                                    <FileText className="w-5 h-5 text-blue-400" />
                                </div>
                                <span className="text-slate-400 text-sm font-medium">Buchungen</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-400">{cashBookData.totalEntries}</div>
                        </div>
                    </div>

                    {/* FILTERS */}
                    <div className="flex flex-wrap gap-4 items-center bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Suche nach Beschreibung, Person, Beleg-Nr..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 focus:ring-0"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="bg-slate-700 border-none rounded-lg text-slate-200 text-sm px-3 py-2"
                            >
                                <option value="all">Alle Kategorien</option>
                                <option value="Verkauf">Verkauf</option>
                                <option value="Ankauf">Ankauf</option>
                                <option value="Lohn">Lohn</option>
                                <option value="Sonderbuchung">Sonderbuchung</option>
                            </select>
                        </div>
                    </div>

                    {/* CASH BOOK TABLE */}
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-800/50">
                                    <tr className="text-slate-400 text-xs uppercase tracking-wider">
                                        <th className="px-4 py-4">Beleg-Nr</th>
                                        <th className="px-4 py-4">Datum</th>
                                        <th className="px-4 py-4">Beschreibung</th>
                                        <th className="px-4 py-4">Kategorie</th>
                                        <th className="px-4 py-4">Person</th>
                                        <th className="px-4 py-4 text-right">Menge</th>
                                        <th className="px-4 py-4 text-right">Einnahme</th>
                                        <th className="px-4 py-4 text-right">Ausgabe</th>
                                        <th className="px-4 py-4 text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    {paginatedEntries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors text-slate-300">
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{entry.belegNr}</td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">{formatDate(entry.timestamp)}</div>
                                                <div className="text-xs text-slate-500">{formatTime(entry.timestamp)}</div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{entry.description}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${entry.category === 'Verkauf' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        entry.category === 'Ankauf' ? 'bg-amber-500/10 text-amber-400' :
                                                            entry.category === 'Lohn' ? 'bg-blue-500/10 text-blue-400' :
                                                                'bg-slate-500/10 text-slate-400'
                                                    }`}>
                                                    {entry.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400">{entry.depositor}</td>
                                            <td className="px-4 py-3 text-right font-mono">{entry.quantity}</td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                                {entry.type === 'income' ? formatCurrency(entry.amount) : '–'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-red-400">
                                                {entry.type === 'expense' ? formatCurrency(entry.amount) : '–'}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-mono font-bold ${entry.balance >= 0 ? 'text-slate-200' : 'text-red-400'}`}>
                                                {formatCurrency(entry.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedEntries.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                                                Keine Einträge gefunden
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
                                    Seite {currentPage} von {totalPages} ({cashBookData.totalEntries} Einträge)
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
                </>
            )}

            {/* ============ GESCHÄFTSKONTO TAB ============ */}
            {activeTab === 'konto' && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Kontostand Card */}
                        <div className="bg-slate-800/50 p-6 rounded-2xl relative overflow-hidden group border border-slate-700/50">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <DollarSign className="w-24 h-24 text-violet-400" />
                            </div>
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <p className="text-slate-400 font-medium">Aktueller Kontostand</p>
                                {!isEditing && (
                                    <button onClick={handleStartEdit} className="text-slate-500 hover:text-violet-400 transition-colors opacity-0 group-hover:opacity-100">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="flex items-center gap-2 relative z-10">
                                    <input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white w-full"
                                        autoFocus
                                    />
                                    <button onClick={handleSaveEdit} className="p-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <h2 className={`text-3xl font-bold relative z-10 ${currentBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {formatCurrency(currentBalance)}
                                </h2>
                            )}
                        </div>

                        {/* Lagerwert VK Card */}
                        <div className="bg-slate-800/50 p-6 rounded-2xl relative overflow-hidden border border-slate-700/50">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <TrendingUp className="w-24 h-24 text-blue-400" />
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <p className="text-slate-400 font-medium">Lagerwert (VK)</p>
                                <div className="group/tooltip relative">
                                    <Info className="w-4 h-4 text-slate-500" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50">
                                        Der Wert aller Waren im Lager basierend auf dem aktuellen Verkaufspreis.
                                    </div>
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-blue-400">
                                {formatCurrency(currentInventoryValue)}
                            </h2>
                        </div>

                        {/* Gesamtvermögen Card */}
                        <div className="bg-slate-800/50 p-6 rounded-2xl relative overflow-hidden border border-slate-700/50">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Wallet className="w-24 h-24 text-fuchsia-400" />
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <p className="text-slate-400 font-medium">Gesamtvermögen</p>
                                <div className="group/tooltip relative">
                                    <Info className="w-4 h-4 text-slate-500" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50">
                                        Summe aus aktuellem Kontostand und dem Lagerwert (VK). Das potenzielle Kapital bei vollständigem Abverkauf.
                                    </div>
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-fuchsia-400">
                                {formatCurrency(currentBalance + currentInventoryValue)}
                            </h2>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-slate-900/50 border border-slate-700/50 p-6 rounded-3xl">
                        <h3 className="text-xl font-bold text-white mb-6">Verlauf</h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                        formatter={(value) => formatCurrency(value)}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="balance" name="Kontostand" stroke="#10b981" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="total" name="Gesamtvermögen (Potenzial)" stroke="#d946ef" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Transactions List */}
                    <div className="bg-slate-900/50 border border-slate-700/50 p-6 rounded-3xl">
                        <h3 className="text-xl font-bold text-white mb-6">Buchungshistorie</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-slate-400 border-b border-slate-700">
                                        <th className="p-3">Datum</th>
                                        <th className="p-3">Vorgang</th>
                                        <th className="p-3">Grund</th>
                                        <th className="p-3 text-right">Betrag</th>
                                        <th className="p-3 text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-300">
                                    {transactions.slice(0, 50).map((tx) => (
                                        <tr key={tx.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                                            <td className="p-3">{tx.date}</td>
                                            <td className="p-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'sale' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        tx.type === 'purchase' ? 'bg-blue-500/10 text-blue-400' :
                                                            'bg-red-500/10 text-red-400'
                                                    }`}>
                                                    {tx.type === 'sale' && <ArrowUpRight className="w-3 h-3" />}
                                                    {tx.type === 'purchase' && <ArrowDownRight className="w-3 h-3" />}
                                                    {tx.type === 'payout' && <ArrowDownRight className="w-3 h-3" />}
                                                    {tx.type === 'sale' ? 'Eingang' : 'Ausgang'}
                                                </span>
                                            </td>
                                            <td className="p-3">{tx.reason}</td>
                                            <td className={`p-3 text-right font-medium ${tx.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {tx.isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </td>
                                            <td className="p-3 text-right text-slate-400">
                                                {formatCurrency(tx.balanceSnapshot)}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500">
                                                Keine Buchungen vorhanden
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
