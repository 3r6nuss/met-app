import React, { useState } from 'react';
import { CheckCircle, Edit3, User, Sparkles, Save, Pencil } from 'lucide-react';

export default function VerificationSection({ onVerify, onToggleEdit, isEditMode, user, isAuthorized }) {
    const [name, setName] = useState(user?.employeeName || user?.username || '');
    const [isFocused, setIsFocused] = useState(false);

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

    if (!isAuthorized) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 md:p-5 bg-gradient-to-t from-slate-900/95 to-slate-900/80 backdrop-blur-xl border-t border-violet-500/20 z-40">
            {/* Decorative top border gradient */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>

            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Name Input Section */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`
                        relative w-full md:w-72 transition-all duration-300
                        ${isFocused ? 'scale-[1.02]' : ''}
                    `}>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <User className={`w-4 h-4 transition-colors ${isFocused ? 'text-violet-400' : 'text-slate-500'}`} />
                        </div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="Dein Name zur Bestätigung..."
                            className={`
                                w-full py-3 pl-11 pr-4 
                                bg-slate-800/50 border rounded-xl
                                text-slate-200 placeholder-slate-500
                                transition-all duration-300
                                focus:outline-none focus:ring-2 focus:ring-violet-500/50
                                ${isFocused
                                    ? 'border-violet-500/50 bg-slate-800/80 shadow-lg shadow-violet-500/10'
                                    : 'border-slate-700/50 hover:border-slate-600'
                                }
                            `}
                        />
                        {name && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 w-full md:w-auto">
                    {/* Edit Mode Toggle */}
                    <button
                        onClick={handleToggleEdit}
                        className={`
                            group flex-1 md:flex-none px-6 py-3 rounded-xl font-medium 
                            transition-all duration-300 flex items-center justify-center gap-2
                            transform hover:scale-[1.02] active:scale-[0.98]
                            ${isEditMode
                                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50'
                            }
                        `}
                    >
                        {isEditMode ? (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Fertig</span>
                            </>
                        ) : (
                            <>
                                <Pencil className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                <span>Bearbeiten</span>
                            </>
                        )}
                    </button>

                    {/* Verify Button */}
                    <button
                        onClick={handleVerify}
                        disabled={!name.trim()}
                        className={`
                            group flex-1 md:flex-none px-6 py-3 rounded-xl font-bold 
                            transition-all duration-300 flex items-center justify-center gap-2
                            transform hover:scale-[1.02] active:scale-[0.98]
                            ${name.trim()
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                                : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                            }
                        `}
                    >
                        <CheckCircle className={`w-5 h-5 transition-transform ${name.trim() ? 'group-hover:scale-110' : ''}`} />
                        <span>Bestätigen</span>
                    </button>
                </div>
            </div>

            {/* Helper text */}
            {isEditMode && (
                <div className="max-w-7xl mx-auto mt-3">
                    <p className="text-xs text-violet-400/70 flex items-center gap-2">
                        <Edit3 className="w-3 h-3" />
                        Bearbeitungsmodus aktiv — Klicke auf "Fertig" um zu speichern
                    </p>
                </div>
            )}
        </div>
    );
}
