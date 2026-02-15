import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, AlertTriangle, Package } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function InventoryList({ inventory, isEditMode, onUpdateStock, onUpdateTarget, onReorder }) {
    // Split inventory into 3 balanced columns dynamically
    const itemsPerCol = Math.ceil(inventory.length / 3);
    const columns = [
        inventory.slice(0, itemsPerCol),
        inventory.slice(itemsPerCol, itemsPerCol * 2),
        inventory.slice(itemsPerCol * 2)
    ];

    const getPriorityColor = (priority) => {
        if (priority === 'high') return 'text-red-500 border-red-500/50 bg-red-500/10';
        if (priority === 'medium') return 'text-orange-500 border-orange-500/50 bg-orange-500/10';
        if (priority === 'low') return 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10';
        return 'text-slate-500 border-slate-700 bg-slate-800/50';
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-24">
            {columns.map((colItems, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-3">
                    {/* Column Header */}
                    <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-3 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl text-xs font-bold text-slate-400 uppercase tracking-wider shadow-sm">
                        <div className="flex items-center gap-2">
                            <Package className="w-3 h-3" /> Artikel
                        </div>
                        <div className="text-right">Bestand</div>
                        <div className="text-right">Soll</div>
                    </div>

                    {/* Rows */}
                    <div className="flex flex-col gap-2">
                        {colItems.map((item) => {
                            // Find global index for reordering
                            const globalIndex = inventory.findIndex(i => i.id === item.id);
                            const isLowStock = item.current < (item.target || 0);

                            return (
                                <Card
                                    key={item.id}
                                    className={cn(
                                        "grid grid-cols-[2fr_1fr_1fr] gap-4 p-3 items-center transition-all duration-200 border-l-4",
                                        "bg-slate-950/40 hover:bg-slate-900/60 border-y-slate-800/50 border-r-slate-800/50",
                                        getPriorityColor(item.priority).replace('text-', 'border-l-') // Use the color for the left border
                                    )}
                                >
                                    {/* Name & Tools */}
                                    <div className="font-medium text-slate-200 truncate flex items-center gap-3">
                                        {isEditMode && (
                                            <div className="flex flex-col gap-0.5 -ml-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 rounded-full hover:bg-slate-700"
                                                    onClick={() => handleMove(globalIndex, -1)}
                                                    disabled={globalIndex === 0}
                                                >
                                                    <ArrowUp className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 rounded-full hover:bg-slate-700"
                                                    onClick={() => handleMove(globalIndex, 1)}
                                                    disabled={globalIndex === inventory.length - 1}
                                                >
                                                    <ArrowDown className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        )}

                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate">{item.name}</span>
                                            {isLowStock && !isEditMode && (
                                                <span className="text-[10px] text-red-400 flex items-center gap-1 font-bold">
                                                    <AlertTriangle className="w-3 h-3" /> Knapp
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Current Stock */}
                                    <div className="text-right">
                                        {isEditMode ? (
                                            <Input
                                                type="number"
                                                value={item.current}
                                                onChange={(e) => onUpdateStock(item.id, parseInt(e.target.value) || 0)}
                                                className="h-8 text-right font-mono bg-slate-900 border-slate-700 focus:border-violet-500"
                                            />
                                        ) : (
                                            <span className={cn(
                                                "font-mono font-bold text-lg",
                                                isLowStock ? "text-red-400" : "text-emerald-400"
                                            )}>
                                                {(item.current || 0).toLocaleString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Target Stock */}
                                    <div className="text-right">
                                        {isEditMode ? (
                                            <Input
                                                type="number"
                                                value={item.target || 0}
                                                onChange={(e) => onUpdateTarget(item.id, parseInt(e.target.value) || 0)}
                                                className="h-8 text-right font-mono bg-slate-900 border-slate-700 focus:border-violet-500"
                                            />
                                        ) : (
                                            <Badge variant="outline" className="font-mono text-slate-400 border-slate-700 bg-slate-900/50">
                                                {item.target != null ? item.target.toLocaleString() : '-'}
                                            </Badge>
                                        )}
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
