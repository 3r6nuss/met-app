/**
 * Consolidated Price Data
 * 
 * This is the single source of truth for price information.
 * Other files (prices.js, priceList.js) should be deprecated in favor of this.
 * 
 * Note: Live prices are fetched from the API (/api/prices), this file
 * contains fallback/initial data only.
 */

// Re-export from initialPrices as the primary source
export { initialPrices as priceData } from './initialPrices';

// Legacy exports for backward compatibility
// TODO: Update imports throughout the codebase to use priceData directly
export { initialPrices } from './initialPrices';

/**
 * Price lookup helpers
 */
export const getPriceByName = (prices, name) => {
    return prices.find(p => p.name === name);
};

export const getEKPrice = (prices, name) => {
    const item = getPriceByName(prices, name);
    return item?.ek || 0;
};

export const getVKPrice = (prices, name) => {
    const item = getPriceByName(prices, name);
    return item?.vk || 0;
};

export const getLohn = (prices, name) => {
    const item = getPriceByName(prices, name);
    if (!item?.lohn || item.lohn === '-') return 0;
    // Handle range format like "50/80" - return max value
    const parts = item.lohn.toString().split('/');
    return Math.max(...parts.map(p => parseFloat(p) || 0));
};
