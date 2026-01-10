import { useEffect, useRef } from 'react';
import { useDeveloperConsole } from '../context/DeveloperConsoleContext';

/**
 * Custom hook for WebSocket connection with automatic reconnection.
 * 
 * @param {Function} onUpdate - Callback when update signal is received
 * @param {object} options - Connection options
 * @returns {object} { reconnect }
 */
export function useWebSocket(onUpdate, options = {}) {
    const {
        reconnectDelay = 3000,
        maxReconnectAttempts = 10
    } = options;

    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const onUpdateRef = useRef(onUpdate);
    const { log } = useDeveloperConsole();

    // Keep onUpdate ref current
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        const connect = () => {
            // Determine WS URL (wss if https, ws if http)
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // If dev (port 5173), connect to 3001. If prod (same port), use window.location.host
            const host = window.location.port === '5173'
                ? 'localhost:3001'
                : window.location.host;

            const wsUrl = `${protocol}//${host}`;

            console.log("Connecting to WebSocket:", wsUrl);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("WebSocket connected");
                log('WS', 'Connected', { url: wsUrl });
                reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    log('WS', 'Message received', data);
                    if (data.type === 'UPDATE') {
                        console.log("Received update signal, refreshing data...");
                        if (onUpdateRef.current) onUpdateRef.current('WebSocket Update');
                    }
                } catch (e) {
                    console.error("Error parsing WS message:", e);
                    log('ERROR', 'WS Message Parse Error', e);
                }
            };

            ws.onclose = () => {
                console.log("WebSocket disconnected");
                log('WS', 'Disconnected', { reconnectIn: reconnectDelay });

                // Auto-reconnect with exponential backoff
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    const delay = reconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current);
                    reconnectAttemptsRef.current++;
                    log('WS', 'Scheduling reconnect', { attempt: reconnectAttemptsRef.current, delay });
                    reconnectTimerRef.current = setTimeout(connect, Math.min(delay, 30000));
                } else {
                    log('ERROR', 'Max reconnect attempts reached', { attempts: maxReconnectAttempts });
                }
            };

            ws.onerror = (err) => {
                console.error("WebSocket error:", err);
                log('ERROR', 'WebSocket Error', err);
                ws.close();
            };
        };

        connect();

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };
    }, [reconnectDelay, maxReconnectAttempts, log]);

    // Manual reconnect function
    const reconnect = () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        reconnectAttemptsRef.current = 0;
        // Will auto-reconnect via onclose handler
    };

    return { reconnect };
}

export default useWebSocket;
