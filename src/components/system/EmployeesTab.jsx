import React, { useState } from 'react';
import { UserPlus, Edit2, Save, X, Trash2 } from 'lucide-react';

/**
 * Employee Management Tab Component
 * Extracted from SystemPage for better maintainability
 */
export default function EmployeesTab({ employees = [], onUpdateEmployees }) {
    const [newEmployeeName, setNewEmployeeName] = useState('');
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

    const handleFireEmployee = (index) => {
        const emp = typeof employees[index] === 'string'
            ? { name: employees[index], status: 'active' }
            : employees[index];

        if (window.confirm(`Mitarbeiter "${emp.name}" wirklich feuern? Er wird aus Listen entfernt, bleibt aber in der Historie.`)) {
            const updated = [...employees];
            const current = typeof updated[index] === 'string' ? { name: updated[index], status: 'active' } : updated[index];
            updated[index] = { ...current, status: 'fired' };
            onUpdateEmployees(updated);
        }
    };

    const handleRehireEmployee = (index) => {
        const emp = typeof employees[index] === 'string'
            ? { name: employees[index], status: 'active' }
            : employees[index];

        if (window.confirm(`Mitarbeiter "${emp.name}" wieder einstellen?`)) {
            const updated = [...employees];
            const current = typeof updated[index] === 'string' ? { name: updated[index], status: 'active' } : updated[index];
            updated[index] = { ...current, status: 'active' };
            onUpdateEmployees(updated);
        }
    };

    return (
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
                {Array.isArray(employees) && employees.map((empData, idx) => {
                    const emp = typeof empData === 'string' ? { name: empData, status: 'active' } : empData;
                    const isFired = emp.status === 'fired';

                    return (
                        <div key={idx} className={`flex justify-between items-center px-4 py-3 rounded-lg border transition-colors ${isFired ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
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
                                    <div className="flex items-center gap-2">
                                        <span className={`font-medium ${isFired ? 'text-red-400 line-through decoration-red-500/50' : 'text-slate-200'}`}>
                                            {emp.name}
                                        </span>
                                        {isFired && <span className="text-[10px] uppercase bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded font-bold">Gefeuert</span>}
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => startEdit(idx, emp.name)}
                                            className="text-slate-500 hover:text-violet-400 p-2 transition-colors"
                                            title="Umbenennen"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>

                                        {isFired ? (
                                            <button
                                                onClick={() => handleRehireEmployee(idx)}
                                                className="text-slate-500 hover:text-emerald-400 p-2 transition-colors"
                                                title="Wieder einstellen"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleFireEmployee(idx)}
                                                className="text-slate-500 hover:text-red-400 p-2 transition-colors"
                                                title="Feuern"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
                {(!employees || employees.length === 0) && (
                    <div className="text-slate-500 italic col-span-2 text-center py-4">Keine Mitarbeiter angelegt.</div>
                )}
            </div>
        </div>
    );
}
