import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, Package, Users, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function PeriodProtocol({ logs }) {
    const [periodType, setPeriodType] = useState('month'); // 'week', 'month', 'year'
    const [reportMode, setReportMode] = useState('production'); // 'production', 'trade', 'employee'
    const [currentDate, setCurrentDate] = useState(new Date());

    // Filter & Sort States
    const [filterText, setFilterText] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    // Helper: Get start and end of period
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
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
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

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const processedData = useMemo(() => {
        const { start, end } = getPeriodRange(currentDate, periodType);

        // Filter logs by date
        const periodLogs = logs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= start && logDate <= end;
        });

        const stats = {};

        periodLogs.forEach(log => {
            const value = (log.price || 0) * (log.quantity || 0);

            if (reportMode === 'production') {
                if (log.type === 'in' && log.category === 'internal') {
                    if (!stats[log.itemName]) {
                        stats[log.itemName] = {
                            name: log.itemName,
                            producedQty: 0,
                            producedValue: 0
                        };
                    }
                    stats[log.itemName].producedQty += log.quantity;
                    stats[log.itemName].producedValue += value;
                }
            } else if (reportMode === 'trade') {
                if (log.category === 'trade') {
                    if (!stats[log.itemName]) {
                        stats[log.itemName] = {
                            name: log.itemName,
                            boughtQty: 0,
                            boughtCost: 0,
                            soldQty: 0,
                            soldRevenue: 0
                        };
                    }
                    if (log.type === 'in') { // Buying
                        stats[log.itemName].boughtQty += log.quantity;
                        stats[log.itemName].boughtCost += value;
                    } else if (log.type === 'out') { // Selling
                        stats[log.itemName].soldQty += log.quantity;
                        stats[log.itemName].soldRevenue += value;
                    }
                }
            } else if (reportMode === 'employee') {
                if (log.type === 'in' && log.category === 'internal') {
                    const key = `${log.depositor}-${log.itemName}`;
                    if (!stats[key]) {
                        stats[key] = {
                            employee: log.depositor,
                            product: log.itemName,
                            producedQty: 0,
                            producedValue: 0
                        };
                    }
                    stats[key].producedQty += log.quantity;
                    stats[key].producedValue += value;
                }
            }
        });

        let result = Object.values(stats).filter(item => {
            if (reportMode === 'production') return item.producedQty > 0;
            if (reportMode === 'employee') return item.producedQty > 0;
            return item.boughtQty > 0 || item.soldQty > 0;
        });

        // Apply Filters
        if (filterText) {
            const lowerFilter = filterText.toLowerCase();
            result = result.filter(item => {
                if (reportMode === 'employee') {
                    return item.product.toLowerCase().includes(lowerFilter);
                }
                return item.name.toLowerCase().includes(lowerFilter);
            });
        }

        if (reportMode === 'employee' && employeeFilter) {
            const lowerEmpFilter = employeeFilter.toLowerCase();
            result = result.filter(item => item.employee.toLowerCase().includes(lowerEmpFilter));
        }

        // Apply Sorting
        result.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Handle derived sort keys or specific logic
            if (sortConfig.key === 'profit') {
                aValue = a.soldRevenue - a.boughtCost;
                bValue = b.soldRevenue - b.boughtCost;
            } else if (sortConfig.key === 'name' && reportMode === 'employee') {
                // For employee mode, 'name' sort might be ambiguous, default to product name
                aValue = a.product;
                bValue = b.product;
            }

            if (typeof aValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else {
                return sortConfig.direction === 'asc'
                    ? aValue - bValue
                    : bValue - aValue;
            }
        });

        return result;

    }, [logs, currentDate, periodType, reportMode, filterText, employeeFilter, sortConfig]);

    const formatMoney = (amount) => amount.toLocaleString('de-DE', { style: 'currency', currency: 'USD' }).replace('$', '$');

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-slate-600 ml-1" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 text-violet-400 ml-1" />
            : <ArrowDown className="w-3 h-3 text-violet-400 ml-1" />;
    };

    const Th = ({ label, sortKey, align = 'left', color = '' }) => (
        <th
            className={`px-6 py-4 cursor-pointer hover:bg-slate-800 transition-colors select-none ${align === 'right' ? 'text-right' : 'text-left'} ${color}`}
            onClick={() => handleSort(sortKey)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                {label}
                <SortIcon columnKey={sortKey} />
            </div>
        </th>
    );

    return (
        <div className="animate-fade-in space-y-6">
            {/* Top Controls Bar */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700">

                {/* Left Group: Period & Date */}
                <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                    {/* Period Selector */}
                    <div className="flex bg-slate-800 p-1.5 rounded-xl gap-1">
                        {['week', 'month', 'year'].map(type => (
                            <button
                                key={type}
                                onClick={() => setPeriodType(type)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${periodType === type
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                    }`}
                            >
                                {type === 'week' ? 'Woche' : type === 'month' ? 'Monat' : 'Jahr'}
                            </button>
                        ))}
                    </div>

                    {/* Date Navigation */}
                    <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                        <button onClick={() => navigatePeriod(-1)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2 text-base font-bold text-slate-200 min-w-[180px] justify-center px-2">
                            <Calendar className="w-4 h-4 text-violet-400" />
                            {periodLabel}
                        </div>
                        <button onClick={() => navigatePeriod(1)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Right Group: Mode & Filters */}
                <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                    {/* Search Filters */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative group w-full md:w-48">
                            <input
                                type="text"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                placeholder="Produkt suchen..."
                                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-violet-500 transition-colors"
                            />
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 group-focus-within:text-violet-400 transition-colors" />
                        </div>
                        {reportMode === 'employee' && (
                            <div className="relative group w-full md:w-48">
                                <input
                                    type="text"
                                    value={employeeFilter}
                                    onChange={(e) => setEmployeeFilter(e.target.value)}
                                    placeholder="Mitarbeiter suchen..."
                                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-amber-500 transition-colors"
                                />
                                <Users className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 group-focus-within:text-amber-400 transition-colors" />
                            </div>
                        )}
                    </div>

                    {/* Mode Selector */}
                    <div className="flex bg-slate-800 p-1.5 rounded-xl gap-1 overflow-x-auto max-w-full">
                        <button
                            onClick={() => setReportMode('production')}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${reportMode === 'production'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                }`}
                        >
                            <Package className="w-4 h-4" />
                            Produktion
                        </button>
                        <button
                            onClick={() => setReportMode('trade')}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${reportMode === 'trade'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                }`}
                        >
                            <TrendingUp className="w-4 h-4" />
                            Handel
                        </button>
                        <button
                            onClick={() => setReportMode('employee')}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${reportMode === 'employee'
                                ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Mitarbeiter
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-900 text-slate-400 font-bold border-b border-slate-700">
                            <tr>
                                {reportMode === 'employee' ? (
                                    <>
                                        <Th label="Mitarbeiter" sortKey="employee" />
                                        <Th label="Produkt" sortKey="product" />
                                        <Th label="Produziert" sortKey="producedQty" align="right" />
                                        <Th label="Wert (Lohn)" sortKey="producedValue" align="right" />
                                    </>
                                ) : (
                                    <>
                                        <Th label="Produkt" sortKey="name" />
                                        {reportMode === 'production' ? (
                                            <>
                                                <Th label="Produziert" sortKey="producedQty" align="right" />
                                                <Th label="Wert (Lohn)" sortKey="producedValue" align="right" />
                                            </>
                                        ) : (
                                            <>
                                                <Th label="Eingekauft" sortKey="boughtQty" align="right" color="text-red-400" />
                                                <Th label="Ausgaben" sortKey="boughtCost" align="right" color="text-red-400" />
                                                <Th label="Verkauft" sortKey="soldQty" align="right" color="text-emerald-400" />
                                                <Th label="Einnahmen" sortKey="soldRevenue" align="right" color="text-emerald-400" />
                                                <Th label="Gewinn" sortKey="profit" align="right" />
                                            </>
                                        )}
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {processedData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-700/30 transition-colors group">
                                    {reportMode === 'employee' ? (
                                        <>
                                            <td className="px-6 py-4 font-medium text-amber-400">{item.employee}</td>
                                            <td className="px-6 py-4 text-slate-200">{item.product}</td>
                                            <td className="px-6 py-4 text-right text-slate-300 font-mono">{item.producedQty}</td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-400 font-mono">{formatMoney(item.producedValue)}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 font-medium text-slate-200">{item.name}</td>
                                            {reportMode === 'production' ? (
                                                <>
                                                    <td className="px-6 py-4 text-right text-slate-300 font-mono">{item.producedQty}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-emerald-400 font-mono">{formatMoney(item.producedValue)}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-4 text-right text-slate-300 font-mono">{item.boughtQty}</td>
                                                    <td className="px-6 py-4 text-right text-red-400 font-mono">{formatMoney(item.boughtCost)}</td>
                                                    <td className="px-6 py-4 text-right text-slate-300 font-mono">{item.soldQty}</td>
                                                    <td className="px-6 py-4 text-right text-emerald-400 font-mono">{formatMoney(item.soldRevenue)}</td>
                                                    <td className={`px-6 py-4 text-right font-bold font-mono ${item.soldRevenue - item.boughtCost >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {formatMoney(item.soldRevenue - item.boughtCost)}
                                                    </td>
                                                </>
                                            )}
                                        </>
                                    )}
                                </tr>
                            ))}

                            {processedData.length === 0 && (
                                <tr>
                                    <td colSpan={reportMode === 'trade' ? 6 : (reportMode === 'employee' ? 4 : 3)} className="px-6 py-12 text-center text-slate-500 italic">
                                        Keine Daten für diesen Zeitraum gefunden.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {/* Footer Totals */}
                        {processedData.length > 0 && (
                            <tfoot className="bg-slate-900/80 font-bold text-slate-200 border-t-2 border-slate-600">
                                <tr>
                                    <td className="px-6 py-4 uppercase tracking-wider text-xs text-slate-400" colSpan={reportMode === 'employee' ? 2 : 1}>Gesamt</td>
                                    {reportMode === 'production' || reportMode === 'employee' ? (
                                        <>
                                            <td className="px-6 py-4 text-right font-mono">{processedData.reduce((a, b) => a + b.producedQty, 0)}</td>
                                            <td className="px-6 py-4 text-right text-emerald-400 font-mono">
                                                {formatMoney(processedData.reduce((a, b) => a + b.producedValue, 0))}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 text-right font-mono">{processedData.reduce((a, b) => a + b.boughtQty, 0)}</td>
                                            <td className="px-6 py-4 text-right text-red-400 font-mono">
                                                {formatMoney(processedData.reduce((a, b) => a + b.boughtCost, 0))}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">{processedData.reduce((a, b) => a + b.soldQty, 0)}</td>
                                            <td className="px-6 py-4 text-right text-emerald-400 font-mono">
                                                {formatMoney(processedData.reduce((a, b) => a + b.soldRevenue, 0))}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-mono ${processedData.reduce((a, b) => a + (b.soldRevenue - b.boughtCost), 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {formatMoney(processedData.reduce((a, b) => a + (b.soldRevenue - b.boughtCost), 0))}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
