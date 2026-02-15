import React, { useState, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp,
    TrendingDown, Package, Users, Filter, BarChart3, PieChart as PieChartIcon,
    ArrowUp, ArrowDown, Activity
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function PeriodProtocol({ logs, employees: _employees = [], inventory = [] }) {
    const [periodType, setPeriodType] = useState('month'); // 'week', 'month', 'year'
    const [reportMode, setReportMode] = useState('production'); // 'production', 'trade', 'employee'
    const [currentDate, setCurrentDate] = useState(new Date());

    // Filter & Sort States
    const [filterProduct, setFilterProduct] = useState('all');
    const [filterEmployee, setFilterEmployee] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    // --- HELPER FUNCTIONS ---
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

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (log.itemName === 'Korrektur Geschäftskonto' || log.msg?.includes('Korrektur Geschäftskonto')) return false;
            if (log.price === 0) return false;

            const logDate = new Date(log.timestamp);
            if (logDate < start || logDate > end) return false;

            if (!validProductNames.has(log.itemName)) return false;
            return true;
        });
    }, [logs, start, end, validProductNames]);

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

    const { tableData, chartData, pieData, summaryStats, tradeIncome, tradeOutcome, topEmployee } = useMemo(() => {
        const dataMap = {};
        const timeMap = {};
        const productMap = {};

        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalQuantity = 0;
        let count = 0;

        filteredLogs.forEach(log => {
            const value = (log.price || 0) * (log.quantity || 1);
            const dateKey = periodType === 'year'
                ? new Date(log.timestamp).toLocaleDateString('de-DE', { month: 'short' })
                : new Date(log.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

            if (!timeMap[dateKey]) timeMap[dateKey] = { name: dateKey, value: 0, income: 0, expense: 0 };

            if (reportMode === 'production') {
                if (log.type === 'in' && log.category === 'internal') {
                    if (!dataMap[log.itemName]) {
                        dataMap[log.itemName] = { name: log.itemName, producedQty: 0, producedValue: 0 };
                    }
                    dataMap[log.itemName].producedQty += log.quantity;
                    dataMap[log.itemName].producedValue += value;

                    timeMap[dateKey].value += value;
                    productMap[log.itemName] = (productMap[log.itemName] || 0) + log.quantity;

                    totalRevenue += value;
                    totalQuantity += log.quantity;
                    count++;
                }
            } else if (reportMode === 'trade') {
                if (log.category === 'trade') {
                    if (log.type === 'in') {
                        totalExpenses += value;
                        timeMap[dateKey].expense += value;
                    } else if (log.type === 'out') {
                        totalRevenue += value;
                        timeMap[dateKey].income += value;
                    }
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
                            name: log.itemName,
                            producedQty: 0,
                            producedValue: 0
                        };
                    }
                    dataMap[key].producedQty += log.quantity;
                    dataMap[key].producedValue += value;

                    timeMap[dateKey].value += value;
                    totalRevenue += value;
                    totalQuantity += log.quantity;
                    count++;
                }
            }
        });

        let topEmp = { name: 'N/A', value: 0 };
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
                topEmp = { name: sortedEmps[0][0], value: sortedEmps[0][1] };
            }
        }

        let processedTableData = Object.values(dataMap);

        if (filterProduct !== 'all') {
            processedTableData = processedTableData.filter(d => (d.name === filterProduct || d.product === filterProduct));
        }
        if (filterEmployee !== 'all' && reportMode === 'employee') {
            processedTableData = processedTableData.filter(d => d.employee === filterEmployee);
        }

        processedTableData.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (typeof valA === 'string') return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        });

        const tradeInc = [];
        const tradeOut = [];
        if (reportMode === 'trade') {
            const incomeMap = {};
            const outcomeMap = {};
            filteredLogs.forEach(log => {
                if (log.category === 'trade') {
                    const value = (log.price || 0) * (log.quantity || 1);
                    if (log.type === 'out') {
                        if (!incomeMap[log.itemName]) incomeMap[log.itemName] = { name: log.itemName, soldQty: 0, soldRevenue: 0 };
                        incomeMap[log.itemName].soldQty += log.quantity;
                        incomeMap[log.itemName].soldRevenue += value;
                    } else if (log.type === 'in') {
                        if (!outcomeMap[log.itemName]) outcomeMap[log.itemName] = { name: log.itemName, boughtQty: 0, boughtCost: 0 };
                        outcomeMap[log.itemName].boughtQty += log.quantity;
                        outcomeMap[log.itemName].boughtCost += value;
                    }
                }
            });
            Object.values(incomeMap).forEach(d => tradeInc.push(d));
            Object.values(outcomeMap).forEach(d => tradeOut.push(d));
            tradeInc.sort((a, b) => b.soldRevenue - a.soldRevenue);
            tradeOut.sort((a, b) => b.boughtCost - a.boughtCost);
        }

        const chartDataFinal = Object.values(timeMap).reverse();
        const processedPieData = Object.entries(productMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return {
            tableData: processedTableData,
            chartData: chartDataFinal,
            pieData: processedPieData,
            tradeIncome: tradeInc,
            tradeOutcome: tradeOut,
            topEmployee: topEmp,
            summaryStats: {
                totalRevenue,
                totalExpenses,
                netProfit: totalRevenue - totalExpenses,
                totalQuantity,
                count
            }
        };

    }, [filteredLogs, reportMode, filterProduct, filterEmployee, sortConfig, periodType]);

    const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="animate-fade-in space-y-6 pb-20">
            {/* Header / Controls */}
            <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="p-4 flex flex-col xl:flex-row justify-between items-center gap-4">
                    {/* Period Navigation */}
                    <div className="flex items-center gap-4 w-full xl:w-auto p-1 bg-slate-950/50 rounded-xl border border-slate-800">
                        <Tabs value={periodType} onValueChange={setPeriodType} className="border-r border-slate-800 pr-4 mr-2">
                            <TabsList className="bg-slate-900">
                                <TabsTrigger value="week">Woche</TabsTrigger>
                                <TabsTrigger value="month">Monat</TabsTrigger>
                                <TabsTrigger value="year">Jahr</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={() => navigatePeriod(-1)} className="h-8 w-8 hover:bg-slate-800">
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm font-bold text-slate-200 min-w-[140px] text-center flex items-center justify-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-violet-400" /> {periodLabel}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => navigatePeriod(1)} className="h-8 w-8 hover:bg-slate-800">
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Mode Switch */}
                    <Tabs value={reportMode} onValueChange={setReportMode} className="bg-slate-950/50 p-1 rounded-xl border border-slate-800">
                        <TabsList className="bg-slate-900">
                            <TabsTrigger value="production" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                                <Package className="w-4 h-4 mr-2" /> Produktion
                            </TabsTrigger>
                            <TabsTrigger value="trade" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                                <TrendingUp className="w-4 h-4 mr-2" /> Handel
                            </TabsTrigger>
                            <TabsTrigger value="employee" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                                <Users className="w-4 h-4 mr-2" /> Mitarbeiter
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                            {reportMode === 'trade' ? 'Gesamtumsatz' : 'Produktionswert'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-emerald-400">{formatMoney(summaryStats.totalRevenue)}</div>
                        <Badge variant="outline" className="mt-2 text-emerald-500 border-emerald-500/20 bg-emerald-500/10 gap-1">
                            <TrendingUp className="w-3 h-3" /> +12%
                        </Badge>
                    </CardContent>
                </Card>

                {reportMode === 'trade' && (
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Gesamtausgaben</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold text-red-400">{formatMoney(summaryStats.totalExpenses)}</div>
                            <Badge variant="outline" className="mt-2 text-red-500 border-red-500/20 bg-red-500/10 gap-1">
                                <TrendingDown className="w-3 h-3" /> -5%
                            </Badge>
                        </CardContent>
                    </Card>
                )}

                {reportMode === 'trade' ? (
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Netto Gewinn</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className={cn("text-2xl font-bold", summaryStats.netProfit >= 0 ? "text-violet-400" : "text-red-400")}>
                                {formatMoney(summaryStats.netProfit)}
                            </div>
                            <Badge variant="outline" className="mt-2 text-violet-500 border-violet-500/20 bg-violet-500/10">
                                Marge: {summaryStats.totalRevenue > 0 ? ((summaryStats.netProfit / summaryStats.totalRevenue) * 100).toFixed(1) : 0}%
                            </Badge>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Menge</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold text-blue-400">{summaryStats.totalQuantity} <span className="text-sm text-slate-500 font-normal">Stk.</span></div>
                            <Badge variant="outline" className="mt-2 text-blue-500 border-blue-500/20 bg-blue-500/10 gap-1">
                                <Activity className="w-3 h-3" /> {summaryStats.count} Buchungen
                            </Badge>
                        </CardContent>
                    </Card>
                )}

                {reportMode === 'employee' && (
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Top Mitarbeiter</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-xl font-bold text-amber-400 truncate">
                                {summaryStats.count > 0 ? (topEmployee?.name || 'N/A') : 'N/A'}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{formatMoney(topEmployee?.value || 0)}</div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-200">
                            <BarChart3 className="w-5 h-5 text-violet-400" />
                            {reportMode === 'trade' ? 'Einnahmen & Ausgaben Verlauf' : 'Produktionswert Verlauf'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
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
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
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
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(val) => formatMoney(val)}
                                        />
                                        <Area type="monotone" dataKey="value" name="Wert" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorValue)" />
                                    </AreaChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-200">
                            <PieChartIcon className="w-5 h-5 text-amber-400" />
                            Top Produkte
                        </CardTitle>
                        <CardDescription>Verteilung der Menge</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
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
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Detail Tables */}
            <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-4">
                    <CardTitle className="flex items-center gap-2 text-slate-200">
                        Detail Protokolle
                        <Badge variant="secondary" className="ml-2 bg-slate-800">{reportMode.toUpperCase()}</Badge>
                    </CardTitle>
                    <div className="flex gap-2">
                        <Select value={filterProduct} onValueChange={setFilterProduct}>
                            <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700 h-9">
                                <SelectValue placeholder="Alle Produkte" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-slate-800">
                                <SelectItem value="all">Alle Produkte</SelectItem>
                                {uniqueProducts.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {reportMode === 'employee' && (
                            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                                <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700 h-9">
                                    <SelectValue placeholder="Alle Mitarbeiter" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-950 border-slate-800">
                                    <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                                    {uniqueEmployees.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {reportMode === 'trade' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                            {/* INCOME */}
                            <div>
                                <div className="p-3 bg-emerald-500/5 text-emerald-400 font-bold text-center border-b border-slate-800 text-xs uppercase tracking-wider">Einnahmen</div>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-slate-800 hover:bg-transparent">
                                            <TableHead>Produkt</TableHead>
                                            <TableHead className="text-right">Menge</TableHead>
                                            <TableHead className="text-right">Summe</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tradeIncome.map((row, i) => (
                                            <TableRow key={i} className="border-slate-800 hover:bg-slate-800/50">
                                                <TableCell className="font-medium text-slate-300">{row.name}</TableCell>
                                                <TableCell className="text-right text-slate-400">{row.soldQty}</TableCell>
                                                <TableCell className="text-right text-emerald-400 font-bold font-mono">{formatMoney(row.soldRevenue)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {/* OUTCOME */}
                            <div>
                                <div className="p-3 bg-red-500/5 text-red-400 font-bold text-center border-b border-slate-800 text-xs uppercase tracking-wider">Ausgaben</div>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-slate-800 hover:bg-transparent">
                                            <TableHead>Produkt</TableHead>
                                            <TableHead className="text-right">Menge</TableHead>
                                            <TableHead className="text-right">Summe</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tradeOutcome.map((row, i) => (
                                            <TableRow key={i} className="border-slate-800 hover:bg-slate-800/50">
                                                <TableCell className="font-medium text-slate-300">{row.name}</TableCell>
                                                <TableCell className="text-right text-slate-400">{row.boughtQty}</TableCell>
                                                <TableCell className="text-right text-red-400 font-bold font-mono">{formatMoney(row.boughtCost)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800 hover:bg-transparent">
                                    {reportMode === 'employee' && (
                                        <TableHead className="cursor-pointer" onClick={() => handleSort('employee')}>
                                            <div className="flex items-center gap-1">Mitarbeiter {sortConfig.key === 'employee' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                                        </TableHead>
                                    )}
                                    <TableHead className="cursor-pointer" onClick={() => handleSort(reportMode === 'employee' ? 'product' : 'name')}>
                                        <div className="flex items-center gap-1">Produkt {sortConfig.key === (reportMode === 'employee' ? 'product' : 'name') && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                                    </TableHead>
                                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('producedQty')}>
                                        <div className="flex items-center justify-end gap-1">Menge {sortConfig.key === 'producedQty' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                                    </TableHead>
                                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('producedValue')}>
                                        <div className="flex items-center justify-end gap-1">Wert {sortConfig.key === 'producedValue' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableData.map((row, idx) => (
                                    <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/50">
                                        {reportMode === 'employee' && <TableCell className="font-medium text-amber-400">{row.employee}</TableCell>}
                                        <TableCell className="text-slate-300">{reportMode === 'employee' ? row.product : row.name}</TableCell>
                                        <TableCell className="text-right text-slate-400 font-mono">{row.producedQty}</TableCell>
                                        <TableCell className="text-right text-emerald-400 font-bold font-mono">{formatMoney(row.producedValue)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
