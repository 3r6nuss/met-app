import React from 'react';
import CheckOutForm from '../components/CheckOutForm';

export default function CheckOutPage({ inventory, onCheckOut }) {
    return (
        <div className="animate-fade-in">
            <CheckOutForm inventory={inventory} onCheckOut={onCheckOut} />
        </div>
    );
}
