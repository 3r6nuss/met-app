import React, { useState, useEffect, useMemo } from 'react';
import {
    Shield, Calendar, Search, Filter, Download, RefreshCw,
    AlertTriangle, CheckCircle, Info, User, DollarSign,
    Package, Settings, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const API_URL = '/api';

export default function FinanceAuditProtocol({ user }) {
    const [auditLogs, setAuditLogs] = useState([]);
    const [devLogs, setDevLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 30;

    // Fetch audit and dev logs
    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const [auditRes, devRes] = await Promise.all([
                    fetch(`${API_URL}/audit-logs`).then(r => r.json()),
                    fetch(`${API_URL}/dev-logs`).then(r => r.json())
                ]);
                setAuditLogs(auditRes || []);
                setDevLogs(devRes || []);
            } catch (err) {
                console.error('Failed to fetch logs:', err);
            }
            setLoading(false);
        };
        fetchLogs();
    }, []);

    // Combine and process logs
    const combinedLogs = useMemo(() => {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);

        // Process audit logs
        const auditEntries = auditLogs
            .filter(log => {
                const d = new Date(log.timestamp);
                return d >= start && d <= end;
            })
            .map(log => ({
                id: log.id || log.timestamp,
                timestamp: log.timestamp,
                source: 'audit',
                user: log.username || 'System',
                action: log.action,
                details: log.details,
                category: categorizeAction(log.action),
                severity: getSeverity(log.action, log.details)
            }));

        // Process dev logs
        const devEntries = devLogs
            .filter(log => {
                const d = new Date(log.timestamp);
                return d >= start && d <= end;
            })
            .map(log => ({
                id: log.id || log.timestamp,
                timestamp: log.timestamp,
                source: 'dev',
                user: extractUser(log.message) || 'System',
                action: log.category,
                details: log.message,
                category: mapDevCategory(log.category),
                severity: log.category === 'ERROR' ? 'error' : 'info'
            }));

        // Combine and sort
        let combined = [...auditEntries, ...devEntries]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Apply filters
        if (searchTerm) {
            combined = combined.filter(log =>
                log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (categoryFilter !== 'all') {
            combined = combined.filter(log => log.category === categoryFilter);
        }

        if (severityFilter !== 'all') {
            combined = combined.filter(log => log.severity === severityFilter);
        }

        return combined;
    }, [auditLogs, devLogs, dateRange, searchTerm, categoryFilter, severityFilter]);

    // Helper functions
    function categorizeAction(action) {
        if (!action) return 'Sonstiges';
        if (action.includes('TRANSACTION') || action.includes('PAYOUT')) return 'Transaktion';
        if (action.includes('PRICE')) return 'Preise';
        if (action.includes('EMPLOYEE') || action.includes('USER')) return 'Personal';
        if (action.includes('INVENTORY') || action.includes('STOCK')) return 'Lager';
        if (action.includes('DELETE') || action.includes('REVERT')) return 'Korrektur';
        if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'Auth';
        return 'Sonstiges';
    }

    function mapDevCategory(cat) {
        const mapping = {
            'TX': 'Transaktion',
            'AUTH': 'Auth',
            'PRICE': 'Preise',
            'STATE': 'System',
            'ERROR': 'Fehler',
            'API': 'API',
            'SYSTEM': 'System'
        };
        return mapping[cat] || 'Sonstiges';
    }

    function getSeverity(action, details) {
        if (!action) return 'info';
        if (action.includes('ERROR') || action.includes('FAILED')) return 'error';
        if (action.includes('DELETE') || action.includes('REVERT')) return 'warning';
        if (action.includes('TRANSACTION') && details?.includes('high')) return 'warning';
        return 'info';
    }

    function extractUser(message) {
        const match = message?.match(/User: (\w+)/);
        return match ? match[1] : null;
    }

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'Transaktion': return <DollarSign className="w-4 h-4" />;
            case 'Preise': return <Settings className="w-4 h-4" />;
            case 'Personal': return <User className="w-4 h-4" />;
            case 'Lager': return <Package className="w-4 h-4" />;
            case 'Auth': return <Shield className="w-4 h-4" />;
            case 'Korrektur': return <AlertTriangle className="w-4 h-4" />;
            default: return <Info className="w-4 h-4" />;
        }
    };

    const getSeverityStyles = (severity) => {
        switch (severity) {
            case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'warning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    // Statistics
    const stats = useMemo(() => {
        return {
            total: combinedLogs.length,
            errors: combinedLogs.filter(l => l.severity === 'error').length,
            warnings: combinedLogs.filter(l => l.severity === 'warning').length,
            transactions: combinedLogs.filter(l => l.category === 'Transaktion').length
        };
    }, [combinedLogs]);

    // Pagination
    const totalPages = Math.ceil(combinedLogs.length / itemsPerPage);
    const paginatedLogs = combinedLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const downloadCSV = () => {
        const headers = ['Zeitstempel', 'Benutzer', 'Kategorie', 'Aktion', 'Details', 'Schweregrad'];
        const rows = combinedLogs.map(log => [
            formatDate(log.timestamp),
            log.user,
            log.category,
            log.action,
            log.details?.replace(/;/g, ','),
            log.severity
        ]);

        const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Finanz_Audit_${dateRange.start}_${dateRange.end}.csv`;
        link.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-amber-400" />
                        Finanz-Audit
                    </h1>
                    <p className="text-slate-400 mt-1">Vollständiger Audit-Trail aller buchhalterischen Aktionen</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-xl border border-slate-700">
                        <Calendar className="w-4 h-4 text-amber-400" />
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
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/10">
                        <Eye className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
                        <div className="text-xs text-slate-500">Einträge</div>
                    </div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-red-500/10">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-red-400">{stats.errors}</div>
                        <div className="text-xs text-slate-500">Fehler</div>
                    </div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-500/10">
                        <Info className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-amber-400">{stats.warnings}</div>
                        <div className="text-xs text-slate-500">Warnungen</div>
                    </div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-emerald-400">{stats.transactions}</div>
                        <div className="text-xs text-slate-500">Transaktionen</div>
                    </div>
                </div>
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap gap-4 items-center bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Suche..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 focus:ring-0"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-slate-700 border-none rounded-lg text-slate-200 text-sm px-3 py-2"
                >
                    <option value="all">Alle Kategorien</option>
                    <option value="Transaktion">Transaktionen</option>
                    <option value="Preise">Preise</option>
                    <option value="Personal">Personal</option>
                    <option value="Lager">Lager</option>
                    <option value="Korrektur">Korrekturen</option>
                    <option value="Auth">Auth</option>
                </select>
                <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="bg-slate-700 border-none rounded-lg text-slate-200 text-sm px-3 py-2"
                >
                    <option value="all">Alle Schweregrade</option>
                    <option value="error">Fehler</option>
                    <option value="warning">Warnungen</option>
                    <option value="info">Info</option>
                </select>
            </div>

            {/* AUDIT LOG TABLE */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50">
                            <tr className="text-slate-400 text-xs uppercase tracking-wider">
                                <th className="px-4 py-4">Zeitstempel</th>
                                <th className="px-4 py-4">Benutzer</th>
                                <th className="px-4 py-4">Kategorie</th>
                                <th className="px-4 py-4">Aktion</th>
                                <th className="px-4 py-4">Details</th>
                                <th className="px-4 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {paginatedLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors text-slate-300">
                                    <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(log.timestamp)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-500" />
                                            <span className="font-medium">{log.user}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            {getCategoryIcon(log.category)}
                                            <span>{log.category}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{log.action}</td>
                                    <td className="px-4 py-3 text-sm max-w-xs truncate" title={log.details}>
                                        {log.details}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getSeverityStyles(log.severity)}`}>
                                            {log.severity === 'error' && <AlertTriangle className="w-3 h-3" />}
                                            {log.severity === 'warning' && <Info className="w-3 h-3" />}
                                            {log.severity === 'info' && <CheckCircle className="w-3 h-3" />}
                                            {log.severity}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {paginatedLogs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
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
                            Seite {currentPage} von {totalPages}
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
