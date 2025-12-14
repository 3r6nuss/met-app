import React, { useState, useMemo } from 'react';
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
    const [showFullHistory, setShowFullHistory] = useState(false);

    // Split logs into Current Week and Past Weeks (Outstanding)
    const { currentLogs, pastLogs } = useMemo(() => {
        const current = [];
        const past = [];
        logs.filter(l =>
            l.itemName !== 'Korrektur Geschäftskonto' &&
            !l.msg?.includes('Korrektur Geschäftskonto')
            // (l.price > 0 || l.price < 0) // Exclude 0 price -> REMOVED to show employees with 0$ items
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

    // Calculate Outstanding Wages (Past Weeks) per Employee - ALL TIME HISTORY
    const outstandingData = useMemo(() => {
        const groups = {};

        pastLogs.filter(log => {
            // Explicitly include Auszahlung to ensure it reduces the debt
            if (log.itemName === 'Auszahlung') return true;
            return log.category !== 'trade';
        }).forEach(log => {
            if (!groups[log.depositor]) groups[log.depositor] = 0;
            const value = (log.price || 0) * (log.quantity || 0);
            groups[log.depositor] += value;
        });
        return groups;
    }, [pastLogs]);

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

    // Group logs by Employee -> Day (Current Week) AND Merge with Outstanding
    const employeeData = useMemo(() => {
        const groups = {};

        // 1. Process Current Week Logs
        const lastPayouts = {};

        // Find last payout timestamp for each employee
        currentLogs.forEach(log => {
            if (log.itemName === 'Auszahlung') {
                if (!lastPayouts[log.depositor] || log.timestamp > lastPayouts[log.depositor]) {
                    lastPayouts[log.depositor] = log.timestamp;
                }
            }
        });

        currentLogs.filter(log => log.category !== 'trade' && log.type === 'in' && log.itemName !== 'Auszahlung').forEach(log => {
            if (!groups[log.depositor]) {
                groups[log.depositor] = {
                    name: log.depositor,
                    days: Array(7).fill().map(() => ({ logs: [], total: 0 })),
                    weekTotal: 0,   // "Diese Woche Gesamt"
                    currentOpen: 0, // "Aktuell Offene von dieser Woche"
                    outstandingTotal: 0 // "Offene Zahlung letzte Wochen"
                };
            }

            const date = new Date(log.timestamp);
            const satIndex = (date.getDay() + 1) % 7;
            const dayGroup = groups[log.depositor].days[satIndex];

            // Check if log is paid
            const lastPayout = lastPayouts[log.depositor];
            // Fix: items with SAME timestamp as payout are PAID (contained in the payout batch)
            const isPaid = lastPayout && log.timestamp <= lastPayout;

            // Add 'isPaid' flag to log for UI
            const logWithStatus = { ...log, isPaid };

            dayGroup.logs.push(logWithStatus);

            const value = (log.price || 0) * (log.quantity || 0);
            dayGroup.total += value;

            groups[log.depositor].weekTotal += value;
            if (!isPaid) {
                groups[log.depositor].currentOpen += value;
            }
        });

        // 2. Merge Outstanding Data (Independent)
        Object.entries(outstandingData).forEach(([name, amount]) => {
            if (amount === 0) return;

            if (!groups[name]) {
                groups[name] = {
                    name: name,
                    days: Array(7).fill().map(() => ({ logs: [], total: 0 })),
                    weekTotal: 0,
                    currentOpen: 0,
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

    // Calculate Grand Total Outstanding (Sum of all positive balances)
    const grandTotalOutstanding = useMemo(() => {
        return employeeData.reduce((acc, emp) => {
            const total = emp.currentOpen + emp.outstandingTotal;
            // Only count if positive (debt to employee)
            return acc + (total > 0 ? total : 0);
        }, 0);
    }, [employeeData]);

    return (
        <div className="animate-fade-in overflow-x-auto pb-12">
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-slate-200">Wochenprotokoll Mitarbeiter (Lohn)</h2>
                {(user?.role === 'Administrator' || user?.role === 'Buchhaltung') && grandTotalOutstanding > 0 && (
                    <div className="flex flex-col items-end">
                        <span className="text-xs uppercase text-slate-400 font-bold tracking-wider">Gesamt Offen</span>
                        <span className="text-2xl font-bold text-red-400">{formatMoney(grandTotalOutstanding)}</span>
                    </div>
                )}
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
                        const totalBalance = emp.currentOpen + emp.outstandingTotal;

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
                                            <div className="mt-1 space-y-1">
                                                {day.logs.filter(l => l.price !== 0).map((log, lIdx) => (
                                                    <div key={lIdx} className={`text-[10px] flex justify-between items-center px-1 rounded bg-slate-900/50 group/log ${log.isPaid ? 'text-emerald-500' : 'text-slate-400'}`}>
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
                                        </div>
                                    ))}

                                    {/* Status / Checkbox */}
                                    <div className="p-3 font-bold text-emerald-400 text-right flex flex-col items-end justify-center gap-2 bg-emerald-900/10">
                                        {(user?.role === 'Administrator' || user?.role === 'Buchhaltung') && (
                                            <div className="flex flex-col items-end gap-1 w-full">

                                                {/* 1. Offene Zahlung Lezte Wochen (ALT) */}
                                                {emp.outstandingTotal > 0 && (
                                                    <div className="flex items-center justify-between w-full gap-2 text-xs">
                                                        <span className="text-slate-500 uppercase text-[10px]">Alt</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-red-400">{formatMoney(emp.outstandingTotal)}</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm(`${emp.name}: Nur offenes Gehalt (letzte Wochen) von ${formatMoney(emp.outstandingTotal)} auszahlen?`)) {
                                                                        const payoutDate = new Date(currentWeekStart);
                                                                        payoutDate.setSeconds(payoutDate.getSeconds() - 1);

                                                                        onPayout([{
                                                                            amount: emp.outstandingTotal,
                                                                            date: payoutDate,
                                                                            depositor: emp.name,
                                                                            msg: 'Auszahlung Altlasten'
                                                                        }]);
                                                                    }
                                                                }}
                                                                className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                                                                title="Alte Schulden auszahlen"
                                                            >
                                                                <Banknote className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 2. Diese Woche Gesamt (STATISTIC ONLY) */}
                                                <div className="flex items-center justify-between w-full gap-2 text-xs border-t border-slate-700/50 pt-1 mt-1">
                                                    <span className="text-slate-500 uppercase text-[10px]">Gesamt</span>
                                                    <span className="text-emerald-400/70">{formatMoney(emp.weekTotal)}</span>
                                                </div>

                                                {/* 3. Aktuell Offene von dieser Woche (NEW) */}
                                                {emp.currentOpen > 0 && (
                                                    <div className="flex items-center justify-between w-full gap-2 text-xs">
                                                        <span className="text-slate-200 uppercase text-[10px] font-bold">Ofen</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-emerald-400">{formatMoney(emp.currentOpen)}</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm(`${emp.name}: Aktuelles Wochengehalt von ${formatMoney(emp.currentOpen)} auszahlen?`)) {
                                                                        // Pass NULL date to imply Server Time (RIGHT NOW)
                                                                        onPayout([{
                                                                            amount: emp.currentOpen,
                                                                            date: null,
                                                                            depositor: emp.name,
                                                                            msg: 'Auszahlung Woche' // Optional msg
                                                                        }]);
                                                                    }
                                                                }}
                                                                className="p-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
                                                                title="Wochengehalt auszahlen"
                                                            >
                                                                <Banknote className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {emp.currentOpen <= 0 && emp.outstandingTotal <= 0 && (
                                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Check className="w-3 h-3" /> Bezahlt
                                                    </div>
                                                )}
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

            {/* DEBUG SECTION FOR ADMINS */}
            {
                user?.role === 'Administrator' && (
                    <div className="mt-8 border border-slate-700 rounded p-4 bg-slate-900/50">
                        <details>
                            <summary className="cursor-pointer text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-slate-200">
                                Debug: Ausgeblendete Einträge (Vergangenheit)
                            </summary>
                            <div className="mt-4 space-y-2">
                                {(() => {
                                    // Calculate hidden logs directly here for debug display
                                    const debugHidden = pastLogs.filter(log => {
                                        // The INCLUSION logic used above:
                                        const included = (log.itemName === 'Auszahlung') || (log.category !== 'trade');
                                        // We want to show what is EXCLUDED
                                        return !included;
                                    });

                                    if (debugHidden.length === 0) return <div className="text-slate-500 text-xs">Keine ausgeblendeten Einträge.</div>;

                                    return debugHidden.map((log, idx) => (
                                        <div key={idx} className="flex items-center gap-4 text-xs text-slate-500 border-b border-slate-800 pb-1">
                                            <span className="w-32">{new Date(log.timestamp).toLocaleDateString()}</span>
                                            <span className="w-32 font-bold">{log.depositor}</span>
                                            <span className="w-24 text-amber-500">{log.category}</span>
                                            <span className="flex-1">{log.itemName} ({log.quantity}x)</span>
                                            <span className="w-24 text-right">{log.price} €</span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </details>
                    </div>
                )
            }
        </div >
    );
}
