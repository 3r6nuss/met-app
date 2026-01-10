import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, FileText } from 'lucide-react';

/**
 * Recipe Management Tab Component
 * Extracted from SystemPage for better maintainability
 */
export default function RecipesTab({ inventory = [] }) {
    const [recipes, setRecipes] = useState({});
    const [loadingRecipes, setLoadingRecipes] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [recipeIngredients, setRecipeIngredients] = useState([{ id: '', quantity: 1 }]);

    const fetchRecipes = useCallback(() => {
        setLoadingRecipes(true);
        fetch('/api/recipes')
            .then(res => res.json())
            .then(data => {
                setRecipes(data);
                setLoadingRecipes(false);
            })
            .catch(err => {
                console.error("Failed to fetch recipes:", err);
                setLoadingRecipes(false);
            });
    }, []);

    useEffect(() => {
        fetchRecipes();
    }, [fetchRecipes]);

    const handleAddIngredient = () => {
        setRecipeIngredients([...recipeIngredients, { id: '', quantity: 1 }]);
    };

    const handleRemoveIngredient = (index) => {
        const newIngredients = recipeIngredients.filter((_, i) => i !== index);
        setRecipeIngredients(newIngredients);
    };

    const handleIngredientChange = (index, field, value) => {
        const newIngredients = [...recipeIngredients];
        newIngredients[index][field] = value;
        setRecipeIngredients(newIngredients);
    };

    const handleSaveRecipe = () => {
        if (!selectedProduct) return alert("Bitte Produkt wählen");
        if (recipeIngredients.some(i => !i.id || i.quantity <= 0)) return alert("Bitte gültige Zutaten wählen");

        fetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: parseInt(selectedProduct),
                inputs: recipeIngredients.map(i => ({ id: parseInt(i.id), quantity: parseInt(i.quantity) }))
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    fetchRecipes();
                    setSelectedProduct('');
                    setRecipeIngredients([{ id: '', quantity: 1 }]);
                    alert("Rezept gespeichert!");
                } else {
                    alert("Fehler beim Speichern");
                }
            })
            .catch(_err => alert("Netzwerkfehler"));
    };

    const handleDeleteRecipe = (productId) => {
        if (window.confirm("Rezept wirklich löschen?")) {
            fetch(`/api/recipes/${productId}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) fetchRecipes();
                });
        }
    };

    if (loadingRecipes) {
        return <div className="text-slate-500 italic">Lade Rezepte...</div>;
    }

    return (
        <div className="space-y-8">
            {/* Add Recipe Form */}
            <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700">
                <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-violet-400" />
                    Neues Rezept erstellen / bearbeiten
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Endprodukt</label>
                        <select
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white"
                        >
                            <option value="">Produkt wählen...</option>
                            {Array.isArray(inventory) && inventory.map(item => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 uppercase font-bold block">Zutaten</label>
                        {recipeIngredients.map((ing, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <select
                                    value={ing.id}
                                    onChange={(e) => handleIngredientChange(idx, 'id', e.target.value)}
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white"
                                >
                                    <option value="">Zutat wählen...</option>
                                    {Array.isArray(inventory) && inventory.map(item => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    value={ing.quantity}
                                    onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                                    className="w-20 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white"
                                    min="1"
                                />
                                <button onClick={() => handleRemoveIngredient(idx)} className="text-red-400 hover:text-red-300 p-2">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button onClick={handleAddIngredient} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-2">
                            <Plus className="w-3 h-3" /> Zutat hinzufügen
                        </button>
                    </div>

                    <button
                        onClick={handleSaveRecipe}
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2 rounded font-semibold transition-colors"
                    >
                        Rezept speichern
                    </button>
                </div>
            </div>

            {/* Existing Recipes List */}
            <div>
                <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    Vorhandene Rezepte
                </h3>
                <div className="grid grid-cols-1 gap-3">
                    {recipes && Object.entries(recipes).map(([productId, recipe]) => {
                        const product = Array.isArray(inventory) ? inventory.find(i => i.id === parseInt(productId)) : null;
                        if (!product) return null;

                        return (
                            <div key={productId} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-white mb-2">{product.name}</div>
                                    <div className="space-y-1">
                                        {recipe.inputs.map((input, idx) => {
                                            const ingredient = Array.isArray(inventory) ? inventory.find(i => i.id === input.id) : null;
                                            return (
                                                <div key={idx} className="text-sm text-slate-400 flex items-center gap-2">
                                                    <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                                                    {input.quantity}x {ingredient ? ingredient.name : 'Unknown'}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedProduct(productId);
                                            setRecipeIngredients(recipe.inputs.map(i => ({ id: i.id, quantity: i.quantity })));
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="text-slate-500 hover:text-violet-400 p-2"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteRecipe(productId)}
                                        className="text-slate-500 hover:text-red-400 p-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {Object.keys(recipes).length === 0 && (
                        <div className="text-center text-slate-500 py-4">Keine Rezepte gefunden.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
