import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, Sparkles, Monitor } from 'lucide-react';

export default function ReloadModal() {
    const [countdown, setCountdown] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const handleReload = () => {
        setShowConfetti(true);
        setCountdown(3);
    };

    useEffect(() => {
        if (countdown === null) return;
        if (countdown === 0) {
            window.location.reload();
            return;
        }
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const funnyMessages = [
        "Computer sagt: Lad neu.",
        "Neue Daten verfügbar!",
        "Zeit für ein Refresh!",
        "Updates warten auf dich!"
    ];

    const [message] = useState(funnyMessages[Math.floor(Math.random() * funnyMessages.length)]);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in">
            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-32 h-32 bg-violet-500/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse delay-300"></div>
            </div>

            <div className="relative bg-gradient-to-b from-slate-900 to-slate-900/95 border border-violet-500/50 rounded-3xl w-full max-w-md p-10 shadow-2xl text-center overflow-hidden">
                {/* Shine border effect */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden">
                    <div className="absolute inset-[-100%] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent rotate-45 animate-shine"></div>
                </div>

                {/* Icon */}
                <div className="relative flex justify-center mb-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-violet-500/30 rounded-full blur-xl animate-pulse"></div>
                        <div className="relative p-5 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl shadow-lg shadow-violet-500/50">
                            {countdown !== null ? (
                                <span className="text-4xl font-black text-white">{countdown}</span>
                            ) : (
                                <RefreshCw className="w-10 h-10 text-white animate-spin-slow" />
                            )}
                        </div>
                        {/* Orbiting sparkle */}
                        <div className="absolute -top-1 -right-1 animate-bounce">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                        </div>
                    </div>
                </div>

                {/* Message */}
                <h2 className="relative text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 mb-3">
                    {message}
                </h2>

                <p className="relative text-slate-400 text-sm mb-8 flex items-center justify-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Neue Daten sind verfügbar
                </p>

                {/* Buttons */}
                {countdown === null ? (
                    <div className="relative flex flex-col gap-3">
                        <button
                            onClick={handleReload}
                            className="group w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-2xl font-bold transition-all transform hover:scale-[1.02] shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 overflow-hidden"
                        >
                            <Zap className="w-5 h-5 group-hover:animate-pulse" />
                            <span>Jetzt neu laden</span>

                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        </button>

                        <button
                            onClick={handleReload}
                            className="w-full py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl font-medium transition-all border border-slate-700 hover:border-slate-600"
                        >
                            🌑 ok nur in schwarz
                        </button>
                    </div>
                ) : (
                    <div className="relative py-4 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-2xl border border-emerald-500/30">
                        <p className="text-emerald-400 font-bold flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Lädt in {countdown}...
                        </p>
                    </div>
                )}

                {/* Fun footer */}
                <p className="relative mt-6 text-xs text-slate-600">
                    💜 MET System • Immer aktuell
                </p>
            </div>

            {/* CSS for shine animation */}
            <style>{`
                @keyframes shine {
                    0% { transform: translateX(-100%) rotate(45deg); }
                    100% { transform: translateX(200%) rotate(45deg); }
                }
                .animate-shine {
                    animation: shine 3s infinite;
                }
                .animate-spin-slow {
                    animation: spin 2s linear infinite;
                }
            `}</style>
        </div>
    );
}
