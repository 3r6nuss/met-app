import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';

export default function InventoryTable({ inventory, isEditMode, onUpdateStock, onUpdateTarget }) {
    const getPriorityColor = (priority) => {
        if (priority === 'high') return 'text-red-500 bg-red-500/10';
        if (priority === 'medium') return 'text-orange-500 bg-orange-500/10';
        if (priority === 'low') return 'text-emerald-500 bg-emerald-500/10';
        return 'text-slate-500 bg-slate-800/50';
    };

    return (
        <div className="rounded-md border border-slate-800 bg-slate-950/50 backdrop-blur">
            <Table>
                <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-slate-900/50">
                        <TableHead className="w-[300px]">Artikel</TableHead>
                        <TableHead>Kategorie</TableHead>
                        <TableHead>Priorität</TableHead>
                        <TableHead className="text-right">Bestand</TableHead>
                        <TableHead className="text-right">Soll</TableHead>
                        <TableHead className="text-right">Differenz</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {inventory.map((item) => {
                        const isLowStock = item.current < (item.target || 0);
                        const diff = item.current - (item.target || 0);

                        return (
                            <TableRow key={item.id} className="border-slate-800 hover:bg-slate-900/50">
                                <TableCell className="font-medium text-slate-200">
                                    <div className="flex items-center gap-2">
                                        {item.name}
                                        {isLowStock && !isEditMode && (
                                            <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>{item.category}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`border-0 ${getPriorityColor(item.priority)}`}>
                                        {item.priority}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {isEditMode ? (
                                        <Input
                                            type="number"
                                            value={item.current}
                                            onChange={(e) => onUpdateStock(item.id, parseInt(e.target.value) || 0)}
                                            className="h-8 w-20 ml-auto text-right font-mono bg-slate-900 border-slate-700 focus:border-violet-500"
                                        />
                                    ) : (
                                        <span className={`font-mono font-bold ${isLowStock ? "text-red-400" : "text-emerald-400"}`}>
                                            {item.current}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {isEditMode ? (
                                        <Input
                                            type="number"
                                            value={item.target || 0}
                                            onChange={(e) => onUpdateTarget(item.id, parseInt(e.target.value) || 0)}
                                            className="h-8 w-20 ml-auto text-right font-mono bg-slate-900 border-slate-700 focus:border-violet-500"
                                        />
                                    ) : (
                                        <span className="font-mono text-slate-400">
                                            {item.target || 0}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-slate-500">
                                    {diff > 0 ? `+${diff}` : diff}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
