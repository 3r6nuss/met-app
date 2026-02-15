import React, { useState } from 'react';
import { initialPrices } from '../data/initialPrices';

export default function BelegPage({ prices = [] }) {
    // Use passed prices or fallback to initialPrices
    const availableItems = prices.length > 0 ? prices : initialPrices;
    const [isViewMode, setIsViewMode] = useState(false);

    const [rows, setRows] = useState([
        { id: 1, quantity: 1, item: '', oldPrice: 0, newPrice: 0, total: 0 }
    ]);

    // Helper to format currency
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
    };

    const handleAddRow = () => {
        setRows(prev => [
            ...prev,
            {
                id: prev.length > 0 ? Math.max(...prev.map(r => r.id)) + 1 : 1,
                quantity: 1,
                item: '',
                oldPrice: 0,
                newPrice: 0,
                total: 0
            }
        ]);
    };

    const handleRemoveRow = (id) => {
        if (rows.length === 1) return; // Keep at least one row
        setRows(prev => prev.filter(r => r.id !== id));
    };

    const updateRow = (id, field, value) => {
        setRows(prev => prev.map(row => {
            if (row.id === id) {
                let updatedRow = { ...row, [field]: value };

                // If item changes, prefill prices
                if (field === 'item') {
                    const selectedItem = availableItems.find(i => i.name === value);
                    if (selectedItem) {
                        updatedRow.oldPrice = selectedItem.vk;
                        updatedRow.newPrice = selectedItem.vk;
                    }
                }

                // Recalculate total whenever quantity or newPrice changes (or item changes implicitly)
                const qty = field === 'quantity' ? Number(value) : Number(updatedRow.quantity);
                const price = field === 'newPrice' ? Number(value) : Number(updatedRow.newPrice);
                const itemChangePrice = field === 'item' ? Number(updatedRow.newPrice) : price;

                updatedRow.total = qty * itemChangePrice;

                return updatedRow;
            }
            return row;
        }));
    };

    const grandTotal = rows.reduce((acc, row) => acc + row.total, 0);

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-8 flex flex-col items-center">

            {/* View/Edit Toggle */}
            <div className="mb-4 flex gap-4 print:hidden">
                {!isViewMode ? (
                    <button
                        onClick={() => setIsViewMode(true)}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-colors"
                    >
                        Fertigstellen (Ansicht)
                    </button>
                ) : (
                    <button
                        onClick={() => setIsViewMode(false)}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition-colors"
                    >
                        Bearbeiten
                    </button>
                )}
            </div>

            {/* Container echoing the card in the image */}
            <div className="w-full max-w-4xl bg-[#1e1b4b] rounded-xl shadow-2xl overflow-hidden border border-violet-900/50 relative">

                {/* Decorative background effects */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-900/20 via-transparent to-fuchsia-900/20 pointer-events-none"></div>

                {/* Header Section */}
                <div className="p-8 pb-4 relative z-10">
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex flex-col">
                            {/* Logo Placeholer / Text */}
                            <div className="flex items-center gap-2 mb-2">
                                <img src="/logo.png" alt="MET Logo" className="w-16 h-16 object-contain" />
                                <div className="flex flex-col leading-tight">
                                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 uppercase tracking-tighter" style={{ fontFamily: 'Arial, sans-serif' }}>
                                        M.E.T
                                    </h2>
                                    <span className="text-xl font-bold text-violet-300 tracking-widest uppercase text-[0.8rem]">Logistic</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h1 className="text-6xl font-black text-white drop-shadow-lg mb-8 tracking-wide uppercase">
                        BELEG
                    </h1>
                </div>

                {/* Table Section */}
                <div className="px-8 relative z-10 w-full">
                    <div className="w-full">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-2 text-center font-bold text-white text-lg py-3 border-b-2 border-white/20 mb-2">
                            <div className="col-span-1">Position</div>
                            <div className="col-span-2">Menge</div>
                            <div className="col-span-3">Artikel</div>
                            <div className="col-span-2">Einzelpreis (alt)</div>
                            <div className="col-span-2">Einzelpreis (neu)</div>
                            <div className="col-span-2">Gesamtpreis</div>
                        </div>

                        {/* Table Rows */}
                        <div className="flex flex-col gap-2">
                            {rows.map((row, index) => (
                                <div key={row.id} className="grid grid-cols-12 gap-2 items-center text-center py-2 relative group min-h-[40px]">

                                    {/* Position */}
                                    <div className="col-span-1 text-xl font-bold">{index + 1}</div>

                                    {/* Menge */}
                                    <div className="col-span-2 flex items-center justify-center font-bold text-lg">
                                        {!isViewMode ? (
                                            <input
                                                type="number"
                                                value={row.quantity}
                                                onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                                                className="w-20 bg-slate-800/50 border border-slate-600 rounded text-center py-1 px-2 focus:ring-2 focus:ring-violet-500 outline-none font-medium"
                                            />
                                        ) : (
                                            <span className="mr-1">{row.quantity}</span>
                                        )}
                                        <span className="ml-1 text-slate-400">x</span>
                                    </div>

                                    {/* Artikel */}
                                    <div className="col-span-3 flex justify-center items-center">
                                        {!isViewMode ? (
                                            <select
                                                value={row.item}
                                                onChange={(e) => updateRow(row.id, 'item', e.target.value)}
                                                className="w-full bg-slate-800/50 border border-slate-600 rounded py-1 px-2 focus:ring-2 focus:ring-violet-500 outline-none"
                                            >
                                                <option value="">Wählen...</option>
                                                {availableItems.map(item => (
                                                    <option key={item.name} value={item.name}>{item.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="font-bold text-lg">{row.item || '-'}</span>
                                        )}
                                    </div>

                                    {/* Einzelpreis (alt) */}
                                    <div className="col-span-2 flex justify-center items-center">
                                        {!isViewMode ? (
                                            <input
                                                type="number"
                                                value={row.oldPrice}
                                                onChange={(e) => updateRow(row.id, 'oldPrice', e.target.value)}
                                                className="w-24 bg-slate-800/50 border border-slate-600 rounded text-center py-1 px-2 focus:ring-2 focus:ring-violet-500 outline-none"
                                            />
                                        ) : (
                                            <span className="font-medium text-slate-300">{row.oldPrice}</span>
                                        )}
                                        <span className="ml-1 self-center text-slate-400">€</span>
                                    </div>

                                    {/* Einzelpreis (neu) */}
                                    <div className="col-span-2 flex justify-center items-center">
                                        {!isViewMode ? (
                                            <input
                                                type="number"
                                                value={row.newPrice}
                                                onChange={(e) => updateRow(row.id, 'newPrice', e.target.value)}
                                                className="w-24 bg-slate-800/50 border-2 border-violet-500/50 rounded text-center py-1 px-2 focus:ring-2 focus:ring-violet-500 outline-none font-bold bg-violet-900/20"
                                            />
                                        ) : (
                                            <span className="font-bold text-lg text-white">{row.newPrice}</span>
                                        )}
                                        <span className="ml-1 self-center text-slate-400">€</span>
                                    </div>

                                    {/* Gesamtpreis */}
                                    <div className="col-span-2 font-bold text-xl">
                                        {formatCurrency(row.total)}
                                    </div>

                                    {/* Delete Row Action (Hover) - Only in Edit Mode */}
                                    {!isViewMode && (
                                        <button
                                            onClick={() => handleRemoveRow(row.id)}
                                            className="absolute -right-6 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            title="Zeile entfernen"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add Row Button - Only in Edit Mode */}
                        {!isViewMode && (
                            <div className="mt-4 flex justify-start">
                                <button
                                    onClick={handleAddRow}
                                    className="text-sm bg-slate-700/50 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded transition-colors"
                                >
                                    + Zeile hinzufügen
                                </button>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="w-full h-1 bg-white my-6"></div>

                        {/* Total */}
                        <div className="flex justify-end items-center gap-4 mb-12">
                            <span className="text-xl font-bold uppercase tracking-wider text-slate-300">Gesamtsumme:</span>
                            <span className="text-4xl font-bold text-white">{formatCurrency(grandTotal)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 text-center relative z-10 bg-slate-900/30">
                    <h3 className="text-2xl font-bold uppercase tracking-widest text-slate-200">
                        Wir liefern – pünktlich und präzise.
                    </h3>
                </div>

            </div>

            {!isViewMode && (
                <div className="mt-8 text-slate-500 text-sm">
                    Tipp: Nutze "Fertigstellen", um den Beleg für den Screenshot vorzubereiten.
                </div>
            )}
        </div>
    );
}
