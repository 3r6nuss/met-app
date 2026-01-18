import React from 'react';
import { cn } from '../lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function InventoryList({ inventory, isEditMode, onUpdateStock, onUpdateTarget, onReorder }) {
    // Split into 3 columns to match the design
    // Note: To support reordering across columns, we need to know the global index
    const columns = [
        inventory.slice(0, 10),
        inventory.slice(10, 16),
        inventory.slice(16)
    ];

    const getPriorityBorderColor = (item) => {
        if (item.priority === 'high') return 'border-red-500';
        if (item.priority === 'medium') return 'border-orange-500';
        if (item.priority === 'low') return 'border-green-500';
        return 'border-slate-700';
    };

    const handleMove = (index, direction) => {
        if (!onReorder) return;
        const newInventory = [...inventory];
        const newIndex = index + direction;

        if (newIndex < 0 || newIndex >= newInventory.length) return;

        // Swap
        [newInventory[index], newInventory[newIndex]] = [newInventory[newIndex], newInventory[index]];
        onReorder(newInventory);
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
                        {colItems.map((item) => {
                            // Find global index
                            const globalIndex = inventory.findIndex(i => i.id === item.id);

                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "grid grid-cols-[2fr_1fr_1fr] gap-2 p-3 rounded bg-slate-800 items-center transition-colors hover:bg-slate-700 border-l-4 relative group",
                                        getPriorityBorderColor(item)
                                    )}
                                >
                                    <div className="font-medium text-slate-200 truncate flex items-center gap-2">
                                        {isEditMode && (
                                            <div className="flex flex-col gap-0.5 mr-1">
                                                <button
                                                    onClick={() => handleMove(globalIndex, -1)}
                                                    disabled={globalIndex === 0}
                                                    className="p-0.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                                >
                                                    <ArrowUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleMove(globalIndex, 1)}
                                                    disabled={globalIndex === inventory.length - 1}
                                                    className="p-0.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                                >
                                                    <ArrowDown className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        {item.name}
                                    </div>

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
                                        {isEditMode ? (
                                            <input
                                                type="number"
                                                value={item.target || 0}
                                                onChange={(e) => onUpdateTarget(item.id, parseInt(e.target.value) || 0)}
                                                className="w-full bg-slate-900/80 border border-slate-600 rounded px-2 py-1 text-right text-sm focus:border-violet-500 outline-none"
                                            />
                                        ) : (
                                            item.target != null ? (
                                                <span className="text-slate-400 text-sm">{item.target.toLocaleString()}</span>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
