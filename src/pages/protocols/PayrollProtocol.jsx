import React, { useState, useMemo } from 'react';
import {
    Users, Calendar, DollarSign, TrendingUp, Download,
    ChevronDown, ChevronUp, Check, Clock, AlertCircle,
    Wallet, FileText, ArrowRight, FileDown
} from 'lucide-react';
import { generatePayslip } from '../../components/PDFExport';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export default function PayrollProtocol({ logs = [], employees = [], prices = [], user }) {
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [expandedEmployee, setExpandedEmployee] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');

    // Build price lookup
    const priceMap = useMemo(() => {
        const map = {};
        prices.forEach(p => {
            map[p.id] = p.sellPrice || p.price || 0;
        });
        return map;
    }, [prices]);

    // Process payroll data
    const payrollData = useMemo(() => {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);

        const employeeMap = {};

        // Initialize employees
        employees.forEach(emp => {
            const name = typeof emp === 'string' ? emp : emp.name;
            if (!name) return;
            employeeMap[name] = {
                name,
                status: typeof emp === 'object' ? emp.status : 'active',
                productions: [],
                payouts: [],
                totalProduced: 0,
                totalEarned: 0,
                totalPaid: 0,
                balance: 0
            };
        });

        // Process logs
        logs.forEach(log => {
            const d = new Date(log.timestamp);
            if (d < start || d > end) return;

            const depositor = log.depositor;
            if (!depositor || depositor === 'Unbekannt' || depositor === 'System') return;

            // Initialize if not exists
            if (!employeeMap[depositor]) {
                employeeMap[depositor] = {
                    name: depositor,
                    status: 'unknown',
                    productions: [],
                    payouts: [],
                    totalProduced: 0,
                    totalEarned: 0,
                    totalPaid: 0,
                    balance: 0
                };
            }

            // Production (internal check-in)
            if (log.type === 'in' && log.category === 'internal' && log.itemName !== 'Auszahlung') {
                const qty = log.quantity || 1;
                const unitPrice = priceMap[log.itemId] || log.price || 0;
                const value = qty * unitPrice;

                employeeMap[depositor].productions.push({
                    timestamp: log.timestamp,
                    item: log.itemName,
                    quantity: qty,
                    unitPrice,
                    value
                });
                employeeMap[depositor].totalProduced += qty;
                employeeMap[depositor].totalEarned += value;
            }

            // Payouts
            if (log.itemName === 'Auszahlung' || (log.price < 0 && log.category === 'internal')) {
                const amount = Math.abs(log.price || 0);
                employeeMap[depositor].payouts.push({
                    timestamp: log.timestamp,
                    amount
                });
                employeeMap[depositor].totalPaid += amount;
            }
        });

        // Calculate balances and create sorted array
        const employeeList = Object.values(employeeMap)
            .map(emp => ({
                ...emp,
                balance: emp.totalEarned - emp.totalPaid
            }))
            .filter(emp => emp.totalProduced > 0 || emp.totalPaid > 0)
            .sort((a, b) => b.totalEarned - a.totalEarned);

        // Totals
        const totals = {
            totalEarned: employeeList.reduce((sum, e) => sum + e.totalEarned, 0),
            totalPaid: employeeList.reduce((sum, e) => sum + e.totalPaid, 0),
            totalBalance: employeeList.reduce((sum, e) => sum + e.balance, 0),
            employeeCount: employeeList.length
        };

        return { employees: employeeList, totals };
    }, [logs, employees, prices, dateRange, priceMap]);

    // Filter employees
    const filteredEmployees = useMemo(() => {
        if (statusFilter === 'all') return payrollData.employees;
        if (statusFilter === 'open') return payrollData.employees.filter(e => e.balance > 0);
        if (statusFilter === 'paid') return payrollData.employees.filter(e => e.balance <= 0);
        return payrollData.employees;
    }, [payrollData.employees, statusFilter]);

    const downloadCSV = () => {
        const headers = ['Mitarbeiter', 'Status', 'Produziert (Stück)', 'Bruttolohn', 'Ausgezahlt', 'Offen'];
        const rows = payrollData.employees.map(e => [
            e.name,
            e.status,
            e.totalProduced,
            e.totalEarned.toFixed(2),
            e.totalPaid.toFixed(2),
            e.balance.toFixed(2)
        ]);

        const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Lohnabrechnung_${dateRange.start}_${dateRange.end}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-400" />
                        Lohn-Abrechnung
                    </h1>
                    <p className="text-slate-400 mt-1">Mitarbeiter-Lohnübersicht und Auszahlungsstatus</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-xl border border-slate-700">
                        <Calendar className="w-4 h-4 text-blue-400" />
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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-blue-500/10">
                            <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-slate-400 text-sm font-medium">Mitarbeiter</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-400">{payrollData.totals.employeeCount}</div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-emerald-500/10">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-slate-400 text-sm font-medium">Bruttolöhne</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(payrollData.totals.totalEarned)}</div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-violet-500/10">
                            <Wallet className="w-5 h-5 text-violet-400" />
                        </div>
                        <span className="text-slate-400 text-sm font-medium">Ausgezahlt</span>
                    </div>
                    <div className="text-2xl font-bold text-violet-400">{formatCurrency(payrollData.totals.totalPaid)}</div>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-amber-500/10">
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <span className="text-slate-400 text-sm font-medium">Offen</span>
                    </div>
                    <div className={`text-2xl font-bold ${payrollData.totals.totalBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {formatCurrency(payrollData.totals.totalBalance)}
                    </div>
                </div>
            </div>

            {/* FILTERS */}
            <div className="flex gap-2">
                {['all', 'open', 'paid'].map(filter => (
                    <button
                        key={filter}
                        onClick={() => setStatusFilter(filter)}
                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${statusFilter === filter
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        {filter === 'all' ? 'Alle' : filter === 'open' ? 'Offene Beträge' : 'Ausgezahlt'}
                    </button>
                ))}
            </div>

            {/* EMPLOYEE LIST */}
            <div className="space-y-3">
                {filteredEmployees.map(emp => (
                    <div key={emp.name} className="bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                        {/* Employee Row */}
                        <div
                            onClick={() => setExpandedEmployee(expandedEmployee === emp.name ? null : emp.name)}
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${emp.balance > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                                    }`}>
                                    {emp.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-200">{emp.name}</div>
                                    <div className="text-xs text-slate-500">{emp.totalProduced} Stück produziert</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="text-xs text-slate-500">Brutto</div>
                                    <div className="font-mono font-bold text-emerald-400">{formatCurrency(emp.totalEarned)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-500">Gezahlt</div>
                                    <div className="font-mono font-bold text-violet-400">{formatCurrency(emp.totalPaid)}</div>
                                </div>
                                <div className="text-right min-w-[100px]">
                                    <div className="text-xs text-slate-500">Offen</div>
                                    <div className={`font-mono font-bold ${emp.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {formatCurrency(emp.balance)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {emp.balance <= 0 ? (
                                        <Check className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-amber-400" />
                                    )}
                                    {expandedEmployee === emp.name ? (
                                        <ChevronUp className="w-5 h-5 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedEmployee === emp.name && (
                            <div className="border-t border-slate-700/50 p-4 bg-slate-800/20 animate-fade-in">
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            generatePayslip(
                                                emp.name,
                                                `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`,
                                                emp.productions,
                                                emp.payouts,
                                                { earned: emp.totalEarned, paid: emp.totalPaid, balance: emp.balance }
                                            );
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white font-medium text-sm transition-colors"
                                    >
                                        <FileDown className="w-4 h-4" />
                                        Lohnzettel PDF
                                    </button>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Productions */}
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Produktionen ({emp.productions.length})
                                        </h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                            {emp.productions.slice(0, 20).map((prod, idx) => (
                                                <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg text-sm">
                                                    <div>
                                                        <div className="text-slate-200">{prod.item}</div>
                                                        <div className="text-xs text-slate-500">{formatDate(prod.timestamp)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-slate-300">{prod.quantity}x á {formatCurrency(prod.unitPrice)}</div>
                                                        <div className="text-emerald-400 font-mono">{formatCurrency(prod.value)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {emp.productions.length === 0 && (
                                                <div className="text-slate-500 text-sm py-4 text-center">Keine Produktionen</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payouts */}
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Wallet className="w-4 h-4" />
                                            Auszahlungen ({emp.payouts.length})
                                        </h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                            {emp.payouts.map((payout, idx) => (
                                                <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg text-sm">
                                                    <div className="text-slate-400">{formatDate(payout.timestamp)}</div>
                                                    <div className="text-violet-400 font-mono font-bold">{formatCurrency(payout.amount)}</div>
                                                </div>
                                            ))}
                                            {emp.payouts.length === 0 && (
                                                <div className="text-slate-500 text-sm py-4 text-center">Keine Auszahlungen</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {filteredEmployees.length === 0 && (
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-12 text-center text-slate-500">
                        Keine Mitarbeiter gefunden
                    </div>
                )}
            </div>
        </div>
    );
}
