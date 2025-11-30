import React, { useState, useEffect, useMemo } from 'react';
import { PackageMinus } from 'lucide-react';

export default function CheckOutForm({
    inventory,
    employees = [],
    prices = [],
    onCheckOut,
    title = "Auslagern (Entnahme)",
    depositorLabel = "Mitarbeiter",
    showPrice = true
}) {
    const [selectedId, setSelectedId] = useState('');
    const [depositor, setDepositor] = useState('');
    const [customName, setCustomName] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [selectedDate, setSelectedDate] = useState('');

    useEffect(() => {
        // Set default date to now (local time for input)
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setSelectedDate(now.toISOString().slice(0, 16));
    }, []);

    const selectedItem = useMemo(() => inventory.find(i => i.id === parseInt(selectedId)), [selectedId, inventory]);

    useEffect(() => {
        setPrice('');
        if (selectedItem) {
            const priceItem = prices.find(p => p.name === selectedItem.name);
            if (priceItem) {
                // If Verkauf (Trade), use VK
                if (title.includes("Verkauf")) {
                    setPrice(priceItem.vk || '');
                }
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
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedId || !quantity) return;

        const finalDepositor = showCustomInput ? customName : depositor;
        const finalPrice = showPrice ? (parseFloat(price) || 0) : 0;
        const finalDate = selectedDate ? new Date(selectedDate).toISOString() : null;

        onCheckOut(parseInt(selectedId), parseInt(quantity), finalDepositor, finalPrice, finalDate);
        setQuantity('');
        setDepositor('');
        setCustomName('');
        setPrice('');
        setSelectedId('');
        setShowCustomInput(false);
    };

    const sortedInventory = [...inventory].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <section className="glass-panel rounded-2xl p-6 mb-8 animate-fade-in h-full">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-amber-300">
                <PackageMinus className="w-5 h-5" />
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
                                {item.name} (Bestand: {item.current})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Datum & Zeit</label>
                    <input
                        type="datetime-local"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full glass-input rounded-lg px-4 py-2.5 text-slate-200"
                    />
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
                            <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Preis (Stk)</label>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0"
                                className="w-full glass-input rounded-lg px-4 py-2.5"
                                min="0"
                            />
                        </div>
                    )}
                </div>

                <button type="submit" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium py-2.5 px-6 rounded-lg shadow-lg shadow-amber-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                    Ausbuchen
                </button>
            </form>
        </section>
    );
}
