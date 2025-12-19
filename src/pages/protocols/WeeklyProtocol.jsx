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

        logs.filter(l =>
            l.itemName !== 'Korrektur Geschäftskonto' &&
            !l.msg?.includes('Korrektur Geschäftskonto') &&
            (l.price > 0 || l.price < 0) && // Exclude 0 price
            l.itemName && l.itemName !== 'Unbekannt'
        ).forEach(log => {
            const date = new Date(log.timestamp);
            const weekStart = getWeekStart(date);
            const key = weekStart.toISOString();

            if (!weeks[key]) {
                weeks[key] = {
                    label: getWeekRangeLabel(weekStart),
                    startDate: weekStart,
                    // Income
                    incomeTrade: Array(7).fill(0),
                    incomeOther: Array(7).fill(0),
                    totalIncomeTrade: 0,
                    totalIncomeOther: 0,
                    // Outcome
                    outcomeTrade: Array(7).fill(0),
                    outcomeWages: Array(7).fill(0),
                    totalOutcomeTrade: 0,
                    totalOutcomeWages: 0
                };
            }

            const day = date.getDay();
            const dayIndex = (day + 1) % 7; // Sat=0, Sun=1...

            // Value logic
            // We assume:
            // - Positive Trade -> Income (Verkauf)
            // - Negative Trade -> Outcome (Ankauf)
            // - Positive Non-Trade -> Income (Sonstige Einnahmen) - Rare?
            // - Negative Non-Trade -> Outcome (Lohn/Ausgaben)

            const value = (log.price || 0) * (log.quantity || 0);

            if (log.category === 'trade') {
                if (value >= 0) {
                    weeks[key].incomeTrade[dayIndex] += value;
                    weeks[key].totalIncomeTrade += value;
                } else {
                    weeks[key].outcomeTrade[dayIndex] += Math.abs(value); // Store positive for display, section is "Outcome"
                    weeks[key].totalOutcomeTrade += Math.abs(value);
                }
            } else {
                if (value >= 0) {
                    weeks[key].incomeOther[dayIndex] += value;
                    weeks[key].totalIncomeOther += value;
                } else {
                    weeks[key].outcomeWages[dayIndex] += Math.abs(value); // Store positive for display
                    weeks[key].totalOutcomeWages += Math.abs(value);
                }
            }
        });

        // Sort by date descending
        return Object.values(weeks).sort((a, b) => b.startDate - a.startDate);
    }, [logs]);

    const formatMoney = (amount) => amount === 0 ? '-' : amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const totalIncomeAllTime = processedData.reduce((acc, week) => acc + week.totalIncomeTrade + week.totalIncomeOther, 0);
    const totalOutcomeAllTime = processedData.reduce((acc, week) => acc + week.totalOutcomeTrade + week.totalOutcomeWages, 0);
    const totalBalance = totalIncomeAllTime - totalOutcomeAllTime;

    const weekDays = ['Samstag', 'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

    // Permission Check
    const isRestrictedView = user?.role === 'Lager' && user?.role !== 'Buchhaltung' && user?.role !== 'Administrator';

    return (
        <div className="animate-fade-in overflow-x-auto pb-12 space-y-12">

            {/* INCOME TABLE */}
            {!isRestrictedView && (
                <div>
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-2xl font-bold text-emerald-400">Einnahmen (Protokoll)</h2>
                    </div>
                    <div className="min-w-[1000px] border border-emerald-900/50 rounded-lg bg-slate-900/50 overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        {/* Header */}
                        <div className="grid grid-cols-[200px_120px_repeat(7,1fr)_120px] bg-emerald-950/30 text-emerald-500 font-bold text-xs uppercase border-b border-emerald-900/50">
                            <div className="p-3 border-r border-emerald-900/50 flex items-center">Datum (Sa-Fr)</div>
                            <div className="p-3 border-r border-emerald-900/50 flex items-center">Kategorie</div>
                            {weekDays.map((day, i) => (
                                <div key={i} className="p-3 border-r border-emerald-900/50 text-center bg-emerald-900/10 flex items-center justify-center">
                                    {day}
                                </div>
                            ))}
                            <div className="p-3 text-right flex items-center justify-end bg-emerald-900/20 text-emerald-300">
                                Gesamt
                            </div>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-emerald-900/30">
                            {processedData.map((week, idx) => (
                                <div key={idx} className="group">
                                    {/* Verkauf Row */}
                                    <div className="grid grid-cols-[200px_120px_repeat(7,1fr)_120px] bg-slate-800/20 hover:bg-emerald-900/10 transition-colors border-b border-emerald-900/30">
                                        <div className="p-3 text-slate-300 font-medium border-r border-emerald-900/50 flex items-center row-span-2 bg-slate-900/30">
                                            {week.label}
                                        </div>
                                        <div className="p-2 border-r border-emerald-900/50 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase tracking-wider">
                                            Verkauf
                                        </div>
                                        {week.incomeTrade.map((val, i) => (
                                            <div key={i} className="p-2 border-r border-emerald-900/50 text-right text-slate-300 text-sm flex items-center justify-end">
                                                {formatMoney(val)}
                                            </div>
                                        ))}
                                        <div className="p-2 font-bold text-emerald-400 text-right flex items-center justify-end bg-emerald-900/10">
                                            {formatMoney(week.totalIncomeTrade)}
                                        </div>
                                    </div>

                                    {/* Sonstige Row (only if relevant, but keeping structure consistent) */}
                                    {(week.totalIncomeOther > 0) && (
                                        <div className="grid grid-cols-[200px_120px_repeat(7,1fr)_120px] bg-slate-800/20 hover:bg-emerald-900/10 transition-colors">
                                            {/* Date column spanned (hidden effectively) */}
                                            <div className="col-start-2 p-2 border-r border-emerald-900/50 flex items-center justify-center text-emerald-600/70 font-bold text-xs uppercase tracking-wider">
                                                Sonstige
                                            </div>
                                            {week.incomeOther.map((val, i) => (
                                                <div key={i} className="p-2 border-r border-emerald-900/50 text-right text-slate-400 text-sm flex items-center justify-end">
                                                    {formatMoney(val)}
                                                </div>
                                            ))}
                                            <div className="p-2 font-bold text-emerald-600/70 text-right flex items-center justify-end bg-emerald-900/5">
                                                {formatMoney(week.totalIncomeOther)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {processedData.length === 0 && (
                                <div className="p-8 text-center text-slate-500">Keine Einnahmen vorhanden.</div>
                            )}
                        </div>
                        {/* Footer Total Income */}
                        <div className="grid grid-cols-[200px_120px_repeat(7,1fr)_120px] bg-emerald-950/50 border-t-2 border-emerald-800">
                            <div className="col-span-10 p-3 text-right font-bold text-emerald-400 uppercase tracking-wider">
                                Gesamt Einnahmen
                            </div>
                            <div className="p-3 text-right font-bold text-white bg-emerald-600/20">
                                {formatMoney(totalIncomeAllTime)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* OUTCOME TABLE */}
            <div>
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-2xl font-bold text-red-400">Ausgaben (Protokoll)</h2>
                </div>
                <div className="min-w-[1000px] border border-red-900/50 rounded-lg bg-slate-900/50 overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    {/* Header */}
                    <div className="grid grid-cols-[200px_120px_repeat(7,1fr)_120px] bg-red-950/30 text-red-500 font-bold text-xs uppercase border-b border-red-900/50">
                        <div className="p-3 border-r border-red-900/50 flex items-center">Datum (Sa-Fr)</div>
                        <div className="p-3 border-r border-red-900/50 flex items-center">Kategorie</div>
                        {weekDays.map((day, i) => (
                            <div key={i} className="p-3 border-r border-red-900/50 text-center bg-red-900/10 flex items-center justify-center">
                                {day}
                            </div>
                        ))}
                        <div className="p-3 text-right flex items-center justify-end bg-red-900/20 text-red-300">
                            Gesamt
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-red-900/30">
                        {processedData.map((week, idx) => (
                            <div key={idx} className="group">
                                {/* Ankauf Row - Only if NOT restricted or specific rule? Assuming Lagerist might need to see purchasing? 
                                    Actually original code hid "Kunden" (Trade) from restricted view completely.
                                    So if Restricted View is true, they DO NOT SEE Trade purchases either.
                                */}
                                {!isRestrictedView && (
                                    <div className="grid grid-cols-[200px_120px_repeat(7,1fr)_120px] bg-slate-800/20 hover:bg-red-900/10 transition-colors border-b border-red-900/30">
                                        <div className="p-3 text-slate-300 font-medium border-r border-red-900/50 flex items-center row-span-2 bg-slate-900/30">
                                            {week.label}
                                        </div>
                                        <div className="p-2 border-r border-red-900/50 flex items-center justify-center text-red-400 font-bold text-xs uppercase tracking-wider">
                                            Ankauf
                                        </div>
                                        {week.outcomeTrade.map((val, i) => (
                                            <div key={i} className="p-2 border-r border-red-900/50 text-right text-slate-300 text-sm flex items-center justify-end">
                                                {formatMoney(val)}
                                            </div>
                                        ))}
                                        <div className="p-2 font-bold text-red-400 text-right flex items-center justify-end bg-red-900/10">
                                            {formatMoney(week.totalOutcomeTrade)}
                                        </div>
                                    </div>
                                )}

                                {/* Lohn/Ausgaben Row */}
                                <div className="grid grid-cols-[200px_120px_repeat(7,1fr)_120px] bg-slate-800/20 hover:bg-red-900/10 transition-colors">
                                    {isRestrictedView && (
                                        <div className="p-3 text-slate-300 font-medium border-r border-red-900/50 flex items-center bg-slate-900/30">
                                            {week.label}
                                        </div>
                                    )}
                                    <div className={`p-2 border-r border-red-900/50 flex items-center justify-center text-orange-400/80 font-bold text-xs uppercase tracking-wider ${!isRestrictedView ? 'col-start-2' : ''}`}>
                                        Löhne / Sonst
                                    </div>
                                    {week.outcomeWages.map((val, i) => (
                                        <div key={i} className="p-2 border-r border-red-900/50 text-right text-slate-300 text-sm flex items-center justify-end">
                                            {formatMoney(val)}
                                        </div>
                                    ))}
                                    <div className="p-2 font-bold text-orange-400/80 text-right flex items-center justify-end bg-orange-900/10">
                                        {formatMoney(week.totalOutcomeWages)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Footer Total Outcome */}
                    <div className="grid grid-cols-[200px_120px_repeat(7,1fr)_120px] bg-red-950/50 border-t-2 border-red-800">
                        <div className="col-span-10 p-3 text-right font-bold text-red-400 uppercase tracking-wider">
                            Gesamt Ausgaben
                        </div>
                        <div className="p-3 text-right font-bold text-white bg-red-600/20">
                            {formatMoney(totalOutcomeAllTime)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Total Overall - Only if not restricted */}
            {!isRestrictedView && (
                <div className="flex justify-end pt-8 border-t border-slate-700">
                    <div className="bg-slate-900 rounded-lg p-6 border border-slate-700 min-w-[300px]">
                        <h3 className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-4 border-b border-slate-700 pb-2">Gesamtbilanz</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-emerald-400">Einnahmen:</span>
                                <span className="text-emerald-400 font-mono">{formatMoney(totalIncomeAllTime)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-red-400">Ausgaben:</span>
                                <span className="text-red-400 font-mono">-{formatMoney(totalOutcomeAllTime)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold pt-2 border-t border-slate-700">
                                <span className="text-slate-200">Profit:</span>
                                <span className={totalBalance >= 0 ? "text-emerald-400" : "text-red-400"}>
                                    {formatMoney(totalBalance)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
