import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, FileText, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import OutstandingBalance from './OutstandingBalance';
import { useDeveloperConsole } from '../context/DeveloperConsoleContext';

export default function Navbar({ onOpenPriceList, user }) {
    const isAdmin = user?.role === 'Administrator';
    const isBuchhaltung = user?.role === 'Buchhaltung' || isAdmin;
    const isLager = (user?.isLagerist === 1 || user?.isLagerist === true) || user?.role === 'Lager' || isBuchhaltung;
    const isHaendler = (user?.isHaendler === 1 || user?.isHaendler === true) || user?.role === 'Händler' || isBuchhaltung;
    const isSuperAdmin = ['823276402320998450', '690510884639866960'].includes(user?.discordId);
    const isPending = user?.role?.includes('Pending');

    const navLinkClass = ({ isActive }) => cn(
        "flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-all rounded-xl",
        isActive
            ? "bg-white/10 text-white shadow-inner"
            : "text-slate-400 hover:text-white hover:bg-white/5"
    );

    return (
        <nav className="glass-panel rounded-2xl p-2 mb-8 flex items-center sticky top-4 z-50">
            <div className="flex-1 flex">
                {/* Lager */}
                <NavLink to="/" className={navLinkClass}>
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="hidden sm:inline">Lager</span>
                </NavLink>

                {/* Buchung Hub */}
                {(isLager || isHaendler) && !isPending && (
                    <NavLink to="/buchung" className={navLinkClass}>
                        <ArrowRightLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Buchung</span>
                    </NavLink>
                )}

                {/* Protokolle Hub */}
                {!isPending && (
                    <NavLink to="/protokolle" className={navLinkClass}>
                        <FileText className="w-5 h-5" />
                        <span className="hidden sm:inline">Protokolle</span>
                    </NavLink>
                )}

                {/* Verwaltung/System */}
                {isBuchhaltung && (
                    <NavLink to="/system" className={navLinkClass}>
                        <Settings className="w-5 h-5" />
                        <span className="hidden sm:inline">System</span>
                    </NavLink>
                )}

                {/* Preise Button (Admin only) */}
                {isAdmin && (
                    <button
                        onClick={onOpenPriceList}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                        <span className="text-lg">💲</span>
                        <span className="hidden sm:inline">Preise</span>
                    </button>
                )}

                {/* Aktivitätslog (SuperAdmin only) */}
                {isSuperAdmin && (
                    <NavLink to="/aktivitaetslog" className={navLinkClass}>
                        <ShieldCheck className="w-5 h-5 text-red-400" />
                        <span className="hidden sm:inline text-red-400">Admin</span>
                    </NavLink>
                )}
            </div>

            {/* User Profile */}
            {user && (
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-700">
                    {isSuperAdmin && <ConsoleToggle />}
                    <OutstandingBalance user={user} />
                    <div className="flex items-center gap-2">
                        {user.avatar && (
                            <img
                                src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                                alt={user.username}
                                className="w-8 h-8 rounded-full border border-slate-600"
                            />
                        )}
                        <span className="text-sm font-medium text-slate-300 hidden xl:block">{user.username}</span>
                    </div>
                    <a
                        href="/auth/logout"
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-colors"
                        title="Abmelden"
                    >
                        <LogOut className="w-5 h-5" />
                    </a>
                </div>
            )}
        </nav>
    );
}

const ConsoleToggle = () => {
    const { toggleConsole, isVisible } = useDeveloperConsole();
    return (
        <button
            onClick={toggleConsole}
            className={`p-2 rounded-lg transition-colors mr-2 ${isVisible ? 'text-green-400 bg-green-400/10' : 'text-slate-500 hover:text-green-400 hover:bg-slate-800'}`}
            title="Developer Console"
        >
            <div className="w-5 h-5 font-mono text-xs border-2 border-current rounded flex items-center justify-center font-bold">
                {'>_'}
            </div>
        </button>
    );
};
