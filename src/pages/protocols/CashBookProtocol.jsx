import React, { useState, useMemo } from 'react';
import {
    BookOpen, Calendar, ArrowUpRight, ArrowDownRight, Download,
    Filter, Search, TrendingUp, TrendingDown, DollarSign, FileText,
    ChevronLeft, ChevronRight, Wallet, Pencil, X, Check, Info, CreditCard
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip as ShadcnTooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

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

const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function CashBookProtocol({ logs = [], inventory = [], prices = [], onAdjustBalance, user }) {
    const [activeTab, setActiveTab] = useState('kassenbuch');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const itemsPerPage = 25;

    // ... (Data processing logic remains mostly the same, ensuring robust error handling)
    const cashBookData = useMemo(() => {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);

        let entries = logs
            .filter(log => {
                const d = new Date(log.timestamp);
                return d >= start && d <= end;
            })
            .filter(log => {
                return log.category === 'trade' ||
                    log.itemName === 'Auszahlung' ||
                    (log.price && log.price !== 0);
            })
            .map((log, idx) => {
                const isIncome = log.type === 'out' && log.category === 'trade';
                const isExpense = log.type === 'in' && log.category === 'trade';
                const isPayout = log.itemName === 'Auszahlung';

                let amount = Math.abs((log.price || 0) * (log.quantity || 1));
                let type = 'neutral';
                let category = 'Sonstiges';

                if (isIncome) {
                    type = 'income';
                    category = 'Verkauf';
                } else if (isExpense) {
                    type = 'expense';
                    category = 'Ankauf';
                } else if (isPayout) {
                    type = 'expense';
                    category = 'Lohn';
                    amount = Math.abs(log.price || 0);
                } else if (log.price < 0) {
                    type = 'expense';
                    category = 'Sonderbuchung';
                    amount = Math.abs(log.price);
                } else if (log.price > 0) {
                    type = 'income';
                    category = 'Sonderbuchung';
                }

                return {
                    id: log.timestamp + idx,
                    timestamp: log.timestamp,
                    belegNr: `KB-${new Date(log.timestamp).getFullYear()}-${String(idx + 1).padStart(5, '0')}`,
                    description: log.itemName || log.msg || 'Transaktion',
                    quantity: log.quantity || 1,
                    depositor: log.depositor || 'System',
                    type,
                    category,
                    amount
                };
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (searchTerm) {
            entries = entries.filter(e =>
                e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.depositor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.belegNr.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (categoryFilter !== 'all') {
            entries = entries.filter(e => e.category === categoryFilter);
        }

        let runningBalance = 0;
        const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
        const totalExpense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);

        // Calculate running balance reversely for display
        const entriesWithBalance = [...entries].reverse().map(entry => {
            if (entry.type === 'income') {
                runningBalance += entry.amount;
            } else if (entry.type === 'expense') {
                runningBalance -= entry.amount;
            }
            return { ...entry, balance: runningBalance };
        }).reverse();

        return {
            entries: entriesWithBalance,
            totalIncome,
            totalExpense,
            netBalance: totalIncome - totalExpense,
            totalEntries: entriesWithBalance.length
        };
    }, [logs, dateRange, searchTerm, categoryFilter]);

    const { currentBalance, currentInventoryValue, chartData, transactions } = useMemo(() => {
        let balance = 0;
        const dataPoints = [];
        const relevantTransactions = [];

        const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        sortedLogs.forEach(log => {
            let change = 0;
            let type = 'other';

            if (log.itemName === 'Auszahlung' || log.msg?.includes('Auszahlung')) {
                change = log.price * log.quantity; // price is negative for payout usually, or handled as expense
                if (log.itemName === 'Auszahlung') change = -Math.abs(log.price || 0); // Force negative
                type = 'payout';
            } else if (log.category === 'trade' && log.type === 'in') { // Buying
                const p = typeof log.price === 'string' ? parseFloat(log.price.replace(',', '.')) : log.price;
                change = -(Math.abs(p) * (log.quantity || 1));
                type = 'purchase';
            } else if (log.category === 'trade' && log.type === 'out') { // Selling
                const p = typeof log.price === 'string' ? parseFloat(log.price.replace(',', '.')) : log.price;
                change = Math.abs(p) * (log.quantity || 1);
                type = 'sale';
            } else if (log.itemName === 'Korrektur Geschäftskonto' || log.msg?.includes('Korrektur Geschäftskonto')) {
                const p = typeof log.price === 'string' ? parseFloat(log.price.replace(',', '.')) : log.price;
                change = p;
                type = p >= 0 ? 'sale' : 'purchase';
            }

            if (change !== 0) {
                balance += change;
                const date = new Date(log.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                dataPoints.push({ date, balance });
                relevantTransactions.unshift({
                    id: log.id || Math.random(),
                    date: new Date(log.timestamp).toLocaleString('de-DE'),
                    type,
                    amount: Math.abs(change),
                    isPositive: change > 0,
                    reason: log.itemName || log.msg,
                    balanceSnapshot: balance
                });
            }
        });

        const invValue = inventory.reduce((sum, item) => {
            const priceItem = prices.find(p => p.name === item.name);
            return sum + (item.current * (priceItem?.vk || 0)); // market value
        }, 0);

        const finalData = dataPoints.map(p => ({
            ...p,
            total: p.balance + invValue
        }));

        return {
            currentBalance: balance,
            currentInventoryValue: invValue,
            chartData: finalData,
            transactions: relevantTransactions
        };
    }, [logs, inventory, prices]);

    const totalPages = Math.ceil(cashBookData.entries.length / itemsPerPage);
    const paginatedEntries = cashBookData.entries.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const downloadCSV = () => {
        // ... (CSV logic kept same)
        const headers = ['Beleg-Nr', 'Datum', 'Uhrzeit', 'Beschreibung', 'Kategorie', 'Person', 'Menge', 'Einnahme', 'Ausgabe', 'Saldo'];
        const rows = cashBookData.entries.map(e => [
            e.belegNr,
            formatDate(e.timestamp),
            formatTime(e.timestamp),
            e.description,
            e.category,
            e.depositor,
            e.quantity,
            e.type === 'income' ? e.amount.toFixed(2) : '',
            e.type === 'expense' ? e.amount.toFixed(2) : '',
            e.balance.toFixed(2)
        ]);
        const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Kassenbuch_${dateRange.start}_${dateRange.end}.csv`;
        link.click();
    };

    const handleStartEdit = () => {
        setEditValue(currentBalance.toString());
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        const newBal = parseFloat(editValue.toString().replace(',', '.'));
        if (isNaN(newBal)) return;
        const diff = newBal - (isNaN(currentBalance) ? 0 : currentBalance);
        if (diff === 0) { setIsEditing(false); return; }
        if (onAdjustBalance) {
            onAdjustBalance({
                amount: diff,
                reason: 'Korrektur Geschäftskonto',
                employee: user?.username || 'Admin'
            });
        }
        setIsEditing(false);
    };

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

                {/* HEADLINE + TABS */}
                <Card className="border-slate-800 bg-slate-900/50">
                    <CardContent className="p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                                <BookOpen className="w-8 h-8 text-emerald-400" />
                                Finanzen
                            </h1>
                            <p className="text-slate-400 mt-1">Kassenbuch & Geschäftskonto Übersicht.</p>
                        </div>
                        <TabsList className="bg-slate-950 border border-slate-800">
                            <TabsTrigger value="kassenbuch" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white min-w-[140px]">
                                <BookOpen className="w-4 h-4 mr-2" /> Kassenbuch
                            </TabsTrigger>
                            <TabsTrigger value="konto" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white min-w-[140px]">
                                <Wallet className="w-4 h-4 mr-2" /> Geschäftskonto
                            </TabsTrigger>
                        </TabsList>
                    </CardContent>
                </Card>

                {/* KASSENBUCH CONTENT */}
                <TabsContent value="kassenbuch" className="space-y-6">
                    {/* FILTERS & CONTROLS */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="flex flex-wrap items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                            <Calendar className="w-4 h-4 text-emerald-400 ml-2" />
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

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Suche..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-slate-900/50 border-slate-800 text-slate-200 focus-visible:ring-emerald-500"
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[180px] bg-slate-900/50 border-slate-800 text-slate-200">
                                    <SelectValue placeholder="Kategorie" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-950 border-slate-800">
                                    <SelectItem value="all">Alle Kategorien</SelectItem>
                                    <SelectItem value="Verkauf">Verkauf</SelectItem>
                                    <SelectItem value="Ankauf">Ankauf</SelectItem>
                                    <SelectItem value="Lohn">Lohn</SelectItem>
                                    <SelectItem value="Sonderbuchung">Sonderbuchung</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" onClick={downloadCSV} className="border-slate-800 bg-slate-900/50 hover:bg-emerald-500/10 hover:text-emerald-400">
                                <Download className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Einnahmen</CardTitle>
                                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-400">{formatCurrency(cashBookData.totalIncome)}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Ausgaben</CardTitle>
                                <ArrowDownRight className="w-4 h-4 text-red-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-400">{formatCurrency(cashBookData.totalExpense)}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Saldo</CardTitle>
                                <DollarSign className="w-4 h-4 text-violet-400" />
                            </CardHeader>
                            <CardContent>
                                <div className={cn("text-2xl font-bold", cashBookData.netBalance >= 0 ? "text-violet-400" : "text-red-400")}>
                                    {formatCurrency(cashBookData.netBalance)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Einträge</CardTitle>
                                <FileText className="w-4 h-4 text-blue-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-400">{cashBookData.totalEntries}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* TABLE */}
                    <Card className="border-slate-800 bg-slate-900/50">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-800 hover:bg-transparent">
                                        <TableHead className="w-[120px]">Beleg-Nr</TableHead>
                                        <TableHead>Datum</TableHead>
                                        <TableHead>Beschreibung</TableHead>
                                        <TableHead>Kategorie</TableHead>
                                        <TableHead>Person</TableHead>
                                        <TableHead className="text-right">Menge</TableHead>
                                        <TableHead className="text-right">Einnahme</TableHead>
                                        <TableHead className="text-right">Ausgabe</TableHead>
                                        <TableHead className="text-right">Saldo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedEntries.map((entry) => (
                                        <TableRow key={entry.id} className="border-slate-800 hover:bg-slate-800/40">
                                            <TableCell className="font-mono text-xs text-slate-500">{entry.belegNr}</TableCell>
                                            <TableCell>
                                                <div className="text-sm text-slate-300">{formatDate(entry.timestamp)}</div>
                                                <div className="text-xs text-slate-500">{formatTime(entry.timestamp)}</div>
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-200">{entry.description}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("font-medium",
                                                    entry.category === 'Verkauf' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        entry.category === 'Ankauf' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                            entry.category === 'Lohn' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                )}>
                                                    {entry.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-400">{entry.depositor}</TableCell>
                                            <TableCell className="text-right font-mono text-slate-400">{entry.quantity}</TableCell>
                                            <TableCell className="text-right font-mono text-emerald-400 font-bold">
                                                {entry.type === 'income' ? formatCurrency(entry.amount) : '–'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-red-400 font-bold">
                                                {entry.type === 'expense' ? formatCurrency(entry.amount) : '–'}
                                            </TableCell>
                                            <TableCell className={cn("text-right font-mono font-bold", entry.balance >= 0 ? 'text-slate-200' : 'text-red-400')}>
                                                {formatCurrency(entry.balance)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {paginatedEntries.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-24 text-center text-slate-500">Keine Einträge gefunden.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* PAGINATION */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4">
                            <div className="text-sm text-slate-400">
                                Seite {currentPage} von {totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 border-slate-800 bg-slate-900/50"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 w-8 border-slate-800 bg-slate-900/50"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* GESCHÄFTSKONTO CONTENT */}
                <TabsContent value="konto" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Interactive Balance Card */}
                        <Card className="bg-slate-900/50 border-slate-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <DollarSign className="w-32 h-32 text-slate-100" />
                            </div>
                            <CardHeader className="relative z-10 pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Aktueller Kontostand</CardTitle>
                                    {!isEditing && (
                                        <Button variant="ghost" size="icon" onClick={handleStartEdit} className="h-6 w-6 text-slate-500 hover:text-violet-400 -mt-1 -mr-2">
                                            <Pencil className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                {isEditing ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="h-9 bg-slate-950 border-slate-700"
                                        />
                                        <Button size="icon" className="h-9 w-9 bg-emerald-600 hover:bg-emerald-500" onClick={handleSaveEdit}>
                                            <Check className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="destructive" className="h-9 w-9" onClick={() => setIsEditing(false)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className={cn("text-3xl font-bold", currentBalance >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                        {formatCurrency(currentBalance)}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/50 border-slate-800 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <TrendingUp className="w-32 h-32 text-blue-100" />
                            </div>
                            <CardHeader className="relative z-10 pb-2">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Lagerwert (VK)</CardTitle>
                                    <TooltipProvider>
                                        <ShadcnTooltip>
                                            <TooltipTrigger>
                                                <Info className="w-3 h-3 text-slate-500" />
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-900 border-slate-800 text-slate-300">
                                                <p>Summe aller Waren im Lager zu Verkaufspreisen.</p>
                                            </TooltipContent>
                                        </ShadcnTooltip>
                                    </TooltipProvider>
                                </div>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="text-3xl font-bold text-blue-400">{formatCurrency(currentInventoryValue)}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/50 border-slate-800 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Wallet className="w-32 h-32 text-fuchsia-100" />
                            </div>
                            <CardHeader className="relative z-10 pb-2">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Gesamtvermögen</CardTitle>
                                    <TooltipProvider>
                                        <ShadcnTooltip>
                                            <TooltipTrigger>
                                                <Info className="w-3 h-3 text-slate-500" />
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-900 border-slate-800 text-slate-300">
                                                <p>Kontostand + Lagerwert (VK).</p>
                                            </TooltipContent>
                                        </ShadcnTooltip>
                                    </TooltipProvider>
                                </div>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="text-3xl font-bold text-fuchsia-400">{formatCurrency(currentBalance + currentInventoryValue)}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart */}
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-white">Verlauf</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#f8fafc' }}
                                            formatter={(value) => formatCurrency(value)}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Line type="monotone" dataKey="balance" name="Kontostand" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="total" name="Gesamtvermögen" stroke="#d946ef" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transaction History */}
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-white">Buchungshistorie</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[600px] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-slate-900 sticky top-0 z-10">
                                        <TableRow className="border-slate-800 hover:bg-transparent">
                                            <TableHead>Datum</TableHead>
                                            <TableHead>Vorgang</TableHead>
                                            <TableHead>Grund</TableHead>
                                            <TableHead className="text-right">Betrag</TableHead>
                                            <TableHead className="text-right">Saldo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.slice(0, 50).map((tx) => (
                                            <TableRow key={tx.id} className="border-slate-800 hover:bg-slate-800/40">
                                                <TableCell className="text-slate-300">{tx.date}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        tx.type === 'sale' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            tx.type === 'purchase' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                'bg-red-500/10 text-red-400 border-red-500/20'
                                                    )}>
                                                        {tx.type === 'sale' && <ArrowUpRight className="w-3 h-3 mr-1" />}
                                                        {tx.type === 'purchase' && <ArrowDownRight className="w-3 h-3 mr-1" />}
                                                        {tx.type === 'payout' && <ArrowDownRight className="w-3 h-3 mr-1" />}
                                                        {tx.type === 'sale' ? 'Eingang' : 'Ausgang'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-400">{tx.reason}</TableCell>
                                                <TableCell className={cn("text-right font-medium", tx.isPositive ? 'text-emerald-400' : 'text-red-400')}>
                                                    {tx.isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                                                </TableCell>
                                                <TableCell className="text-right text-slate-500 font-mono">
                                                    {formatCurrency(tx.balanceSnapshot)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {transactions.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-slate-500">Keine Buchungen vorhanden</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
