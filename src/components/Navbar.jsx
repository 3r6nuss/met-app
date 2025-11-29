import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, ShieldCheck, ShoppingCart, ChevronDown, FileText, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Navbar({ onOpenPriceList, user }) {
    const isAdmin = user?.role === 'Administrator';
    const isBuchhaltung = user?.role === 'Buchhaltung' || isAdmin;
    const isLager = user?.role === 'Lager' || isBuchhaltung;
    const isHaendler = (user?.isHaendler === 1 || user?.isHaendler === true) || user?.role === 'Händler' || isBuchhaltung;

    const navLinkClass = ({ isActive }) => cn(
        "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap flex-1",
        isActive
            ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
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
                            {isLager && (
                                <>
                                    {/* Lager darf NICHT einlagern, nur Auslagern */}
                                    <NavLink to="/buchung/auslagern" className={dropdownItemClass}>Auslagern</NavLink>
                                </>
                            )}
                            {(isHaendler || isBuchhaltung) && (
                                <>
                                    {isLager && <div className="h-px bg-slate-800 my-1"></div>}
                                    <NavLink to="/buchung/einkauf" className={dropdownItemClass}>Einkauf (Ankauf)</NavLink>
                                    <NavLink to="/buchung/verkauf" className={dropdownItemClass}>Verkauf (Abverkauf)</NavLink>
                                </>
                            )}
                            {/* Admin/Buchhaltung can Einlagern? If needed, add here. Assuming only they can now. */}
                            {isBuchhaltung && (
                                <>
                                    <div className="h-px bg-slate-800 my-1"></div>
                                    <NavLink to="/buchung/einlagern" className={dropdownItemClass}>Einlagern</NavLink>
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
                            <NavLink to="/protokolle/employee" className={dropdownItemClass}>Tagesprotokolle Mitarbeiter</NavLink>
                            {isBuchhaltung && (
                                <>
                                    <div className="h-px bg-slate-800 my-1"></div>
                                    <NavLink to="/protokolle/weekly" className={dropdownItemClass}>Wochenprotokolle</NavLink>
                                    <NavLink to="/protokolle/period" className={dropdownItemClass}>Zeitraum Protokolle (Monat/Jahr)</NavLink>
                                </>
                            )}
                            {isLager && (
                                <>
                                    <div className="h-px bg-slate-800 my-1"></div>
                                    <NavLink to="/protokolle/storage" className={dropdownItemClass}>Lagerprotokoll</NavLink>
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
                            <button onClick={onOpenPriceList} className={`w-full text-left ${dropdownItemClass({ isActive: false })} flex items-center gap-2`}>
                                <ShoppingCart className="w-4 h-4" />
                                Preise
                            </button>
                            <NavLink to="/kontrolle" className={dropdownItemClass}>Kontrolle</NavLink>
                            <div className="h-px bg-slate-800 my-1"></div>
                            <NavLink to="/system/employees" className={dropdownItemClass}>Mitarbeiter</NavLink>
                            {isAdmin && <NavLink to="/system" className={dropdownItemClass}>System & Backup</NavLink>}
                        </div>
                    </div>
                )}
            </div>

            {/* User Profile */}
            {user && (
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-700">
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
