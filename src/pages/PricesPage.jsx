import React, { useState, useEffect } from 'react';
import { DollarSign, Edit2, Save, Loader2, Info } from 'lucide-react';
import { useDeveloperConsole } from '../context/DeveloperConsoleContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
                <SortableContext items={prices.map(p => p.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {prices.map(item => (
                            <SortableItem key={item.id} id={item.id} className="h-full">
                                <Card className="h-full bg-slate-900/80 border-slate-800 hover:border-slate-600 transition-colors group">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg font-bold text-slate-100 flex justify-between">
                                            {item.name}
                                            {isEditing && <span className="text-xs font-normal text-slate-500 cursor-move opacity-50 group-hover:opacity-100">::</span>}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] uppercase text-amber-500/70 font-bold block mb-1">Einkauf (EK)</label>
                                                {isEditing ? (
                                                    <Input
                                                        value={item.ek}
                                                        onChange={(e) => handlePriceChange(item.id, 'ek', e.target.value)}
                                                        className="h-8 bg-slate-950 border-slate-700 font-mono text-right"
                                                    />
                                                ) : (
                                                    <div className="font-mono text-lg text-amber-400">{item.ek ? `$${item.ek}` : '-'}</div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase text-emerald-500/70 font-bold block mb-1">Verkauf (VK)</label>
                                                {isEditing ? (
                                                    <Input
                                                        value={item.vk}
                                                        onChange={(e) => handlePriceChange(item.id, 'vk', e.target.value)}
                                                        className="h-8 bg-slate-950 border-slate-700 font-mono text-right"
                                                    />
                                                ) : (
                                                    <div className="font-mono text-lg text-emerald-400">{item.vk ? `$${item.vk}` : '-'}</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] uppercase text-blue-500/70 font-bold block mb-1">Lohn</label>
                                                {isEditing ? (
                                                    <Input
                                                        value={item.lohn}
                                                        onChange={(e) => handlePriceChange(item.id, 'lohn', e.target.value)}
                                                        className="h-8 bg-slate-950 border-slate-700 font-mono text-right"
                                                    />
                                                ) : (
                                                    <div className="font-mono text-sm text-blue-400">{item.lohn ? `$${item.lohn}` : '-'}</div>
                                                )}
                                            </div>
                                        </div>

                                        {(item.note || isEditing) && (
                                            <div className="pt-2 border-t border-slate-800">
                                                <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Info / Notiz</label>
                                                {isEditing ? (
                                                    <Input
                                                        value={item.note || ''}
                                                        onChange={(e) => handlePriceChange(item.id, 'note', e.target.value)}
                                                        className="h-8 bg-slate-950 border-slate-700 text-xs"
                                                        placeholder="Notiz..."
                                                    />
                                                ) : (
                                                    <div className="text-xs text-slate-400 italic">{item.note || 'Keine Notiz'}</div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </SortableItem>
                        ))}
                    </div>
                </SortableContext>
                <DragOverlay>
                    {activeId ? (
                        <div className="opacity-80 scale-105 cursor-grabbing">
                            <Card className="w-64 h-32 bg-slate-800 border-emerald-500 shadow-xl flex items-center justify-center">
                                <span className="font-bold text-white">Verschiebe Preis...</span>
                            </Card>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
