import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
    FileText, BookOpen, Users, TrendingUp, Calendar,
    BarChart3, PieChart, Package, Clock, Wallet, ArrowRight, Bot, Search
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
        {
            title: 'Buchhaltung',
            gradient: 'from-violet-500 to-indigo-500',
            text: 'text-violet-400',
            cards: [
                { to: '/protokolle/buchhaltung', icon: BarChart3, title: 'Dashboard', desc: 'Übersicht aller Finanzen', accent: 'text-violet-400', bg: 'bg-violet-500/10' },
                { to: '/protokolle/kassenbuch', icon: BookOpen, title: 'Kassenbuch', desc: 'Alle Geldbewegungen', accent: 'text-violet-400', bg: 'bg-violet-500/10' },
                { to: '/protokolle/lohn', icon: Users, title: 'Lohnabrechnung', desc: 'Mitarbeiter-Auszahlungen', accent: 'text-violet-400', bg: 'bg-violet-500/10' },
                { to: '/protokolle/guv', icon: TrendingUp, title: 'Gewinn & Verlust', desc: 'Finanzübersicht', accent: 'text-violet-400', bg: 'bg-violet-500/10' },
            ]
        },
        // Analyse
        {
            title: 'Analyse',
            gradient: 'from-blue-500 to-cyan-500',
            text: 'text-blue-400',
            cards: [
                { to: '/protokolle/analytics', icon: PieChart, title: 'Analytics', desc: 'Performance-Auswertung', accent: 'text-blue-400', bg: 'bg-blue-500/10' },
                { to: '/protokolle/profitabilitaet', icon: Wallet, title: 'Profitabilität', desc: 'Produkt-Margen', accent: 'text-blue-400', bg: 'bg-blue-500/10' },
            ]
        },
        // Protokolle
        {
            title: 'Weitere Protokolle',
            gradient: 'from-emerald-500 to-teal-500',
            text: 'text-emerald-400',
            cards: [
                { to: '/protokolle/trade', icon: Package, title: 'Tagesprotokoll', desc: 'An- & Verkäufe', accent: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { to: '/protokolle/weekly', icon: Calendar, title: 'Wochenprotokoll', desc: 'Wöchentliche Übersicht', accent: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { to: '/protokolle/period', icon: Clock, title: 'Zeitraum-Protokoll', desc: 'Flexible Auswertung', accent: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                ...(isLager ? [
                    { to: '/protokolle/storage', icon: Package, title: 'Lagerprotokoll', desc: 'Lagerbewegungen', accent: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                ] : []),
                { to: '/protokolle/transaction-search', icon: Search, title: 'Transaktions-Suche', desc: 'Suche per Referenz-ID', accent: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            ]
        },
        // Admin
        ...(isSuperAdmin ? [{
            title: 'Admin',
            gradient: 'from-red-500 to-rose-500',
            text: 'text-red-400',
            cards: [
                { to: '/protokolle/discord', icon: Bot, title: 'Discord Bot', desc: 'FiveM Log-Abgleich', accent: 'text-red-400', bg: 'bg-red-500/10' },
                { to: '/admin/backup', icon: FileText, title: 'Backup', desc: 'Datensicherung', accent: 'text-red-400', bg: 'bg-red-500/10' },
                { to: '/admin/performance', icon: BarChart3, title: 'Performance', desc: 'System-Performance', accent: 'text-red-400', bg: 'bg-red-500/10' },
            ]
        }] : []),
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <FileText className="h-8 w-8 text-slate-400" />
                    Protokolle
                </h1>
                <p className="text-slate-400 mt-2 text-lg">Alle Auswertungen und Berichte</p>
            </div>

            {/* FEATURED: Mitarbeiter-Protokoll */}
            <Link to="/protokolle/internal-storage" className="block group">
                <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-orange-950/20 hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <CardContent className="p-6 md:p-8 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/40 text-white group-hover:scale-110 transition-transform duration-300">
                                <Users className="w-8 h-8" />
                            </div>
                            <div>
                                <Badge variant="outline" className="border-amber-500/50 text-amber-400 mb-2 font-bold tracking-wider">
                                    ⭐ EMPFOHLEN
                                </Badge>
                                <h2 className="text-2xl font-bold text-white group-hover:text-amber-100 transition-colors">Mitarbeiter-Protokoll</h2>
                                <p className="text-amber-200/60 mt-1 font-medium">Interne Lagerbewegungen & Lohnauszahlungen verwalten</p>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 group-hover:translate-x-2 transition-all duration-300 border border-amber-500/20">
                            <ArrowRight className="w-6 h-6 text-amber-400" />
                        </div>
                    </CardContent>
                </Card>
            </Link>

            <Separator className="bg-slate-800" />

            {/* Other Sections */}
            {sections.map((section) => (
                <div key={section.title} className="space-y-4">
                    <h2 className={cn("text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r", section.gradient)}>
                        {section.title}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {section.cards.map((card) => (
                            <Link key={card.to} to={card.to} className="group h-full block">
                                <Card className="h-full bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 transition-all duration-200 hover:-translate-y-1">
                                    <CardHeader className="p-5">
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors", card.bg)}>
                                            <card.icon className={cn("w-5 h-5", card.accent)} />
                                        </div>
                                        <CardTitle className="text-base font-semibold text-slate-200 group-hover:text-white transition-colors">
                                            {card.title}
                                        </CardTitle>
                                        <CardDescription className="text-xs text-slate-500 group-hover:text-slate-400 mt-1">
                                            {card.desc}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
