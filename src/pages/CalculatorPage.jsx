import React, { useState, useMemo } from 'react';
import { Calculator, DollarSign, Package, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export default function CalculatorPage({ prices = [] }) {
    const [budget, setBudget] = useState('');
    const [priceType, setPriceType] = useState('ek'); // 'ek', 'vk', 'lohn'
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter products that have a valid price for the selected type
    const availableProducts = useMemo(() => {
        return prices.filter(p => {
            const price = p[priceType];
            return price && price !== "" && price !== "-";
        });
    }, [prices, priceType]);

    const filteredProducts = useMemo(() => {
        return availableProducts.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [availableProducts, searchTerm]);

    const handleToggleProduct = (name) => {
        setSelectedProducts(prev =>
            prev.includes(name)
                ? prev.filter(p => p !== name)
                : [...prev, name]
        );
    };

    const getPriceValue = (priceStr) => {
        if (!priceStr) return 0;
        const cleanStr = String(priceStr).split('/')[0].trim();
        return parseFloat(cleanStr) || 0;
    };

    // Calculate allocated budget per item
    const allocatedBudget = useMemo(() => {
        const budgetVal = parseFloat(budget);
        if (!budgetVal || budgetVal <= 0) return 0;
        if (selectedProducts.length === 0) return budgetVal;
        return budgetVal / selectedProducts.length;
    }, [budget, selectedProducts.length]);

    const calculateQuantity = (priceStr) => {
        const price = getPriceValue(priceStr);
        if (price <= 0) return 0;
        return Math.floor(allocatedBudget / price);
    };

    const toggleSelectAll = () => {
        if (selectedProducts.length === filteredProducts.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(filteredProducts.map(p => p.name));
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-violet-500 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Calculator className="w-8 h-8 text-violet-400" />
                        Produkt Rechner
                    </h2>
                    <p className="text-slate-400 mt-1">Berechne, wie viel du für dein Budget bekommst.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6 rounded-2xl space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Verfügbares Budget ($)
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="number"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                                    placeholder="z.B. 50000"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Preisbasis
                            </label>
                            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-700">
                                {[
                                    { id: 'ek', label: 'Einkauf' },
                                    { id: 'vk', label: 'Verkauf' },
                                    { id: 'lohn', label: 'Lohn' }
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setPriceType(type.id)}
                                        className={cn(
                                            "py-2 px-3 rounded-lg text-sm font-medium transition-all",
                                            priceType === type.id
                                                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                        )}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-400">Ausgewählt:</span>
                                <span className="text-sm font-bold text-white">{selectedProducts.length} Produkte</span>
                            </div>

                            {selectedProducts.length > 0 && (
                                <div className="mb-4 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-400">Budget pro Item:</span>
                                        <span className="text-white font-mono">${Math.floor(allocatedBudget).toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {selectedProducts.length > 0 && (
                                <button
                                    onClick={() => setSelectedProducts([])}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Auswahl zurücksetzen
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Product List & Results */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search & Filter Bar */}
                    <div className="glass-panel p-4 rounded-xl flex gap-4 items-center">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Produkte suchen..."
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                            />
                        </div>
                        <button
                            onClick={toggleSelectAll}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                        >
                            {selectedProducts.length === filteredProducts.length ? 'Keine' : 'Alle'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredProducts.map(product => {
                            const isSelected = selectedProducts.includes(product.name);
                            const quantity = calculateQuantity(product[priceType]);
                            const priceVal = getPriceValue(product[priceType]);

                            return (
                                <div
                                    key={product.name}
                                    onClick={() => handleToggleProduct(product.name)}
                                    className={cn(
                                        "glass-panel p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                                        isSelected
                                            ? "border-violet-500 bg-violet-500/5"
                                            : "border-transparent hover:border-slate-600"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                isSelected
                                                    ? "bg-violet-500 border-violet-500"
                                                    : "border-slate-600 group-hover:border-slate-500"
                                            )}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="font-medium text-slate-200">{product.name}</span>
                                        </div>
                                        <span className="text-sm font-mono text-slate-400">
                                            ${priceVal}
                                        </span>
                                    </div>

                                    {isSelected && (
                                        <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center animate-in slide-in-from-top-2 duration-200">
                                            <span className="text-xs text-slate-400">Mögliche Menge:</span>
                                            <span className="text-lg font-bold text-emerald-400">
                                                {quantity.toLocaleString()} x
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {filteredProducts.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-500">
                                Keine Produkte gefunden für "{searchTerm}" mit Preis "{priceType.toUpperCase()}"
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
