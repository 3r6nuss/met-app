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
                    Computer sagt: Lad neu.
                </h2>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleReload}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-lg shadow-violet-500/20"
                    >
                        ok
                    </button>
                    <button
                        onClick={handleReload}
                        className="w-full py-3 bg-black hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl font-medium transition-all border border-slate-700"
                    >
                        ok nur in schwarz
                    </button>
                </div>
            </div>
        </div>
    );
}
