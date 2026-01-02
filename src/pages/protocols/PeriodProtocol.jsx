import React, { useState, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown,
    Package, Users, ArrowUpDown, ArrowUp, ArrowDown, Filter,
    DollarSign, Activity, PieChart as PieChartIcon, BarChart3
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

export default function PeriodProtocol({ logs, employees: _employees = [], inventory = [] }) {
    const [periodType, setPeriodType] = useState('month'); // 'week', 'month', 'year'
    const [reportMode, setReportMode] = useState('production'); // 'production', 'trade', 'employee'
    const [currentDate, setCurrentDate] = useState(new Date());

    // Filter & Sort States
    const [filterProduct, setFilterProduct] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    // --- HELPER FUNCTIONS ---

    // Valid Sets
    // const validEmployeeNames = useMemo(() => {
    //     const set = new Set();
    //     employees.forEach(e => set.add(typeof e === 'string' ? e : e.name));
    //     return set;
    // }, [employees]);

    const validProductNames = useMemo(() => {
        const set = new Set();
        inventory.forEach(i => set.add(i.name));
        return set;
    }, [inventory]);

    const getPeriodRange = (date, type) => {
        const start = new Date(date);
        const end = new Date(date);

        if (type === 'week') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (type === 'month') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
        } else if (type === 'year') {
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
        }
        return { start, end };
    };

    const periodLabel = useMemo(() => {
        const { start, end } = getPeriodRange(currentDate, periodType);
        if (periodType === 'year') return start.getFullYear().toString();
        if (periodType === 'month') return start.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
        return `${start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }, [currentDate, periodType]);

    const navigatePeriod = (direction) => {
        const newDate = new Date(currentDate);
        if (periodType === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
        if (periodType === 'month') newDate.setMonth(newDate.getMonth() + direction);
        if (periodType === 'year') newDate.setFullYear(newDate.getFullYear() + direction);
        setCurrentDate(newDate);
    };

    const formatMoney = (amount) => amount.toLocaleString('de-DE', { style: 'currency', currency: 'USD' }).replace('$', '$');

    // --- DATA PROCESSING ---

    const { start, end } = useMemo(() => getPeriodRange(currentDate, periodType), [currentDate, periodType]);

    // 1. Filter Logs by Date & Validity
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (log.itemName === 'Korrektur Geschäftskonto' || log.msg?.includes('Korrektur Geschäftskonto')) return false;
            // if (log.price === 0) return false; // Optional: Keep 0 price for quantity tracking?

            const logDate = new Date(log.timestamp);
            if (logDate < start || logDate > end) return false;

            // Strict filtering based on Report Mode contexts could be applied here
            // But generic valids are good for now
            if (!validProductNames.has(log.itemName)) return false;
            // if (!validEmployeeNames.has(log.depositor)) return false; // Allow external trade partners if need be

            return true;
        });
    }, [logs, start, end, validProductNames]); // Removed validEmployeeNames from trigger to potentially allow trade partners

    // 2. Extract Unique Values for Dropdowns
    const { uniqueProducts, uniqueEmployees } = useMemo(() => {
        const products = new Set();
        const emps = new Set();
        filteredLogs.forEach(log => {
            if (log.itemName) products.add(log.itemName);
            if (log.depositor) emps.add(log.depositor);
        });
        return {
            uniqueProducts: Array.from(products).sort(),
            uniqueEmployees: Array.from(emps).sort()
        };
    }, [filteredLogs]);

    // 3. Mode Specific Aggregation
    const { tableData, chartData, pieData, summaryStats, tradeIncome, tradeOutcome, topEmployee } = useMemo(() => {
        const dataMap = {};
        const timeMap = {}; // For Line/Bar Chart over time
        const productMap = {}; // For Pie Chart

        // Summary Stats
        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalQuantity = 0;
        let count = 0;

        filteredLogs.forEach(log => {
            const value = (log.price || 0) * (log.quantity || 1);
            const dateKey = periodType === 'year'
                ? new Date(log.timestamp).toLocaleDateString('de-DE', { month: 'short' })
                : new Date(log.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

            // Initialize Time Map
            if (!timeMap[dateKey]) timeMap[dateKey] = { name: dateKey, value: 0, income: 0, expense: 0 };

            if (reportMode === 'production') {
                if (log.type === 'in' && log.category === 'internal') {
                    // Table Data
                    if (!dataMap[log.itemName]) {
                        dataMap[log.itemName] = { name: log.itemName, producedQty: 0, producedValue: 0 };
                    }
                    dataMap[log.itemName].producedQty += log.quantity;
                    dataMap[log.itemName].producedValue += value;

                    // Chart Data
                    timeMap[dateKey].value += value;

                    // Pie Data
                    productMap[log.itemName] = (productMap[log.itemName] || 0) + log.quantity;

                    totalRevenue += value; // "Value" produced
                    totalQuantity += log.quantity;
                    count++;
                }
            } else if (reportMode === 'trade') {
                if (log.category === 'trade') {
                    // Table Data (We might need two tables or a unified one, let's do unified for data processing first)
                    // Actually, let's separate income/outcome visually but process together
                    if (log.type === 'in') { // Buy -> Expense
                        // Using negative for internal tracking if needed, but display positive in expense column
                        totalExpenses += value;
                        timeMap[dateKey].expense += value;
                    } else if (log.type === 'out') { // Sell -> Income
                        totalRevenue += value;
                        timeMap[dateKey].income += value;
                    }

                    // Product Popularity (Pie) - Volume based
                    productMap[log.itemName] = (productMap[log.itemName] || 0) + log.quantity;
                }
            } else if (reportMode === 'employee') {
                if (log.type === 'in' && log.category === 'internal') {
                    const key = `${log.depositor}-${log.itemName}`;
                    if (!dataMap[key]) {
                        dataMap[key] = {
                            id: key,
                            employee: log.depositor,
                            product: log.itemName,
                            name: log.itemName, // Alias for generic filters
                            producedQty: 0,
                            producedValue: 0
                        };
                    }
                    dataMap[key].producedQty += log.quantity;
                    dataMap[key].producedValue += value;

                    timeMap[dateKey].value += value;
                    totalRevenue += value; // Value produced
                    totalQuantity += log.quantity;
                    count++;
                }
            }
        });

        // Independent Top Employee Calculation
        let topEmployee = { name: 'N/A', value: 0 };
        if (reportMode === 'employee') {
            const empStats = {};
            filteredLogs.forEach(log => {
                if (log.type === 'in' && log.category === 'internal') {
                    const val = (log.price || 0) * (log.quantity || 1);
                    empStats[log.depositor] = (empStats[log.depositor] || 0) + val;
                }
            });
            const sortedEmps = Object.entries(empStats).sort((a, b) => b[1] - a[1]);
            if (sortedEmps.length > 0) {
                topEmployee = { name: sortedEmps[0][0], value: sortedEmps[0][1] };
            }
        }

        // Post-Process Table Data
        let processedTableData = Object.values(dataMap);

        // Filter Table
        if (filterProduct) {
            processedTableData = processedTableData.filter(d => (d.name === filterProduct || d.product === filterProduct)); // Check structure
        }
        if (filterEmployee && reportMode === 'employee') {
            processedTableData = processedTableData.filter(d => d.employee === filterEmployee);
        }

        // Sort Table
        processedTableData.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (typeof valA === 'string') return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        });

        // Trade Specific Table Data handling
        const tradeIncome = [];
        const tradeOutcome = [];
        if (reportMode === 'trade') {
            const incomeMap = {};
            const outcomeMap = {};
            filteredLogs.forEach(log => {
                if (log.category === 'trade') {
                    const value = (log.price || 0) * (log.quantity || 1);
                    if (log.type === 'out') { // Sell
                        if (!incomeMap[log.itemName]) incomeMap[log.itemName] = { name: log.itemName, soldQty: 0, soldRevenue: 0 };
                        incomeMap[log.itemName].soldQty += log.quantity;
                        incomeMap[log.itemName].soldRevenue += value;
                    } else if (log.type === 'in') { // Buy
                        if (!outcomeMap[log.itemName]) outcomeMap[log.itemName] = { name: log.itemName, boughtQty: 0, boughtCost: 0 };
                        outcomeMap[log.itemName].boughtQty += log.quantity;
                        outcomeMap[log.itemName].boughtCost += value;
                    }
                }
            });
            // Process Trade Tables
            Object.values(incomeMap).forEach(d => tradeIncome.push(d));
            Object.values(outcomeMap).forEach(d => tradeOutcome.push(d));
            // Basic sort for trade
            tradeIncome.sort((a, b) => b.soldRevenue - a.soldRevenue);
            tradeOutcome.sort((a, b) => b.boughtCost - a.boughtCost);
        }


        // Post-Process Charts
        // Logs are typically Newest -> Oldest. We process them in order. 
        // So timeMap keys are created Newest -> Oldest (roughly).
        // We want chart to be Oldest -> Newest (Left -> Right).
        const chartDataFinal = Object.values(timeMap).reverse();

        // Process Pie Data (Top 5)
        const processedPieData = Object.entries(productMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return {
            tableData: processedTableData,
            chartData: chartDataFinal,
            pieData: processedPieData,
            tradeIncome,
            tradeOutcome,
            topEmployee,
            summaryStats: {
                totalRevenue,
                totalExpenses,
                netProfit: totalRevenue - totalExpenses,
                totalQuantity,
                count
            }
        };

    }, [filteredLogs, reportMode, filterProduct, filterEmployee, sortConfig, periodType]);

    // --- RENDER HELPERS ---

    const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const Th = ({ label, sortKey, align = 'left' }) => (
        <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
            onClick={() => sortKey && handleSort(sortKey)}>
            <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                {label}
                {sortKey && sortConfig.key === sortKey && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-violet-400" /> : <ArrowDown className="w-3 h-3 text-violet-400" />
                )}
            </div>
        </th>
    );

    // --- MAIN RENDER ---
    return (
        <div className="animate-fade-in space-y-6 pb-20">
            {/* 1. TOP BAR: Period & Mode */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-xl sticky top-0 z-20">
                {/* Date Nav */}
                <div className="flex items-center gap-4 w-full xl:w-auto p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        {['week', 'month', 'year'].map(type => (
                            <button key={type} onClick={() => setPeriodType(type)}
                                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${periodType === type ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
                                {type === 'week' ? 'Woche' : type === 'month' ? 'Monat' : 'Jahr'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3 px-4 border-l border-slate-700">
                        <button onClick={() => navigatePeriod(-1)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
                        <span className="text-base font-bold text-slate-100 min-w-[160px] text-center flex items-center justify-center gap-2">
                            <Calendar className="w-4 h-4 text-violet-400" /> {periodLabel}
                        </span>
                        <button onClick={() => navigatePeriod(1)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Mode Switch */}
                <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/50 gap-2">
                    <button onClick={() => setReportMode('production')} className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${reportMode === 'production' ? 'bg-emerald-600 text-white shadow-emerald-500/20 shadow-lg' : 'text-slate-400 hover:bg-slate-700'}`}>
                        <Package className="w-4 h-4" /> Produktion
                    </button>
                    <button onClick={() => setReportMode('trade')} className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${reportMode === 'trade' ? 'bg-blue-600 text-white shadow-blue-500/20 shadow-lg' : 'text-slate-400 hover:bg-slate-700'}`}>
                        <TrendingUp className="w-4 h-4" /> Handel
                    </button>
                    <button onClick={() => setReportMode('employee')} className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${reportMode === 'employee' ? 'bg-amber-600 text-white shadow-amber-500/20 shadow-lg' : 'text-slate-400 hover:bg-slate-700'}`}>
                        <Users className="w-4 h-4" /> Mitarbeiter
                    </button>
                </div>
            </div>

            {/* 2. STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                        {reportMode === 'trade' ? 'Gesamtumsatz' : 'Produktionswert'}
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{formatMoney(summaryStats.totalRevenue)}</div>
                    <div className="mt-2 text-xs text-emerald-500/80 bg-emerald-500/10 inline-flex items-center px-2 py-1 rounded w-fit">
                        <TrendingUp className="w-3 h-3 mr-1" /> +12% vs. Vormonat
                    </div>
                </div>

                {reportMode === 'trade' && (
                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Gesamtausgaben</div>
                        <div className="text-2xl font-bold text-red-400">{formatMoney(summaryStats.totalExpenses)}</div>
                        <div className="mt-2 text-xs text-red-500/80 bg-red-500/10 inline-flex items-center px-2 py-1 rounded w-fit">
                            <TrendingDown className="w-3 h-3 mr-1" /> -5% Kostenreduktion
                        </div>
                    </div>
                )}

                {reportMode === 'trade' ? (
                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Netto Gewinn</div>
                        <div className={`text-2xl font-bold ${summaryStats.netProfit >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
                            {formatMoney(summaryStats.netProfit)}
                        </div>
                        <div className="mt-2 text-xs text-violet-500/80 bg-violet-500/10 inline-flex items-center px-2 py-1 rounded w-fit">
                            Marge: {summaryStats.totalRevenue > 0 ? ((summaryStats.netProfit / summaryStats.totalRevenue) * 100).toFixed(1) : 0}%
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Produzierte Menge</div>
                        <div className="text-2xl font-bold text-blue-400">{summaryStats.totalQuantity} <span className="text-sm font-medium text-slate-500">Stk.</span></div>
                        <div className="mt-2 text-xs text-blue-500/80 bg-blue-500/10 inline-flex items-center px-2 py-1 rounded w-fit">
                            <Activity className="w-3 h-3 mr-1" /> {summaryStats.count} Buchungen
                        </div>
                    </div>
                )}

                {reportMode === 'employee' && (
                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Top Mitarbeiter</div>
                        <div className="text-xl font-bold text-amber-400 truncate">
                            {summaryStats.count > 0 ? (topEmployee?.name || 'N/A') : 'N/A'}
                        </div>
                        <div className="text-xs text-slate-500">{formatMoney(topEmployee?.value || 0)}</div>
                    </div>
                )}
            </div>

            {/* 3. CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Main Trend Chart */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-slate-300 font-bold mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-violet-400" />
                        {reportMode === 'trade' ? 'Einnahmen & Ausgaben Verlauf' : 'Produktionswert Verlauf'}
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {reportMode === 'trade' ? (
                                <BarChart data={chartData}>
                                    <defs>
                                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(val) => formatMoney(val)}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="income" name="Einnahmen" fill="url(#incomeGrad)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    <Bar dataKey="expense" name="Ausgaben" fill="url(#expenseGrad)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            ) : (
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(val) => formatMoney(val)}
                                    />
                                    <Area type="monotone" dataKey="value" name="Wert" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorValue)" />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* RIGHT: Distribution Pie */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col">
                    <h3 className="text-slate-300 font-bold mb-2 flex items-center gap-2">
                        <PieChartIcon className="w-5 h-5 text-amber-400" />
                        Top Produkte (Menge)
                    </h3>
                    <div className="items-center justify-center flex-1 min-h-[250px] relative">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-slate-500 italic">Keine Daten</div>
                        )}
                        {/* Center Label Overlay */}
                        {pieData.length > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-slate-200">{pieData.reduce((a, b) => a + b.value, 0)}</div>
                                    <div className="text-[10px] uppercase text-slate-500 tracking-wider">Items</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. DETAILS TABLES */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                        Detail Protokolle
                        <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-1 rounded-full">{reportMode.toUpperCase()}</span>
                    </h3>

                    {/* Filters */}
                    <div className="flex gap-2">
                        <div className="relative group">
                            <select className="bg-slate-800 text-slate-300 text-xs font-bold rounded-lg pl-3 pr-8 py-2 appearance-none focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                                value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
                                <option value="">Alle Produkte</option>
                                {uniqueProducts.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <Filter className="w-3 h-3 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                        {reportMode === 'employee' && (
                            <div className="relative group">
                                <select className="bg-slate-800 text-slate-300 text-xs font-bold rounded-lg pl-3 pr-8 py-2 appearance-none focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                                    value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                                    <option value="">Alle Mitarbeiter</option>
                                    {uniqueEmployees.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                                <Filter className="w-3 h-3 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                            </div>
                        )}
                    </div>
                </div>

                {/* TABLE CONTENT */}
                <div className="overflow-x-auto">
                    {reportMode === 'trade' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-700/50">
                            {/* INCOME */}
                            <div>
                                <div className="p-3 bg-emerald-500/5 text-emerald-400 font-bold text-center border-b border-slate-700/50 text-xs uppercase tracking-wider">Einnahmen (Verkauf)</div>
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-900/50 text-slate-500">
                                        <tr><th className="px-4 py-3">Produkt</th><th className="px-4 py-3 text-right">Menge</th><th className="px-4 py-3 text-right">Summe</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/30">
                                        {tradeIncome.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-800/30">
                                                <td className="px-4 py-3 font-medium text-slate-300">{row.name}</td>
                                                <td className="px-4 py-3 text-right text-slate-400">{row.soldQty}</td>
                                                <td className="px-4 py-3 text-right text-emerald-400 font-bold font-mono">{formatMoney(row.soldRevenue)}</td>
                                            </tr>
                                        ))}
                                        {tradeIncome.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-500 italic">Keine Verkäufe</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            {/* OUTCOME */}
                            <div>
                                <div className="p-3 bg-red-500/5 text-red-400 font-bold text-center border-b border-slate-700/50 text-xs uppercase tracking-wider">Ausgaben (Einkauf)</div>
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-900/50 text-slate-500">
                                        <tr><th className="px-4 py-3">Produkt</th><th className="px-4 py-3 text-right">Menge</th><th className="px-4 py-3 text-right">Summe</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/30">
                                        {tradeOutcome.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-800/30">
                                                <td className="px-4 py-3 font-medium text-slate-300">{row.name}</td>
                                                <td className="px-4 py-3 text-right text-slate-400">{row.boughtQty}</td>
                                                <td className="px-4 py-3 text-right text-red-400 font-bold font-mono">{formatMoney(row.boughtCost)}</td>
                                            </tr>
                                        ))}
                                        {tradeOutcome.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-500 italic">Keine Einkäufe</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                                <tr>
                                    {reportMode === 'employee' && <Th label="Mitarbeiter" sortKey="employee" />}
                                    <Th label={reportMode === 'employee' ? "Produkt (Fokus)" : "Produkt"} sortKey={reportMode === 'employee' ? 'product' : 'name'} />
                                    <Th label="Menge" sortKey="producedQty" align="right" />
                                    <Th label="Wert" sortKey="producedValue" align="right" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/40">
                                {tableData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                        {reportMode === 'employee' && <td className="px-6 py-4 font-medium text-amber-400">{row.employee}</td>}
                                        <td className="px-6 py-4 text-slate-300">{reportMode === 'employee' ? row.product : row.name}</td>
                                        <td className="px-6 py-4 text-right text-slate-400 font-mono">{row.producedQty}</td>
                                        <td className="px-6 py-4 text-right text-emerald-400 font-bold font-mono">{formatMoney(row.producedValue)}</td>
                                    </tr>
                                ))}
                                {tableData.length === 0 && (
                                    <tr><td colSpan={5} className="py-12 text-center text-slate-500 italic">Keine Daten für diesen Filter.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
