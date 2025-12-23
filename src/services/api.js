const API_URL = '/api';

export const api = {
    // Inventory
    getInventory: async () => {
        const res = await fetch(`${API_URL}/inventory`);
        return res.json();
    },
    saveInventory: async (data) => {
        const res = await fetch(`${API_URL}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to save inventory');
        return res.json();
    },

    // Logs
    getLogs: async () => {
        const res = await fetch(`${API_URL}/logs`);
        return res.json();
    },
    saveLog: async (entry) => {
        const res = await fetch(`${API_URL}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
        if (!res.ok) throw new Error('Failed to save log');
        return res.json();
    },
    deleteLog: async (timestamp) => {
        const res = await fetch(`${API_URL}/logs/${encodeURIComponent(timestamp)}`, {
            method: 'DELETE'
        });
        return res.json();
    },

    // Employees & Personnel
    getEmployees: async () => {
        const res = await fetch(`${API_URL}/employees`);
        return res.json();
    },
    saveEmployees: async (data) => {
        const res = await fetch(`${API_URL}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to save employees');
        return res.json();
    },
    getPersonnel: async () => {
        const res = await fetch(`${API_URL}/personnel`);
        if (res.ok) return res.json();
        return [];
    },

    // Employee Inventory
    getEmployeeInventory: async () => {
        const res = await fetch(`${API_URL}/employee-inventory`);
        return res.json();
    },
    consumeIngredients: async (employeeName, items) => {
        const res = await fetch(`${API_URL}/employee-inventory/consume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeName, items })
        });
        return res.json();
    },

    // Prices
    getPrices: async () => {
        const res = await fetch(`${API_URL}/prices`);
        return res.json();
    },

    // Orders
    getOrders: async () => {
        const res = await fetch(`${API_URL}/orders`);
        return res.json();
    },
    createOrder: async (orderData) => {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        return res.json();
    },
    updateOrderStatus: async (id, status) => {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        return res.json();
    },
    deleteOrder: async (id) => {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'DELETE'
        });
        return res.json();
    },

    // Transactions
    performTransaction: async (payload) => {
        const res = await fetch(`${API_URL}/transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.json();
    },

    // System
    getUser: async () => {
        const res = await fetch(`${API_URL}/user`);
        if (res.ok) return res.json();
        return null;
    },
    resetDatabase: async () => {
        const res = await fetch(`${API_URL}/reset`, { method: 'POST' });
        return res.json();
    },
    saveVerification: async (verificationEntry) => {
        const res = await fetch(`${API_URL}/verifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(verificationEntry)
        });
        if (!res.ok) throw new Error('Failed to save verification');
        return res.json();
    }
};
