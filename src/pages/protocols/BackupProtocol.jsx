import React, { useState, useEffect, useMemo } from 'react';
import {
    Database, Calendar, Clock, Download, RefreshCw, CheckCircle,
    AlertTriangle, HardDrive, FileArchive, Trash2, ChevronRight,
    Shield, Activity, Server, Zap
} from 'lucide-react';

const API_URL = '/api';

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const timeSince = (dateStr) => {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return 'gerade eben';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `vor ${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `vor ${days} Tagen`;
};

export default function BackupProtocol({ user }) {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [lastBackup, setLastBackup] = useState(null);
    const [dbStats, setDbStats] = useState(null);

    // Fetch backups
    useEffect(() => {
        fetchBackups();
        fetchDbStats();
    }, []);

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/admin/backups`);
            if (res.ok) {
                const data = await res.json();
                setBackups(data.backups || []);
                if (data.backups && data.backups.length > 0) {
                    setLastBackup(data.backups[0]);
                }
            }
        } catch (err) {
            console.error('Failed to fetch backups:', err);
        }
        setLoading(false);
    };

    const fetchDbStats = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/db-stats`);
            if (res.ok) {
                const data = await res.json();
                setDbStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch DB stats:', err);
        }
    };

    const createBackup = async () => {
        setCreating(true);
        try {
            const res = await fetch(`${API_URL}/admin/backup`, { method: 'POST' });
            if (res.ok) {
                await fetchBackups();
                alert('Backup erfolgreich erstellt!');
            } else {
                alert('Fehler beim Erstellen des Backups');
            }
        } catch (err) {
            alert('Netzwerkfehler');
        }
        setCreating(false);
    };

    const downloadBackup = async (filename) => {
        window.open(`${API_URL}/admin/backup/${filename}`, '_blank');
    };

    const deleteBackup = async (filename) => {
        if (!confirm(`Backup "${filename}" wirklich löschen?`)) return;
        try {
            const res = await fetch(`${API_URL}/admin/backup/${filename}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchBackups();
            } else {
                alert('Fehler beim Löschen');
            }
        } catch (err) {
            alert('Netzwerkfehler');
        }
    };

    // Calculate backup health
    const backupHealth = useMemo(() => {
        if (!lastBackup) return { status: 'critical', message: 'Kein Backup vorhanden!', color: 'red' };

        const hoursSinceBackup = (new Date() - new Date(lastBackup.createdAt)) / (1000 * 60 * 60);

        if (hoursSinceBackup < 24) {
            return { status: 'good', message: 'Backup aktuell', color: 'emerald' };
        } else if (hoursSinceBackup < 72) {
            return { status: 'warning', message: `Letztes Backup: ${timeSince(lastBackup.createdAt)}`, color: 'amber' };
        } else {
            return { status: 'critical', message: `Backup veraltet! (${timeSince(lastBackup.createdAt)})`, color: 'red' };
        }
    }, [lastBackup]);

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
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center gap-3">
                        <Database className="w-8 h-8 text-cyan-400" />
                        Backup-Protokoll
                    </h1>
                    <p className="text-slate-400 mt-1">Datensicherung & Wiederherstellung</p>
                </div>

                <button
                    onClick={createBackup}
                    disabled={creating}
                    className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-xl text-white font-bold transition-colors"
                >
                    {creating ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                        <FileArchive className="w-5 h-5" />
                    )}
                    {creating ? 'Erstelle...' : 'Neues Backup'}
                </button>
            </div>

            {/* BACKUP HEALTH WARNING */}
            {backupHealth.status !== 'good' && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${backupHealth.color === 'red'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">{backupHealth.message}</span>
                    <button
                        onClick={createBackup}
                        className="ml-auto flex items-center gap-1 px-3 py-1 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors"
                    >
                        Jetzt sichern <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-cyan-500/10">
                            <FileArchive className="w-5 h-5 text-cyan-400" />
                        </div>
                        <span className="text-slate-400 text-sm font-medium">Backups</span>
                    </div>
                    <div className="text-2xl font-bold text-cyan-400">{backups.length}</div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-violet-500/10">
                            <Clock className="w-5 h-5 text-violet-400" />
                        </div>
                        <span className="text-slate-400 text-sm font-medium">Letztes Backup</span>
                    </div>
                    <div className="text-lg font-bold text-violet-400">
                        {lastBackup ? timeSince(lastBackup.createdAt) : '-'}
                    </div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-emerald-500/10">
                            <HardDrive className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-slate-400 text-sm font-medium">DB Größe</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">
                        {dbStats ? formatSize(dbStats.size) : '-'}
                    </div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-xl bg-${backupHealth.color}-500/10`}>
                            <Shield className={`w-5 h-5 text-${backupHealth.color}-400`} />
                        </div>
                        <span className="text-slate-400 text-sm font-medium">Status</span>
                    </div>
                    <div className={`text-lg font-bold text-${backupHealth.color}-400 flex items-center gap-2`}>
                        {backupHealth.status === 'good' && <CheckCircle className="w-5 h-5" />}
                        {backupHealth.status === 'warning' && <AlertTriangle className="w-5 h-5" />}
                        {backupHealth.status === 'critical' && <AlertTriangle className="w-5 h-5" />}
                        {backupHealth.status === 'good' ? 'Aktuell' : backupHealth.status === 'warning' ? 'Warnung' : 'Kritisch'}
                    </div>
                </div>
            </div>

            {/* DATABASE STATS */}
            {dbStats && (
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <Server className="w-5 h-5 text-blue-400" />
                        Datenbank-Statistiken
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {dbStats.tables && Object.entries(dbStats.tables).map(([table, count]) => (
                            <div key={table} className="p-4 bg-slate-800/50 rounded-xl">
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{table}</div>
                                <div className="text-xl font-bold text-slate-200">{count}</div>
                                <div className="text-xs text-slate-500">Einträge</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* BACKUP LIST */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl overflow-hidden">
                <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-200 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        Backup-Historie
                    </h3>
                    <button
                        onClick={fetchBackups}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                <div className="divide-y divide-slate-700/30">
                    {backups.map((backup, idx) => (
                        <div key={backup.filename} className="flex items-center gap-4 p-4 hover:bg-slate-800/30 transition-colors">
                            <div className={`p-3 rounded-xl ${idx === 0 ? 'bg-emerald-500/10' : 'bg-slate-700/50'}`}>
                                <FileArchive className={`w-5 h-5 ${idx === 0 ? 'text-emerald-400' : 'text-slate-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-200 flex items-center gap-2">
                                    {backup.filename}
                                    {idx === 0 && (
                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full">
                                            Aktuell
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-slate-500">
                                    {formatDate(backup.createdAt)} • {formatSize(backup.size)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => downloadBackup(backup.filename)}
                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
                                    title="Herunterladen"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => deleteBackup(backup.filename)}
                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                    title="Löschen"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {backups.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            <FileArchive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Keine Backups vorhanden</p>
                            <button
                                onClick={createBackup}
                                className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-medium transition-colors"
                            >
                                Erstes Backup erstellen
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* BACKUP RECOMMENDATIONS */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-6">
                <h4 className="font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Empfehlungen
                </h4>
                <ul className="space-y-2 text-sm text-slate-400">
                    <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        Erstelle täglich ein Backup, besonders vor größeren Änderungen
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        Lade regelmäßig Backups herunter und speichere sie extern
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        Behalte mindestens 3-5 aktuelle Backups
                    </li>
                </ul>
            </div>
        </div>
    );
}
