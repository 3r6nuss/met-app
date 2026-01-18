import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, ChevronDown, FileText, LogOut, MoreHorizontal, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import OutstandingBalance from './OutstandingBalance';
import { useDeveloperConsole } from '../context/DeveloperConsoleContext';

export default function Navbar({ onOpenPriceList, user }) {
    const isAdmin = user?.role === 'Administrator';
    const isBuchhaltung = user?.role === 'Buchhaltung' || isAdmin;
    const isLager = (user?.isLagerist === 1 || user?.isLagerist === true) || user?.role === 'Lager' || isBuchhaltung;
    const isHaendler = (user?.isHaendler === 1 || user?.isHaendler === true) || user?.role === 'Händler' || isBuchhaltung;
    const isSuperAdmin = ['823276402320998450', '690510884639866960'].includes(user?.discordId);

    const navLinkClass = ({ isActive }) => cn(
        "nav-item flex items-center justify-center gap-2 px-4 py-3 font-medium transition-all whitespace-nowrap flex-1 rounded-lg border border-transparent",
        isActive
            ? "bg-white/5 text-white border-white/5 shadow-inner"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
    );

    return (
        <nav className="glass-panel rounded-2xl p-2 mb-8 flex justify-between items-center sticky top-4 z-50">
            <div className="flex gap-2 w-full items-center">
                {/* Lager Link */}
                <NavLink to="/" className={navLinkClass}>
                    <LayoutDashboard className="w-5 h-5" />
                    Lager
                </NavLink>

                {/* Buchung Dropdown */}
                {(isLager || isHaendler) && (
                    <div className="relative group flex-1">
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                            <ArrowRightLeft className="w-5 h-5" />
                            Buchung
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </button>
                        <div className="absolute left-0 mt-2 w-full min-w-[200px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                            {(isLager || isBuchhaltung) && (
                                <>
                                    <NavLink to="/buchung/einlagern" className="menu-item green">
                                        <span className="menu-item-icon green">📥</span>
                                        Einlagern
                                    </NavLink>
                                    {isLager && (
                                        <NavLink to="/buchung/auslagern" className="menu-item green">
                                            <span className="menu-item-icon green">📤</span>
                                            Auslagern
                                        </NavLink>
                                    )}
                                    {isBuchhaltung && (
                                        <NavLink to="/buchung/sonderbuchung" className="menu-item amber">
                                            <span className="menu-item-icon amber">⭐</span>
                                            Sonderbuchung
                                        </NavLink>
                                    )}
                                </>
                            )}
                            {(isLager || isBuchhaltung) && (isHaendler || isBuchhaltung) && <div className="h-px bg-slate-800 my-2 mx-2"></div>}
                            {(isHaendler || isBuchhaltung) && (
                                <>
                                    <NavLink to="/buchung/einkauf" className="menu-item blue">
                                        <span className="menu-item-icon blue">🛒</span>
                                        Einkauf (Ankauf)
                                    </NavLink>
                                    <NavLink to="/buchung/verkauf" className="menu-item blue">
                                        <span className="menu-item-icon blue">💰</span>
                                        Verkauf (Abverkauf)
                                    </NavLink>
                                    <div className="h-px bg-slate-800 my-2 mx-2"></div>
                                    <NavLink to="/buchung/auftrag" className="menu-item violet">
                                        <span className="menu-item-icon violet">📋</span>
                                        Auftrag erstellen
                                    </NavLink>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Protokolle MEGA-MENU */}
                {!user?.role?.includes('Pending') && (
                    <div className="relative group flex-1">
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                            <FileText className="w-5 h-5" />
                            Protokolle
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </button>

                        {/* MEGA-MENU */}
                        <div className="mega-menu" style={{ minWidth: isBuchhaltung ? '700px' : '300px' }}>
                            <div className={`mega-menu-grid ${!isBuchhaltung ? 'grid-cols-1' : ''}`} style={{ gridTemplateColumns: isBuchhaltung ? 'repeat(4, 1fr)' : '1fr' }}>

                                {/* Buchhaltung Column */}
                                {isBuchhaltung && (
                                    <div className="menu-category">
                                        <div className="menu-category-header violet">
                                            💼 Buchhaltung
                                        </div>
                                        <NavLink to="/protokolle/buchhaltung" className="menu-item violet">
                                            <span className="menu-item-icon violet">📊</span>
                                            Dashboard
                                        </NavLink>
                                        <NavLink to="/protokolle/kassenbuch" className="menu-item violet">
                                            <span className="menu-item-icon violet">📒</span>
                                            Kassenbuch
                                        </NavLink>
                                        <NavLink to="/protokolle/lohn" className="menu-item violet">
                                            <span className="menu-item-icon violet">👥</span>
                                            Lohnabrechnung
                                        </NavLink>
                                        <NavLink to="/protokolle/guv" className="menu-item violet">
                                            <span className="menu-item-icon violet">📈</span>
                                            Gewinn & Verlust
                                        </NavLink>
                                    </div>
                                )}

                                {/* Analyse Column */}
                                {isBuchhaltung && (
                                    <div className="menu-category">
                                        <div className="menu-category-header blue">
                                            📊 Analyse
                                        </div>
                                        <NavLink to="/protokolle/analytics" className="menu-item blue">
                                            <span className="menu-item-icon blue">📈</span>
                                            Analytics
                                        </NavLink>
                                        <NavLink to="/protokolle/profitabilitaet" className="menu-item blue">
                                            <span className="menu-item-icon blue">💰</span>
                                            Profitabilität
                                        </NavLink>
                                        <NavLink to="/protokolle/audit" className="menu-item blue">
                                            <span className="menu-item-icon blue">🛡️</span>
                                            Finanz-Audit
                                        </NavLink>
                                    </div>
                                )}

                                {/* Protokolle Column */}
                                <div className="menu-category">
                                    <div className="menu-category-header green">
                                        📋 Protokolle
                                    </div>
                                    {isBuchhaltung && (
                                        <NavLink to="/protokolle/trade" className="menu-item green">
                                            <span className="menu-item-icon green">💱</span>
                                            An- & Verkauf
                                        </NavLink>
                                    )}
                                    <NavLink to="/protokolle/internal-storage" className="menu-item green">
                                        <span className="menu-item-icon green">👤</span>
                                        Mitarbeiter
                                    </NavLink>
                                    {isBuchhaltung && (
                                        <>
                                            <NavLink to="/protokolle/weekly" className="menu-item green">
                                                <span className="menu-item-icon green">📅</span>
                                                Wochenprotokoll
                                            </NavLink>
                                            <NavLink to="/protokolle/period" className="menu-item green">
                                                <span className="menu-item-icon green">📆</span>
                                                Monatsprotokoll
                                            </NavLink>
                                        </>
                                    )}
                                </div>

                                {/* Admin Column - Only for Super Admins */}
                                {isSuperAdmin && (
                                    <div className="menu-category">
                                        <div className="menu-category-header red">
                                            🔴 Admin
                                        </div>
                                        <NavLink to="/admin/backup" className="menu-item red">
                                            <span className="menu-item-icon red">💾</span>
                                            Backup
                                        </NavLink>
                                        <NavLink to="/admin/performance" className="menu-item red">
                                            <span className="menu-item-icon red">⚡</span>
                                            Performance
                                        </NavLink>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Sonstiges Dropdown */}
                {!user?.role?.includes('Pending') && (
                    <div className="relative group flex-1">
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                            <MoreHorizontal className="w-5 h-5" />
                            Sonstiges
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </button>
                        <div className="absolute left-0 mt-2 w-full min-w-[200px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                            <NavLink to="/sonstiges/hausordnung" className="menu-item amber">
                                <span className="menu-item-icon amber">📜</span>
                                Hausordnung
                            </NavLink>
                            <NavLink to="/sonstiges/beginner-guide" className="menu-item amber">
                                <span className="menu-item-icon amber">🎓</span>
                                Beginner Guide
                            </NavLink>
                            {isAdmin && (
                                <>
                                    <div className="h-px bg-slate-800 my-2 mx-2"></div>
                                    <NavLink to="/sonstiges/werbung" className="menu-item violet">
                                        <span className="menu-item-icon violet">📢</span>
                                        Werbung
                                    </NavLink>
                                    <NavLink to="/sonstiges/konto" className="menu-item violet">
                                        <span className="menu-item-icon violet">🏦</span>
                                        Geschäftskonto
                                    </NavLink>
                                    <NavLink to="/sonstiges/kontakte" className="menu-item violet">
                                        <span className="menu-item-icon violet">📇</span>
                                        Kontakte
                                    </NavLink>
                                    <NavLink to="/sonstiges/partner" className="menu-item violet">
                                        <span className="menu-item-icon violet">🤝</span>
                                        Partnerschaften
                                    </NavLink>
                                    <NavLink to="/sonstiges/personal" className="menu-item violet">
                                        <span className="menu-item-icon violet">👥</span>
                                        Personalliste
                                    </NavLink>
                                    <div className="h-px bg-slate-800 my-2 mx-2"></div>
                                    <NavLink to="/beleg" className="menu-item green">
                                        <span className="menu-item-icon green">🧾</span>
                                        Beleg erstellen
                                    </NavLink>
                                    <NavLink to="/rechner" className="menu-item green">
                                        <span className="menu-item-icon green">🧮</span>
                                        Rechner
                                    </NavLink>
                                    <NavLink to="/marketing" className="menu-item green">
                                        <span className="menu-item-icon green">📊</span>
                                        Marketing Kalkulator
                                    </NavLink>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Verwaltung Dropdown */}
                {isBuchhaltung && (
                    <div className="relative group flex-1">
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                            <ShieldCheck className="w-5 h-5" />
                            Verwaltung
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </button>
                        <div className="absolute right-0 mt-2 w-full min-w-[200px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                            {isAdmin && (
                                <button onClick={onOpenPriceList} className="menu-item violet w-full text-left">
                                    <span className="menu-item-icon violet">💲</span>
                                    Preise
                                </button>
                            )}
                            <NavLink to="/kontrolle" className="menu-item blue">
                                <span className="menu-item-icon blue">🔍</span>
                                Kontrolle
                            </NavLink>
                            <div className="h-px bg-slate-800 my-2 mx-2"></div>
                            <NavLink to="/system" className="menu-item amber">
                                <span className="menu-item-icon amber">⚙️</span>
                                System
                            </NavLink>
                            {isSuperAdmin && (
                                <>
                                    <div className="h-px bg-slate-800 my-2 mx-2"></div>
                                    <NavLink to="/aktivitaetslog" className="menu-item red">
                                        <span className="menu-item-icon red">🔴</span>
                                        Aktivitätslog
                                    </NavLink>
                                </>
                            )}
                        </div>
                    </div>
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
