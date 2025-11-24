import React from 'react';
import CheckInForm from '../components/CheckInForm';
import CheckOutForm from '../components/CheckOutForm';

export default function ActionPage({ inventory, employees, prices = [], onAction, type, title, label, showPrice = true }) {
    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            {type === 'in' ? (
                <CheckInForm
                    inventory={inventory}
                    employees={employees}
                    prices={prices}
                    onCheckIn={onAction}
                    title={title}
                    depositorLabel={label}
                    showPrice={showPrice}
                />
            ) : (
                <CheckOutForm
                    inventory={inventory}
                    employees={employees}
                    prices={prices}
                    onCheckOut={onAction}
                    title={title}
                    depositorLabel={label}
                    showPrice={showPrice}
                />
            )}
        </div>
    );
}
