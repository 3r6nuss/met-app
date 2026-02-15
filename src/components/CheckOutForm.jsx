import React, { useState, useEffect, useMemo } from 'react';
import { PackageMinus, DollarSign, Copy, Check, ShoppingCart, Trash2, Sparkles, Plus, Package, Clock, User, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Generate a unique 6-character alphanumeric transaction ID (same charset as server)
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateTransactionId() {
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
    return id;
}

export default function CheckOutForm({
    inventory,
    employees = [],
    prices = [],
    onCheckOut,
    title = "Auslagern (Entnahme)",
    depositorLabel = "Mitarbeiter",
    showPrice = true,
    user,
    lastTransactionId
}) {
    const [copiedId, setCopiedId] = useState(false);
    const [copiedPrice, setCopiedPrice] = useState(false);
    const [preTransactionId, setPreTransactionId] = useState(() => generateTransactionId());
    const [selectedId, setSelectedId] = useState('');
    const [depositor, setDepositor] = useState(() => {
        const saved = localStorage.getItem('met_depositor');
        return saved || '';
    });
    const [customName, setCustomName] = useState(() => {
        const saved = localStorage.getItem('met_depositor');
        return saved || '';
    });
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [pendingSubmission, setPendingSubmission] = useState(null);
    const [cart, setCart] = useState([]);
    const [skipInventory, setSkipInventory] = useState(false);

    useEffect(() => {
        const savedDepositor = localStorage.getItem('met_depositor');
        if (savedDepositor) {
            const employeeNames = employees.map(e => typeof e === 'string' ? e : e.name);
            if (!employeeNames.includes(savedDepositor)) {
                setShowCustomInput(true);
            }
        }
    }, [employees]);

    const selectedItem = useMemo(() => inventory.find(i => i.id === parseInt(selectedId)), [selectedId, inventory]);

    useEffect(() => {
        setPrice('');
        if (selectedItem) {
            const priceItem = prices.find(p => p.name === selectedItem.name);
            if (priceItem && title.includes("Verkauf")) {
                setPrice(priceItem.vk || '');
            }
        }
    }, [selectedId, selectedItem, prices, title]);

    const handleEmployeeChange = (e) => {
        const value = e.target.value;
        if (value === '__custom__') {
            setShowCustomInput(true);
            setDepositor('');
        } else {
            setShowCustomInput(false);
            setDepositor(value);
            setCustomName('');
            if (value) localStorage.setItem('met_depositor', value);
        }
    };

    const handleCustomNameChange = (e) => {
        const value = e.target.value;
        setCustomName(value);
        if (value) localStorage.setItem('met_depositor', value);
    };

    const addToCart = () => {
        if (!selectedId || !quantity) return;
        const finalDepositor = showCustomInput ? customName : depositor;
        const finalPrice = showPrice ? price : 0;
        const item = inventory.find(i => i.id === parseInt(selectedId));
        const newItem = {
            id: parseInt(selectedId),
            name: item.name,
            quantity: parseInt(quantity),
            depositor: finalDepositor,
            price: finalPrice ? parseFloat(finalPrice.toString().replace(',', '.')) : 0,
            date: selectedDate ? new Date(selectedDate).toISOString() : null,
            skipInventory: skipInventory,
            category: title.includes("Verkauf") ? 'trade' : 'internal'
        };
        setCart([...cart, newItem]);
        setQuantity(''); setPrice(''); setSelectedId('');
    };

    const removeFromCart = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const processSubmission = (submissionData) => {
        if (Array.isArray(submissionData)) {
            const dataWithId = submissionData.map(item => ({ ...item, transactionId: preTransactionId }));
            onCheckOut(dataWithId);
        } else {
            const { selectedId, quantity, depositor, price, date } = submissionData;
            onCheckOut(parseInt(selectedId), parseInt(quantity), depositor, price, date, skipInventory, preTransactionId);
        }
        setQuantity(''); setPrice(''); setSelectedId('');
        setShowWarningModal(false); setPendingSubmission(null);
        setSkipInventory(false); setCart([]);
        setPreTransactionId(generateTransactionId());
        setCopiedId(false); setCopiedPrice(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (cart.length > 0) { processSubmission(cart); return; }
        if (!selectedId || !quantity) return;
        const finalDepositor = showCustomInput ? customName : depositor;
        const finalPrice = showPrice ? price : 0;
        const submissionData = {
            selectedId, quantity,
            depositor: finalDepositor,
            price: finalPrice ? parseFloat(finalPrice.toString().replace(',', '.')) : 0,
            date: selectedDate ? new Date(selectedDate).toISOString() : null
        };
        if (selectedItem && !title.includes("Auslagern")) {
            const priceItem = prices.find(p => p.name === selectedItem.name);
            if (priceItem && priceItem.note) {
                const noteLower = priceItem.note.toLowerCase();
                if (noteLower.includes("kein verkauf") || noteLower.includes("nur verkauf bis") || noteLower.includes("kein abverkauf") || noteLower.includes("nur abverkauf bis")) {
                    setWarningMessage(priceItem.note);
                    setPendingSubmission(submissionData);
                    setShowWarningModal(true);
                    return;
                }
            }
        }
        processSubmission(submissionData);
    };

    const sortedInventory = [...inventory].sort((a, b) => a.name.localeCompare(b.name));

    const calculateEarnings = () => {
        if (!quantity || !price) return 0;
        const numericPrice = parseFloat(price.toString().split('/')[0]) || 0;
        return (quantity * numericPrice).toLocaleString();
    };

    const calculateCartTotal = () => {
        return cart.reduce((sum, item) => {
            const numericPrice = parseFloat(item.price.toString().split('/')[0]) || 0;
            return sum + (item.quantity * numericPrice);
        }, 0).toLocaleString();
    };

    const getRawTotal = () => {
        if (cart.length > 0) {
            return cart.reduce((sum, item) => {
                const numericPrice = parseFloat(item.price.toString().split('/')[0]) || 0;
                return sum + (item.quantity * numericPrice);
            }, 0);
        }
        const numericPrice = parseFloat(price?.toString().split('/')[0]) || 0;
        return Math.round(quantity * numericPrice);
    };

    // Theme colors
    const isVerkauf = title.includes("Verkauf");
    const accent = isVerkauf
        ? { from: 'from-amber-500', to: 'to-orange-400', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'shadow-amber-500/10', ring: 'ring-amber-500/30' }
        : { from: 'from-orange-500', to: 'to-red-400', text: 'text-orange-400', border: 'border-orange-500/20', glow: 'shadow-orange-500/10', ring: 'ring-orange-500/30' };

    // Shared input styling
    const inputBase = "w-full h-11 bg-slate-950/80 border border-slate-700/50 rounded-xl px-4 text-sm text-slate-100 placeholder:text-slate-600 transition-all duration-200 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 focus:bg-slate-950";
    const selectBase = cn(inputBase, "appearance-none cursor-pointer");
    const labelBase = "flex items-center gap-2 text-[11px] text-slate-500 uppercase tracking-[0.15em] font-semibold mb-2";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* ──────── LEFT COLUMN: FORM ──────── */}
            <div className="lg:col-span-3">
                <div className="relative group">
                    {/* Subtle glow behind card */}
                    <div className={`absolute -inset-[1px] bg-gradient-to-b ${accent.from} ${accent.to} rounded-2xl opacity-[0.08] group-hover:opacity-[0.12] transition-opacity duration-500 blur-sm`} />

                    <Card className="relative bg-slate-900/90 border-slate-800/80 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden">
                        {/* Top gradient line */}
                        <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />

                        <CardHeader className="pb-2 pt-6 px-6">
                            <div className="flex items-center gap-4">
                                <div className={`relative p-3 rounded-2xl bg-gradient-to-br ${accent.from} ${accent.to} shadow-lg ${accent.glow} shadow-xl`}>
                                    <PackageMinus className="w-5 h-5 text-white relative z-10" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-slate-100">{title}</CardTitle>
                                    <p className="text-[11px] text-slate-500 mt-0.5 tracking-wide">Transaktion erfassen</p>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="px-6 pb-6 pt-4">
                            <form onSubmit={handleSubmit} className="space-y-5">

                                {/* ── Product Select ── */}
                                <div className="space-y-2">
                                    <Label className={labelBase}>
                                        <Package className="w-3.5 h-3.5" /> Produkt
                                    </Label>
                                    <div className="flex gap-3 items-center">
                                        {/* Product avatar */}
                                        <div className={cn(
                                            "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold border",
                                            selectedItem
                                                ? `bg-gradient-to-br ${accent.from}/20 ${accent.to}/10 ${accent.border} ${accent.text}`
                                                : "bg-slate-800/60 border-slate-700/40 text-slate-600"
                                        )}>
                                            {selectedItem ? selectedItem.name.charAt(0) : '?'}
                                        </div>
                                        <div className="flex-1">
                                            <Select value={selectedId} onValueChange={setSelectedId}>
                                                <SelectTrigger className={cn("w-full bg-slate-950/50 border-slate-800 h-11", cart.length === 0 && !selectedId && "border-red-500/50")}>
                                                    <SelectValue placeholder="Produkt wählen..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sortedInventory.map(item => (
                                                        <SelectItem key={item.id} value={item.id.toString()}>
                                                            {item.name} (Bestand: {item.current})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {selectedItem && (
                                        <p className="text-[11px] text-slate-600 mt-1.5 ml-14">
                                            Aktueller Bestand: <span className={accent.text}>{selectedItem.current}</span>
                                        </p>
                                    )}
                                </div>

                                {/* ── Date ── */}
                                <div className="space-y-2">
                                    <Label className={labelBase}>
                                        <Clock className="w-3.5 h-3.5" /> Datum & Zeit
                                    </Label>
                                    <Input
                                        type="datetime-local"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="bg-slate-950/50 border-slate-800 h-11"
                                    />
                                </div>

                                {/* ── Employee ── */}
                                <div className="space-y-2">
                                    <Label className={labelBase}>
                                        <User className="w-3.5 h-3.5" /> {depositorLabel}
                                    </Label>
                                    <Select
                                        value={showCustomInput ? '__custom__' : depositor}
                                        onValueChange={(val) => {
                                            if (val === '__custom__') {
                                                setShowCustomInput(true);
                                                setDepositor('');
                                            } else {
                                                setShowCustomInput(false);
                                                setDepositor(val);
                                                setCustomName('');
                                                if (val) localStorage.setItem('met_depositor', val);
                                            }
                                        }}
                                    >
                                        <SelectTrigger className={cn("w-full bg-slate-950/50 border-slate-800 h-11", !showCustomInput && !depositor && "border-red-500/50")}>
                                            <SelectValue placeholder="Mitarbeiter wählen..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map((emp, idx) => {
                                                const empName = typeof emp === 'string' ? emp : emp.name;
                                                return <SelectItem key={idx} value={empName}>{empName}</SelectItem>;
                                            })}
                                            <SelectItem value="__custom__">＋ Andere...</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {showCustomInput && (
                                    <div className="space-y-2">
                                        <Label className={labelBase}>Name eingeben</Label>
                                        <Input
                                            type="text"
                                            value={customName}
                                            onChange={handleCustomNameChange}
                                            placeholder="Name..."
                                            className="bg-slate-950/50 border-slate-800 h-11"
                                            required
                                        />
                                    </div>
                                )}

                                {/* ── Quantity + Price ── */}
                                <div className={`grid ${showPrice ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                                    <div className="space-y-2">
                                        <Label className={labelBase}>
                                            <Hash className="w-3.5 h-3.5" /> Menge
                                        </Label>
                                        <Input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            placeholder="0"
                                            className="bg-slate-950/50 border-slate-800 h-11"
                                            min="1"
                                            required={cart.length === 0}
                                        />
                                    </div>
                                    {showPrice && (
                                        <div className="space-y-2">
                                            <Label className={cn(labelBase)}>
                                                <DollarSign className="w-3.5 h-3.5" /> Preis (Stk)
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    type="text"
                                                    value={price}
                                                    onChange={(e) => setPrice(e.target.value)}
                                                    placeholder="0"
                                                    className="bg-slate-950/50 border-slate-800 h-11 pl-9"
                                                />
                                                <DollarSign className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── Inline Receipt ── */}
                                {showPrice && selectedId && quantity > 0 && price !== '' && (
                                    <div className={`relative rounded-xl border ${accent.border} bg-slate-950/60 overflow-hidden`}>
                                        <div className={`h-px bg-gradient-to-r from-transparent ${accent.from} to-transparent`} />
                                        <div className="p-4 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500 font-medium">Betrag</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-lg font-bold tracking-tight", accent.text)}>${calculateEarnings()}</span>
                                                    <button type="button" onClick={() => {
                                                        navigator.clipboard.writeText(String(getRawTotal()));
                                                        setCopiedPrice(true); setTimeout(() => setCopiedPrice(false), 2000);
                                                    }} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                                                        {copiedPrice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="h-px bg-slate-800/80" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500 font-medium">Referenz-ID</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-bold text-amber-400/90 tracking-widest bg-amber-400/5 border border-amber-400/15 px-2.5 py-1 rounded-lg">
                                                        {preTransactionId}
                                                    </span>
                                                    <button type="button" onClick={() => {
                                                        navigator.clipboard.writeText(preTransactionId);
                                                        setCopiedId(true); setTimeout(() => setCopiedId(false), 2000);
                                                    }} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                                                        {copiedId ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Buttons ── */}
                                <div className="flex gap-3 pt-1">
                                    <Button type="button" variant="outline" onClick={addToCart}
                                        disabled={!selectedId || !quantity}
                                        className="flex-1 h-11 border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200">
                                        <Plus className="w-4 h-4 mr-1.5" /> Zur Liste
                                    </Button>
                                    <Button type="submit"
                                        className={cn(
                                            "flex-1 h-11 text-sm font-semibold text-white gap-2 transition-all duration-300",
                                            "shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]",
                                            "bg-gradient-to-r", accent.from, accent.to,
                                            "hover:brightness-110 border-0"
                                        )}>
                                        <Sparkles className="w-4 h-4" />
                                        {cart.length > 0 ? `Bestätigen (${cart.length})` : 'Bestätigen'}
                                    </Button>
                                </div>

                                {/* ── Skip Inventory ── */}
                                {(user?.role === 'Administrator' || user?.role === 'Buchhaltung') && (
                                    <div className="flex items-center gap-2 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 cursor-pointer group hover:border-blue-500/25 transition-all">
                                        <Checkbox
                                            id="skip-inventory"
                                            checked={skipInventory}
                                            onCheckedChange={setSkipInventory}
                                            className="border-slate-600 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                        />
                                        <label
                                            htmlFor="skip-inventory"
                                            className="text-sm text-slate-500 group-hover:text-blue-400 transition-colors cursor-pointer"
                                        >
                                            Nur Protokoll (Kein Lagerbestand)
                                        </label>
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ──────── RIGHT COLUMN: CART ──────── */}
            <div className="lg:col-span-2">
                <div className="sticky top-6">
                    <Card className="bg-slate-900/90 border-slate-800/80 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden">
                        <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />

                        <CardHeader className="pb-0 pt-5 px-5">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2.5 text-slate-400">
                                    <ShoppingCart className={cn("w-4 h-4", accent.text)} />
                                    Warenkorb
                                </CardTitle>
                                {cart.length > 0 && (
                                    <Badge className={cn("text-[10px] px-2 py-0.5 bg-gradient-to-r text-white border-0 font-bold", accent.from, accent.to)}>
                                        {cart.length}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="p-0 mt-3">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/30 flex items-center justify-center mb-4">
                                        <ShoppingCart className="w-7 h-7 opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">Noch keine Produkte</p>
                                    <p className="text-xs mt-1 text-slate-600">Füge Produkte über das Formular hinzu</p>
                                </div>
                            ) : (
                                <>
                                    <ScrollArea className="max-h-[380px]">
                                        <div className="px-4 pb-3 space-y-2">
                                            {cart.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:border-slate-700/60 transition-all duration-200 group">
                                                    <div className={cn("flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold",
                                                        `bg-gradient-to-br ${accent.from}/15 ${accent.to}/10 ${accent.text} border ${accent.border}`)}>
                                                        {item.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-slate-200 text-sm truncate">{item.name}</div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                            {item.quantity}× · ${item.price} · {item.depositor}
                                                        </div>
                                                    </div>
                                                    <button type="button"
                                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                        onClick={() => removeFromCart(idx)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>

                                    {/* Cart Footer */}
                                    <div className="border-t border-slate-800/80">
                                        <div className="p-4 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500 font-medium">Gesamt</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-base font-bold", accent.text)}>${calculateCartTotal()}</span>
                                                    <button type="button" onClick={() => {
                                                        navigator.clipboard.writeText(String(Math.round(getRawTotal())));
                                                        setCopiedPrice(true); setTimeout(() => setCopiedPrice(false), 2000);
                                                    }} className="p-1 rounded-md hover:bg-slate-800 transition-colors">
                                                        {copiedPrice ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-600" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="h-px bg-slate-800/60" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500 font-medium">Referenz-ID</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-amber-400/90 tracking-widest bg-amber-400/5 border border-amber-400/15 px-2 py-0.5 rounded-md">
                                                        {preTransactionId}
                                                    </span>
                                                    <button type="button" onClick={() => {
                                                        navigator.clipboard.writeText(preTransactionId);
                                                        setCopiedId(true); setTimeout(() => setCopiedId(false), 2000);
                                                    }} className="p-1 rounded-md hover:bg-slate-800 transition-colors">
                                                        {copiedId ? <Check className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3 text-slate-600" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ──────── WARNING MODAL ──────── */}
            {showWarningModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className="relative bg-slate-900 border border-red-500/20 rounded-2xl max-w-md w-full shadow-2xl shadow-red-500/10 animate-fade-in overflow-hidden">
                        <div className="h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                        <div className="p-6 text-center space-y-4">
                            <h3 className="text-xl font-bold text-red-400 uppercase tracking-wider">Achtung</h3>
                            <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
                                <p className="text-red-200/80 font-medium">{warningMessage}</p>
                            </div>
                            <p className="text-slate-500 text-sm">Bist du sicher, dass du fortfahren möchtest?</p>
                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" onClick={() => setShowWarningModal(false)}
                                    className="flex-1 h-10 rounded-xl border-slate-700/60 bg-slate-800/40 text-slate-400">
                                    Abbrechen
                                </Button>
                                <button onClick={() => processSubmission(pendingSubmission)}
                                    className="flex-1 h-10 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-semibold hover:brightness-110 transition-all">
                                    Trotzdem bestätigen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
