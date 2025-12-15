import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Search, Filter, RefreshCw, LogIn, ArrowRightLeft, Undo2, FileText, AlertTriangle, X, Download } from 'lucide-react';

const API_URL = '/api';

export default function AuditLogPage() {
    const [logs, setLogs] = useState([]);
    const [transactionLogs, setTransactionLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('audit'); // 'audit' or 'transactions'
    const [reverting, setReverting] = useState(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const [auditRes, txRes] = await Promise.all([
                fetch(`${API_URL}/audit-logs`, { credentials: 'include' }),
                fetch(`${API_URL}/logs`, { credentials: 'include' })
            ]);

            if (auditRes.ok) {
                const data = await auditRes.json();
                setLogs(data);
            }
            if (txRes.ok) {
                const txData = await txRes.json();
                setTransactionLogs(txData);
            }
        } catch (e) {
            console.error('Error fetching logs:', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleRevert = async (timestamp) => {
        if (!confirm('Bist du sicher, dass du diese Transaktion rückgängig machen willst?')) return;

        setReverting(timestamp);
        try {
            const res = await fetch(`${API_URL}/transaction/revert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ logTimestamp: timestamp })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                fetchLogs(); // Refresh
            } else {
                alert(data.error || 'Revert fehlgeschlagen');
            }
        } catch (e) {
            console.error('Revert error:', e);
            alert('Netzwerkfehler');
        }
        setReverting(null);
    };

    const actionTypes = useMemo(() => {
        const types = new Set(logs.map(l => l.action));
        return ['all', ...Array.from(types)];
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch =
                log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAction = actionFilter === 'all' || log.action === actionFilter;
            return matchesSearch && matchesAction;
        });
    }, [logs, searchTerm, actionFilter]);

    const [selectedDebugLog, setSelectedDebugLog] = useState(null);

    const filteredTransactions = useMemo(() => {
        return transactionLogs.filter(log => {
            return log.msg?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.depositor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.itemName?.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [transactionLogs, searchTerm]);

    const getActionIcon = (action) => {
        switch (action) {
            case 'LOGIN': return <LogIn className="w-4 h-4 text-emerald-400" />;
            case 'TRANSACTION': return <ArrowRightLeft className="w-4 h-4 text-violet-400" />;
            case 'REVERT': return <Undo2 className="w-4 h-4 text-amber-400" />;
            default: return <Activity className="w-4 h-4 text-slate-400" />;
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'LOGIN': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
            case 'TRANSACTION': return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
            case 'REVERT': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
        }
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const downloadCSV = () => {
        const dataToExport = activeTab === 'audit' ? filteredLogs : filteredTransactions;
        if (!dataToExport || dataToExport.length === 0) {
            alert('Keine Daten zum Exportieren vorhanden.');
            return;
        }

        const headers = activeTab === 'audit'
            ? ['Zeitstempel', 'Benutzer', 'User ID', 'Aktion', 'Details']
            : ['Zeitstempel', 'Typ', 'Produkt', 'Menge', 'Preis', 'Einzahler', 'Status', 'Kategorie'];

        const rows = dataToExport.map(row => {
            const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

            if (activeTab === 'audit') {
                return [
                    formatDate(row.timestamp),
                    escape(row.username),
                    escape(row.user_id),
                    escape(row.action),
                    escape(row.details)
                ];
            } else {
                return [
                    formatDate(row.timestamp),
                    escape(row.type === 'in' ? 'IN' : 'OUT'),
                    escape(row.itemName),
                    row.quantity,
                    row.price,
                    escape(row.depositor),
                    escape(row.status),
                    escape(row.category)
                ];
            }
        });

        const csvContent = [
            headers.join(';'),
            ...rows.map(r => r.join(';'))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${activeTab}_export_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Debug Log Modal */}
            {selectedDebugLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-panel w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-violet-400" />
                                Debug Details
                            </h2>
                            <button
                                onClick={() => setSelectedDebugLog(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-2">
                            {(() => {
                                try {
                                    const steps = JSON.parse(selectedDebugLog.debug_log || '[]');
                                    if (!steps || steps.length === 0) return <p className="text-slate-500 italic">Keine Debug-Daten vorhanden.</p>;

                                    return steps.map((step, idx) => {
                                        if (typeof step === 'string') {
                                            return (
                                                <div key={idx} className="text-slate-300 border-l-2 border-slate-700 pl-3 py-1">
                                                    {step}
                                                </div>
                                            );
                                        } else if (step.transactionIndex !== undefined) {
                                            return (
                                                <div key={idx} className="mt-4 first:mt-0">
                                                    <h4 className="text-violet-400 font-bold mb-2">Transaktion #{step.transactionIndex + 1}</h4>
                                                    {step.steps.map((subStep, sIdx) => (
                                                        <div key={sIdx} className={`border-l-2 pl-3 py-1 ${subStep.includes('ERROR') ? 'border-red-500 text-red-400 bg-red-500/10' : 'border-slate-700 text-slate-300'}`}>
                                                            {subStep}
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        }
                                        return null;
                                    });
                                } catch (e) {
                                    return <p className="text-red-400">Fehler beim Parsen der Debug-Daten.</p>;
                                }
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-red-500/20 text-red-400">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Aktivitätslog</h1>
                            <p className="text-sm text-slate-400">Super Admin - Alle Benutzeraktionen</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Aktualisieren
                    </button>
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="glass-panel rounded-2xl p-2 flex gap-2">
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'audit'
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                >
                    <Activity className="w-5 h-5" />
                    Audit Log
                </button>
                <button
                    onClick={() => setActiveTab('transactions')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'transactions'
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                >
                    <FileText className="w-5 h-5" />
                    Transaktionen ({transactionLogs.length})
                </button>
            </div>

            {/* Filters */}
            <div className="glass-panel rounded-2xl p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 glass-input rounded-lg"
                        />
                    </div>
                    {activeTab === 'audit' && (
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="glass-input rounded-lg px-4 py-2.5 appearance-none cursor-pointer"
                            >
                                {actionTypes.map(type => (
                                    <option key={type} value={type} className="bg-slate-900">
                                        {type === 'all' ? 'Alle Aktionen' : type}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">{logs.length}</div>
                    <div className="text-xs text-slate-400 uppercase">Audit Logs</div>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-400">
                        {logs.filter(l => l.action === 'LOGIN').length}
                    </div>
                    <div className="text-xs text-slate-400 uppercase">Logins</div>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-violet-400">
                        {transactionLogs.length}
                    </div>
                    <div className="text-xs text-slate-400 uppercase">Transaktionen</div>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">
                        {transactionLogs.filter(l => l.status === 'reverted').length}
                    </div>
                    <div className="text-xs text-slate-400 uppercase">Reverted</div>
                </div>
            </div>

            {/* Content */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                        Laden...
                    </div>
                ) : activeTab === 'audit' ? (
                    /* Audit Log Table */
                    filteredLogs.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">Keine Einträge gefunden</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-800/50 border-b border-slate-700">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Zeit</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Benutzer</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Aktion</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Details</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Debug</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                                                {formatDate(log.timestamp)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-white">{log.username}</span>
                                                    <span className="text-xs text-slate-500">{log.user_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${getActionColor(log.action)}`}>
                                                    {getActionIcon(log.action)}
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-300 max-w-md truncate">
                                                {log.details}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {log.debug_log && (
                                                    <button
                                                        onClick={() => setSelectedDebugLog(log)}
                                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                                                        title="View Debug Details"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    /* Transaction Logs Table with Revert */
                    filteredTransactions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">Keine Transaktionen gefunden</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-800/50 border-b border-slate-700">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Zeit</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Typ</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Produkt</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Menge</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Mitarbeiter</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Aktion</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredTransactions.slice(0, 100).map((log) => (
                                        <tr
                                            key={log.timestamp}
                                            className={`hover:bg-slate-800/30 transition-colors ${log.status === 'reverted' ? 'opacity-50' : ''}`}
                                        >
                                            <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                                                {formatDate(log.timestamp)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${log.type === 'in' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                                    }`}>
                                                    {log.type === 'in' ? 'IN' : 'OUT'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-white font-medium">
                                                {log.itemName || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-300">
                                                {log.quantity}x @ ${log.price}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-300">
                                                {log.depositor}
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.status === 'reverted' ? (
                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                        RÜCKGÄNGIG
                                                    </span>
                                                ) : log.category === 'revert' ? (
                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-300">
                                                        REVERT
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${log.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' :
                                                        log.status === 'outstanding' ? 'bg-amber-500/20 text-amber-300' :
                                                            'bg-slate-500/20 text-slate-300'
                                                        }`}>
                                                        {log.status === 'paid' ? 'BEZAHLT' : log.status === 'outstanding' ? 'OFFEN' : 'PENDING'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.status !== 'reverted' && log.category !== 'revert' && log.itemId && (
                                                    <button
                                                        onClick={() => handleRevert(log.timestamp)}
                                                        disabled={reverting === log.timestamp}
                                                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                                    >
                                                        {reverting === log.timestamp ? (
                                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Undo2 className="w-3 h-3" />
                                                        )}
                                                        Revert
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredTransactions.length > 100 && (
                                <div className="p-4 text-center text-slate-400 text-sm border-t border-slate-700">
                                    Zeige 100 von {filteredTransactions.length} Transaktionen
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
