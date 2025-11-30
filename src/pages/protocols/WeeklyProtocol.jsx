import React, { useMemo } from 'react';

export default function WeeklyProtocol({ logs, user }) {

    // Helper to get the Saturday that starts the week for a given date
    const getWeekStart = (date) => {
        const d = new Date(date);
        const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        // If day is Sat (6), diff is 0.
        // If day is Fri (5), diff is -6.
        // If day is Sun (0), diff is -1.
        const diff = day === 6 ? 0 : -(day + 1);
        const saturday = new Date(d);
        saturday.setDate(d.getDate() + diff);
        saturday.setHours(0, 0, 0, 0);
        return saturday;
    };

    const getWeekRangeLabel = (startDate) => {
        const end = new Date(startDate);
        end.setDate(end.getDate() + 6); // Friday
        return `${startDate.getDate()}.${startDate.getMonth() + 1}.${startDate.getFullYear().toString().slice(-2)} - ${end.getDate()}.${end.getMonth() + 1}.${end.getFullYear().toString().slice(-2)}`;
    };

    const processedData = useMemo(() => {
        const weeks = {};

        logs.forEach(log => {
            const date = new Date(log.timestamp);
            const weekStart = getWeekStart(date);
            const key = weekStart.toISOString();

            if (!weeks[key]) {
                weeks[key] = {
                    label: getWeekRangeLabel(weekStart),
                    startDate: weekStart,
                    kunden: Array(7).fill(0), // Sat-Fri
                    angestellte: Array(7).fill(0),
                    totalKunden: 0,
                    totalAngestellte: 0
                };
            }

            // Map day to index 0-6 (Sat-Fri)
            // Sat=6 -> 0
            // Sun=0 -> 1
            // Mon=1 -> 2
            // ...
            // Fri=5 -> 6
            const day = date.getDay();
            const dayIndex = (day + 1) % 7;

            const value = (log.price || 0) * (log.quantity || 0);

            if (log.category === 'trade') {
                weeks[key].kunden[dayIndex] += value;
                weeks[key].totalKunden += value;
            } else {
                weeks[key].angestellte[dayIndex] += value;
                weeks[key].totalAngestellte += value;
            }
        });

        // Sort by date descending
        return Object.values(weeks).sort((a, b) => b.startDate - a.startDate);
    }, [logs]);

    const formatMoney = (amount) => amount === 0 ? '-' : amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const totalAllTime = processedData.reduce((acc, week) => acc + week.totalKunden + week.totalAngestellte, 0);

    const weekDays = ['Samstag', 'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

    // Permission Check
    const isRestrictedView = user?.role === 'Lager' && user?.role !== 'Buchhaltung' && user?.role !== 'Administrator';

    // Calculate Outstanding Wages (Past Weeks)
    const now = new Date();
    const outstandingWeeks = processedData.filter(week => {
        const weekEnd = new Date(week.startDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59);
        return weekEnd < now && week.totalAngestellte > 0;
    });

    const outstandingTotal = outstandingWeeks.reduce((acc, week) => acc + week.totalAngestellte, 0);

    return (
        <div className="animate-fade-in overflow-x-auto pb-12">
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-slate-200">Wochenprotokolle (Übersicht)</h2>


            </div>

            <div className="min-w-[1000px] border border-slate-700 rounded-lg bg-slate-900/50 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[200px_120px_repeat(7,1fr)_120px] bg-slate-900 text-slate-400 font-bold text-xs uppercase border-b border-slate-700">
                    <div className="p-3 border-r border-slate-700 flex items-center">Datum (Sa-Fr)</div>
                    <div className="p-3 border-r border-slate-700 flex items-center">Kategorie</div>
                    {weekDays.map((day, i) => (
                        <div key={i} className="p-3 border-r border-slate-700 text-center bg-slate-800/50 flex items-center justify-center">
                            {day}
                        </div>
                    ))}
                    <div className="p-3 text-right flex items-center justify-end bg-slate-800 text-slate-200">
                        Gesamt
                    </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-700">
                    {processedData.map((week, idx) => (
                        <div key={idx} className="group">
                            {/* Kunden Row - Hidden for Restricted View */}
                            {!isRestrictedView && (
                                <div className="grid grid-cols-[200px_120px_repeat(7,1fr)_120px] bg-slate-800/20 hover:bg-slate-800/40 transition-colors border-b border-slate-700/50">
                                    <div className="p-3 text-slate-300 font-medium border-r border-slate-700 flex items-center row-span-2 bg-slate-900/30">
                                        {week.label}
                                    </div>
                                    <div className="p-2 border-r border-slate-700 flex items-center justify-center bg-blue-900/20 text-blue-400 font-bold text-xs uppercase tracking-wider">
                                        Kunden
                                    </div>
                                    {week.kunden.map((val, i) => (
                                        <div key={i} className="p-2 border-r border-slate-700 text-right text-slate-300 text-sm flex items-center justify-end">
                                            {formatMoney(val)}
                                        </div>
                                    ))}
                                    <div className="p-2 font-bold text-blue-400 text-right flex items-center justify-end bg-blue-900/10">
                                        {formatMoney(week.totalKunden)}
                                    </div>
                                </div>
                            )}

                            {/* Angestellte Row */}
                            <div className="grid grid-cols-[200px_120px_repeat(7,1fr)_120px] bg-slate-800/20 hover:bg-slate-800/40 transition-colors">
                                {/* Date column is spanned or shown if restricted */}
                                {isRestrictedView && (
                                    <div className="p-3 text-slate-300 font-medium border-r border-slate-700 flex items-center bg-slate-900/30">
                                        {week.label}
                                    </div>
                                )}
                                <div className={`p-2 border-r border-slate-700 flex items-center justify-center bg-emerald-900/20 text-emerald-400 font-bold text-xs uppercase tracking-wider ${!isRestrictedView ? 'col-start-2' : ''}`}>
                                    Angestellte
                                </div>
                                {week.angestellte.map((val, i) => (
                                    <div key={i} className="p-2 border-r border-slate-700 text-right text-slate-300 text-sm flex items-center justify-end">
                                        {formatMoney(val)}
                                    </div>
                                ))}
                                <div className="p-2 font-bold text-emerald-400 text-right flex items-center justify-end bg-emerald-900/10 gap-2">
                                    {formatMoney(week.totalAngestellte)}

                                </div>
                            </div>
                        </div>
                    ))}

                    {processedData.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            Keine Daten vorhanden.
                        </div>
                    )}
                </div>

                {/* Footer Total - Hidden for Restricted View */}
                {!isRestrictedView && (
                    <div className="grid grid-cols-[200px_120px_repeat(7,1fr)_120px] bg-slate-900 border-t-2 border-slate-600">
                        <div className="col-span-10 p-3 text-right font-bold text-slate-400 uppercase tracking-wider">
                            Gesamtbilanz
                        </div>
                        <div className="p-3 text-right font-bold text-white bg-violet-600/20">
                            {formatMoney(totalAllTime)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
