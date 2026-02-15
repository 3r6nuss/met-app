import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Banknote, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function InternalStorageProtocol({ logs, user, employees, onPayout }) {
    const [weekOffset, setWeekOffset] = useState(0);

    // Helpers for Date Management
    const getWeekRange = (offset) => {
        const now = new Date();
        const day = now.getDay(); // 0=Sun, 6=Sat
        // Adjust to make Saturday the start of the week
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
    const formatMoney = (amount) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    // Mapping helper
    const employeeMapping = useMemo(() => {
        const mapping = {};
        if (employees) {
            employees.forEach(emp => {
                const empObj = typeof emp === 'string' ? { name: emp, visible_in_protocol: 1, protocol_name: null } : emp;
                const isVisible = empObj.visible_in_protocol === 1 || empObj.visible_in_protocol === true || empObj.visible_in_protocol === undefined;
                const displayName = empObj.protocol_name || empObj.name;
                mapping[empObj.name] = { displayName, isVisible };
            });
        }
        return mapping;
    }, [employees]);

    const getDisplayName = useCallback((depositor) => {
        if (!depositor || typeof depositor !== 'string') return depositor || 'Unbekannt';
        return employeeMapping[depositor]?.displayName || depositor;
    }, [employeeMapping]);

    const isDepositorVisible = useCallback((depositor) => {
        if (!depositor || typeof depositor !== 'string') return true;
        if (!employeeMapping[depositor]) return true;
        return employeeMapping[depositor].isVisible;
    }, [employeeMapping]);

    // Data Filtering & Calculation
    const relevantLogs = useMemo(() => {
        return logs.filter(l =>
            ((l.category === 'internal' && l.type === 'in') ||
                (l.itemName === 'Auszahlung' && l.category === 'internal')) &&
            l.itemName !== 'Korrektur Geschäftskonto' &&
            l.price !== 0 &&
            isDepositorVisible(l.depositor)
        );
    }, [logs, isDepositorVisible]);

    const employeeBalances = useMemo(() => {
        const balances = {};
        const payouts = {};

        relevantLogs.forEach(log => {
            if (log.itemName === 'Auszahlung') {
                const displayName = getDisplayName(log.depositor);
                if (!payouts[displayName] || log.timestamp > payouts[displayName]) {
                    payouts[displayName] = log.timestamp;
                }
            }
        });

        relevantLogs.forEach(log => {
            if (log.itemName !== 'Auszahlung') {
                const displayName = getDisplayName(log.depositor);
                const isPaid = payouts[displayName] && log.timestamp <= payouts[displayName];
                if (!isPaid) {
                    const val = (log.price || 0) * (log.quantity || 0);
                    balances[displayName] = (balances[displayName] || 0) + val;
                }
            }
        });

        return balances;
    }, [relevantLogs, getDisplayName]);

    const viewData = useMemo(() => {
        const groups = {};
        const logsInView = relevantLogs.filter(log => {
            const d = new Date(log.timestamp);
            return d >= viewStart && d <= viewEnd && log.itemName !== 'Auszahlung';
        });

        const lastPayouts = {};
        relevantLogs.forEach(log => {
            if (log.itemName === 'Auszahlung') {
                const displayName = getDisplayName(log.depositor);
                if (!lastPayouts[displayName] || log.timestamp > lastPayouts[displayName]) {
                    lastPayouts[displayName] = log.timestamp;
                }
            }
        });

        if (employees) {
            Object.values(employeeMapping).forEach(({ displayName, isVisible }) => {
                if (isVisible && !groups[displayName]) {
                    groups[displayName] = { name: displayName, logs: [], totalWage: 0 };
                }
            });
        }

        logsInView.forEach(log => {
            const displayName = getDisplayName(log.depositor);
            if (!groups[displayName]) groups[displayName] = { name: displayName, logs: [], totalWage: 0 };

            const val = (log.price || 0) * (log.quantity || 0);
            const isPaid = lastPayouts[displayName] && log.timestamp <= lastPayouts[displayName];

            groups[displayName].logs.push({ ...log, val, isPaid });
            groups[displayName].totalWage += val;
        });

        let result = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
        const isPrivileged = user?.role === 'Administrator' || user?.role === 'Buchhaltung';
        if (!isPrivileged && user?.employeeName) {
            const myDisplayName = getDisplayName(user.employeeName);
            result = result.filter(r => r.name === myDisplayName);
        }

        return result;
    }, [relevantLogs, viewStart, viewEnd, user, employeeMapping, employees, getDisplayName]);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(viewStart);
        d.setDate(d.getDate() + i);
        return {
            label: ['Samstag', 'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'][i],
            date: d
        };
    });

    const totalOpenBalance = Object.values(employeeBalances).reduce((a, b) => a + b, 0);

    return (
        <Card className="border-slate-800 bg-slate-900/50 mb-12">
            <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2 text-slate-200">
                            <Banknote className="w-5 h-5 text-amber-500" />
                            Mitarbeiter-Protokoll
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">Interne Einlagerungen & Lohnabrechnung</p>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setWeekOffset(prev => prev - 1)}
                            className="h-8 w-8 text-slate-400 hover:text-white"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="text-center min-w-[160px]">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Woche</div>
                            <div className="text-sm font-medium text-slate-200 flex items-center justify-center gap-2">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {viewStart.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })} - {viewEnd.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setWeekOffset(prev => prev + 1)}
                            disabled={weekOffset >= 0}
                            className="h-8 w-8 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    {(user?.role === 'Administrator' || user?.role === 'Buchhaltung') && (
                        <div className="flex flex-col items-end bg-slate-950/50 px-3 py-1.5 rounded border border-slate-800/50 ml-auto md:ml-0">
                            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Gesamt Offen</span>
                            <span className={cn("text-lg font-bold font-mono", totalOpenBalance > 0 ? "text-red-400" : "text-emerald-400")}>
                                {formatMoney(totalOpenBalance)}
                            </span>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
                <div className="min-w-[1000px]">
                    {/* Table Header */}
                    <div className="grid grid-cols-[180px_repeat(7,1fr)_140px] bg-slate-950 border-y border-slate-800 text-xs font-medium text-slate-400 uppercase tracking-wider">
                        <div className="p-3 border-r border-slate-800 flex items-center">Mitarbeiter</div>
                        {weekDays.map((day, i) => (
                            <div key={i} className={cn(
                                "p-3 border-r border-slate-800 text-center flex flex-col justify-center",
                                day.date.toDateString() === new Date().toDateString() && "bg-violet-500/10 text-violet-300"
                            )}>
                                <span>{day.label.slice(0, 2)}</span>
                                <span className="text-[10px] opacity-60">{day.date.getDate()}.{day.date.getMonth() + 1}.</span>
                            </div>
                        ))}
                        <div className="p-3 text-right flex items-center justify-end bg-slate-950/50">Details / Lohn</div>
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-slate-800">
                        {viewData.map((emp) => {
                            const openBalance = employeeBalances[emp.name] || 0;

                            return (
                                <div key={emp.name} className="grid grid-cols-[180px_repeat(7,1fr)_140px] hover:bg-slate-800/30 transition-colors group">
                                    {/* Name Column */}
                                    <div className="p-3 border-r border-slate-800 flex items-center font-medium text-slate-200">
                                        {emp.name}
                                    </div>

                                    {/* Days Columns */}
                                    {weekDays.map((day, dIdx) => {
                                        const dayLogs = emp.logs.filter(l => new Date(l.timestamp).toDateString() === day.date.toDateString());
                                        const dayTotal = dayLogs.reduce((sum, l) => sum + l.val, 0);

                                        return (
                                            <div key={dIdx} className="p-2 border-r border-slate-800 min-h-[64px] flex flex-col justify-between relative">
                                                <div className="space-y-1">
                                                    {dayLogs.map((l, lIdx) => (
                                                        <div key={lIdx}
                                                            className={cn(
                                                                "text-[9px] px-1 py-0.5 rounded flex justify-between gap-1 items-center border",
                                                                l.isPaid
                                                                    ? "bg-emerald-500/5 text-emerald-400/70 border-emerald-500/20"
                                                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                                            )}
                                                            title={`${l.itemName} (${l.quantity}x)`}
                                                        >
                                                            <span className="truncate max-w-[60px]">{l.itemName}</span>
                                                            <span className="font-mono opacity-80">{l.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {dayTotal > 0 && (
                                                    <div className="mt-1 text-right text-[10px] font-bold text-slate-500 border-t border-slate-800/50 pt-1 group-hover:text-emerald-400 transition-colors">
                                                        {formatMoney(dayTotal)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Action Column */}
                                    <div className="p-3 flex flex-col gap-2 justify-center items-end bg-slate-950/30">
                                        <div className="text-right">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold">Offen</div>
                                            <div className={cn("font-mono font-bold text-sm", openBalance > 0 ? "text-red-400" : "text-emerald-500")}>
                                                {formatMoney(openBalance)}
                                            </div>
                                        </div>

                                        {(user?.role === 'Administrator' || user?.role === 'Buchhaltung') && openBalance > 0 && (
                                            <div className="flex flex-col gap-1 w-full mt-1">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => {
                                                        const currentWeekSat = new Date();
                                                        const d = currentWeekSat.getDay();
                                                        const diffToSat = d === 6 ? 0 : -(d + 1);
                                                        currentWeekSat.setDate(currentWeekSat.getDate() + diffToSat);
                                                        currentWeekSat.setHours(0, 0, 0, 0);

                                                        const lastFriday = new Date(currentWeekSat);
                                                        lastFriday.setDate(lastFriday.getDate() - 1);
                                                        lastFriday.setHours(23, 59, 59);

                                                        if (confirm(`${emp.name}: Alles bis letzten Freitag (${lastFriday.toLocaleDateString()}) auszahlen?`)) {
                                                            const logsUntilFri = relevantLogs.filter(l => {
                                                                const isInternalIn = l.category === 'internal' && l.type === 'in' && l.itemName !== 'Auszahlung';
                                                                const logDate = new Date(l.timestamp);
                                                                return isInternalIn && logDate <= lastFriday && l.depositor === emp.name;
                                                            });

                                                            const amount = logsUntilFri.reduce((sum, l) => {
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
                                                    className="h-6 text-[10px] px-2 bg-slate-800 text-slate-400 hover:text-white"
                                                >
                                                    Bis Fr. (Woche)
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        if (confirm(`${emp.name}: Kompletten offenen Betrag (${formatMoney(openBalance)}) auszahlen?`)) {
                                                            onPayout(openBalance, null, emp.name);
                                                        }
                                                    }}
                                                    className="h-6 text-[10px] px-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                                                >
                                                    Alles
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {viewData.length === 0 && (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                                <Calendar className="w-10 h-10 mb-2 opacity-20" />
                                <p>Keine Daten für diesen Zeitraum</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
