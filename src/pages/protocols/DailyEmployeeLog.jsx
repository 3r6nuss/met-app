import React, { useMemo } from 'react';
import { Check, Banknote, Trash2 } from 'lucide-react';

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
        logs.filter(l =>
            l.itemName !== 'Korrektur Geschäftskonto' &&
            !l.msg?.includes('Korrektur Geschäftskonto') &&
            (l.price > 0 || l.price < 0) // Exclude 0 price (Returns), but KEEP unknown items
        ).forEach(log => {
            const date = new Date(log.timestamp);
            if (date >= currentWeekStart) {
                current.push(log);
            } else {
                past.push(log);
            }
        });
        return { currentLogs: current, pastLogs: past };
    }, [logs, currentWeekStart]);

    // Calculate Outstanding Wages (Past Weeks) per Employee - LIMITED TO LAST 7 DAYS
    // Calculate Outstanding Wages (Past Weeks) per Employee - LIMITED TO LAST 7 DAYS
    const outstandingData = useMemo(() => {
        const groups = {};
        // Calculate 7 days before current week start
        const lastWeekStart = new Date(currentWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);

        pastLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            // Explicitly include Auszahlung to ensure it reduces the debt
            if (log.itemName === 'Auszahlung') return logDate >= lastWeekStart;
            return log.category !== 'trade' && logDate >= lastWeekStart;
        }).forEach(log => {
            if (!groups[log.depositor]) groups[log.depositor] = 0;
            { label: 'Mittwoch', offset: 4 },
            { label: 'Donnerstag', offset: 5 },
            { label: 'Freitag', offset: 6 },
];

    // Group logs by Employee -> Day (Current Week) AND Merge with Outstanding
    const employeeData = useMemo(() => {
        const groups = {};

        // 1. Process Current Week Logs
        // First, find the last payout timestamp for each employee
        const lastPayouts = {};
        currentLogs.forEach(log => {
            // Check for payout but EXCLUDE "Offen" payouts (Outstanding Wages)
            // We only want to reset the view if a CURRENT week payout happened.
            if ((log.itemName === 'Auszahlung' || (log.category === 'internal' && log.price < 0)) && !log.msg?.includes('(Offen)')) {
                if (!lastPayouts[log.depositor] || log.timestamp > lastPayouts[log.depositor]) {
                    lastPayouts[log.depositor] = log.timestamp;
                }
            }
        });

        // Filter logs to only show those AFTER the last payout
        const filteredLogs = currentLogs.filter(log => {
            const lastPayout = lastPayouts[log.depositor];
            if (!lastPayout) return true; // No payout, show all
            return log.timestamp > lastPayout; // Show only if newer than last payout
        });

        filteredLogs.filter(log => log.category !== 'trade' && log.type === 'in').forEach(log => {
            if (!groups[log.depositor]) {
                groups[log.depositor] = {
                    name: log.depositor,
                    days: Array(7).fill().map(() => ({ logs: [], total: 0 })),
                    currentTotal: 0,
                    outstandingTotal: 0
                };
            }

            const date = new Date(log.timestamp);
            const satIndex = (date.getDay() + 1) % 7;
            const dayGroup = groups[log.depositor].days[satIndex];

            dayGroup.logs.push(log);
            const value = (log.price || 0) * (log.quantity || 0);
            dayGroup.total += value;
            groups[log.depositor].currentTotal += value;
        });

        // 2. Merge Outstanding Data
        Object.entries(outstandingData).forEach(([name, amount]) => {
            if (amount === 0) return; // Skip if balanced
            if (!groups[name]) {
                groups[name] = {
                    name: name,
                    days: Array(7).fill().map(() => ({ logs: [], total: 0 })),
                    currentTotal: 0,
                    outstandingTotal: 0
                };
            }
            groups[name].outstandingTotal = amount;
        });

        // 3. Filter by Permissions & Sort
        let result = Object.values(groups);

        // Permission Filter
        const isPrivileged = ['Administrator', 'Buchhaltung', 'Lager'].includes(user?.role);
        if (!isPrivileged) {
            result = result.filter(g => g.name === user?.employeeName);
        }

        // Sort: Current User first, then alphabetical
        if (user?.employeeName) {
            result.sort((a, b) => {
                if (a.name === user.employeeName) return -1;
                if (b.name === user.employeeName) return 1;
                return a.name.localeCompare(b.name);
            });
        } else {
            result.sort((a, b) => a.name.localeCompare(b.name));
        }

        return result;
    }, [currentLogs, outstandingData, user]);

    return (
        <div className="animate-fade-in overflow-x-auto pb-12">
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-slate-200">Wochenprotokoll Mitarbeiter (Lohn)</h2>
            </div>

            <div className="min-w-[1000px] border border-slate-700 rounded-lg bg-slate-900/50">
                {/* Header */}
                <div className="grid grid-cols-[200px_repeat(7,1fr)_150px] bg-slate-900 text-slate-400 font-bold text-xs uppercase border-b border-slate-700 sticky top-0 z-10">
                    <div className="p-3 border-r border-slate-700 flex items-center">Mitarbeiter</div>
                    {weekDays.map((day, i) => (
                        <div key={i} className="p-3 border-r border-slate-700 text-center bg-slate-800/50">
                            {day.label}
                        </div>
                    ))}
                    <div className="p-3 text-right flex items-center justify-end bg-emerald-900/20 text-emerald-400">
                        Status / Offen
                    </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-700">
                    {employeeData.map((emp, idx) => {
                        const totalBalance = emp.currentTotal + emp.outstandingTotal;
                        const isPaid = totalBalance <= 0;

                        return (
                            <div key={idx} className="group">
                                <div className="grid grid-cols-[200px_repeat(7,1fr)_150px] bg-slate-800/30 hover:bg-slate-800/80 transition-colors">
                                    {/* Name */}
                                    <div className="p-3 font-bold text-slate-200 border-r border-slate-700 flex flex-col justify-center gap-2">
                                        <span>{emp.name}</span>
                                    </div>

                                    {/* Days */}
                                    {emp.days.map((day, dayIdx) => (
                                        <div key={dayIdx} className="p-2 border-r border-slate-700 flex flex-col justify-between min-h-[60px] relative">
                                            {!isPaid && (
                                                <>
                                                    <div className="mt-1 space-y-1">
                                                        {day.logs.map((log, lIdx) => (
                                                            <div key={lIdx} className="text-[10px] flex justify-between items-center px-1 rounded text-slate-400 bg-slate-900/50 group/log">
                                                                <span className="truncate max-w-[60px]" title={log.itemName || 'Auszahlung'}>{log.itemName || 'Auszahlung'}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <span>{log.quantity}</span>
                                                                    {user?.role === 'Administrator' && (
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                if (confirm(`Eintrag "${log.itemName}" (${log.quantity}x) von ${emp.name} wirklich löschen?`)) {
                                                                                    try {
                                                                                        const res = await fetch(`/api/logs/${encodeURIComponent(log.timestamp)}`, {
                                                                                            method: 'DELETE',
                                                                                            credentials: 'include'
                                                                                        });
                                                                                        if (res.ok) {
                                                                                            window.location.reload();
                                                                                        } else {
                                                                                            const data = await res.json();
                                                                                            alert(data.error || 'Löschen fehlgeschlagen');
                                                                                        }
                                                                                    } catch (err) {
                                                                                        alert('Netzwerkfehler');
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="opacity-0 group-hover/log:opacity-100 p-0.5 hover:bg-red-500/30 rounded text-red-400 transition-all"
                                                                            title="Eintrag löschen"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {day.total > 0 && (
                                                        <div className="text-xs font-bold text-right mt-1 pt-1 border-t border-slate-700/50 text-emerald-400">
                                                            {formatMoney(day.total)}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    {/* Status / Checkbox */}
                                    <div className="p-3 font-bold text-emerald-400 text-right flex flex-col items-end justify-center gap-2 bg-emerald-900/10">
                                        {(user?.role === 'Administrator' || user?.role === 'Buchhaltung') && (
                                            <div className="flex items-center gap-2">
                                                {emp.outstandingTotal > 0 && !isPaid && (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-slate-400 uppercase">Offen</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-red-400">{formatMoney(emp.outstandingTotal)}</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // Prevent row click if any
                                                                    if (confirm(`${emp.name}: Nur offenes Gehalt (letzte Woche) von ${formatMoney(emp.outstandingTotal)} auszahlen?`)) {
                                                                        const payoutDate = new Date(currentWeekStart);
                                                                        payoutDate.setSeconds(payoutDate.getSeconds() - 1);

                                                                        onPayout([{
                                                                            amount: emp.outstandingTotal,
                                                                            date: payoutDate,
                                                                            depositor: emp.name
                                                                        }]);
                                                                    }
                                                                }}
                                                                className="p-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
                                                                title="Nur offenes Gehalt auszahlen"
                                                            >
                                                                <Banknote className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isPaid}
                                                        onChange={() => {
                                                            if (!isPaid && onPayout) {
                                                                if (confirm(`${emp.name}: Gesamten offenen Betrag von ${formatMoney(totalBalance)} auszahlen?`)) {
                                                                    const batch = [];
                                                                    // 1. Pay Outstanding (Past)
                                                                    if (emp.outstandingTotal > 0) {
                                                                        const payoutDate = new Date(currentWeekStart);
                                                                        payoutDate.setSeconds(payoutDate.getSeconds() - 1);
                                                                        batch.push({ amount: emp.outstandingTotal, date: payoutDate, depositor: emp.name });
                                                                    }
                                                                    // 2. Pay Current
                                                                    if (emp.currentTotal > 0) {
                                                                        batch.push({ amount: emp.currentTotal, date: new Date(), depositor: emp.name });
                                                                    }
                                                                    onPayout(batch);
                                                                }
                                                            }
                                                        }}
                                                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
                                                        disabled={isPaid} // Disable if already paid (for now, unless undo is needed)
                                                    />
                                                </label>
                                            </div>
                                        )}
                                        {!isPaid && (
                                            <div className="text-sm">
                                                Summe: {formatMoney(totalBalance)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {employeeData.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            Keine Daten für diese Woche vorhanden.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
