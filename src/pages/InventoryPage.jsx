import React, { useState, useEffect } from 'react';
import VerificationSection from '../components/VerificationSection';
import OrderList from '../components/OrderList';
import { ClipboardList, LayoutGrid, Save, Loader2, Package } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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

export default function InventoryPage({ inventory, onUpdateStock, onUpdateTarget, onReorder, onVerify, user, orders, onUpdateOrderStatus, onDeleteOrder }) {
    const [isEditMode, setIsEditMode] = useState(false);
    const isAuthorized = user?.role === 'Buchhaltung' || user?.role === 'Administrator';
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = inventory.findIndex((item) => item.id === active.id);
            const newIndex = inventory.findIndex((item) => item.id === over.id);

            const newOrder = arrayMove(inventory, oldIndex, newIndex);
            onReorder(newOrder); // This updates the parent state and triggers a save
        }
        setActiveId(null);
    };

    // Calculate stats
    const totalItems = inventory.reduce((sum, item) => sum + (item.current || 0), 0);
    const lowStockItems = inventory.filter(item => item.target > 0 && item.current < item.target * 0.2).length;

    return (
        <div className="animate-fade-in pb-24 space-y-8">
            {/* Header & Stats */}
            <div className="glass-panel p-6 rounded-xl border border-slate-700/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400">
                            Lagerbestand
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Verwaltung und Übersicht der aktuellen Bestände
                        </p>
                    </div>
                    <div className="flex gap-4 text-sm">
                        <div className="bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-xs uppercase font-bold">Total Items</span>
                            <span className="text-xl font-mono text-violet-400">{totalItems}</span>
                        </div>
                        <div className="bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-xs uppercase font-bold">Kritisch</span>
                            <span className="text-xl font-mono text-red-400">{lowStockItems}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders Section */}
            {orders && orders.length > 0 && (
                <Card className="border-amber-500/20 bg-amber-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-amber-100 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-amber-400" />
                            Offene Aufträge
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <OrderList
                            orders={orders}
                            onUpdateStatus={onUpdateOrderStatus}
                            onDelete={onDeleteOrder}
                            user={user}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Grid Content with DnD */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={inventory.map(i => i.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {inventory.map((item) => {
                            const percentage = item.target > 0 ? Math.round((item.current / item.target) * 100) : 0;
                            let statusColor = "bg-emerald-500";
                            if (percentage < 20) statusColor = "bg-red-500";
                            else if (percentage < 50) statusColor = "bg-amber-500";

                            // Priority Ring Color (if needed, but user wants clean list)
                            const priorityColor = item.priority === 'high' ? 'border-red-500/50' :
                                item.priority === 'medium' ? 'border-orange-500/50' :
                                    item.priority === 'low' ? 'border-green-500/50' : 'border-slate-800';

                            return (
                                <SortableItem key={item.id} id={item.id} className="h-full">
                                    <div className={`
                                        relative flex items-center justify-between p-3 rounded-lg 
                                        bg-slate-900/90 border ${priorityColor} hover:border-slate-600 
                                        transition-all shadow-sm group overflow-hidden
                                   `}>
                                        {/* Colored Status Bar on the Left */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor}`} />

                                        <div className="pl-3 flex-1 min-w-0">
                                            <div className="font-bold text-slate-200 truncate pr-2" title={item.name}>
                                                {item.name}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-right">
                                            {isEditMode && isAuthorized ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        className="w-16 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-sm text-right focus:border-violet-500 outline-none font-mono"
                                                        value={item.current}
                                                        onChange={(e) => onUpdateStock(item.id, parseInt(e.target.value) || 0)}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    />
                                                    <input
                                                        type="number"
                                                        className="w-14 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-sm text-right focus:border-violet-500 outline-none font-mono text-slate-500"
                                                        value={item.target}
                                                        onChange={(e) => onUpdateTarget(item.id, parseInt(e.target.value) || 0)}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-mono font-bold text-white text-lg leading-none">{item.current}</span>
                                                        <span className="text-[10px] text-slate-500 uppercase">Bestand</span>
                                                    </div>
                                                    <div className="flex flex-col items-end w-12 hidden sm:flex">
                                                        <span className="font-mono text-slate-400 text-sm leading-none">{item.target}</span>
                                                        <span className="text-[10px] text-slate-600 uppercase">Soll</span>
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
                <DragOverlay>
                    {activeId ? (
                        <div className="opacity-80 scale-105 cursor-grabbing">
                            {/* Simplified overlay - just a card lookalike */}
                            <Card className="w-64 h-32 bg-slate-800 border-violet-500 shadow-xl flex items-center justify-center">
                                <span className="font-bold text-white">Verschiebe Item...</span>
                            </Card>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <VerificationSection
                onVerify={(name) => {
                    onVerify(name);
                    setIsEditMode(false);
                }}
                onToggleEdit={() => setIsEditMode(!isEditMode)}
                isEditMode={isEditMode}
                user={user}
                isAuthorized={isAuthorized}
            />
        </div>
    );
}
