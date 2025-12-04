import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';

export default function BusinessAccountPage({ logs, inventory, prices }) {
    // 1. Calculate Statistics and Chart Data
    const { currentBalance, currentInventoryValue, chartData, transactions } = useMemo(() => {
        let balance = 0;
        const dataPoints = [];
        const relevantTransactions = [];

        // Filter and sort logs (oldest first for calculation)
        const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Helper to get item price (VK)
        const getItemPrice = (itemName) => {
            const priceItem = prices.find(p => p.name === itemName);
            return priceItem ? priceItem.vk : 0;
        };

        sortedLogs.forEach(log => {
            let change = 0;
            let type = 'other';

            // Identify transaction type and impact on balance
            if (log.itemName === 'Auszahlung' || log.msg.includes('Auszahlung')) {
                // Wage Payout (Money leaves)
                // Log price is usually negative for payout in some contexts, or positive quantity * negative price
                // Based on App.jsx: price is negative (-amount), quantity is 1.
                change = log.price * log.quantity;
                type = 'payout';
            } else if (log.category === 'trade' && log.type === 'in') {
                // Purchase (Money leaves)
                // "Einkauf": We pay money.
                // Usually represented as negative impact on cash.
                // In ActionPage/App.jsx: CheckIn (in) -> price is positive usually.
                // We need to subtract it.
                change = -(log.price * log.quantity);
                type = 'purchase';
            } else if (log.category === 'trade' && log.type === 'out') {
                // Sale (Money enters)
                // "Verkauf": We get money.
                change = log.price * log.quantity;
                type = 'sale';
            }

            if (change !== 0) {
                balance += change;

                // Create a snapshot for the chart
                // Note: This is a simplified inventory value. 
                // Real historical inventory value is hard to reconstruct perfectly without full history.
                // We will just plot the Cash Balance for now, or approximate.
                // User asked for "Current Account with prices we have in stock".
                // Let's assume "Inventory Value" is constant for the chart or we just show the Balance evolution.
                // User asked for "two lines". 
                // Line 1: Cash Balance.
                // Line 2: Cash + Inventory Value (Total Assets).

                // For the chart, we need a date.
                const date = new Date(log.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

                dataPoints.push({
                    date,
                    balance: balance,
                    // We can't easily know the inventory value at that exact past moment without replaying ALL inventory moves.
                    // For now, let's just track the Balance. 
                    // If we want the second line, maybe we can just add the CURRENT inventory value to it? 
                    // Or try to estimate?
                    // Let's stick to Balance for now and maybe add a static offset for current inventory?
                    // Actually, let's try to track inventory value change too if possible.
                    // If not, we might have to omit the second line or make it static.
                    // Let's try to replay inventory changes too?
                    // That requires parsing "quantity" and "itemName" for every log.
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

        // Add Inventory Value to the chart data (Total Wealth)
        // Since we didn't track historical inventory, we will just add the *current* inventory value 
        // to the balance to show "Potential Total". This is not historically accurate but gives the requested "two lines".
        // Or better: We can't easily reconstruct history.
        // Let's just show the Balance line and maybe a "Target" line?
        // User said: "wie das aktuelle Konto mit der Preisen aussieht die wir noch im lager haben"
        // This implies: Line 1 = Cash. Line 2 = Cash + Inventory Value.
        // If we assume Inventory Value is roughly constant or we just add the CURRENT value, it's a parallel line.
        // Let's do that for now as a first approximation.
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
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign className="w-24 h-24 text-violet-400" />
                    </div>
                    <p className="text-slate-400 font-medium mb-2">Aktueller Kontostand</p>
                    <h2 className={`text-3xl font-bold ${currentBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {currentBalance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </h2>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp className="w-24 h-24 text-blue-400" />
                    </div>
                    <p className="text-slate-400 font-medium mb-2">Lagerwert (VK)</p>
                    <h2 className="text-3xl font-bold text-blue-400">
                        {currentInventoryValue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </h2>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet className="w-24 h-24 text-fuchsia-400" />
                    </div>
                    <p className="text-slate-400 font-medium mb-2">Gesamtwert (Potenziell)</p>
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
                            <Line type="monotone" dataKey="total" name="Gesamtwert (inkl. Lager)" stroke="#d946ef" strokeWidth={2} dot={false} />
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
                                            {tx.type === 'sale' ? 'Verkauf' : tx.type === 'purchase' ? 'Einkauf' : 'Auszahlung'}
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
