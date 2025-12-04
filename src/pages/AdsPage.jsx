import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, Megaphone, FileText } from 'lucide-react';

export default function AdsPage() {
    const [ads, setAds] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentAd, setCurrentAd] = useState(null);
    const [formData, setFormData] = useState({
        content: '',
        description: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = () => {
        fetch('/api/ads')
            .then(res => res.json())
            .then(data => {
                setAds(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch ads:", err);
                setLoading(false);
            });
    };

    const handleEdit = (ad) => {
        setCurrentAd(ad);
        setFormData({
            content: ad.content,
            description: ad.description
        });
        setIsEditing(true);
    };

    const handleAdd = () => {
        setCurrentAd(null);
        setFormData({
            content: '',
            description: ''
        });
        setIsEditing(true);
    };

    const handleDelete = (id) => {
        if (confirm('Wirklich löschen?')) {
            fetch(`/api/ads/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) fetchAds();
                });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...formData, id: currentAd?.id };

        fetch('/api/ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setIsEditing(false);
                    fetchAds();
                }
            });
    };

    return (
        <div className="animate-fade-in pb-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-violet-400" />
                        Werbung
                    </h1>
                    <p className="text-slate-400 mt-2">Verwalten Sie hier Ihre Werbeanzeigen.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-violet-500/20"
                >
                    <Plus className="w-5 h-5" />
                    Neue Anzeige
                </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-400 border-b border-slate-700 bg-slate-900/50">
                                <th className="p-4 font-medium uppercase text-xs tracking-wider w-1/4">Beschreibung</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider w-1/2">Werbeanzeige</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 divide-y divide-slate-800">
                            {ads.map((ad) => (
                                <tr key={ad.id} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="p-4 font-bold text-white align-top">{ad.description}</td>
                                    <td className="p-4 text-slate-300 whitespace-pre-wrap font-mono text-sm align-top">{ad.content}</td>
                                    <td className="p-4 text-right align-top">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(ad)}
                                                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ad.id)}
                                                className="p-2 hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {ads.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-slate-500">
                                        Keine Werbeanzeigen vorhanden.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit/Add Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            {currentAd ? <Pencil className="w-6 h-6 text-violet-400" /> : <Plus className="w-6 h-6 text-violet-400" />}
                            {currentAd ? 'Anzeige bearbeiten' : 'Neue Anzeige'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Beschreibung (Titel/Kontext)</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                                    placeholder="z.B. Dienstbeginn"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Werbeanzeige (Text)</label>
                                <textarea
                                    required
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full h-48 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors font-mono text-sm resize-none"
                                    placeholder="Hier den Text der Werbeanzeige einfügen..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Speichern
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
