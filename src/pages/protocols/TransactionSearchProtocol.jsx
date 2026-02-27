import React, { useState, useEffect, useMemo } from 'react';
import { Search, Copy, Check, ChevronRight, X, Filter, RefreshCw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function TransactionSearchProtocol() {
    const [references, setReferences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchId, setSearchId] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedRef, setSelectedRef] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    // Fetch data
    const fetchReferences = async () => {
        setLoading(true);
        try {
            const url = searchId
                ? `/api/references/search?id=${encodeURIComponent(searchId)}`
                : '/api/references';
            const res = await fetch(url);
            const data = await res.json();
            setReferences(data);
        } catch (err) {
            console.error('Failed to fetch references:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReferences();
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchReferences();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchId]);

    // Filter
    const filtered = useMemo(() => {
        if (statusFilter === 'all') return references;
        return references.filter(r => r.match_status === statusFilter);
    }, [references, statusFilter]);

    // Stats
    const stats = useMemo(() => {
        const matched = references.filter(r => r.match_status === 'matched').length;
        const pending = references.filter(r => r.match_status === 'pending').length;
        return { total: references.length, matched, pending };
    }, [references]);

    const handleCopy = (id) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatDate = (ts) => {
        if (!ts) return '-';
        try {
            return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch { return '-'; }
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        try {
            return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    const formatMoney = (val) => {
        return `$${Number(val || 0).toLocaleString('de-DE')}`;
    };

    return (
        <div className="animate-fade-in pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <RefreshCw className="w-8 h-8 text-emerald-400" />
                        An und Verkauf Referenz-ID
                    </h1>
                    <p className="text-slate-400 mt-2">Abgleich Discord-Logs ↔ System-Buchungen</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-2 text-sm">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-medium">
                            ✓ {stats.matched}
                        </span>
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full font-medium">
                            ⏳ {stats.pending}
                        </span>
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                            placeholder="Referenz-ID suchen..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white font-mono text-lg tracking-wider focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600 placeholder:font-sans placeholder:text-base placeholder:tracking-normal"
                        />
                    </div>
                    <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
                        {[
                            { value: 'all', label: 'Alle' },
                            { value: 'matched', label: '✓ Gematcht' },
                            { value: 'pending', label: '⏳ Offen' }
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setStatusFilter(f.value)}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${statusFilter === f.value
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-slate-500 mb-3 px-1">
                {filtered.length} {filtered.length === 1 ? 'Eintrag' : 'Einträge'}
                {searchId && ` für "${searchId}"`}
            </div>

            {/* Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-400 border-b border-slate-700 bg-slate-900/50">
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">Referenz-ID</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">Datum</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">Mitarbeiter</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">Typ</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider text-right">Discord</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider text-right">System</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider text-center">Status</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-slate-500">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Laden...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-slate-500">
                                        {searchId ? (
                                            <div>
                                                <Search className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                                                Keine Ergebnisse für "{searchId}"
                                            </div>
                                        ) : (
                                            'Keine Einträge vorhanden.'
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((ref) => {
                                    const products = ref.system_products || [];
                                    const systemTotal = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.price || 0)), 0);
                                    const diff = ref.match_status === 'matched'
                                        ? Math.abs(systemTotal - (ref.discord_amount || 0))
                                        : 0;

                                    return (
                                        <tr
                                            key={ref.id}
                                            onClick={() => setSelectedRef(ref)}
                                            className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-emerald-400 tracking-wider">
                                                        {ref.reference_id}
                                                    </span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCopy(ref.reference_id); }}
                                                        className="p-0.5 rounded hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        {copiedId === ref.reference_id
                                                            ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                            : <Copy className="w-3.5 h-3.5 text-slate-500" />
                                                        }
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm">
                                                {formatDate(ref.created_at)}
                                                <span className="text-slate-500 ml-1">{formatTime(ref.created_at)}</span>
                                            </td>
                                            <td className="p-4 font-medium text-white">{ref.employee_name || '-'}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ref.parsed_type === 'abhebung' || ref.system_type === 'in'
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-amber-500/20 text-amber-400'
                                                    }`}>
                                                    {ref.parsed_type === 'abhebung' || ref.system_type === 'in' ? 'Einkauf' : 'Verkauf'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-slate-300">
                                                {formatMoney(ref.discord_amount)}
                                            </td>
                                            <td className="p-4 text-right font-mono">
                                                {ref.match_status === 'matched' ? (
                                                    <span className={diff > 1 ? 'text-amber-400' : 'text-white font-medium'}>
                                                        {formatMoney(systemTotal)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {ref.match_status === 'matched' ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Gematcht
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-medium">
                                                        <Clock className="w-4 h-4" />
                                                        Offen
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedRef && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl p-8 shadow-2xl relative my-8">
                        <button
                            onClick={() => setSelectedRef(null)}
                            className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>

                        {/* Header */}
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-6">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                <RefreshCw className="w-7 h-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-3xl font-bold text-white font-mono tracking-wider">
                                        {selectedRef.reference_id}
                                    </h2>
                                    <button
                                        onClick={() => handleCopy(selectedRef.reference_id)}
                                        className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                                    >
                                        {copiedId === selectedRef.reference_id
                                            ? <Check className="w-4 h-4 text-emerald-400" />
                                            : <Copy className="w-4 h-4 text-slate-400" />
                                        }
                                    </button>
                                </div>
                                <div className="text-slate-400 text-sm mt-1">
                                    {formatDate(selectedRef.created_at)} {formatTime(selectedRef.created_at)}
                                    <span className="mx-2">·</span>
                                    {selectedRef.match_status === 'matched' ? (
                                        <span className="text-emerald-400">✓ Gematcht</span>
                                    ) : (
                                        <span className="text-amber-400">⏳ Offen</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Two Column: Discord vs System */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Discord Side */}
                            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
                                <h3 className="text-sm uppercase text-slate-500 font-bold tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                                    Discord Log
                                </h3>
                                <div className="space-y-3">
                                    <DetailRow label="Mitarbeiter" value={selectedRef.employee_name} />
                                    <DetailRow label="Kunde" value={selectedRef.customer_name} />
                                    <DetailRow label="Betrag" value={formatMoney(selectedRef.discord_amount)} highlight />
                                    <DetailRow label="Grund" value={selectedRef.reason} />
                                    <DetailRow label="Typ" value={selectedRef.parsed_type} />
                                    <DetailRow label="Zeitstempel" value={`${formatDate(selectedRef.log_timestamp)} ${formatTime(selectedRef.log_timestamp)}`} />
                                </div>
                            </div>

                            {/* System Side */}
                            <div className={`rounded-xl p-5 border ${selectedRef.match_status === 'matched'
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-slate-800/30 border-slate-700'
                                }`}>
                                <h3 className="text-sm uppercase text-slate-500 font-bold tracking-wider mb-4 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${selectedRef.match_status === 'matched' ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                                    System Buchung
                                </h3>

                                {selectedRef.match_status === 'matched' && (selectedRef.system_products?.length > 0) ? (
                                    <div className="space-y-3">
                                        {selectedRef.system_products.map((p, i) => {
                                            const lineTotal = (p.quantity || 0) * (p.price || 0);
                                            return (
                                                <div key={i} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className="text-sm font-medium text-white">{p.itemName}</span>
                                                        <span className="text-sm text-emerald-400 font-bold">{formatMoney(lineTotal)}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {p.quantity}x à {formatMoney(p.price)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="border-t border-slate-700 pt-3 mt-3">
                                            <DetailRow
                                                label="Gesamtpreis"
                                                value={formatMoney(selectedRef.system_products.reduce((s, p) => s + ((p.quantity || 0) * (p.price || 0)), 0))}
                                                highlight
                                            />
                                        </div>
                                        <DetailRow label="Mitarbeiter" value={selectedRef.system_depositor} />
                                        <DetailRow label="Kategorie" value={
                                            selectedRef.system_category === 'trade' ? 'Handel' :
                                                selectedRef.system_category === 'internal' ? 'Intern' :
                                                    selectedRef.system_category || '-'
                                        } />
                                        <DetailRow label="Zeitstempel" value={`${formatDate(selectedRef.system_timestamp)} ${formatTime(selectedRef.system_timestamp)}`} />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                                        <Clock className="w-10 h-10 mb-3 text-amber-500/50" />
                                        <p className="text-sm font-medium">Noch keine Buchung</p>
                                        <p className="text-xs mt-1">Wird automatisch zugeordnet</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Difference Warning */}
                        {selectedRef.match_status === 'matched' && (() => {
                            const sysTotal = (selectedRef.system_products || []).reduce((s, p) => s + ((p.quantity || 0) * (p.price || 0)), 0);
                            const diff = Math.abs(sysTotal - (selectedRef.discord_amount || 0));
                            if (diff > 1) {
                                return (
                                    <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                        <div className="text-sm">
                                            <span className="text-amber-400 font-medium">Differenz: </span>
                                            <span className="text-slate-300">
                                                Discord {formatMoney(selectedRef.discord_amount)} vs System {formatMoney(sysTotal)}
                                                <span className="text-amber-400 ml-1">(Δ {formatMoney(diff)})</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailRow({ label, value, highlight = false }) {
    return (
        <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
            <span className={`text-sm ${highlight ? 'text-white font-bold' : 'text-slate-300'}`}>
                {value || '-'}
            </span>
        </div>
    );
}
