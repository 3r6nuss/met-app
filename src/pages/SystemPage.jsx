import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Trash2, UserPlus, FileText, ArrowUpRight, ArrowDownLeft, ShieldAlert, Edit2, X, Users, Plus, Circle, Download } from 'lucide-react';
import UserManagement from '../components/UserManagement';

export default function SystemPage({ employees = [], onUpdateEmployees, logs = [], onDeleteLog, onReset, user, inventory = [] }) {
    console.log("SystemPage Mounted", { employees, logs, user, inventory });
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [activeTab, setActiveTab] = useState('employees'); // 'employees', 'system', 'logs', 'recipes'
    const [recipes, setRecipes] = useState({});
    const [loadingRecipes, setLoadingRecipes] = useState(false);

    // Recipe Form State
    const [selectedProduct, setSelectedProduct] = useState('');
    const [recipeIngredients, setRecipeIngredients] = useState([{ id: '', quantity: 1 }]);

    const fetchRecipes = () => {
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
    };

    useEffect(() => {
        if (activeTab === 'recipes') {
            fetchRecipes();
        }
    }, [activeTab]);

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
            .catch(err => alert("Netzwerkfehler"));
    };

    const handleDeleteRecipe = (productId) => {
        if (confirm("Rezept wirklich löschen?")) {
            fetch(`/api/recipes/${productId}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) fetchRecipes();
                });
        }
    };

    const isAdmin = user?.role === 'Administrator';

    const [editingIndex, setEditingIndex] = useState(null);
    const [editName, setEditName] = useState('');

    const startEdit = (index, currentName) => {
        setEditingIndex(index);
        setEditName(currentName);
    };

    const saveEdit = (index) => {
        if (editName.trim()) {
            const updatedEmployees = [...employees];
            updatedEmployees[index] = editName.trim();
            onUpdateEmployees(updatedEmployees);
            setEditingIndex(null);
        }
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditName('');
    };

    const handleAddEmployee = () => {
        if (newEmployeeName.trim()) {
            const updatedEmployees = [...employees, newEmployeeName.trim()];
            onUpdateEmployees(updatedEmployees);
            setNewEmployeeName('');
        }
    };

    const handleDeleteEmployee = (index) => {
        if (window.confirm(`Mitarbeiter "${employees[index]}" wirklich löschen?`)) {
            const updatedEmployees = employees.filter((_, i) => i !== index);
            onUpdateEmployees(updatedEmployees);
        }
    };

    const [backups, setBackups] = useState([]);
    const [loadingBackups, setLoadingBackups] = useState(false);

    const fetchBackups = () => {
        setLoadingBackups(true);
        fetch('/api/backups')
            .then(res => res.json())
            .then(data => {
                setBackups(data);
                setLoadingBackups(false);
            })
            .catch(err => {
                console.error("Failed to fetch backups:", err);
                setLoadingBackups(false);
            });
    };

    useEffect(() => {
        if (activeTab === 'system') {
            fetchBackups();
        }
    }, [activeTab]);

    const handleBackup = () => {
        fetch('/api/backup', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert("Backup erfolgreich erstellt!");
                    fetchBackups(); // Refresh list
                }
                else alert("Backup fehlgeschlagen: " + (data.error || "Unbekannter Fehler"));
            })
            .catch(err => alert("Netzwerkfehler: " + err));
    };

    const handleRestoreBackup = (filename) => {
        if (window.confirm(`WARNUNG: Möchtest du wirklich das Backup "${filename}" wiederherstellen? \n\nALLE aktuellen Daten gehen verloren und werden durch das Backup ersetzt!`)) {
            fetch('/api/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert("Wiederherstellung erfolgreich! Die Seite wird neu geladen.");
                        window.location.reload();
                    } else {
                        alert("Fehler bei Wiederherstellung: " + (data.error || "Unbekannter Fehler"));
                    }
                })
                .catch(err => alert("Netzwerkfehler: " + err));
        }
    };

    const handleDeleteBackup = (filename) => {
        if (window.confirm(`Backup "${filename}" wirklich löschen?`)) {
            fetch(`/api/backups/${filename}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) fetchBackups();
                    else alert("Fehler beim Löschen: " + (data.error || "Unbekannter Fehler"));
                })
                .catch(err => alert("Netzwerkfehler: " + err));
        }
    };

    const handleResetDatabase = () => {
        if (window.confirm("ACHTUNG: Dies löscht die GESAMTE Datenbank! Wirklich fortfahren?")) {
            onReset();
        }
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="bg-blue-500 text-white p-2 mb-4 rounded text-center text-xs font-mono">DEBUG: SystemPage Loaded</div>
            <h2 className="text-2xl font-bold mb-6 text-slate-200 flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-violet-400" />
                Systemverwaltung
            </h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-700 pb-1">
                <button
                    onClick={() => setActiveTab('employees')}
                    className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'employees' ? 'bg-slate-800 text-violet-400 border-t border-x border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Mitarbeiter
                </button>
                {isAdmin && (
                    <>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'users' ? 'bg-slate-800 text-violet-400 border-t border-x border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Benutzer
                        </button>
                        <button
                            onClick={() => setActiveTab('recipes')}
                            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'recipes' ? 'bg-slate-800 text-violet-400 border-t border-x border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Rezepte
                        </button>
                    </>
                )}
                {(isAdmin || user?.role === 'Buchhaltung') && (
                    <button
                        onClick={() => setActiveTab('priorities')}
                        className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'priorities' ? 'bg-slate-800 text-violet-400 border-t border-x border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Prioritäten
                    </button>
                )}
                {isAdmin && (
                    <>
                        <button
                            onClick={() => setActiveTab('system')}
                            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'system' ? 'bg-slate-800 text-violet-400 border-t border-x border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            System & Backup
                        </button>
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'logs' ? 'bg-slate-800 text-violet-400 border-t border-x border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Logs
                        </button>
                    </>
                )}
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
                {/* Employee Management */}
                {activeTab === 'employees' && (
                    <div>
                        <h3 className="text-lg font-bold text-slate-300 mb-4">Mitarbeiter verwalten</h3>
                        <div className="flex gap-2 mb-6">
                            <input
                                type="text"
                                value={newEmployeeName}
                                onChange={(e) => setNewEmployeeName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddEmployee()}
                                placeholder="Neuer Mitarbeiter Name..."
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-violet-500"
                            />
                            <button
                                onClick={handleAddEmployee}
                                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <UserPlus className="w-4 h-4" />
                                Hinzufügen
                            </button>
                        </div>



                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Array.isArray(employees) && employees.map((emp, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-800/50 px-4 py-3 rounded-lg border border-slate-700/50">
                                    {editingIndex === idx ? (
                                        <div className="flex gap-2 flex-1 mr-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                                                autoFocus
                                            />
                                            <button onClick={() => saveEdit(idx)} className="text-emerald-400 hover:text-emerald-300"><Save className="w-4 h-4" /></button>
                                            <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-300"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-slate-300">{emp}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => startEdit(idx, emp)}
                                                    className="text-slate-500 hover:text-violet-400 p-2 transition-colors"
                                                    title="Umbenennen"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEmployee(idx)}
                                                    className="text-slate-500 hover:text-red-400 p-2 transition-colors"
                                                    title="Löschen"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {(!employees || employees.length === 0) && (
                                <div className="text-slate-500 italic col-span-2 text-center py-4">Keine Mitarbeiter angelegt.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* User Management (Admin Only) */}
                {activeTab === 'users' && isAdmin && (
                    <UserManagement employees={employees} />
                )}

                {/* Recipe Management */}
                {activeTab === 'recipes' && isAdmin && (
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
                )}


                {/* Priority Management (Buchhaltung/Admin Only) */}
                {activeTab === 'priorities' && (isAdmin || user?.role === 'Buchhaltung') && (
                    <div>
                        <h3 className="text-lg font-bold text-slate-300 mb-4">Prioritäten verwalten</h3>
                        <p className="text-slate-400 text-sm mb-6">Lege die Priorität für Lagerartikel fest. Die Farben werden im Inventar angezeigt.</p>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                            {inventory.map((item) => {
                                const percentage = item.target && item.target > 0
                                    ? Math.round((item.current / item.target) * 100)
                                    : null;
                                const percentageColor =
                                    percentage === null ? 'text-slate-500' :
                                        percentage < 20 ? 'text-red-400' :
                                            percentage < 100 ? 'text-amber-400' :
                                                'text-emerald-400';

                                return (
                                    <div key={item.id} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 flex justify-between items-center hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Circle
                                                className={`w-5 h-5 ${item.priority === 'high' ? 'text-red-500 fill-red-500' :
                                                    item.priority === 'medium' ? 'text-orange-500 fill-orange-500' :
                                                        item.priority === 'low' ? 'text-green-500 fill-green-500' :
                                                            'text-slate-600'
                                                    }`}
                                            />
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-200 font-medium">{item.name}</span>
                                                {percentage !== null && (
                                                    <span className={`text-xs font-semibold ${percentageColor}`}>
                                                        ({percentage}%)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    fetch(`/api/inventory/${item.id}/priority`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ priority: 'high' })
                                                    });
                                                }}
                                                className={`px-3 py-1 rounded text-xs transition-colors ${item.priority === 'high'
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                                                    }`}
                                            >
                                                Rot
                                            </button>
                                            <button
                                                onClick={() => {
                                                    fetch(`/api/inventory/${item.id}/priority`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ priority: 'medium' })
                                                    });
                                                }}
                                                className={`px-3 py-1 rounded text-xs transition-colors ${item.priority === 'medium'
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/30'
                                                    }`}
                                            >
                                                Orange
                                            </button>
                                            <button
                                                onClick={() => {
                                                    fetch(`/api/inventory/${item.id}/priority`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ priority: 'low' })
                                                    });
                                                }}
                                                className={`px-3 py-1 rounded text-xs transition-colors ${item.priority === 'low'
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                                    }`}
                                            >
                                                Grün
                                            </button>
                                            <button
                                                onClick={() => {
                                                    fetch(`/api/inventory/${item.id}/priority`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ priority: null })
                                                    });
                                                }}
                                                className="px-3 py-1 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                                            >
                                                Keine
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* System Actions (Admin Only) */}
                {
                    activeTab === 'system' && isAdmin && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-300 mb-4">Datenbank & Backup</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    <button
                                        onClick={handleBackup}
                                        className="flex items-center justify-center gap-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/50 p-6 rounded-xl transition-all group"
                                    >
                                        <Save className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                        <div className="text-left">
                                            <div className="font-bold">Backup erstellen</div>
                                            <div className="text-xs opacity-70">Sichert die aktuelle Datenbank</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={handleResetDatabase}
                                        className="flex items-center justify-center gap-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 p-6 rounded-xl transition-all group"
                                    >
                                        <RefreshCw className="w-8 h-8 group-hover:rotate-180 transition-transform duration-500" />
                                        <div className="text-left">
                                            <div className="font-bold">System Reset</div>
                                            <div className="text-xs opacity-70">Löscht ALLE Daten (Vorsicht!)</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (confirm("Möchtest du wirklich die Standard-Personalliste laden? Dies überschreibt aktuelle Daten!")) {
                                                fetch('/api/system/seed-personnel', { method: 'POST' })
                                                    .then(res => res.json())
                                                    .then(data => {
                                                        if (data.success) alert(`Erfolgreich geladen! ${data.count} Mitarbeiter hinzugefügt.`);
                                                        else alert("Fehler: " + data.error);
                                                    });
                                            }
                                        }}
                                        className="flex items-center justify-center gap-3 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 text-fuchsia-400 border border-fuchsia-600/50 p-6 rounded-xl transition-all group"
                                    >
                                        <Users className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                        <div className="text-left">
                                            <div className="font-bold">Standard Personal laden</div>
                                            <div className="text-xs opacity-70">Lädt die Standardliste neu</div>
                                        </div>
                                    </button>
                                </div>

                                <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-emerald-400" />
                                    Verfügbare Backups
                                </h3>

                                {loadingBackups ? (
                                    <div className="text-slate-500 italic">Lade Backups...</div>
                                ) : (
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                        {backups.map((backup) => (
                                            <div key={backup.name} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 flex justify-between items-center hover:bg-slate-800/50 transition-colors">
                                                <div>
                                                    <button
                                                        onClick={() => handleDeleteBackup(backup.name)}
                                                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                                        title="Löschen"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {backups.length === 0 && (
                                            <div className="text-center text-slate-500 py-4">Keine Backups gefunden.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* Log Management (Admin Only) */}
                {
                    activeTab === 'logs' && isAdmin && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Letzte System-Logs ({logs.length})
                                </h3>
                                <button
                                    onClick={() => {
                                        if (!logs || logs.length === 0) {
                                            alert('Keine Logs zum Exportieren vorhanden.');
                                            return;
                                        }

                                        const headers = ['Zeitstempel', 'Menge', 'Produkt', 'Einlagerer', 'Geld', 'Aktion', 'Kategorie'];
                                        const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

                                        const rows = logs.map(log => [
                                            new Date(log.timestamp).toLocaleString('de-DE'),
                                            log.quantity,
                                            escape(log.itemName),
                                            escape(log.depositor),
                                            log.price,
                                            escape(log.type === 'in' ? 'Einlagerung' : 'Auslagerung'),
                                            escape(log.category)
                                        ]);

                                        const csvContent = [
                                            headers.join(';'),
                                            ...rows.map(r => r.join(';'))
                                        ].join('\n');

                                        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                                        const link = document.createElement('a');
                                        const url = URL.createObjectURL(blob);
                                        link.setAttribute('href', url);
                                        link.setAttribute('download', `system_logs_${new Date().toISOString().slice(0, 10)}.csv`);
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-sm"
                                >
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </button>
                            </div>
                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                                {logs.map((log, idx) => (
                                    <div key={idx} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 text-sm hover:bg-slate-800/50 transition-colors group">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs text-slate-500">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                            <button
                                                onClick={() => onDeleteLog(log.timestamp)}
                                                className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Eintrag löschen"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {log.type === 'in' ? (
                                                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <ArrowUpRight className="w-4 h-4 text-amber-400" />
                                            )}
                                            <span className="font-medium text-slate-200">
                                                {log.quantity}x {log.itemName}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400">{log.depositor}</span>
                                            <span className="text-slate-500 font-mono">
                                                ${(log.price || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {logs.length === 0 && (
                                    <div className="text-center text-slate-500 py-8">Keine Logs vorhanden.</div>
                                )}
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
}
