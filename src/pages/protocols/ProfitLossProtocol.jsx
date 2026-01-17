import React, { useState, useMemo } from 'react';
import {
    TrendingUp, TrendingDown, Calendar, Download, DollarSign,
    ArrowUpRight, ArrowDownRight, Minus, PieChart, BarChart3,
    Layers, Users, Package, Wallet
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPie, Pie, Cell, Legend
} from 'recharts';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

const formatCompact = (num) => {
    return Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
};

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#6366f1', '#14b8a6'];

export default function ProfitLossProtocol({ logs = [], employees = [], prices = [], inventory = [] }) {
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [compareMode, setCompareMode] = useState(false);

    // Build price lookup
    const priceMap = useMemo(() => {
        const map = {};
        prices.forEach(p => {
            map[p.id] = { sell: p.sellPrice || p.price || 0, buy: p.buyPrice || 0 };
        });
        return map;
    }, [prices]);

    // Calculate P&L data
    const plData = useMemo(() => {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);

        // Revenue categories
        const revenue = {
            sales: { total: 0, items: {} },
            production: { total: 0, byEmployee: {} }
        };

        // Expense categories
        const expenses = {
            purchases: { total: 0, items: {} },
            wages: { total: 0, byEmployee: {} },
            special: { total: 0, items: [] }
        };

        // Monthly breakdown
        const monthlyData = {};

        logs.forEach(log => {
            const d = new Date(log.timestamp);
            if (d < start || d > end) return;

            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { month: monthKey, revenue: 0, expenses: 0 };
            }

            const amount = Math.abs((log.price || 0) * (log.quantity || 1));

            // SALES (trade out)
            if (log.type === 'out' && log.category === 'trade') {
                revenue.sales.total += amount;
                revenue.sales.items[log.itemName] = (revenue.sales.items[log.itemName] || 0) + amount;
                monthlyData[monthKey].revenue += amount;
            }

            // PRODUCTION VALUE (internal in) - counts towards revenue as asset creation
            if (log.type === 'in' && log.category === 'internal' && log.itemName !== 'Auszahlung') {
                const unitPrice = priceMap[log.itemId]?.sell || log.price || 0;
                const productionValue = (log.quantity || 1) * unitPrice;
                revenue.production.total += productionValue;
                if (log.depositor && log.depositor !== 'Unbekannt') {
                    revenue.production.byEmployee[log.depositor] = (revenue.production.byEmployee[log.depositor] || 0) + productionValue;
                }
            }

            // PURCHASES (trade in)
            if (log.type === 'in' && log.category === 'trade') {
                expenses.purchases.total += amount;
                expenses.purchases.items[log.itemName] = (expenses.purchases.items[log.itemName] || 0) + amount;
                monthlyData[monthKey].expenses += amount;
            }

            // WAGES (payouts)
            if (log.itemName === 'Auszahlung' || (log.price < 0 && log.category === 'internal')) {
                const wageAmount = Math.abs(log.price || 0);
                expenses.wages.total += wageAmount;
                if (log.depositor) {
                    expenses.wages.byEmployee[log.depositor] = (expenses.wages.byEmployee[log.depositor] || 0) + wageAmount;
                }
                monthlyData[monthKey].expenses += wageAmount;
            }

            // SPECIAL BOOKINGS
            if (log.skipInventory && log.itemName !== 'Auszahlung') {
                if (log.price < 0) {
                    const specialAmount = Math.abs(log.price);
                    expenses.special.total += specialAmount;
                    expenses.special.items.push({ name: log.itemName, amount: specialAmount, date: log.timestamp });
                    monthlyData[monthKey].expenses += specialAmount;
                }
            }
        });

        // Calculate totals
        const totalRevenue = revenue.sales.total;
        const totalExpenses = expenses.purchases.total + expenses.wages.total + expenses.special.total;
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        // Convert to arrays for charts
        const salesByProduct = Object.entries(revenue.sales.items)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);

        const wagesByEmployee = Object.entries(expenses.wages.byEmployee)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);

        const monthlyChart = Object.values(monthlyData)
            .sort((a, b) => a.month.localeCompare(b.month))
            .map(m => ({
                name: new Date(m.month + '-01').toLocaleDateString('de-DE', { month: 'short' }),
                Einnahmen: m.revenue,
                Ausgaben: m.expenses,
                Gewinn: m.revenue - m.expenses
            }));

        return {
            revenue,
            expenses,
            totals: {
                revenue: totalRevenue,
                expenses: totalExpenses,
                netProfit,
                profitMargin
            },
            charts: {
                salesByProduct,
                wagesByEmployee,
                monthly: monthlyChart
            }
        };
    }, [logs, dateRange, priceMap]);

    const downloadCSV = () => {
        const lines = [
            'GEWINN- UND VERLUSTRECHNUNG',
            `Zeitraum: ${dateRange.start} bis ${dateRange.end}`,
            '',
            'EINNAHMEN',
            `Verkäufe;${plData.revenue.sales.total.toFixed(2)}`,
            '  Produkt;Betrag',
            ...Object.entries(plData.revenue.sales.items).map(([name, val]) => `  ${name};${val.toFixed(2)}`),
            '',
            'AUSGABEN',
            `Ankäufe;${plData.expenses.purchases.total.toFixed(2)}`,
            `Löhne;${plData.expenses.wages.total.toFixed(2)}`,
            `Sonderbuchungen;${plData.expenses.special.total.toFixed(2)}`,
            `Summe Ausgaben;${plData.totals.expenses.toFixed(2)}`,
            '',
            `NETTOGEWINN;${plData.totals.netProfit.toFixed(2)}`,
            `Gewinnmarge;${plData.totals.profitMargin.toFixed(1)}%`
        ];

        const csv = lines.join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `GuV_${dateRange.start}_${dateRange.end}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400 flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-violet-400" />
                        Gewinn- & Verlustrechnung
                    </h1>
                    <p className="text-slate-400 mt-1">Finanzielle Performance-Übersicht</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-xl border border-slate-700">
                        <Calendar className="w-4 h-4 text-violet-400" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-transparent border-none text-slate-200 text-sm focus:ring-0 p-0"
                        />
                        <span className="text-slate-500">–</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-transparent border-none text-slate-200 text-sm focus:ring-0 p-0"
                        />
                    </div>
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-white font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* MAIN KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/10 p-6 rounded-3xl border border-emerald-500/20">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 rounded-2xl bg-emerald-500/10">
                            <ArrowUpRight className="w-6 h-6 text-emerald-400" />
                        </div>
                        <span className="text-emerald-300/70 text-sm font-medium uppercase tracking-wider">Einnahmen</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-400">{formatCurrency(plData.totals.revenue)}</div>
                    <div className="text-xs text-emerald-300/50 mt-1">Verkaufserlöse</div>
                </div>

                <div className="bg-gradient-to-br from-red-900/30 to-red-800/10 p-6 rounded-3xl border border-red-500/20">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 rounded-2xl bg-red-500/10">
                            <ArrowDownRight className="w-6 h-6 text-red-400" />
                        </div>
                        <span className="text-red-300/70 text-sm font-medium uppercase tracking-wider">Ausgaben</span>
                    </div>
                    <div className="text-3xl font-bold text-red-400">{formatCurrency(plData.totals.expenses)}</div>
                    <div className="text-xs text-red-300/50 mt-1">Summe aller Kosten</div>
                </div>

                <div className={`bg-gradient-to-br ${plData.totals.netProfit >= 0 ? 'from-violet-900/30 to-violet-800/10 border-violet-500/20' : 'from-red-900/30 to-red-800/10 border-red-500/20'} p-6 rounded-3xl border`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`p-3 rounded-2xl ${plData.totals.netProfit >= 0 ? 'bg-violet-500/10' : 'bg-red-500/10'}`}>
                            <DollarSign className={`w-6 h-6 ${plData.totals.netProfit >= 0 ? 'text-violet-400' : 'text-red-400'}`} />
                        </div>
                        <span className={`text-sm font-medium uppercase tracking-wider ${plData.totals.netProfit >= 0 ? 'text-violet-300/70' : 'text-red-300/70'}`}>
                            {plData.totals.netProfit >= 0 ? 'Gewinn' : 'Verlust'}
                        </span>
                    </div>
                    <div className={`text-3xl font-bold ${plData.totals.netProfit >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
                        {formatCurrency(Math.abs(plData.totals.netProfit))}
                    </div>
                    <div className={`text-xs mt-1 ${plData.totals.netProfit >= 0 ? 'text-violet-300/50' : 'text-red-300/50'}`}>
                        Netto-Ergebnis
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/10 p-6 rounded-3xl border border-blue-500/20">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 rounded-2xl bg-blue-500/10">
                            <TrendingUp className="w-6 h-6 text-blue-400" />
                        </div>
                        <span className="text-blue-300/70 text-sm font-medium uppercase tracking-wider">Marge</span>
                    </div>
                    <div className={`text-3xl font-bold ${plData.totals.profitMargin >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {plData.totals.profitMargin.toFixed(1)}%
                    </div>
                    <div className="text-xs text-blue-300/50 mt-1">Gewinnmarge</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* REVENUE BREAKDOWN */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                        Einnahmen nach Produkt
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                                <Pie
                                    data={plData.charts.salesByProduct}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {plData.charts.salesByProduct.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(val) => formatCurrency(val)}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                />
                                <Legend />
                            </RechartsPie>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* EXPENSE BREAKDOWN */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <ArrowDownRight className="w-5 h-5 text-red-400" />
                        Ausgabenstruktur
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Package className="w-5 h-5 text-amber-400" />
                                <span className="text-slate-300">Ankäufe</span>
                            </div>
                            <span className="font-mono font-bold text-amber-400">{formatCurrency(plData.expenses.purchases.total)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-blue-400" />
                                <span className="text-slate-300">Löhne</span>
                            </div>
                            <span className="font-mono font-bold text-blue-400">{formatCurrency(plData.expenses.wages.total)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-violet-400" />
                                <span className="text-slate-300">Sonderbuchungen</span>
                            </div>
                            <span className="font-mono font-bold text-violet-400">{formatCurrency(plData.expenses.special.total)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                            <span className="text-slate-200 font-bold">Summe Ausgaben</span>
                            <span className="font-mono font-bold text-red-400">{formatCurrency(plData.totals.expenses)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MONTHLY TREND */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-violet-400" />
                    Monatlicher Verlauf
                </h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={plData.charts.monthly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => formatCompact(val)} />
                            <Tooltip
                                cursor={{ fill: '#1e293b', opacity: 0.5 }}
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                formatter={(val) => formatCurrency(val)}
                            />
                            <Legend />
                            <Bar dataKey="Einnahmen" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Ausgaben" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Gewinn" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* TOP WAGE RECEIVERS */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Top Lohnempfänger
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {plData.charts.wagesByEmployee.map((emp, idx) => (
                        <div key={emp.name} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-400/20 text-amber-400' :
                                    idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                                        idx === 2 ? 'bg-amber-600/20 text-amber-600' :
                                            'bg-slate-700 text-slate-500'
                                }`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-200 truncate">{emp.name}</div>
                            </div>
                            <div className="font-mono text-sm font-bold text-blue-400">{formatCurrency(emp.value)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
