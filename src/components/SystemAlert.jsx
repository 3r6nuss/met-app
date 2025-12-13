import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function SystemAlert() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-red-500/50 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden relative animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-red-400">
                        <AlertTriangle className="w-6 h-6 animate-pulse" />
                        <h2 className="text-xl font-bold uppercase tracking-wider">System-Warnung</h2>
                    </div>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col items-center text-center gap-6">
                    <div className="space-y-2">
                        <p className="text-2xl font-bold text-slate-200">
                            Es kann aktuell zu Problemen kommen!
                        </p>
                        <p className="text-lg text-red-300 font-medium">
                            Der Techniker ist bereits alarmiert.
                        </p>
                    </div>

                    <div className="relative rounded-lg overflow-hidden border border-slate-700 shadow-lg">
                        <img
                            src="/technician_alert.png"
                            alt="Techniker arbeiten daran"
                            className="max-h-[400px] w-auto object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                        <div className="absolute bottom-2 right-2 text-xs text-slate-400 italic">
                            Status: 404 Sleep Not Found
                        </div>
                    </div>

                    <button
                        onClick={() => setIsVisible(false)}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-600 transition-colors uppercase text-sm font-bold tracking-wider"
                    >
                        Verstanden
                    </button>
                </div>
            </div>
        </div>
    );
}
