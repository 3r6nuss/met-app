import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function ReloadModal() {
    const handleReload = () => {
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-violet-500/50 rounded-2xl w-full max-w-md p-8 shadow-2xl relative text-center">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-violet-600/20 rounded-full animate-bounce">
                        <RefreshCw className="w-12 h-12 text-violet-400" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">
                    Update verfügbar!
                </h2>

                <p className="text-slate-300 mb-8 text-lg">
                    Die (es gibt nur einer) Devs haben mal wieder dinge getan Möchtest du diese seite neuladen
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleReload}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-lg shadow-violet-500/20"
                    >
                        Ja
                    </button>
                    <button
                        onClick={handleReload}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-medium transition-all"
                    >
                        trotzdem ja mach das Schöne Grüße vom Dev
                    </button>
                </div>
            </div>
        </div>
    );
}
