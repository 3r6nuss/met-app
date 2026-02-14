
const API_URL = '/api';

const handleResponse = async (res) => {
    if (!res.ok) {
        let errorMessage = `Request failed with status ${res.status}`;
        try {
            const data = await res.json();
            if (data.error) errorMessage = data.error;
        } catch (_e) {
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
        const res = await fetch(`${API_URL}/logs`, { credentials: 'include' });
        return handleResponse(res);
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
        const res = await fetch(`${API_URL}/employee-inventory`, { credentials: 'include' });
        return handleResponse(res);
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
        const res = await fetch(`${API_URL}/prices`, { credentials: 'include' });
        return handleResponse(res);
    },

    // Orders
    getOrders: async () => {
        const res = await fetch(`${API_URL}/orders`, { credentials: 'include' });
        return handleResponse(res);
    },
    createOrder: async (orderData) => {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(orderData)
        });
        return handleResponse(res);
    },
    updateOrderStatus: async (id, status) => {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status })
        });
        return handleResponse(res);
    },
    deleteOrder: async (id) => {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        return handleResponse(res);
    },

    // Transactions
    performTransaction: async (payload) => {
        const res = await fetch(`${API_URL}/transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        return handleResponse(res);
    },

    // System
    getUser: async () => {
        const res = await fetch(`${API_URL}/user`);
        if (res.ok) return res.json();
        return null;
    },
    resetDatabase: async () => {
        const res = await fetch(`${API_URL}/reset`, { method: 'POST', credentials: 'include' });
        return handleResponse(res);
    },
    saveVerification: async (verificationEntry) => {
        const res = await fetch(`${API_URL}/verifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(verificationEntry)
        });
        return handleResponse(res);
    },

    // System & Error Reporting
    reportError: async (errorData) => {
        try {
            await fetch(`${API_URL}/debug/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorData)
            });
        } catch (e) {
            console.error("Failed to report error to server:", e);
        }
    },

    // Developer Logs (Persistent)
    getDevLogs: async () => {
        const res = await fetch(`${API_URL}/dev-logs`, { credentials: 'include' });
        return handleResponse(res);
    },
    saveDevLog: async (log) => {
        const res = await fetch(`${API_URL}/dev-logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(log)
        });
        return handleResponse(res);
    },
    clearDevLogs: async () => {
        const res = await fetch(`${API_URL}/dev-logs`, { method: 'DELETE', credentials: 'include' });
        return handleResponse(res);
    },

    // System Version & Controls
    getVersion: async () => {
        const res = await fetch(`${API_URL}/version`);
        if (res.ok) return res.json();
        return { version: null };
    },
    triggerReload: async () => {
        const res = await fetch(`${API_URL}/trigger-reload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        return handleResponse(res);
    },

    // Sammel-Event (Collection Competition)
    getSammelConfig: async () => {
        const res = await fetch(`${API_URL}/sammel-event/config`, { credentials: 'include' });
        return handleResponse(res);
    },
    getSammelSettings: async () => {
        const res = await fetch(`${API_URL}/sammel-event/settings`, { credentials: 'include' });
        return handleResponse(res);
    },
    updateSammelSettings: async (data) => {
        const res = await fetch(`${API_URL}/sammel-event/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },
    saveSammelProducts: async (products) => {
        const res = await fetch(`${API_URL}/sammel-event/config/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ products })
        });
        return handleResponse(res);
    },
    getSammelTeams: async () => {
        const res = await fetch(`${API_URL}/sammel-event/teams`, { credentials: 'include' });
        return handleResponse(res);
    },
    createSammelTeam: async (data) => {
        const res = await fetch(`${API_URL}/sammel-event/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },
    updateSammelTeam: async (id, data) => {
        const res = await fetch(`${API_URL}/sammel-event/teams/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },
    deleteSammelTeam: async (id) => {
        const res = await fetch(`${API_URL}/sammel-event/teams/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        return handleResponse(res);
    },
    addSammelTeamMember: async (teamId, employeeName) => {
        const res = await fetch(`${API_URL}/sammel-event/teams/${teamId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ employee_name: employeeName })
        });
        return handleResponse(res);
    },
    removeSammelTeamMember: async (memberId) => {
        const res = await fetch(`${API_URL}/sammel-event/members/${memberId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        return handleResponse(res);
    },
    getSammelEntries: async () => {
        const res = await fetch(`${API_URL}/sammel-event/entries`, { credentials: 'include' });
        return handleResponse(res);
    },
    createSammelEntry: async (data) => {
        const res = await fetch(`${API_URL}/sammel-event/entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },
    deleteSammelEntry: async (id) => {
        const res = await fetch(`${API_URL}/sammel-event/entries/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        return handleResponse(res);
    },
    getSammelStats: async () => {
        const res = await fetch(`${API_URL}/sammel-event/stats`, { credentials: 'include' });
        return handleResponse(res);
    }
};
