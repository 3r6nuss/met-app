import React from 'react';
import { Check, Trash2, Clock, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

export default function OrderList({ orders, onUpdateStatus, onDelete, user }) {
    const isAuthorized = user?.role === 'Buchhaltung' || user?.role === 'Administrator' || user?.role === 'Lager';

    const getStatusColor = (status) => {
        switch (status) {
            case 'done': return 'border-emerald-500/50 text-emerald-200 bg-emerald-900/10';
            case 'open': return 'border-amber-500/50 text-amber-200 bg-amber-900/10';
            default: return 'border-slate-500/50 text-slate-200';
        }
    };

    if (!orders || orders.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-slate-900/50 rounded-lg border border-slate-800">
                Keine offenen Aufträge
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {orders.map(order => (
                <div
                    key={order.id}
                    className={cn(
                        "relative p-4 rounded-lg border-l-4 bg-slate-800 transition-all hover:bg-slate-700",
                        getStatusColor(order.status)
                    )}
                >
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="font-bold text-lg">{order.item_name}</div>
                            <div className="text-2xl font-mono font-bold my-1">{order.quantity.toLocaleString()}x</div>
                        </div>
                        <div className="flex gap-1">
                            {isAuthorized && order.status === 'open' && (
                                <button
                                    onClick={() => onUpdateStatus(order.id, 'done')}
                                    className="p-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded transition-colors"
                                    title="Als erledigt markieren"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            )}
                            {isAuthorized && (
                                <button
                                    onClick={() => onDelete(order.id)}
                                    className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors"
                                    title="Löschen"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 text-sm opacity-80">
                        <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(order.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Von:</span>
                            <span>{order.requester}</span>
                        </div>
                        {order.note && (
                            <div className="flex items-start gap-2 mt-1 p-2 bg-black/20 rounded text-xs italic">
                                <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>{order.note}</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
