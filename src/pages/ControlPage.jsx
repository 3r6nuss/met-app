import React, { useState, useEffect } from 'react';
import { Calendar, User, ChevronRight, X, Package, Edit2, Save, Trash2, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ControlPage({ employeeInventory = [], employees = [], inventory = [] }) {
    const [history, setHistory] = useState([]);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/verifications')
            .then(res => res.json())
            .then(data => {
                setHistory(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch history:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-center text-slate-400 mt-12">Lade Historie...</div>;

    // Helper to get inventory for an employee
    const getEmployeeItems = (name) => {
        return employeeInventory.filter(i => i.employee_name === name);
    };

    // Manual Update Handler
    const handleUpdateStock = (employeeName, itemId, newQuantity) => {
        fetch('/api/employee-inventory/manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeName, itemId, quantity: parseInt(newQuantity) })
        })
            .then(res => res.json())
            .then(data => {
                if (!data.success) toast.error("Fehler beim Speichern");
                else toast.success("Bestand aktualisiert");
            })
            .catch(_err => toast.error("Netzwerkfehler"));
    };

    return (
        <div className="animate-fade-in pb-24 max-w-5xl mx-auto space-y-8">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400">
                        Kontrolle & Übersicht
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Verwaltung der Mitarbeiter-Bestände und Prüfprotokolle
                    </p>
                </div>
            </div>

            {/* Employee Inventory Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 text-violet-400 mb-2">
                    <Package className="w-5 h-5" />
                    <h2 className="text-lg font-semibold tracking-wide uppercase text-xs">Mitarbeiter Lager</h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {employees.map((emp, idx) => {
                        const empName = typeof emp === 'string' ? emp : emp.name;
                        return (
                            <EmployeeInventoryCard
                                key={idx}
                                name={empName}
                                items={getEmployeeItems(empName)}
                                allInventory={inventory}
                                onUpdate={handleUpdateStock}
                            />
                        );
                    })}
                </div>
            </section>

            {/* Verification History Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <Calendar className="w-5 h-5" />
                    <h2 className="text-lg font-semibold tracking-wide uppercase text-xs">Verlauf</h2>
                </div>

                <Card className="bg-slate-950/50 border-slate-800 backdrop-blur-sm">
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                            <div className="p-4 space-y-2">
                                {history.length === 0 ? (
                                    <div className="text-center text-slate-500 py-12">
                                        Keine Einträge vorhanden.
                                    </div>
                                ) : (
                                    history.map((entry, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedEntry(entry)}
                                            className="group flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">{entry.verifier}</div>
                                                    <div className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString()}</div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </section>

            {/* Detail Modal */}
            <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
                <DialogContent className="max-w-2xl bg-slate-950 border-slate-800">
                    <DialogHeader>
                        <DialogTitle>Kontrolle Details</DialogTitle>
                        <DialogDescription>
                            Detaillierte Ansicht des Prüfprotokolls
                        </DialogDescription>
                    </DialogHeader>

                    {selectedEntry && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Prüfer</div>
                                    <div className="font-bold text-lg text-emerald-400">{selectedEntry.verifier}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Zeitpunkt</div>
                                    <div className="font-mono text-slate-300">{new Date(selectedEntry.timestamp).toLocaleString()}</div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-400 mb-3 text-xs uppercase tracking-widest">Bestand zum Zeitpunkt der Prüfung</h4>
                                <ScrollArea className="h-[300px] rounded-xl border border-slate-800 bg-slate-900/30">
                                    <div className="divide-y divide-slate-800">
                                        {selectedEntry.snapshot.map(item => (
                                            <div key={item.id} className="flex justify-between items-center p-3 hover:bg-slate-800/50 transition-colors text-sm">
                                                <span className="text-slate-300 font-medium">{item.name}</span>
                                                <span className="font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{item.current.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function EmployeeInventoryCard({ name, items, allInventory, onUpdate }) {
    const [expanded, setExpanded] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    const startEdit = (id, current) => {
        setEditingId(id);
        setEditValue(current);
    };

    const saveEdit = (id) => {
        onUpdate(name, id, editValue);
        setEditingId(null);
    };

    return (
        <Card className={cn(
            "border-slate-800 bg-slate-900/40 transition-all duration-300 overflow-hidden",
            expanded ? "ring-1 ring-violet-500/50 bg-slate-900/80 shadow-lg shadow-violet-500/10" : "hover:bg-slate-900/60"
        )}>
            <div
                onClick={() => setExpanded(!expanded)}
                className="p-4 flex justify-between items-center cursor-pointer select-none"
            >
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-colors",
                        expanded ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-400"
                    )}>
                        {name.charAt(0)}
                    </div>
                    <div>
                        <div className={cn("font-medium transition-colors", expanded ? "text-violet-300" : "text-slate-200")}>{name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-700 text-slate-500">
                                {items.length} Items
                            </Badge>
                        </div>
                    </div>
                </div>
                <ChevronRight className={cn("w-5 h-5 text-slate-600 transition-transform duration-300", expanded && "rotate-90 text-violet-500")} />
            </div>

            {expanded && (
                <div className="border-t border-slate-800/80 bg-slate-950/30">
                    <div className="p-4 space-y-2">
                        {items.length === 0 ? (
                            <div className="text-center text-slate-500 text-sm py-4 italic">Keine Items im Inventar.</div>
                        ) : (
                            items.map(item => {
                                const itemDef = allInventory.find(i => i.id === item.item_id);
                                const itemName = itemDef ? itemDef.name : `Item #${item.item_id}`;

                                return (
                                    <div key={item.item_id} className="group flex justify-between items-center text-sm bg-slate-900/80 p-3 rounded-lg border border-slate-800/50 hover:border-violet-500/30 transition-colors">
                                        <span className="text-slate-300 font-medium">{itemName}</span>

                                        {editingId === item.item_id ? (
                                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                                                <Input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-20 h-8 bg-slate-950 border-violet-500 focus:ring-violet-500/20 text-right font-mono"
                                                    autoFocus
                                                />
                                                <Button size="icon" variant="ghost" onClick={() => saveEdit(item.item_id)} className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10">
                                                    <Save className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 text-slate-400 hover:text-slate-300 hover:bg-slate-800">
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-violet-300 font-bold bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                                                    {item.quantity}
                                                </span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => startEdit(item.item_id, item.quantity)}
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-violet-400 hover:bg-violet-500/10"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}
