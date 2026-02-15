import React, { useState, useEffect } from 'react';
import { DollarSign, Edit2, Save, Loader2, Info } from 'lucide-react';
import { useDeveloperConsole } from '../context/DeveloperConsoleContext';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from '../components/SortableItem';

export default function PricesPage() {
    const [prices, setPrices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [activeId, setActiveId] = useState(null);

    const { log } = useDeveloperConsole();

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { active: { activationConstraint: { distance: 8 } } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetch('/api/prices')
            .then(res => res.json())
            .then(data => {
                setPrices(data);
                setIsLoading(false);
                log('API', 'Prices Fetched', { count: data.length });
            })
            .catch(err => {
                console.error("Failed to fetch prices:", err);
                setIsLoading(false);
                log('ERROR', 'Fetch Prices Failed', err);
            });
    }, []);

    const handlePriceChange = (id, field, value) => {
        setPrices(currentPrices =>
            currentPrices.map(p => p.id === id ? { ...p, [field]: value } : p)
        );
    };

    const handleDragStart = (event) => setActiveId(event.active.id);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setPrices((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
        setActiveId(null);
    };

    const handleSave = () => {
        setIsLoading(true);
        log('STATE', 'Saving Prices...', { count: prices.length });

        fetch('/api/prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prices)
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setIsEditing(false);
                    log('API', 'Prices Updated Successfully');
                } else {
                    alert("Speichern fehlgeschlagen: " + data.error);
                    log('ERROR', 'Price Update Failed', data);
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to save prices:", err);
                alert("Netzwerkfehler beim Speichern");
                setIsLoading(false);
                log('ERROR', 'Price Update Network Error', err);
            });
    };

    if (isLoading && !prices.length) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 pb-24 animate-fade-in">
            {/* Header */}
            <div className="glass-panel rounded-xl p-6 border border-slate-700/50">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-3">
                            <DollarSign className="w-8 h-8 text-emerald-400" />
                            Preisliste
                        </h1>
                        <p className="text-slate-400 mt-1">Verwaltung der An- und Verkaufspreise</p>
                    </div>
                    {isEditing ? (
                        <Button onClick={handleSave} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Speichern
                        </Button>
                    ) : (
                        <Button onClick={() => setIsEditing(true)} variant="outline" className="border-slate-600 hover:bg-slate-800">
                            <Edit2 className="w-4 h-4 mr-2" /> Bearbeiten
                        </Button>
                    )}
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Render 3 Columns with specific counts: 10, 6, Remainder */}
                    {[
                        { id: 'col1', items: prices.slice(0, 10) },
                        { id: 'col2', items: prices.slice(10, 16) },
                        { id: 'col3', items: prices.slice(16) }
                    ].map((col, colIndex) => {
                        const colItems = col.items;
                        if (colItems.length === 0 && colIndex > 0) return null;

                        return (
                            <div key={col.id} className="space-y-4">
                                {/* Column Header */}
                                <div className="flex justify-between items-center px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <span>Artikel</span>
                                    <div className="flex gap-2 text-[10px] sm:text-xs">
                                        <span className="w-14 text-right text-amber-500/80">Einkauf</span>
                                        <span className="w-14 text-right text-emerald-500/80">Verkauf</span>
                                        <span className="w-14 text-right text-blue-500/80 hidden sm:block">Lohn</span>
                                    </div>
                                </div>

                                <SortableContext items={colItems.map(p => p.id)} strategy={rectSortingStrategy}>
                                    <div className="space-y-2">
                                        {colItems.map((item) => {
                                            const statusColor = item.vk > item.ek ? "bg-emerald-500" : "bg-amber-500";
                                            // Optional: highlight items with notes
                                            const borderColor = item.note ? "border-blue-500/30" : "border-slate-800";

                                            return (
                                                <SortableItem key={item.id} id={item.id} className="h-full">
                                                    <div className={`
                                                        relative flex items-center justify-between p-2 rounded-lg 
                                                        bg-[#1a1b26] border ${borderColor} hover:border-slate-600 
                                                        transition-all shadow-sm group overflow-hidden h-14
                                                   `}>
                                                        {/* Colored Status Bar */}
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor}`} />

                                                        <div className="pl-3 flex-1 min-w-0">
                                                            <div className="font-bold text-slate-200 truncate pr-2 text-sm" title={item.name}>
                                                                {item.name}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-right">
                                                            {isEditing ? (
                                                                <div className="flex gap-1">
                                                                    <Input
                                                                        type="number"
                                                                        className="w-14 bg-slate-950/50 border border-slate-700 rounded px-1 py-1 text-xs text-right text-amber-500 focus:border-amber-500 outline-none font-mono"
                                                                        value={item.ek}
                                                                        onChange={(e) => handlePriceChange(item.id, 'ek', e.target.value)}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                        placeholder="EK"
                                                                    />
                                                                    <Input
                                                                        type="number"
                                                                        className="w-14 bg-slate-950/50 border border-slate-700 rounded px-1 py-1 text-xs text-right text-emerald-500 focus:border-emerald-500 outline-none font-mono"
                                                                        value={item.vk}
                                                                        onChange={(e) => handlePriceChange(item.id, 'vk', e.target.value)}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                        placeholder="VK"
                                                                    />
                                                                    <Input
                                                                        type="number"
                                                                        className="w-14 bg-slate-950/50 border border-slate-700 rounded px-1 py-1 text-xs text-right text-blue-500 focus:border-blue-500 outline-none font-mono hidden sm:block"
                                                                        value={item.lohn}
                                                                        onChange={(e) => handlePriceChange(item.id, 'lohn', e.target.value)}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                        placeholder="Lohn"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="flex flex-col items-end w-14">
                                                                        <span className="font-mono font-bold text-amber-500 text-sm leading-none tracking-tight">${item.ek}</span>
                                                                    </div>
                                                                    <div className="flex flex-col items-end w-14">
                                                                        <span className="font-mono font-bold text-emerald-500 text-sm leading-none tracking-tight">${item.vk}</span>
                                                                    </div>
                                                                    <div className="flex flex-col items-end w-14 hidden sm:flex">
                                                                        <span className="font-mono font-bold text-blue-500 text-sm leading-none tracking-tight">${item.lohn || 0}</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </SortableItem>
                                            );
                                        })}
                                    </div>
                                </SortableContext>
                            </div>

                        );
                    })}
                </div>
                <DragOverlay>
                    {activeId ? (
                        <div className="opacity-80 scale-105 cursor-grabbing">
                            <Card className="w-64 h-14 bg-slate-800 border-emerald-500 shadow-xl flex items-center justify-center">
                                <span className="font-bold text-white text-sm">Verschiebe Preis...</span>
                            </Card>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
