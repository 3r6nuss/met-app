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

    // ... (handleSubmit remains mostly same but uses processSubmission)

    return (
        <section className="glass-panel rounded-2xl p-6 mb-8 h-full">
            {/* ... header ... */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                {/* ... existing fields ... */}

                {/* Skip Inventory Checkbox - Only for Buchhaltung/Admin */}
                {(user?.role === 'Administrator' || user?.role === 'Buchhaltung') && (
                    <div className="flex items-center gap-2 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
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
                        className={`w-full py-3 rounded-lg font-bold transition-all duration-200 shadow-lg ${skipInventory
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/25'
                            : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-emerald-500/25'
                            } text-white`}
                    >
                        {skipInventory ? 'Nur Protokollieren' : 'Bestätigen'}
                    </button>
                </div>
            </form>
            {/* Warning Modal */}
            {
                showWarningModal && (
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
                )
            }
        </section >
    );
}



