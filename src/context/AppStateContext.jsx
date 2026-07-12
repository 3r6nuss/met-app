import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useDeveloperConsole } from './DeveloperConsoleContext';

const AppStateContext = createContext(null);

export function useAppState() {
    const ctx = useContext(AppStateContext);
    if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
    return ctx;
}

export function AppStateProvider({ children }) {
    // ─── Core Data State ───────────────────────────────────────────────
    const [inventory, setInventory] = useState([]);
    const [logs, setLogs] = useState([]); // Activity logs (short term)
    const [transactionLogs, setTransactionLogs] = useState([]); // Full history
    const [employees, setEmployees] = useState([]);
    const [employeeInventory, setEmployeeInventory] = useState([]);
    const [prices, setPrices] = useState([]);
    const [orders, setOrders] = useState([]);
    const [_personnel, setPersonnel] = useState([]);

    // ─── App State ─────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('idle');
    const [user, setUser] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [showReloadModal, setShowReloadModal] = useState(false);
    const [version, setVersion] = useState(null);
    const currentVersionRef = useRef(null);
    const retryCount = useRef(0);

    // ─── Discord Confirmation Modal State ──────────────────────────────
    const [pendingDiscordLog, setPendingDiscordLog] = useState(null);
    const [recentTransactions, setRecentTransactions] = useState([]);

    const { log } = useDeveloperConsole();

    // ─── Fetch Data Helper ─────────────────────────────────────────────
    const fetchData = (reason = 'Manual/Initial') => {
        return Promise.all([
            api.getInventory(),
            api.getLogs(),
            api.getEmployees(),
            api.getEmployeeInventory(),
            api.getPrices(),
            api.getOrders(),
            api.getPersonnel()
        ])
            .then(([invData, logsData, empData, empInvData, priceData, ordersData, personnelData]) => {
                setInventory(invData);
                setTransactionLogs(logsData);
                setEmployees(empData);
                setEmployeeInventory(empInvData);
                setPrices(priceData);
                setOrders(ordersData || []);
                setPersonnel(personnelData || []);
                log('API', `Data Refreshed (${reason})`, { items: invData.length, logs: logsData.length });
            })
            .catch(err => {
                console.error("Failed to fetch data:", err);
                log('ERROR', `Failed to fetch data (${reason})`, err);
            });
    };

    // ─── Authenticate Before Loading Internal Data ─────────────────────
    useEffect(() => {
        let isMounted = true;

        api.getUser()
            .then(userData => {
                if (!isMounted) return;

                setUser(userData);
                if (!userData || userData.role === 'Pending') return;

                return fetchData();
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, []);

    // ─── Version Check For Authenticated Users ─────────────────────────
    useEffect(() => {
        if (!user || user.role === 'Pending') return undefined;

        api.getVersion().then(data => {
            if (data && data.version) {
                currentVersionRef.current = data.version;
                setVersion(data.version);
            }
        });

        const versionInterval = setInterval(() => {
            api.getVersion().then(data => {
                if (data && data.version && currentVersionRef.current && data.version !== currentVersionRef.current) {
                    console.log("New version detected:", data.version);
                    setShowReloadModal(true);
                }
            });
        }, 60 * 60 * 1000);

        return () => clearInterval(versionInterval);
    }, [user]);

    // ─── WebSocket Connection ──────────────────────────────────────────
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    useEffect(() => {
        if (!user || user.role === 'Pending') return undefined;

        let ws;
        let reconnectTimer;
        let isMounted = true;

        const connect = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.port === '5173'
                ? 'localhost:3001'
                : window.location.host;

            const wsUrl = `${protocol}//${host}`;
            console.log("Connecting to WebSocket:", wsUrl);
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                if (!isMounted) { ws.close(); return; }
                console.log("WebSocket connected");
                setIsConnected(true);
                retryCount.current = 0;
                log('WS', 'Connected', { url: wsUrl });
            };

            ws.onmessage = (event) => {
                if (!isMounted) return;
                try {
                    const data = JSON.parse(event.data);
                    log('WS', 'Message received', data);
                    if (data.type === 'UPDATE') {
                        console.log("Received update signal, refreshing data...");
                        fetchData('WebSocket Update');
                    } else if (data.type === 'RELOAD') {
                        console.log("Generic Force Reload triggered");
                        setShowReloadModal(true);
                    } else if (data.type === 'DISCORD_LOG' && data.data) {
                        const discordLog = data.data;
                        const currentUser = userRef.current;

                        console.log("[WS] Discord log received:", discordLog);
                        console.log("[WS] Current User:", currentUser);

                        if (currentUser && currentUser.employeeName && discordLog.employeeName) {
                            const userNameLower = currentUser.employeeName.toLowerCase();
                            const logNameLower = discordLog.employeeName.toLowerCase();

                            console.log(`[WS] Checking match: '${logNameLower}' vs '${userNameLower}'`);

                            if (logNameLower.includes(userNameLower) || userNameLower.includes(logNameLower)) {
                                console.log("[WS] Discord log matches current user, showing confirmation modal");

                                api.getMyRecentTransactions()
                                    .then(data => {
                                        setRecentTransactions(data.transactions || []);
                                        setPendingDiscordLog(discordLog);
                                    })
                                    .catch(err => console.error("Error fetching transactions:", err));
                            } else {
                                console.log("[WS] Name mismatch - popup not shown");
                            }
                        } else {
                            console.log("[WS] User or employeeName missing, or log name missing");
                        }
                    }
                } catch (e) {
                    console.error("Error parsing WS message:", e);
                    log('ERROR', 'WS Message Parse Error', e);
                }
            };

            ws.onclose = () => {
                if (!isMounted) return;
                setIsConnected(false);
                const delay = Math.min(500 * (2 ** retryCount.current), 2000);
                console.log(`WebSocket disconnected. Reconnecting in ${delay}ms... (Attempt ${retryCount.current + 1})`);
                log('WS', 'Disconnected', { reconnectIn: delay });
                retryCount.current += 1;
                reconnectTimer = setTimeout(connect, delay);
            };

            ws.onerror = (err) => {
                if (!isMounted) return;
                console.error("WebSocket error:", err);
                log('ERROR', 'WebSocket Error', err);
                ws.close();
            };
        };

        connect();

        return () => {
            isMounted = false;
            if (ws) ws.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, [user]);

    // ─── Save Helpers ──────────────────────────────────────────────────
    const saveInventory = (newData) => {
        setInventory(newData);
        setSaveStatus('saving');
        log('STATE', 'Saving Inventory...', { count: newData.length });

        api.saveInventory(newData)
            .then(() => {
                setSaveStatus('saved');
                log('API', 'Inventory Saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            })
            .catch(err => {
                console.error("Failed to save:", err);
                setSaveStatus('error');
                log('ERROR', 'Inventory Save Failed', err);
            });
    };

    const saveLogEntry = (entry) => {
        const newLog = { ...entry, timestamp: entry.timestamp || new Date().toISOString() };
        setTransactionLogs(prev => [newLog, ...prev]);
        api.saveLog(newLog).catch(err => console.error("Failed to save log:", err));
    };

    const addLog = (msg) => {
        const logEntry = { id: Date.now(), msg, time: new Date().toLocaleTimeString() };
        setLogs(prev => [logEntry, ...prev].slice(0, 5));
    };

    // ─── Transaction Handlers ─────────────────────────────────────────
    const handleCheckIn = (idOrData, quantity, depositor, price = 0, customDate = null, _type = 'in', category = 'internal', warningIgnored = false, skipInventory = false, transactionId = null) => {
        let payload;
        let logDetail = null;

        if (Array.isArray(idOrData)) {
            payload = idOrData.map(item => ({
                type: 'in',
                category: item.category || 'internal',
                itemId: item.id,
                quantity: item.quantity,
                depositor: item.depositor || 'Unbekannt',
                price: item.price,
                timestamp: item.date,
                warningIgnored: item.warningIgnored,
                skipInventory: item.skipInventory,
                transactionId: item.transactionId
            }));
            logDetail = {
                mode: 'Batch',
                count: idOrData.length,
                items: idOrData.map(i => {
                    const invItem = inventory.find(inv => inv.id === i.id);
                    return {
                        id: i.id,
                        name: invItem ? invItem.name : 'Unknown',
                        added: i.quantity,
                        oldStock: invItem ? invItem.current : '?',
                        newStock: invItem ? (invItem.current + i.quantity) : '?'
                    };
                })
            };
        } else {
            const item = inventory.find(i => i.id === idOrData);
            if (!item) return;

            payload = {
                type: 'in',
                category,
                itemId: idOrData,
                quantity,
                depositor: depositor || 'Unbekannt',
                price,
                timestamp: customDate,
                warningIgnored,
                skipInventory,
                transactionId
            };

            logDetail = {
                mode: 'Single',
                id: item.id,
                name: item.name,
                category,
                depositor,
                added: quantity,
                price: price,
                oldStock: item.current,
                newStock: item.current + quantity
            };
        }

        api.performTransaction(payload)
            .then(data => {
                if (data.success) {
                    fetchData('Transaction: Check-In');
                    log('TX', `Check-In Success (${category})`, logDetail);

                    if (Array.isArray(idOrData)) {
                        addLog(`${skipInventory ? '[PROTOKOLL] ' : ''}Batch Einlagerung: ${idOrData.length} Items`);
                    } else {
                        const item = inventory.find(i => i.id === idOrData);
                        addLog(`${skipInventory ? '[PROTOKOLL] ' : ''}Eingelagert: ${quantity}x ${item.name} (${depositor || 'Unbekannt'})`);
                    }
                } else {
                    console.error("Transaction failed:", data.error);
                    alert("Fehler bei der Transaktion: " + data.error);
                    log('ERROR', 'Check-In Transaction Failed', { error: data.error, payload });
                }
            })
            .catch(err => {
                console.error("Transaction error:", err);
                alert("Netzwerkfehler bei der Transaktion");
                log('ERROR', 'Check-In Network Error', err);
            });
    };

    const handleCheckOut = (idOrData, quantity, depositor, price = 0, customDate = null, _type = 'out', category = 'internal', _warningIgnored = false, skipInventory = false, transactionId = null) => {
        let payload;
        let logDetail = null;

        if (Array.isArray(idOrData)) {
            payload = idOrData.map(item => ({
                type: 'out',
                category: item.category || 'internal',
                itemId: item.id,
                quantity: item.quantity,
                depositor: item.depositor || 'Unbekannt',
                price: item.price,
                timestamp: item.date,
                skipInventory: item.skipInventory,
                transactionId: item.transactionId
            }));
            logDetail = {
                mode: 'Batch',
                count: idOrData.length,
                items: idOrData.map(i => {
                    const invItem = inventory.find(inv => inv.id === i.id);
                    return {
                        id: i.id,
                        name: invItem ? invItem.name : 'Unknown',
                        removed: i.quantity,
                        oldStock: invItem ? invItem.current : '?',
                        newStock: invItem ? (invItem.current - i.quantity) : '?'
                    };
                })
            };
        } else {
            const item = inventory.find(i => i.id === idOrData);
            if (!item) return;

            payload = {
                type: 'out',
                category,
                itemId: idOrData,
                quantity,
                depositor: depositor || 'Unbekannt',
                price,
                timestamp: customDate,
                skipInventory,
                transactionId
            };

            logDetail = {
                mode: 'Single',
                id: item.id,
                name: item.name,
                category,
                depositor,
                removed: quantity,
                price: price,
                oldStock: item.current,
                newStock: item.current - quantity
            };
        }

        api.performTransaction(payload)
            .then(data => {
                if (data.success) {
                    fetchData('Transaction: Check-Out');
                    log('TX', `Check-Out Success (${category})`, logDetail);

                    if (Array.isArray(idOrData)) {
                        addLog(`${skipInventory ? '[PROTOKOLL] ' : ''}Batch Auslagerung: ${idOrData.length} Items`);
                    } else {
                        const item = inventory.find(i => i.id === idOrData);
                        addLog(`${skipInventory ? '[PROTOKOLL] ' : ''}Ausgelagert: ${quantity}x ${item.name} (${depositor || 'Unbekannt'})`);
                    }
                } else {
                    console.error("Transaction failed:", data.error);
                    alert("Fehler bei der Transaktion: " + data.error);
                    log('ERROR', 'Check-Out Transaction Failed', { error: data.error, payload });
                }
            })
            .catch(err => {
                console.error("Transaction error:", err);
                alert("Netzwerkfehler bei der Transaktion");
                log('ERROR', 'Check-Out Network Error', err);
            });
    };

    // ─── Inventory Handlers ────────────────────────────────────────────
    const handleUpdateStock = (id, newQuantity) => {
        const oldItem = inventory.find(i => i.id === id);
        if (oldItem) {
            log('STATE', 'Update Stock', {
                id, name: oldItem.name, old: oldItem.current, new: newQuantity, diff: newQuantity - oldItem.current
            });
        } else {
            log('STATE', 'Update Stock', { id, newQuantity });
        }

        const newData = inventory.map(item => item.id === id ? { ...item, current: newQuantity } : item);
        saveInventory(newData);
    };

    const handleUpdateTarget = (id, newTarget) => {
        const oldItem = inventory.find(i => i.id === id);
        if (oldItem) {
            log('STATE', 'Update Target Stock', {
                id, name: oldItem.name, old: oldItem.target, new: newTarget, diff: newTarget - oldItem.target
            });
        } else {
            log('STATE', 'Update Target Stock', { id, newTarget });
        }

        const newData = inventory.map(item => item.id === id ? { ...item, target: newTarget } : item);
        saveInventory(newData);
    };

    const handleReorder = (newInventory) => {
        log('STATE', 'Reorder Inventory');
        saveInventory(newInventory);
    };

    const handleVerify = (name) => {
        const verificationEntry = {
            verifier: name,
            timestamp: new Date().toISOString(),
            snapshot: inventory
        };

        api.saveVerification(verificationEntry)
            .then(() => {
                addLog(`Lagerliste bestätigt von ${name}`);
                log('TX', 'Verification Saved', { verifier: name });
            })
            .catch(err => {
                console.error("Failed to save verification:", err);
                log('ERROR', 'Verification Save Failed', err);
            });
    };

    const handleReset = () => {
        if (confirm("Wirklich alles zurücksetzen?")) {
            api.resetDatabase()
                .then(data => {
                    setInventory(data);
                    setTransactionLogs([]);
                    api.getEmployees().then(setEmployees);
                    addLog("Datenbank zurückgesetzt");
                });
        }
    };

    // ─── Employee Handlers ─────────────────────────────────────────────
    const handleUpdateEmployees = (newEmployees) => {
        const changes = { added: [], removed: [], modified: [] };

        newEmployees.forEach(newEmp => {
            const oldEmp = employees.find(e => e.id === newEmp.id || e.name === newEmp.name);
            if (!oldEmp) {
                changes.added.push(newEmp.name);
            } else if (JSON.stringify(newEmp) !== JSON.stringify(oldEmp)) {
                if (newEmp.status !== oldEmp.status) {
                    changes.modified.push({ name: newEmp.name, field: 'status', old: oldEmp.status, new: newEmp.status });
                }
                if (newEmp.role !== oldEmp.role) {
                    changes.modified.push({ name: newEmp.name, field: 'role', old: oldEmp.role, new: newEmp.role });
                }
            }
        });

        employees.forEach(oldEmp => {
            if (!newEmployees.find(e => e.id === oldEmp.id || e.name === oldEmp.name)) {
                changes.removed.push(oldEmp.name);
            }
        });

        if (changes.added.length || changes.removed.length || changes.modified.length) {
            log('STATE', 'Employee List Updated', changes);
        }

        setEmployees(newEmployees);
        api.saveEmployees(newEmployees).catch(err => console.error("Failed to save employees:", err));
    };

    // ─── Log Handlers ─────────────────────────────────────────────────
    const handleDeleteLog = (timestamp) => {
        if (confirm("Eintrag wirklich löschen?")) {
            api.deleteLog(timestamp)
                .then(data => {
                    if (data.success) {
                        fetchData('Log Deleted');
                        addLog("Eintrag gelöscht");
                        log('TX', 'Log Deleted', { timestamp });
                    } else {
                        alert("Fehler beim Löschen: " + data.error);
                        log('ERROR', 'Delete Log Failed', data.error);
                    }
                })
                .catch(err => {
                    alert("Netzwerkfehler");
                    log('ERROR', 'Delete Log Network Error', err);
                });
        }
    };

    // ─── Order Handlers ────────────────────────────────────────────────
    const handleCreateOrder = (orderData) => {
        api.createOrder(orderData)
            .then(data => {
                if (data.success) {
                    fetchData('Order Created');
                    addLog(`Neuer Auftrag: ${orderData.quantity}x ${orderData.itemName}`);
                    log('TX', 'Order Created', orderData);
                    alert("Auftrag erfolgreich erstellt!");
                } else {
                    alert("Fehler beim Erstellen des Auftrags");
                }
            })
            .catch(_err => alert("Netzwerkfehler"));
    };

    const handleUpdateOrderStatus = (id, status) => {
        const order = orders.find(o => o.id === id);
        if (order) {
            log('STATE', 'Update Order Status', {
                id, item: order.itemName, customer: order.customerName, old: order.status, new: status
            });
        }

        api.updateOrderStatus(id, status)
            .then(data => {
                if (data.success) fetchData('Order Status Updated');
            });
    };

    const handleDeleteOrder = (id) => {
        if (confirm("Auftrag wirklich löschen?")) {
            api.deleteOrder(id)
                .then(data => {
                    if (data.success) fetchData('Order Deleted');
                });
        }
    };

    // ─── Special Booking ───────────────────────────────────────────────
    const handleSpecialBooking = ({ employee, reason, amount }) => {
        api.performTransaction({
            type: 'in',
            category: 'internal',
            itemId: null,
            itemName: reason,
            quantity: 1,
            depositor: employee,
            price: amount,
            skipInventory: true
        })
            .then(data => {
                if (data.success) {
                    fetchData('Special Booking');
                    addLog(`Sonderbuchung: ${amount}€ für ${employee} (${reason})`);
                    log('TX', 'Special Booking', { employee, reason, amount });
                    alert("Sonderbuchung erfolgreich!");
                } else {
                    alert("Fehler: " + data.error);
                }
            })
            .catch(_err => alert("Netzwerkfehler"));
    };

    // ─── Ingredient Consumption ────────────────────────────────────────
    const handleConsumeIngredients = (employeeName, items) => {
        log('STATE', 'Consuming Ingredients (Employee)', { employee: employeeName, items });
        return api.consumeIngredients(employeeName, items)
            .then(data => {
                if (data.success) {
                    fetchData('Ingredients Consumed');
                    log('TX', 'Consumption Success', { employee: employeeName, count: items.length });
                    return { success: true };
                } else {
                    log('ERROR', 'Consumption Failed', data.error);
                    return { success: false, error: data.error };
                }
            })
            .catch(err => {
                log('ERROR', 'Consumption Network Error', err);
                return { success: false, error: "Netzwerkfehler" };
            });
    };

    // ─── Employee Payout ───────────────────────────────────────────────
    const handleEmployeePayout = (amountOrBatch, date, depositor) => {
        if (Array.isArray(amountOrBatch)) {
            amountOrBatch.forEach(({ amount, date, depositor }) => {
                let uniqueDateStr = null;
                if (date) {
                    const uniqueDate = new Date(date.getTime() - Math.floor(Math.random() * 10000));
                    uniqueDateStr = uniqueDate.toISOString();
                }
                const entry = {
                    msg: 'Wochenlohn Auszahlung (Offen)',
                    price: -amount,
                    quantity: 1,
                    category: 'internal',
                    timestamp: uniqueDateStr,
                    depositor: depositor || 'Buchhaltung',
                    itemName: 'Auszahlung',
                    type: 'in',
                    time: date ? date.toLocaleTimeString() : new Date().toLocaleTimeString()
                };
                saveLogEntry(entry);
            });
            addLog(`${amountOrBatch.length} offene Wochenlöhne ausgezahlt`);
            log('TX', 'Batch Payout', { count: amountOrBatch.length });
        } else {
            const entry = {
                msg: 'Wochenlohn Auszahlung',
                price: -amountOrBatch,
                quantity: 1,
                category: 'internal',
                timestamp: date ? date.toISOString() : null,
                depositor: depositor || user?.username || 'Buchhaltung',
                itemName: 'Auszahlung'
            };
            saveLogEntry(entry);
            addLog(`Wochenlohn ausgezahlt: ${amountOrBatch}€ (${depositor})`);
            log('TX', 'Single Payout', { amount: amountOrBatch, depositor });
        }
    };

    // ─── Context Value ─────────────────────────────────────────────────
    const value = {
        // Data
        inventory,
        logs,
        transactionLogs,
        employees,
        employeeInventory,
        prices,
        orders,
        user,

        // UI State
        loading,
        saveStatus,
        isConnected,
        showReloadModal,
        version,

        // Discord
        pendingDiscordLog,
        setPendingDiscordLog,
        recentTransactions,
        setRecentTransactions,

        // Handlers
        fetchData,
        handleCheckIn,
        handleCheckOut,
        handleUpdateStock,
        handleUpdateTarget,
        handleReorder,
        handleVerify,
        handleReset,
        handleUpdateEmployees,
        handleDeleteLog,
        addLog,
        handleCreateOrder,
        handleUpdateOrderStatus,
        handleDeleteOrder,
        handleSpecialBooking,
        handleConsumeIngredients,
        handleEmployeePayout,
    };

    return (
        <AppStateContext.Provider value={value}>
            {children}
        </AppStateContext.Provider>
    );
}

export default AppStateContext;
