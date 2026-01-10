/**
 * Server-Side Logger Service
 * Writes logs to developer_logs table for Super Admin DevConsole
 */
import { getDb } from '../db/database.js';

// Log Categories
export const LogCategory = {
    TX: 'TX',           // Transactions (Check-In/Out, Buy/Sell)
    AUTH: 'AUTH',       // Login/Logout
    PRICE: 'PRICE',     // Price updates
    INVENTORY: 'STATE', // Inventory/Stock updates
    EMPLOYEE: 'STATE',  // Employee changes
    RECIPE: 'STATE',    // Recipe changes
    PROTOCOL: 'STATE',  // Protocol updates
    ERROR: 'ERROR',     // Errors
    API: 'API'          // API calls
};

/**
 * Log a message to the developer_logs table
 * @param {string} category - Log category (TX, AUTH, PRICE, etc.)
 * @param {string} message - Log message
 * @param {object|string} details - Additional details (will be JSON stringified)
 */
export const serverLog = async (category, message, details = null) => {
    try {
        const db = await getDb();
        const detailStr = details ? (typeof details === 'object' ? JSON.stringify(details) : details) : null;

        await db.run(
            'INSERT INTO developer_logs (timestamp, category, message, details) VALUES (?, ?, ?, ?)',
            new Date().toISOString(),
            category,
            message,
            detailStr
        );
    } catch (e) {
        console.error('[ServerLogger] Failed to write log:', e.message);
    }
};

/**
 * Log a transaction (Check-In/Out, Buy/Sell)
 */
export const logTransaction = async (type, itemName, quantity, depositor, category, price = null, username = null) => {
    const action = type === 'in' ? 'Einlagerung' : 'Auslagerung';
    const categoryLabel = category === 'trade' ? (type === 'in' ? 'Ankauf' : 'Verkauf') : 'Intern';

    let message = `${action} (${categoryLabel}): ${quantity}x ${itemName}`;
    if (depositor && depositor !== 'Unbekannt') {
        message += ` | MA: ${depositor}`;
    }
    if (price && category === 'trade') {
        message += ` | Preis: ${price}€`;
    }
    if (username) {
        message += ` | User: ${username}`;
    }

    await serverLog(LogCategory.TX, message, { type, itemName, quantity, depositor, category, price });
};

/**
 * Log authentication events
 */
export const logAuth = async (action, username, userId = null) => {
    const message = action === 'LOGIN' ? `Login: ${username}` : `Logout: ${username}`;
    await serverLog(LogCategory.AUTH, message, { action, username, userId });
};

/**
 * Log price updates
 */
export const logPriceUpdate = async (itemName, oldPrice, newPrice, username = null) => {
    let message = `Preis geändert: ${itemName} | ${oldPrice}€ → ${newPrice}€`;
    if (username) message += ` | User: ${username}`;
    await serverLog(LogCategory.PRICE, message, { itemName, oldPrice, newPrice });
};

/**
 * Log employee/personnel updates
 */
export const logEmployeeUpdate = async (action, employeeName, details = null, username = null) => {
    let message = `Mitarbeiter ${action}: ${employeeName}`;
    if (username) message += ` | User: ${username}`;
    await serverLog(LogCategory.EMPLOYEE, message, details);
};

/**
 * Log inventory/stock updates
 */
export const logInventoryUpdate = async (action, itemName, details = null, username = null) => {
    let message = `Inventar ${action}: ${itemName}`;
    if (username) message += ` | User: ${username}`;
    await serverLog(LogCategory.INVENTORY, message, details);
};

/**
 * Log accounting actions
 */
export const logAccounting = async (action, details = null, username = null) => {
    let message = `Buchhaltung: ${action}`;
    if (username) message += ` | User: ${username}`;
    await serverLog(LogCategory.TX, message, details);
};

/**
 * Log protocol/log deletions
 */
export const logProtocol = async (action, details = null, username = null) => {
    let message = `Protokoll: ${action}`;
    if (username) message += ` | User: ${username}`;
    await serverLog(LogCategory.PROTOCOL, message, details);
};

/**
 * Log errors
 */
export const logError = async (context, error) => {
    await serverLog(LogCategory.ERROR, `${context}: ${error.message || error}`, {
        stack: error.stack,
        context
    });
};

export default {
    serverLog,
    logTransaction,
    logAuth,
    logPriceUpdate,
    logEmployeeUpdate,
    logInventoryUpdate,
    logAccounting,
    logProtocol,
    logError,
    LogCategory
};
