import React, { useState, useMemo } from 'react';
import {
    Users, Calendar, DollarSign, TrendingUp, Download,
    ChevronDown, ChevronUp, Check, Clock, AlertCircle,
    Wallet, FileText, ArrowRight, FileDown, Search, Filter
} from 'lucide-react';
import { generatePayslip } from '../../components/PDFExport';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
            <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-400" />
                            Lohn-Abrechnung
                        </h1>
                        <p className="text-slate-400 mt-1">Mitarbeiter-Lohnübersicht und Auszahlungsstatus.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                            <Calendar className="w-4 h-4 text-blue-400 ml-2" />
                            <Input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="bg-transparent border-none text-slate-200 w-32 focus-visible:ring-0 h-8"
                            />
                            <span className="text-slate-500">-</span>
                            <Input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="bg-transparent border-none text-slate-200 w-32 focus-visible:ring-0 h-8"
                            />
                        </div>
                        <Button
                            onClick={downloadCSV}
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Mitarbeiter</CardTitle>
                        <Users className="w-4 h-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-400">{payrollData.totals.employeeCount}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Bruttolöhne</CardTitle>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">{formatCurrency(payrollData.totals.totalEarned)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Ausgezahlt</CardTitle>
                        <Wallet className="w-4 h-4 text-violet-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-violet-400">{formatCurrency(payrollData.totals.totalPaid)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Offen</CardTitle>
                        <Clock className="w-4 h-4 text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", payrollData.totals.totalBalance > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                            {formatCurrency(payrollData.totals.totalBalance)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* FILTER */}
            <div className="flex justify-end">
                <div className="flex gap-2 p-1 bg-slate-900/50 rounded-lg border border-slate-800">
                    {['all', 'open', 'paid'].map(filter => (
                        <Button
                            key={filter}
                            variant={statusFilter === filter ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setStatusFilter(filter)}
                            className={cn(
                                "text-xs font-medium transition-all",
                                statusFilter === filter ? "bg-blue-600 text-white hover:bg-blue-500" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            {filter === 'all' ? 'Alle' : filter === 'open' ? 'Offene Beträge' : 'Ausgezahlt'}
                        </Button>
                    ))}
                </div>
            </div>

            {/* EMPLOYEE LIST */}
            <div className="grid gap-4">
                {filteredEmployees.map(emp => (
                    <Card key={emp.name} className="bg-slate-900/50 border-slate-800 overflow-hidden transition-all hover:border-slate-700">
                        <div
                            onClick={() => setExpandedEmployee(expandedEmployee === emp.name ? null : emp.name)}
                            className="p-4 cursor-pointer flex flex-col md:flex-row gap-4 items-center justify-between"
                        >
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                                    emp.balance > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                                )}>
                                    {emp.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-200">{emp.name}</div>
                                    <div className="text-xs text-slate-500">{emp.totalProduced} Stück produziert</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-right">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Brutto</div>
                                    <div className="font-mono font-bold text-emerald-400">{formatCurrency(emp.totalEarned)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Gezahlt</div>
                                    <div className="font-mono font-bold text-violet-400">{formatCurrency(emp.totalPaid)}</div>
                                </div>
                                <div className="text-right min-w-[100px]">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Offen</div>
                                    <div className={cn("font-mono font-bold", emp.balance > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                                        {formatCurrency(emp.balance)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pl-2">
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

                        {expandedEmployee === emp.name && (
                            <div className="border-t border-slate-800 bg-slate-950/30 p-6 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex justify-end mb-4">
                                    <Button
                                        variant="destructive"
                                        size="sm"
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
                                        className="gap-2"
                                    >
                                        <FileDown className="w-4 h-4" />
                                        Lohnzettel PDF
                                    </Button>
                                </div>
                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Productions */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Produktionen ({emp.productions.length})
                                        </h4>
                                        <ScrollArea className="h-[250px] pr-4">
                                            <div className="space-y-2">
                                                {emp.productions.slice(0, 50).map((prod, idx) => (
                                                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-900 rounded-lg border border-slate-800 text-sm">
                                                        <div>
                                                            <div className="text-slate-300 font-medium">{prod.item}</div>
                                                            <div className="text-xs text-slate-500">{formatDate(prod.timestamp)}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-slate-400 text-xs">{prod.quantity}x á {formatCurrency(prod.unitPrice)}</div>
                                                            <div className="text-emerald-400 font-mono font-medium">{formatCurrency(prod.value)}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {emp.productions.length === 0 && (
                                                    <div className="text-slate-500 text-sm py-8 text-center bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">Keine Produktionen</div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>

                                    {/* Payouts */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Wallet className="w-4 h-4" />
                                            Auszahlungen ({emp.payouts.length})
                                        </h4>
                                        <ScrollArea className="h-[250px] pr-4">
                                            <div className="space-y-2">
                                                {emp.payouts.map((payout, idx) => (
                                                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-900 rounded-lg border border-slate-800 text-sm">
                                                        <div className="text-slate-400">{formatDate(payout.timestamp)}</div>
                                                        <div className="text-violet-400 font-mono font-bold">{formatCurrency(payout.amount)}</div>
                                                    </div>
                                                ))}
                                                {emp.payouts.length === 0 && (
                                                    <div className="text-slate-500 text-sm py-8 text-center bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">Keine Auszahlungen</div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                ))}

                {filteredEmployees.length === 0 && (
                    <Card className="bg-slate-900/50 border-slate-800 border-dashed p-12 flex flex-col items-center justify-center text-slate-500">
                        <Users className="w-12 h-12 mb-4 opacity-50" />
                        <p>Keine Mitarbeiter für diesen Zeitraum gefunden</p>
                    </Card>
                )}
            </div>
        </div>
    );
}
