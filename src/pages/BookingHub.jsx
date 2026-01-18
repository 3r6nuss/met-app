import React from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowDownToLine, ArrowUpFromLine, ShoppingCart, Banknote,
    ClipboardList, Sparkles, ArrowRightLeft
} from 'lucide-react';

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
                color: 'emerald',
                gradient: 'from-emerald-500 to-teal-600'
            },
            {
                to: '/buchung/auslagern',
                icon: ArrowUpFromLine,
                title: 'Auslagern',
                description: 'Waren aus dem Lager entnehmen',
                color: 'blue',
                gradient: 'from-blue-500 to-cyan-600'
            }
        ] : []),
        // Handel-Aktionen
        ...(isHaendler ? [
            {
                to: '/buchung/einkauf',
                icon: ShoppingCart,
                title: 'Einkauf',
                description: 'Waren von Kunden ankaufen',
                color: 'violet',
                gradient: 'from-violet-500 to-purple-600'
            },
            {
                to: '/buchung/verkauf',
                icon: Banknote,
                title: 'Verkauf',
                description: 'Waren an Kunden verkaufen',
                color: 'amber',
                gradient: 'from-amber-500 to-orange-600'
            },
            {
                to: '/buchung/auftrag',
                icon: ClipboardList,
                title: 'Auftrag erstellen',
                description: 'Neuen Kundenauftrag anlegen',
                color: 'rose',
                gradient: 'from-rose-500 to-pink-600'
            }
        ] : []),
        // Sonderbuchung nur für Buchhaltung
        ...(isBuchhaltung ? [
            {
                to: '/buchung/sonderbuchung',
                icon: Sparkles,
                title: 'Sonderbuchung',
                description: 'Manuelle Korrektur oder Sonderfall',
                color: 'fuchsia',
                gradient: 'from-fuchsia-500 to-pink-600'
            }
        ] : [])
    ];

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 flex items-center gap-4">
                    <ArrowRightLeft className="w-10 h-10 text-slate-400" />
                    Buchung
                </h1>
                <p className="text-slate-500 mt-2 text-lg">Wähle eine Aktion aus</p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <Link
                        key={card.to}
                        to={card.to}
                        className="group relative bg-slate-800/50 border border-slate-700/50 rounded-3xl p-6 hover:border-slate-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl overflow-hidden"
                    >
                        {/* Background gradient on hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                        {/* Icon */}
                        <div className={`w-14 h-14 rounded-2xl bg-${card.color}-500/10 border border-${card.color}-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            <card.icon className={`w-7 h-7 text-${card.color}-400`} />
                        </div>

                        {/* Content */}
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300">
                            {card.title}
                        </h3>
                        <p className="text-slate-400 text-sm">
                            {card.description}
                        </p>

                        {/* Arrow */}
                        <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                            <span className="text-white">→</span>
                        </div>
                    </Link>
                ))}
            </div>

            {cards.length === 0 && (
                <div className="text-center py-20 text-slate-500">
                    <ArrowRightLeft className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Keine Buchungsaktionen verfügbar</p>
                    <p className="text-sm mt-2">Deine Rolle hat keine Berechtigungen für diesen Bereich</p>
                </div>
            )}
        </div>
    );
}
