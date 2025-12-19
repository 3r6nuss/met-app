import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, Package, Users, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';

export default function PeriodProtocol({ logs, employees = [], inventory = [] }) {
    const [periodType, setPeriodType] = useState('month'); // 'week', 'month', 'year'
    const [reportMode, setReportMode] = useState('production'); // 'production', 'trade', 'employee'
    const [currentDate, setCurrentDate] = useState(new Date());

    // Filter & Sort States
    const [filterProduct, setFilterProduct] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    // Valid Sets
    const validEmployeeNames = useMemo(() => {
        const set = new Set();
        employees.forEach(e => set.add(typeof e === 'string' ? e : e.name));
        return set;
    }, [employees]);

    const validProductNames = useMemo(() => {
        const set = new Set();
        inventory.forEach(i => set.add(i.name));
        return set;
    }, [inventory]);

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

    // Extract unique values for dropdowns (Filtered by Valid Lists)
    const { uniqueProducts, uniqueEmployees } = useMemo(() => {
        const products = new Set();
        const emps = new Set();
        logs.forEach(log => {
            if (log.itemName && validProductNames.has(log.itemName)) products.add(log.itemName);
            if (log.depositor && validEmployeeNames.has(log.depositor)) emps.add(log.depositor);
        });
        return {
            uniqueProducts: Array.from(products).sort(),
            uniqueEmployees: Array.from(emps).sort()
        };
    }, [logs, validProductNames, validEmployeeNames]);

    const { processedData, tradeIncomeData, tradeOutcomeData } = useMemo(() => {
        const { start, end } = getPeriodRange(currentDate, periodType);

        // Filter logs by date and exclude corrections
        const periodLogs = logs.filter(log => {
            if (log.itemName === 'Korrektur Geschäftskonto' || log.msg?.includes('Korrektur Geschäftskonto')) return false;
            if (log.price === 0) return false;

            if (!validProductNames.has(log.itemName)) return false;
            if (!validEmployeeNames.has(log.depositor)) return false;

            const logDate = new Date(log.timestamp);
            return logDate >= start && logDate <= end;
        });

        const stats = {};
        // For Trade Split
        const incomeStats = {}; // Sold (Revenue)
        const outcomeStats = {}; // Bought (Expenses)

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
                    if (log.type === 'in') { // Buying -> Outcome
                        if (!outcomeStats[log.itemName]) {
                            outcomeStats[log.itemName] = {
                                name: log.itemName,
                                boughtQty: 0,
                                boughtCost: 0
                            };
                        }
                        outcomeStats[log.itemName].boughtQty += log.quantity;
                        outcomeStats[log.itemName].boughtCost += value;
                    } else if (log.type === 'out') { // Selling -> Income
                        if (!incomeStats[log.itemName]) {
                            incomeStats[log.itemName] = {
                                name: log.itemName,
                                soldQty: 0,
                                soldRevenue: 0
                            };
                        }
                        incomeStats[log.itemName].soldQty += log.quantity;
                        incomeStats[log.itemName].soldRevenue += value;
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

        // Helper to process list (filter & sort)
        const processList = (list) => {
            let result = list;
            // Filter
            if (filterProduct) {
                result = result.filter(item => {
                    const productName = reportMode === 'employee' ? item.product : item.name;
                    return productName === filterProduct;
                });
            }
            if (reportMode === 'employee' && filterEmployee) {
                result = result.filter(item => item.employee === filterEmployee);
            }

            // Sort
            result.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle derived
                if (sortConfig.key === 'profit') { // Kept for logic but not used in split trade
                    // In split trade tables, we don't have profit per row usually
                } else if (sortConfig.key === 'name' && reportMode === 'employee') {
                    aValue = a.product;
                    bValue = b.product;
                }

                if (aValue === undefined) return 0; // Safely handle missing keys

                if (typeof aValue === 'string') {
                    return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                } else {
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
            });
            return result;
        };

        if (reportMode === 'trade') {
            return {
                processedData: [], // Not used for trade
                tradeIncomeData: processList(Object.values(incomeStats)),
                tradeOutcomeData: processList(Object.values(outcomeStats))
            };
        } else {
            return {
                processedData: processList(Object.values(stats)),
                tradeIncomeData: [],
                tradeOutcomeData: []
            };
        }

    }, [logs, currentDate, periodType, reportMode, filterProduct, filterEmployee, sortConfig]);

    const formatMoney = (amount) => amount.toLocaleString('de-DE', { style: 'currency', currency: 'USD' }).replace('$', '$');

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-slate-600 ml-1" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 text-violet-400 ml-1" />
            : <ArrowDown className="w-3 h-3 text-violet-400 ml-1" />;
    };

    const Th = ({ label, sortKey, align = 'left', color = '', isFilter = false, filterOptions = [], filterValue, onFilterChange }) => (
        <th
            className={`px-6 py-4 select-none ${align === 'right' ? 'text-right' : 'text-left'} ${color}`}
        >
            <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                {isFilter ? (
                    <div className="relative group">
                        <select
                            value={filterValue}
                            onChange={(e) => onFilterChange(e.target.value)}
                            className="bg-transparent text-slate-200 font-bold uppercase text-xs focus:outline-none cursor-pointer appearance-none pr-6 hover:text-white transition-colors"
                        >
                            <option value="" className="bg-slate-900 text-slate-400">{label} (Alle)</option>
                            {filterOptions.map(opt => (
                                <option key={opt} value={opt} className="bg-slate-900 text-slate-200">{opt}</option>
                            ))}
                        </select>
                        <Filter className="w-3 h-3 text-slate-500 absolute right-0 top-0.5 pointer-events-none group-hover:text-violet-400" />
                    </div>
                ) : (
                    <span
                        className="cursor-pointer hover:text-slate-200 transition-colors flex items-center gap-1"
                        onClick={() => sortKey && handleSort(sortKey)}
                    >
                        {label}
                        {sortKey && <SortIcon columnKey={sortKey} />}
                    </span>
                )}
            </div>
        </th>
    );

    // Calculate Totals
    const totalProductionValue = reportMode === 'production' ? processedData.reduce((a, b) => a + b.producedValue, 0) : 0;
    const totalEmployeeParams = reportMode === 'employee' ? processedData.reduce((a, b) => a + b.producedValue, 0) : 0;

    // Trade Totals
    const totalTradeRevenue = tradeIncomeData.reduce((a, b) => a + b.soldRevenue, 0);
    const totalTradeCost = tradeOutcomeData.reduce((a, b) => a + b.boughtCost, 0);
    const totalTradeProfit = totalTradeRevenue - totalTradeCost;

    return (
        <div className="animate-fade-in space-y-6">
            {/* Top Controls Bar */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                {/* Left Group: Period & Date */}
                <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="flex bg-slate-800 p-1.5 rounded-xl gap-1">
                        {['week', 'month', 'year'].map(type => (
                            <button
                                key={type}
                                onClick={() => setPeriodType(type)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${periodType === type ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
                            >
                                {type === 'week' ? 'Woche' : type === 'month' ? 'Monat' : 'Jahr'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                        <button onClick={() => navigatePeriod(-1)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                        <div className="flex items-center gap-2 text-base font-bold text-slate-200 min-w-[180px] justify-center px-2">
                            <Calendar className="w-4 h-4 text-violet-400" />
                            {periodLabel}
                        </div>
                        <button onClick={() => navigatePeriod(1)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Right Group: Mode Selector */}
                <div className="flex bg-slate-800 p-1.5 rounded-xl gap-1 overflow-x-auto max-w-full">
                    <button onClick={() => setReportMode('production')} className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${reportMode === 'production' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                        <Package className="w-4 h-4" /> Produktion
                    </button>
                    <button onClick={() => setReportMode('trade')} className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${reportMode === 'trade' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                        <TrendingUp className="w-4 h-4" /> Handel
                    </button>
                    <button onClick={() => setReportMode('employee')} className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${reportMode === 'employee' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                        <Users className="w-4 h-4" /> Mitarbeiter
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            {reportMode === 'trade' ? (
                <div className="space-y-8">
                    {/* TRADE: INCOME TABLE (Verkauf) */}
                    <div>
                        <div className="flex justify-between items-end mb-4">
                            <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" /> Verkäufe (Einnahmen)
                            </h2>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-slate-900 text-slate-400 font-bold border-b border-slate-700">
                                    <tr>
                                        <Th label="Produkt" isFilter={true} filterOptions={uniqueProducts} filterValue={filterProduct} onFilterChange={setFilterProduct} sortKey="name" />
                                        <Th label="Verkauft" sortKey="soldQty" align="right" />
                                        <Th label="Einnahmen" sortKey="soldRevenue" align="right" color="text-emerald-400" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {tradeIncomeData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-200">{item.name}</td>
                                            <td className="px-6 py-4 text-right text-slate-300 font-mono">{item.soldQty}</td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-400 font-mono">{formatMoney(item.soldRevenue)}</td>
                                        </tr>
                                    ))}
                                    {tradeIncomeData.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500 italic">Keine Verkäufe in diesem Zeitraum.</td></tr>
                                    )}
                                </tbody>
                                {tradeIncomeData.length > 0 && (
                                    <tfoot className="bg-slate-900/80 font-bold text-slate-200 border-t-2 border-slate-600">
                                        <tr>
                                            <td className="px-6 py-4 uppercase tracking-wider text-xs text-slate-400">Gesamt</td>
                                            <td className="px-6 py-4 text-right font-mono">{tradeIncomeData.reduce((a, b) => a + b.soldQty, 0)}</td>
                                            <td className="px-6 py-4 text-right text-emerald-400 font-mono">{formatMoney(totalTradeRevenue)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* TRADE: OUTCOME TABLE (Einkauf) */}
                    <div>
                        <div className="flex justify-between items-end mb-4">
                            <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                                <TrendingDown className="w-5 h-5" /> Einkäufe (Ausgaben)
                            </h2>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-slate-900 text-slate-400 font-bold border-b border-slate-700">
                                    <tr>
                                        <Th label="Produkt" isFilter={true} filterOptions={uniqueProducts} filterValue={filterProduct} onFilterChange={setFilterProduct} sortKey="name" />
                                        <Th label="Eingekauft" sortKey="boughtQty" align="right" />
                                        <Th label="Ausgaben" sortKey="boughtCost" align="right" color="text-red-400" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {tradeOutcomeData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-200">{item.name}</td>
                                            <td className="px-6 py-4 text-right text-slate-300 font-mono">{item.boughtQty}</td>
                                            <td className="px-6 py-4 text-right font-bold text-red-400 font-mono">{formatMoney(item.boughtCost)}</td>
                                        </tr>
                                    ))}
                                    {tradeOutcomeData.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500 italic">Keine Einkäufe in diesem Zeitraum.</td></tr>
                                    )}
                                </tbody>
                                {tradeOutcomeData.length > 0 && (
                                    <tfoot className="bg-slate-900/80 font-bold text-slate-200 border-t-2 border-slate-600">
                                        <tr>
                                            <td className="px-6 py-4 uppercase tracking-wider text-xs text-slate-400">Gesamt</td>
                                            <td className="px-6 py-4 text-right font-mono">{tradeOutcomeData.reduce((a, b) => a + b.boughtQty, 0)}</td>
                                            <td className="px-6 py-4 text-right text-red-400 font-mono">{formatMoney(totalTradeCost)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* TRADE SUMMARY */}
                    <div className="flex justify-end pt-4 border-t border-slate-700">
                        <div className="bg-slate-900 rounded-lg p-6 border border-slate-700 min-w-[300px]">
                            <h3 className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-4 border-b border-slate-700 pb-2">Gesamtbilanz (Handel)</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-emerald-400">Einnahmen:</span>
                                    <span className="text-emerald-400 font-mono">{formatMoney(totalTradeRevenue)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-red-400">Ausgaben:</span>
                                    <span className="text-red-400 font-mono">-{formatMoney(totalTradeCost)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold pt-2 border-t border-slate-700">
                                    <span className="text-slate-200">Profit:</span>
                                    <span className={totalTradeProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
                                        {formatMoney(totalTradeProfit)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            ) : (
                /* SINGLE TABLE FOR PRODUCTION / EMPLOYEE */
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-slate-900 text-slate-400 font-bold border-b border-slate-700">
                                <tr>
                                    {reportMode === 'employee' ? (
                                        <>
                                            <Th label="Mitarbeiter" isFilter={true} filterOptions={uniqueEmployees} filterValue={filterEmployee} onFilterChange={setFilterEmployee} sortKey="employee" />
                                            <Th label="Produkt" isFilter={true} filterOptions={uniqueProducts} filterValue={filterProduct} onFilterChange={setFilterProduct} sortKey="product" />
                                            <Th label="Produziert" sortKey="producedQty" align="right" />
                                            <Th label="Wert (Lohn)" sortKey="producedValue" align="right" />
                                        </>
                                    ) : (
                                        <>
                                            <Th label="Produkt" isFilter={true} filterOptions={uniqueProducts} filterValue={filterProduct} onFilterChange={setFilterProduct} sortKey="name" />
                                            <Th label="Produziert" sortKey="producedQty" align="right" />
                                            <Th label="Wert (Lohn)" sortKey="producedValue" align="right" />
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
                                                <td className="px-6 py-4 text-right text-slate-300 font-mono">{item.producedQty}</td>
                                                <td className="px-6 py-4 text-right font-bold text-emerald-400 font-mono">{formatMoney(item.producedValue)}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                                {processedData.length === 0 && (
                                    <tr>
                                        <td colSpan={reportMode === 'employee' ? 4 : 3} className="px-6 py-12 text-center text-slate-500 italic">
                                            Keine Daten für diesen Zeitraum gefunden.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {processedData.length > 0 && (
                                <tfoot className="bg-slate-900/80 font-bold text-slate-200 border-t-2 border-slate-600">
                                    <tr>
                                        <td className="px-6 py-4 uppercase tracking-wider text-xs text-slate-400" colSpan={reportMode === 'employee' ? 2 : 1}>Gesamt</td>
                                        {reportMode === 'production' && (
                                            <>
                                                <td className="px-6 py-4 text-right font-mono">{processedData.reduce((a, b) => a + b.producedQty, 0)}</td>
                                                <td className="px-6 py-4 text-right text-emerald-400 font-mono">{formatMoney(totalProductionValue)}</td>
                                            </>
                                        )}
                                        {reportMode === 'employee' && (
                                            <>
                                                <td className="px-6 py-4 text-right font-mono">{processedData.reduce((a, b) => a + b.producedQty, 0)}</td>
                                                <td className="px-6 py-4 text-right text-emerald-400 font-mono">{formatMoney(totalEmployeeParams)}</td>
                                            </>
                                        )}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
