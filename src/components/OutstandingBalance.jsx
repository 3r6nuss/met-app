import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Coins, Sparkles } from 'lucide-react';

export default function OutstandingBalance({ user }) {
    const [balance, setBalance] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [previousBalance, setPreviousBalance] = useState(0);

    useEffect(() => {
        if (!user) return;

        const fetchBalance = () => {
            fetch('/api/user/balance')
                .then(res => res.json())
                .then(data => {
                    const newBalance = data.balance || 0;
                    if (newBalance !== balance && balance !== 0) {
                        setIsAnimating(true);
                        setTimeout(() => setIsAnimating(false), 1000);
                    }
                    setPreviousBalance(balance);
                    setBalance(newBalance);
                })
                .catch(err => console.error("Failed to fetch balance:", err));
        };

        fetchBalance();

        const handleUpdate = () => fetchBalance();
        window.addEventListener('app-data-update', handleUpdate);

        // Poll every 60 seconds for updates
        const pollInterval = setInterval(fetchBalance, 60000);

        return () => {
            window.removeEventListener('app-data-update', handleUpdate);
            clearInterval(pollInterval);
        };
    }, [user, balance]);

    // Format currency nicely
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Don't show anything if no balance
    if (balance <= 0) {
        return null;
    }

    const increased = balance > previousBalance && previousBalance !== 0;

    return (
        <div className={`
            relative flex items-center gap-2.5 px-4 py-2 
            rounded-xl text-sm font-semibold 
            transition-all duration-300
            ${balance >= 1000
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }
            ${isAnimating ? 'scale-110 animate-bounce' : ''}
        `}>
            {/* Icon with glow */}
            <div className={`
                relative
                ${balance >= 1000 ? 'animate-pulse' : ''}
            `}>
                <Wallet className="w-5 h-5" />
                {balance >= 500 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                )}
            </div>

            {/* Amount */}
            <span className="font-mono tracking-tight">
                {formatCurrency(balance)}
            </span>

            {/* Increase indicator */}
            {increased && isAnimating && (
                <TrendingUp className="w-4 h-4 text-emerald-400 animate-bounce" />
            )}

            {/* Tooltip-like label */}
            <span className="hidden 2xl:block text-amber-400/70 font-normal text-xs">
                ausstehend
            </span>

            {/* High balance warning glow */}
            {balance >= 1000 && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 animate-pulse -z-10"></div>
            )}
        </div>
    );
}
