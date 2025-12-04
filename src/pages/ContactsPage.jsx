import React, { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, Save, X, Phone, MapPin, Info } from 'lucide-react';

export default function ContactsPage() {
    const [contacts, setContacts] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentContact, setCurrentContact] = useState(null);
    const [formData, setFormData] = useState({
        phone: '',
        name: '',
        second_name: '',
        plz: '',
        info: ''
    });

    const fetchContacts = async () => {
        try {
            const res = await fetch('/api/contacts');
            if (res.ok) {
                const data = await res.json();
                setContacts(data);
            }
        } catch (error) {
            console.error("Failed to fetch contacts", error);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const handleEdit = (contact) => {
        setCurrentContact(contact);
        setFormData({
            phone: contact.phone,
            name: contact.name,
            second_name: contact.second_name,
            plz: contact.plz,
            info: contact.info
        });
        setIsEditing(true);
    };

    const handleAdd = () => {
        setCurrentContact(null);
        setFormData({
            phone: '',
            name: '',
            second_name: '',
            plz: '',
            info: ''
        });
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Kontakt wirklich löschen?')) {
            try {
                const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchContacts();
                }
            } catch (error) {
                console.error("Failed to delete contact", error);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const body = { ...formData, id: currentContact?.id };
            const res = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setIsEditing(false);
                fetchContacts();
            }
        } catch (error) {
            console.error("Failed to save contact", error);
        }
    };

    return (
        <div className="animate-fade-in space-y-6 pb-24">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Users className="w-8 h-8 text-violet-400" />
                    Kontakte
                </h1>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Neuer Kontakt
                </button>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-400 border-b border-slate-700 bg-slate-900/50">
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">Telefon</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">Gruppierungsname</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">Ansprechperson</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">PLZ</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">Info</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 divide-y divide-slate-800">
                            {contacts.map((contact) => (
                                <tr key={contact.id} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="p-4 font-mono text-emerald-400">{contact.phone}</td>
                                    <td className="p-4 font-bold text-white">{contact.name}</td>
                                    <td className="p-4 text-slate-400">{contact.second_name}</td>
                                    <td className="p-4 font-mono text-amber-400">{contact.plz}</td>
                                    <td className="p-4 text-slate-400 max-w-xs truncate" title={contact.info}>{contact.info}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(contact)}
                                                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(contact.id)}
                                                className="p-2 hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {contacts.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">
                                        Keine Kontakte vorhanden.
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
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            {currentContact ? <Pencil className="w-6 h-6 text-violet-400" /> : <Plus className="w-6 h-6 text-violet-400" />}
                            {currentContact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Gruppierungsname</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                                        placeholder="z.B. Firma XYZ"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Ansprechperson</label>
                                    <input
                                        type="text"
                                        value={formData.second_name}
                                        onChange={e => setFormData({ ...formData, second_name: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                                        placeholder="z.B. Max Mustermann"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Telefon
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors font-mono"
                                        placeholder="555-0123"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> PLZ (5-stellig)
                                    </label>
                                    <input
                                        type="text"
                                        maxLength="5"
                                        value={formData.plz}
                                        onChange={e => setFormData({ ...formData, plz: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors font-mono"
                                        placeholder="12345"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1 flex items-center gap-1">
                                    <Info className="w-3 h-3" /> Zusatzinfo
                                </label>
                                <textarea
                                    value={formData.info}
                                    onChange={e => setFormData({ ...formData, info: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors min-h-[100px]"
                                    placeholder="Weitere Informationen..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
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
