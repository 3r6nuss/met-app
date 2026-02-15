import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Trash2, UserPlus, FileText, ArrowUpRight, ArrowDownLeft, ShieldAlert, Edit2, X, Users, Plus, Circle, Eye, EyeOff } from 'lucide-react';
import UserManagement from '../components/UserManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SystemPage({ employees = [], onUpdateEmployees, logs = [], onDeleteLog, onReset, user, inventory = [] }) {
    console.log("SystemPage Mounted", { employees, logs, user, inventory });
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [activeTab, setActiveTab] = useState('employees'); // 'employees', 'system', 'logs', 'recipes'
    const [recipes, setRecipes] = useState({});
    const [_loadingRecipes, setLoadingRecipes] = useState(false);

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
            .catch(_err => alert("Netzwerkfehler"));
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
            const current = typeof updatedEmployees[index] === 'string'
                ? { name: updatedEmployees[index], status: 'active' }
                : updatedEmployees[index];

            updatedEmployees[index] = { ...current, name: editName.trim() };
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
            const updatedEmployees = [...employees, { name: newEmployeeName.trim(), status: 'active' }];
            onUpdateEmployees(updatedEmployees);
            setNewEmployeeName('');
        }
    };

    // handleDeleteEmployee replaced by inline fire logic

    const [backups, setBackups] = useState([]);
    const [loadingBackups, setLoadingBackups] = useState(false);

    const fetchBackups = () => {
        setLoadingBackups(true);
        fetch('/api/admin/backups')
            .then(res => res.json())
            .then(data => {
                setBackups(data.backups || []);
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
        const promise = fetch('/api/admin/backup', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    fetchBackups(); // Refresh list
                    return data;
                } else {
                    throw new Error(data.error || "Unbekannter Fehler");
                }
            });

        toast.promise(promise, {
            loading: 'Erstelle Backup...',
            success: 'Backup erfolgreich erstellt!',
            error: (err) => `Backup fehlgeschlagen: ${err.message}`
        });
    };



    const handleDeleteBackup = (filename) => {
        if (window.confirm(`Backup "${filename}" wirklich löschen?`)) {
            const promise = fetch(`/api/admin/backups/${filename}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        fetchBackups();
                        return data;
                    } else {
                        throw new Error(data.error || "Unbekannter Fehler");
                    }
                });

            toast.promise(promise, {
                loading: 'Lösche Backup...',
                success: 'Backup gelöscht',
                error: (err) => `Fehler beim Löschen: ${err.message}`
            });
        }
    };

    const handleResetDatabase = () => {
        if (window.confirm("ACHTUNG: Dies löscht die GESAMTE Datenbank! Wirklich fortfahren?")) {
            onReset();
        }
    };

    return (
        <div className="animate-fade-in max-w-6xl mx-auto pb-24 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400">
                        Systemverwaltung
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Verwaltung von Mitarbeitern, Benutzern, Rezepten und Systemeinstellungen
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto mb-6 bg-slate-900 border border-slate-800">
                    <TabsTrigger value="employees" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg">Mitarbeiter</TabsTrigger>
                    {isAdmin && <TabsTrigger value="users">Benutzer</TabsTrigger>}
                    {isAdmin && <TabsTrigger value="recipes">Rezepte</TabsTrigger>}
                    {(isAdmin || user?.role === 'Buchhaltung') && <TabsTrigger value="protokoll">Zuordnung</TabsTrigger>}
                    {(isAdmin || user?.role === 'Buchhaltung') && <TabsTrigger value="priorities">Prioritäten</TabsTrigger>}
                    {isAdmin && <TabsTrigger value="system">System</TabsTrigger>}
                    {isAdmin && <TabsTrigger value="logs">Logs</TabsTrigger>}
                </TabsList>

                <TabsContent value="employees">
                    <Card className="border-slate-800 bg-slate-900/50">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Users className="w-5 h-5 text-violet-400" />
                                Mitarbeiter verwalten
                            </CardTitle>
                            <CardDescription>
                                Verwalte die Liste aller Mitarbeiter und deren Status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-2">
                                <Input
                                    value={newEmployeeName}
                                    onChange={(e) => setNewEmployeeName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddEmployee()}
                                    placeholder="Neuer Mitarbeiter Name..."
                                    className="bg-slate-950 border-slate-700"
                                />
                                <Button onClick={handleAddEmployee} className="bg-violet-600 hover:bg-violet-700">
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Hinzufügen
                                </Button>
                            </div>

                            <ScrollArea className="h-[500px] w-full pr-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Array.isArray(employees) && employees.map((empData, idx) => {
                                        const emp = typeof empData === 'string' ? { name: empData, status: 'active' } : empData;
                                        const isFired = emp.status === 'fired';

                                        return (
                                            <div key={idx} className={cn(
                                                "flex flex-col p-3 rounded-lg border transition-all",
                                                isFired ? "bg-red-950/20 border-red-900/30" : "bg-slate-950/50 border-slate-800 hover:border-violet-500/30"
                                            )}>
                                                {editingIndex === idx ? (
                                                    <div className="flex gap-2 items-center h-full">
                                                        <Input
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="h-8"
                                                            autoFocus
                                                        />
                                                        <Button size="icon" variant="ghost" onClick={() => saveEdit(idx)} className="h-8 w-8 text-emerald-400 hover:text-emerald-300"><Save className="w-4 h-4" /></Button>
                                                        <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8 text-slate-400 hover:text-slate-300"><X className="w-4 h-4" /></Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="font-semibold text-slate-200 truncate pr-2" title={emp.name}>
                                                                {emp.name}
                                                            </div>
                                                            {isFired && <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Gefeuert</Badge>}
                                                        </div>
                                                        <div className="mt-auto flex justify-end gap-1">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => startEdit(idx, emp.name)}
                                                                className="h-7 w-7 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </Button>

                                                            {isFired ? (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        if (window.confirm(`Mitarbeiter "${emp.name}" wieder einstellen?`)) {
                                                                            const updated = [...employees];
                                                                            const current = typeof updated[idx] === 'string' ? { name: updated[idx], status: 'active' } : updated[idx];
                                                                            updated[idx] = { ...current, status: 'active' };
                                                                            onUpdateEmployees(updated);
                                                                            toast.success("Mitarbeiter wieder eingestellt");
                                                                        }
                                                                    }}
                                                                    className="h-7 w-7 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                                                >
                                                                    <UserPlus className="w-3.5 h-3.5" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        if (window.confirm(`Mitarbeiter "${emp.name}" wirklich feuern?`)) {
                                                                            const updated = [...employees];
                                                                            const current = typeof updated[idx] === 'string' ? { name: updated[idx], status: 'active' } : updated[idx];
                                                                            updated[idx] = { ...current, status: 'fired' };
                                                                            onUpdateEmployees(updated);
                                                                            toast.success("Mitarbeiter gefeuert");
                                                                        }
                                                                    }}
                                                                    className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {(!employees || employees.length === 0) && (
                                        <div className="text-slate-500 italic col-span-full text-center py-8">Keine Mitarbeiter angelegt.</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {isAdmin && (
                    <TabsContent value="users">
                        <UserManagement employees={employees} />
                    </TabsContent>
                )}

                {/* Placeholders for other tabs - will be replaced in next steps */}
                {isAdmin && <TabsContent value="recipes">
                    <div className="space-y-6">
                        <Card className="border-slate-800 bg-slate-900/50">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-violet-400" />
                                    Neues Rezept erstellen / bearbeiten
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Endprodukt</label>
                                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                        <SelectTrigger className="w-full bg-slate-950 border-slate-700">
                                            <SelectValue placeholder="Produkt wählen..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-950 border-slate-800">
                                            {Array.isArray(inventory) && inventory.map(item => (
                                                <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-slate-400 uppercase font-bold block">Zutaten</label>
                                    {recipeIngredients.map((ing, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <Select value={String(ing.id)} onValueChange={(val) => handleIngredientChange(idx, 'id', val)}>
                                                <SelectTrigger className="flex-1 bg-slate-950 border-slate-700">
                                                    <SelectValue placeholder="Zutat wählen..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-950 border-slate-800">
                                                    {Array.isArray(inventory) && inventory.map(item => (
                                                        <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="number"
                                                value={ing.quantity}
                                                onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                                                className="w-24 bg-slate-950 border-slate-700"
                                                min="1"
                                            />
                                            <Button size="icon" variant="ghost" onClick={() => handleRemoveIngredient(idx)} className="h-10 w-10 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="ghost" size="sm" onClick={handleAddIngredient} className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10">
                                        <Plus className="w-3 h-3 mr-2" /> Zutat hinzufügen
                                    </Button>
                                </div>

                                <Button onClick={handleSaveRecipe} className="w-full bg-violet-600 hover:bg-violet-700">
                                    Rezept speichern
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-800 bg-slate-900/50">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-emerald-400" />
                                    Vorhandene Rezepte
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {recipes && Object.entries(recipes).map(([productId, recipe]) => {
                                        const product = Array.isArray(inventory) ? inventory.find(i => i.id === parseInt(productId)) : null;
                                        if (!product) return null;

                                        return (
                                            <div key={productId} className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 flex justify-between items-start transition-all hover:border-violet-500/30">
                                                <div>
                                                    <div className="font-bold text-white mb-2">{product.name}</div>
                                                    <div className="space-y-1">
                                                        {recipe.inputs.map((input, idx) => {
                                                            const ingredient = Array.isArray(inventory) ? inventory.find(i => i.id === input.id) : null;
                                                            return (
                                                                <div key={idx} className="text-sm text-slate-400 flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 bg-slate-600 rounded-full"></div>
                                                                    {input.quantity}x {ingredient ? ingredient.name : 'Unknown'}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" onClick={() => {
                                                        setSelectedProduct(productId);
                                                        setRecipeIngredients(recipe.inputs.map(i => ({ id: i.id, quantity: i.quantity })));
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }} className="h-8 w-8 text-slate-500 hover:text-violet-400">
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteRecipe(productId)} className="h-8 w-8 text-slate-500 hover:text-red-400">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {Object.keys(recipes).length === 0 && (
                                        <div className="text-center text-slate-500 py-8 col-span-full">Keine Rezepte gefunden.</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>}
                {(isAdmin || user?.role === 'Buchhaltung') && <TabsContent value="protokoll">
                    <Card className="border-slate-800 bg-slate-900/50">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Eye className="w-5 h-5 text-violet-400" />
                                Protokoll-Zuordnung
                            </CardTitle>
                            <CardDescription>
                                Steuere, welche Mitarbeiter in Protokollen angezeigt werden und unter welchem Namen.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="grid grid-cols-[1fr_80px_200px] gap-4 px-4 py-2 text-xs text-slate-400 uppercase font-bold border-b border-slate-700">
                                    <span>Mitarbeiter</span>
                                    <span className="text-center">Sichtbar</span>
                                    <span>Protokoll-Name</span>
                                </div>
                                <ScrollArea className="h-[600px] pr-4">
                                    <div className="space-y-2">
                                        {Array.isArray(employees) && employees.map((empData, idx) => {
                                            const emp = typeof empData === 'string' ? { name: empData, status: 'active', visible_in_protocol: 1, protocol_name: null } : empData;
                                            const isFired = emp.status === 'fired';
                                            const isVisible = emp.visible_in_protocol === 1 || emp.visible_in_protocol === true;

                                            // Get all unique protocol names for dropdown
                                            const existingProtocolNames = [...new Set(
                                                employees
                                                    .map(e => typeof e === 'object' ? e.protocol_name : null)
                                                    .filter(n => n && n.trim())
                                            )];

                                            return (
                                                <div key={idx} className={cn(
                                                    "grid grid-cols-[1fr_80px_200px] gap-4 px-4 py-3 rounded-lg border transition-colors items-center",
                                                    isFired ? "bg-red-950/20 border-red-900/30 opacity-50" : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                                                )}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("font-medium", isFired ? "text-red-400 line-through" : "text-slate-200")}>
                                                            {emp.name}
                                                        </span>
                                                        {isFired && <Badge variant="destructive" className="text-[10px] h-5 px-1">Gefeuert</Badge>}
                                                    </div>
                                                    <div className="flex justify-center">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                const updated = [...employees];
                                                                const current = typeof updated[idx] === 'string' ? { name: updated[idx], status: 'active', visible_in_protocol: 1, protocol_name: null } : updated[idx];
                                                                updated[idx] = { ...current, visible_in_protocol: isVisible ? 0 : 1 };
                                                                onUpdateEmployees(updated);
                                                            }}
                                                            className={cn("h-8 w-8", isVisible ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20" : "text-slate-500 hover:bg-slate-800")}
                                                            title={isVisible ? 'Sichtbar - Klicken zum Ausblenden' : 'Ausgeblendet - Klicken zum Einblenden'}
                                                        >
                                                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Select
                                                            value={emp.protocol_name || "custom"}
                                                            onValueChange={(val) => {
                                                                const updated = [...employees];
                                                                const current = typeof updated[idx] === 'string' ? { name: updated[idx], status: 'active', visible_in_protocol: 1, protocol_name: null } : updated[idx];
                                                                updated[idx] = { ...current, protocol_name: val === "custom" ? null : val };
                                                                onUpdateEmployees(updated);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-7 text-xs bg-slate-900 border-slate-700">
                                                                <SelectValue placeholder="— Eigener Name —" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="custom">— Eigener Name —</SelectItem>
                                                                {existingProtocolNames.map(name => (
                                                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>

                                                        {(!emp.protocol_name || !existingProtocolNames.includes(emp.protocol_name)) && (
                                                            <Input
                                                                placeholder="Neuer Name..."
                                                                className="h-7 text-xs bg-slate-900 border-slate-700"
                                                                onKeyPress={(e) => {
                                                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                                                        const updated = [...employees];
                                                                        const current = typeof updated[idx] === 'string' ? { name: updated[idx], status: 'active', visible_in_protocol: 1, protocol_name: null } : updated[idx];
                                                                        updated[idx] = { ...current, protocol_name: e.target.value.trim() };
                                                                        onUpdateEmployees(updated);
                                                                        e.target.value = '';
                                                                    }
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!employees || employees.length === 0) && (
                                            <div className="text-slate-500 italic text-center py-4">Keine Mitarbeiter angelegt.</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>}
                {(isAdmin || user?.role === 'Buchhaltung') && <TabsContent value="priorities">
                    <Card className="border-slate-800 bg-slate-900/50">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <ArrowUpRight className="w-5 h-5 text-amber-400" />
                                Prioritäten verwalten
                            </CardTitle>
                            <CardDescription>
                                Lege die Priorität für Lagerartikel fest. Die Farben werden im Inventar angezeigt.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-2">
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
                                            <div key={item.id} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 flex justify-between items-center hover:border-slate-700 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <Circle
                                                        className={cn("w-4 h-4",
                                                            item.priority === 'high' ? 'text-red-500 fill-red-500' :
                                                                item.priority === 'medium' ? 'text-orange-500 fill-orange-500' :
                                                                    item.priority === 'low' ? 'text-green-500 fill-green-500' :
                                                                        'text-slate-600'
                                                        )}
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-200 font-medium">{item.name}</span>
                                                        {percentage !== null && (
                                                            <span className={cn("text-xs font-semibold", percentageColor)}>
                                                                ({percentage}%)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant={item.priority === 'high' ? "destructive" : "outline"}
                                                        onClick={() => {
                                                            fetch(`/api/inventory/${item.id}/priority`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ priority: 'high' })
                                                            });
                                                        }}
                                                        className={cn("h-7 px-2 text-xs", item.priority === 'high' ? "" : "border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300")}
                                                    >
                                                        Rot
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={item.priority === 'medium' ? "default" : "outline"}
                                                        onClick={() => {
                                                            fetch(`/api/inventory/${item.id}/priority`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ priority: 'medium' })
                                                            });
                                                        }}
                                                        className={cn("h-7 px-2 text-xs", item.priority === 'medium' ? "bg-orange-600 hover:bg-orange-700 text-white" : "border-orange-900/50 text-orange-400 hover:bg-orange-950/30 hover:text-orange-300")}
                                                    >
                                                        Orange
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={item.priority === 'low' ? "default" : "outline"}
                                                        onClick={() => {
                                                            fetch(`/api/inventory/${item.id}/priority`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ priority: 'low' })
                                                            });
                                                        }}
                                                        className={cn("h-7 px-2 text-xs", item.priority === 'low' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-900/50 text-emerald-400 hover:bg-emerald-950/30 hover:text-emerald-300")}
                                                    >
                                                        Grün
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            fetch(`/api/inventory/${item.id}/priority`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ priority: null })
                                                            });
                                                        }}
                                                        className="h-7 px-2 text-xs text-slate-500 hover:text-slate-300"
                                                    >
                                                        Keine
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>}
                {isAdmin && <TabsContent value="system">
                    <div className="space-y-6">
                        {(user?.discordId === '823276402320998450' || user?.discordId === '690510884639866960') && (
                            <Card className="border-violet-500/30 bg-violet-600/5">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2 text-violet-400">
                                        <ShieldAlert className="w-5 h-5" />
                                        Admin Zone
                                    </CardTitle>
                                    <CardDescription className="text-violet-300/70">
                                        Erzwingt ein Neuladen bei ALLEN verbundenen Nutzern. Nur im Notfall nutzen!
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            if (confirm("Wirklich bei ALLEN Nutzern ein Neuladen erzwingen?")) {
                                                fetch('/api/trigger-reload', { method: 'POST' })
                                                    .then(res => res.json())
                                                    .then(data => {
                                                        if (data.success) toast.success("Reload Signal gesendet!");
                                                    });
                                            }
                                        }}
                                        className="w-full bg-violet-600 hover:bg-violet-700"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Force Global Reload
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-slate-800 bg-slate-900/50">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Save className="w-5 h-5 text-blue-400" />
                                        Datenbank & Backup
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={handleBackup}
                                        className="h-auto py-4 flex flex-col items-start gap-1 border-blue-900/40 hover:bg-blue-950/20 hover:border-blue-700/50 group"
                                    >
                                        <div className="flex items-center gap-2 font-bold text-blue-400">
                                            <Save className="w-4 h-4" /> Backup erstellen
                                        </div>
                                        <div className="text-xs text-slate-500">Sichert die aktuelle Datenbank</div>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={handleResetDatabase}
                                        className="h-auto py-4 flex flex-col items-start gap-1 border-red-900/40 hover:bg-red-950/20 hover:border-red-700/50 group"
                                    >
                                        <div className="flex items-center gap-2 font-bold text-red-400">
                                            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" /> System Reset
                                        </div>
                                        <div className="text-xs text-slate-500">Löscht ALLE Daten (Vorsicht!)</div>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (confirm("Möchtest du wirklich die Standard-Personalliste laden? Dies überschreibt aktuelle Daten!")) {
                                                fetch('/api/system/seed-personnel', { method: 'POST' })
                                                    .then(res => res.json())
                                                    .then(data => {
                                                        if (data.success) toast.success(`Erfolgreich geladen! ${data.count} Mitarbeiter hinzugefügt.`);
                                                        else toast.error("Fehler: " + data.error);
                                                    });
                                            }
                                        }}
                                        className="h-auto py-4 flex flex-col items-start gap-1 border-fuchsia-900/40 hover:bg-fuchsia-950/20 hover:border-fuchsia-700/50 group"
                                    >
                                        <div className="flex items-center gap-2 font-bold text-fuchsia-400">
                                            <Users className="w-4 h-4" /> Standard Personal laden
                                        </div>
                                        <div className="text-xs text-slate-500">Lädt die Standardliste neu</div>
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-800 bg-slate-900/50">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-emerald-400" />
                                        Verfügbare Backups
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {loadingBackups ? (
                                        <div className="flex items-center justify-center p-8 text-slate-500 italic">
                                            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Lade Backups...
                                        </div>
                                    ) : (
                                        <ScrollArea className="h-[300px] w-full pr-4">
                                            <div className="space-y-2">
                                                {backups.map((backup) => (
                                                    <div key={backup.filename} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 flex justify-between items-center hover:border-slate-700 transition-colors">
                                                        <div className="text-slate-200 font-medium text-sm truncate mr-2" title={backup.filename}>{backup.filename}</div>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteBackup(backup.filename)}
                                                            className="h-8 w-8 text-slate-500 hover:text-red-400"
                                                            title="Löschen"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {backups.length === 0 && (
                                                    <div className="text-center text-slate-500 py-4">Keine Backups gefunden.</div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>}
                {isAdmin && <TabsContent value="logs">
                    <Card className="border-slate-800 bg-slate-900/50">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <FileText className="w-5 h-5 text-slate-400" />
                                Letzte System-Logs ({logs.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-2">
                                    {logs.map((log, idx) => (
                                        <div key={idx} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm hover:border-slate-700 transition-colors group">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs text-slate-500 font-mono">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => onDeleteLog(log.timestamp)}
                                                    className="h-6 w-6 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Eintrag löschen"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
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
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>}
            </Tabs>
        </div>
    );
}
