import React, { useRef, useState } from 'react';
import { Save, AlertCircle, Trash2 } from 'lucide-react';
import { getBookingDraft, useBookingDraft } from '../hooks/useBookingDraft.jsx';

export default function SpecialBookingPage({ employees, onAction, user }) {
    const [initialDraft] = useState(() => getBookingDraft('sonderbuchung', user?.discordId || user?.id));
    const [selectedEmployee, setSelectedEmployee] = useState(() => initialDraft?.selectedEmployee || '');
    const [reason, setReason] = useState(() => initialDraft?.reason || '');
    const [amount, setAmount] = useState(() => initialDraft?.amount || '');
    const [error, setError] = useState('');
    const formRef = useRef(null);

    const clearForm = () => {
        setSelectedEmployee('');
        setReason('');
        setAmount('');
        setError('');
    };
    const draft = { selectedEmployee, reason, amount };
    const hasChanges = Boolean(selectedEmployee || reason || amount);
    const { discardDraft, prompt: unsavedChangesPrompt } = useBookingDraft({
        scope: 'sonderbuchung',
        userId: user?.discordId || user?.id,
        draft,
        hasChanges,
        onClear: clearForm,
        formRef
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!selectedEmployee) {
            setError('Bitte einen Mitarbeiter auswählen.');
            return;
        }
        if (!reason.trim()) {
            setError('Bitte einen Grund oder Produktnamen angeben.');
            return;
        }
        if (!amount || isNaN(amount)) {
            setError('Bitte einen gültigen Betrag eingeben.');
            return;
        }

        // Call the action handler passed from App.jsx
        // We pass: id=null, quantity=1, depositor=selectedEmployee, price=amount, date=null
        // The App.jsx handler will need to be adapted or we call fetch directly here.
        // Let's assume we pass a special handler or use the existing one with modifications.
        // Actually, looking at App.jsx, onAction expects (id, qty, dep, price, date).
        // We should probably handle the fetch here or create a specific handler in App.jsx.
        // For consistency with other pages, let's try to use a prop 'onSubmit' that handles the API call.

        if (onAction) {
            onAction({
                employee: selectedEmployee,
                reason: reason,
                amount: parseFloat(amount)
            });
            discardDraft();
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-2xl font-bold text-slate-200 mb-6 flex items-center gap-2">
                    <Save className="w-6 h-6 text-violet-400" />
                    Sonderbuchung
                </h2>

                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                    {/* Employee Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Mitarbeiter</label>
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                        >
                            <option value="">Bitte wählen...</option>
                            {employees.map((emp, idx) => (
                                <option key={idx} value={emp.name || emp}>{emp.name || emp}</option>
                            ))}
                        </select>
                    </div>

                    {/* Reason / Product Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Grund / Produkt</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="z.B. Bonus, Sonderzahlung, Korrektur"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                        />
                    </div>

                    {/* Amount / Price */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Betrag (€)</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all pl-8"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
                        </div>
                        <p className="text-xs text-slate-500">
                            Positiver Betrag = Lohn (Gutschrift)<br />
                            Negativer Betrag = Abzug
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98]"
                    >
                        Buchen
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm('Alle Angaben und den gespeicherten Entwurf löschen?')) discardDraft();
                        }}
                        className="w-full rounded-xl border border-red-500/40 px-4 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
                    >
                        <Trash2 className="mr-2 inline h-4 w-4" />
                        Alles löschen
                    </button>
                </form>
            </div>
            {unsavedChangesPrompt}
        </div>
    );
}
