import React from 'react';
import { Activity, WifiOff } from 'lucide-react';
import Navbar from './Navbar';
import SystemAlert from './SystemAlert';
import ReloadModal from './ReloadModal';
import { useAppState } from '../context/AppStateContext';

/**
 * App shell layout: header, connection banner, version badge, navbar, activity ticker.
 * Children slot is used for the routed page content.
 */
export default function AppLayout({ children }) {
    const { user, saveStatus, isConnected, showReloadModal, version, logs } = useAppState();

    return (
        <div className="p-4 md:p-8 pb-32 max-w-7xl mx-auto">
            <header className="mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="MET Logo" className="w-16 h-16 md:w-20 md:h-20" />
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                            Syncrolog
                        </h1>
                        <p className="text-slate-400 mt-1">MET System Dashboard</p>
                    </div>
                    <SystemAlert />
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-sm text-slate-500 mb-1">System Status</div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium justify-end">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Online
                        </div>
                        {saveStatus === 'saving' && <span className="text-xs text-amber-400">Speichere...</span>}
                        {saveStatus === 'saved' && <span className="text-xs text-emerald-400">Gespeichert</span>}
                        {saveStatus === 'error' && <span className="text-xs text-red-500 font-bold">Fehler beim Speichern!</span>}
                    </div>
                </div>
            </header>

            {!isConnected && (
                <div className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-500/90 text-white rounded-lg shadow-lg backdrop-blur animate-pulse">
                    <WifiOff className="w-5 h-5" />
                    <span className="font-medium">Verbindung verloren</span>
                </div>
            )}

            {showReloadModal && <ReloadModal />}

            <div className="fixed bottom-1 right-1 px-2 py-1 bg-slate-950/80 rounded text-[10px] text-slate-600 font-mono z-50 pointer-events-none select-none">
                v.{version ? new Date(version).toISOString().slice(0, 19).replace('T', ' ') : '...'}
            </div>

            <Navbar user={user} />

            {logs.length > 0 && (
                <div className="mb-6 flex gap-4 overflow-x-auto pb-2">
                    {logs.map(logEntry => (
                        <div key={logEntry.id} className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full whitespace-nowrap border border-slate-700">
                            <Activity className="w-3 h-3" />
                            <span className="text-slate-500">{logEntry.time}</span>
                            <span>{logEntry.msg}</span>
                        </div>
                    ))}
                </div>
            )}

            {children}
        </div>
    );
}
