import React, { useState, useEffect, useMemo } from 'react';
import {
    Gauge, Clock, Wifi, WifiOff, Activity, Server, Zap,
    TrendingUp, TrendingDown, RefreshCw, AlertTriangle,
    CheckCircle, XCircle, BarChart3, Timer
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';

const formatMs = (ms) => {
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
};

export default function PerformanceDashboard({ user }) {
    const [metrics, setMetrics] = useState({
        apiCalls: [],
        wsStatus: [],
        errors: []
    });
    const [isMonitoring, setIsMonitoring] = useState(true);
    const [wsConnected, setWsConnected] = useState(true);

    // Simulate API performance tracking
    useEffect(() => {
        if (!isMonitoring) return;

        // Override fetch to track API calls
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
            const start = performance.now();

            try {
                const response = await originalFetch(...args);
                const duration = performance.now() - start;

                // Only track /api calls
                if (url.includes('/api')) {
                    setMetrics(prev => ({
                        ...prev,
                        apiCalls: [...prev.apiCalls.slice(-99), {
                            timestamp: new Date().toISOString(),
                            url: url.replace(/^.*\/api/, '/api'),
                            duration,
                            status: response.status,
                            success: response.ok
                        }]
                    }));
                }

                return response;
            } catch (error) {
                const duration = performance.now() - start;

                if (url.includes('/api')) {
                    setMetrics(prev => ({
                        ...prev,
                        apiCalls: [...prev.apiCalls.slice(-99), {
                            timestamp: new Date().toISOString(),
                            url: url.replace(/^.*\/api/, '/api'),
                            duration,
                            status: 0,
                            success: false,
                            error: error.message
                        }],
                        errors: [...prev.errors.slice(-49), {
                            timestamp: new Date().toISOString(),
                            type: 'API',
                            message: error.message,
                            url
                        }]
                    }));
                }

                throw error;
            }
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, [isMonitoring]);

    // Track WebSocket status
    useEffect(() => {
        const checkWs = () => {
            const connected = document.querySelector('.animate-pulse.bg-emerald-400') !== null;
            setWsConnected(connected);

            setMetrics(prev => ({
                ...prev,
                wsStatus: [...prev.wsStatus.slice(-59), {
                    timestamp: new Date().toISOString(),
                    connected
                }]
            }));
        };

        checkWs();
        const interval = setInterval(checkWs, 5000);
        return () => clearInterval(interval);
    }, []);

    // Calculate stats
    const stats = useMemo(() => {
        const recent = metrics.apiCalls.slice(-50);
        const successful = recent.filter(c => c.success);
        const failed = recent.filter(c => !c.success);

        const avgDuration = successful.length > 0
            ? successful.reduce((sum, c) => sum + c.duration, 0) / successful.length
            : 0;

        const p95Index = Math.floor(successful.length * 0.95);
        const sortedDurations = [...successful].sort((a, b) => a.duration - b.duration);
        const p95Duration = sortedDurations[p95Index]?.duration || 0;

        // Group by endpoint
        const byEndpoint = {};
        recent.forEach(call => {
            const endpoint = call.url.split('?')[0];
            if (!byEndpoint[endpoint]) {
                byEndpoint[endpoint] = { calls: 0, totalDuration: 0, errors: 0 };
            }
            byEndpoint[endpoint].calls++;
            byEndpoint[endpoint].totalDuration += call.duration;
            if (!call.success) byEndpoint[endpoint].errors++;
        });

        const endpointStats = Object.entries(byEndpoint)
            .map(([endpoint, data]) => ({
                endpoint,
                calls: data.calls,
                avgDuration: data.totalDuration / data.calls,
                errorRate: (data.errors / data.calls) * 100
            }))
            .sort((a, b) => b.calls - a.calls);

        // Timeline for chart
        const timeline = [];
        const now = new Date();
        for (let i = 9; i >= 0; i--) {
            const minute = new Date(now - i * 60000);
            const minuteStr = minute.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const callsInMinute = recent.filter(c => {
                const callTime = new Date(c.timestamp);
                return callTime >= new Date(minute - 30000) && callTime < new Date(minute.getTime() + 30000);
            });

            timeline.push({
                time: minuteStr,
                calls: callsInMinute.length,
                avgMs: callsInMinute.length > 0
                    ? callsInMinute.reduce((sum, c) => sum + c.duration, 0) / callsInMinute.length
                    : 0,
                errors: callsInMinute.filter(c => !c.success).length
            });
        }

        return {
            totalCalls: recent.length,
            successRate: recent.length > 0 ? (successful.length / recent.length) * 100 : 100,
            avgDuration,
            p95Duration,
            failedCalls: failed.length,
            endpointStats: endpointStats.slice(0, 8),
            timeline
        };
    }, [metrics.apiCalls]);

    // WS uptime
    const wsUptime = useMemo(() => {
        const total = metrics.wsStatus.length;
        const connected = metrics.wsStatus.filter(s => s.connected).length;
        return total > 0 ? (connected / total) * 100 : 100;
    }, [metrics.wsStatus]);

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 flex items-center gap-3">
                        <Gauge className="w-8 h-8 text-green-400" />
                        Performance Monitor
                    </h1>
                    <p className="text-slate-400 mt-1">API-Antwortzeiten & Systemstatus</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsMonitoring(!isMonitoring)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${isMonitoring
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                    >
                        {isMonitoring ? (
                            <>
                                <Activity className="w-4 h-4 animate-pulse" />
                                Monitoring aktiv
                            </>
                        ) : (
                            <>
                                <Activity className="w-4 h-4" />
                                Monitoring pausiert
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setMetrics({ apiCalls: [], wsStatus: [], errors: [] })}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 transition-colors"
                        title="Reset"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* MAIN STATS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <Activity className="w-4 h-4" />
                        API-Calls
                    </div>
                    <div className="text-2xl font-bold text-slate-200">{stats.totalCalls}</div>
                    <div className="text-xs text-slate-500">letzte 50</div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <Timer className="w-4 h-4" />
                        Ø Antwortzeit
                    </div>
                    <div className={`text-2xl font-bold ${stats.avgDuration < 200 ? 'text-green-400' : stats.avgDuration < 500 ? 'text-amber-400' : 'text-red-400'}`}>
                        {formatMs(stats.avgDuration)}
                    </div>
                    <div className="text-xs text-slate-500">Durchschnitt</div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <Zap className="w-4 h-4" />
                        P95 Latenz
                    </div>
                    <div className={`text-2xl font-bold ${stats.p95Duration < 500 ? 'text-green-400' : stats.p95Duration < 1000 ? 'text-amber-400' : 'text-red-400'}`}>
                        {formatMs(stats.p95Duration)}
                    </div>
                    <div className="text-xs text-slate-500">95. Perzentil</div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <CheckCircle className="w-4 h-4" />
                        Erfolgsrate
                    </div>
                    <div className={`text-2xl font-bold ${stats.successRate >= 99 ? 'text-green-400' : stats.successRate >= 95 ? 'text-amber-400' : 'text-red-400'}`}>
                        {stats.successRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500">{stats.failedCalls} Fehler</div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        {wsConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        WebSocket
                    </div>
                    <div className={`text-2xl font-bold flex items-center gap-2 ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>
                        {wsConnected ? 'Online' : 'Offline'}
                    </div>
                    <div className="text-xs text-slate-500">Uptime: {wsUptime.toFixed(0)}%</div>
                </div>
            </div>

            {/* RESPONSE TIME CHART */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-400" />
                    Antwortzeiten (letzte 10 Minuten)
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.timeline}>
                            <defs>
                                <linearGradient id="colorMs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                            <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(v) => `${Math.round(v)} ms`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                formatter={(value, name) => [formatMs(value), name === 'avgMs' ? 'Ø Latenz' : name]}
                            />
                            <Area type="monotone" dataKey="avgMs" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMs)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ENDPOINT BREAKDOWN */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-blue-400" />
                    Endpoint-Statistiken
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
                            <tr>
                                <th className="pb-3 px-2">Endpoint</th>
                                <th className="pb-3 px-2 text-right">Calls</th>
                                <th className="pb-3 px-2 text-right">Ø Latenz</th>
                                <th className="pb-3 px-2 text-right">Fehlerrate</th>
                                <th className="pb-3 px-2">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {stats.endpointStats.map((ep) => (
                                <tr key={ep.endpoint} className="text-slate-300">
                                    <td className="py-3 px-2 font-mono text-sm">{ep.endpoint}</td>
                                    <td className="py-3 px-2 text-right">{ep.calls}</td>
                                    <td className={`py-3 px-2 text-right font-mono ${ep.avgDuration < 200 ? 'text-green-400' : ep.avgDuration < 500 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {formatMs(ep.avgDuration)}
                                    </td>
                                    <td className={`py-3 px-2 text-right ${ep.errorRate === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {ep.errorRate.toFixed(1)}%
                                    </td>
                                    <td className="py-3 px-2">
                                        {ep.errorRate === 0 && ep.avgDuration < 300 ? (
                                            <span className="inline-flex items-center gap-1 text-green-400">
                                                <CheckCircle className="w-4 h-4" /> OK
                                            </span>
                                        ) : ep.errorRate > 10 ? (
                                            <span className="inline-flex items-center gap-1 text-red-400">
                                                <XCircle className="w-4 h-4" /> Problem
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-amber-400">
                                                <AlertTriangle className="w-4 h-4" /> Warnung
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {stats.endpointStats.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-500">
                                        Noch keine API-Calls aufgezeichnet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RECENT ERRORS */}
            {metrics.errors.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Letzte Fehler
                    </h3>
                    <div className="space-y-2">
                        {metrics.errors.slice(-5).reverse().map((error, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                                <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-slate-200">{error.message}</div>
                                    <div className="text-xs text-slate-500">{error.url}</div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    {new Date(error.timestamp).toLocaleTimeString('de-DE')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
