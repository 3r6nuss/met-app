import React, { useState, useEffect } from 'react';
import {
    Cpu, Activity, Zap, CheckCircle2, AlertTriangle,
    RefreshCw, Play, ShieldCheck, Terminal, DollarSign,
    BarChart3
} from 'lucide-react';
import { api } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Custom API call for automation since it's new
const fetchAnalysis = async () => {
    const res = await fetch('/api/automation/analysis', {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token') // Assuming simple token or cookie logic, usually handled by browser cookie for this app
        }
    });
    return res.json();
};

const executeAction = async (type, data) => {
    const res = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, data })
    });
    return res.json();
};

export default function AutomationProtocol() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(null);

    const loadData = () => {
        fetchAnalysis().then(res => {
            if (res.success) {
                setData(res);
            }
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000); // Live update every 10s
        return () => clearInterval(interval);
    }, []);

    const handleExecute = async (rec) => {
        setExecuting(rec.id);
        try {
            const res = await executeAction(rec.type, rec.data);
            if (res.success) {
                // Remove from list or reload
                loadData();
            } else {
                alert("Fehler: " + res.error);
            }
        } catch (e) {
            alert("Fehler bei Ausführung");
        } finally {
            setExecuting(null);
        }
    };

    if (loading) return <div className="p-10 text-violet-400 animate-pulse flex items-center gap-3"><Cpu className="animate-spin" /> Initializing AI Protocol...</div>;

    // Transform Activity Data for Chart
    const chartData = data?.analysis?.activityByHour ? Object.entries(data.analysis.activityByHour).map(([hour, count]) => ({ hour: `${hour}:00`, activity: count })) : [];

    return (
        <div className="space-y-8 pb-32 animate-fade-in">
            {/* HERRO HEADER */}
            <div className="relative overflow-hidden bg-slate-900/80 backdrop-blur-xl border border-violet-500/30 rounded-3xl p-8 shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Cpu className="w-64 h-64 text-violet-500" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-violet-500/20 p-2 rounded-lg border border-violet-500/50">
                            <Zap className="w-6 h-6 text-violet-400" />
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-white">
                            AUTO-PILOT PROTOCOL
                        </h1>
                    </div>
                    <p className="text-slate-400 max-w-2xl text-lg">
                        Automatisierte Buchhaltung & KI-gestützte Verkehrsanalyse.
                        Das System überwacht den Traffic in Echtzeit und schlägt Optimierungen vor.
                    </p>
                </div>

                {/* KPI ROW */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                        <div className="text-slate-500 text-xs uppercase font-bold">Traffic (Last 200)</div>
                        <div className="text-2xl font-mono text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            {data?.analysis?.totalTraffic}
                        </div>
                    </div>
                    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                        <div className="text-slate-500 text-xs uppercase font-bold">Volumen</div>
                        <div className="text-2xl font-mono text-white flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-400" />
                            {data?.analysis?.volumeMoved}
                        </div>
                    </div>
                    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                        <div className="text-slate-500 text-xs uppercase font-bold">Anomalien</div>
                        <div className={`text-2xl font-mono flex items-center gap-2 ${data?.analysis?.anomalies?.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            <AlertTriangle className="w-4 h-4" />
                            {data?.analysis?.anomalies?.length || 0}
                        </div>
                    </div>
                    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                        <div className="text-slate-500 text-xs uppercase font-bold">Status</div>
                        <div className="text-2xl font-mono text-emerald-400 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            ACTIVE
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COL: RECOMMENDATIONS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-fuchsia-400" />
                            Handlungsempfehlungen
                        </h2>
                        <span className="text-xs font-mono px-2 py-1 bg-violet-500/20 text-violet-300 rounded border border-violet-500/30 animate-pulse">
                            LIVE FEED
                        </span>
                    </div>

                    {data?.recommendations?.length === 0 && (
                        <div className="p-12 border border-dashed border-slate-700 rounded-3xl text-center">
                            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-slate-300">Alles Sauber</h3>
                            <p className="text-slate-500">Keine offenen Aufgaben gefunden. Das System läuft optimal.</p>
                        </div>
                    )}

                    <div className="grid gap-3">
                        {data?.recommendations?.map(rec => (
                            <div key={rec.id} className="group relative bg-slate-900/40 hover:bg-slate-800/60 border border-slate-700 hover:border-violet-500/50 rounded-2xl p-5 transition-all duration-300">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 p-2 rounded-lg 
                                            ${rec.type === 'CLOSE_WEEK' ? 'bg-amber-500/20 text-amber-400' :
                                                rec.type === 'PAYOUT' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    'bg-blue-500/20 text-blue-400'}`}>
                                            {rec.type === 'CLOSE_WEEK' && <RefreshCw className="w-5 h-5" />}
                                            {rec.type === 'PAYOUT' && <DollarSign className="w-5 h-5" />}
                                            {rec.type === 'FIX_STOCK' && <AlertTriangle className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-200">{rec.title}</h3>
                                            <p className="text-sm text-slate-400 mt-1">{rec.description}</p>
                                            {rec.impact === 'high' && <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-950/30 px-2 py-0.5 rounded">High Impact</span>}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleExecute(rec)}
                                        disabled={executing === rec.id}
                                        className="flex items-center gap-2 bg-slate-800 hover:bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-slate-700 hover:border-violet-500 disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {executing === rec.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                                        Ausführen
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT COL: STATS & GRAPHS */}
                <div className="space-y-6">
                    <div className="bg-slate-900/60 border border-slate-700/50 rounded-3xl p-6 shadow-xl">
                        <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-400" />
                            Aktivität (Heute)
                        </h3>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="activity" stroke="#8b5cf6" fill="url(#activityGradient)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-700/50 rounded-3xl p-6 shadow-xl">
                        <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            Aktuelle Anomalien
                        </h3>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {data?.analysis?.anomalies.map((anom, idx) => (
                                <div key={idx} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-red-300">{anom.type}</span>
                                        <span className="text-[10px] text-red-400 opacity-70">{new Date(anom.log.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="text-slate-400 text-xs truncate">
                                        {anom.log.depositor}: {anom.log.quantity}x {anom.log.itemName}
                                    </div>
                                </div>
                            ))}
                            {(!data?.analysis?.anomalies || data.analysis.anomalies.length === 0) && (
                                <div className="text-center text-slate-500 text-sm py-4 italic">
                                    Keine Auffälligkeiten.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
