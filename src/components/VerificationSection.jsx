import React, { useState } from 'react';
import { CheckCircle, Edit3, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function VerificationSection({ onVerify, onToggleEdit, isEditMode, user, isAuthorized }) {
    const [name, setName] = useState(user?.employeeName || user?.username || '');

    const handleVerify = () => {
        if (!name.trim()) {
            alert("Bitte Namen eingeben!");
            return;
        }
        onVerify(name);
        setName('');
    };

    const handleToggleEdit = () => {
        if (!name.trim() && !isEditMode) {
            alert("Bitte Namen eingeben um zu bearbeiten!");
            return;
        }
        onToggleEdit();
    };

    if (!isAuthorized) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800 z-40 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.3)]">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-full md:w-72">
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Dein Name zur Bestätigung..."
                            className="bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
                        />
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <Button
                        onClick={handleToggleEdit}
                        variant={isEditMode ? "default" : "secondary"}
                        className={cn(
                            "flex-1 md:flex-none gap-2 transition-all duration-300",
                            isEditMode
                                ? "bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-900/20"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        )}
                    >
                        {isEditMode ? <><CheckCircle className="w-4 h-4" /> Fertig</> : <><Edit3 className="w-4 h-4" /> Liste Anpassen</>}
                    </Button>

                    <Button
                        onClick={handleVerify}
                        className="flex-1 md:flex-none gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 transition-all duration-300"
                    >
                        <CheckCircle className="w-4 h-4" /> Lagerliste Bestätigen
                    </Button>
                </div>

            </div>
        </div>
    );
}
