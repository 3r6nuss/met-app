import React from 'react';
import { cn } from '../lib/utils';

export default function InventoryList({ inventory, isEditMode, onUpdateStock }) {
    // Split into 3 columns to match the design
    const columns = [
        inventory.slice(0, 10),
        inventory.slice(10, 16),
        inventory.slice(16)
    ];

    const getStatusColor = (item) => {
        if (item.target && item.current < item.target * 0.2) return 'border-red-500 text-red-200';
        if (item.target && item.current < item.target) return 'border-amber-500 text-amber-200';
        return 'border-emerald-500/50 text-emerald-200';
    };

    const getPriorityBorderColor = (item) => {
        if (item.priority === 'high') return 'border-red-500';
        if (item.priority === 'medium') return 'border-orange-500';
        if (item.priority === 'low') return 'border-green-500';
        return null; // Use status color
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
            {columns.map((colItems, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-2">
                    {/* Header */}
                    <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 p-3 bg-slate-800/50 rounded-t-lg font-bold text-slate-300 text-sm uppercase tracking-wider">
                        <div>Artikel</div>
                        <div className="text-right">Bestand</div>
                        <div className="text-right">Soll</div>
                    </div>

                    {/* Rows */}
                    <div className="flex flex-col gap-1">
                        {colItems.map(item => {
                            const priorityBorder = getPriorityBorderColor(item);
                            const statusColor = getStatusColor(item);

                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "grid grid-cols-[2fr_1fr_1fr] gap-2 p-3 rounded bg-slate-800 items-center transition-colors hover:bg-slate-700 border-l-4",
                                        priorityBorder || statusColor
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
                                            <span className="font-mono font-medium">{(item.current || 0).toLocaleString()}</span>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        {item.target != null ? (
                                            <span className="text-slate-400 text-sm">{item.target.toLocaleString()}</span>
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
