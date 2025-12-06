import React from 'react';
import CheckInForm from '../components/CheckInForm';
import CheckOutForm from '../components/CheckOutForm';

export default function ActionPage({
    inventory,
    employees,
    prices = [],
    employeeInventory = [],
    onConsumeIngredients,
    onAction,
    type,
    title,
    label,
    showPrice = true,
    user // Receive user prop
}) {
    return (
        <div className="animate-fade-in">
            {type === 'in' ? (
                <CheckInForm
                    inventory={inventory}
                    employees={employees}
                    prices={prices}
                    employeeInventory={employeeInventory}
                    onConsumeIngredients={onConsumeIngredients}
                    onCheckIn={(id, qty, dep, price, date, warningIgnored, skipInventory) => onAction(id, qty, dep, price, date, 'in', 'internal', warningIgnored, skipInventory)}
                    title={title}
                    depositorLabel={label}
                    showPrice={showPrice}
                    user={user} // Pass user prop
                />
            ) : (
                <CheckOutForm
                    inventory={inventory}
                    employees={employees}
                    prices={prices}
                    onCheckOut={(id, qty, dep, price, date, skipInventory) => onAction(id, qty, dep, price, date, 'out', 'internal', false, skipInventory)}
                    title={title}
                    depositorLabel={label}
                    showPrice={showPrice}
                    user={user} // Pass user prop
                />
            )}
        </div>
    );
}
