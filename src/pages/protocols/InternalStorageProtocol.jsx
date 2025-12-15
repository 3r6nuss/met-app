import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Banknote, AlertCircle } from 'lucide-react';

export default function InternalStorageProtocol({ logs, user, employees, onPayout }) {
    const [weekOffset, setWeekOffset] = useState(0);

    // Helpers for Date Management
    const getWeekRange = (offset) => {
        const now = new Date();
        const day = now.getDay(); // 0=Sun, 6=Sat
        // Adjust to make Saturday the start of the week
        // If today is Sunday (0), we want previous Sat (-1). If Sat (6), we want today (0).
        const diffToSaturday = day === 6 ? 0 : -(day + 1);

        const startOfCurrentWeek = new Date(now);
        startOfCurrentWeek.setDate(now.getDate() + diffToSaturday);
        startOfCurrentWeek.setHours(0, 0, 0, 0);

        // Apply offset
        const start = new Date(startOfCurrentWeek);
        start.setDate(start.getDate() + (offset * 7));

        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    };

    const { start: viewStart, end: viewEnd } = getWeekRange(weekOffset);

    // Helper: Format Money
    const formatMoney = (amount) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    // 0. Valid Employees Set
    const validEmployeeNames = useMemo(() => {
        if (!employees) return new Set();
        return new Set(employees.map(e => e.name));
    }, [employees]);

    // 1. Filter Logs: Category 'internal' AND Action 'in' (Einlagerung) OR 'Auszahlung'
    // We need all history to calculate "Open Status", but we only DISPLAY the view week.
    const relevantLogs = useMemo(() => {
        return logs.filter(l =>
            ((l.category === 'internal' && l.type === 'in') ||
                (l.itemName === 'Auszahlung' && l.category === 'internal')) &&
            (validEmployeeNames.size === 0 || validEmployeeNames.has(l.depositor))
        );
    }, [logs, validEmployeeNames]);

    // 2. Calculate Open Balances (Global)
    const employeeBalances = useMemo(() => {
        const balances = {};
        const payouts = {};

        // First find last payout for each employee
        relevantLogs.forEach(log => {
            if (log.itemName === 'Auszahlung') {
                if (!payouts[log.depositor] || log.timestamp > payouts[log.depositor]) {
                    payouts[log.depositor] = log.timestamp;
                }
            }
        });

        // Calculate unpaid amounts
        relevantLogs.forEach(log => {
            if (log.itemName !== 'Auszahlung') {
                const isPaid = payouts[log.depositor] && log.timestamp <= payouts[log.depositor];
                if (!isPaid) {
                    const val = (log.price || 0) * (log.quantity || 0);
                    balances[log.depositor] = (balances[log.depositor] || 0) + val;
                }
            }
        });

        return balances;
    }, [relevantLogs]);

    // 3. Prepare View Data (For the selected week)
    const viewData = useMemo(() => {
        const groups = {};

        // Filter logs for the VIEW timeframe
        const logsInView = relevantLogs.filter(log => {
            const d = new Date(log.timestamp);
            return d >= viewStart && d <= viewEnd && log.itemName !== 'Auszahlung';
        });

        // Also just for checking "isPaid" status relative to ALL TIME
        // We re-calculate last payouts just for the status check in the view
        const lastPayouts = {};
        relevantLogs.forEach(log => {
            if (log.itemName === 'Auszahlung') {
                if (!lastPayouts[log.depositor] || log.timestamp > lastPayouts[log.depositor]) {
                    lastPayouts[log.depositor] = log.timestamp;
                }
            }
        });

        logsInView.forEach(log => {
            if (!groups[log.depositor]) {
                groups[log.depositor] = {
                    name: log.depositor,
                    logs: [],
                    totalWage: 0
                };
            }

            const val = (log.price || 0) * (log.quantity || 0);
            const isPaid = lastPayouts[log.depositor] && log.timestamp <= lastPayouts[log.depositor];

            groups[log.depositor].logs.push({
                ...log,
                val,
                isPaid
            });
            groups[log.depositor].totalWage += val;
        });

        // Sort by name
        return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
    }, [relevantLogs, viewStart, viewEnd]);

    // WEEK DAYS headers
    const weekDays = [
        { label: 'Samstag', date: new Date(viewStart) },
        { label: 'Sonntag', date: new Date(viewStart) },
        { label: 'Montag', date: new Date(viewStart) },
        { label: 'Dienstag', date: new Date(viewStart) },
        { label: 'Mittwoch', date: new Date(viewStart) },
        { label: 'Donnerstag', date: new Date(viewStart) },
        { label: 'Freitag', date: new Date(viewStart) },
    ];
    // Adjust dates for headers
    weekDays.forEach((d, i) => d.date.setDate(d.date.getDate() + i));

    const totalOpenBalance = Object.values(employeeBalances).reduce((a, b) => a + b, 0);

    return (
        <div className="animate-fade-in pb-12">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
                        <Banknote className="w-6 h-6 text-emerald-400" />
                        Internes Lagerprotokoll (Lohn)
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Einlagerungen (Internal) und Lohnberechnung</p>
                </div>

                {/* Week Navigation */}
                <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                    <button
                        onClick={() => setWeekOffset(prev => prev - 1)}
                        className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center min-w-[200px]">
                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Woche</div>
                        <div className="text-slate-200 font-medium">
                            {viewStart.toLocaleDateString()} - {viewEnd.toLocaleDateString()}
                        </div>
                        {weekOffset === 0 && <span className="text-[10px] text-emerald-400 font-bold">AKTUELLE WOCHE</span>}
                    </div>
                    <button
                        onClick={() => setWeekOffset(prev => prev + 1)}
                        disabled={weekOffset >= 0}
                        className={`p-2 rounded transition-colors ${weekOffset >= 0 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Total Open Logic */}
                {(user?.role === 'Administrator' || user?.role === 'Buchhaltung') && (
                    <div className="flex flex-col items-end bg-slate-900/50 p-3 rounded border border-slate-700">
                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Gesamt Offen (Alle MA)</span>
                        <span className="text-xl font-bold text-red-400">{formatMoney(totalOpenBalance)}</span>
                    </div>
                )}
            </div>

            {/* Main Table */}
            <div className="border border-slate-700 rounded-lg bg-slate-900/50 overflow-hidden">
                <div className="grid grid-cols-[200px_repeat(7,1fr)_150px] bg-slate-900 text-slate-400 font-bold text-xs uppercase border-b border-slate-700 sticky top-0 z-10">
                    <div className="p-3 border-r border-slate-700 flex items-center">Mitarbeiter</div>
                    {weekDays.map((day, i) => (
                        <div key={i} className={`p-3 border-r border-slate-700 text-center ${day.date.toDateString() === new Date().toDateString() ? 'bg-violet-900/20 text-violet-300' : 'bg-slate-800/50'}`}>
                            <div>{day.label}</div>
                            <div className="text-[10px] opacity-60">{day.date.getDate()}.{day.date.getMonth() + 1}.</div>
                        </div>
                    ))}
                    <div className="p-3 text-right flex flex-col justify-center bg-emerald-900/10 text-emerald-400">
                        <span>Lohn / Aktionen</span>
                    </div>
                </div>

                <div className="divide-y divide-slate-700">
                    {viewData.map((emp, idx) => {
                        const openBalance = employeeBalances[emp.name] || 0;

                        return (
                            <div key={idx} className="grid grid-cols-[200px_repeat(7,1fr)_150px] bg-slate-800/30 hover:bg-slate-800/60 transition-colors">
                                <div className="p-3 font-bold text-slate-200 border-r border-slate-700 flex flex-col justify-center">
                                    <span>{emp.name}</span>
                                </div>

                                {weekDays.map((day, dIdx) => {
                                    const dayLogs = emp.logs.filter(l => {
                                        const ld = new Date(l.timestamp);
                                        return ld.toDateString() === day.date.toDateString();
                                    });

                                    const dayTotal = dayLogs.reduce((sum, l) => sum + l.val, 0);

                                    return (
                                        <div key={dIdx} className="p-2 border-r border-slate-700 min-h-[60px] flex flex-col justify-between">
                                            <div className="space-y-1">
                                                {dayLogs.map((l, lIdx) => (
                                                    <div key={lIdx} className={`text-[10px] px-1.5 py-0.5 rounded bg-slate-900 flex justify-between gap-1 items-center ${l.isPaid ? 'text-emerald-500/70 border border-emerald-900/30' : 'text-slate-300 border border-slate-700'}`}>
                                                        <span className="truncate max-w-[80px]" title={l.itemName}>{l.itemName}</span>
                                                        <span className="font-mono">{l.quantity}x</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {dayTotal > 0 && (
                                                <div className="mt-2 text-right text-xs font-bold text-emerald-400/80 border-t border-slate-700/50 pt-1">
                                                    {formatMoney(dayTotal)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <div className="p-2 flex flex-col gap-2 justify-center items-end bg-slate-900/20">
                                    <div className="text-right">
                                        <div className="text-[10px] text-slate-500 uppercase">Offen (Gesamt)</div>
                                        <div className={`font-bold ${openBalance > 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                                            {formatMoney(openBalance)}
                                        </div>
                                    </div>

                                    {(user?.role === 'Administrator' || user?.role === 'Buchhaltung') && openBalance > 0 && (
                                        <div className="flex flex-col gap-1 w-full mt-1">
                                            {/* Payout Last Week (Until Friday of VIEWED WEEK or PREVIOUS WEEK?) 
                                                User said: 'wieder die Letzte wiche (bis freitags) auszuzahlen'
                                                Typically means 'Payout everything UP TO the Friday of the Last Completed Week'.
                                                Or if we are viewing a past week, payout up to THAT Friday?
                                                Let's implementation 'Until Last Friday Relative to TODAY' for safety/clarity as requested.
                                            */}
                                            <button
                                                onClick={() => {
                                                    // Date of Last Friday relative to TODAY
                                                    const today = new Date();
                                                    const day = today.getDay();
                                                    const diff = (day + 2) % 7;
                                                    // Friday is 5. 
                                                    // If today is Friday (5), last Friday was today? Or week before?
                                                    // "Letzte Woche (bis freitags)" usually implies the Friday of the previous week.

                                                    // Logic: Current Week Start (Sat) - 1 day = Last Friday.
                                                    const currentWeekSat = new Date();
                                                    const d = currentWeekSat.getDay(); // 0-6
                                                    const diffToSat = d === 6 ? 0 : -(d + 1);
                                                    currentWeekSat.setDate(currentWeekSat.getDate() + diffToSat);
                                                    currentWeekSat.setHours(0, 0, 0, 0);

                                                    const lastFriday = new Date(currentWeekSat);
                                                    lastFriday.setDate(lastFriday.getDate() - 1);
                                                    lastFriday.setHours(23, 59, 59);

                                                    if (confirm(`${emp.name}: Alles bis letzten Freitag (${lastFriday.toLocaleDateString()}) auszahlen?`)) {
                                                        const amountToPay = 0; // We don't know the exact amount easily here without filtering again.
                                                        // Actually, we pass the AMOUNT calculation to the server or just logs?
                                                        // DailyEmployeeLog passes Amount.
                                                        // We need to calculate amount up to that date.

                                                        const logsUntilFri = relevantLogs.filter(l => {
                                                            const isInternalIn = l.category === 'internal' && l.type === 'in' && l.itemName !== 'Auszahlung';
                                                            const logDate = new Date(l.timestamp);
                                                            return isInternalIn && logDate <= lastFriday && log.depositor === emp.name;
                                                        });

                                                        // Check if paid
                                                        const amount = logsUntilFri.reduce((sum, l) => {
                                                            // We need to check if THIS specific log was paid by an older payout?
                                                            // Or we assume if we are paying "Until Last Friday", we pay everything that isn't paid.
                                                            // This requires knowing the previous payout date.

                                                            // Re-find last payout for this employee
                                                            let lastPayDate = null;
                                                            relevantLogs.forEach(rl => {
                                                                if (rl.depositor === emp.name && rl.itemName === 'Auszahlung') {
                                                                    if (!lastPayDate || rl.timestamp > lastPayDate) lastPayDate = rl.timestamp;
                                                                }
                                                            });

                                                            if (lastPayDate && l.timestamp <= lastPayDate) return sum;
                                                            return sum + ((l.price || 0) * (l.quantity || 0));
                                                        }, 0);

                                                        if (amount <= 0) {
                                                            alert("Keine offenen Beträge bis letzten Freitag.");
                                                            return;
                                                        }

                                                        onPayout(amount, lastFriday, emp.name);
                                                    }
                                                }}
                                                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] py-1 px-2 rounded transition-colors text-center"
                                                title="Zahlt alles bis zum letzten Freitag aus"
                                            >
                                                Bis letzte Woche (Fr)
                                            </button>

                                            <button
                                                onClick={() => {
                                                    if (confirm(`${emp.name}: Kompletten offenen Betrag (${formatMoney(openBalance)}) auszahlen?`)) {
                                                        onPayout(openBalance, null, emp.name); // null date = NOW
                                                    }
                                                }}
                                                className="bg-emerald-900 hover:bg-emerald-800 text-emerald-400 text-[10px] py-1 px-2 rounded transition-colors text-center"
                                                title="Zahlt den gesamten offenen Betrag aus"
                                            >
                                                Alles auszahlen
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {viewData.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            Keine Einlagerungen in dieser Woche.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
