import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';

export default function DailyEmployeeLog({ logs, onUpdateLogs, user }) {
    const [balances, setBalances] = useState({});

    // 1. Determine "Current Week" (Sat-Fri)
    const getWeekKey = (date) => {
        const d = new Date(date);
        const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        // Adjust to Sat-Fri cycle
        const diff = day === 6 ? 0 : -(day + 1);
        const saturday = new Date(d);
        saturday.setDate(d.getDate() + diff);
        saturday.setHours(0, 0, 0, 0);
        return saturday.toISOString();
    };

    const weekDays = [
        { label: 'Samstag', offset: 0 },
        { label: 'Sonntag', offset: 1 },
        { label: 'Montag', offset: 2 },
        { label: 'Dienstag', offset: 3 },
        { label: 'Mittwoch', offset: 4 },
        { label: 'Donnerstag', offset: 5 },
        { label: 'Freitag', offset: 6 },
    ];

    // Fetch balances on mount and when logs change
    useEffect(() => {
        if (user?.role === 'Buchhaltung' || user?.role === 'Administrator') {
            fetch('/api/accounting/balances')
                .then(res => res.json())
                .then(setBalances)
                .catch(err => console.error("Failed to fetch balances:", err));
        }
    }, [logs, user]);

    // Group logs by Employee -> Day
    const groupedData = useMemo(() => {
        const groups = {};

        logs.filter(log => log.category !== 'trade').forEach(log => {
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
                    days: Array(7).fill().map(() => ({ logs: [], total: 0, confirmed: true })),
                    total: 0
                };
            }

            const dayGroup = groups[log.depositor].days[satIndex];
            dayGroup.logs.push(log);
            const value = (log.price || 0) * (log.quantity || 0);
            dayGroup.total += value;
            if (log.status !== 'paid') {
                dayGroup.unpaidTotal = (dayGroup.unpaidTotal || 0) + value;
            }

            if (!log.confirmed) dayGroup.confirmed = false;
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
    }, [logs, user]);

    const toggleDayConfirmation = async (employeeName, dayIndex) => {
        const empGroup = groupedData.find(g => g.name === employeeName);
        if (!empGroup) return;
        const dayGroup = empGroup.days[dayIndex];
        const logIds = dayGroup.logs.map(l => l.timestamp);

        const allPaid = dayGroup.logs.every(l => l.status === 'paid');
        const newStatus = allPaid ? 'pending' : 'paid';

        try {
            await fetch('/api/accounting/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logIds, status: newStatus })
            });
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    const handleCloseWeek = async (employeeName, weekEnd) => {
        if (!confirm(`Woche für ${employeeName} abschließen? Alle offenen Einträge werden auf "Ausstehend" gesetzt.`)) return;

        try {
            await fetch('/api/accounting/close-week', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeName, weekEnd })
            });
        } catch (err) {
            console.error("Failed to close week:", err);
        }
    };

    const handlePayOutstanding = async (employeeName) => {
        if (!confirm(`Reste für ${employeeName} als ausbezahlt markieren?`)) return;
        try {
            await fetch('/api/accounting/pay-outstanding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeName })
            });
        } catch (err) {
            console.error("Failed to pay outstanding:", err);
        }
    };

    const handlePayWeek = async (employeeName, weekEnd) => {
        if (!confirm(`Aktuelle Woche für ${employeeName} als ausbezahlt markieren?`)) return;
        try {
            await fetch('/api/accounting/pay-week', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeName, weekEnd })
            });
        } catch (err) {
            console.error("Failed to pay week:", err);
        }
    };

    const formatMoney = (amount) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="animate-fade-in overflow-x-auto pb-12">
            <h2 className="text-2xl font-bold mb-6 text-slate-200">Wochenprotokoll Mitarbeiter (Lohn)</h2>

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
                        Offen
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
                                    {(user?.role === 'Buchhaltung' || user?.role === 'Administrator') && (
                                        <div className="flex flex-col gap-1">
                                            {/* Outstanding Balance */}
                                            <div className="flex items-center justify-between bg-amber-900/20 p-1 rounded border border-amber-900/30">
                                                <span className="text-[10px] text-amber-400">Reste: {formatMoney(balances[emp.name] || 0)}</span>
                                                {balances[emp.name] > 0 ? (
                                                    <button
                                                        onClick={() => handlePayOutstanding(emp.name)}
                                                        className="text-[9px] bg-amber-700 hover:bg-amber-600 px-1.5 py-0.5 rounded text-white transition-colors"
                                                        title="Reste ausbezahlt"
                                                    >
                                                        Bez.
                                                    </button>
                                                ) : (
                                                    <span className="text-[9px] text-amber-500/50">0</span>
                                                )}
                                            </div>

                                            {/* Current Week Unpaid */}
                                            {(() => {
                                                const currentWeekUnpaid = emp.days.reduce((acc, day) => {
                                                    return acc + day.logs
                                                        .filter(l => l.status !== 'paid' && l.status !== 'outstanding')
                                                        .reduce((sum, l) => sum + ((l.price || 0) * (l.quantity || 0)), 0);
                                                }, 0);

                                                return (
                                                    <div className="flex items-center justify-between bg-emerald-900/20 p-1 rounded border border-emerald-900/30">
                                                        <span className="text-[10px] text-emerald-400">Woche: {formatMoney(currentWeekUnpaid)}</span>
                                                        {currentWeekUnpaid > 0 ? (
                                                            <button
                                                                onClick={() => handlePayWeek(emp.name, getWeekKey(new Date()))}
                                                                className="text-[9px] bg-emerald-700 hover:bg-emerald-600 px-1.5 py-0.5 rounded text-white transition-colors"
                                                                title="Woche ausbezahlt"
                                                            >
                                                                Bez.
                                                            </button>
                                                        ) : (
                                                            <span className="text-[9px] text-emerald-500/50">0</span>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Close Week Button */}
                                            <button
                                                onClick={() => handleCloseWeek(emp.name, getWeekKey(new Date()))}
                                                className="text-[9px] bg-slate-700 hover:bg-slate-600 px-1.5 py-1 rounded text-slate-300 transition-colors w-full mt-1"
                                                title="Woche abschließen (zu Ausstehend)"
                                            >
                                                Woche Abschl.
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {emp.days.map((day, dayIdx) => {
                                    const isPaid = day.logs.length > 0 && day.logs.every(l => l.status === 'paid');
                                    const hasOutstanding = day.logs.some(l => l.status === 'outstanding');
                                    const unpaidAmount = day.unpaidTotal || 0;

                                    return (
                                        <div key={dayIdx} className={`p-2 border-r border-slate-700 flex flex-col justify-between min-h-[60px] relative ${isPaid ? 'bg-emerald-900/10' : ''} ${hasOutstanding ? 'bg-amber-900/10' : ''}`}>
                                            {/* Checkbox Top Right - Only for Buchhaltung/Admin */}
                                            {(user?.role === 'Buchhaltung' || user?.role === 'Administrator') && day.logs.length > 0 && (
                                                <button
                                                    onClick={() => toggleDayConfirmation(emp.name, dayIdx)}
                                                    className="absolute top-1 right-1 text-slate-500 hover:text-emerald-400 transition-colors"
                                                    title={isPaid ? "Als unbezahlt markieren" : "Als bezahlt markieren"}
                                                >
                                                    {isPaid
                                                        ? <CheckSquare className="w-4 h-4 text-emerald-500" />
                                                        : <Square className="w-4 h-4" />
                                                    }
                                                </button>
                                            )}

                                            {/* Content */}
                                            <div className="mt-4 space-y-1">
                                                {day.logs.map((log, lIdx) => (
                                                    <div key={lIdx} className={`text-[10px] flex justify-between px-1 rounded ${log.status === 'paid' ? 'text-emerald-400/70 bg-emerald-900/20' :
                                                            log.status === 'outstanding' ? 'text-amber-400/70 bg-amber-900/20' :
                                                                'text-slate-400 bg-slate-900/50'
                                                        }`}>
                                                        <span className="truncate max-w-[60px]">{log.itemName}</span>
                                                        <span>{log.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Daily Total (Unpaid) */}
                                            {day.total > 0 && (user?.role === 'Administrator' || user?.role === 'Buchhaltung' || emp.name === user?.employeeName) && (
                                                <div className={`text-xs font-bold text-right mt-1 pt-1 border-t border-slate-700/50 ${isPaid ? 'text-emerald-500' :
                                                        hasOutstanding ? 'text-amber-500' :
                                                            'text-emerald-400'
                                                    }`}>
                                                    {isPaid ? (
                                                        <span className="flex justify-end items-center gap-1">
                                                            <CheckSquare className="w-3 h-3" />
                                                            Bez.
                                                        </span>
                                                    ) : (
                                                        formatMoney(unpaidAmount)
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <div className="p-3 font-bold text-emerald-400 text-right flex items-center justify-end bg-emerald-900/10">
                                    {(user?.role === 'Administrator' || user?.role === 'Buchhaltung' || emp.name === user?.employeeName) &&
                                        formatMoney(emp.days.reduce((acc, d) => acc + (d.unpaidTotal || 0), 0))
                                    }
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
        </div>
    );
}
