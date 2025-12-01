import React, { useState } from 'react';
import { Send, Package, FileText, Hash } from 'lucide-react';

export default function CreateOrderForm({ inventory, onSubmit }) {
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [note, setNote] = useState('');
    const [isCustomItem, setIsCustomItem] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!itemName || !quantity) return;

        onSubmit({
            itemName,
            quantity: parseInt(quantity),
            note
        });

        // Reset form
        setItemName('');
        setQuantity('');
        setNote('');
        setIsCustomItem(false);
    };

    return (
        <div className="max-w-md mx-auto bg-slate-900/50 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
                <Package className="w-6 h-6 text-violet-400" />
                Neuen Auftrag erstellen
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Item Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Artikel</label>
                    <div className="flex gap-2">
                        {!isCustomItem ? (
                            <select
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-violet-500 outline-none"
                                required
                            >
                                <option value="">Artikel wählen...</option>
                                {inventory.map(item => (
                                    <option key={item.id} value={item.name}>{item.name}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                placeholder="Artikel Name..."
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-violet-500 outline-none"
                                required
                            />
                        )}
                        <button
                            type="button"
                            onClick={() => { setIsCustomItem(!isCustomItem); setItemName(''); }}
                            className="px-3 py-2 text-xs text-slate-400 hover:text-white border border-slate-700 rounded hover:bg-slate-800 transition-colors"
                        >
                            {isCustomItem ? 'Liste' : 'Manuell'}
                        </button>
                    </div>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Menge</label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:border-violet-500 outline-none"
                            required
                            min="1"
                        />
                    </div>
                </div>

                {/* Note */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Notiz (Optional)</label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Zusatzinfos..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:border-violet-500 outline-none min-h-[100px]"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20 mt-4"
                >
                    <Send className="w-5 h-5" />
                    Auftrag Absenden
                </button>
            </form>
        </div>
    );
}
