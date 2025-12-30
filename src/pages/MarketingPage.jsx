import React, { useState } from 'react';
import { Plus, Trash2, Calculator, Save, TrendingUp } from 'lucide-react';

export default function MarketingPage() {
    const [steps, setSteps] = useState([
        { id: 1, name: 'Materialkosten', cost: 0, type: 'material' },
        { id: 2, name: 'Arbeitszeit (Minuten)', cost: 0, type: 'labor' },
    ]);
    const [targetProfit, setTargetProfit] = useState(0);
    const [itemName, setItemName] = useState('');

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
        <div className="max-w-4xl mx-auto p-4 space-y-6 animate-fade-in">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 flex items-center gap-3">
                    <Calculator className="w-8 h-8 text-violet-400" />
                    Marketing Kalkulator
                </h1>
                <p className="text-slate-400 mt-2">Berechne den perfekten Verkaufspreis basierend auf deinen Produktionskosten.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Inputs */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-xl border border-slate-700/50">
                        <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            Produktionsschritte
                        </h2>

                        <div className="space-y-4">
                            {steps.map((step, index) => (
                                <div key={step.id} className="flex gap-3 items-start animate-slide-in" style={{ animationDelay: `${index * 50}ms` }}>
                                    <input
                                        type="text"
                                        placeholder="Beschreibung (z.B. Lackierung)"
                                        value={step.name}
                                        onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                                        className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                                    />
                                    <div className="relative w-32">
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={step.cost}
                                            onChange={(e) => updateStep(step.id, 'cost', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-4 pr-8 py-2 text-slate-200 focus:outline-none focus:border-violet-500 transition-colors text-right"
                                        />
                                        <span className="absolute right-3 top-2 text-slate-500">€</span>
                                    </div>
                                    <button
                                        onClick={() => removeStep(step.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                        title="Entfernen"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={addStep}
                                className="w-full py-3 border-2 border-dashed border-slate-700 rounded-lg text-slate-400 hover:border-violet-500 hover:text-violet-400 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Weiteren Schritt hinzufügen
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
                                <span className="text-slate-400">Produktionskosten (Break-Even)</span>
                                <span className="text-2xl font-mono text-slate-200">{breakEven.toFixed(2)} €</span>
                            </div>

                            <div className="flex justify-between items-end">
                                <span className="text-emerald-400">Gewinnaufschlag</span>
                                <span className="text-xl font-mono text-emerald-400">+{parseFloat(targetProfit || 0).toFixed(2)} €</span>
                            </div>

                            <div className="h-px bg-slate-700 my-4" />

                            <div className="flex justify-between items-end">
                                <span className="text-lg text-violet-300 font-medium">Mindestverkaufspreis</span>
                                <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 font-mono">
                                    {sellPrice.toFixed(2)} €
                                </span>
                            </div>

                            <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">Schnellübersicht</h3>
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
