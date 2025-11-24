import React from 'react';
import CheckInForm from '../components/CheckInForm';

export default function CheckInPage({ inventory, onCheckIn }) {
    return (
        <div className="animate-fade-in">
            <CheckInForm inventory={inventory} onCheckIn={onCheckIn} />
        </div>
    );
}
