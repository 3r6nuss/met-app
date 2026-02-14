import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Users, Plus, X, Trash2, Save, Package, Calendar, ArrowLeft, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const TEAM_COLORS = [
    '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
    '#ef4444', '#06b6d4', '#f97316', '#84cc16', '#6366f1'
];

export default function SammelEventConfigPage({ employees = [], inventory = [] }) {
    const [teams, setTeams] = useState([]);
    const [config, setConfig] = useState([]);
    const [settings, setSettings] = useState({ start_date: '', end_date: '' });
    const [loading, setLoading] = useState(true);

    // New team form
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamColor, setNewTeamColor] = useState('#8b5cf6');

    // Product selection
    const [selectedProducts, setSelectedProducts] = useState([]);

    const activeEmployees = employees.filter(e => e.status !== 'fired');

    const loadData = useCallback(async () => {
        try {
            const [teamsData, configData, settingsData] = await Promise.all([
                api.getSammelTeams(),
                api.getSammelConfig(),
                api.getSammelSettings()
            ]);
            setTeams(teamsData);
            setConfig(configData);
            setSelectedProducts(configData.map(c => c.product_name));
            setSettings({
                start_date: settingsData.start_date ? settingsData.start_date.slice(0, 16) : '',
                end_date: settingsData.end_date ? settingsData.end_date.slice(0, 16) : ''
            });
        } catch (err) {
            console.error('Load error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // -- Settings --
    const handleSaveSettings = async () => {
        try {
            await api.updateSammelSettings({
                start_date: settings.start_date ? new Date(settings.start_date).toISOString() : null,
                end_date: settings.end_date ? new Date(settings.end_date).toISOString() : null
            });
            alert('Zeitraum gespeichert!');
        } catch (err) {
            alert(err.message);
        }
    };

    // -- Teams --
    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return;
        try {
            await api.createSammelTeam({ name: newTeamName.trim(), color: newTeamColor });
            setNewTeamName('');
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteTeam = async (id) => {
        if (!confirm('Team wirklich löschen? Alle Einträge dieses Teams gehen verloren.')) return;
        try {
            await api.deleteSammelTeam(id);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    // -- Members --
    const handleAddMember = async (teamId, empName) => {
        try {
            await api.addSammelTeamMember(teamId, empName);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            await api.removeSammelTeamMember(memberId);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    // -- Products --
    const handleAddProduct = (productName) => {
        if (!productName || selectedProducts.includes(productName)) return;
        if (selectedProducts.length >= 3) {
            alert('Maximal 3 Produkte!');
            return;
        }
        setSelectedProducts(prev => [...prev, productName]);
    };

    const handleRemoveProduct = (productName) => {
        setSelectedProducts(prev => prev.filter(p => p !== productName));
    };

    const handleSaveProducts = async () => {
        try {
            await api.saveSammelProducts(selectedProducts);
            loadData();
            alert('Produkte gespeichert!');
        } catch (err) {
            alert(err.message);
        }
    };

    // Available products (not yet selected)
    const availableProducts = inventory.filter(item => !selectedProducts.includes(item.name));

    // Collect all assigned employee names
    const assignedEmployees = teams.flatMap(t => t.members?.map(m => m.employee_name) || []);
    const unassignedEmployees = activeEmployees.filter(e => !assignedEmployees.includes(e.name));

    if (loading) return <div className="flex items-center justify-center min-h-[400px] text-violet-400">Lade Konfiguration...</div>;

    return (
        <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to="/sammel-event" className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Settings className="w-6 h-6 text-violet-400" />
                            Sammel-Event Konfiguration
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">Teams erstellen, Mitarbeiter zuordnen & Produkte festlegen</p>
                    </div>
                </div>
            </div>

            {/* ============================================ */}
            {/* EVENT DATE RANGE */}
            {/* ============================================ */}
            <section className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-sky-400" />
                        Event-Zeitraum
                    </h2>
                    <button
                        onClick={handleSaveSettings}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Speichern
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Startdatum</label>
                        <input
                            type="datetime-local"
                            value={settings.start_date}
                            onChange={e => setSettings(s => ({ ...s, start_date: e.target.value }))}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 [color-scheme:dark]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Enddatum</label>
                        <input
                            type="datetime-local"
                            value={settings.end_date}
                            onChange={e => setSettings(s => ({ ...s, end_date: e.target.value }))}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 [color-scheme:dark]"
                        />
                    </div>
                </div>

                <p className="text-xs text-slate-500 mt-3">
                    Leer lassen = kein Zeitlimit. Einlagerungen außerhalb des Zeitraums werden nicht automatisch erfasst.
                </p>
            </section>

            {/* ============================================ */}
            {/* PRODUCT SELECTION (DROPDOWN) */}
            {/* ============================================ */}
            <section className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-amber-400" />
                        Produkte im Wettbewerb
                        <span className="text-xs font-normal text-slate-500 ml-2">({selectedProducts.length}/3)</span>
                    </h2>
                    <button
                        onClick={handleSaveProducts}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Speichern
                    </button>
                </div>

                {/* Selected products */}
                <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
                    {selectedProducts.map(p => (
                        <span
                            key={p}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-sm font-medium"
                        >
                            {p}
                            <button
                                onClick={() => handleRemoveProduct(p)}
                                className="ml-0.5 hover:text-red-400 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </span>
                    ))}
                    {selectedProducts.length === 0 && (
                        <span className="text-sm text-slate-600 italic">Noch keine Produkte ausgewählt</span>
                    )}
                </div>

                {/* Dropdown to add products */}
                {selectedProducts.length < 3 && (
                    <div className="relative">
                        <select
                            onChange={e => {
                                if (e.target.value) {
                                    handleAddProduct(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            defaultValue=""
                            className="w-full sm:w-80 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white appearance-none focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                        >
                            <option value="">+ Produkt hinzufügen...</option>
                            {availableProducts.map(item => (
                                <option key={item.id} value={item.name}>{item.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none sm:hidden" />
                    </div>
                )}
            </section>

            {/* ============================================ */}
            {/* TEAM MANAGEMENT */}
            {/* ============================================ */}
            <section className="glass-panel p-6 rounded-2xl">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-emerald-400" />
                    Teams
                </h2>

                {/* Create Team */}
                <div className="flex items-center gap-3 mb-6">
                    <input
                        type="text"
                        value={newTeamName}
                        onChange={e => setNewTeamName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                        placeholder="Neuer Teamname..."
                        className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                    />

                    {/* Color Picker */}
                    <div className="flex items-center gap-1">
                        {TEAM_COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => setNewTeamColor(color)}
                                className={`w-6 h-6 rounded-full transition-transform ${newTeamColor === color ? 'ring-2 ring-white scale-125' : 'hover:scale-110'}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleCreateTeam}
                        disabled={!newTeamName.trim()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Team erstellen
                    </button>
                </div>

                {/* Teams List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.map(team => (
                        <div
                            key={team.id}
                            className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                                    <h3 className="font-semibold text-white">{team.name}</h3>
                                    <span className="text-xs text-slate-500">({team.members?.length || 0} Mitglieder)</span>
                                </div>
                                <button
                                    onClick={() => handleDeleteTeam(team.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Members */}
                            <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                                {team.members?.map(member => (
                                    <span
                                        key={member.id}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                                        style={{ backgroundColor: team.color + '20', color: team.color, border: `1px solid ${team.color}40` }}
                                    >
                                        {member.employee_name}
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="ml-0.5 hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                                {(!team.members || team.members.length === 0) && (
                                    <span className="text-xs text-slate-600 italic">Keine Mitglieder</span>
                                )}
                            </div>

                            {/* Add member dropdown */}
                            {unassignedEmployees.length > 0 && (
                                <select
                                    onChange={e => {
                                        if (e.target.value) {
                                            handleAddMember(team.id, e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                    defaultValue=""
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-400 focus:outline-none focus:border-violet-500/50"
                                >
                                    <option value="">+ Mitarbeiter hinzufügen...</option>
                                    {unassignedEmployees.map(emp => (
                                        <option key={emp.name} value={emp.name}>{emp.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    ))}
                </div>

                {teams.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Noch keine Teams erstellt</p>
                    </div>
                )}
            </section>

            {/* ============================================ */}
            {/* UNASSIGNED EMPLOYEES */}
            {/* ============================================ */}
            {unassignedEmployees.length > 0 && teams.length > 0 && (
                <section className="glass-panel p-6 rounded-2xl">
                    <h2 className="text-lg font-semibold text-white mb-3">
                        Noch nicht zugeordnet
                        <span className="text-xs font-normal text-slate-500 ml-2">({unassignedEmployees.length})</span>
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {unassignedEmployees.map(emp => (
                            <span key={emp.name} className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-400">
                                {emp.name}
                            </span>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
