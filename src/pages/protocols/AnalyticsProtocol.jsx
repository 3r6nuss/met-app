import React, { useState, useMemo } from 'react';
import {
    BarChart3, TrendingUp, TrendingDown, Users, Package,
    Calendar, Filter, Download, PieChart as PieIcon,
    ArrowUpRight, ArrowDownRight, DollarSign, Activity,
    Truck, Layers
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

// Utility for formatting high numbers nicely (e.g. 1.2M, 250k)
const formatCompactNumber = (number) => {
    return Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(number);
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD' }).format(amount).replace('$', '$');
};

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#6366f1'];

export default function AnalyticsProtocol({ logs = [], employees = [], inventory = [] }) {
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, employees, products, logistic

    // --- DATA PROCESSING ---
    const processedData = useMemo(() => {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);

        const filtered = logs.filter(log => {
            const d = new Date(log.timestamp);
            return d >= start && d <= end;
        });

        // KPIs
        let revenue = 0;
        let expenses = 0;
        let productionVolume = 0;
        let productionValue = 0;
        let tradeVolume = 0;

        // Visual Data Structures
        const timeMap = {};
        const employeeMap = {};
        const productMap = {};
        const categoryMap = {};

        filtered.forEach(log => {
            const val = (log.price || 0) * (log.quantity || 1);
            const dayKey = new Date(log.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

            if (!timeMap[dayKey]) timeMap[dayKey] = { name: dayKey, income: 0, expense: 0, production: 0 };

            // PRODUCTION (Internal In)
            if (log.type === 'in' && log.category === 'internal') {
                productionVolume += log.quantity;
                productionValue += val;
                timeMap[dayKey].production += val;

                if (!employeeMap[log.depositor]) employeeMap[log.depositor] = { name: log.depositor, produced: 0, value: 0 };
                employeeMap[log.depositor].produced += log.quantity;
                employeeMap[log.depositor].value += val;
            }

            // TRADE
            if (log.category === 'trade') {
                tradeVolume += log.quantity;
                if (log.type === 'out') { // Sell -> Income
                    revenue += val;
                    timeMap[dayKey].income += val;
                } else { // Buy -> Expense
                    expenses += val;
                    timeMap[dayKey].expense += val;
                }
            }

            // Product Stats
            if (!productMap[log.itemName]) productMap[log.itemName] = { name: log.itemName, volume: 0, value: 0 };
            productMap[log.itemName].volume += log.quantity;
            productMap[log.itemName].value += val;
        });

        // Convert Maps to Arrays
        const chartData = Object.values(timeMap).reverse(); // Assuming logs are desc, we want asc for chart? actually maps usually unordered, need sort
        // Actually logs processing order matters. Let's just sort logs by date first if needed, or sort keys.
        // Let's sort the chart data by date parsing
        const sortedChartData = Object.values(timeMap).sort((a, b) => {
            const [d1, m1] = a.name.split('.');
            const [d2, m2] = b.name.split('.');
            // simple compare for current year
            return new Date(2025, m1 - 1, d1) - new Date(2025, m2 - 1, d2);
        });

        const topEmployees = Object.values(employeeMap).sort((a, b) => b.value - a.value);
        const topProducts = Object.values(productMap).sort((a, b) => b.volume - a.volume);

        return {
            kpi: {
                revenue,
                expenses,
                netProfit: revenue - expenses,
                productionValue,
                productionVolume,
                tradeVolume
            },
            charts: {
                timeline: sortedChartData,
                employees: topEmployees.slice(0, 10),
                products: topProducts.slice(0, 10),
                pieProducts: topProducts.slice(0, 5)
            }
        };

    }, [logs, dateRange]);


    return (
        <div className="space-y-6 pb-20 animate-fade-in">

            {/* HEADER & CONTROLS */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                        Analytics Dashboard
                    </h1>
                    <p className="text-slate-400 mt-1">Echtzeit Analyse & Performance Indikatoren</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-slate-800/50 p-2 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 rounded-lg border border-slate-700">
                        <Calendar className="w-4 h-4 text-violet-400" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-transparent border-none text-slate-200 text-sm focus:ring-0 p-0"
                        />
                        <span className="text-slate-500">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-transparent border-none text-slate-200 text-sm focus:ring-0 p-0"
                        />
                    </div>
                    <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <Filter className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* NAVIGATION TABS */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { id: 'dashboard', label: 'Overview', icon: BarChart3 },
                    { id: 'employees', label: 'Mitarbeiter', icon: Users },
                    { id: 'products', label: 'Produkte', icon: Package },
                    { id: 'logistics', label: 'Logistik Trend', icon: TrendingUp },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap
                            ${activeTab === tab.id
                                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                                : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent hover:border-slate-700'}
                        `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Gesamtumsatz"
                    value={formatCurrency(processedData.kpi.revenue)}
                    trend="+12.5%"
                    icon={DollarSign}
                    color="text-emerald-400"
                    trendUp={true}
                />
                <KPICard
                    title="Netto Gewinn"
                    value={formatCurrency(processedData.kpi.netProfit)}
                    trend="+8.2%"
                    icon={TrendingUp}
                    color={processedData.kpi.netProfit >= 0 ? "text-violet-400" : "text-red-400"}
                    trendUp={processedData.kpi.netProfit >= 0}
                />
                <KPICard
                    title="Produktionswert"
                    value={formatCurrency(processedData.kpi.productionValue)}
                    subValue={`${formatCompactNumber(processedData.kpi.productionVolume)} Items`}
                    trend="+5.3%"
                    icon={Layers}
                    color="text-amber-400"
                    trendUp={true}
                />
                <KPICard
                    title="Handelsvolumen"
                    value={formatCompactNumber(processedData.kpi.tradeVolume)}
                    subValue="Items gehandelt"
                    trend="-2.1%"
                    icon={Truck}
                    color="text-blue-400"
                    trendUp={false}
                />
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* BIG CHART */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-slate-300 font-bold mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-violet-400" />
                        Performance Übersicht
                    </h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={processedData.charts.timeline}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `\$${formatCompactNumber(val)}`} dx={-10} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(val) => formatCurrency(val)}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Area type="monotone" dataKey="income" name="Umsatz" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="production" name="Produktionswert" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SIDE STATS / RANKING */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6 shadow-xl flex flex-col">
                    <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-amber-400" />
                        Top Mitarbeiter
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {processedData.charts.employees.map((emp, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3 bg-slate-800/40 rounded-2xl border border-slate-700/30 hover:bg-slate-800/60 transition-colors">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-400/20 text-amber-400' : idx === 1 ? 'bg-slate-400/20 text-slate-400' : idx === 2 ? 'bg-amber-700/20 text-amber-700' : 'bg-slate-700 text-slate-500'}`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-200 truncate">{emp.name}</div>
                                    <div className="text-xs text-slate-500">{formatCompactNumber(emp.produced)} Items produziert</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-emerald-400">{formatCompactNumber(emp.value)} $</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <button className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors">
                            Alle anzeigen
                        </button>
                    </div>
                </div>

            </div>

            {/* ROW 2: DETAILED CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Distribution */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6Shadow-xl">
                    <h3 className="text-slate-300 font-bold mb-6 flex items-center gap-2">
                        <PieIcon className="w-5 h-5 text-blue-400" />
                        Produkt Verteilung (Top 5)
                    </h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={processedData.charts.pieProducts}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {processedData.charts.pieProducts.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                                    formatter={(val) => formatCurrency(val)}
                                />
                                <Legend verticalAlign="middle" align="right" layout="vertical" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar Chart Comp */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-slate-300 font-bold mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                        Einnahmen vs Ausgaben
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={processedData.charts.timeline}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <Tooltip
                                    cursor={{ fill: '#1e293b', opacity: 0.5 }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                                    formatter={(val) => formatCurrency(val)}
                                />
                                <Bar dataKey="income" name="Einnahmen" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="expense" name="Ausgaben" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
}

// Sub-Component for KPI Cards
const KPICard = ({ title, value, subValue, trend, icon: Icon, color, trendUp }) => (
    <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 hover:bg-slate-800/60 transition-all group">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${color.replace('text-', 'bg-')}/10 ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                    {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trend}
                </div>
            )}
        </div>
        <div className="space-y-1">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</div>
            <div className={`text-2xl font-bold text-slate-100 group-hover:scale-105 transition-transform origin-left`}>{value}</div>
            {subValue && <div className="text-xs text-slate-500 font-medium">{subValue}</div>}
        </div>
    </div>
);
