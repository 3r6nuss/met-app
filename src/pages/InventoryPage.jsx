import React, { useState } from 'react';
import InventoryList from '../components/InventoryList';
import VerificationSection from '../components/VerificationSection';

export default function InventoryPage({ inventory, onUpdateStock, onVerify }) {
    const [isEditMode, setIsEditMode] = useState(false);

    return (
        <div className="animate-fade-in pb-24">
            <InventoryList
                inventory={inventory}
                isEditMode={isEditMode}
                onUpdateStock={onUpdateStock}
            />

            <VerificationSection
                onVerify={(name) => {
                    onVerify(name);
                    setIsEditMode(false);
                }}
                onToggleEdit={() => setIsEditMode(!isEditMode)}
                isEditMode={isEditMode}
            />
        </div>
    );
}
