import React, { useState, useMemo, useEffect } from 'react';
import { PackagePlus, DollarSign, Copy, Check, ShoppingCart, Trash2, Sparkles, ImageIcon, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { recipes } from '../data/recipes';

// Placeholder product image
const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect fill="#1e293b" width="80" height="80" rx="8"/><text x="40" y="44" text-anchor="middle" fill="#475569" font-family="sans-serif" font-size="12">Bild</text></svg>');

// Generate a unique 6-character alphanumeric transaction ID (same charset as server)
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateTransactionId() {
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
    return id;
}

// Product image map - will be filled in by user later
const productImages = {};

function getProductImage(name) {
    return productImages[name] || PLACEHOLDER_IMG;
}

export default function CheckInForm({
    inventory,
    employees = [],
    prices = [],
    onCheckIn,
    title = "Einlagern",
    depositorLabel = "Mitarbeiter",
    showPrice = true,
    user,
    lastTransactionId
}) {
    const [copiedId, setCopiedId] = useState(false);
    const [copiedPrice, setCopiedPrice] = useState(false);
    const [preTransactionId, setPreTransactionId] = useState(() => generateTransactionId());
    const [selectedId, setSelectedId] = useState('');
    const [depositor, setDepositor] = useState('');
    const [customName, setCustomName] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [isReturn, setIsReturn] = useState(false);
    const [isSelfCollected, setIsSelfCollected] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [pendingSubmission, setPendingSubmission] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [cart, setCart] = useState([]);
    const [skipInventory, setSkipInventory] = useState(false);

    useEffect(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setSelectedDate(now.toISOString().slice(0, 16));
        const savedDepositor = localStorage.getItem('met_depositor');
        if (savedDepositor) {
            const employeeNames = employees.map(e => typeof e === 'string' ? e : e.name);
            if (employeeNames.includes(savedDepositor)) {
                setDepositor(savedDepositor);
            } else {
                setShowCustomInput(true);
                setCustomName(savedDepositor);
            }
        }
    }, [employees]);

    const selectedItem = useMemo(() => inventory.find(i => i.id === parseInt(selectedId)), [selectedId, inventory]);

    const calculateRecursiveWage = (itemId) => {
        const item = inventory.find(i => i.id === itemId);
        if (!item) return 0;
        const priceItem = prices.find(p => p.name === item.name);
        const baseWage = priceItem ? (parseFloat(priceItem.lohn?.toString().split('/')[0]) || 0) : 0;
        const recipe = recipes[itemId];
        if (!recipe) return baseWage;
        let ingredientWage = 0;
        recipe.inputs.forEach(input => {
            const inputItem = inventory.find(i => i.name === input.name);
            if (inputItem) {
                const inputUnitWage = calculateRecursiveWage(inputItem.id);
                const qtyNeeded = input.quantity / recipe.output;
                ingredientWage += inputUnitWage * qtyNeeded;
            }
        });
        return baseWage + ingredientWage;
    };

    useEffect(() => {
        if (isReturn) { setPrice(0); return; }
        if (selectedItem) {
            if (title.includes("Einlagern") && isSelfCollected) {
                const wage = calculateRecursiveWage(selectedItem.id);
                setPrice(Math.round(wage * 100) / 100);
                return;
            }
            setPrice('');
            const priceItem = prices.find(p => p.name === selectedItem.name);
            if (priceItem) {
                if (title.includes("Einkauf")) setPrice(priceItem.ek || '');
                else if (title.includes("Einlagern")) setPrice(priceItem.lohn || '');
            }
        }
    }, [selectedId, selectedItem, prices, title, isReturn, isSelfCollected]);

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
            warningIgnored: false,
            skipInventory: skipInventory,
            category: title.includes("Einkauf") ? 'trade' : 'internal'
        };
        setCart([...cart, newItem]);
        setQuantity(''); setPrice(''); setSelectedId('');
        setIsSelfCollected(false); setIsReturn(false);
    };

    const removeFromCart = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const processSubmission = (submissionData) => {
        if (Array.isArray(submissionData)) {
            const dataWithId = submissionData.map(item => ({ ...item, transactionId: preTransactionId }));
            onCheckIn(dataWithId);
        } else {
            const { selectedId, quantity, depositor, price } = submissionData;
            onCheckIn(
                parseInt(selectedId), parseInt(quantity), depositor, price,
                submissionData.date, false, skipInventory, preTransactionId
            );
        }
        setQuantity(''); setPrice(''); setSelectedId('');
        setShowWarningModal(false); setPendingSubmission(null);
        setIsSelfCollected(false); setSkipInventory(false); setCart([]);
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
        if (selectedItem && !title.includes("Einlagern")) {
            const priceItem = prices.find(p => p.name === selectedItem.name);
            if (priceItem && priceItem.note) {
                const noteLower = priceItem.note.toLowerCase();
                if (noteLower.includes("kein einkauf") || noteLower.includes("nur einkauf bis") || noteLower.includes("kein ankauf") || noteLower.includes("nur ankauf bis")) {
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

    // Accent colors
    const isEinkauf = title.includes("Einkauf");
    const accentFrom = isEinkauf ? 'from-emerald-500' : 'from-violet-500';
    const accentTo = isEinkauf ? 'to-teal-400' : 'to-purple-400';
    const accentText = isEinkauf ? 'text-emerald-400' : 'text-violet-400';
    const accentBorder = isEinkauf ? 'border-emerald-500/30' : 'border-violet-500/30';
    const summaryAccent = isEinkauf ? 'text-emerald-400' : 'text-violet-400';

    const selectClasses = "w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 outline-none transition-all duration-200 appearance-none cursor-pointer";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* LEFT: Form */}
            <div className="lg:col-span-3">
                <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className={`relative p-2.5 rounded-xl bg-gradient-to-br ${accentFrom} ${accentTo} shadow-lg`}>
                                <PackagePlus className="w-5 h-5 text-white" />
                                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${accentFrom} ${accentTo} blur-lg opacity-40`} />
                            </div>
                            <div>
                                <CardTitle className={`text-xl bg-gradient-to-r ${accentFrom} ${accentTo} bg-clip-text text-transparent`}>
                                    {title}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">Transaktion erfassen</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Product select with image preview */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Produkt</label>
                                <div className="flex gap-3 items-start">
                                    {/* Product image */}
                                    <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-slate-700/50 bg-slate-950/50">
                                        <img
                                            src={selectedItem ? getProductImage(selectedItem.name) : PLACEHOLDER_IMG}
                                            alt={selectedItem?.name || 'Produkt'}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
                                        className={cn(selectClasses, "flex-1")} required={cart.length === 0}>
                                        <option value="">Produkt wählen...</option>
                                        {sortedInventory.map(item => (
                                            <option key={item.id} value={item.id} className="bg-slate-900">
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Datum & Zeit</label>
                                <Input type="datetime-local" value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-slate-950/60 border-slate-700/60 text-slate-200" />
                            </div>

                            {/* Employee */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{depositorLabel}</label>
                                <select value={showCustomInput ? '__custom__' : depositor}
                                    onChange={handleEmployeeChange}
                                    className={selectClasses} required={!showCustomInput}>
                                    <option value="">Mitarbeiter wählen...</option>
                                    {employees.map((emp, idx) => {
                                        const empName = typeof emp === 'string' ? emp : emp.name;
                                        return <option key={idx} value={empName} className="bg-slate-900">{empName}</option>;
                                    })}
                                    <option value="__custom__" className="bg-slate-900 text-amber-400">➕ Andere...</option>
                                </select>
                            </div>

                            {showCustomInput && (
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Name eingeben</label>
                                    <Input type="text" value={customName}
                                        onChange={(e) => { setCustomName(e.target.value); if (e.target.value) localStorage.setItem('met_depositor', e.target.value); }}
                                        placeholder="Name..."
                                        className="bg-slate-950/60 border-slate-700/60 text-slate-200"
                                        required />
                                </div>
                            )}

                            {/* Quantity + Price */}
                            <div className={`grid ${showPrice ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Menge</label>
                                    <Input type="number" value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        placeholder="0"
                                        className="bg-slate-950/60 border-slate-700/60 text-slate-200"
                                        required={cart.length === 0} min="1" />
                                </div>
                                {showPrice && (
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-end flex-wrap gap-1">
                                            <label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                                                {title.includes("Einkauf") ? "Preis (Stk)" : "Lohn (Stk)"}
                                            </label>
                                            {title.includes("Einlagern") && (
                                                <div className="flex gap-2">
                                                    <label className="flex items-center gap-1.5 cursor-pointer group">
                                                        <input type="checkbox" checked={isSelfCollected}
                                                            onChange={(e) => { setIsSelfCollected(e.target.checked); if (e.target.checked) setIsReturn(false); }}
                                                            className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0" />
                                                        <span className="text-[10px] text-muted-foreground group-hover:text-emerald-400 transition-colors">Selbst</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer group">
                                                        <input type="checkbox" checked={isReturn}
                                                            onChange={(e) => { setIsReturn(e.target.checked); if (e.target.checked) setIsSelfCollected(false); }}
                                                            className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-0" />
                                                        <span className="text-[10px] text-muted-foreground group-hover:text-violet-400 transition-colors">Rückgabe</span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Input type="text" value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                placeholder="0"
                                                className={cn("bg-slate-950/60 border-slate-700/60 text-slate-200 pl-8", isReturn && "opacity-40 cursor-not-allowed")}
                                                disabled={isReturn} />
                                            <DollarSign className="w-4 h-4 text-slate-600 absolute left-2.5 top-2.5" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Summary Card */}
                            {showPrice && selectedId && quantity > 0 && price !== '' && (
                                <Card className={cn("border bg-slate-950/40 overflow-hidden", accentBorder)}>
                                    <div className={`h-[2px] bg-gradient-to-r ${accentFrom} ${accentTo}`} />
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Geschätzter Betrag</span>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-xl font-bold", summaryAccent)}>${calculateEarnings()}</span>
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(String(getRawTotal()));
                                                        setCopiedPrice(true);
                                                        setTimeout(() => setCopiedPrice(false), 2000);
                                                    }}>
                                                    {copiedPrice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <Separator className="bg-slate-800" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Referenz-ID</span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="font-mono font-bold text-amber-400 border-amber-400/30 bg-amber-400/10 tracking-wider">
                                                    {preTransactionId}
                                                </Badge>
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(preTransactionId);
                                                        setCopiedId(true);
                                                        setTimeout(() => setCopiedId(false), 2000);
                                                    }}>
                                                    {copiedId ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Add to Cart + Submit */}
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={addToCart}
                                    disabled={!selectedId || !quantity}
                                    className="flex-1 border-slate-700/60 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300">
                                    <Plus className="w-4 h-4 mr-1" /> Zur Liste
                                </Button>
                                <Button type="submit"
                                    className={cn(
                                        "flex-1 text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]",
                                        skipInventory
                                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                                            : `bg-gradient-to-r ${accentFrom} ${accentTo} hover:opacity-90`
                                    )}>
                                    <Sparkles className="w-4 h-4 mr-1" />
                                    {cart.length > 0 ? `Bestätigen (${cart.length})` : (skipInventory ? 'Protokollieren' : 'Bestätigen')}
                                </Button>
                            </div>

                            {/* Skip Inventory */}
                            {(user?.role === 'Administrator' || user?.role === 'Buchhaltung') && (
                                <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-950/30 border border-slate-800/50 cursor-pointer group hover:border-blue-500/30 transition-colors">
                                    <input type="checkbox" checked={skipInventory}
                                        onChange={(e) => setSkipInventory(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-0" />
                                    <span className="text-sm text-muted-foreground group-hover:text-blue-400 transition-colors">
                                        Nur Protokoll (Kein Lagerbestand)
                                    </span>
                                </label>
                            )}
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* RIGHT: Cart / Warenkorb */}
            <div className="lg:col-span-2">
                <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl sticky top-6">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2 text-slate-300">
                                <ShoppingCart className={cn("w-4 h-4", accentText)} />
                                Warenkorb
                            </CardTitle>
                            {cart.length > 0 && (
                                <Badge className={cn("bg-gradient-to-r text-white text-xs", accentFrom, accentTo)}>
                                    {cart.length}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <Separator className="bg-slate-800" />
                    <CardContent className="p-0">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <ShoppingCart className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm">Noch keine Produkte</p>
                                <p className="text-xs mt-1 opacity-60">Füge Produkte über das Formular hinzu</p>
                            </div>
                        ) : (
                            <>
                                <ScrollArea className="max-h-[400px]">
                                    <div className="p-3 space-y-2">
                                        {cart.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 hover:border-slate-700/60 transition-colors group">
                                                {/* Product image */}
                                                <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden border border-slate-700/40">
                                                    <img
                                                        src={getProductImage(item.name)}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-slate-200 text-sm truncate">{item.name}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        {item.quantity}x · ${item.price} · {item.depositor}
                                                    </div>
                                                </div>
                                                <Button type="button" variant="ghost" size="icon"
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 hover:bg-red-400/10"
                                                    onClick={() => removeFromCart(idx)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>

                                {/* Cart Summary */}
                                <div className="border-t border-slate-800">
                                    <div className="p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground font-medium">Gesamt</span>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-lg font-bold", summaryAccent)}>${calculateCartTotal()}</span>
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(String(Math.round(getRawTotal())));
                                                        setCopiedPrice(true);
                                                        setTimeout(() => setCopiedPrice(false), 2000);
                                                    }}>
                                                    {copiedPrice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <Separator className="bg-slate-800" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground font-medium">Referenz-ID</span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="font-mono font-bold text-amber-400 border-amber-400/30 bg-amber-400/10 tracking-wider">
                                                    {preTransactionId}
                                                </Badge>
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(preTransactionId);
                                                        setCopiedId(true);
                                                        setTimeout(() => setCopiedId(false), 2000);
                                                    }}>
                                                    {copiedId ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Warning Modal */}
            {showWarningModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <Card className="bg-slate-900 border-red-500/30 max-w-md w-full shadow-2xl shadow-red-500/10 animate-fade-in">
                        <CardContent className="p-6 text-center space-y-4">
                            <h3 className="text-2xl font-bold text-red-500 uppercase tracking-wider">Achtung</h3>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                <p className="text-red-200 font-medium text-lg">{warningMessage}</p>
                            </div>
                            <p className="text-muted-foreground text-sm">Bist du sicher, dass du fortfahren möchtest?</p>
                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" onClick={() => setShowWarningModal(false)} className="flex-1">
                                    Abbrechen
                                </Button>
                                <Button variant="destructive" onClick={() => processSubmission(pendingSubmission)} className="flex-1 font-bold">
                                    Trotzdem bestätigen
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
