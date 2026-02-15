import React, { useMemo } from 'react';
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, TrendingDown } from 'lucide-react';

export default function WeeklyProtocol({ logs, user }) {

    // Helper to get the Saturday that starts the week for a given date
    const getWeekStart = (date) => {
        const d = new Date(date);
        const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
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
            (l.price > 0 || l.price < 0) &&
            l.itemName && l.itemName !== 'Unbekannt'
        ).forEach(log => {
            const date = new Date(log.timestamp);
            const weekStart = getWeekStart(date);
            const key = weekStart.toISOString();

            if (!weeks[key]) {
                weeks[key] = {
                    label: getWeekRangeLabel(weekStart),
                    startDate: weekStart,
                    incomeTrade: Array(7).fill(0),
                    incomeOther: Array(7).fill(0),
                    totalIncomeTrade: 0,
                    totalIncomeOther: 0,
                    outcomeTrade: Array(7).fill(0),
                    outcomeWages: Array(7).fill(0),
                    totalOutcomeTrade: 0,
                    totalOutcomeWages: 0
                };
            }

            const day = date.getDay();
            const dayIndex = (day + 1) % 7; // Sat=0, Sun=1...
            const value = (log.price || 0) * (log.quantity || 0);

            if (log.category === 'trade') {
                if (value >= 0) {
                    weeks[key].incomeTrade[dayIndex] += value;
                    weeks[key].totalIncomeTrade += value;
                } else {
                    weeks[key].outcomeTrade[dayIndex] += Math.abs(value);
                    weeks[key].totalOutcomeTrade += Math.abs(value);
                }
            } else {
                if (value >= 0) {
                    weeks[key].incomeOther[dayIndex] += value;
                    weeks[key].totalIncomeOther += value;
                } else {
                    weeks[key].outcomeWages[dayIndex] += Math.abs(value);
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
    const weekDays = ['Sa', 'So', 'Mo', 'Di', 'Mi', 'Do', 'Fr'];
    const isRestrictedView = user?.role === 'Lager' && user?.role !== 'Buchhaltung' && user?.role !== 'Administrator';

    return (
        <div className="animate-fade-in space-y-8 pb-20">
            {/* Header / Stats */}
            {!isRestrictedView && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Gesamt Einnahmen</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold text-emerald-400">{formatMoney(totalIncomeAllTime)} $</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Gesamt Ausgaben</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold text-red-400">-{formatMoney(totalOutcomeAllTime)} $</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Gesamt Profit</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className={cn("text-2xl font-bold", totalBalance >= 0 ? "text-emerald-400" : "text-red-400")}>
                                {totalBalance >= 0 ? '+' : ''}{formatMoney(totalBalance)} $
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* INCOME TABLE */}
            {!isRestrictedView && (
                <Card className="bg-slate-900/50 border-emerald-900/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-400">
                            <DollarSign className="w-5 h-5" />
                            Einnahmen
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-emerald-900/30 hover:bg-transparent bg-emerald-950/20">
                                    <TableHead className="min-w-[150px] text-emerald-500 font-bold">Woche</TableHead>
                                    <TableHead className="text-emerald-500 font-bold">Kategorie</TableHead>
                                    {weekDays.map((day, i) => (
                                        <TableHead key={i} className="text-center text-emerald-500 font-bold text-xs">{day}</TableHead>
                                    ))}
                                    <TableHead className="text-right text-emerald-500 font-bold">Gesamt</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedData.map((week, idx) => (
                                    <React.Fragment key={idx}>
                                        <TableRow className="border-emerald-900/10 hover:bg-slate-800/20">
                                            <TableCell className="font-medium text-slate-300 bg-slate-950/20 border-r border-emerald-900/10 h-full">{week.label}</TableCell>
                                            <TableCell className="font-bold text-xs uppercase tracking-wider text-emerald-400/80">Verkauf</TableCell>
                                            {week.incomeTrade.map((val, i) => (
                                                <TableCell key={i} className="text-center text-slate-400">{formatMoney(val)}</TableCell>
                                            ))}
                                            <TableCell className="text-right font-bold text-emerald-400 bg-emerald-950/10">{formatMoney(week.totalIncomeTrade)}</TableCell>
                                        </TableRow>
                                        {(week.totalIncomeOther > 0) && (
                                            <TableRow className="border-emerald-900/10 hover:bg-slate-800/20">
                                                <TableCell className="border-r border-emerald-900/10 bg-slate-950/20" /> {/* Empty cell for date */}
                                                <TableCell className="font-bold text-xs uppercase tracking-wider text-emerald-600/70">Sonstige</TableCell>
                                                {week.incomeOther.map((val, i) => (
                                                    <TableCell key={i} className="text-center text-slate-500">{formatMoney(val)}</TableCell>
                                                ))}
                                                <TableCell className="text-right font-bold text-emerald-600/70 bg-emerald-950/5">{formatMoney(week.totalIncomeOther)}</TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                                {processedData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-slate-500 italic">Keine Einnahmen</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* OUTCOME TABLE */}
            <Card className="bg-slate-900/50 border-red-900/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-400">
                        <TrendingDown className="w-5 h-5" />
                        Ausgaben
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-red-900/30 hover:bg-transparent bg-red-950/20">
                                <TableHead className="min-w-[150px] text-red-500 font-bold">Woche</TableHead>
                                <TableHead className="text-red-500 font-bold">Kategorie</TableHead>
                                {weekDays.map((day, i) => (
                                    <TableHead key={i} className="text-center text-red-500 font-bold text-xs">{day}</TableHead>
                                ))}
                                <TableHead className="text-right text-red-500 font-bold">Gesamt</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processedData.map((week, idx) => (
                                <React.Fragment key={idx}>
                                    {!isRestrictedView && (
                                        <TableRow className="border-red-900/10 hover:bg-slate-800/20">
                                            <TableCell className="font-medium text-slate-300 bg-slate-950/20 border-r border-red-900/10">{week.label}</TableCell>
                                            <TableCell className="font-bold text-xs uppercase tracking-wider text-red-400/80">Ankauf</TableCell>
                                            {week.outcomeTrade.map((val, i) => (
                                                <TableCell key={i} className="text-center text-slate-400">{formatMoney(val)}</TableCell>
                                            ))}
                                            <TableCell className="text-right font-bold text-red-400 bg-red-950/10">{formatMoney(week.totalOutcomeTrade)}</TableCell>
                                        </TableRow>
                                    )}
                                    <TableRow className="border-red-900/10 hover:bg-slate-800/20">
                                        <TableCell className="bg-slate-950/20 border-r border-red-900/10 font-medium text-slate-300">
                                            {isRestrictedView ? week.label : ''}
                                        </TableCell>
                                        <TableCell className="font-bold text-xs uppercase tracking-wider text-orange-400/80">Löhne / Sonst</TableCell>
                                        {week.outcomeWages.map((val, i) => (
                                            <TableCell key={i} className="text-center text-slate-400">{formatMoney(val)}</TableCell>
                                        ))}
                                        <TableCell className="text-right font-bold text-orange-400/80 bg-orange-950/10">{formatMoney(week.totalOutcomeWages)}</TableCell>
                                    </TableRow>
                                </React.Fragment>
                            ))}
                            {processedData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-slate-500 italic">Keine Ausgaben</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
