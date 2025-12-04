import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, Handshake, ArrowRightLeft } from 'lucide-react';

export default function PartnersPage() {
    const [partners, setPartners] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPartner, setCurrentPartner] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        partner_offer: '',
        met_offer: '',
        info: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPartners();
    }, []);

    const fetchPartners = () => {
        fetch('/api/partners')
            .then(res => res.json())
            .then(data => {
                setPartners(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch partners:", err);
                setLoading(false);
            });
    };

    const handleEdit = (partner) => {
        setCurrentPartner(partner);
        setFormData({
            name: partner.name,
            partner_offer: partner.partner_offer,
            met_offer: partner.met_offer,
            info: partner.info
        });
        setIsEditing(true);
    };

    const handleAdd = () => {
        setCurrentPartner(null);
        setFormData({
            name: '',
            partner_offer: '',
            met_offer: '',
            info: ''
        });
        setIsEditing(true);
    };

    const handleDelete = (id) => {
        if (confirm('Wirklich löschen?')) {
            fetch(`/api/partners/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) fetchPartners();
                });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...formData, id: currentPartner?.id };

        fetch('/api/partners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setIsEditing(false);
                    fetchPartners();
                }
            });
    };

    // Colors for cards to make it look nice (cycling through)
    const cardColors = [
        'from-amber-500/20 to-orange-500/20 border-amber-500/30',
        'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
        'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
        'from-violet-500/20 to-purple-500/20 border-violet-500/30',
        'from-rose-500/20 to-pink-500/20 border-rose-500/30',
    ];

    return (
        <div className="animate-fade-in pb-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Handshake className="w-8 h-8 text-violet-400" />
                        Partnerschaften
                    </h1>
                    <p className="text-slate-400 mt-2">Übersicht aller aktiven Partnerschaften und Konditionen.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-violet-500/20"
                >
                    <Plus className="w-5 h-5" />
                    Neuer Partner
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {partners.map((partner, idx) => (
                    <div key={partner.id} className={`relative bg-gradient-to-br ${cardColors[idx % cardColors.length]} border rounded-2xl p-6 backdrop-blur-sm group overflow-hidden`}>
                        {/* Actions Overlay */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                                onClick={() => handleEdit(partner)}
                                className="p-2 bg-slate-900/80 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(partner.id)}
                                className="p-2 bg-slate-900/80 hover:bg-red-900/80 rounded-lg text-slate-300 hover:text-red-200 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-4 text-center border-b border-white/10 pb-2">
                            {partner.name}
                        </h2>

                        <div className="space-y-4">
                            {/* Partner Offer */}
                            <div className="bg-slate-900/40 rounded-xl p-4">
                                <div className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-2">
                                    <ArrowRightLeft className="w-3 h-3" />
                                    Angebot Partner
                                </div>
                                <p className="text-slate-200 whitespace-pre-wrap text-sm font-medium leading-relaxed">
                                    {partner.partner_offer}
                                </p>
                            </div>

                            {/* MET Offer */}
                            <div className="bg-slate-900/40 rounded-xl p-4">
                                <div className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-2">
                                    <ArrowRightLeft className="w-3 h-3 rotate-180" />
                                    Angebot M.E.T
                                </div>
                                <p className="text-slate-200 whitespace-pre-wrap text-sm font-medium leading-relaxed">
                                    {partner.met_offer}
                                </p>
                            </div>

                            {/* Info */}
                            {partner.info && (
                                <div className="text-center text-xs text-amber-400 font-medium bg-amber-900/20 py-2 rounded-lg border border-amber-500/20">
                                    {partner.info}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {partners.length === 0 && (
                <div className="text-center py-20 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
                    Keine Partnerschaften eingetragen.
                </div>
            )}

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
                            {currentPartner ? <Pencil className="w-6 h-6 text-violet-400" /> : <Plus className="w-6 h-6 text-violet-400" />}
                            {currentPartner ? 'Partnerschaft bearbeiten' : 'Neue Partnerschaft'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Partner Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                                    placeholder="z.B. Kebab"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Angebot Partner</label>
                                    <textarea
                                        required
                                        value={formData.partner_offer}
                                        onChange={e => setFormData({ ...formData, partner_offer: e.target.value })}
                                        className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors resize-none"
                                        placeholder="Was bietet der Partner an?&#10;z.B. Gurken 120$"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Angebot M.E.T</label>
                                    <textarea
                                        required
                                        value={formData.met_offer}
                                        onChange={e => setFormData({ ...formData, met_offer: e.target.value })}
                                        className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors resize-none"
                                        placeholder="Was bieten wir an?&#10;z.B. 10% An/Verkauf"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Zusatzinfo (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.info}
                                    onChange={e => setFormData({ ...formData, info: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                                    placeholder="z.B. Gemüse ausgeschlossen"
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
