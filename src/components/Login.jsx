import React from 'react';
import { LogIn } from 'lucide-react';

export default function Login({ onGuestLogin }) {
    const handleLogin = () => {
        window.location.href = 'https://met.3r6nuss.de/auth/discord';
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 shadow-xl max-w-md w-full">
                <h2 className="text-2xl font-bold text-white mb-2">Willkommen zurück</h2>
                <p className="text-slate-400 mb-8">Bitte melde dich an, um fortzufahren.</p>

                <button
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#5865F2]/20 mb-4"
                >
                    <LogIn className="w-5 h-5" />
                    Mit Discord anmelden
                </button>

                <button
                    onClick={onGuestLogin}
                    className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
                >
                    Als Gast fortfahren
                </button>
            </div>
        </div>
    );
}
