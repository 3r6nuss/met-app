import React, { useState } from 'react';
import InventoryList from '../components/InventoryList';
import InventoryTable from '../components/InventoryTable';
import VerificationSection from '../components/VerificationSection';
import OrderList from '../components/OrderList';
import { ClipboardList, LayoutGrid, Table as TableIcon, Search, Filter } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function InventoryPage({ inventory, onUpdateStock, onUpdateTarget, onReorder, onVerify, user, orders, onUpdateOrderStatus, onDeleteOrder }) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

    const isAuthorized = user?.role === 'Buchhaltung' || user?.role === 'Administrator';

    // Get unique categories
    const categories = ['all', ...new Set(inventory.map(item => item.category || 'Uncategorized'))];

    // Filter inventory
    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || (item.category || 'Uncategorized') === filterCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="animate-fade-in pb-24 space-y-8">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400">
                        Lagerbestand
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Verwaltung und Übersicht der aktuellen Bestände
                    </p>
                </div>
            </div>

            {/* Orders Section */}
            {orders && orders.length > 0 && (
                <Card className="border-amber-500/20 bg-amber-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-amber-100 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-amber-400" />
                            Offene Aufträge
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <OrderList
                            orders={orders}
                            onUpdateStatus={onUpdateOrderStatus}
                            onDelete={onDeleteOrder}
                            user={user}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-slate-950/50 border-slate-800 focus:border-violet-500 transition-all font-medium"
                        />
                    </div>

                    {/* Category Filter */}
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[180px] bg-slate-950/50 border-slate-800">
                            <Filter className="w-4 h-4 mr-2 text-slate-500" />
                            <SelectValue placeholder="Kategorie" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle Kategorien</SelectItem>
                            {categories.filter(c => c !== 'all').map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/50 p-1 rounded-lg border border-slate-800">
                    <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className={viewMode === 'grid' ? 'bg-violet-600 text-white hover:bg-violet-700' : 'text-slate-400 hover:text-white'}
                    >
                        <LayoutGrid className="w-4 h-4 mr-2" /> Raster
                    </Button>
                    <Button
                        variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className={viewMode === 'table' ? 'bg-violet-600 text-white hover:bg-violet-700' : 'text-slate-400 hover:text-white'}
                    >
                        <TableIcon className="w-4 h-4 mr-2" /> Tabelle
                    </Button>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'grid' ? (
                <InventoryList
                    inventory={filteredInventory}
                    isEditMode={isEditMode && isAuthorized}
                    onUpdateStock={onUpdateStock}
                    onUpdateTarget={onUpdateTarget}
                    onReorder={onReorder}
                />
            ) : (
                <InventoryTable
                    inventory={filteredInventory}
                    isEditMode={isEditMode && isAuthorized}
                    onUpdateStock={onUpdateStock}
                    onUpdateTarget={onUpdateTarget}
                />
            )}

            <VerificationSection
                onVerify={(name) => {
                    onVerify(name);
                    setIsEditMode(false);
                }}
                onToggleEdit={() => setIsEditMode(!isEditMode)}
                isEditMode={isEditMode}
                user={user}
                isAuthorized={isAuthorized}
            />
        </div>
    );
}
