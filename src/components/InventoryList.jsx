import React from 'react';
import { cn } from '../lib/utils';

export default function InventoryList({ inventory, isEditMode, onUpdateStock }) {
    // Split into 3 columns to match the design
    import React from 'react';
    import { cn } from '../lib/utils';

    export default function InventoryList({ inventory, isEditMode, onUpdateStock }) {
        // Split into 3 columns to match the design
        const columns = [
            inventory.slice(0, 10),
            inventory.slice(10, 16),
            inventory.slice(16)
        ];

        const getPercentage = (item) => {
            if (!item.target || item.target === 0) return null;
            return Math.round((item.current / item.target) * 100);
        };

        const getPercentageColor = (percentage) => {
            if (percentage === null) return 'text-slate-500';
            if (percentage < 20) return 'text-red-400';
            if (percentage < 100) return 'text-amber-400';
            return 'text-emerald-400';
        };

        const getPriorityBorderColor = (item) => {
            if (item.priority === 'high') return 'border-red-500';
            if (item.priority === 'medium') return 'border-orange-500';
            if (item.priority === 'low') return 'border-green-500';
            return 'border-slate-700';
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
                {columns.map((colItems, colIndex) => (
                    <div key={colIndex} className="flex flex-col gap-2">
                        {/* Header */}
                        <div className="grid grid-cols-[2fr_1fr_1fr_0.7fr] gap-2 p-3 bg-slate-800/50 rounded-t-lg font-bold text-slate-300 text-sm uppercase tracking-wider">
                            <div>Artikel</div>
                            <div className="text-right">Bestand</div>
                            <div className="text-right">Soll</div>
                            <div className="text-right">%</div>
                        </div>

                        {/* Rows */}
                        <div className="flex flex-col gap-1">
                            {colItems.map(item => {
                                const percentage = getPercentage(item);

                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "grid grid-cols-[2fr_1fr_1fr_0.7fr] gap-2 p-3 rounded bg-slate-800 items-center transition-colors hover:bg-slate-700 border-l-4",
                                            getPriorityBorderColor(item)
                                        )}
                                    >
                                        <div className="font-medium text-slate-200 truncate">{item.name}</div>

                                        <div className="text-right">
                                            {isEditMode ? (
                                                <input
                                                    type="number"
                                                    value={item.current}
                                                    onChange={(e) => onUpdateStock(item.id, parseInt(e.target.value) || 0)}
                                                    className="w-full bg-slate-900/80 border border-slate-600 rounded px-2 py-1 text-right text-sm focus:border-violet-500 outline-none"
                                                />
                                            ) : (
                                                <span className="font-mono font-medium text-slate-200">{(item.current || 0).toLocaleString()}</span>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            {item.target != null ? (
                                                <span className="text-slate-400 text-sm">{item.target.toLocaleString()}</span>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            {percentage !== null ? (
                                                <span className={cn("text-sm font-semibold", getPercentageColor(percentage))}>
                                                    {percentage}%
                                                </span>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    }
