import React, { useState, useEffect, useMemo } from 'react';
import { PackageMinus } from 'lucide-react';

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

    const processSubmission = (submissionData) => {
        const { selectedId, quantity, depositor, price, date } = submissionData;
        onCheckOut(parseInt(selectedId), parseInt(quantity), depositor, price, date, skipInventory);
        setQuantity('');
        setDepositor('');
        setCustomName('');
        setPrice('');
        setSelectedId('');
        setShowCustomInput(false);
        setShowWarningModal(false);
        setPendingSubmission(null);
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

    return (
        <section className="glass-panel rounded-2xl p-6 mb-8 animate-fade-in h-full">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-4">
                <div className="p-3 bg-amber-500/10 rounded-xl">
                    <PackageMinus className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <p className="text-sm text-slate-400">Neuen Eintrag erstellen</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date Selection */}
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Datum & Uhrzeit</label>
                    <input
                        type="datetime-local"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full glass-input rounded-lg px-4 py-2.5"
                    />
                </div>

                {/* Item Selection */}
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Item</label>
                    <div className="relative">
                        <select
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            className="w-full glass-input rounded-lg px-4 py-2.5 appearance-none cursor-pointer"
                            required
                        >
                            <option value="">Bitte wählen...</option>
                            {sortedInventory.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} (Bestand: {item.current})
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-3.5 pointer-events-none text-slate-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Depositor Selection */}
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{depositorLabel}</label>
                    <div className="relative">
                        <select
                            value={showCustomInput ? '__custom__' : depositor}
                            onChange={handleEmployeeChange}
                            className="w-full glass-input rounded-lg px-4 py-2.5 appearance-none cursor-pointer"
                            required={!showCustomInput}
                        >
                            <option value="">Bitte wählen...</option>
                            {employees.map(emp => (
                                <option key={emp} value={emp}>{emp}</option>
                            ))}
                            <option value="__custom__">Andere Person...</option>
                        </select>
                        <div className="absolute right-4 top-3.5 pointer-events-none text-slate-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Custom Name Input */}
                {showCustomInput && (
                    <div className="space-y-1 animate-fade-in">
                        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Name eingeben</label>
                        <input
                            type="text"
                            value={customName}
                            onChange={handleCustomNameChange}
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
                            <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                                {title.includes("Verkauf") ? "Preis (Stk)" : "Preis (Stk)"}
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0"
                                    className="w-full glass-input rounded-lg px-4 py-2.5 pl-8"
                                />
                                <div className="absolute left-3 top-2.5 text-slate-500 font-bold">$</div>
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

                <div className="mt-2">
                    <button
                        type="submit"
                        className={`w-full font-bold py-3 rounded-lg shadow-lg transition-all duration-200 ${skipInventory
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/25 text-white'
                            : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-500/25'
                            }`}
                    >
                        {skipInventory ? 'Nur Protokollieren' : 'Bestätigen'}
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
