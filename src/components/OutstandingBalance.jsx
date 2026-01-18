import React, { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';

export default function OutstandingBalance({ user }) {
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        if (!user) return;

        const fetchBalance = () => {
            fetch('/api/user/balance')
                .then(res => res.json())
                .then(data => setBalance(data.balance || 0))
                .catch(err => console.error("Failed to fetch balance:", err));
        };

        fetchBalance();

        // Poll every 30 seconds or listen to WS updates (if triggered)
        // For now, simple polling or relying on parent re-renders if passed down could work, 
        // but let's just fetch on mount and maybe expose a refresh method.
        // Actually, since we have WS updates, we could listen to them if we had access to the socket context.
        // But for simplicity, let's just fetch on mount.

        // To make it reactive to global updates, we might want to move this state up to App.jsx, 
        // but for now let's keep it self-contained and maybe add a listener if needed.
        // Let's rely on the fact that App.jsx triggers re-renders or we can add a custom event listener.

        const handleUpdate = () => fetchBalance();
        window.addEventListener('app-data-update', handleUpdate); // Custom event we can dispatch from App.jsx

        return () => window.removeEventListener('app-data-update', handleUpdate);
    }, [user]);

    if (balance <= 0) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-medium animate-fade-in">
            <Wallet className="w-4 h-4" />
            <span>Ausstehend: ${balance.toLocaleString()}</span>
        </div>
    );
}
