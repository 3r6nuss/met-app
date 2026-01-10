import React, { useState } from 'react';
import { Plus, Trash2, Calculator, Save, TrendingUp, Search, Package, GitBranch } from 'lucide-react';
import { recipes } from '../data/recipes';
import { initialInventory } from '../data/initialData';

// Counter for generating unique IDs
let idCounter = 0;

// Helper to parse lohn string (e.g., "50/80" -> 80 (max), "80" -> 80, "" -> 0)
const parseLohn = (lohnStr) => {
    if (!lohnStr || lohnStr === '-') return 0;
    if (typeof lohnStr === 'number') return lohnStr; // Handle number input
    if (lohnStr.includes('/')) {
        const parts = lohnStr.split('/');
        return parseFloat(parts[1]) || 0;
    }
    return parseFloat(lohnStr) || 0;
};

// Create a safe lookup map for recipes by Item Name (since IDs might shift)
// We need to map ID -> Name from inventory, but we don't have inventory inside this static scope.
// We will do it inside the component.

export default function MarketingPage({ prices = [], inventory = [] }) {
    const [steps, setSteps] = useState([
        { id: 1, name: 'Zusatzkosten (Transport etc.)', cost: 0, type: 'other' },
    ]);
    const [targetProfit, setTargetProfit] = useState(0);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [recursiveSteps, setRecursiveSteps] = useState([]); // Stores the auto-calculated steps

    // Filter available items from prices
    const filteredItems = prices.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSelectItem = (itemPriceData) => {
        setSelectedItem(itemPriceData);
        setSearchTerm(itemPriceData.name);

        // Calculate recursive costs
        const { steps: calcSteps } = calculateRecursiveSteps(itemPriceData.name, 1);
        setRecursiveSteps(calcSteps);
    };

    // Recursive function to build cost steps
    const calculateRecursiveSteps = (itemName, quantityMultiplier = 1) => {
        const itemPriceData = prices.find(p => p.name === itemName);

        // Robust ID Lookup:
        // 1. Try finding ID in the passed 'inventory' (Live DB)
        // 2. Fallback to 'initialInventory' (Static Seed Data) which matches recipes.js keys (ID based)
        let itemId = null;

        const liveInvItem = inventory.find(i => i.name === itemName);
        const staticInvItem = initialInventory.find(i => i.name === itemName);

        if (staticInvItem) {
            itemId = staticInvItem.id; // Preferred for recipes since recipes.js uses static IDs
        } else if (liveInvItem) {
            itemId = liveInvItem.id;
        }

        const generatedSteps = [];

        // 1. Get Direct Lohn (Crafting or Gathering Wage)
        const lohn = parseLohn(itemPriceData?.lohn);

        // 2. Check for Recipe
        if (itemId && recipes[itemId]) {
            const recipe = recipes[itemId];

            // This item is CRAFTED.
            // Cost = (Direct Lohn for Batch + Sum(Ingredient Costs)) / Output Quantity

            // a. Recursive Ingredient Costs
            let ingredientsCost = 0;
            recipe.inputs.forEach(input => {
                const { steps: ingSteps, total: ingTotal } = calculateRecursiveSteps(input.name, input.quantity);
                // We don't add all nested steps to the top level list to avoid clutter, 
                // BUT current request implies summing up wages.
                // Let's float the wages up.

                ingSteps.forEach(s => {
                    // Adjust cost based on how many batches we need?
                    // Actually, the recursive call `calculateRecursiveSteps(input.name, input.quantity)` 
                    // should return the cost for the *required quantity*.
                    generatedSteps.push({
                        ...s,
                        name: `${s.name} (für ${itemName})`
                    });
                });
                ingredientsCost += ingTotal;
            });

            // b. Direct Crafting Lohn
            // Lohn in price list is usually per Crafting Batch
            if (lohn > 0) {
                generatedSteps.push({
                    id: ++idCounter,
                    name: `Verarbeitung: ${itemName}`,
                    cost: lohn, // This is for ONE batch
                    type: 'labor'
                });
            }

            // c. Total Batch Cost
            const batchTotal = lohn + ingredientsCost;

            // d. Cost Per Unit (Output)
            const unitCost = batchTotal / recipe.output;

            // However, we want the steps to reflect the breakdown for 1 Unit.
            // So we need to scale all accumulated steps by (1 / recipe.output).
            const scaledSteps = generatedSteps.map(s => ({
                ...s,
                cost: s.cost / recipe.output * quantityMultiplier
            }));

            // Collapsing steps is tricky. Let's just return the value and maybe a summary step?
            // User wants: "Lohn Platine + (Lohn E-Schrott * X)"
            // So they want to see the components.

            return {
                steps: scaledSteps,
                total: unitCost * quantityMultiplier
            };

        } else {
            // This item is RAW / GATHERED (or has no recipe known).
            // Cost = Lohn (Gathering Wage) * Quantity

            // If lohn is 0, maybe it's a bought item? 
            // If bought, cost is EK?
            // "so wir null null rauskommen" implies we produce everything ourselves.
            // If we produce ourselves, and it has no recipe, it must be gathered.
            // If Lohn is 0, then cost is 0? (e.g. By-product?)
            // Let's assume Cost = Max(Lohn, EK) if Lohn is 0? 
            // No, strictly Lohn as requested. If Lohn is 0, it's free.

            const unitCost = lohn;
            const total = unitCost * quantityMultiplier;

            const rawSteps = [];
            if (total > 0) {
                rawSteps.push({
                    id: ++idCounter,
                    name: `Beschaffung: ${itemName}`,
                    cost: total,
                    type: 'labor'
                });
            }

            return { steps: rawSteps, total };
        }
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

    // Merge manual steps and recursive steps for total
    const allSteps = [...recursiveSteps, ...steps];
    const totalCost = allSteps.reduce((sum, step) => sum + (parseFloat(step.cost) || 0), 0);
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
                <p className="text-slate-400 mt-2">Berechne den perfekten Verkaufspreis basierend auf der gesamten Produktionskette (Vollkosten).</p>
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
                            <GitBranch className="w-5 h-5 text-indigo-400" />
                            Kostenstruktur (Automatisch)
                        </h2>
                        {recursiveSteps.length > 0 ? (
                            <div className="space-y-2 mb-6">
                                {recursiveSteps.map((step, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm p-2 bg-slate-800/30 rounded border border-slate-700/30">
                                        <span className="text-slate-300">{step.name}</span>
                                        <span className="text-emerald-400 font-mono">{step.cost.toFixed(2)} €</span>
                                    </div>
                                ))}
                                <div className="border-t border-slate-700 pt-2 flex justify-between items-center font-medium">
                                    <span className="text-slate-400">Summe Lohnkosten</span>
                                    <span className="text-slate-200">{recursiveSteps.reduce((a, b) => a + b.cost, 0).toFixed(2)} €</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic mb-6">Wähle ein Produkt, um die Produktionskosten zu sehen.</p>
                        )}


                        <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            Zusätzliche Kosten
                        </h2>

                        <div className="space-y-4">
                            {steps.map((step) => (
                                <div key={step.id} className="flex flex-col gap-2 animate-slide-in p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
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
                                <span className="text-slate-400">Selbstkosten (Lohnkette)</span>
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
                                    <span className="text-slate-400">Aktueller Listen-VK:</span>
                                    <span className={`font-mono font-bold ${sellPrice > selectedItem.vk ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {selectedItem.vk} €
                                    </span>
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
