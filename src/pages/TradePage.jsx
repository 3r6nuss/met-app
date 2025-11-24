import React from 'react';
import CheckInForm from '../components/CheckInForm';
import CheckOutForm from '../components/CheckOutForm';

export default function TradePage({ inventory, onCheckIn, onCheckOut }) {
    return (
        <div className="animate-fade-in max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-200">Einkauf / Verkauf</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CheckInForm
                    inventory={inventory}
                    onCheckIn={onCheckIn}
                    title="Einkauf (Ankauf)"
                    depositorLabel="Name (Verkäufer)"
                />
                <CheckOutForm
                    inventory={inventory}
                    onCheckOut={onCheckOut}
                    title="Verkauf (Abverkauf)"
                    depositorLabel="Name (Käufer)"
                />
            </div>
        </div>
    );
}
