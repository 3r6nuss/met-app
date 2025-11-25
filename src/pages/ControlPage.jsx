import React, { useState, useEffect } from 'react';
import { Calendar, User, ChevronRight, X } from 'lucide-react';

export default function ControlPage() {
    const [history, setHistory] = useState([]);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/verifications')
            .then(res => res.json())
            .then(data => {
                setHistory(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch history:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-center text-slate-400 mt-12">Lade Historie...</div>;

    return (
        <div className="animate-fade-in pb-24 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-emerald-400">
                <Calendar className="w-6 h-6" />
                Kontroll-Historie
            </h2>

            <div className="space-y-3">
                {history.length === 0 ? (
                    <div className="text-center text-slate-500 py-12 bg-slate-900/50 rounded-xl border border-white/5">
                        Keine Einträge vorhanden.
                    </div>
                ) : (
                    history.map((entry, index) => (
                        <div
                            key={index}
                            onClick={() => setSelectedEntry(entry)}
                            className="bg-slate-800/50 hover:bg-slate-800 border border-white/5 rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-200">{entry.verifier}</div>
                                    <div className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleString()}</div>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                        </div>
                    ))
                )}
            </div>

            {/* Detail Modal */}
            {selectedEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Kontrolle Details</h3>
                            <button onClick={() => setSelectedEntry(null)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="flex justify-between mb-6 bg-slate-800/50 p-4 rounded-lg">
                                <div>
                                    <div className="text-xs text-slate-400 uppercase">Prüfer</div>
                                    <div className="font-bold text-lg">{selectedEntry.verifier}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 uppercase">Zeitpunkt</div>
                                    <div className="font-mono">{new Date(selectedEntry.timestamp).toLocaleString()}</div>
                                </div>
                            </div>

                            <h4 className="font-bold text-slate-400 mb-3 text-sm uppercase">Bestand zum Zeitpunkt der Prüfung</h4>
                            <div className="space-y-1">
                                {selectedEntry.snapshot.map(item => (
                                    <div key={item.id} className="flex justify-between p-2 hover:bg-white/5 rounded border-b border-white/5 last:border-0 text-sm">
                                        <span className="text-slate-300">{item.name}</span>
                                        <span className="font-mono text-slate-400">{item.current.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
