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
    broadcast({
        type: 'DISCORD_LOG',
        data: {
            id: discordLog.id,
            discordMessageId: discordLog.discord_message_id,
            parsedType: discordLog.parsed_type,
            employeeName: discordLog.employee_name,
            customerName: discordLog.customer_name,
            amount: discordLog.amount,
            reason: discordLog.reason,
            logTimestamp: discordLog.log_timestamp,
            createdAt: discordLog.created_at
        }
    });
}

export default { initBroadcaster, broadcast, broadcastDiscordLog };
