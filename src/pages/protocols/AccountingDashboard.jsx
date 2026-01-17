import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    LayoutDashboard, DollarSign, TrendingUp, TrendingDown, Users,
    Wallet, Package, AlertTriangle, Clock, ArrowRight, Calendar,
    BookOpen, FileText, Shield, BarChart3, PieChart, CheckCircle,
    CreditCard, Activity
} from 'lucide-react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

const formatCompact = (num) => {
    return Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
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
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

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

                // Production earnings
                if (log.type === 'in' && log.category === 'internal' && log.itemName !== 'Auszahlung') {
                    const unitPrice = priceMap[log.itemId]?.sell || log.price || 0;
                    employeeEarnings[log.depositor] += (log.quantity || 1) * unitPrice;
                }

                // Payouts
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

            // Recent transactions (last 10)
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

        // Calculate outstanding wages
        Object.keys(employeeEarnings).forEach(emp => {
            const balance = employeeEarnings[emp] - employeePayouts[emp];
            if (balance > 0) {
                outstandingWages += balance;
            }
        });

        // Calculate inventory value
        let inventoryValue = 0;
        inventory.forEach(item => {
            const price = priceMap[item.id]?.sell || 0;
            inventoryValue += (item.current || 0) * price;
        });

        // Sort and limit recent transactions
        recentTransactions = recentTransactions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 8);

        // Warnings
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

    // Quick action links
    const quickLinks = [
        { icon: BookOpen, label: 'Kassenbuch', path: '/protokolle/kassenbuch', color: 'emerald' },
        { icon: Users, label: 'Lohnabrechnung', path: '/protokolle/lohn', color: 'blue' },
        { icon: Shield, label: 'Finanz-Audit', path: '/protokolle/audit', color: 'amber' },
        { icon: BarChart3, label: 'GuV', path: '/protokolle/guv', color: 'violet' },
        { icon: PieChart, label: 'Analytics', path: '/protokolle/analytics', color: 'fuchsia' },
        { icon: FileText, label: 'Wochenprotokoll', path: '/protokolle/weekly', color: 'cyan' }
    ];

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-slate-900/80 to-violet-900/30 backdrop-blur-xl p-6 rounded-3xl border border-violet-500/20 shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 flex items-center gap-3">
                            <LayoutDashboard className="w-8 h-8 text-violet-400" />
                            Buchhaltungs-Cockpit
                        </h1>
                        <p className="text-slate-400 mt-1">Echtzeit-Übersicht aller finanziellen Aktivitäten</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
                        <Calendar className="w-4 h-4 text-violet-400" />
                        <span className="text-slate-300 text-sm">
                            {today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* WARNINGS */}
            {kpis.warnings.length > 0 && (
                <div className="space-y-2">
                    {kpis.warnings.map((warning, idx) => (
                        <Link key={idx} to={warning.link} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.01] ${warning.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                                'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                            }`}>
                            <AlertTriangle className="w-5 h-5" />
                            <span className="flex-1">{warning.message}</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    ))}
                </div>
            )}

            {/* MAIN KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Revenue */}
                <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/10 p-5 rounded-2xl border border-emerald-500/20 group hover:border-emerald-500/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-xs text-emerald-300/50 uppercase tracking-wider">Heute</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(kpis.today.revenue)}</div>
                    <div className="text-xs text-emerald-300/50 mt-1">Tagesumsatz</div>
                </div>

                {/* Today's Expenses */}
                <div className="bg-gradient-to-br from-red-900/40 to-red-800/10 p-5 rounded-2xl border border-red-500/20 group hover:border-red-500/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                            <TrendingDown className="w-5 h-5 text-red-400" />
                        </div>
                        <span className="text-xs text-red-300/50 uppercase tracking-wider">Heute</span>
                    </div>
                    <div className="text-2xl font-bold text-red-400">{formatCurrency(kpis.today.expenses)}</div>
                    <div className="text-xs text-red-300/50 mt-1">Ausgaben</div>
                </div>

                {/* Outstanding Wages */}
                <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/10 p-5 rounded-2xl border border-amber-500/20 group hover:border-amber-500/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <span className="text-xs text-amber-300/50 uppercase tracking-wider">Offen</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-400">{formatCurrency(kpis.outstandingWages)}</div>
                    <div className="text-xs text-amber-300/50 mt-1">Offene Löhne</div>
                </div>

                {/* Inventory Value */}
                <div className="bg-gradient-to-br from-violet-900/40 to-violet-800/10 p-5 rounded-2xl border border-violet-500/20 group hover:border-violet-500/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                            <Package className="w-5 h-5 text-violet-400" />
                        </div>
                        <span className="text-xs text-violet-300/50 uppercase tracking-wider">Lager</span>
                    </div>
                    <div className="text-2xl font-bold text-violet-400">{formatCurrency(kpis.inventoryValue)}</div>
                    <div className="text-xs text-violet-300/50 mt-1">Warenwert</div>
                </div>
            </div>

            {/* WEEK SUMMARY */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                    Wochenübersicht
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl">
                        <div className="p-3 rounded-xl bg-emerald-500/10">
                            <DollarSign className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">Wochenumsatz</div>
                            <div className="text-xl font-bold text-emerald-400">{formatCurrency(kpis.week.revenue)}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl">
                        <div className="p-3 rounded-xl bg-red-500/10">
                            <CreditCard className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">Wochenausgaben</div>
                            <div className="text-xl font-bold text-red-400">{formatCurrency(kpis.week.expenses)}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl">
                        <div className={`p-3 rounded-xl ${kpis.week.profit >= 0 ? 'bg-violet-500/10' : 'bg-red-500/10'}`}>
                            <Activity className={`w-6 h-6 ${kpis.week.profit >= 0 ? 'text-violet-400' : 'text-red-400'}`} />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">Wochengewinn</div>
                            <div className={`text-xl font-bold ${kpis.week.profit >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
                                {formatCurrency(kpis.week.profit)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* RECENT TRANSACTIONS */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-fuchsia-400" />
                            Letzte Transaktionen
                        </h3>
                        <Link to="/protokolle/kassenbuch" className="text-xs text-slate-400 hover:text-violet-400 flex items-center gap-1">
                            Alle anzeigen <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {kpis.recentTransactions.map((tx, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors">
                                <div className={`p-2 rounded-lg ${tx.type === 'sale' ? 'bg-emerald-500/10' :
                                        tx.type === 'purchase' ? 'bg-amber-500/10' :
                                            tx.type === 'payout' ? 'bg-blue-500/10' :
                                                'bg-slate-500/10'
                                    }`}>
                                    {tx.type === 'sale' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                                    {tx.type === 'purchase' && <TrendingDown className="w-4 h-4 text-amber-400" />}
                                    {tx.type === 'payout' && <Wallet className="w-4 h-4 text-blue-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-slate-200 truncate">{tx.description}</div>
                                    <div className="text-xs text-slate-500">
                                        {new Date(tx.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                        {tx.depositor && ` • ${tx.depositor}`}
                                    </div>
                                </div>
                                <div className={`font-mono font-bold text-sm ${tx.type === 'sale' ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                    {tx.type === 'sale' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </div>
                            </div>
                        ))}
                        {kpis.recentTransactions.length === 0 && (
                            <div className="text-center py-8 text-slate-500">Keine Transaktionen heute</div>
                        )}
                    </div>
                </div>

                {/* QUICK LINKS */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-cyan-400" />
                        Schnellzugriff Protokolle
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {quickLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all hover:scale-[1.02] ${link.color === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' :
                                        link.color === 'blue' ? 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40' :
                                            link.color === 'amber' ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40' :
                                                link.color === 'violet' ? 'bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40' :
                                                    link.color === 'fuchsia' ? 'bg-fuchsia-500/5 border-fuchsia-500/20 hover:border-fuchsia-500/40' :
                                                        'bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40'
                                    }`}
                            >
                                <link.icon className={`w-5 h-5 ${link.color === 'emerald' ? 'text-emerald-400' :
                                        link.color === 'blue' ? 'text-blue-400' :
                                            link.color === 'amber' ? 'text-amber-400' :
                                                link.color === 'violet' ? 'text-violet-400' :
                                                    link.color === 'fuchsia' ? 'text-fuchsia-400' :
                                                        'text-cyan-400'
                                    }`} />
                                <span className="text-slate-300 font-medium">{link.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
