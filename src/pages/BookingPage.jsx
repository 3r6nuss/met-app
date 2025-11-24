import React from 'react';
import CheckInForm from '../components/CheckInForm';
import CheckOutForm from '../components/CheckOutForm';

export default function BookingPage({ inventory, onCheckIn, onCheckOut }) {
    return (
        <div className="animate-fade-in max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-200">Buchung (Lager)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CheckInForm
                    inventory={inventory}
                    onCheckIn={onCheckIn}
                    title="Einlagern"
                    depositorLabel="Name (Einlagerer)"
                />
                <CheckOutForm
                    inventory={inventory}
                    onCheckOut={onCheckOut}
                    title="Auslagern"
                    depositorLabel="Name (Entnehmer)"
                />
            </div>
        </div>
    );
}
