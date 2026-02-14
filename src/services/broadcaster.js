/**
 * WebSocket Broadcaster Service
 * Centralized WebSocket messaging for real-time updates
 */

let wss = null;

/**
 * Initialize the broadcaster with the WebSocket server
 */
export function initBroadcaster(webSocketServer) {
    wss = webSocketServer;
    console.log('[Broadcaster] Initialized');
}

/**
 * Broadcast a message to all connected clients
 */
export function broadcast(message) {
    if (!wss) {
        console.warn('[Broadcaster] WebSocket server not initialized');
        return;
    }

    const msgString = typeof message === 'string' ? message : JSON.stringify(message);

    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(msgString);
        }
    });
}

/**
 * Broadcast a Discord log confirmation request to clients
 * Only the client matching the employee name should show the popup
 */
export function broadcastDiscordLog(discordLog) {
    // Handle both snake_case (from DB) and camelCase (from code)
    const data = {
        id: discordLog.id,
        discordMessageId: discordLog.discord_message_id || discordLog.discordMessageId,
        parsedType: discordLog.parsed_type || discordLog.parsedType,
        employeeName: discordLog.employee_name || discordLog.employeeName,
        customerName: discordLog.customer_name || discordLog.customerName,
        amount: discordLog.amount,
        reason: discordLog.reason,
        logTimestamp: discordLog.log_timestamp || discordLog.logTimestamp,
        createdAt: discordLog.created_at || discordLog.createdAt
    };

    // Include suggested transaction if present (for auto-match)
    if (discordLog.suggestedTransaction) {
        data.suggestedTransaction = discordLog.suggestedTransaction;
    }

    broadcast({ type: 'DISCORD_LOG', data });
}

export default { initBroadcaster, broadcast, broadcastDiscordLog };
