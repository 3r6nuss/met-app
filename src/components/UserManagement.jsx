import React, { useState, useEffect } from 'react';
import { Save, Trash2, UserCog, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
            .catch(err => {
                console.error(err);
                toast.error("Fehler beim Laden der Benutzer");
            });
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
            .then(() => toast.success('Benutzer erfolgreich gespeichert'))
            .catch(err => {
                console.error(err);
                toast.error("Fehler beim Speichern");
            });
    };

    const deleteUser = (discordId) => {
        if (window.confirm('Möchtest du diesen Benutzer wirklich löschen? Er muss sich neu anmelden, um wieder Zugriff zu erhalten.')) {
            fetch(`/api/users/${discordId}`, {
                method: 'DELETE'
            })
                .then(res => res.json())
                .then(() => {
                    setUsers(users.filter(u => u.discordId !== discordId));
                    toast.success("Benutzer gelöscht");
                })
                .catch(err => {
                    console.error(err);
                    toast.error("Fehler beim Löschen");
                });
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12 text-violet-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Lade Benutzer...
        </div>
    );

    return (
        <Card className="border-slate-800 bg-slate-900/50 mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-violet-400">
                    <UserCog className="w-6 h-6" />
                    Benutzerverwaltung
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-slate-800">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-slate-800/50">
                                <TableHead className="text-slate-400">Discord User</TableHead>
                                <TableHead className="text-slate-400">Rolle</TableHead>
                                <TableHead className="text-slate-400">Zusatz</TableHead>
                                <TableHead className="text-slate-400">Mitarbeiter Verknüpfung</TableHead>
                                <TableHead className="text-right text-slate-400">Aktion</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map(user => (
                                <TableRow key={user.discordId} className="border-slate-800 hover:bg-slate-800/50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 border border-slate-700">
                                                <AvatarImage src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`} />
                                                <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium text-slate-200">{user.username}</div>
                                                <div className="text-xs text-slate-500">#{user.discriminator}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={user.role || 'Benutzer'}
                                            onValueChange={(val) => handleUpdate(user.discordId, 'role', val)}
                                        >
                                            <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700 h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-950 border-slate-800">
                                                <SelectItem value="Pending">Pending</SelectItem>
                                                <SelectItem value="Benutzer">Benutzer</SelectItem>
                                                <SelectItem value="Händler">Händler</SelectItem>
                                                <SelectItem value="Lager">Lager</SelectItem>
                                                <SelectItem value="Fuhrparkmanager">Fuhrparkmanager</SelectItem>
                                                <SelectItem value="Buchhaltung">Buchhaltung</SelectItem>
                                                <SelectItem value="Administrator">Administrator</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`haendler-${user.discordId}`}
                                                    checked={user.isHaendler === 1 || user.isHaendler === true}
                                                    onCheckedChange={(checked) => handleUpdate(user.discordId, 'isHaendler', checked ? 1 : 0)}
                                                    className="border-slate-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                                                />
                                                <label
                                                    htmlFor={`haendler-${user.discordId}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300"
                                                >
                                                    Händler
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`lagerist-${user.discordId}`}
                                                    checked={user.isLagerist === 1 || user.isLagerist === true}
                                                    onCheckedChange={(checked) => handleUpdate(user.discordId, 'isLagerist', checked ? 1 : 0)}
                                                    className="border-slate-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                                                />
                                                <label
                                                    htmlFor={`lagerist-${user.discordId}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300"
                                                >
                                                    Lagerist
                                                </label>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={user.employeeName || 'none'}
                                            onValueChange={(val) => handleUpdate(user.discordId, 'employeeName', val === 'none' ? '' : val)}
                                        >
                                            <SelectTrigger className="w-[200px] bg-slate-950 border-slate-700 h-8">
                                                <SelectValue placeholder="-- Keine --" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-950 border-slate-800">
                                                <SelectItem value="none">-- Keine Verknüpfung --</SelectItem>
                                                {Array.isArray(employees) && employees.map(emp => {
                                                    const name = typeof emp === 'string' ? emp : emp.name;
                                                    return <SelectItem key={name} value={name}>{name}</SelectItem>;
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => saveUser(user)}
                                                className="bg-violet-600 hover:bg-violet-700 h-8 px-2"
                                                title="Speichern"
                                            >
                                                <Save className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => deleteUser(user.discordId)}
                                                className="bg-red-900 hover:bg-red-800 h-8 px-2"
                                                title="Löschen"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
