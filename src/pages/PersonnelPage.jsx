import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, User, Truck, FileText, AlertTriangle, Car } from 'lucide-react';

export default function PersonnelPage() {
    const [personnel, setPersonnel] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isDetailView, setIsDetailView] = useState(false);
    const [currentPerson, setCurrentPerson] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        truck_license: false,
        contract: '',
        license_plate: '',
        second_job: ''
    });
    const [violationData, setViolationData] = useState({
        date: new Date().toISOString().split('T')[0],
        violation: '',
        remark: '',
        percentage: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPersonnel();
    }, []);

    const fetchPersonnel = () => {
        fetch('/api/personnel')
            .then(res => res.json())
            .then(data => {
                setPersonnel(data);
                setLoading(false);
                // Update current person if detail view is open
                if (currentPerson) {
                    const updated = data.find(p => p.id === currentPerson.id);
                    if (updated) setCurrentPerson(updated);
                }
            })
            .catch(err => {
                console.error("Failed to fetch personnel:", err);
                setLoading(false);
            });
    };

    const handleAdd = () => {
        setCurrentPerson(null);
        setFormData({
            name: '',
            phone: '',
            truck_license: false,
            contract: '',
            license_plate: '',
            second_job: ''
        });
        setIsEditing(true);
    };

    const handleEdit = (e, person) => {
        e.stopPropagation(); // Prevent opening detail view
        setCurrentPerson(person);
        setFormData({
            name: person.name,
            phone: person.phone,
            truck_license: person.truck_license === 1,
            contract: person.contract,
            license_plate: person.license_plate,
            second_job: person.second_job || ''
        });
        setIsEditing(true);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (confirm('Wirklich löschen?')) {
            fetch(`/api/personnel/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) fetchPersonnel();
                });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...formData, id: currentPerson?.id };

        fetch('/api/personnel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setIsEditing(false);
                    fetchPersonnel();
                }
            });
    };

    const handleRowClick = (person) => {
        setCurrentPerson(person);
        setIsDetailView(true);
    };

    const handleAddViolation = (e) => {
        e.preventDefault();
        if (!currentPerson) return;

        fetch('/api/violations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...violationData, personnel_id: currentPerson.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setViolationData({
                        date: new Date().toISOString().split('T')[0],
                        violation: '',
                        remark: '',
                        percentage: 0
                    });
                    fetchPersonnel();
                }
            });
    };

    const handleDeleteViolation = (id) => {
        if (confirm('Verstoß löschen?')) {
            fetch(`/api/violations/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) fetchPersonnel();
                });
        }
    };

    const calculateTotalWarning = (violations) => {
        if (!violations) return 0;
        return violations.reduce((sum, v) => sum + v.percentage, 0);
    };

    return (
        <div className="animate-fade-in pb-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <User className="w-8 h-8 text-violet-400" />
                        Personalliste
                    </h1>
                    <p className="text-slate-400 mt-2">Verwaltung der Mitarbeiterdaten und Verstöße.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-violet-500/20"
                >
                    <Plus className="w-5 h-5" />
                    Mitarbeiter hinzufügen
                </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-400 border-b border-slate-700 bg-slate-900/50">
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">Name</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">Telefon</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider text-center">LKW Schein</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">Arbeitsvertrag</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider">Kennzeichen</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-wider text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 divide-y divide-slate-800">
                            {personnel.map((person) => (
                                <tr
                                    key={person.id}
                                    onClick={() => handleRowClick(person)}
                                    className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                                >
                                    <td className="p-4 font-bold text-white">{person.name}</td>
                                    <td className="p-4 font-mono text-emerald-400">{person.phone}</td>
                                    <td className="p-4 text-center">
                                        {person.truck_license === 1 ? (
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400">
                                                <Truck className="w-4 h-4" />
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-slate-500">
                                                <X className="w-4 h-4" />
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-slate-400">{person.contract}</td>
                                    <td className="p-4 font-mono text-amber-400">{person.license_plate}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleEdit(e, person)}
                                                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, person.id)}
                                                className="p-2 hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {personnel.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">
                                        Keine Mitarbeiter vorhanden.
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
                            {currentPerson ? <Pencil className="w-6 h-6 text-violet-400" /> : <Plus className="w-6 h-6 text-violet-400" />}
                            {currentPerson ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Telefon</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Kennzeichen</label>
                                    <input
                                        type="text"
                                        value={formData.license_plate}
                                        onChange={e => setFormData({ ...formData, license_plate: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Arbeitsvertrag</label>
                                <input
                                    type="text"
                                    value={formData.contract}
                                    onChange={e => setFormData({ ...formData, contract: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                                    placeholder="Ja oder Nein"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">2. Job</label>
                                <input
                                    type="text"
                                    value={formData.second_job}
                                    onChange={e => setFormData({ ...formData, second_job: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <input
                                    type="checkbox"
                                    id="truck_license"
                                    checked={formData.truck_license}
                                    onChange={e => setFormData({ ...formData, truck_license: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-600 text-violet-600 focus:ring-violet-500 bg-slate-700"
                                />
                                <label htmlFor="truck_license" className="text-sm font-medium text-white flex items-center gap-2">
                                    <Truck className="w-4 h-4" />
                                    LKW Schein vorhanden
                                </label>
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

            {/* Detail View Modal */}
            {isDetailView && currentPerson && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl p-8 shadow-2xl relative my-8">
                        <button
                            onClick={() => setIsDetailView(false)}
                            className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>

                        <div className="flex flex-col md:flex-row gap-8 mb-8 border-b border-slate-800 pb-8">
                            <div className="flex-1">
                                <h2 className="text-4xl font-bold text-white mb-2">{currentPerson.name}</h2>
                                <div className="flex flex-wrap gap-4 text-slate-400">
                                    <span className="flex items-center gap-1"><User className="w-4 h-4" /> {currentPerson.contract}</span>
                                    <span className="flex items-center gap-1"><Car className="w-4 h-4" /> {currentPerson.license_plate}</span>
                                    {currentPerson.truck_license === 1 && <span className="flex items-center gap-1 text-emerald-400"><Truck className="w-4 h-4" /> LKW Schein</span>}
                                </div>
                                {currentPerson.second_job && (
                                    <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700 inline-block">
                                        <span className="text-xs uppercase text-slate-500 font-bold block mb-1">2. Job</span>
                                        <span className="text-white">{currentPerson.second_job}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col items-center justify-center p-6 bg-slate-800/30 rounded-2xl border border-slate-700">
                                <span className="text-sm uppercase text-slate-500 font-bold mb-2">Verwarnung Gesamt</span>
                                <div className={`text-5xl font-black ${calculateTotalWarning(currentPerson.violations) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {calculateTotalWarning(currentPerson.violations)}%
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Violations List */}
                            <div className="lg:col-span-2">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                                    Verstöße & Verwarnungen
                                </h3>
                                <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase">
                                            <tr>
                                                <th className="p-3">Datum</th>
                                                <th className="p-3">Verstoß</th>
                                                <th className="p-3">Bemerkung</th>
                                                <th className="p-3 text-right">Prozente</th>
                                                <th className="p-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {currentPerson.violations && currentPerson.violations.map(v => (
                                                <tr key={v.id} className="hover:bg-slate-800/50">
                                                    <td className="p-3 text-slate-400 font-mono text-sm">{new Date(v.date).toLocaleDateString()}</td>
                                                    <td className="p-3 text-white font-medium">{v.violation}</td>
                                                    <td className="p-3 text-slate-400 text-sm">{v.remark}</td>
                                                    <td className="p-3 text-right font-bold text-red-400">{v.percentage}%</td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            onClick={() => handleDeleteViolation(v.id)}
                                                            className="text-slate-600 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!currentPerson.violations || currentPerson.violations.length === 0) && (
                                                <tr>
                                                    <td colSpan="5" className="p-8 text-center text-slate-500 italic">
                                                        Keine Verstöße eingetragen.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Add Violation Form */}
                            <div>
                                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 sticky top-6">
                                    <h3 className="text-lg font-bold text-white mb-4">Verstoß hinzufügen</h3>
                                    <form onSubmit={handleAddViolation} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Datum</label>
                                            <input
                                                type="date"
                                                required
                                                value={violationData.date}
                                                onChange={e => setViolationData({ ...violationData, date: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Verstoß</label>
                                            <input
                                                type="text"
                                                required
                                                value={violationData.violation}
                                                onChange={e => setViolationData({ ...violationData, violation: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                                placeholder="Art des Verstoßes"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Bemerkung</label>
                                            <textarea
                                                value={violationData.remark}
                                                onChange={e => setViolationData({ ...violationData, remark: e.target.value })}
                                                className="w-full h-20 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 resize-none"
                                                placeholder="Details..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Prozente</label>
                                            <input
                                                type="number"
                                                required
                                                value={violationData.percentage}
                                                onChange={e => setViolationData({ ...violationData, percentage: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                            Eintragen
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
