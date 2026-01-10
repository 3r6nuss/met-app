/**
 * @deprecated Use './prices.js' instead, which exports priceData from initialPrices.
 * This file is kept for backward compatibility only.
 */

import { initialPrices } from './initialPrices';

// Re-export as priceList for backward compatibility
export const priceList = initialPrices;

console.warn('priceList.js is deprecated. Please import from prices.js instead.');
