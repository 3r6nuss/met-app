import React, { useState, useEffect, useMemo } from 'react';
import { PackageMinus, DollarSign } from 'lucide-react';

export default function CheckOutForm({
    inventory,
    employees = [],
    prices = [],
    onCheckOut,
    title = "Auslagern (Entnahme)",
    depositorLabel = "Mitarbeiter",
    showPrice = true,
    user // Receive user prop
}) {
    const [selectedId, setSelectedId] = useState('');
    const [depositor, setDepositor] = useState('');
    const [customName, setCustomName] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [pendingSubmission, setPendingSubmission] = useState(null);
    const [cart, setCart] = useState([]);


    useEffect(() => {
        // Set default date to now (local time for input)
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setSelectedDate(now.toISOString().slice(0, 16));

        // Load saved depositor from localStorage
        const savedDepositor = localStorage.getItem('met_depositor');
        if (savedDepositor) {
            // Check if saved depositor matches any employee name
            const employeeNames = employees.map(e => typeof e === 'string' ? e : e.name);
            if (employeeNames.includes(savedDepositor)) {
                setDepositor(savedDepositor);
            } else {
                // Custom name was saved
                setShowCustomInput(true);
                setCustomName(savedDepositor);
            }
        }
    }, [employees]);

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
            // Save to localStorage
            if (value) {
                localStorage.setItem('met_depositor', value);
            }
        }
    };

    const handleCustomNameChange = (e) => {
        const value = e.target.value;
        setCustomName(value);
        // Save custom name to localStorage
        if (value) {
            localStorage.setItem('met_depositor', value);
        }
    };



    const [skipInventory, setSkipInventory] = useState(false);

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
            price: finalPrice,
            date: selectedDate ? new Date(selectedDate).toISOString() : null,
            skipInventory: skipInventory,
            category: title.includes("Verkauf") ? 'trade' : 'internal'
        };

        setCart([...cart, newItem]);

        // Reset form fields but keep depositor
        setQuantity('');
        setPrice('');
        setSelectedId('');
    };

    const removeFromCart = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const processSubmission = (submissionData) => {
        if (Array.isArray(submissionData)) {
            onCheckOut(submissionData);
        } else {
            const { selectedId, quantity, depositor, price, date } = submissionData;
            onCheckOut(parseInt(selectedId), parseInt(quantity), depositor, price, date, skipInventory);
        }

        setQuantity('');
        // setDepositor('');
        // setCustomName('');
        setPrice('');
        setSelectedId('');
        // setShowCustomInput(false);
        setShowWarningModal(false);
        setPendingSubmission(null);
        setSkipInventory(false);
        setCart([]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (cart.length > 0) {
            processSubmission(cart);
            return;
        }

        if (!selectedId || !quantity) return;

        const finalDepositor = showCustomInput ? customName : depositor;
        const finalPrice = showPrice ? price : 0;

        const submissionData = {
            selectedId,
            quantity,
            depositor: finalDepositor,
            price: finalPrice,
            date: selectedDate ? new Date(selectedDate).toISOString() : null
        };

        // Check for notes (only for Verkauf, not Auslagern)
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

    // Helper to calculate estimated earnings
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

    return (
        <section className="bg-slate-800 rounded-2xl p-6 mb-8 h-full border border-slate-700 shadow-lg">
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 appearance-none cursor-pointer text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        required={cart.length === 0}
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{depositorLabel}</label>
                    <select
                        value={showCustomInput ? '__custom__' : depositor}
                        onChange={handleEmployeeChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 appearance-none cursor-pointer text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        required={!showCustomInput}
                    >
                        <option value="">Mitarbeiter wählen...</option>
                        {employees.map((emp, idx) => {
                            const empName = typeof emp === 'string' ? emp : emp.name;
                            return (
                                <option key={idx} value={empName} className="bg-slate-900">
                                    {empName}
                                </option>
                            );
                        })}
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
                            onChange={handleCustomNameChange}
                            placeholder="Name..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
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
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                            required={cart.length === 0}
                            min="1"
                        />
                    </div>
                    {showPrice && (
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                                {title.includes("Verkauf") ? "Preis (Stk)" : "Preis (Stk)"}
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 pl-8 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
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
                            <span className="text-slate-400">Geschätzter Betrag:</span>
                            <span className="font-bold text-amber-400">
                                ${calculateEarnings()}
                            </span>
                        </div>
                    </div>
                )}

                {/* Add to Cart Button */}
                <div className="grid grid-cols-1 gap-3 mt-2">
                    <button
                        type="button"
                        onClick={addToCart}
                        disabled={!selectedId || !quantity}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <PackageMinus className="w-4 h-4" />
                        Zur Liste hinzufügen
                    </button>
                </div>

                {/* Cart List */}
                {cart.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Aktuelle Liste</h3>
                        <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50 transition-colors">
                                    <div>
                                        <div className="font-medium text-slate-200">{item.name}</div>
                                        <div className="text-xs text-slate-400">
                                            {item.quantity}x • ${item.price} • {item.depositor}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFromCart(idx)}
                                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <div className="p-3 bg-slate-800/30 flex justify-between items-center text-sm font-semibold">
                                <span className="text-slate-400">Gesamt:</span>
                                <span className="text-amber-400">${calculateCartTotal()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Skip Inventory Checkbox - Only for Buchhaltung/Admin */}
                {(user?.role === 'Administrator' || user?.role === 'Buchhaltung') && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-slate-800/30 rounded-lg border border-slate-700/50">
                        <label className="flex items-center gap-2 cursor-pointer group w-full">
                            <input
                                type="checkbox"
                                checked={skipInventory}
                                onChange={(e) => setSkipInventory(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                            />
                            <span className="text-sm text-slate-400 group-hover:text-blue-300 transition-colors">
                                Nur Protokoll (Kein Lagerbestand)
                            </span>
                        </label>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3 mt-2">
                    <button
                        type="submit"
                        className={`w-full text-white py-3 rounded-lg font-semibold transition-colors duration-200 ${skipInventory
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-amber-600 hover:bg-amber-700'
                            }`}
                    >
                        {cart.length > 0
                            ? `Alle bestätigen (${cart.length})`
                            : (skipInventory ? 'Nur Protokollieren' : 'Direkt bestätigen')
                        }
                    </button>
                </div>
            </form>

            {/* Warning Modal */}
            {showWarningModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in">
                        <div className="text-center space-y-4">
                            <h3 className="text-2xl font-bold text-red-500 uppercase tracking-wider">Achtung</h3>

                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                <p className="text-red-200 font-medium text-lg">
                                    {warningMessage}
                                </p>
                            </div>

                            <p className="text-slate-400 text-sm">
                                Bist du sicher, dass du fortfahren möchtest?
                            </p>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowWarningModal(false)}
                                    className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={() => processSubmission(pendingSubmission)}
                                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-bold"
                                >
                                    Trotzdem bestätigen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
