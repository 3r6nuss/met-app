import React from 'react';
import { Check, Trash2, Clock, FileText, Package, User, Sparkles, Timer } from 'lucide-react';
import { cn } from '../lib/utils';

export default function OrderList({ orders, onUpdateStatus, onDelete, user }) {
    const isAuthorized = user?.role === 'Buchhaltung' || user?.role === 'Administrator' || user?.role === 'Lager';

    const getStatusStyles = (status) => {
        switch (status) {
            case 'done':
                return {
                    card: 'bg-emerald-950/30 border-emerald-500/30',
                    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                    icon: 'text-emerald-400',
                    quantity: 'text-emerald-400'
                };
            case 'open':
                return {
                    card: 'bg-amber-950/20 border-amber-500/30',
                    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                    icon: 'text-amber-400',
                    quantity: 'text-amber-400'
                };
            default:
                return {
                    card: 'bg-slate-800/50 border-slate-700/50',
                    badge: 'bg-slate-700 text-slate-400 border-slate-600',
                    icon: 'text-slate-400',
                    quantity: 'text-slate-200'
                };
        }
    };

    const getTimeSince = (timestamp) => {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        if (seconds < 60) return 'gerade eben';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `vor ${minutes} Min.`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `vor ${hours} Std.`;
        const days = Math.floor(hours / 24);
        return `vor ${days} Tagen`;
    };

    if (!orders || orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800/50">
                <div className="p-4 rounded-full bg-slate-800/50 mb-4">
                    <Sparkles className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-slate-400 font-medium">Keine offenen Aufträge</p>
                <p className="text-slate-500 text-sm mt-1">Alle Aufträge wurden erledigt! 🎉</p>
            </div>
        );
    }

    const openOrders = orders.filter(o => o.status === 'open');
    const doneOrders = orders.filter(o => o.status === 'done');

    return (
        <div className="space-y-4 mb-8">
            {/* Stats Summary */}
            <div className="flex items-center gap-3 text-sm">
                {openOrders.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <Timer className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 font-medium">{openOrders.length} offen</span>
                    </div>
                )}
                {doneOrders.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">{doneOrders.length} erledigt</span>
                    </div>
                )}
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map(order => {
                    const styles = getStatusStyles(order.status);

                    return (
                        <div
                            key={order.id}
                            className={cn(
                                "relative p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group",
                                styles.card,
                                order.status === 'open' && "animate-pulse-subtle"
                            )}
                        >
                            {/* Status Badge */}
                            <div className="absolute top-3 right-3">
                                <span className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider",
                                    styles.badge
                                )}>
                                    {order.status === 'done' ? (
                                        <>
                                            <Check className="w-3 h-3" />
                                            Erledigt
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="w-3 h-3 animate-pulse" />
                                            Offen
                                        </>
                                    )}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="pr-24">
                                <div className="flex items-center gap-2 mb-2">
                                    <Package className={cn("w-5 h-5", styles.icon)} />
                                    <span className="font-bold text-lg text-slate-200">{order.item_name}</span>
                                </div>

                                <div className={cn(
                                    "text-4xl font-mono font-black mb-4",
                                    styles.quantity
                                )}>
                                    {order.quantity.toLocaleString()}
                                    <span className="text-lg font-normal ml-1 text-slate-500">Stück</span>
                                </div>
                            </div>

                            {/* Meta Info */}
                            <div className="flex flex-col gap-2 text-sm border-t border-slate-700/50 pt-3 mt-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Timer className="w-3.5 h-3.5" />
                                    <span>{getTimeSince(order.timestamp)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <User className="w-3.5 h-3.5" />
                                    <span className="font-medium text-slate-300">{order.requester}</span>
                                </div>
                                {order.note && (
                                    <div className="flex items-start gap-2 mt-2 p-3 bg-slate-800/50 rounded-xl text-xs">
                                        <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                                        <span className="text-slate-400 italic">{order.note}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {isAuthorized && (
                                <div className="flex gap-2 mt-4">
                                    {order.status === 'open' && (
                                        <button
                                            onClick={() => onUpdateStatus(order.id, 'done')}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl font-medium transition-all"
                                        >
                                            <Check className="w-4 h-4" />
                                            Erledigt
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onDelete(order.id)}
                                        className="p-2.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                                        title="Löschen"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
