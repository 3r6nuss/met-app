import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';

export default function DailyEmployeeLog({ logs, onUpdateLogs, user }) {
    // 1. Determine "Current Week" (Sat-Fri)
    // For simplicity, we'll group ALL logs by week, but initially show the latest week.
    // A "week" starts on Saturday and ends on Friday.

    const getWeekKey = (date) => {
        const d = new Date(date);
        const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        // Adjust to Sat-Fri cycle
        // If day is Sat (6), it's the start of a new week.
        // If day is Fri (5), it's the end.
        // We'll use the Saturday's date as the key.
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
            // Native: 0=Sun, 1=Mon, ... 5=Fri, 6=Sat.
            // We want 0=Sat, 1=Sun, ... 6=Fri.
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
        // Find logs for this employee and day
        // We need to know which logs are in this day group
        const empGroup = groupedData.find(g => g.name === employeeName);
        if (!empGroup) return;
        const dayGroup = empGroup.days[dayIndex];
        const logIds = dayGroup.logs.map(l => l.timestamp); // timestamp is unique ID here? Ideally use ID if available, but timestamp is used as key often.
        // In server.js we use timestamp as ID for updates? No, we use it for DELETE.
        // Let's check server.js... UPDATE logs SET status = ? WHERE timestamp IN ...
        // Yes, timestamp is used.

        // Determine new status
        // If all are paid, set to pending (undo). If any is pending/outstanding, set to paid.
        const allPaid = dayGroup.logs.every(l => l.status === 'paid');
        const newStatus = allPaid ? 'pending' : 'paid';

        try {
            await fetch('/api/accounting/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logIds, status: newStatus })
            });
            // WebSocket will trigger refresh
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
                                    {(user?.role === 'Buchhaltung' || user?.role === 'Administrator') && (
                                        <button
                                            onClick={() => handleCloseWeek(emp.name, getWeekKey(new Date()))} // Use current week key or the one being viewed
                                            className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors w-fit"
                                        >
                                            Woche abschließen
                                        </button>
                                    )}
                                </div>

                                {emp.days.map((day, dayIdx) => {
                                    const isPaid = day.logs.length > 0 && day.logs.every(l => l.status === 'paid');
                                    const hasOutstanding = day.logs.some(l => l.status === 'outstanding');

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

                                            {/* Daily Total */}
                                            {day.total > 0 && (user?.role === 'Administrator' || user?.role === 'Buchhaltung' || emp.name === user?.employeeName) && (
                                                <div className={`text-xs font-bold text-right mt-1 pt-1 border-t border-slate-700/50 ${isPaid ? 'text-emerald-500' :
                                                        hasOutstanding ? 'text-amber-500' :
                                                            'text-emerald-400'
                                                    }`}>
                                                    {formatMoney(day.total)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <div className="p-3 font-bold text-emerald-400 text-right flex items-center justify-end bg-emerald-900/10">
                                    {(user?.role === 'Administrator' || user?.role === 'Buchhaltung' || emp.name === user?.employeeName) &&
                                        formatMoney(emp.days.reduce((acc, d) => acc + d.total, 0))
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
