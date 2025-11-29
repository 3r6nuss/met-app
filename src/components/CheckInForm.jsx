import React, { useState, useMemo, useEffect } from 'react';
import { PackagePlus, DollarSign } from 'lucide-react';

export default function CheckInForm({
    inventory,
    employees = [],
    prices = [],
    onCheckIn,
    title = "Einlagern",
    depositorLabel = "Mitarbeiter",
    showPrice = true
}) {
    const [selectedId, setSelectedId] = useState('');
    const [depositor, setDepositor] = useState('');
    const [customName, setCustomName] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [isReturn, setIsReturn] = useState(false);


    const selectedItem = useMemo(() => inventory.find(i => i.id === parseInt(selectedId)), [selectedId, inventory]);

    // Pre-fill price based on item and transaction type
    useEffect(() => {
        if (isReturn) {
            setPrice(0);
            return;
        }
        setPrice('');
        if (selectedItem) {
            const priceItem = prices.find(p => p.name === selectedItem.name);
            if (priceItem) {
                if (title.includes("Einkauf")) {
                    setPrice(priceItem.ek || '');
                } else if (title.includes("Einlagern")) {
                    setPrice(priceItem.lohn || '');
                }
            }
        }
    }, [selectedId, selectedItem, prices, title, isReturn]);



    const handleEmployeeChange = (e) => {
        const value = e.target.value;
        if (value === '__custom__') {
            setShowCustomInput(true);
            setDepositor('');
        } else {
            setShowCustomInput(false);
            setDepositor(value);
            setCustomName('');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedId || !quantity) return;

        const finalDepositor = showCustomInput ? customName : depositor;
        const finalPrice = showPrice ? price : 0; // Keep as string to support ranges like "50/80"

        onCheckIn(
            parseInt(selectedId),
            parseInt(quantity),
            finalDepositor,
            finalPrice
        );

        setQuantity('');
        setDepositor('');
        setCustomName('');
        setPrice('');
        setSelectedId('');
        setShowCustomInput(false);
        setShowCustomInput(false);
    };

    const sortedInventory = [...inventory].sort((a, b) => a.name.localeCompare(b.name));

    // Helper to calculate estimated earnings
    const calculateEarnings = () => {
        if (!quantity || !price) return 0;
        // Try to parse the first number if it's a range like "50/80"
        const numericPrice = parseFloat(price.toString().split('/')[0]) || 0;
        return (quantity * numericPrice).toLocaleString();
    };

    return (
        <section className="glass-panel rounded-2xl p-6 mb-8 h-full">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-violet-300">
                <PackagePlus className="w-5 h-5" />
                {title}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Produkt</label>
                    <select
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        className="w-full glass-input rounded-lg px-4 py-2.5 appearance-none cursor-pointer"
                        required
                    >
                        <option value="">Produkt wählen...</option>
                        {sortedInventory.map(item => (
                            <option key={item.id} value={item.id} className="bg-slate-900">
                                {item.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{depositorLabel}</label>
                    <select
                        value={showCustomInput ? '__custom__' : depositor}
                        onChange={handleEmployeeChange}
                        className="w-full glass-input rounded-lg px-4 py-2.5 appearance-none cursor-pointer"
                        required={!showCustomInput}
                    >
                        <option value="">Mitarbeiter wählen...</option>
                        {employees.map((emp, idx) => (
                            <option key={idx} value={emp} className="bg-slate-900">
                                {emp}
                            </option>
                        ))}
                        <option value="__custom__" className="bg-slate-900 text-amber-400">
                            ➕ Andere...
                        </option>
                    </select>
                </div>

                {showCustomInput && (
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Name eingeben</label>
                        <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder="Name..."
                            className="w-full glass-input rounded-lg px-4 py-2.5"
                            required
                        />
                    </div>
                )}

                <div className={`grid ${showPrice ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Menge</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0"
                            className="w-full glass-input rounded-lg px-4 py-2.5"
                            required
                            min="1"
                        />
                    </div>
                    {showPrice && (
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                                    {title.includes("Einkauf") ? "Preis (Stk)" : "Lohn (Stk)"}
                                </label>
                                {title.includes("Einlagern") && (
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={isReturn}
                                            onChange={(e) => setIsReturn(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                                        />
                                        <span className="text-xs text-slate-400 group-hover:text-violet-300 transition-colors">Rückgabe (0$)</span>
                                    </label>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="text" // Changed to text to support ranges like "50/80"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0"
                                    className={`w-full glass-input rounded-lg px-4 py-2.5 pl-8 ${isReturn ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isReturn}
                                />
                                <DollarSign className="w-4 h-4 text-slate-500 absolute left-2.5 top-3" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Estimated Earnings Display */}
                {showPrice && selectedId && quantity > 0 && price && (
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 animate-fade-in">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Geschätzter Verdienst:</span>
                            <span className="font-bold text-emerald-400">
                                ${calculateEarnings()}
                            </span>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    className="w-full bg-violet-600 text-white py-3 rounded-lg font-semibold hover:bg-violet-700 transition-colors duration-200 mt-2"
                >
                    Bestätigen
                </button>
            </form>
        </section>
    );
}
