import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    LayoutDashboard, DollarSign, TrendingUp, TrendingDown, Users,
    Wallet, Package, AlertTriangle, Clock, ArrowRight, Calendar,
    BookOpen, FileText, Shield, BarChart3, PieChart, CreditCard, Activity
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

export default function AccountingDashboard({ logs = [], employees = [], inventory = [], prices = [], user }) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday

    // Build price lookup
    const priceMap = useMemo(() => {
        const map = {};
        prices.forEach(p => {
            map[p.id] = { sell: p.sellPrice || p.price || 0, buy: p.buyPrice || 0 };
        });
        return map;
    }, [prices]);

    // Calculate real-time KPIs
    const kpis = useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const weekStart = new Date(startOfWeek);

        let todayRevenue = 0;
        let todayExpenses = 0;
        let weekRevenue = 0;
        let weekExpenses = 0;
        let outstandingWages = 0;
        let recentTransactions = [];

        // Employee earnings tracking
        const employeeEarnings = {};
        const employeePayouts = {};

        logs.forEach(log => {
            const logDate = new Date(log.timestamp);
            const amount = Math.abs((log.price || 0) * (log.quantity || 1));

            // Track employee earnings and payouts for outstanding wages
            if (log.depositor && log.depositor !== 'Unbekannt' && log.depositor !== 'System') {
                if (!employeeEarnings[log.depositor]) {
                    employeeEarnings[log.depositor] = 0;
                    employeePayouts[log.depositor] = 0;
                }

                if (log.type === 'in' && log.category === 'internal' && log.itemName !== 'Auszahlung') {
                    const unitPrice = priceMap[log.itemId]?.sell || log.price || 0;
                    employeeEarnings[log.depositor] += (log.quantity || 1) * unitPrice;
                }

                if (log.itemName === 'Auszahlung' || (log.price < 0 && log.category === 'internal')) {
                    employeePayouts[log.depositor] += Math.abs(log.price || 0);
                }
            }

            // Today's figures
            if (logDate >= todayStart) {
                if (log.type === 'out' && log.category === 'trade') {
                    todayRevenue += amount;
                } else if (log.type === 'in' && log.category === 'trade') {
                    todayExpenses += amount;
                } else if (log.itemName === 'Auszahlung') {
                    todayExpenses += Math.abs(log.price || 0);
                }
            }

            // Week's figures
            if (logDate >= weekStart) {
                if (log.type === 'out' && log.category === 'trade') {
                    weekRevenue += amount;
                } else if (log.type === 'in' && log.category === 'trade') {
                    weekExpenses += amount;
                } else if (log.itemName === 'Auszahlung') {
                    weekExpenses += Math.abs(log.price || 0);
                }
            }

            // Recent transactions
            if (log.category === 'trade' || log.itemName === 'Auszahlung') {
                recentTransactions.push({
                    timestamp: log.timestamp,
                    type: log.type === 'out' && log.category === 'trade' ? 'sale' :
                        log.type === 'in' && log.category === 'trade' ? 'purchase' :
                            log.itemName === 'Auszahlung' ? 'payout' : 'other',
                    description: log.itemName || log.msg,
                    amount: amount || Math.abs(log.price || 0),
                    depositor: log.depositor
                });
            }
        });

        Object.keys(employeeEarnings).forEach(emp => {
            const balance = employeeEarnings[emp] - employeePayouts[emp];
            if (balance > 0) {
                outstandingWages += balance;
            }
        });

        let inventoryValue = 0;
        inventory.forEach(item => {
            const price = priceMap[item.id]?.sell || 0;
            inventoryValue += (item.current || 0) * price;
        });

        recentTransactions = recentTransactions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 8);

        const warnings = [];
        if (outstandingWages > 5000) {
            warnings.push({ type: 'warning', message: `Offene Löhne: ${formatCurrency(outstandingWages)}`, link: '/protokolle/lohn' });
        }
        const lowStockItems = inventory.filter(i => i.current < (i.target * 0.2));
        if (lowStockItems.length > 0) {
            warnings.push({ type: 'info', message: `${lowStockItems.length} Artikel unter 20% Bestand`, link: '/' });
        }

        return {
            today: { revenue: todayRevenue, expenses: todayExpenses, profit: todayRevenue - todayExpenses },
            week: { revenue: weekRevenue, expenses: weekExpenses, profit: weekRevenue - weekExpenses },
            outstandingWages,
            inventoryValue,
            recentTransactions,
            warnings,
            employeeCount: Object.keys(employeeEarnings).length
        };
    }, [logs, inventory, prices, priceMap, startOfWeek, today]);

    const quickLinks = [
        { icon: BookOpen, label: 'Kassenbuch', path: '/protokolle/kassenbuch', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { icon: Users, label: 'Lohnabrechnung', path: '/protokolle/lohn', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { icon: Shield, label: 'Finanz-Audit', path: '/protokolle/audit', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        { icon: BarChart3, label: 'GuV', path: '/protokolle/guv', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
        { icon: PieChart, label: 'Analytics', path: '/protokolle/analytics', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
        { icon: FileText, label: 'Wochenprotokoll', path: '/protokolle/weekly', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' }
    ];

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <LayoutDashboard className="w-8 h-8 text-violet-400" />
                        Buchhaltungs-Cockpit
                    </h1>
                    <p className="text-slate-400 mt-1">Echtzeit-Übersicht aller finanziellen Aktivitäten.</p>
                </div>
                <Badge variant="outline" className="px-4 py-2 text-sm bg-slate-900/50 border-slate-700 text-slate-300 gap-2">
                    <Calendar className="w-4 h-4 text-violet-400" />
                    {today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </Badge>
            </div>

            {/* Warnings */}
            {kpis.warnings.length > 0 && (
                <div className="grid gap-2">
                    {kpis.warnings.map((warning, idx) => (
                        <Link key={idx} to={warning.link}>
                            <Card className={cn("border-l-4 transition-all hover:translate-x-1", warning.type === 'warning' ? "border-l-amber-500 bg-amber-500/5 border-amber-500/20" : "border-l-blue-500 bg-blue-500/5 border-blue-500/20")}>
                                <CardContent className="p-4 flex items-center gap-3">
                                    <AlertTriangle className={cn("w-5 h-5", warning.type === 'warning' ? "text-amber-500" : "text-blue-500")} />
                                    <span className={cn("flex-1 font-medium", warning.type === 'warning' ? "text-amber-400" : "text-blue-400")}>{warning.message}</span>
                                    <ArrowRight className="w-4 h-4 text-slate-500" />
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Tagesumsatz</CardTitle>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">{formatCurrency(kpis.today.revenue)}</div>
                        <p className="text-xs text-slate-500 mt-1">Heute</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Ausgaben</CardTitle>
                        <TrendingDown className="w-4 h-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-400">{formatCurrency(kpis.today.expenses)}</div>
                        <p className="text-xs text-slate-500 mt-1">Heute</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Offene Löhne</CardTitle>
                        <Clock className="w-4 h-4 text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-400">{formatCurrency(kpis.outstandingWages)}</div>
                        <p className="text-xs text-slate-500 mt-1">Zu zahlen</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Lagerwert</CardTitle>
                        <Package className="w-4 h-4 text-violet-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-violet-400">{formatCurrency(kpis.inventoryValue)}</div>
                        <p className="text-xs text-slate-500 mt-1">Gesamtwert</p>
                    </CardContent>
                </Card>
            </div>

            {/* Week Summary */}
            <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-200">
                        <Calendar className="w-5 h-5 text-cyan-400" />
                        Wochenübersicht
                    </CardTitle>
                    <CardDescription>Finanzielle Performance der laufenden Woche</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <DollarSign className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-medium">Umsatz</p>
                            <p className="text-xl font-bold text-emerald-400">{formatCurrency(kpis.week.revenue)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20">
                            <CreditCard className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-medium">Ausgaben</p>
                            <p className="text-xl font-bold text-red-400">{formatCurrency(kpis.week.expenses)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-full border", kpis.week.profit >= 0 ? "bg-violet-500/10 border-violet-500/20" : "bg-red-500/10 border-red-500/20")}>
                            <Activity className={cn("w-6 h-6", kpis.week.profit >= 0 ? "text-violet-400" : "text-red-400")} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-medium">Gewinn</p>
                            <p className={cn("text-xl font-bold", kpis.week.profit >= 0 ? "text-violet-400" : "text-red-400")}>
                                {formatCurrency(kpis.week.profit)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Transactions */}
                <Card className="border-slate-800 bg-slate-900/40 h-full">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-slate-200">
                                <Activity className="w-5 h-5 text-fuchsia-400" />
                                Letzte Transaktionen
                            </CardTitle>
                            <CardDescription>Die neuesten finanziellen Bewegungen</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10">
                            <Link to="/protokolle/kassenbuch" className="flex items-center gap-1">
                                Alle <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableBody>
                                {kpis.recentTransactions.map((tx, idx) => (
                                    <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/40">
                                        <TableCell className="w-[50px] p-3 pl-6">
                                            <div className={cn("p-2 rounded-lg w-fit",
                                                tx.type === 'sale' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    tx.type === 'purchase' ? 'bg-amber-500/10 text-amber-400' :
                                                        tx.type === 'payout' ? 'bg-blue-500/10 text-blue-400' :
                                                            'bg-slate-500/10 text-slate-400'
                                            )}>
                                                {tx.type === 'sale' && <TrendingUp className="w-4 h-4" />}
                                                {tx.type === 'purchase' && <TrendingDown className="w-4 h-4" />}
                                                {tx.type === 'payout' && <Wallet className="w-4 h-4" />}
                                                {tx.type === 'other' && <Activity className="w-4 h-4" />}
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-3">
                                            <div className="font-medium text-slate-200">{tx.description}</div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(tx.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                {tx.depositor && ` • ${tx.depositor}`}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right p-3 pr-6 font-mono font-bold">
                                            <span className={tx.type === 'sale' ? 'text-emerald-400' : 'text-red-400'}>
                                                {tx.type === 'sale' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {kpis.recentTransactions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-6 text-slate-500">Keine Transaktionen</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Quick Links */}
                <Card className="border-slate-800 bg-slate-900/40 h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-200">
                            <FileText className="w-5 h-5 text-cyan-400" />
                            Schnellzugriff
                        </CardTitle>
                        <CardDescription>Häufig genutzte Protokolle</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        {quickLinks.map((link) => (
                            <Link key={link.path} to={link.path}>
                                <div className={cn("flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:bg-slate-800/80 hover:scale-[1.02] cursor-pointer h-full gap-3 bg-slate-900/50", link.border)}>
                                    <div className={cn("p-3 rounded-full", link.bg)}>
                                        <link.icon className={cn("w-6 h-6", link.color)} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-300">{link.label}</span>
                                </div>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
