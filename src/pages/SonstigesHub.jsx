import React from 'react';
import { Link } from 'react-router-dom';
import {
    MoreHorizontal, Phone, Megaphone, Handshake, Users,
    FileText, Calculator, BookOpen, GraduationCap, Shield, Search, Car, Trophy
} from 'lucide-react';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function SonstigesHub({ user }) {
    const isAdmin = user?.role === 'Administrator';
    const isBuchhaltung = user?.role === 'Buchhaltung' || isAdmin;
    const isFuhrpark = user?.role === 'Fuhrparkmanager' || isAdmin;

    const sections = [
        {
            title: 'Allgemein',
            gradient: 'from-slate-200 to-slate-400',
            cards: [
                { to: '/sonstiges/hausordnung', icon: Shield, title: 'Hausordnung', desc: 'Regeln & Richtlinien', color: 'amber' },
                { to: '/sonstiges/beginner-guide', icon: GraduationCap, title: 'Beginner Guide', desc: 'Einführung für neue Mitarbeiter', color: 'blue' },
                { to: '/sammel-event', icon: Trophy, title: 'Sammel-Event', desc: 'Team-Wettbewerb & Statistiken', color: 'amber' },
            ]
        },
        ...(isBuchhaltung ? [{
            title: 'Buchhaltung',
            gradient: 'from-emerald-400 to-teal-500',
            cards: [
                { to: '/kontrolle', icon: Search, title: 'Mitarbeiter Lager', desc: 'Kontrolle der MA-Bestände', color: 'emerald' },
            ]
        }] : []),
        ...(isFuhrpark ? [{
            title: 'Fuhrpark',
            gradient: 'from-cyan-400 to-teal-500',
            cards: [
                { to: '/sonstiges/fuhrpark', icon: Car, title: 'Fuhrpark', desc: 'Fahrzeugverwaltung', color: 'cyan' },
            ]
        }] : []),
        ...(isAdmin ? [{
            title: 'Administration',
            gradient: 'from-violet-400 to-purple-500',
            cards: [
                { to: '/sonstiges/werbung', icon: Megaphone, title: 'Werbung', desc: 'Werbekampagnen verwalten', color: 'violet' },
                { to: '/sonstiges/kontakte', icon: Phone, title: 'Kontakte', desc: 'Kontaktdatenbank', color: 'emerald' },
                { to: '/sonstiges/partner', icon: Handshake, title: 'Partnerschaften', desc: 'Geschäftspartner', color: 'blue' },
                { to: '/sonstiges/personal', icon: Users, title: 'Personalliste', desc: 'Alle Mitarbeiter', color: 'amber' },
                { to: '/beleg', icon: FileText, title: 'Beleg erstellen', desc: 'Quittungen & Belege', color: 'emerald' },
                { to: '/marketing', icon: Calculator, title: 'Marketing Kalkulator', desc: 'Werbekosten berechnen', color: 'violet' },
            ]
        }] : [])
    ];

    const colorClasses = {
        violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
        blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
        amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
        cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <MoreHorizontal className="h-8 w-8 text-slate-400" />
                    Sonstiges
                </h1>
                <p className="text-slate-400 mt-2 text-lg">Weitere Tools und Ressourcen</p>
            </div>

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
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors", colorClasses[card.color].bg, colorClasses[card.color].border, "border")}>
                                            <card.icon className={cn("w-5 h-5", colorClasses[card.color].text)} />
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
