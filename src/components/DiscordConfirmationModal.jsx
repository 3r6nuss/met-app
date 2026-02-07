import { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, DollarSign, User, Clock, FileText } from 'lucide-react';

/**
 * Discord Confirmation Modal
 * Shows when a Discord log arrives that matches the current user's name
 * Allows the user to confirm and link to their MET transaction
 */
export default function DiscordConfirmationModal({
    discordLog,
    recentTransactions = [],
    onConfirm,
    onDismiss,
    onNotMine
}) {
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [loading, setLoading] = useState(false);

    if (!discordLog) return null;

    const formatAmount = (amount) => {
        if (!amount) return '–';
        return new Intl.NumberFormat('de-DE').format(amount) + '$';
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '–';
        try {
            return new Date(timestamp).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return timestamp;
        }
    };

    const handleConfirm = async () => {
        if (!selectedTransaction) return;
        setLoading(true);
        try {
            await onConfirm(discordLog.id, selectedTransaction);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="text-white" size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Neue Transaktion erkannt</h2>
                            <p className="text-white/70 text-sm">Bitte bestätige deine Buchung</p>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="text-white" size={20} />
                    </button>
                </div>

                {/* Discord Log Details */}
                <div className="p-5 border-b border-slate-700">
                    <div className="bg-slate-900/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${discordLog.parsedType === 'abhebung'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-green-500/20 text-green-400'
                                }`}>
                                {discordLog.parsedType === 'abhebung' ? '💰 Abhebung' : '🧾 Rechnung'}
                            </span>
                            <span className="text-2xl font-bold text-white">
                                {formatAmount(discordLog.amount)}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-slate-400">
                                <User size={16} />
                                <span>{discordLog.employeeName || 'Unbekannt'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <User size={16} className="text-indigo-400" />
                                <span className="text-indigo-200">{discordLog.customerName || 'Kein Kunde'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Clock size={16} />
                                <span>{formatTime(discordLog.logTimestamp)}</span>
                            </div>
                            {discordLog.reason && (
                                <div className="col-span-2 flex items-center gap-2 text-slate-400">
                                    <FileText size={16} />
                                    <span>{discordLog.reason}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Transaction Selection */}
                <div className="p-5">
                    <label className="block text-sm font-medium text-slate-400 mb-3">
                        Wähle die passende Buchung aus deinem System:
                    </label>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {recentTransactions.length > 0 ? (
                            recentTransactions.map((tx, index) => {
                                const isSelected = selectedTransaction?.timestamp === tx.timestamp;
                                const txTotal = tx.quantity * tx.price;
                                const hasDifference = Math.abs(txTotal - discordLog.amount) > 0.01;

                                return (
                                    <button
                                        key={tx.timestamp || index}
                                        onClick={() => setSelectedTransaction(tx)}
                                        className={`w-full p-3 rounded-xl text-left transition-all ${isSelected
                                                ? 'bg-indigo-600 border-indigo-500'
                                                : 'bg-slate-700/50 hover:bg-slate-700 border-transparent'
                                            } border relative overflow-hidden`}
                                    >
                                        <div className="flex justify-between items-center relative z-10">
                                            <div>
                                                <span className="font-medium text-white">
                                                    {tx.quantity}x {tx.itemName}
                                                </span>
                                                <span className="text-slate-400 text-sm ml-2">
                                                    {formatTime(tx.timestamp)}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`font-bold block ${hasDifference && isSelected ? 'text-red-300 line-through text-opacity-70 text-xs' : 'text-white'}`}>
                                                    {formatAmount(txTotal)}
                                                </span>
                                                {hasDifference && isSelected && (
                                                    <span className="font-bold text-green-300 block">
                                                        ➜ {formatAmount(discordLog.amount)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {hasDifference && isSelected && (
                                            <div className="mt-2 text-xs text-green-200 flex items-center gap-1 bg-black/20 p-1 rounded">
                                                <AlertTriangle size={12} />
                                                Preis wird automatisch korrigiert
                                            </div>
                                        )}
                                    </button>
                                )
                            })
                        ) : (
                            <div className="text-center py-6 text-slate-500">
                                Keine passenden Transaktionen gefunden
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="p-5 bg-slate-900/30 flex gap-3">
                    <button
                        onClick={onNotMine}
                        className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                    >
                        Nicht meine Buchung
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedTransaction || loading}
                        className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check size={18} />
                                Bestätigen
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
