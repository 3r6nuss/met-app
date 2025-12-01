import React, { useState, useEffect } from 'react';
import { Save, Trash2 } from 'lucide-react';

export default function UserManagement({ employees = [] }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                setUsers(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    const handleUpdate = (discordId, field, value) => {
        const updatedUsers = users.map(u => {
            if (u.discordId === discordId) {
                return { ...u, [field]: value };
            }
            return u;
        });
        setUsers(updatedUsers);
    };

    const saveUser = (user) => {
        fetch(`/api/users/${user.discordId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: user.role, employeeName: user.employeeName, isHaendler: user.isHaendler, isLagerist: user.isLagerist })
        })
            .then(res => res.json())
            .then(() => alert('Gespeichert!'))
            .catch(err => console.error(err));
    };

    const deleteUser = (discordId) => {
        if (window.confirm('Möchtest du diesen Benutzer wirklich löschen? Er muss sich neu anmelden, um wieder Zugriff zu erhalten.')) {
            fetch(`/api/users/${discordId}`, {
                method: 'DELETE'
            })
                .then(res => res.json())
                .then(() => {
                    setUsers(users.filter(u => u.discordId !== discordId));
                })
                .catch(err => console.error(err));
        }
    };

    if (loading) return <div className="text-violet-400 p-4">Lade Benutzer...</div>;

    return (
        <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 mb-8">
            <h2 className="text-xl font-bold text-violet-400 mb-4">Benutzerverwaltung</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-800 text-slate-200 uppercase">
                        <tr>
                            <th className="p-3">Discord User</th>
                            <th className="p-3">Rolle</th>
                            <th className="p-3">Zusatz</th>
                            <th className="p-3">Mitarbeiter Verknüpfung</th>
                            <th className="p-3">Aktion</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {users.map(user => (
                            <tr key={user.discordId} className="hover:bg-slate-800/50">
                                <td className="p-3 flex items-center gap-3">
                                    {user.avatar && (
                                        <img
                                            src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                                            alt="avatar"
                                            className="w-8 h-8 rounded-full"
                                        />
                                    )}
                                    <div>
                                        <div className="font-medium text-slate-200">{user.username}</div>
                                        <div className="text-xs text-slate-500">#{user.discriminator}</div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <select
                                        value={user.role || 'Benutzer'}
                                        onChange={(e) => handleUpdate(user.discordId, 'role', e.target.value)}
                                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-violet-500 outline-none"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Benutzer">Benutzer</option>
                                        <option value="Händler">Händler</option>
                                        <option value="Lager">Lager</option>
                                        <option value="Buchhaltung">Buchhaltung</option>
                                        <option value="Administrator">Administrator</option>
                                    </select>
                                </td>
                                <td className="p-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={user.isHaendler === 1 || user.isHaendler === true}
                                            onChange={(e) => handleUpdate(user.discordId, 'isHaendler', e.target.checked ? 1 : 0)}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-violet-600 focus:ring-violet-500"
                                        />
                                        <span className="text-sm">Händler</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                                        <input
                                            type="checkbox"
                                            checked={user.isLagerist === 1 || user.isLagerist === true}
                                            onChange={(e) => handleUpdate(user.discordId, 'isLagerist', e.target.checked ? 1 : 0)}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-violet-600 focus:ring-violet-500"
                                        />
                                        <span className="text-sm">Lagerist</span>
                                    </label>
                                </td>
                                <td className="p-3">
                                    <select
                                        value={user.employeeName || ''}
                                        onChange={(e) => handleUpdate(user.discordId, 'employeeName', e.target.value)}
                                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 w-full focus:border-violet-500 outline-none"
                                    >
                                        <option value="">-- Keine Verknüpfung --</option>
                                        {Array.isArray(employees) && employees.map(emp => (
                                            <option key={emp} value={emp}>{emp}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-3">
                                    <button
                                        onClick={() => saveUser(user)}
                                        className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded transition-colors mr-2"
                                        title="Speichern"
                                    >
                                        <Save size={16} />
                                    </button>
                                    <button
                                        onClick={() => deleteUser(user.discordId)}
                                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                        title="Benutzer löschen"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
