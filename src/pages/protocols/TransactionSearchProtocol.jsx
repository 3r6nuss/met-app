import React, { useState, useMemo } from 'react';
import { Search, Copy, Check, ChevronDown, ChevronUp, Download, X, Filter } from 'lucide-react';

export default function TransactionSearchProtocol({ logs = [] }) {
    const [searchId, setSearchId] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterDepositor, setFilterDepositor] = useState('');
    const [filterItem, setFilterItem] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [expandedRow, setExpandedRow] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    // Get unique depositors and items for filter dropdowns
    const uniqueDepositors = useMemo(() => {
        const deps = [...new Set(logs.map(l => l.depositor).filter(Boolean))];
        return deps.sort();
    }, [logs]);

    const uniqueItems = useMemo(() => {
        const items = [...new Set(logs.map(l => l.itemName).filter(Boolean))];
        return items.sort();
    }, [logs]);

    // Filter logic
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            // Transaction ID search (exact or partial match)
            if (searchId) {
                const searchUpper = searchId.toUpperCase();
                const logTxId = (log.transaction_id || '').toUpperCase();
                if (!logTxId.includes(searchUpper)) return false;
            }

            // Type filter
            if (filterType !== 'all' && log.type !== filterType) return false;

            // Category filter
            if (filterCategory !== 'all' && log.category !== filterCategory) return false;

            // Depositor filter
            if (filterDepositor && log.depositor !== filterDepositor) return false;

            // Item filter
            if (filterItem && log.itemName !== filterItem) return false;

            // Date range
            if (filterDateFrom) {
                const logDate = new Date(log.timestamp);
                const fromDate = new Date(filterDateFrom);
                fromDate.setHours(0, 0, 0, 0);
                if (logDate < fromDate) return false;
            }
            if (filterDateTo) {
                const logDate = new Date(log.timestamp);
                const toDate = new Date(filterDateTo);
                toDate.setHours(23, 59, 59, 999);
                if (logDate > toDate) return false;
            }

            return true;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [logs, searchId, filterType, filterCategory, filterDepositor, filterItem, filterDateFrom, filterDateTo]);

    const handleCopy = (id) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const clearFilters = () => {
        setFilterType('all');
        setFilterCategory('all');
        setFilterDepositor('');
        setFilterItem('');
        setFilterDateFrom('');
        setFilterDateTo('');
    };

    const hasActiveFilters = filterType !== 'all' || filterCategory !== 'all' || filterDepositor || filterItem || filterDateFrom || filterDateTo;

    const formatDate = (ts) => {
        try {
            return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch { return '-'; }
    };

    const formatTime = (ts) => {
        try {
            return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        } catch { return '-'; }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val || 0);
    };

    const getTypeLabel = (type) => type === 'in' ? 'Eingang' : 'Ausgang';
    const getCategoryLabel = (cat) => {
        switch (cat) {
            case 'trade': return 'Handel';
            case 'internal': return 'Intern';
            case 'revert': return 'Storno';
            default: return cat || '-';
        }
    };

    // CSV Export
    const handleExportCSV = () => {
        const headers = ['Referenz-ID', 'Datum', 'Uhrzeit', 'Typ', 'Kategorie', 'Artikel', 'Menge', 'Preis', 'Gesamt', 'Person', 'Status'];
        const csvRows = [
            headers.join(';'),
            ...filteredLogs.map(log => [
                log.transaction_id || '-',
                formatDate(log.timestamp),
                formatTime(log.timestamp),
                getTypeLabel(log.type),
                getCategoryLabel(log.category),
                log.itemName || '-',
                log.quantity || 0,
                log.price || 0,
                (log.quantity || 0) * (log.price || 0),
                log.depositor || '-',
                log.status || '-'
            ].join(';'))
        ];

        const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `transaktionen_${searchId || 'alle'}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-3">
                        <Search className="w-8 h-8 text-emerald-400" />
                        Transaktions-Suche
                    </h1>
                    <p className="text-slate-500 mt-1">Suche nach Referenz-ID oder filtere Transaktionen</p>
                </div>
                {filteredLogs.length > 0 && (
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        CSV Export
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                            placeholder="Referenz-ID eingeben (z.B. A7X9K)..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white font-mono text-lg tracking-wider focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600 placeholder:font-sans placeholder:text-base placeholder:tracking-normal"
                            maxLength={5}
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${showFilters || hasActiveFilters
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filter
                        {hasActiveFilters && (
                            <span className="w-2 h-2 bg-white rounded-full" />
                        )}
                    </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 uppercase tracking-wider">Typ</label>
                            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none">
                                <option value="all">Alle</option>
                                <option value="in">Eingang</option>
                                <option value="out">Ausgang</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 uppercase tracking-wider">Kategorie</label>
                            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none">
                                <option value="all">Alle</option>
                                <option value="trade">Handel</option>
                                <option value="internal">Intern</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 uppercase tracking-wider">Person</label>
                            <select value={filterDepositor} onChange={(e) => setFilterDepositor(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none">
                                <option value="">Alle</option>
                                {uniqueDepositors.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 uppercase tracking-wider">Artikel</label>
                            <select value={filterItem} onChange={(e) => setFilterItem(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none">
                                <option value="">Alle</option>
                                {uniqueItems.map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 uppercase tracking-wider">Von</label>
                            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 uppercase tracking-wider">Bis</label>
                            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none" />
                        </div>
                        {hasActiveFilters && (
                            <div className="col-span-full flex justify-end">
                                <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
                                    <X className="w-3 h-3" /> Filter zurücksetzen
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Results Count */}
            <div className="text-sm text-slate-500">
                {filteredLogs.length} {filteredLogs.length === 1 ? 'Ergebnis' : 'Ergebnisse'}
                {(searchId || hasActiveFilters) && ` (von ${logs.length} gesamt)`}
            </div>

            {/* Results Table */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-800/80 border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    <div className="col-span-2">Referenz-ID</div>
                    <div className="col-span-2">Datum</div>
                    <div className="col-span-1">Typ</div>
                    <div className="col-span-3">Artikel</div>
                    <div className="col-span-1 text-right">Menge</div>
                    <div className="col-span-1 text-right">Preis</div>
                    <div className="col-span-2">Person</div>
                </div>

                {/* Table Rows */}
                {filteredLogs.length === 0 ? (
                    <div className="px-4 py-12 text-center text-slate-500">
                        {searchId ? (
                            <div>
                                <Search className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                <p className="text-lg font-medium">Keine Transaktion gefunden</p>
                                <p className="text-sm mt-1">Keine Ergebnisse für &quot;{searchId}&quot;</p>
                            </div>
                        ) : (
                            <p>Keine Transaktionen vorhanden</p>
                        )}
                    </div>
                ) : (
                    <div className="max-h-[600px] overflow-y-auto">
                        {filteredLogs.slice(0, 200).map((log) => (
                            <div key={log.timestamp}>
                                {/* Main Row */}
                                <div
                                    onClick={() => setExpandedRow(expandedRow === log.timestamp ? null : log.timestamp)}
                                    className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-700/50 cursor-pointer transition-colors ${expandedRow === log.timestamp ? 'bg-slate-700/30' : 'hover:bg-slate-750/50'
                                        }`}
                                >
                                    <div className="col-span-2 flex items-center gap-2">
                                        {log.transaction_id ? (
                                            <>
                                                <span className="font-mono font-bold text-emerald-400 tracking-wider">{log.transaction_id}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleCopy(log.transaction_id); }}
                                                    className="p-0.5 rounded hover:bg-slate-600 transition-colors"
                                                    title="ID kopieren"
                                                >
                                                    {copiedId === log.transaction_id
                                                        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                        : <Copy className="w-3.5 h-3.5 text-slate-500" />
                                                    }
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-slate-600 text-sm">—</span>
                                        )}
                                    </div>
                                    <div className="col-span-2 text-slate-300 text-sm">
                                        {formatDate(log.timestamp)}
                                        <span className="text-slate-500 ml-1">{formatTime(log.timestamp)}</span>
                                    </div>
                                    <div className="col-span-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${log.type === 'in'
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-amber-500/20 text-amber-400'
                                            }`}>
                                            {getTypeLabel(log.type)}
                                        </span>
                                    </div>
                                    <div className="col-span-3 text-white text-sm truncate">{log.itemName || '-'}</div>
                                    <div className="col-span-1 text-right text-slate-300 text-sm">{log.quantity || 0}</div>
                                    <div className="col-span-1 text-right text-slate-300 text-sm">{formatCurrency(log.price)}</div>
                                    <div className="col-span-2 flex items-center justify-between">
                                        <span className="text-slate-300 text-sm truncate">{log.depositor || '-'}</span>
                                        {expandedRow === log.timestamp
                                            ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                            : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                        }
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {expandedRow === log.timestamp && (
                                    <div className="px-4 py-4 bg-slate-900/50 border-b border-slate-700 animate-fade-in">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-slate-500 text-xs uppercase tracking-wider">Kategorie</span>
                                                <p className="text-white font-medium mt-0.5">{getCategoryLabel(log.category)}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 text-xs uppercase tracking-wider">Gesamt</span>
                                                <p className="text-white font-bold mt-0.5">{formatCurrency((log.quantity || 0) * (log.price || 0))}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 text-xs uppercase tracking-wider">Status</span>
                                                <p className="text-white mt-0.5">{log.status || '-'}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 text-xs uppercase tracking-wider">Nachricht</span>
                                                <p className="text-slate-300 mt-0.5 text-xs">{log.msg || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredLogs.length > 200 && (
                            <div className="px-4 py-3 text-center text-slate-500 text-sm border-t border-slate-700">
                                Zeige 200 von {filteredLogs.length} Ergebnissen. Verwende Filter um die Ergebnisse einzugrenzen.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
