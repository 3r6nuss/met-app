import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, ArrowRightLeft, FileText, MoreHorizontal,
    Settings, ShieldCheck, LogOut, Menu, User, Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import OutstandingBalance from './OutstandingBalance';
import { useDeveloperConsole } from '@/context/DeveloperConsoleContext';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function Navbar({ user }) {
    const location = useLocation();
    const isAdmin = user?.role === 'Administrator';
    const isBuchhaltung = user?.role === 'Buchhaltung' || isAdmin;
    const isLager = (user?.isLagerist === 1 || user?.isLagerist === true) || user?.role === 'Lager' || isBuchhaltung;
    const isHaendler = (user?.isHaendler === 1 || user?.isHaendler === true) || user?.role === 'Händler' || isBuchhaltung;
    const isSuperAdmin = ['823276402320998450', '690510884639866960'].includes(user?.discordId);
    const isPending = user?.role?.includes('Pending');

    const links = [
        { to: '/', label: 'Lager', icon: LayoutDashboard, show: true },
        { to: '/buchung', label: 'Buchung', icon: ArrowRightLeft, show: (isLager || isHaendler) && !isPending },
        { to: '/protokolle', label: 'Protokolle', icon: FileText, show: !isPending },
        { to: '/sonstiges', label: 'Sonstiges', icon: MoreHorizontal, show: !isPending },
        { to: '/system', label: 'System', icon: Settings, show: isBuchhaltung },
        { to: '/preise', label: 'Preise', icon: null, emoji: '💲', show: isAdmin },
        { to: '/aktivitaetslog', label: 'Admin', icon: ShieldCheck, show: isSuperAdmin, className: 'text-red-400 hover:text-red-400 hover:bg-red-400/10' },
    ].filter(link => link.show);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 mb-8">
            <div className="container flex h-16 items-center px-4">

                {/* Mobile Menu */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden mr-2">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[240px] bg-slate-950 border-r-slate-800">
                        <SheetHeader className="mb-6 text-left">
                            <SheetTitle className="text-slate-100 flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                                    <span className="font-bold text-white">M</span>
                                </div>
                                MET Syncrolog
                            </SheetTitle>
                        </SheetHeader>
                        <nav className="flex flex-col gap-2">
                            {links.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                        isActive
                                            ? "bg-slate-800 text-white"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800/50",
                                        link.className
                                    )}
                                >
                                    {link.icon && <link.icon className="h-4 w-4" />}
                                    {link.emoji && <span className="text-base">{link.emoji}</span>}
                                    {link.label}
                                </NavLink>
                            ))}
                        </nav>
                    </SheetContent>
                </Sheet>

                {/* Logo / Brand (Desktop) */}
                <div className="hidden md:flex items-center gap-2 mr-6">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20 flex items-center justify-center text-white font-bold">
                        M
                    </div>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {links.map((link) => (
                        <NavLink key={link.to} to={link.to}>
                            {({ isActive }) => (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "gap-2 h-9 px-4 transition-all duration-200",
                                        isActive
                                            ? "bg-slate-800 text-white shadow-sm"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800/50",
                                        link.className
                                    )}
                                >
                                    {link.icon && <link.icon className="h-4 w-4" />}
                                    {link.emoji && <span className="text-base leading-none">{link.emoji}</span>}
                                    {link.label}
                                </Button>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Right Side: User & Actions */}
                <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
                    {isSuperAdmin && <ConsoleToggle />}

                    {user && (
                        <>
                            <div className="hidden sm:block">
                                <OutstandingBalance user={user} />
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                        <Avatar className="h-9 w-9 border border-slate-700">
                                            <AvatarImage
                                                src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                                                alt={user.username}
                                            />
                                            <AvatarFallback className="bg-slate-800 text-slate-400">
                                                {user.username.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 bg-slate-950 border-slate-800" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none text-white">{user.username}</p>
                                            <p className="text-xs leading-none text-slate-400">{user.role}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-slate-800" />
                                    <div className="sm:hidden p-2">
                                        <OutstandingBalance user={user} />
                                    </div>
                                    <DropdownMenuSeparator className="bg-slate-800 sm:hidden" />
                                    <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-950/30 cursor-pointer" asChild>
                                        <a href="/auth/logout" className="flex items-center w-full">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Abmelden</span>
                                        </a>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

const ConsoleToggle = () => {
    const { toggleConsole, isVisible } = useDeveloperConsole();
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleConsole}
            className={cn(
                "h-9 w-9",
                isVisible
                    ? "text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 hover:text-emerald-300"
                    : "text-slate-500 hover:text-emerald-400"
            )}
            title="Developer Console"
        >
            <Terminal className="h-4 w-4" />
        </Button>
    );
};
