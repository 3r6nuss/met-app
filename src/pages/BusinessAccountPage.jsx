import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, DollarSign, Pencil, X, Check, Info } from 'lucide-react';

export default function BusinessAccountPage({ logs, inventory, prices, onAdjustBalance, user }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    // 1. Calculate Statistics and Chart Data
    const { currentBalance, currentInventoryValue, chartData, transactions } = useMemo(() => {
        let balance = 0;
        const dataPoints = [];
        const relevantTransactions = [];

        // Filter and sort logs (oldest first for calculation)
        const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        sortedLogs.forEach(log => {
            let change = 0;
            let type = 'other';

            // Identify transaction type and impact on balance
            if (log.itemName === 'Auszahlung' || log.msg.includes('Auszahlung')) {
                change = log.price * log.quantity;
                type = 'payout';
            } else if (log.category === 'trade' && log.type === 'in') {
                change = -(log.price * log.quantity);
                type = 'purchase';
            } else if (log.category === 'trade' && log.type === 'out') {
                change = log.price * log.quantity;
                type = 'sale';
            } else if (log.itemName === 'Korrektur Geschäftskonto' || log.msg.includes('Korrektur Geschäftskonto')) {
                // Manual Correction
                change = log.price; // Price holds the adjustment amount
                type = log.price >= 0 ? 'sale' : 'purchase'; // Reuse types for color
            }

            if (change !== 0) {
                balance += change;

                const date = new Date(log.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

                dataPoints.push({
                    date,
                    balance: balance,
                });

                relevantTransactions.unshift({
                    id: log.id,
                    date: new Date(log.timestamp).toLocaleString('de-DE'),
                    type,
                    amount: Math.abs(change),
                    isPositive: change > 0,
                    reason: log.itemName || log.msg,
                    balanceSnapshot: balance
                });
            }
        });

        // Calculate Current Inventory Value (VK)
        const invValue = inventory.reduce((sum, item) => {
            const priceItem = prices.find(p => p.name === item.name);
            return sum + (item.current * (priceItem?.vk || 0));
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

    const handleStartEdit = () => {
        setEditValue(currentBalance.toString());
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        const newBal = parseFloat(editValue);
        if (isNaN(newBal)) return;

        const diff = newBal - currentBalance;
        if (diff === 0) {
            setIsEditing(false);
            return;
        }

        onAdjustBalance({
            amount: diff,
            reason: 'Korrektur Geschäftskonto',
            employee: user?.username || 'Admin'
        });
        setIsEditing(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-violet-400" />
                        Geschäftskonto
                    </h1>
                    <p className="text-slate-400 mt-1">Finanzübersicht und Kontoverlauf</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Kontostand Card */}
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign className="w-24 h-24 text-violet-400" />
                    </div>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <p className="text-slate-400 font-medium">Aktueller Kontostand</p>
                        {!isEditing && (
                            <button onClick={handleStartEdit} className="text-slate-500 hover:text-violet-400 transition-colors opacity-0 group-hover:opacity-100">
                                <Pencil className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="flex items-center gap-2 relative z-10">
                            <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white w-full"
                                autoFocus
                            />
                            <button onClick={handleSaveEdit} className="p-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30">
                                <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsEditing(false)} className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <h2 className={`text-3xl font-bold relative z-10 ${currentBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {currentBalance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </h2>
                    )}
                </div>

                {/* Lagerwert VK Card */}
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp className="w-24 h-24 text-blue-400" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <p className="text-slate-400 font-medium">Lagerwert (VK)</p>
                        <div className="group/tooltip relative">
                            <Info className="w-4 h-4 text-slate-500" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50">
                                Der Wert aller Waren im Lager basierend auf dem aktuellen Verkaufspreis.
                            </div>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-blue-400">
                        {currentInventoryValue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </h2>
                </div>

                {/* Gesamtvermögen Card */}
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet className="w-24 h-24 text-fuchsia-400" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <p className="text-slate-400 font-medium">Gesamtvermögen</p>
                        <div className="group/tooltip relative">
                            <Info className="w-4 h-4 text-slate-500" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50">
                                Summe aus aktuellem Kontostand und dem Lagerwert (VK). Das potenzielle Kapital bei vollständigem Abverkauf.
                            </div>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-fuchsia-400">
                        {(currentBalance + currentInventoryValue).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </h2>
                </div>
            </div>

            {/* Chart */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-6">Verlauf</h3>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                                formatter={(value) => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="balance" name="Kontostand" stroke="#10b981" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="total" name="Gesamtvermögen (Potenzial)" stroke="#d946ef" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Transactions List */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-6">Buchungshistorie</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-400 border-b border-slate-700">
                                <th className="p-3">Datum</th>
                                <th className="p-3">Vorgang</th>
                                <th className="p-3">Grund</th>
                                <th className="p-3 text-right">Betrag</th>
                                <th className="p-3 text-right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                                    <td className="p-3">{tx.date}</td>
                                    <td className="p-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'sale' ? 'bg-emerald-500/10 text-emerald-400' :
                                                tx.type === 'purchase' ? 'bg-blue-500/10 text-blue-400' :
                                                    'bg-red-500/10 text-red-400'
                                            }`}>
                                            {tx.type === 'sale' && <ArrowUpRight className="w-3 h-3" />}
                                            {tx.type === 'purchase' && <ArrowDownRight className="w-3 h-3" />}
                                            {tx.type === 'payout' && <ArrowDownRight className="w-3 h-3" />}
                                            {tx.type === 'sale' ? 'Eingang' : 'Ausgang'}
                                        </span>
                                    </td>
                                    <td className="p-3">{tx.reason}</td>
                                    <td className={`p-3 text-right font-medium ${tx.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {tx.isPositive ? '+' : '-'}{tx.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                    </td>
                                    <td className="p-3 text-right text-slate-400">
                                        {tx.balanceSnapshot.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        Keine Buchungen vorhanden
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
