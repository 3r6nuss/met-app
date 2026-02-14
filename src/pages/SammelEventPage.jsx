import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Plus, Trash2, Settings, Users, Package, TrendingUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { api } from '../services/api';

export default function SammelEventPage({ employees = [] }) {
    const [teams, setTeams] = useState([]);
    const [config, setConfig] = useState([]);
    const [entries, setEntries] = useState([]);
    const [stats, setStats] = useState({ teams: [], employees: [] });
    const [loading, setLoading] = useState(true);

    // Entry form
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const activeEmployees = employees.filter(e => e.status !== 'fired');

    const loadData = useCallback(async () => {
        try {
            const [teamsData, configData, entriesData, statsData] = await Promise.all([
                api.getSammelTeams(),
                api.getSammelConfig(),
                api.getSammelEntries(),
                api.getSammelStats()
            ]);
            setTeams(teamsData);
            setConfig(configData);
            setEntries(entriesData);
            setStats(statsData);
        } catch (err) {
            console.error('Load error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Assigned employees (those with a team)
    const assignedEmployees = teams.flatMap(t => t.members?.map(m => m.employee_name) || []);

    const handleSubmitEntry = async (e) => {
        e.preventDefault();
        if (!selectedEmployee || !selectedProduct || !quantity) return;

        setSubmitting(true);
        try {
            await api.createSammelEntry({
                employee_name: selectedEmployee,
                product_name: selectedProduct,
                quantity: parseInt(quantity)
            });
            setQuantity('');
            loadData();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEntry = async (id) => {
        if (!confirm('Eintrag löschen?')) return;
        try {
            await api.deleteSammelEntry(id);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    // Find team for an employee
    const getEmployeeTeam = (empName) => teams.find(t => t.members?.some(m => m.employee_name === empName));

    // Grand total
    const grandTotal = stats.teams?.reduce((sum, t) => sum + t.total_quantity, 0) || 0;

    // Leader
    const leader = stats.teams?.[0];

    if (loading) return <div className="flex items-center justify-center min-h-[400px] text-violet-400">Lade Event-Daten...</div>;

    if (config.length === 0 || teams.length === 0) {
        return (
            <div className="animate-fade-in">
                <div className="glass-panel p-12 rounded-2xl text-center">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-400 opacity-50" />
                    <h2 className="text-xl font-bold text-white mb-2">Sammel-Event nicht konfiguriert</h2>
                    <p className="text-slate-400 mb-6">
                        {config.length === 0 ? 'Bitte zuerst Produkte für den Wettbewerb festlegen.' : 'Bitte zuerst Teams erstellen und Mitarbeiter zuordnen.'}
                    </p>
                    <Link
                        to="/sammel-event/config"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors"
                    >
                        <Settings className="w-5 h-5" />
                        Zur Konfiguration
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Trophy className="w-7 h-7 text-amber-400" />
                        Sammel-Event
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {config.map(c => c.product_name).join(', ')} · {teams.length} Teams · {grandTotal.toLocaleString()} gesammelt
                    </p>
                </div>
                <Link
                    to="/sammel-event/config"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-xl text-sm transition-colors border border-slate-700/50"
                >
                    <Settings className="w-4 h-4" />
                    Config
                </Link>
            </div>

            {/* ============================================ */}
            {/* TEAM RANKING CARDS */}
            {/* ============================================ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {stats.teams?.map((team, idx) => {
                    const percentage = grandTotal > 0 ? Math.round((team.total_quantity / grandTotal) * 100) : 0;
                    const isLeader = idx === 0 && team.total_quantity > 0;
                    return (
                        <div
                            key={team.team_id}
                            className={`relative overflow-hidden rounded-2xl p-5 border transition-all ${isLeader
                                ? 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30 ring-1 ring-amber-500/20'
                                : 'glass-panel border-slate-700/40'
                                }`}
                        >
                            {isLeader && (
                                <div className="absolute top-2 right-2">
                                    <Trophy className="w-6 h-6 text-amber-400" />
                                </div>
                            )}

                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.team_color }} />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">#{idx + 1}</span>
                                <span className="font-semibold text-white">{team.team_name}</span>
                            </div>

                            <div className="text-3xl font-bold text-white mb-1">
                                {team.total_quantity.toLocaleString()}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                <span>{percentage}% vom Gesamt</span>
                                <span>·</span>
                                <span>Ø {team.avg_per_person ?? 0} pro Person</span>
                                <span>·</span>
                                <span>{team.member_count ?? 0} MA</span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: team.team_color
                                    }}
                                />
                            </div>

                            {/* Product breakdown */}
                            {team.products?.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {team.products.map(p => (
                                        <div key={p.product_name} className="flex justify-between text-xs">
                                            <span className="text-slate-500">{p.product_name}</span>
                                            <span className="text-slate-300 font-medium">{p.quantity.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ============================================ */}
            {/* CHART + ENTRY FORM */}
            {/* ============================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        Team-Vergleich
                    </h2>

                    {stats.teams?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.teams} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis
                                    dataKey="team_name"
                                    type="category"
                                    tick={{ fill: '#e2e8f0', fontSize: 13, fontWeight: 600 }}
                                    width={100}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '12px',
                                        color: '#e2e8f0'
                                    }}
                                    formatter={(value) => [value.toLocaleString(), 'Menge']}
                                />
                                <Bar dataKey="total_quantity" radius={[0, 8, 8, 0]} maxBarSize={40}>
                                    {stats.teams.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.team_color || '#8b5cf6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-slate-500">Noch keine Daten</div>
                    )}
                </div>

                {/* Entry Form */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-violet-400" />
                        Neuer Eintrag
                    </h2>

                    <form onSubmit={handleSubmitEntry} className="space-y-4">
                        {/* Employee */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Mitarbeiter</label>
                            <div className="relative">
                                <select
                                    value={selectedEmployee}
                                    onChange={e => setSelectedEmployee(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white appearance-none focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                                >
                                    <option value="">Auswählen...</option>
                                    {assignedEmployees.map(name => {
                                        const team = getEmployeeTeam(name);
                                        return (
                                            <option key={name} value={name}>
                                                {name} ({team?.name || '?'})
                                            </option>
                                        );
                                    })}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                            {selectedEmployee && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                    {(() => {
                                        const team = getEmployeeTeam(selectedEmployee);
                                        return team ? (
                                            <>
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                                                <span className="text-xs" style={{ color: team.color }}>{team.name}</span>
                                            </>
                                        ) : null;
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Product */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Produkt</label>
                            <div className="relative">
                                <select
                                    value={selectedProduct}
                                    onChange={e => setSelectedProduct(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white appearance-none focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                                >
                                    <option value="">Auswählen...</option>
                                    {config.map(c => (
                                        <option key={c.product_name} value={c.product_name}>{c.product_name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Menge</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                placeholder="0"
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!selectedEmployee || !selectedProduct || !quantity || submitting}
                            className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white rounded-xl font-semibold transition-all"
                        >
                            {submitting ? 'Speichere...' : 'Eintrag buchen'}
                        </button>
                    </form>
                </div>
            </div>

            {/* ============================================ */}
            {/* TOP EMPLOYEES */}
            {/* ============================================ */}
            {stats.employees?.length > 0 && (
                <div className="glass-panel p-6 rounded-2xl">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-sky-400" />
                        Top Sammler
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {stats.employees.map((emp, idx) => (
                            <div
                                key={emp.employee_name}
                                className="flex items-center gap-3 bg-slate-800/30 rounded-xl p-3 border border-slate-700/30"
                            >
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                    style={{ backgroundColor: emp.team_color || '#8b5cf6' }}
                                >
                                    {idx + 1}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{emp.employee_name}</div>
                                    <div className="text-xs text-slate-500">{emp.team_name} · {emp.total_quantity.toLocaleString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* ENTRIES LOG */}
            {/* ============================================ */}
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-400" />
                    Alle Einträge
                    <span className="text-xs font-normal text-slate-500 ml-1">({entries.length})</span>
                </h2>

                {entries.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
                                    <th className="pb-3 pr-4">Zeitpunkt</th>
                                    <th className="pb-3 pr-4">Mitarbeiter</th>
                                    <th className="pb-3 pr-4">Team</th>
                                    <th className="pb-3 pr-4">Produkt</th>
                                    <th className="pb-3 pr-4 text-right">Menge</th>
                                    <th className="pb-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(entry => (
                                    <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                        <td className="py-2.5 pr-4 text-slate-400 text-xs">
                                            {new Date(entry.timestamp).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-2.5 pr-4 text-white font-medium">{entry.employee_name}</td>
                                        <td className="py-2.5 pr-4">
                                            <span className="inline-flex items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.team_color }} />
                                                <span className="text-slate-300">{entry.team_name}</span>
                                            </span>
                                        </td>
                                        <td className="py-2.5 pr-4 text-slate-300">{entry.product_name}</td>
                                        <td className="py-2.5 pr-4 text-right text-white font-semibold">{entry.quantity.toLocaleString()}</td>
                                        <td className="py-2.5">
                                            <button
                                                onClick={() => handleDeleteEntry(entry.id)}
                                                className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>Noch keine Einträge</p>
                    </div>
                )}
            </div>
        </div>
    );
}
