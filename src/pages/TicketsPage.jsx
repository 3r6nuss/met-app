import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Ticket,
    ArrowLeft,
    RefreshCw,
    MessageSquare,
    Lock,
    User,
    Bot,
    Paperclip,
    Settings,
    Save,
    Shield,
    Check
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { isAdmin } from '../utils/permissions';

const CATEGORY_LABELS = {
    bewerbungen: 'Bewerbungen',
    bestellungen: 'Bestellungen',
    support: 'Support',
    ankauf: 'Ankauf',
    sonstiges: 'Sonstiges'
};

const STATUS_META = {
    open: { label: 'Offen', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    closed: { label: 'Geschlossen', className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' }
};

function categoryLabel(value) {
    return CATEGORY_LABELS[value] || value || 'Sonstiges';
}

function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

function avatarUrl(userId, avatar) {
    if (userId && avatar) {
        return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
    }
    return null;
}

export default function TicketsPage() {
    const { id } = useParams();
    return id ? <TicketDetail ticketId={id} /> : <TicketList />;
}

// ─── Ticket-Liste ────────────────────────────────────────
function TicketList() {
    const navigate = useNavigate();
    const { user } = useAppState();
    const userIsAdmin = isAdmin(user);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [showSettings, setShowSettings] = useState(false);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/tickets', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets || []);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Tickets:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    const filtered = tickets.filter(t => filter === 'all' || t.status === filter);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-violet-500/15 text-violet-400">
                        <Ticket className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Support-Tickets</h1>
                        <p className="text-slate-400 text-sm">Tickets & Transkripte aus dem Discord</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {userIsAdmin && (
                        <button
                            onClick={() => setShowSettings(s => !s)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                                showSettings ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                        >
                            <Settings className="w-4 h-4" />
                            Einstellungen
                        </button>
                    )}
                    <button
                        onClick={fetchTickets}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Aktualisieren
                    </button>
                </div>
            </div>

            {showSettings && userIsAdmin && <TicketSettings />}

            <div className="flex gap-2">
                {['all', 'open', 'closed'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            filter === f ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'bg-slate-800/60 text-slate-400 hover:text-white'
                        }`}
                    >
                        {f === 'all' ? 'Alle' : STATUS_META[f]?.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center text-slate-500 py-12">Lade Tickets …</div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center text-slate-500">
                    <Ticket className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    Keine Tickets vorhanden.
                </div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map(t => {
                        const status = STATUS_META[t.status] || STATUS_META.open;
                        return (
                            <button
                                key={t.id}
                                onClick={() => navigate(`/tickets/${t.id}`)}
                                className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 text-left hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="text-slate-500 font-mono text-sm shrink-0">
                                        #{String(t.ticket_number ?? t.id).padStart(4, '0')}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-white truncate">{categoryLabel(t.category)}</div>
                                        <div className="text-sm text-slate-400 truncate">
                                            von {t.opener_name} • {formatDate(t.created_at)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="flex items-center gap-1 text-xs text-slate-500">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        {t.message_count ?? 0}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${status.className}`}>
                                        {status.label}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Ticket-Transkript ───────────────────────────────────
function TicketDetail({ ticketId }) {
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/tickets/${ticketId}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Ticket nicht gefunden');
                const data = await res.json();
                if (active) {
                    setTicket(data.ticket);
                    setMessages(data.messages || []);
                }
            } catch (err) {
                if (active) setError(err.message);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [ticketId]);

    if (loading) return <div className="text-center text-slate-500 py-12">Lade Transkript …</div>;
    if (error || !ticket) {
        return (
            <div className="space-y-4">
                <button onClick={() => navigate('/tickets')} className="flex items-center gap-2 text-slate-400 hover:text-white">
                    <ArrowLeft className="w-4 h-4" /> Zurück
                </button>
                <div className="glass-panel rounded-2xl p-12 text-center text-red-400">{error || 'Ticket nicht gefunden'}</div>
            </div>
        );
    }

    const status = STATUS_META[ticket.status] || STATUS_META.open;

    return (
        <div className="space-y-6">
            <button onClick={() => navigate('/tickets')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Zurück zur Übersicht
            </button>

            <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-white">
                                Ticket #{String(ticket.ticket_number ?? ticket.id).padStart(4, '0')}
                            </h1>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${status.className}`}>
                                {status.label}
                            </span>
                        </div>
                        <p className="text-slate-400">{categoryLabel(ticket.category)}</p>
                    </div>
                    <div className="text-sm text-slate-400 space-y-1 text-right">
                        <div>Erstellt von <span className="text-slate-200">{ticket.opener_name}</span></div>
                        <div>{formatDate(ticket.created_at)}</div>
                        {ticket.claimed_by_name && <div>Übernommen von <span className="text-slate-200">{ticket.claimed_by_name}</span></div>}
                        {ticket.status === 'closed' && (
                            <div className="flex items-center gap-1 justify-end text-slate-500">
                                <Lock className="w-3.5 h-3.5" />
                                Geschlossen von {ticket.closed_by_name || '—'} • {formatDate(ticket.closed_at)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 md:p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Transkript</h2>
                {messages.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">Keine Nachrichten archiviert.</div>
                ) : (
                    <div className="space-y-4">
                        {messages.map(m => {
                            const url = avatarUrl(m.author_id, m.author_avatar);
                            return (
                                <div key={m.id} className="flex gap-3">
                                    <div className="shrink-0">
                                        {url ? (
                                            <img src={url} alt={m.author_name} className="w-9 h-9 rounded-full border border-slate-700" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                                                {m.is_bot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white text-sm">{m.author_name}</span>
                                            {m.is_bot && <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] font-semibold">BOT</span>}
                                            <span className="text-xs text-slate-500">{formatDate(m.created_at)}</span>
                                        </div>
                                        {m.content && (
                                            <div className="text-slate-300 text-sm whitespace-pre-wrap break-words mt-0.5">{m.content}</div>
                                        )}
                                        {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {m.attachments.map((a, i) => (
                                                    <a
                                                        key={i}
                                                        href={a.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                                                    >
                                                        <Paperclip className="w-3 h-3" />
                                                        {a.name || 'Anhang'}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Einstellungen: Rollen pro Kategorie ─────────────────
function TicketSettings() {
    const [roles, setRoles] = useState([]);
    const [parents, setParents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [settings, setSettings] = useState({ panel_title: '', panel_description: '', welcome_title: '', welcome_message: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const [rolesRes, catsRes, settingsRes] = await Promise.all([
                    fetch('/api/tickets/config/roles', { credentials: 'include' }),
                    fetch('/api/tickets/config/categories', { credentials: 'include' }),
                    fetch('/api/tickets/config/settings', { credentials: 'include' })
                ]);
                if (active && rolesRes.ok) {
                    const data = await rolesRes.json();
                    setRoles(data.roles || []);
                    setParents(data.parents || []);
                }
                if (active && catsRes.ok) setCategories((await catsRes.json()).categories || []);
                if (active && settingsRes.ok) {
                    const s = (await settingsRes.json()).settings || {};
                    setSettings({
                        panel_title: s.panel_title || '',
                        panel_description: s.panel_description || '',
                        welcome_title: s.welcome_title || '',
                        welcome_message: s.welcome_message || ''
                    });
                }
            } catch (err) {
                if (active) setError(err.message);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    const toggleRole = (catValue, roleId) => {
        setSaved(false);
        setCategories(prev => prev.map(c => {
            if (c.value !== catValue) return c;
            const has = c.role_ids.includes(roleId);
            return { ...c, role_ids: has ? c.role_ids.filter(r => r !== roleId) : [...c.role_ids, roleId] };
        }));
    };

    const setParent = (catValue, parentId) => {
        setSaved(false);
        setCategories(prev => prev.map(c => c.value === catValue ? { ...c, discord_parent_id: parentId || null } : c));
    };

    const updateSetting = (key, value) => {
        setSaved(false);
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const [catRes, setRes] = await Promise.all([
                fetch('/api/tickets/config/categories', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        categories: categories.map(c => ({
                            value: c.value,
                            role_ids: c.role_ids,
                            discord_parent_id: c.discord_parent_id || null
                        }))
                    })
                }),
                fetch('/api/tickets/config/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(settings)
                })
            ]);
            if (!catRes.ok || !setRes.ok) {
                const data = await (catRes.ok ? setRes : catRes).json().catch(() => ({}));
                throw new Error(data.error || 'Speichern fehlgeschlagen');
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const inputClass = 'w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500';

    return (
        <div className="glass-panel rounded-2xl p-5 md:p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-violet-400" />
                        Ticket-Einstellungen
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Rollen &amp; Discord-Kategorie pro Ticket-Typ sowie die Embed-Texte anpassen.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
                >
                    {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? 'Gespeichert' : saving ? 'Speichere …' : 'Speichern'}
                </button>
            </div>

            {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}

            {loading ? (
                <div className="text-slate-500 py-6 text-center">Lade Konfiguration …</div>
            ) : (
                <>
                    {/* Embed-Texte */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Embed-Texte</h3>
                        <p className="text-xs text-slate-500">
                            Platzhalter im Willkommens-Text: <code className="text-violet-300">{'{user}'}</code> (Ersteller),{' '}
                            <code className="text-violet-300">{'{category}'}</code> (Kategorie),{' '}
                            <code className="text-violet-300">{'{ticket}'}</code> (Ticket-Nr.)
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-3">
                                <div className="text-xs font-medium text-slate-400">Panel (Auswahl-Nachricht)</div>
                                <input
                                    className={inputClass}
                                    placeholder="Panel-Titel"
                                    value={settings.panel_title}
                                    onChange={e => updateSetting('panel_title', e.target.value)}
                                />
                                <textarea
                                    className={`${inputClass} min-h-[120px] resize-y`}
                                    placeholder="Panel-Beschreibung"
                                    value={settings.panel_description}
                                    onChange={e => updateSetting('panel_description', e.target.value)}
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="text-xs font-medium text-slate-400">Willkommens-Nachricht (im Ticket)</div>
                                <input
                                    className={inputClass}
                                    placeholder="Willkommens-Titel"
                                    value={settings.welcome_title}
                                    onChange={e => updateSetting('welcome_title', e.target.value)}
                                />
                                <textarea
                                    className={`${inputClass} min-h-[120px] resize-y`}
                                    placeholder="Willkommens-Text"
                                    value={settings.welcome_message}
                                    onChange={e => updateSetting('welcome_message', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Kategorien */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Kategorien</h3>
                        {roles.length === 0 && (
                            <div className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                                Keine Server-Rollen/Kategorien gefunden. Läuft der Bot und ist er auf dem Server? (Ggf. DISCORD_GUILD_ID setzen.)
                            </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                            {categories.map(cat => (
                                <div key={cat.value} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-3">
                                    <div className="font-semibold text-white flex items-center gap-2">
                                        {cat.emoji && <span>{cat.emoji}</span>}
                                        {cat.label}
                                    </div>

                                    <div>
                                        <div className="text-xs text-slate-500 mb-1">Discord-Kategorie (Channel wird hier erstellt)</div>
                                        <select
                                            className={inputClass}
                                            value={cat.discord_parent_id || ''}
                                            onChange={e => setParent(cat.value, e.target.value)}
                                        >
                                            <option value="">— Standard / keine —</option>
                                            {parents.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <div className="text-xs text-slate-500 mb-1">Sichtbar für Rollen</div>
                                        <div className="flex flex-wrap gap-2">
                                            {roles.map(role => {
                                                const active = cat.role_ids.includes(role.id);
                                                const color = role.color && role.color !== '#000000' ? role.color : '#94a3b8';
                                                return (
                                                    <button
                                                        key={role.id}
                                                        onClick={() => toggleRole(cat.value, role.id)}
                                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                                            active
                                                                ? 'bg-violet-500/20 text-white border-violet-500/50'
                                                                : 'bg-slate-800/60 text-slate-400 border-transparent hover:text-white'
                                                        }`}
                                                    >
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                                        {role.name}
                                                        {active && <Check className="w-3 h-3" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
