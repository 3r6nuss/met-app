import React, { useMemo } from 'react';
import { Check } from 'lucide-react';

export default function DailyEmployeeLog({ logs, user, onPayout }) {
    // Helper to get current week start (Saturday)
    const getCurrentWeekStart = () => {
        const now = new Date();
        const day = now.getDay(); // 0=Sun, 6=Sat
        const diff = day === 6 ? 0 : -(day + 1);
        const saturday = new Date(now);
        saturday.setDate(now.getDate() + diff);
        saturday.setHours(0, 0, 0, 0);
        return saturday;
    };

    const currentWeekStart = getCurrentWeekStart();

    // Split logs into Current Week and Past Weeks (Outstanding)
    const { currentLogs, pastLogs } = useMemo(() => {
        const current = [];
        const past = [];
        logs.forEach(log => {
            const date = new Date(log.timestamp);
            if (date >= currentWeekStart) {
                current.push(log);
            } else {
                past.push(log);
            }
        });
        return { currentLogs: current, pastLogs: past };
    }, [logs, currentWeekStart]);

    // Calculate Outstanding Wages (Past Weeks)
    const outstandingData = useMemo(() => {
        const groups = {};
        pastLogs.filter(log => log.category !== 'trade').forEach(log => {
            // Filter by user permissions
            const isPrivileged = ['Administrator', 'Buchhaltung', 'Lager'].includes(user?.role);
            if (!isPrivileged && log.depositor !== user.employeeName) {
                return;
            }

            if (!groups[log.depositor]) groups[log.depositor] = 0;
            const value = (log.price || 0) * (log.quantity || 0);
            groups[log.depositor] += value;
        });
        return groups;
    }, [pastLogs, user]);

    const outstandingTotal = Object.values(outstandingData).reduce((acc, val) => acc + val, 0);

    const formatMoney = (amount) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    // 1. Determine "Current Week" (Sat-Fri)
    const weekDays = [
        { label: 'Samstag', offset: 0 },
        { label: 'Sonntag', offset: 1 },
        { label: 'Montag', offset: 2 },
        { label: 'Dienstag', offset: 3 },
        { label: 'Mittwoch', offset: 4 },
        { label: 'Donnerstag', offset: 5 },
        { label: 'Freitag', offset: 6 },
    ];

    // Group logs by Employee -> Day (Current Week)
    const groupedData = useMemo(() => {
        const groups = {};

        currentLogs.filter(log => log.category !== 'trade').forEach(log => {
            // Filter by user permissions
            const isPrivileged = ['Administrator', 'Buchhaltung', 'Lager'].includes(user?.role);
            if (!isPrivileged && log.depositor !== user.employeeName) {
                return;
            }

            const date = new Date(log.timestamp);
            const satIndex = (date.getDay() + 1) % 7;

            if (!groups[log.depositor]) {
                groups[log.depositor] = {
                    name: log.depositor,
                    days: Array(7).fill().map(() => ({ logs: [], total: 0 })),
                    total: 0
                };
            }

            const dayGroup = groups[log.depositor].days[satIndex];
            dayGroup.logs.push(log);
            const value = (log.price || 0) * (log.quantity || 0);
            dayGroup.total += value;
        });

        const result = Object.values(groups);
        if (user?.employeeName) {
            result.sort((a, b) => {
                if (a.name === user.employeeName) return -1;
                if (b.name === user.employeeName) return 1;
                return 0;
            });
        }
        return result;
    }, [currentLogs, user]);

    return (
        <div className="animate-fade-in overflow-x-auto pb-12">
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-slate-200">Wochenprotokoll Mitarbeiter (Lohn)</h2>

                {outstandingTotal > 0 && (user?.role === 'Administrator' || user?.role === 'Buchhaltung') && (
                    <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <div className="text-right">
                            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Offene Lohnzahlung (Vergangen)</div>
                            <div className="text-xl font-bold text-emerald-400">{formatMoney(outstandingTotal)}</div>
                        </div>
                        {onPayout && (
                            <button
                                onClick={() => {
                                    if (confirm(`Alle offenen Löhne aus der Vergangenheit (${formatMoney(outstandingTotal)}) jetzt auszahlen?`)) {
                                        // Create batch payout for each employee with outstanding balance
                                        const batch = Object.entries(outstandingData).map(([name, amount]) => {
                                            // Date it to just before current week start to keep it in "Past"
                                            const payoutDate = new Date(currentWeekStart);
                                            payoutDate.setSeconds(payoutDate.getSeconds() - 1);
                                            return { amount, date: payoutDate, depositor: name };
                                        });
                                        onPayout(batch);
                                    }
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2"
                            >
                                <Check size={18} />
                                Alles Auszahlen
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="min-w-[1000px] border border-slate-700 rounded-lg bg-slate-900/50">
                {/* Header */}
                <div className="grid grid-cols-[200px_repeat(7,1fr)_100px] bg-slate-900 text-slate-400 font-bold text-xs uppercase border-b border-slate-700 sticky top-0 z-10">
                    <div className="p-3 border-r border-slate-700 flex items-center">Mitarbeiter</div>
                    {weekDays.map((day, i) => (
                        <div key={i} className="p-3 border-r border-slate-700 text-center bg-slate-800/50">
                            {day.label}
                        </div>
                    ))}
                    <div className="p-3 text-right flex items-center justify-end bg-emerald-900/20 text-emerald-400">
                        Gesamt
                    </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-700">
                    {groupedData.map((emp, idx) => (
                        <div key={idx} className="group">
                            {/* Summary Row */}
                            <div className="grid grid-cols-[200px_repeat(7,1fr)_100px] bg-slate-800/30 hover:bg-slate-800/80 transition-colors">
                                <div className="p-3 font-bold text-slate-200 border-r border-slate-700 flex flex-col justify-center gap-2">
                                    <span>{emp.name}</span>
                                </div>

                                {emp.days.map((day, dayIdx) => {
                                    return (
                                        <div key={dayIdx} className="p-2 border-r border-slate-700 flex flex-col justify-between min-h-[60px] relative">
                                            {/* Content */}
                                            <div className="mt-1 space-y-1">
                                                {day.logs.map((log, lIdx) => (
                                                    <div key={lIdx} className="text-[10px] flex justify-between px-1 rounded text-slate-400 bg-slate-900/50">
                                                        <span className="truncate max-w-[60px]">{log.itemName}</span>
                                                        <span>{log.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Daily Total */}
                                            {day.total > 0 && (user?.role === 'Administrator' || user?.role === 'Buchhaltung' || emp.name === user?.employeeName) && (
                                                <div className="text-xs font-bold text-right mt-1 pt-1 border-t border-slate-700/50 text-emerald-400">
                                                    {formatMoney(day.total)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <div className="p-3 font-bold text-emerald-400 text-right flex items-center justify-end bg-emerald-900/10">
                                    {(user?.role === 'Administrator' || user?.role === 'Buchhaltung' || emp.name === user?.employeeName) && (
                                        <div className="flex items-center justify-end gap-2">
                                            {formatMoney(emp.days.reduce((acc, d) => acc + d.total, 0))}
                                            {onPayout && (user?.role === 'Administrator' || user?.role === 'Buchhaltung') && emp.days.reduce((acc, d) => acc + d.total, 0) > 0 && (
                                                <button
                                                    onClick={() => {
                                                        const total = emp.days.reduce((acc, d) => acc + d.total, 0);
                                                        if (confirm(`${emp.name}: Wochenlohn von ${formatMoney(total)} auszahlen?`)) {
                                                            onPayout(total, new Date(), emp.name);
                                                        }
                                                    }}
                                                    className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-sm transition-colors"
                                                    title="Wochenlohn auszahlen"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {groupedData.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            Keine Daten für diese Woche vorhanden.
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
