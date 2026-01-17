import React, { useMemo } from 'react';
import { cn } from '../lib/utils';
import { ArrowUp, ArrowDown, AlertTriangle, CheckCircle, TrendingDown, Sparkles, Package } from 'lucide-react';

export default function InventoryList({ inventory, isEditMode, onUpdateStock, onUpdateTarget, onReorder }) {
    // Split into 3 columns to match the design
    const columns = [
        inventory.slice(0, 10),
        inventory.slice(10, 16),
        inventory.slice(16)
    ];

    // Calculate inventory health stats
    const stats = useMemo(() => {
        const critical = inventory.filter(i => i.target && i.current <= i.target * 0.2).length;
        const low = inventory.filter(i => i.target && i.current > i.target * 0.2 && i.current <= i.target * 0.5).length;
        const good = inventory.length - critical - low;
        return { critical, low, good };
    }, [inventory]);

    const getStockStatus = (item) => {
        if (!item.target) return 'neutral';
        const percentage = (item.current / item.target) * 100;
        if (percentage <= 20) return 'critical';
        if (percentage <= 50) return 'low';
        if (percentage >= 100) return 'full';
        return 'good';
    };

    const getStatusBadge = (status) => {
        // Removed - was too subtle/hidden
        return null;
    };

    const getRowStyles = (status) => {
        switch (status) {
            case 'critical':
                return 'bg-red-950/30 border-red-500/50 hover:bg-red-950/50';
            case 'low':
                return 'bg-amber-950/20 border-amber-500/30 hover:bg-amber-950/30';
            case 'full':
                return 'bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-950/30';
            default:
                return 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50';
        }
    };

    const getProgressBar = (item) => {
        if (!item.target) return null;
        const percentage = Math.min((item.current / item.target) * 100, 100);
        const status = getStockStatus(item);

        const barColor = status === 'critical' ? 'bg-red-500' :
            status === 'low' ? 'bg-amber-500' :
                status === 'full' ? 'bg-emerald-500' : 'bg-violet-500';

        return (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700/50 rounded-b overflow-hidden">
                <div
                    className={`h-full ${barColor} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        );
    };

    const handleMove = (index, direction) => {
        if (!onReorder) return;
        const newInventory = [...inventory];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= newInventory.length) return;
        [newInventory[index], newInventory[newIndex]] = [newInventory[newIndex], newInventory[index]];
        onReorder(newInventory);
    };

    return (
        <div className="space-y-6 mb-24">
            {/* Stats Bar */}
            <div className="flex items-center gap-4 p-4 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/50">
                    <Package className="w-4 h-4 text-violet-400" />
                    <span className="text-sm text-slate-400">{inventory.length} Artikel</span>
                </div>

                {stats.critical > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-400 font-medium">{stats.critical} kritisch</span>
                    </div>
                )}

                {stats.low > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <TrendingDown className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-amber-400">{stats.low} niedrig</span>
                    </div>
                )}

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400">{stats.good} OK</span>
                </div>

                {stats.critical === 0 && stats.low === 0 && (
                    <div className="flex items-center gap-2 ml-auto text-emerald-400">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-medium">Lager optimal bestückt!</span>
                    </div>
                )}
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {columns.map((colItems, colIndex) => (
                    <div key={colIndex} className="flex flex-col gap-2">
                        {/* Header */}
                        <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 p-3 bg-slate-800/80 backdrop-blur rounded-xl font-bold text-slate-300 text-xs uppercase tracking-wider border border-slate-700/50">
                            <div className="flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-violet-400" />
                                Artikel
                            </div>
                            <div className="text-right">Bestand</div>
                            <div className="text-right">Soll</div>
                        </div>

                        {/* Rows */}
                        <div className="flex flex-col gap-1.5">
                            {colItems.map((item) => {
                                const globalIndex = inventory.findIndex(i => i.id === item.id);
                                const status = getStockStatus(item);

                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "relative grid grid-cols-[2fr_1fr_1fr] gap-2 p-3 rounded-xl items-center transition-all duration-200 border",
                                            getRowStyles(status),
                                            "group"
                                        )}
                                    >
                                        {getProgressBar(item)}

                                        <div className="font-medium text-slate-200 truncate flex items-center gap-2 relative">
                                            {isEditMode && (
                                                <div className="flex flex-col gap-0.5 mr-1">
                                                    <button
                                                        onClick={() => handleMove(globalIndex, -1)}
                                                        disabled={globalIndex === 0}
                                                        className="p-0.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                                                    >
                                                        <ArrowUp className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMove(globalIndex, 1)}
                                                        disabled={globalIndex === inventory.length - 1}
                                                        className="p-0.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                                                    >
                                                        <ArrowDown className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                            <span className="relative">
                                                {item.name}
                                                {getStatusBadge(status)}
                                            </span>
                                        </div>

                                        <div className="text-right">
                                            {isEditMode ? (
                                                <input
                                                    type="number"
                                                    value={item.current}
                                                    onChange={(e) => onUpdateStock(item.id, parseInt(e.target.value) || 0)}
                                                    className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1.5 text-right text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all"
                                                />
                                            ) : (
                                                <span className={cn(
                                                    "font-mono font-bold text-lg transition-all",
                                                    status === 'critical' ? 'text-red-400' :
                                                        status === 'low' ? 'text-amber-400' :
                                                            status === 'full' ? 'text-emerald-400' : 'text-slate-200'
                                                )}>
                                                    {(item.current || 0).toLocaleString()}
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            {isEditMode ? (
                                                <input
                                                    type="number"
                                                    value={item.target || 0}
                                                    onChange={(e) => onUpdateTarget(item.id, parseInt(e.target.value) || 0)}
                                                    className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1.5 text-right text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all"
                                                />
                                            ) : (
                                                item.target != null ? (
                                                    <span className="text-slate-400 font-mono">{item.target.toLocaleString()}</span>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
