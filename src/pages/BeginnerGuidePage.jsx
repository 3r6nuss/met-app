import React from 'react';
import { BookOpen, Users, Radio, LogOut, Heart, Truck, MapPin, AlertTriangle } from 'lucide-react';

export default function BeginnerGuidePage() {
    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 pb-32 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="glass-panel p-8 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-slate-900/90 to-slate-800/90 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 mb-2">
                            M.E.T. LOGISTIC
                        </h1>
                        <p className="text-xl text-slate-300 font-medium tracking-wide">QUICK-START-GUIDE</p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl">
                        <img src="/logo.png" alt="MET Logo" className="w-24 h-24 object-contain" />
                    </div>
                </div>
            </div>

            {/* Ansprechpartner */}
            <section className="glass-panel p-6 rounded-2xl border-l-4 border-violet-500">
                <h2 className="text-2xl font-bold text-violet-300 mb-4 flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    Ansprechpartner
                </h2>
                <ul className="space-y-2 text-slate-300 ml-2">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>Emil Bergmann - CEO</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>Patrick Miller - Stv. Leitung</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>Emma West - Stv. Leitung</li>
                </ul>
            </section>

            {/* Einstempeln und Funk */}
            <section className="glass-panel p-6 rounded-2xl border-l-4 border-fuchsia-500">
                <h2 className="text-2xl font-bold text-fuchsia-300 mb-4 flex items-center gap-2">
                    <Radio className="w-6 h-6" />
                    Einstempeln und Funk
                </h2>
                <ul className="space-y-3 text-slate-300 ml-2">
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 mt-2"></span>
                        <span><strong>Einstempeln:</strong> F5 - Job/Fraktion - Multijob Menü</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 mt-2"></span>
                        <span><strong>Zeiterfassung:</strong> F5 - Job/Fraktion - Dutymenü</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 mt-2"></span>
                        <span><strong>Funk:</strong> Handy öffnen - Funk-App öffnen - <strong>192.11</strong> oben eingeben - verbinden</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 mt-2"></span>
                        <span><strong>GPS:</strong> Rechtsklick auf das GPS-Gerät - <strong>19211</strong> eingeben - Schalter nach rechts Stellen - Verbinden</span>
                    </li>
                </ul>
            </section>

            {/* Abmeldung */}
            <section className="glass-panel p-6 rounded-2xl border-l-4 border-red-400">
                <h2 className="text-2xl font-bold text-red-300 mb-4 flex items-center gap-2">
                    <LogOut className="w-6 h-6" />
                    Abmeldung
                </h2>
                <ul className="space-y-2 text-slate-300 ml-2">
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2"></span>
                        <span>Wenn du weißt, dass du nicht da sein wirst, melde dich bitte ab in "Abmeldungen".</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2"></span>
                        <span>Bei spontan auftretenden Ereignissen bitte ab dem 3. Tag abmelden.</span>
                    </li>
                </ul>
            </section>

            {/* Umgang miteinander */}
            <section className="glass-panel p-6 rounded-2xl border-l-4 border-pink-500">
                <h2 className="text-2xl font-bold text-pink-300 mb-4 flex items-center gap-2">
                    <Heart className="w-6 h-6" />
                    Umgang miteinander
                </h2>
                <p className="text-lg font-semibold text-red-400 mb-4">Wir sehen uns als eine Familie. Das bedeutet:</p>
                <ul className="space-y-2 text-slate-300 ml-2">
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2"></span>Wir unterstützen uns gegenseitig.</li>
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2"></span>Wir reden offen, aber respektvoll miteinander.</li>
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2"></span>Probleme werden intern angesprochen und gemeinsam gelöst.</li>
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2"></span>Wir lassen einander aussprechen und fallen niemandem ins Wort.</li>
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2"></span>Unstimmigkeiten werden friedlich geklärt.</li>
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2"></span>Private Auseinandersetzungen haben im beruflichen Umfeld nichts zu suchen.</li>
                </ul>
            </section>

            {/* Umgang mit Fahrzeugen */}
            <section className="glass-panel p-6 rounded-2xl border-l-4 border-blue-500">
                <h2 className="text-2xl font-bold text-blue-300 mb-4 flex items-center gap-2">
                    <Truck className="w-6 h-6" />
                    Umgang mit Fahrzeugen
                </h2>
                <ul className="space-y-2 text-slate-300 ml-2">
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></span>
                        <span>Keine riskante Fahrweise oder unnötige Beschädigungen.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></span>
                        <span>Fahrzeuge werden ordnungsgemäß abgestellt und nicht unbeaufsichtigt herum stehen gelassen.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></span>
                        <span className="font-semibold text-red-400">➜ Fehlverhalten führt zu Sanktionen.</span>
                    </li>
                </ul>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sammelorte */}
                <section className="glass-panel p-6 rounded-2xl border-l-4 border-emerald-500">
                    <h2 className="text-2xl font-bold text-emerald-300 mb-4 flex items-center gap-2">
                        <MapPin className="w-6 h-6" />
                        Sammelorte
                    </h2>
                    <ul className="space-y-2 text-slate-300 ml-2">
                        <li className="flex justify-between border-b border-slate-800 pb-1"><span>Aramid</span> <span className="font-mono text-emerald-400">862</span></li>
                        <li className="flex justify-between border-b border-slate-800 pb-1"><span>Schwarzpulver</span> <span className="font-mono text-emerald-400">961</span></li>
                        <li className="flex justify-between border-b border-slate-800 pb-1"><span>Tabak Blätter</span> <span className="font-mono text-emerald-400">2039</span></li>
                        <li className="flex justify-between border-b border-slate-800 pb-1"><span>Kohle</span> <span className="font-mono text-emerald-400">4014</span></li>
                        <li className="flex justify-between border-b border-slate-800 pb-1"><span>Weintrauben</span> <span className="font-mono text-emerald-400">5008</span></li>
                        <li className="flex justify-between border-b border-slate-800 pb-1"><span>E-Schrott</span> <span className="font-mono text-emerald-400">9253</span></li>
                        <li className="flex justify-between"><span>Eisen</span> <span className="font-mono text-emerald-400">9005</span></li>
                    </ul>
                </section>

                {/* Herstellungsorte */}
                <section className="glass-panel p-6 rounded-2xl border-l-4 border-amber-500">
                    <h2 className="text-2xl font-bold text-amber-300 mb-4 flex items-center gap-2">
                        <MapPin className="w-6 h-6" />
                        Herstellungsorte
                    </h2>
                    <ul className="space-y-2 text-slate-300 ml-2">
                        <li className="flex justify-between border-b border-slate-800 pb-1"><span>P-Clips</span> <span className="font-mono text-amber-400">710</span></li>
                        <li className="flex justify-between border-b border-slate-800 pb-1"><span>Tabak</span> <span className="font-mono text-amber-400">2002</span></li>
                        <li className="flex justify-between border-b border-slate-800 pb-1"><span>Weinkisten</span> <span className="font-mono text-amber-400">5001</span></li>
                        <li className="flex justify-between border-b border-slate-800 pb-1"><span>Stahl</span> <span className="font-mono text-amber-400">10072</span></li>
                        <li className="flex justify-between border-b border-slate-800 pb-1"><span>Platinen</span> <span className="font-mono text-amber-400">10072</span></li>
                        <li className="flex justify-between"><span>Westen</span> <span className="font-mono text-amber-400">10099</span></li>
                    </ul>
                </section>
            </div>

            {/* Was tun, wenn...? */}
            <section className="glass-panel p-6 rounded-2xl border-l-4 border-cyan-500">
                <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6" />
                    Was tun, wenn...?
                </h2>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-red-400 mb-2">
                            ... dein Fahrzeug voll ist und niemand anwesend ist, mit dem du die Ware einlagern kannst?
                        </h3>
                        <p className="text-emerald-400/90 leading-relaxed pl-4 border-l-2 border-emerald-500/30">
                            Dann kannst du dir einen LKW ausparken, der als Frei in der Job Garage gekennzeichnet ist.
                            Und mit diesem Weiterarbeiten. Falls kein LKW mehr frei sein sollte, kannst du dir einen LKW
                            von einem Kollegen ausparken. Bitte Informiere diesen per SMS darüber.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-red-400 mb-2">
                            ... du alleine im Dienst bist und jemand bezüglich An- und Verkaufen anruft?
                        </h3>
                        <p className="text-emerald-400/90 leading-relaxed pl-4 border-l-2 border-emerald-500/30">
                            Dann sagst du der Person die Anruft, dass sie bitte später noch einmal anrufen soll, da
                            momentan keiner da ist, der Ankaufen kann.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
