import React, { useState, useMemo } from 'react';
import {
    TrendingUp, TrendingDown, DollarSign, Package, Calendar,
    Download, BarChart3, PieChart as PieIcon, ArrowUpRight,
    ArrowDownRight, Target, Percent, Award, AlertCircle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

const COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899', '#6366f1', '#14b8a6', '#ef4444'];

export default function ProductProfitability({ logs = [], prices = [], inventory = [] }) {
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [sortBy, setSortBy] = useState('profit'); // profit, margin, volume, revenue

    // Build price lookup with buy/sell prices
    const priceMap = useMemo(() => {
        const map = {};
        prices.forEach(p => {
            map[p.id] = {
                sell: p.sellPrice || p.price || 0,
                buy: p.buyPrice || 0,
                name: p.name
            };
        });
        // Also add from inventory if prices are missing
        inventory.forEach(item => {
            if (!map[item.id]) {
                map[item.id] = { sell: 0, buy: 0, name: item.name };
            }
        });
        return map;
    }, [prices, inventory]);

    // Calculate product profitability
    const profitData = useMemo(() => {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);

        const products = {};

        logs.forEach(log => {
            const d = new Date(log.timestamp);
            if (d < start || d > end) return;

            const itemId = log.itemId;
            const itemName = log.itemName || priceMap[itemId]?.name || 'Unbekannt';

            if (!products[itemName]) {
                products[itemName] = {
                    name: itemName,
                    itemId,
                    sellPrice: priceMap[itemId]?.sell || 0,
                    buyPrice: priceMap[itemId]?.buy || 0,
                    // Sales (trade out)
                    soldQty: 0,
                    soldRevenue: 0,
                    // Purchases (trade in)
                    boughtQty: 0,
                    boughtCost: 0,
                    // Production (internal in)
                    producedQty: 0,
                    productionValue: 0
                };
            }

            const qty = log.quantity || 1;
            const price = log.price || 0;

            // Sales
            if (log.type === 'out' && log.category === 'trade') {
                products[itemName].soldQty += qty;
                products[itemName].soldRevenue += Math.abs(price * qty);
            }

            // Purchases
            if (log.type === 'in' && log.category === 'trade') {
                products[itemName].boughtQty += qty;
                products[itemName].boughtCost += Math.abs(price * qty);
            }

            // Production
            if (log.type === 'in' && log.category === 'internal' && log.itemName !== 'Auszahlung') {
                products[itemName].producedQty += qty;
                products[itemName].productionValue += qty * (priceMap[itemId]?.sell || price || 0);
            }
        });

        // Calculate profits and margins
        const productList = Object.values(products)
            .map(p => {
                // Gross profit = Revenue - Cost of goods
                const grossProfit = p.soldRevenue - p.boughtCost;

                // Margin = Profit / Revenue * 100
                const margin = p.soldRevenue > 0 ? (grossProfit / p.soldRevenue) * 100 : 0;

                // Per-unit profit
                const profitPerUnit = p.soldQty > 0 ? grossProfit / p.soldQty : 0;

                // Avg sell price
                const avgSellPrice = p.soldQty > 0 ? p.soldRevenue / p.soldQty : p.sellPrice;

                // Avg buy price
                const avgBuyPrice = p.boughtQty > 0 ? p.boughtCost / p.boughtQty : p.buyPrice;

                return {
                    ...p,
                    grossProfit,
                    margin,
                    profitPerUnit,
                    avgSellPrice,
                    avgBuyPrice,
                    totalVolume: p.soldQty + p.boughtQty + p.producedQty
                };
            })
            .filter(p => p.totalVolume > 0 || p.soldRevenue > 0);

        // Sort
        productList.sort((a, b) => {
            switch (sortBy) {
                case 'profit': return b.grossProfit - a.grossProfit;
                case 'margin': return b.margin - a.margin;
                case 'volume': return b.totalVolume - a.totalVolume;
                case 'revenue': return b.soldRevenue - a.soldRevenue;
                default: return b.grossProfit - a.grossProfit;
            }
        });

        // Calculate totals
        const totals = {
            totalRevenue: productList.reduce((sum, p) => sum + p.soldRevenue, 0),
            totalCost: productList.reduce((sum, p) => sum + p.boughtCost, 0),
            totalProfit: productList.reduce((sum, p) => sum + p.grossProfit, 0),
            avgMargin: 0,
            topPerformers: productList.filter(p => p.margin > 30 && p.grossProfit > 0).slice(0, 5),
            underperformers: productList.filter(p => p.margin < 10 && p.soldRevenue > 0).slice(0, 5)
        };
        totals.avgMargin = totals.totalRevenue > 0 ? (totals.totalProfit / totals.totalRevenue) * 100 : 0;

        // Chart data
        const chartData = productList.slice(0, 10).map(p => ({
            name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
            Gewinn: p.grossProfit,
            Umsatz: p.soldRevenue,
            Marge: p.margin
        }));

        const pieData = productList
            .filter(p => p.soldRevenue > 0)
            .slice(0, 7)
            .map(p => ({
                name: p.name,
                value: p.soldRevenue
            }));

        // Scatter data for margin vs volume
        const scatterData = productList
            .filter(p => p.soldQty > 0)
            .map(p => ({
                x: p.soldQty,
                y: p.margin,
                z: p.grossProfit,
                name: p.name
            }));

        return {
            products: productList,
            totals,
            chartData,
            pieData,
            scatterData
        };
    }, [logs, priceMap, dateRange, sortBy]);

    const downloadCSV = () => {
        const headers = ['Produkt', 'Verkauft', 'Umsatz', 'Eingekauft', 'Kosten', 'Gewinn', 'Marge %', 'Ø VK-Preis', 'Ø EK-Preis'];
        const rows = profitData.products.map(p => [
            p.name,
            p.soldQty,
            p.soldRevenue.toFixed(2),
            p.boughtQty,
            p.boughtCost.toFixed(2),
            p.grossProfit.toFixed(2),
            p.margin.toFixed(1),
            p.avgSellPrice.toFixed(2),
            p.avgBuyPrice.toFixed(2)
        ]);

        const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Produkt_Profitabilitaet_${dateRange.start}_${dateRange.end}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 flex items-center gap-3">
                        <Target className="w-8 h-8 text-amber-400" />
                        Produkt-Profitabilität
                    </h1>
                    <p className="text-slate-400 mt-1">Gewinnanalyse nach Produkten</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-xl border border-slate-700">
                        <Calendar className="w-4 h-4 text-amber-400" />
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
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* MAIN KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/10 p-5 rounded-2xl border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-300/70 text-sm mb-2">
                        <DollarSign className="w-4 h-4" />
                        Gesamtumsatz
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(profitData.totals.totalRevenue)}</div>
                </div>

                <div className="bg-gradient-to-br from-red-900/30 to-red-800/10 p-5 rounded-2xl border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-300/70 text-sm mb-2">
                        <ArrowDownRight className="w-4 h-4" />
                        Wareneinsatz
                    </div>
                    <div className="text-2xl font-bold text-red-400">{formatCurrency(profitData.totals.totalCost)}</div>
                </div>

                <div className={`bg-gradient-to-br ${profitData.totals.totalProfit >= 0 ? 'from-violet-900/30 to-violet-800/10 border-violet-500/20' : 'from-red-900/30 to-red-800/10 border-red-500/20'} p-5 rounded-2xl border`}>
                    <div className={`flex items-center gap-2 text-sm mb-2 ${profitData.totals.totalProfit >= 0 ? 'text-violet-300/70' : 'text-red-300/70'}`}>
                        <TrendingUp className="w-4 h-4" />
                        Rohgewinn
                    </div>
                    <div className={`text-2xl font-bold ${profitData.totals.totalProfit >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
                        {formatCurrency(profitData.totals.totalProfit)}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/10 p-5 rounded-2xl border border-blue-500/20">
                    <div className="flex items-center gap-2 text-blue-300/70 text-sm mb-2">
                        <Percent className="w-4 h-4" />
                        Ø Marge
                    </div>
                    <div className={`text-2xl font-bold ${profitData.totals.avgMargin >= 20 ? 'text-blue-400' : 'text-amber-400'}`}>
                        {profitData.totals.avgMargin.toFixed(1)}%
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PROFIT BAR CHART */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                        Top 10 nach Gewinn
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={profitData.chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
                                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={100} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Bar dataKey="Gewinn" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* REVENUE PIE CHART */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <PieIcon className="w-5 h-5 text-violet-400" />
                        Umsatzverteilung
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={profitData.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {profitData.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* TOP & UNDERPERFORMERS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* TOP PERFORMERS */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Top Performer (Marge &gt;30%)
                    </h3>
                    <div className="space-y-3">
                        {profitData.totals.topPerformers.map((p, idx) => (
                            <div key={p.name} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-400/20 text-amber-400' :
                                        idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                                            idx === 2 ? 'bg-amber-600/20 text-amber-600' :
                                                'bg-slate-700 text-slate-500'
                                    }`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-200 truncate">{p.name}</div>
                                    <div className="text-xs text-slate-500">{p.soldQty} verkauft</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-emerald-400">{p.margin.toFixed(1)}%</div>
                                    <div className="text-xs text-slate-500">{formatCurrency(p.grossProfit)}</div>
                                </div>
                            </div>
                        ))}
                        {profitData.totals.topPerformers.length === 0 && (
                            <div className="text-center py-6 text-slate-500">Keine Top-Performer gefunden</div>
                        )}
                    </div>
                </div>

                {/* UNDERPERFORMERS */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Verbesserungspotenzial (Marge &lt;10%)
                    </h3>
                    <div className="space-y-3">
                        {profitData.totals.underperformers.map((p, idx) => (
                            <div key={p.name} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/10">
                                    <AlertCircle className="w-4 h-4 text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-200 truncate">{p.name}</div>
                                    <div className="text-xs text-slate-500">{p.soldQty} verkauft</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-amber-400">{p.margin.toFixed(1)}%</div>
                                    <div className="text-xs text-slate-500">{formatCurrency(p.grossProfit)}</div>
                                </div>
                            </div>
                        ))}
                        {profitData.totals.underperformers.length === 0 && (
                            <div className="text-center py-6 text-slate-500">Keine Underperformer gefunden</div>
                        )}
                    </div>
                </div>
            </div>

            {/* SORT CONTROLS */}
            <div className="flex gap-2">
                {[
                    { key: 'profit', label: 'Gewinn' },
                    { key: 'margin', label: 'Marge' },
                    { key: 'revenue', label: 'Umsatz' },
                    { key: 'volume', label: 'Volumen' }
                ].map(s => (
                    <button
                        key={s.key}
                        onClick={() => setSortBy(s.key)}
                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${sortBy === s.key
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* FULL PRODUCT TABLE */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50">
                            <tr className="text-slate-400 text-xs uppercase tracking-wider">
                                <th className="px-4 py-4">Produkt</th>
                                <th className="px-4 py-4 text-right">Verkauft</th>
                                <th className="px-4 py-4 text-right">Umsatz</th>
                                <th className="px-4 py-4 text-right">Eingekauft</th>
                                <th className="px-4 py-4 text-right">Kosten</th>
                                <th className="px-4 py-4 text-right">Gewinn</th>
                                <th className="px-4 py-4 text-right">Marge</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {profitData.products.slice(0, 20).map((p) => (
                                <tr key={p.name} className="hover:bg-slate-800/30 transition-colors text-slate-300">
                                    <td className="px-4 py-3 font-medium">{p.name}</td>
                                    <td className="px-4 py-3 text-right font-mono">{p.soldQty}</td>
                                    <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(p.soldRevenue)}</td>
                                    <td className="px-4 py-3 text-right font-mono">{p.boughtQty}</td>
                                    <td className="px-4 py-3 text-right font-mono text-red-400">{formatCurrency(p.boughtCost)}</td>
                                    <td className={`px-4 py-3 text-right font-mono font-bold ${p.grossProfit >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
                                        {formatCurrency(p.grossProfit)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.margin >= 30 ? 'bg-emerald-500/10 text-emerald-400' :
                                                p.margin >= 10 ? 'bg-blue-500/10 text-blue-400' :
                                                    p.margin >= 0 ? 'bg-amber-500/10 text-amber-400' :
                                                        'bg-red-500/10 text-red-400'
                                            }`}>
                                            {p.margin.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
