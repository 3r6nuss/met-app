import React from 'react';
import { Check, Trash2, Clock, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export default function OrderList({ orders, onUpdateStatus, onDelete, user }) {
    const isAuthorized = user?.role === 'Buchhaltung' || user?.role === 'Administrator' || user?.role === 'Lager';

    const getStatusColor = (status) => {
        switch (status) {
            case 'done': return 'border-emerald-500/50 bg-emerald-500/5';
            case 'open': return 'border-amber-500/50 bg-amber-500/5';
            default: return 'border-slate-500/50 bg-slate-800/50';
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'done': return <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/50">Erledigt</Badge>;
            case 'open': return <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/50">Offen</Badge>;
            default: return <Badge variant="outline">Unbekannt</Badge>;
        }
    };

    if (!orders || orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-900/20 rounded-xl border-2 border-dashed border-slate-800">
                <FileText className="w-12 h-12 mb-3 opacity-20" />
                <p>Keine offenen Aufträge</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {orders.map(order => (
                <Card
                    key={order.id}
                    className={cn(
                        "transition-all duration-200 hover:shadow-lg border-l-4",
                        getStatusColor(order.status)
                    )}
                >
                    <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-bold text-slate-100 leading-tight">
                                    {order.item_name}
                                </CardTitle>
                                <div className="text-2xl font-mono font-bold text-slate-200">
                                    {order.quantity.toLocaleString()}x
                                </div>
                            </div>
                            {getStatusBadge(order.status)}
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                        <div className="flex flex-col gap-1.5 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{new Date(order.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5" />
                                <span>Von: <span className="text-slate-300 font-medium">{order.requester}</span></span>
                            </div>
                            {order.note && (
                                <div className="mt-2 p-2 bg-black/20 rounded-lg text-xs italic border border-white/5 flex gap-2">
                                    <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                                    <span>{order.note}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    {isAuthorized && (
                        <CardFooter className="p-3 bg-black/20 border-t border-white/5 flex justify-end gap-2">
                            {order.status === 'open' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onUpdateStatus(order.id, 'done')}
                                    className="h-8 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-400"
                                >
                                    <Check className="w-4 h-4 mr-1.5" /> Erledigen
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(order.id)}
                                className="h-8 hover:bg-red-500/20 hover:text-red-300 text-slate-400"
                            >
                                <Trash2 className="w-4 h-4 mr-1.5" /> Löschen
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            ))}
        </div>
    );
}
