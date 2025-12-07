
const logs = [
    // Past week log (Debt) - 2 days ago
    { id: 1, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), depositor: 'Max', itemName: 'Work', price: 100, quantity: 1, category: 'internal', type: 'in' },

    // The "Outstanding Payout" (Backdated to just before current week)
    // We need to simulate the exact logic of the component
];

function testLogic() {
    // 1. Determine Current Week Start (Saturday)
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 6=Sat
    const diff = day === 6 ? 0 : -(day + 1);
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() + diff);
    currentWeekStart.setHours(0, 0, 0, 0);

    console.log('Current Week Start:', currentWeekStart.toISOString());

    // Create a payout log that matches the component's logic
    const payoutDate = new Date(currentWeekStart);
    payoutDate.setSeconds(payoutDate.getSeconds() - 1);

    const payoutLog = {
        id: 2,
        timestamp: payoutDate.toISOString(),
        depositor: 'Max',
        itemName: 'Auszahlung',
        msg: 'Wochenlohn Auszahlung (Offen)',
        price: -100,
        quantity: 1,
        category: 'internal',
        type: 'in'
    };

    // Add payout to logs
    const allLogs = [...logs, payoutLog];

    // 2. Split Logs
    const currentLogs = [];
    const pastLogs = [];

    allLogs.forEach(log => {
        const date = new Date(log.timestamp);
        if (date >= currentWeekStart) {
            currentLogs.push(log);
        } else {
            pastLogs.push(log);
        }
    });

    console.log('Past Logs Count:', pastLogs.length);
    pastLogs.forEach(l => console.log('Past:', l.timestamp, l.itemName, l.price));

    // 3. Calculate Outstanding Data
    const groups = {};
    // Calculate 7 days before current week start
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    console.log('Last Week Start:', lastWeekStart.toISOString());

    pastLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return log.category !== 'trade' && logDate >= lastWeekStart;
    }).forEach(log => {
        if (!groups[log.depositor]) groups[log.depositor] = 0;
        const value = (log.price || 0) * (log.quantity || 0);
        groups[log.depositor] += value;
    });

    console.log('Outstanding Groups:', groups);
}

testLogic();
