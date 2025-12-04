import React from 'react';
import { Construction } from 'lucide-react';

export default function ComingSoonPage({ title }) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
            <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-sm max-w-md w-full">
                <div className="w-20 h-20 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Construction className="w-10 h-10 text-violet-400" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">{title}</h1>
                <p className="text-slate-400 text-lg">
                    Dieser Bereich ist noch in Arbeit.
                    <br />
                    <span className="text-sm mt-2 block opacity-75">Coming Soon</span>
                </p>
            </div>
        </div>
    );
}
