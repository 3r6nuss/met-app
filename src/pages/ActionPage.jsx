import React from 'react';
import CheckInForm from '../components/CheckInForm';
import CheckOutForm from '../components/CheckOutForm';

export default function ActionPage({ inventory, employees, prices = [], employeeInventory = [], onConsumeIngredients, onAction, type, title, label, showPrice = true }) {
    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            {type === 'in' ? (
                <CheckInForm
                    inventory={inventory}
                    employees={employees}
                    prices={prices}
                    employeeInventory={employeeInventory}
                    onConsumeIngredients={onConsumeIngredients}
                    onCheckIn={(id, qty, dep, price, date, warningIgnored) => onAction(id, qty, dep, price, date, 'in', 'internal', warningIgnored)}
                    title={title}
                    depositorLabel={label}
                    showPrice={showPrice}
                />
            ) : (
                <CheckOutForm
                    inventory={inventory}
                    employees={employees}
                    prices={prices}
                    onCheckOut={(id, qty, dep, price, date) => onAction(id, qty, dep, price, date)}
                    title={title}
                    depositorLabel={label}
                    showPrice={showPrice}
                />
            )}
        </div>
    );
}
