import React from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowDownToLine, ArrowUpFromLine, ShoppingCart, Banknote,
    ClipboardList, Sparkles, ArrowRightLeft, Package
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function BookingHub({ user }) {
    const isAdmin = user?.role === 'Administrator';
    const isBuchhaltung = user?.role === 'Buchhaltung' || isAdmin;
    const isLager = (user?.isLagerist === 1 || user?.isLagerist === true) || user?.role === 'Lager' || isBuchhaltung;
    const isHaendler = (user?.isHaendler === 1 || user?.isHaendler === true) || user?.role === 'Händler' || isBuchhaltung;

    const cards = [
        // Lager-Aktionen
        ...(isLager ? [
            {
                to: '/buchung/einlagern',
                icon: ArrowDownToLine,
                title: 'Einlagern',
                description: 'Waren ins Lager aufnehmen',
                accent: 'text-emerald-500',
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20 hover:border-emerald-500/50',
                gradient: 'from-emerald-500/20 to-teal-500/5'
            },
            {
                to: '/buchung/auslagern',
                icon: ArrowUpFromLine,
                title: 'Auslagern',
                description: 'Waren aus dem Lager entnehmen',
                accent: 'text-blue-500',
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/20 hover:border-blue-500/50',
                gradient: 'from-blue-500/20 to-cyan-500/5'
            }
        ] : []),
        // Handel-Aktionen
        ...(isHaendler ? [
            {
                to: '/buchung/einkauf',
                icon: ShoppingCart,
                title: 'Einkauf',
                description: 'Waren von Kunden ankaufen',
                accent: 'text-violet-500',
                bg: 'bg-violet-500/10',
                border: 'border-violet-500/20 hover:border-violet-500/50',
                gradient: 'from-violet-500/20 to-purple-500/5'
            },
            {
                to: '/buchung/verkauf',
                icon: Banknote,
                title: 'Verkauf',
                description: 'Waren an Kunden verkaufen',
                accent: 'text-amber-500',
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/20 hover:border-amber-500/50',
                gradient: 'from-amber-500/20 to-orange-500/5'
            },
            {
                to: '/buchung/auftrag',
                icon: ClipboardList,
                title: 'Auftrag erstellen',
                description: 'Neuen Kundenauftrag anlegen',
                accent: 'text-rose-500',
                bg: 'bg-rose-500/10',
                border: 'border-rose-500/20 hover:border-rose-500/50',
                gradient: 'from-rose-500/20 to-pink-500/5'
            }
        ] : []),
        // Sonderbuchung nur für Buchhaltung
        ...(isBuchhaltung ? [
            {
                to: '/buchung/sonderbuchung',
                icon: Sparkles,
                title: 'Sonderbuchung',
                description: 'Manuelle Korrektur oder Sonderfall',
                accent: 'text-fuchsia-500',
                bg: 'bg-fuchsia-500/10',
                border: 'border-fuchsia-500/20 hover:border-fuchsia-500/50',
                gradient: 'from-fuchsia-500/20 to-pink-500/5'
            },
            {
                to: '/sammel-event',
                icon: Package,
                title: 'Sammel-Event',
                description: 'Masseneinlagerung für Events',
                accent: 'text-orange-500',
                bg: 'bg-orange-500/10',
                border: 'border-orange-500/20 hover:border-orange-500/50',
                gradient: 'from-orange-500/20 to-red-500/5'
            }
        ] : [])
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <ArrowRightLeft className="h-8 w-8 text-slate-400" />
                    Buchung
                </h1>
                <p className="text-slate-400 mt-2 text-lg">Wähle eine Aktion aus</p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <Link key={card.to} to={card.to} className="group block h-full">
                        <Card className={cn(
                            "h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden relative border-slate-800 bg-slate-950/50 backdrop-blur",
                            card.border
                        )}>
                            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br", card.gradient)} />

                            <CardHeader>
                                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 duration-300", card.bg)}>
                                    <card.icon className={cn("h-6 w-6", card.accent)} />
                                </div>
                                <CardTitle className="text-xl group-hover:text-white transition-colors">
                                    {card.title}
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    {card.description}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>

            {cards.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                        <ArrowRightLeft className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-300">Keine Buchungsaktionen verfügbar</h3>
                    <p className="text-slate-500 mt-1">Deine Rolle hat keine Berechtigungen für diesen Bereich</p>
                </div>
            )}
        </div>
    );
}
