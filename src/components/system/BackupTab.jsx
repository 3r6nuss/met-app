import React, { useState } from 'react';
import { Save, RefreshCw, Trash2, FileText, Users } from 'lucide-react';

/**
 * Backup Management Tab Component
 * Extracted from SystemPage for better maintainability
 */
export default function BackupTab({ onReset }) {
    const [backups, setBackups] = useState([]);
    const [loadingBackups, setLoadingBackups] = useState(false);

    // Fetch backups - called when tab becomes active
    const fetchBackups = React.useCallback(() => {
        setLoadingBackups(true);
        fetch('/api/backups')
            .then(res => res.json())
            .then(data => {
                setBackups(data);
                setLoadingBackups(false);
            })
            .catch(err => {
                console.error("Failed to fetch backups:", err);
                setLoadingBackups(false);
            });
    }, []);

    // Load backups on mount
    React.useEffect(() => {
        fetchBackups();
    }, [fetchBackups]);

    const handleBackup = () => {
        fetch('/api/backup', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert("Backup erfolgreich erstellt!");
                    fetchBackups();
                }
                else alert("Backup fehlgeschlagen: " + (data.error || "Unbekannter Fehler"));
            })
            .catch(err => alert("Netzwerkfehler: " + err));
    };

    const handleRestoreBackup = (filename) => {
        if (window.confirm(`WARNUNG: Möchtest du wirklich das Backup "${filename}" wiederherstellen? \n\nALLE aktuellen Daten gehen verloren und werden durch das Backup ersetzt!`)) {
            fetch('/api/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert("Wiederherstellung erfolgreich! Die Seite wird neu geladen.");
                        window.location.reload();
                    } else {
                        alert("Fehler bei Wiederherstellung: " + (data.error || "Unbekannter Fehler"));
                    }
                })
                .catch(err => alert("Netzwerkfehler: " + err));
        }
    };

    const handleDeleteBackup = (filename) => {
        if (window.confirm(`Backup "${filename}" wirklich löschen?`)) {
            fetch(`/api/backups/${filename}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) fetchBackups();
                    else alert("Fehler beim Löschen: " + (data.error || "Unbekannter Fehler"));
                })
                .catch(err => alert("Netzwerkfehler: " + err));
        }
    };

    const handleResetDatabase = () => {
        if (window.confirm("ACHTUNG: Dies löscht die GESAMTE Datenbank! Wirklich fortfahren?")) {
            onReset();
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-300 mb-4">Datenbank & Backup</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <button
                        onClick={handleBackup}
                        className="flex items-center justify-center gap-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/50 p-6 rounded-xl transition-all group"
                    >
                        <Save className="w-8 h-8 group-hover:scale-110 transition-transform" />
                        <div className="text-left">
                            <div className="font-bold">Backup erstellen</div>
                            <div className="text-xs opacity-70">Sichert die aktuelle Datenbank</div>
                        </div>
                    </button>

                    <button
                        onClick={handleResetDatabase}
                        className="flex items-center justify-center gap-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 p-6 rounded-xl transition-all group"
                    >
                        <RefreshCw className="w-8 h-8 group-hover:rotate-180 transition-transform duration-500" />
                        <div className="text-left">
                            <div className="font-bold">System Reset</div>
                            <div className="text-xs opacity-70">Löscht ALLE Daten (Vorsicht!)</div>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            if (window.confirm("Möchtest du wirklich die Standard-Personalliste laden? Dies überschreibt aktuelle Daten!")) {
                                fetch('/api/system/seed-personnel', { method: 'POST' })
                                    .then(res => res.json())
                                    .then(data => {
                                        if (data.success) alert(`Erfolgreich geladen! ${data.count} Mitarbeiter hinzugefügt.`);
                                        else alert("Fehler: " + data.error);
                                    });
                            }
                        }}
                        className="flex items-center justify-center gap-3 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 text-fuchsia-400 border border-fuchsia-600/50 p-6 rounded-xl transition-all group"
                    >
                        <Users className="w-8 h-8 group-hover:scale-110 transition-transform" />
                        <div className="text-left">
                            <div className="font-bold">Standard Personal laden</div>
                            <div className="text-xs opacity-70">Lädt die Standardliste neu</div>
                        </div>
                    </button>
                </div>

                <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    Verfügbare Backups
                </h3>

                {loadingBackups ? (
                    <div className="text-slate-500 italic">Lade Backups...</div>
                ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {backups.map((backup) => (
                            <div key={backup.name} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 flex justify-between items-center hover:bg-slate-800/50 transition-colors">
                                <div className="flex-1">
                                    <div className="font-medium text-slate-200">{backup.name}</div>
                                    <div className="text-xs text-slate-500">
                                        {backup.size && `${(backup.size / 1024).toFixed(1)} KB`}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRestoreBackup(backup.name)}
                                        className="p-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                        title="Wiederherstellen"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBackup(backup.name)}
                                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                        title="Löschen"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {backups.length === 0 && (
                            <div className="text-center text-slate-500 py-4">Keine Backups gefunden.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
