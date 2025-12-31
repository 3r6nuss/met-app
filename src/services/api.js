
const handleResponse = async (res) => {
    if (!res.ok) {
        let errorMessage = `Request failed with status ${res.status}`;
        try {
            const data = await res.json();
            if (data.error) errorMessage = data.error;
        } catch (e) {
            // response was not JSON or empty
        }
        throw new Error(errorMessage);
    }
    return res.json();
};

export const api = {
    // Inventory
    getInventory: async () => {
        const res = await fetch(`${API_URL}/inventory`);
        return handleResponse(res);
    },
    saveInventory: async (data) => {
        const res = await fetch(`${API_URL}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
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
        return handleResponse(res);
    },
    deleteLog: async (timestamp) => {
        const res = await fetch(`${API_URL}/logs/${encodeURIComponent(timestamp)}`, {
            method: 'DELETE'
        });
        return handleResponse(res);
    },

    // Employees & Personnel
    getEmployees: async () => {
        const res = await fetch(`${API_URL}/employees`);
        return handleResponse(res);
    },
    saveEmployees: async (data) => {
        const res = await fetch(`${API_URL}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },
    getPersonnel: async () => {
        const res = await fetch(`${API_URL}/personnel`);
        if (res.ok) return res.json();
        return [];
    },
    savePersonnel: async (data) => {
        const res = await fetch(`${API_URL}/personnel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },
    deletePersonnel: async (id) => {
        const res = await fetch(`${API_URL}/personnel/${id}`, {
            method: 'DELETE'
        });
        return handleResponse(res);
    },
    saveViolation: async (data) => {
        const res = await fetch(`${API_URL}/violations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },
    deleteViolation: async (id) => {
        const res = await fetch(`${API_URL}/violations/${id}`, {
            method: 'DELETE'
        });
        return handleResponse(res);
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
        return handleResponse(res);
    }
};
