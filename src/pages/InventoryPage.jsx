import React, { useState } from 'react';
import InventoryList from '../components/InventoryList';
import VerificationSection from '../components/VerificationSection';

export default function InventoryPage({ inventory, onUpdateStock, onVerify, user }) {
    const [isEditMode, setIsEditMode] = useState(false);

    const isAuthorized = user?.role === 'Buchhaltung' || user?.role === 'Administrator';

    return (
        <div className="animate-fade-in pb-24">
            <InventoryList
                inventory={inventory}
                isEditMode={isEditMode && isAuthorized}
                onUpdateStock={onUpdateStock}
            />

            <VerificationSection
                onVerify={(name) => {
                    onVerify(name);
                    setIsEditMode(false);
                }}
                onToggleEdit={() => setIsEditMode(!isEditMode)}
                isEditMode={isEditMode}
                user={user}
                isAuthorized={isAuthorized}
            />
        </div>
    );
}
