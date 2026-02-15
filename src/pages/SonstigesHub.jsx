import React from 'react';
import { Link } from 'react-router-dom';
import {
    MoreHorizontal, Phone, Megaphone, Handshake, Users,
    FileText, Calculator, BookOpen, GraduationCap, Shield, Search, Car, Trophy
} from 'lucide-react';

export default function SonstigesHub({ user }) {
    const isAdmin = user?.role === 'Administrator';
    const isBuchhaltung = user?.role === 'Buchhaltung' || isAdmin;
    const isFuhrpark = user?.role === 'Fuhrparkmanager' || isAdmin;

    const publicCards = [
        { to: '/sonstiges/hausordnung', icon: Shield, title: 'Hausordnung', desc: 'Regeln & Richtlinien', color: 'amber' },
        { to: '/sonstiges/beginner-guide', icon: GraduationCap, title: 'Beginner Guide', desc: 'Einführung für neue Mitarbeiter', color: 'blue' },
        { to: '/sammel-event', icon: Trophy, title: 'Sammel-Event', desc: 'Team-Wettbewerb & Statistiken', color: 'amber' },
    ];

    const buchhaltungCards = [
        { to: '/kontrolle', icon: Search, title: 'Mitarbeiter Lager', desc: 'Kontrolle der MA-Bestände', color: 'emerald' },
    ];

    const adminCards = [
        { to: '/sonstiges/werbung', icon: Megaphone, title: 'Werbung', desc: 'Werbekampagnen verwalten', color: 'violet' },
        { to: '/sonstiges/kontakte', icon: Phone, title: 'Kontakte', desc: 'Kontaktdatenbank', color: 'emerald' },
        { to: '/sonstiges/partner', icon: Handshake, title: 'Partnerschaften', desc: 'Geschäftspartner', color: 'blue' },
        { to: '/sonstiges/personal', icon: Users, title: 'Personalliste', desc: 'Alle Mitarbeiter', color: 'amber' },
        { to: '/beleg', icon: FileText, title: 'Beleg erstellen', desc: 'Quittungen & Belege', color: 'emerald' },
        { to: '/marketing', icon: Calculator, title: 'Marketing Kalkulator', desc: 'Werbekosten berechnen', color: 'violet' },
    ];

    const fuhrparkCards = [
        { to: '/sonstiges/fuhrpark', icon: Car, title: 'Fuhrpark', desc: 'Fahrzeugverwaltung', color: 'cyan' },
    ];

    const colorClasses = {
        violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
        blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
        amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
        cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
    };

    return (
        <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 flex items-center gap-4">
                    <MoreHorizontal className="w-10 h-10 text-slate-400" />
                    Sonstiges
                </h1>
                <p className="text-slate-500 mt-2 text-lg">Weitere Tools und Ressourcen</p>
            </div>

            {/* Public Section - For Everyone */}
            <div>
                <h2 className="text-lg font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-500">
                    Allgemein
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {publicCards.map((card) => (
                        <Link
                            key={card.to}
                            to={card.to}
                            className="group relative bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all duration-200 hover:bg-slate-800/60"
                        >
                            <div className={`w-10 h-10 rounded-lg ${colorClasses[card.color].bg} ${colorClasses[card.color].border} border flex items-center justify-center mb-3`}>
                                <card.icon className={`w-5 h-5 ${colorClasses[card.color].text}`} />
                            </div>
                            <h3 className="font-semibold text-white mb-1">{card.title}</h3>
                            <p className="text-slate-500 text-sm">{card.desc}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Buchhaltung Section */}
            {isBuchhaltung && (
                <div>
                    <h2 className="text-lg font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                        Buchhaltung
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {buchhaltungCards.map((card) => (
                            <Link
                                key={card.to}
                                to={card.to}
                                className="group relative bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all duration-200 hover:bg-slate-800/60"
                            >
                                <div className={`w-10 h-10 rounded-lg ${colorClasses[card.color].bg} ${colorClasses[card.color].border} border flex items-center justify-center mb-3`}>
                                    <card.icon className={`w-5 h-5 ${colorClasses[card.color].text}`} />
                                </div>
                                <h3 className="font-semibold text-white mb-1">{card.title}</h3>
                                <p className="text-slate-500 text-sm">{card.desc}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Fuhrpark Section */}
            {isFuhrpark && (
                <div>
                    <h2 className="text-lg font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
                        Fuhrpark
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {fuhrparkCards.map((card) => (
                            <Link
                                key={card.to}
                                to={card.to}
                                className="group relative bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all duration-200 hover:bg-slate-800/60"
                            >
                                <div className={`w-10 h-10 rounded-lg ${colorClasses[card.color].bg} ${colorClasses[card.color].border} border flex items-center justify-center mb-3`}>
                                    <card.icon className={`w-5 h-5 ${colorClasses[card.color].text}`} />
                                </div>
                                <h3 className="font-semibold text-white mb-1">{card.title}</h3>
                                <p className="text-slate-500 text-sm">{card.desc}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Admin Section */}
            {isAdmin && (
                <div>
                    <h2 className="text-lg font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-500">
                        Administration
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {adminCards.map((card) => (
                            <Link
                                key={card.to}
                                to={card.to}
                                className="group relative bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all duration-200 hover:bg-slate-800/60"
                            >
                                <div className={`w-10 h-10 rounded-lg ${colorClasses[card.color].bg} ${colorClasses[card.color].border} border flex items-center justify-center mb-3`}>
                                    <card.icon className={`w-5 h-5 ${colorClasses[card.color].text}`} />
                                </div>
                                <h3 className="font-semibold text-white mb-1">{card.title}</h3>
                                <p className="text-slate-500 text-sm">{card.desc}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
