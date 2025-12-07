
const logs = [
    // Current week logs (Saturday onwards)
    { id: 1, timestamp: '2025-12-06T10:00:00.000Z', depositor: 'Max', itemName: 'Item A', price: 10, quantity: 1, category: 'internal', type: 'in' },
    { id: 2, timestamp: '2025-12-06T12:00:00.000Z', depositor: 'Max', itemName: 'Item B', price: 20, quantity: 1, category: 'internal', type: 'in' },

    // The "Outstanding Payout" (Backdated to Friday 23:59:59)
    // Assuming Current Week Start is Sat Dec 06 2025 00:00:00 Local Time
    // If Local is UTC+1, then 00:00 Local is Dec 05 23:00 UTC.
    // Payout is -1 second => Dec 05 23:59:59 Local => Dec 05 22:59:59 UTC.
    { id: 3, timestamp: '2025-12-05T22:59:59.000Z', depositor: 'Max', itemName: 'Auszahlung', price: -50, quantity: 1, category: 'internal', type: 'in' }
];

// Mocking the Component Logic
function testLogic() {
    // 1. Determine Current Week Start (Saturday)
    // Hardcoding "Now" to be Sunday Dec 07 2025
    const now = new Date('2025-12-07T15:00:00.000Z'); // Sunday
    const day = now.getDay(); // 0 (Sunday)
    const diff = day === 6 ? 0 : -(day + 1); // -1
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() + diff);
    currentWeekStart.setHours(0, 0, 0, 0);

    console.log('Current Week Start:', currentWeekStart.toISOString());

    // 2. Split Logs
    const currentLogs = [];
    const pastLogs = [];

    logs.forEach(log => {
        const date = new Date(log.timestamp);
        if (date >= currentWeekStart) {
            currentLogs.push(log);
        } else {
            pastLogs.push(log);
        }
    });

    console.log('Current Logs Count:', currentLogs.length);
    console.log('Past Logs Count:', pastLogs.length);
    currentLogs.forEach(l => console.log('Current:', l.timestamp, l.itemName));
    pastLogs.forEach(l => console.log('Past:', l.timestamp, l.itemName));

    // 3. Filter by Last Payout
    const lastPayouts = {};
    currentLogs.forEach(log => {
        if (log.itemName === 'Auszahlung' || (log.category === 'internal' && log.price < 0)) {
            if (!lastPayouts[log.depositor] || log.timestamp > lastPayouts[log.depositor]) {
                lastPayouts[log.depositor] = log.timestamp;
            }
        }
    });

    console.log('Last Payouts:', lastPayouts);

    const filteredLogs = currentLogs.filter(log => {
        const lastPayout = lastPayouts[log.depositor];
        if (!lastPayout) return true;
        return log.timestamp > lastPayout;
    });

    console.log('Filtered Logs (Final Result):', filteredLogs.length);
    filteredLogs.forEach(l => console.log('Visible:', l.timestamp, l.itemName));
}

testLogic();
