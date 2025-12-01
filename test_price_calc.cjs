const { recipes } = require('./src/data/recipes');
const { initialPrices } = require('./src/data/initialPrices');
const { initialInventory } = require('./src/data/initialData');

// Mock inventory and prices
const inventory = initialInventory;
const prices = initialPrices;

const calculateRecursiveWage = (itemId) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return 0;

    const priceItem = prices.find(p => p.name === item.name);
    const baseWage = priceItem ? (parseFloat(priceItem.lohn?.toString().split('/')[0]) || 0) : 0;

    const recipe = recipes[itemId];
    if (!recipe) return baseWage;

    let ingredientWage = 0;
    recipe.inputs.forEach(input => {
        const inputItem = inventory.find(i => i.name === input.name);
        if (inputItem) {
            const inputUnitWage = calculateRecursiveWage(inputItem.id);
            const qtyNeeded = input.quantity / recipe.output;
            ingredientWage += inputUnitWage * qtyNeeded;
        }
    });

    return baseWage + ingredientWage;
};

console.log("Testing Recursive Price Calculation...");

// Test Case 1: Pistol Clip (ID 7)
// Base: 100 (from initialPrices.js, note: prices.js had 150 but initialPrices has 100)
// Recipe: 5 Stahl + 25 S-Pulver -> 1 Clip
// Stahl (ID 6): Base 80. Recipe: 4 Eisen + 2 Kohle -> 2 Stahl.
// Eisen (ID 5): Base 10.
// Kohle (ID 3): Base 10.
// S-Pulver (ID 4): Base 15.

// Stahl Cost:
// Base: 80
// Ingredients per 1 Stahl: 2 Eisen (2*10=20) + 1 Kohle (1*10=10) = 30.
// Total Stahl Unit Cost = 80 + 30 = 110.

// Pistol Clip Cost:
// Base: 100
// Ingredients:
// 5 Stahl * 110 = 550.
// 25 S-Pulver * 15 = 375.
// Total = 100 + 550 + 375 = 1025.

const pistolClipId = 7;
const calculated = calculateRecursiveWage(pistolClipId);
console.log(`Pistol Clip Calculated Wage: ${calculated}`);
console.log(`Expected: 1025`);

if (calculated === 1025) {
    console.log("SUCCESS");
} else {
    console.log("FAILURE");
}
