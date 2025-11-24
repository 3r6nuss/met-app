import React, { useState } from 'react';
import { CheckCircle, Edit3, X } from 'lucide-react';

export default function VerificationSection({ onVerify, onToggleEdit, isEditMode }) {
    const [name, setName] = useState('');

    const handleVerify = () => {
        if (!name.trim()) {
            alert("Bitte Namen eingeben!");
            return;
        }
        onVerify(name);
        setName('');
    };

    const handleToggleEdit = () => {
        if (!name.trim() && !isEditMode) {
            alert("Bitte Namen eingeben um zu bearbeiten!");
            return;
        }
        onToggleEdit();
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 z-40">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-full md:w-64">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Dein Name zur Bestätigung..."
                            className="w-full glass-input rounded-lg px-4 py-2"
                        />
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={handleToggleEdit}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${isEditMode
                                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20'
                                : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                            }`}
                    >
                        {isEditMode ? <><CheckCircle className="w-4 h-4" /> Fertig</> : <><Edit3 className="w-4 h-4" /> Liste Anpassen</>}
                    </button>

                    <button
                        onClick={handleVerify}
                        className="flex-1 md:flex-none px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" /> Lagerliste Bestätigen
                    </button>
                </div>

            </div>
        </div>
    );
}
