import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, ShieldCheck, ShoppingCart, ChevronDown, FileText, LogOut, MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import OutstandingBalance from './OutstandingBalance';

export default function Navbar({ onOpenPriceList, user }) {
    const isAdmin = user?.role === 'Administrator';
    const isBuchhaltung = user?.role === 'Buchhaltung' || isAdmin;
    const isLager = (user?.isLagerist === 1 || user?.isLagerist === true) || user?.role === 'Lager' || isBuchhaltung;
    const isHaendler = (user?.isHaendler === 1 || user?.isHaendler === true) || user?.role === 'Händler' || isBuchhaltung;

    const navLinkClass = ({ isActive }) => cn(
        "nav-item flex items-center justify-center gap-2 px-4 py-3 font-medium transition-all whitespace-nowrap flex-1 rounded-lg border border-transparent",
        isActive
            ? "bg-white/5 text-white border-white/5 shadow-inner"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
    );

    const dropdownItemClass = ({ isActive }) => cn(
        "block px-4 py-2 text-sm hover:bg-slate-700 transition-colors rounded-md mx-1",
        isActive ? "text-violet-400 bg-slate-800" : "text-slate-300"
    );

    return (
        <nav className="glass-panel rounded-2xl p-2 mb-8 flex justify-between items-center sticky top-4 z-50">
            <div className="flex gap-2 w-full items-center">
                <NavLink to="/" className={navLinkClass}>
                    <LayoutDashboard className="w-5 h-5" />
                    Lager
                </NavLink>

                {/* Buchung Dropdown - Lager/Buchhaltung/Admin/Händler */}
                {(isLager || isHaendler) && (
                    <div className="relative group flex-1">
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                            <ArrowRightLeft className="w-5 h-5" />
                            Buchung
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </button>
                        <div className="absolute left-0 mt-2 w-full min-w-[200px] bg-slate-900 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                            {/* Einlagern & Auslagern: Lager & Buchhaltung/Admin */}
                            {(isLager || isBuchhaltung) && (
                                <>
                                    <NavLink to="/buchung/einlagern" className={dropdownItemClass}>Einlagern</NavLink>
                                    {isLager && <NavLink to="/buchung/auslagern" className={dropdownItemClass}>Auslagern</NavLink>}
                                    {isBuchhaltung && <NavLink to="/buchung/sonderbuchung" className={dropdownItemClass}>Sonderbuchung</NavLink>}
                                </>
                            )}

                            {/* Divider if we have previous items AND next items */}
                            {(isLager || isBuchhaltung) && (isHaendler || isBuchhaltung) && <div className="h-px bg-slate-800 my-1"></div>}

                            {/* Trade & Auftrag: Händler & Buchhaltung/Admin */}
                            {(isHaendler || isBuchhaltung) && (
                                <>
                                    <NavLink to="/buchung/einkauf" className={dropdownItemClass}>Einkauf (Ankauf)</NavLink>
                                    <NavLink to="/buchung/verkauf" className={dropdownItemClass}>Verkauf (Abverkauf)</NavLink>
                                    <div className="h-px bg-slate-800 my-1"></div>
                                    <NavLink to="/buchung/auftrag" className={dropdownItemClass}>Auftrag erstellen</NavLink>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Protokolle Dropdown - All Users (except Pending) */}
                {!user?.role?.includes('Pending') && (
                    <div className="relative group flex-1">
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                            <FileText className="w-5 h-5" />
                            Protokolle
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </button>
                        <div className="absolute left-0 mt-2 w-full min-w-[240px] bg-slate-900 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                            {isBuchhaltung && <NavLink to="/protokolle/trade" className={dropdownItemClass}>Tagesprotokolle An & Verkauf</NavLink>}
                            {isBuchhaltung && <NavLink to="/protokolle/employee" className={dropdownItemClass}>Wochenprotokoll Mitarbeiter (Alt)</NavLink>}
                            <NavLink to="/protokolle/internal-storage" className={dropdownItemClass}>Internes Lagerprotokoll</NavLink>
                            {isBuchhaltung && (
                                <>
                                    <div className="h-px bg-slate-800 my-1"></div>
                                    <NavLink to="/protokolle/weekly" className={dropdownItemClass}>Wochenprotokolle</NavLink>
                                    <NavLink to="/protokolle/period" className={dropdownItemClass}>Zeitraum Protokolle (Monat/Jahr)</NavLink>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Sonstiges Dropdown - All Users (except Pending) */}
                {!user?.role?.includes('Pending') && (
                    <div className="relative group flex-1">
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                            <MoreHorizontal className="w-5 h-5" />
                            Sonstiges
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </button>
                        <div className="absolute left-0 mt-2 w-full min-w-[200px] bg-slate-900 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                            <NavLink to="/sonstiges/hausordnung" className={dropdownItemClass}>Hausordnung</NavLink>
                            <NavLink to="/sonstiges/beginner-guide" className={dropdownItemClass}>Beginner Guide</NavLink>

                            {isAdmin && (
                                <>
                                    <div className="h-px bg-slate-800 my-1"></div>
                                    <NavLink to="/sonstiges/werbung" className={dropdownItemClass}>Werbung</NavLink>
                                    <NavLink to="/sonstiges/konto" className={dropdownItemClass}>Geschäftskonto</NavLink>
                                    <NavLink to="/sonstiges/kontakte" className={dropdownItemClass}>Kontakte</NavLink>
                                    <NavLink to="/sonstiges/partner" className={dropdownItemClass}>Partnerschaften</NavLink>
                                    <NavLink to="/sonstiges/personal" className={dropdownItemClass}>Personalliste</NavLink>
                                    <NavLink to="/beleg" className={dropdownItemClass}>Beleg erstellen</NavLink>
                                    <NavLink to="/rechner" className={dropdownItemClass}>Rechner</NavLink>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Verwaltung Dropdown - Buchhaltung/Admin */}
                {isBuchhaltung && (
                    <div className="relative group flex-1">
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                            <ShieldCheck className="w-5 h-5" />
                            Verwaltung
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </button>
                        <div className="absolute right-0 mt-2 w-full min-w-[200px] bg-slate-900 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                            {isAdmin && (
                                <button onClick={onOpenPriceList} className={`w-full text-left ${dropdownItemClass({ isActive: false })} flex items-center gap-2`}>
                                    <ShoppingCart className="w-4 h-4" />
                                    Preise
                                </button>
                            )}
                            <NavLink to="/kontrolle" className={dropdownItemClass}>Kontrolle</NavLink>
                            <div className="h-px bg-slate-800 my-1"></div>
                            <NavLink to="/system" className={dropdownItemClass}>System</NavLink>
                            {/* Super Admin Only */}
                            {(user?.discordId === '823276402320998450' || user?.discordId === '690510884639866960') && (
                                <>
                                    <div className="h-px bg-slate-800 my-1"></div>
                                    <NavLink to="/aktivitaetslog" className={dropdownItemClass}>🔴 Aktivitätslog</NavLink>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* User Profile */}
            {user && (
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-700">
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
