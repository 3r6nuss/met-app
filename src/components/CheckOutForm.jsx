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



    const processSubmission = (submissionData) => {
        const { selectedId, quantity, depositor, price, date } = submissionData;
        onCheckOut(parseInt(selectedId), parseInt(quantity), depositor, price, date);
        setQuantity('');
        setDepositor('');
        setCustomName('');
        setPrice('');
        setSelectedId('');
        setShowCustomInput(false);
        setShowWarningModal(false);
        setPendingSubmission(null);
    };



    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedId || !quantity) return;

        const finalDepositor = showCustomInput ? customName : depositor;
        const finalPrice = showPrice ? (parseFloat(price) || 0) : 0;
        const finalDate = selectedDate ? new Date(selectedDate).toISOString() : null;

        const submissionData = {
            selectedId,
            quantity,
            depositor: finalDepositor,
            price: finalPrice,
            date: finalDate
        };

        // Check for noteVK warnings for Verkauf
        if (selectedItem && title.includes("Verkauf")) {
            const priceItem = prices.find(p => p.name === selectedItem.name);
            if (priceItem && priceItem.noteVK) {
                const noteVKLower = priceItem.noteVK.toLowerCase();
                if (noteVKLower.includes("kein verkauf") || noteVKLower.includes("nur verkauf bis")) {
                    setWarningMessage(priceItem.noteVK);
                    setPendingSubmission(submissionData);
                    setShowWarningModal(true);
                    return;
                }
            }
        }

        processSubmission(submissionData);
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


                <div className="mt-2">
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-amber-500/25 transition-all duration-200"
                    >
                        Bestätigen
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
