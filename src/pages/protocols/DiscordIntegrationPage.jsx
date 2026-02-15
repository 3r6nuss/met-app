import { useState, useEffect, useCallback } from 'react';
import {
    Bot,
    Power,
    PowerOff,
    RefreshCw,
    AlertTriangle,
    Check,
    Clock,
    Eye,
    XCircle,
    ChevronDown,
    ChevronUp,
    Download,
    MessageSquare,
    DollarSign,
    Users,
    TrendingUp
} from 'lucide-react';

export default function DiscordIntegrationPage() {
    const [botStatus, setBotStatus] = useState({ isRunning: false, channelIds: [], username: null });
    const [logs, setLogs] = useState([]);
    const [discrepancies, setDiscrepancies] = useState([]);
    const [stats, setStats] = useState({ stats: {}, recentDiscrepancies: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedLog, setExpandedLog] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [resolveNote, setResolveNote] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [statusRes, logsRes, discrepanciesRes, statsRes] = await Promise.all([
                fetch('/api/discord/bot/status', { credentials: 'include' }),
                fetch('/api/discord/logs?limit=50', { credentials: 'include' }),
                fetch('/api/discord/discrepancies', { credentials: 'include' }),
                fetch('/api/discord/stats', { credentials: 'include' })
            ]);

            if (statusRes.ok) setBotStatus(await statusRes.json());
            if (logsRes.ok) {
                const data = await logsRes.json();
                setLogs(data.logs || []);
            }
            if (discrepanciesRes.ok) setDiscrepancies(await discrepanciesRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } catch (error) {
            console.error('Error fetching Discord data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleBotToggle = async () => {
        try {
            const endpoint = botStatus.isRunning ? '/api/discord/bot/stop' : '/api/discord/bot/start';
            const res = await fetch(endpoint, { method: 'POST', credentials: 'include' });
            if (res.ok) {
                setTimeout(fetchData, 2000); // Wait for bot to start/stop
            }
        } catch (error) {
            console.error('Error toggling bot:', error);
        }
    };

    const handleFetchHistory = async () => {
        try {
            const res = await fetch('/api/discord/bot/fetch-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ limit: 100 })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const handleResolve = async (logId, type) => {
        try {
            const res = await fetch(`/api/discord/discrepancy/${logId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ type, note: resolveNote })
            });
            if (res.ok) {
                setResolveNote('');
                setSelectedLog(null);
                fetchData();
            }
        } catch (error) {
            console.error('Error resolving discrepancy:', error);
        }
    };

    const handleRematch = async (logId) => {
        try {
            await fetch(`/api/discord/match/${logId}`, {
                method: 'POST',
                credentials: 'include'
            });
            fetchData();
        } catch (error) {
            console.error('Error re-matching:', error);
        }
    };

    const formatAmount = (amount) => {
        if (!amount) return '–';
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '–';
        return new Date(dateStr).toLocaleString('de-DE');
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'matched':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400 flex items-center gap-1"><Check size={12} /> OK</span>;
            case 'discrepancy':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1"><AlertTriangle size={12} /> Diskrepanz</span>;
            case 'pending':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-1"><Clock size={12} /> Ausstehend</span>;
            case 'ignored':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-500/20 text-gray-400 flex items-center gap-1"><XCircle size={12} /> Ignoriert</span>;
            default:
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-500/20 text-gray-400">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/20 rounded-xl">
                            <Bot className="text-indigo-400" size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Discord Integration</h1>
                            <p className="text-gray-400">FiveM Log-Abgleich mit Gemini AI</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleFetchHistory}
                            disabled={!botStatus.isRunning}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={18} />
                            History laden
                        </button>
                        <button
                            onClick={handleBotToggle}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${botStatus.isRunning
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                }`}
                        >
                            {botStatus.isRunning ? <PowerOff size={18} /> : <Power size={18} />}
                            {botStatus.isRunning ? 'Bot stoppen' : 'Bot starten'}
                        </button>
                        <button onClick={fetchData} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                {/* Bot Status */}
                <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${botStatus.isRunning ? 'bg-green-500/10 border border-green-500/20' : 'bg-gray-800 border border-gray-700'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${botStatus.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                        <span className="font-medium">
                            {botStatus.isRunning
                                ? `Bot aktiv: ${botStatus.username || 'Verbunden'}`
                                : 'Bot offline'}
                        </span>
                    </div>
                    {botStatus.channelIds?.length > 0 && (
                        <span className="text-sm text-gray-400">
                            Überwacht: {botStatus.channelIds.length} Channel(s)
                        </span>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Gesamt Logs</p>
                                <p className="text-3xl font-bold mt-1">{stats.stats?.total || 0}</p>
                            </div>
                            <MessageSquare className="text-gray-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Abgeglichen</p>
                                <p className="text-3xl font-bold mt-1 text-green-400">{stats.stats?.matched || 0}</p>
                            </div>
                            <Check className="text-green-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Diskrepanzen</p>
                                <p className="text-3xl font-bold mt-1 text-amber-400">{stats.stats?.discrepancies || 0}</p>
                            </div>
                            <AlertTriangle className="text-amber-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Ausstehend</p>
                                <p className="text-3xl font-bold mt-1 text-blue-400">{stats.stats?.pending || 0}</p>
                            </div>
                            <Clock className="text-blue-500" size={32} />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-700">
                    {[
                        { id: 'overview', label: 'Übersicht', icon: TrendingUp },
                        { id: 'discrepancies', label: 'Diskrepanzen', icon: AlertTriangle, count: discrepancies.length },
                        { id: 'all-logs', label: 'Alle Logs', icon: MessageSquare }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Discrepancies */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700">
                            <div className="p-4 border-b border-gray-700">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <AlertTriangle className="text-amber-400" size={18} />
                                    Neueste Diskrepanzen
                                </h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {stats.recentDiscrepancies?.length > 0 ? (
                                    stats.recentDiscrepancies.slice(0, 5).map(log => (
                                        <div key={log.id} className="p-3 bg-gray-700/50 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{log.employee_name || '?'}</p>
                                                    <p className="text-sm text-gray-400">{log.reason}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-amber-400">{formatAmount(log.amount)}</p>
                                                    <p className="text-xs text-gray-500">{formatDate(log.created_at)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-4">Keine Diskrepanzen</p>
                                )}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700">
                            <div className="p-4 border-b border-gray-700">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <MessageSquare className="text-indigo-400" size={18} />
                                    Letzte Aktivität
                                </h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {logs.slice(0, 5).map(log => (
                                    <div key={log.id} className="p-3 bg-gray-700/50 rounded-lg flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${log.parsed_type === 'abhebung' ? 'bg-red-400' : 'bg-green-400'
                                                }`}></div>
                                            <div>
                                                <p className="font-medium">{log.parsed_type === 'abhebung' ? 'Abhebung' : 'Rechnung'}</p>
                                                <p className="text-sm text-gray-400">{log.employee_name || 'Unbekannt'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{formatAmount(log.amount)}</p>
                                            {getStatusBadge(log.match_status)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Discrepancies Tab */}
                {activeTab === 'discrepancies' && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="text-left p-4 font-medium text-gray-400">Typ</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Mitarbeiter</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Discord-Betrag</th>
                                        <th className="text-left p-4 font-medium text-gray-400">System-Betrag</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Differenz</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Grund</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Datum</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {discrepancies.length > 0 ? discrepancies.map(log => {
                                        const details = log.discrepancy_details ? JSON.parse(log.discrepancy_details) : {};
                                        return (
                                            <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded ${log.parsed_type === 'abhebung'
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : 'bg-green-500/20 text-green-400'
                                                        }`}>
                                                        {log.parsed_type === 'abhebung' ? 'Abhebung' : 'Rechnung'}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-medium">{log.employee_name || '–'}</td>
                                                <td className="p-4">{formatAmount(log.amount)}</td>
                                                <td className="p-4">{formatAmount(details.systemAmount)}</td>
                                                <td className="p-4">
                                                    <span className={`font-bold ${(details.difference || 0) > 0 ? 'text-amber-400' : 'text-red-400'
                                                        }`}>
                                                        {details.difference > 0 ? '+' : ''}{formatAmount(details.difference)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-gray-400 max-w-xs truncate">{log.reason}</td>
                                                <td className="p-4 text-sm text-gray-400">{formatDate(log.created_at)}</td>
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setSelectedLog(log)}
                                                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                                            title="Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleResolve(log.id, 'adjusted')}
                                                            className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                                                            title="Als Rabatt akzeptieren"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleResolve(log.id, 'ignored')}
                                                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                                            title="Ignorieren"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-gray-500">
                                                Keine offenen Diskrepanzen 🎉
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* All Logs Tab */}
                {activeTab === 'all-logs' && (
                    <div className="space-y-3">
                        {logs.map(log => (
                            <div
                                key={log.id}
                                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
                            >
                                <div
                                    className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-700/50"
                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${log.parsed_type === 'abhebung' ? 'bg-red-400' : 'bg-green-400'
                                            }`}></div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {log.parsed_type === 'abhebung' ? 'Abhebung' : 'Rechnung'}
                                                </span>
                                                {getStatusBadge(log.match_status)}
                                            </div>
                                            <p className="text-sm text-gray-400">
                                                {log.employee_name || 'Unbekannt'} • {log.reason || '–'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-bold text-lg">{formatAmount(log.amount)}</p>
                                            <p className="text-sm text-gray-500">{formatDate(log.created_at)}</p>
                                        </div>
                                        {expandedLog === log.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {expandedLog === log.id && (
                                    <div className="p-4 border-t border-gray-700 bg-gray-900/50">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500">Rohinhalt:</p>
                                                <p className="mt-1 p-3 bg-gray-800 rounded-lg whitespace-pre-wrap text-xs font-mono">
                                                    {log.raw_content}
                                                </p>
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-gray-500">Details:</p>
                                                    <div className="mt-1 p-3 bg-gray-800 rounded-lg">
                                                        <p><span className="text-gray-500">Kunde:</span> {log.customer_name || '–'}</p>
                                                        <p><span className="text-gray-500">Zeitstempel:</span> {log.log_timestamp || '–'}</p>
                                                        <p><span className="text-gray-500">Diskrepanz-Typ:</span> {log.discrepancy_type || '–'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleRematch(log.id)}
                                                        className="px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg flex items-center gap-2 transition-colors"
                                                    >
                                                        <RefreshCw size={16} />
                                                        Neu abgleichen
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {logs.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Noch keine Logs erfasst</p>
                                <p className="text-sm">Starte den Bot und lade die History</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Diskrepanz Details</h2>
                            <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-gray-700 rounded-lg">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-700/50 rounded-xl">
                                    <p className="text-sm text-gray-400 mb-1">Discord-Betrag</p>
                                    <p className="text-2xl font-bold">{formatAmount(selectedLog.amount)}</p>
                                </div>
                                <div className="p-4 bg-gray-700/50 rounded-xl">
                                    <p className="text-sm text-gray-400 mb-1">System-Betrag</p>
                                    <p className="text-2xl font-bold">
                                        {formatAmount(selectedLog.discrepancy_details ? JSON.parse(selectedLog.discrepancy_details).systemAmount : 0)}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-700/50 rounded-xl">
                                <p className="text-sm text-gray-400 mb-2">Originalnachricht</p>
                                <p className="whitespace-pre-wrap text-sm">{selectedLog.raw_content}</p>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Notiz zur Auflösung</label>
                                <textarea
                                    value={resolveNote}
                                    onChange={(e) => setResolveNote(e.target.value)}
                                    className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
                                    rows={3}
                                    placeholder="Optionale Notiz..."
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleResolve(selectedLog.id, 'adjusted')}
                                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Als Rabatt akzeptieren
                                </button>
                                <button
                                    onClick={() => handleResolve(selectedLog.id, 'ignored')}
                                    className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium transition-colors"
                                >
                                    Ignorieren
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
