import React, { useState } from 'react';
import InventoryList from '../components/InventoryList';
import VerificationSection from '../components/VerificationSection';
import OrderList from '../components/OrderList';
import { ClipboardList } from 'lucide-react';

export default function InventoryPage({ inventory, onUpdateStock, onUpdateTarget, onReorder, onVerify, user, orders, onUpdateOrderStatus, onDeleteOrder }) {
    const [isEditMode, setIsEditMode] = useState(false);

    const isAuthorized = user?.role === 'Buchhaltung' || user?.role === 'Administrator';

    return (
        <div className="animate-fade-in pb-24">
            {/* Orders Section */}
            {orders && orders.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-amber-400" />
                        Offene Aufträge
                    </h2>
                    <OrderList
                        orders={orders}
                        onUpdateStatus={onUpdateOrderStatus}
                        onDelete={onDeleteOrder}
                        user={user}
                    />
                </div>
            )}

            <InventoryList
                inventory={inventory}
                isEditMode={isEditMode && isAuthorized}
                onUpdateStock={onUpdateStock}
                onUpdateTarget={onUpdateTarget}
                onReorder={onReorder}
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
