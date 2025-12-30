import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, Save, TrendingUp, Search, Package } from 'lucide-react';
import { recipes } from '../data/recipes';

// Helper to parse lohn string (e.g., "50/80" -> 80 (max), "80" -> 80, "" -> 0)
const parseLohn = (lohnStr) => {
    if (!lohnStr) return 0;
    // If it contains '/', take the second value (usually max/expert price is better for checking break even)
    if (lohnStr.includes('/')) {
        const parts = lohnStr.split('/');
        return parseFloat(parts[1]) || 0;
    }
    return parseFloat(lohnStr) || 0;
};

export default function MarketingPage({ prices = [], inventory = [] }) {
    const [steps, setSteps] = useState([
        { id: 1, name: 'Materialkosten', cost: 0, type: 'material' },
        { id: 2, name: 'Arbeitszeit / Lohn', cost: 0, type: 'labor' },
    ]);
    const [targetProfit, setTargetProfit] = useState(0);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter available items from prices
    const filteredItems = prices.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSelectItem = (itemPriceData) => {
        setSelectedItem(itemPriceData);
        setSearchTerm(itemPriceData.name);

        // Find inventory item to get ID for recipe lookup
        const invItem = inventory.find(i => i.name === itemPriceData.name);
        const itemId = invItem ? invItem.id : null;

        const newSteps = [];

        // 1. Labor Cost from Price List
        const laborCost = parseLohn(itemPriceData.lohn);
        if (laborCost > 0) {
            newSteps.push({
                id: Date.now() + 1,
                name: `Lohnkosten (${itemPriceData.lohn}€)`,
                cost: laborCost,
                type: 'labor'
            });
        }

        // 2. Material Cost from Recipe
        if (itemId && recipes[itemId]) {
            const recipe = recipes[itemId];

            // Calculate material costs
            let totalMatCost = 0;
            const materialsDescription = recipe.inputs.map(input => {
                // Find price for input item (EK)
                const inputPriceItem = prices.find(p => p.name === input.name);
                const pricePerUnknown = inputPriceItem ? inputPriceItem.vk : 0; // Use VK as opportunity cost? Or EK? Usually EK for production. Let's use EK.
                // Wait, if I buy materials, I pay EK? No, EK is what *I* pay to buy from players. So that is indeed my cost.
                // But wait, if I produce it myself... let's stick to EK as "Cost of Goods".
                const unitCost = inputPriceItem ? inputPriceItem.ek : 0;

                const lineCost = unitCost * input.quantity;
                totalMatCost += lineCost;

                return `${input.quantity}x ${input.name} (${unitCost}€)`;
            }).join(', ');

            // Adjust for output quantity (e.g. recipe makes 2 items)
            const costPerItem = totalMatCost / (recipe.output || 1);

            newSteps.push({
                id: Date.now() + 2,
                name: `Materialien (Rezept: ${recipe.output}x)`,
                cost: parseFloat(costPerItem.toFixed(2)),
                type: 'material',
                details: materialsDescription
            });
        } else {
            // No recipe found, maybe just add a generic slot
            newSteps.push({ id: Date.now() + 3, name: 'Materialkosten (Sonstiges)', cost: 0, type: 'material' });
        }

        if (newSteps.length === 0) {
            newSteps.push({ id: Date.now(), name: 'Sonstige Kosten', cost: 0, type: 'other' });
        }

        setSteps(newSteps);
    };

    const addStep = () => {
        setSteps([...steps, { id: Date.now(), name: '', cost: 0, type: 'other' }]);
    };

    const removeStep = (id) => {
        setSteps(steps.filter(step => step.id !== id));
    };

    const updateStep = (id, field, value) => {
        setSteps(steps.map(step =>
            step.id === id ? { ...step, [field]: value } : step
        ));
    };

    const totalCost = steps.reduce((sum, step) => sum + (parseFloat(step.cost) || 0), 0);
    const breakEven = totalCost;
    const sellPrice = totalCost + (parseFloat(targetProfit) || 0);
    const margin = sellPrice > 0 ? ((sellPrice - totalCost) / sellPrice * 100).toFixed(1) : 0;

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6 animate-fade-in relative pb-32">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 flex items-center gap-3">
                    <Calculator className="w-8 h-8 text-violet-400" />
                    Marketing Kalkulator
                </h1>
                <p className="text-slate-400 mt-2">Berechne den perfekten Verkaufspreis basierend auf Rezepten und Preislisten.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Inputs */}
                <div className="space-y-6">
                    {/* Product Selection */}
                    <div className="glass-panel p-6 rounded-xl border border-slate-700/50 relative z-20">
                        <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-400" />
                            Produkt wählen
                        </h2>
                        <div className="relative group">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Suchen..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                            />
                            {searchTerm && !selectedItem && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                    {filteredItems.map(item => (
                                        <button
                                            key={item.name}
                                            onClick={() => handleSelectItem(item)}
                                            className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 transition-colors flex justify-between"
                                        >
                                            <span>{item.name}</span>
                                            {item.lohn && <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">Lohn: {item.lohn}</span>}
                                        </button>
                                    ))}
                                    {filteredItems.length === 0 && (
                                        <div className="px-4 py-2 text-slate-500 italic">Keine Treffer</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-xl border border-slate-700/50">
                        <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            Kostenaufstellung
                        </h2>

                        <div className="space-y-4">
                            {steps.map((step, index) => (
                                <div key={step.id} className="flex flex-col gap-2 animate-slide-in p-3 bg-slate-800/30 rounded-lg border border-slate-700/30" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="flex gap-3 items-start">
                                        <input
                                            type="text"
                                            placeholder="Beschreibung"
                                            value={step.name}
                                            onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                                            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-violet-500 text-sm"
                                        />
                                        <div className="relative w-24">
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={step.cost}
                                                onChange={(e) => updateStep(step.id, 'cost', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-3 pr-6 py-1.5 text-slate-200 focus:outline-none focus:border-violet-500 text-right text-sm font-mono"
                                            />
                                            <span className="absolute right-2 top-1.5 text-slate-500 text-sm">€</span>
                                        </div>
                                        <button
                                            onClick={() => removeStep(step.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {step.details && (
                                        <div className="text-xs text-slate-500 px-1 italic">
                                            Details: {step.details}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button
                                onClick={addStep}
                                className="w-full py-3 border-2 border-dashed border-slate-700 rounded-lg text-slate-400 hover:border-violet-500 hover:text-violet-400 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Kostenpunkt hinzufügen
                            </button>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-xl border border-slate-700/50">
                        <h2 className="text-xl font-semibold text-slate-200 mb-4">Gewinnziel</h2>
                        <div className="flex gap-4 items-center">
                            <div className="flex-1">
                                <label className="block text-sm text-slate-400 mb-1">Gewünschter Profit</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={targetProfit}
                                        onChange={(e) => setTargetProfit(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-4 pr-8 py-2 text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                                    />
                                    <span className="absolute right-3 top-2 text-slate-500">€</span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm text-slate-400 mb-1">Ziel-Marge</label>
                                <div className="px-4 py-2 bg-slate-800/30 rounded-lg text-slate-300 border border-slate-700/50">
                                    {margin}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Results */}
                <div className="space-y-6">
                    <div className="glass-panel p-8 rounded-xl border border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 sticky top-6">
                        <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Ergebnis</h2>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <span className="text-slate-400">Selbstkosten (Material + Lohn)</span>
                                <span className="text-2xl font-mono text-slate-200">{breakEven.toFixed(2)} €</span>
                            </div>

                            <div className="flex justify-between items-end">
                                <span className="text-emerald-400">Gewinnaufschlag</span>
                                <span className="text-xl font-mono text-emerald-400">+{parseFloat(targetProfit || 0).toFixed(2)} €</span>
                            </div>

                            <div className="h-px bg-slate-700 my-4" />

                            <div className="flex justify-between items-end">
                                <span className="text-lg text-violet-300 font-medium">Empfohlener Verkaufspreis</span>
                                <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 font-mono">
                                    {sellPrice.toFixed(2)} €
                                </span>
                            </div>

                            {selectedItem && (
                                <div className="mt-4 p-3 bg-slate-800/50 rounded border border-slate-700/50 text-sm flex justify-between">
                                    <span className="text-slate-400">Aktueller Markt-VK (Liste):</span>
                                    <span className="text-slate-200 font-mono">{selectedItem.vk} €</span>
                                </div>
                            )}

                            <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">Mengenstaffel</h3>
                                <div className="space-y-2 text-sm">
                                    <p className="flex justify-between">
                                        <span className="text-slate-500">Bei 10 Stück</span>
                                        <span className="text-slate-300">{(sellPrice * 10).toFixed(2)} €</span>
                                    </p>
                                    <p className="flex justify-between">
                                        <span className="text-slate-500">Bei 50 Stück</span>
                                        <span className="text-slate-300">{(sellPrice * 50).toFixed(2)} €</span>
                                    </p>
                                    <p className="flex justify-between">
                                        <span className="text-slate-500">Bei 100 Stück</span>
                                        <span className="text-slate-300">{(sellPrice * 100).toFixed(2)} €</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
