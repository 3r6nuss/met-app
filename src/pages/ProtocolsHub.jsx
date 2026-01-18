import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
    FileText, BookOpen, Users, TrendingUp, Calendar,
    BarChart3, PieChart, Package, Clock, Wallet
} from 'lucide-react';

export default function ProtocolsHub({ user }) {
    const isAdmin = user?.role === 'Administrator';
    const isBuchhaltung = user?.role === 'Buchhaltung' || isAdmin;
    const isLager = (user?.isLagerist === 1 || user?.isLagerist === true) || user?.role === 'Lager' || isBuchhaltung;
    const isSuperAdmin = ['823276402320998450', '690510884639866960'].includes(user?.discordId);

    // Nicht-Buchhaltung-User direkt auf Mitarbeiter-Protokoll weiterleiten
    if (!isBuchhaltung) {
        return <Navigate to="/protokolle/internal-storage" replace />;
    }

    const sections = [
        // Buchhaltung
        ...(isBuchhaltung ? [{
            title: 'Buchhaltung',
            color: 'violet',
            cards: [
                { to: '/protokolle/buchhaltung', icon: BarChart3, title: 'Dashboard', desc: 'Übersicht aller Finanzen' },
                { to: '/protokolle/kassenbuch', icon: BookOpen, title: 'Kassenbuch', desc: 'Alle Geldbewegungen' },
                { to: '/protokolle/lohn', icon: Users, title: 'Lohnabrechnung', desc: 'Mitarbeiter-Auszahlungen' },
                { to: '/protokolle/guv', icon: TrendingUp, title: 'Gewinn & Verlust', desc: 'Finanzübersicht' },
            ]
        }] : []),
        // Analyse
        ...(isBuchhaltung ? [{
            title: 'Analyse',
            color: 'blue',
            cards: [
                { to: '/protokolle/analytics', icon: PieChart, title: 'Analytics', desc: 'Performance-Auswertung' },
                { to: '/protokolle/profitabilitaet', icon: Wallet, title: 'Profitabilität', desc: 'Produkt-Margen' },
            ]
        }] : []),
        // Protokolle
        {
            title: 'Protokolle',
            color: 'emerald',
            cards: [
                ...(isBuchhaltung ? [
                    { to: '/protokolle/trade', icon: Package, title: 'Tagesprotokoll', desc: 'An- & Verkäufe' },
                ] : []),
                { to: '/protokolle/internal-storage', icon: Users, title: 'Mitarbeiter', desc: 'Interne Lagerbewegungen' },
                ...(isBuchhaltung ? [
                    { to: '/protokolle/weekly', icon: Calendar, title: 'Wochenprotokoll', desc: 'Wöchentliche Übersicht' },
                    { to: '/protokolle/period', icon: Clock, title: 'Zeitraum-Protokoll', desc: 'Flexible Auswertung' },
                ] : []),
                ...(isLager ? [
                    { to: '/protokolle/storage', icon: Package, title: 'Lagerprotokoll', desc: 'Lagerbewegungen' },
                ] : []),
            ]
        },
        // Admin
        ...(isSuperAdmin ? [{
            title: 'Admin',
            color: 'red',
            cards: [
                { to: '/admin/backup', icon: FileText, title: 'Backup', desc: 'Datensicherung' },
                { to: '/admin/performance', icon: BarChart3, title: 'Performance', desc: 'System-Performance' },
            ]
        }] : []),
    ];

    const colorClasses = {
        violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', header: 'from-violet-400 to-purple-500' },
        blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', header: 'from-blue-400 to-cyan-500' },
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', header: 'from-emerald-400 to-teal-500' },
        red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', header: 'from-red-400 to-rose-500' },
    };

    return (
        <div className="animate-fade-in space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 flex items-center gap-4">
                    <FileText className="w-10 h-10 text-slate-400" />
                    Protokolle
                </h1>
                <p className="text-slate-500 mt-2 text-lg">Alle Auswertungen und Berichte</p>
            </div>

            {/* Sections */}
            {sections.map((section) => (
                <div key={section.title}>
                    {/* Section Header */}
                    <h2 className={`text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r ${colorClasses[section.color].header}`}>
                        {section.title}
                    </h2>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {section.cards.map((card) => (
                            <Link
                                key={card.to}
                                to={card.to}
                                className={`group relative bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600 transition-all duration-200 hover:bg-slate-800/60`}
                            >
                                <div className={`w-10 h-10 rounded-xl ${colorClasses[section.color].bg} ${colorClasses[section.color].border} border flex items-center justify-center mb-3`}>
                                    <card.icon className={`w-5 h-5 ${colorClasses[section.color].text}`} />
                                </div>
                                <h3 className="font-bold text-white mb-1">{card.title}</h3>
                                <p className="text-slate-500 text-sm">{card.desc}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
