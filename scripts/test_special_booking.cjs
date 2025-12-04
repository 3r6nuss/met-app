// const fetch = require('node-fetch'); // Native fetch in Node 18+

const API_URL = 'http://localhost:3001/api';

async function testSpecialBooking() {
    console.log("Testing Special Booking...");

    // 1. Create Special Booking
    const booking = {
        type: 'in',
        category: 'internal',
        itemId: null,
        itemName: 'Test Bonus',
        quantity: 1,
        depositor: 'TestEmployee',
        price: 100,
        skipInventory: true
    };

    try {
        const res = await fetch(`${API_URL}/transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        });
        const data = await res.json();

        if (data.success) {
            console.log("✅ Transaction successful");
        } else {
            console.error("❌ Transaction failed:", data.error);
            return;
        }

        // 2. Verify Log
        const logsRes = await fetch(`${API_URL}/logs`);
        const logs = await logsRes.json();
        const entry = logs.find(l => l.itemName === 'Test Bonus' && l.depositor === 'TestEmployee');

        if (entry) {
            console.log("✅ Log entry found:", entry.msg);
            if (entry.price === 100) {
                console.log("✅ Price correct: 100");
            } else {
                console.error("❌ Price incorrect:", entry.price);
            }
        } else {
            console.error("❌ Log entry not found");
        }

        // 3. Verify Inventory (Should NOT have 'Test Bonus')
        const invRes = await fetch(`${API_URL}/inventory`);
        const inventory = await invRes.json();
        const item = inventory.find(i => i.name === 'Test Bonus');

        if (!item) {
            console.log("✅ Inventory correct: 'Test Bonus' not found");
        } else {
            console.error("❌ Inventory incorrect: 'Test Bonus' found!");
        }

    } catch (err) {
        console.error("Test failed:", err);
    }
}

testSpecialBooking();
