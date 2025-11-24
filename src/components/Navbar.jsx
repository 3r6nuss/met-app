import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, ShieldCheck, ShoppingCart, ChevronDown, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Navbar({ onOpenPriceList }) {
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
                {/* Lager (Direct Link) */}
                <NavLink to="/" className={navLinkClass}>
                    <LayoutDashboard className="w-5 h-5" />
                    Lager
                </NavLink>

                {/* Buchung Dropdown */}
                <div className="relative group flex-1">
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                        <ArrowRightLeft className="w-5 h-5" />
                        Buchung
                        <ChevronDown className="w-4 h-4 ml-1" />
                    </button>
                    <div className="absolute left-0 mt-2 w-full min-w-[200px] bg-slate-900 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                        <NavLink to="/buchung/einlagern" className={dropdownItemClass}>Einlagern</NavLink>
                        <NavLink to="/buchung/auslagern" className={dropdownItemClass}>Auslagern</NavLink>
                        <div className="h-px bg-slate-800 my-1"></div>
                        <NavLink to="/buchung/einkauf" className={dropdownItemClass}>Einkauf (Ankauf)</NavLink>
                        <NavLink to="/buchung/verkauf" className={dropdownItemClass}>Verkauf (Abverkauf)</NavLink>
                    </div>
                </div>

                {/* Protokolle Dropdown */}
                <div className="relative group flex-1">
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                        <FileText className="w-5 h-5" />
                        Protokolle
                        <ChevronDown className="w-4 h-4 ml-1" />
                    </button>
                    <div className="absolute left-0 mt-2 w-full min-w-[240px] bg-slate-900 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                        <NavLink to="/protokolle/trade" className={dropdownItemClass}>Tagesprotokolle An & Verkauf</NavLink>
                        <NavLink to="/protokolle/employee" className={dropdownItemClass}>Tagesprotokolle Mitarbeiter</NavLink>
                        <div className="h-px bg-slate-800 my-1"></div>
                        <NavLink to="/protokolle/weekly" className={dropdownItemClass}>Wochenprotokolle</NavLink>
                        <NavLink to="/protokolle/monthly" className={dropdownItemClass}>Monatsprotokolle</NavLink>
                    </div>
                </div>

                {/* Preise Button */}
                <button
                    onClick={onOpenPriceList}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all flex-1"
                >
                    <ShoppingCart className="w-5 h-5" />
                    Preise
                </button>

                {/* Kontrolle (Direct Link) */}
                <NavLink to="/kontrolle" className={navLinkClass}>
                    <ShieldCheck className="w-5 h-5" />
                    Kontrolle
                </NavLink>
            </div>
        </nav>
    );
}
