import React, { useState, useMemo, useEffect } from 'react';
import { PackagePlus, DollarSign } from 'lucide-react';
import { recipes } from '../data/recipes';

export default function CheckInForm({
    inventory,
    employees = [],
    prices = [],
    onCheckIn,
    title = "Einlagern",
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
    const [isReturn, setIsReturn] = useState(false);
    const [isSelfCollected, setIsSelfCollected] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [pendingSubmission, setPendingSubmission] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');


    useEffect(() => {
        // Set default date to now (local time for input)
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setSelectedDate(now.toISOString().slice(0, 16));

        // Load saved depositor from localStorage
        const savedDepositor = localStorage.getItem('met_depositor');
        if (savedDepositor) {
            if (employees.includes(savedDepositor)) {
                setDepositor(savedDepositor);
            } else {
                // Custom name was saved
                setShowCustomInput(true);
                setCustomName(savedDepositor);
            }
        }
    }, [employees]);


    const selectedItem = useMemo(() => inventory.find(i => i.id === parseInt(selectedId)), [selectedId, inventory]);

    // Helper for recursive wage calculation
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

    // Pre-fill price based on item and transaction type
    useEffect(() => {
        if (isReturn) {
            setPrice(0);
            return;
        }

        if (selectedItem) {
            if (title.includes("Einlagern") && isSelfCollected) {
                const wage = calculateRecursiveWage(selectedItem.id);
                setPrice(Math.round(wage * 100) / 100); // Round to 2 decimals
                return;
            }

            setPrice('');
            const priceItem = prices.find(p => p.name === selectedItem.name);
            if (priceItem) {
                if (title.includes("Einkauf")) {
                    setPrice(priceItem.ek || '');
                } else if (title.includes("Einlagern")) {
                    setPrice(priceItem.lohn || '');
                }
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

    const processSubmission = (submissionData) => {
        const { selectedId, quantity, depositor, price } = submissionData;
        onCheckIn(
            parseInt(selectedId),
            parseInt(quantity),
            depositor,
            price,
            submissionData.date,
            false, // warningIgnored
            skipInventory // skipInventory
        );

        setQuantity('');
        setDepositor('');
        setCustomName('');
        setPrice('');
        setSelectedId('');
        setShowCustomInput(false);
        setShowWarningModal(false);
        setPendingSubmission(null);
        setIsSelfCollected(false);
        setSkipInventory(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
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

        // Check for notes (only for Einkauf, not Einlagern)
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

    // Helper to calculate estimated earnings
    const calculateEarnings = () => {
        if (!quantity || !price) return 0;
        // Try to parse the first number if it's a range like "50/80"
        const numericPrice = parseFloat(price.toString().split('/')[0]) || 0;
        return (quantity * numericPrice).toLocaleString();
    };

    return (
        <section className="bg-slate-800 rounded-2xl p-6 mb-8 h-full border border-slate-700 shadow-lg">
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 appearance-none cursor-pointer text-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
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
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Datum & Zeit</label>
                    <input
                        type="datetime-local"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{depositorLabel}</label>
                    <select
                        value={showCustomInput ? '__custom__' : depositor}
                        onChange={handleEmployeeChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 appearance-none cursor-pointer text-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
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
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
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
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                            required
                            min="1"
                        />
                    </div>
                    {showPrice && (
                        <div className="space-y-1">
                            <div className="flex justify-between items-end flex-wrap gap-2">
                                <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                                    {title.includes("Einkauf") ? "Preis (Stk)" : "Lohn (Stk)"}
                                </label>
                                {title.includes("Einlagern") && (
                                    <div className="flex gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={isSelfCollected}
                                                onChange={(e) => {
                                                    setIsSelfCollected(e.target.checked);
                                                    if (e.target.checked) setIsReturn(false);
                                                }}
                                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
                                            />
                                            <span className="text-xs text-slate-400 group-hover:text-emerald-300 transition-colors">Selbst gesammelt</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={isReturn}
                                                onChange={(e) => {
                                                    setIsReturn(e.target.checked);
                                                    if (e.target.checked) setIsSelfCollected(false);
                                                }}
                                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                                            />
                                            <span className="text-xs text-slate-400 group-hover:text-violet-300 transition-colors">Rückgabe (0$)</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0"
                                    className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 pl-8 text-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all ${isReturn ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                            : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                    >
                        {skipInventory ? 'Nur Protokollieren' : 'Direkt bestätigen'}
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
