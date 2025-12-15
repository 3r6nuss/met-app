import React from 'react';
import { Settings } from 'lucide-react';

const MaintenanceOverlay = ({ active, text, image, isSuperAdmin }) => {
    if (!active && !isSuperAdmin) return null;
    if (!active && isSuperAdmin) return null;

    // If active and SuperAdmin, show a small banner instead of blocking
    if (active && isSuperAdmin) {
        return (
            <div className="fixed top-0 left-0 w-full bg-amber-500/90 text-white text-center py-1 z-[9999] font-bold shadow-lg backdrop-blur-sm pointer-events-none">
                <span className="flex items-center justify-center gap-2">
                    <Settings className="w-4 h-4" />
                    WARTUNGSMODUS AKTIV
                </span>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/95 z-[9999] flex flex-col items-center justify-center p-8 backdrop-blur-md">
            <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-8 animate-fade-in">

                {/* Image/GIF Container */}
                <div className="relative w-64 h-64 md:w-96 md:h-96 rounded-full overflow-hidden shadow-2xl border-4 border-violet-500/30 bg-black/40 glow-effect">
                    {image ? (
                        <img
                            src={image}
                            alt="Maintenance"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        // Default GIF placeholder or cat typing
                        <img
                            src="https://media.giphy.com/media/unQ3IJU2RG7fbH9D7o/giphy.gif"
                            alt="Programming Cat"
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                        Wartungsarbeiten
                    </h1>
                    <p className="text-xl text-slate-300 max-w-lg mx-auto leading-relaxed">
                        {text || "Es wird gerade am System gearbeitet. Wir sind gleich wieder für dich da!"}
                    </p>
                </div>

                <div className="h-1 w-24 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50"></div>
            </div>
        </div>
    );
};

export default MaintenanceOverlay;
