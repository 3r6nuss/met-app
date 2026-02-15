
import React, { useState, useEffect, useRef } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initialInventory } from './data/initialData';
import { initialPrices as _initialPrices } from './data/initialPrices';
import Navbar from './components/Navbar';
import InventoryPage from './pages/InventoryPage';
import ActionPage from './pages/ActionPage';
import ControlPage from './pages/ControlPage';
import DailyTradeLog from './pages/protocols/DailyTradeLog';

import WeeklyProtocol from './pages/protocols/WeeklyProtocol';
import PeriodProtocol from './pages/protocols/PeriodProtocol';
import StorageProtocol from './pages/protocols/StorageProtocol';
import InternalStorageProtocol from './pages/protocols/InternalStorageProtocol';
import SystemPage from './pages/SystemPage';
import PricesPage from './pages/PricesPage';
import Login from './components/Login';
import { Activity, WifiOff } from 'lucide-react';
import UserManagement from './components/UserManagement';
import SystemAlert from './components/SystemAlert';
import ReloadModal from './components/ReloadModal';
import SpecialBookingPage from './pages/SpecialBookingPage';
import ComingSoonPage from './pages/ComingSoonPage';
import ContactsPage from './pages/ContactsPage';
import AdsPage from './pages/AdsPage';
import PartnersPage from './pages/PartnersPage';
import AnalyticsProtocol from './pages/protocols/AnalyticsProtocol';
import CashBookProtocol from './pages/protocols/CashBookProtocol';
import PayrollProtocol from './pages/protocols/PayrollProtocol';

import ProfitLossProtocol from './pages/protocols/ProfitLossProtocol';
import AccountingDashboard from './pages/protocols/AccountingDashboard';
import BackupProtocol from './pages/protocols/BackupProtocol';
import PerformanceDashboard from './pages/protocols/PerformanceDashboard';
import ProductProfitability from './pages/protocols/ProductProfitability';
import PersonnelPage from './pages/PersonnelPage';
import BeginnerGuidePage from './pages/BeginnerGuidePage';
import AuditLogPage from './pages/AuditLogPage';
import HausordnungPage from './pages/HausordnungPage';
import BelegPage from './pages/BelegPage';
import MarketingPage from './pages/MarketingPage';
import BookingHub from './pages/BookingHub';
import ProtocolsHub from './pages/ProtocolsHub';
import SonstigesHub from './pages/SonstigesHub';
import FuhrparkPage from './pages/FuhrparkPage';
import SammelEventPage from './pages/SammelEventPage';
import SammelEventConfigPage from './pages/SammelEventConfigPage';
import DiscordIntegrationPage from './pages/protocols/DiscordIntegrationPage';
import DiscordConfirmationModal from './components/DiscordConfirmationModal';

import CreateOrderForm from './components/CreateOrderForm';
import { api } from './services/api';
import { useDeveloperConsole } from './context/DeveloperConsoleContext';


function App() {
  const [inventory, setInventory] = useState(initialInventory);
  const [logs, setLogs] = useState([]); // Activity logs (short term)
  const [transactionLogs, setTransactionLogs] = useState([]); // Full history from logs.json
  const [employees, setEmployees] = useState([]); // Employee list
  const [employeeInventory, setEmployeeInventory] = useState([]); // Employee inventory
  const [prices, setPrices] = useState([]); // Price list
  const [orders, setOrders] = useState([]); // Orders
  const [_personnel, setPersonnel] = useState([]); // Personnel list (from /api/personnel)

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showReloadModal, setShowReloadModal] = useState(false);
  const [version, setVersion] = useState(null);
  const currentVersionRef = useRef(null);
  const retryCount = useRef(0);

  // Discord confirmation modal state
  const [pendingDiscordLog, setPendingDiscordLog] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const { log } = useDeveloperConsole();

  // Fetch data helper
  const fetchData = (reason = 'Manual/Initial') => {
    // Don't set loading to true on background updates to avoid flickering
    // setLoading(true); 

    Promise.all([
      api.getInventory(),
      api.getLogs(),
      api.getEmployees(),
      api.getEmployeeInventory(),
      api.getPrices(),
      api.getOrders(),
      api.getPersonnel(),
      api.getUser()
    ])
      .then(([invData, logsData, empData, empInvData, priceData, ordersData, personnelData, userData]) => {
        setInventory(invData);
        setTransactionLogs(logsData);
        setEmployees(empData);
        setEmployeeInventory(empInvData);
        setPrices(priceData);
        setOrders(ordersData || []);
        setPersonnel(personnelData || []);
        if (userData) setUser(userData); // Only update user if fetched successfully
        setLoading(false);
        log('API', `Data Refreshed (${reason})`, { items: invData.length, logs: logsData.length });
      })
      .catch(err => {
        console.error("Failed to fetch data:", err);
        setLoading(false);
        log('ERROR', `Failed to fetch data (${reason})`, err);
      });
  };

  // Initial fetch
  // Initial fetch and Version Check
  useEffect(() => {
    fetchData();

    // Initial Version Check
    api.getVersion().then(data => {
      if (data && data.version) {
        currentVersionRef.current = data.version;
        setVersion(data.version);
      }
    });

    // Hourly Version Check
    const versionInterval = setInterval(() => {
      api.getVersion().then(data => {
        if (data && data.version && currentVersionRef.current && data.version !== currentVersionRef.current) {
          console.log("New version detected:", data.version);
          setShowReloadModal(true);
        }
      });
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(versionInterval);
  }, []);

  // WebSocket Connection
  // WebSocket Connection
  const userRef = useRef(user);

  // Update user ref when user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let ws;
    let reconnectTimer;
    let isMounted = true;

    const connect = () => {
      // Determine WS URL (wss if https, ws if http)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // If dev (port 5173), connect to 3001. If prod (same port), use window.location.host
      const host = window.location.port === '5173'
        ? 'localhost:3001'
        : window.location.host;

      const wsUrl = `${protocol}//${host}`;

      console.log("Connecting to WebSocket:", wsUrl);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!isMounted) {
          ws.close();
          return;
        }
        console.log("WebSocket connected");
        setIsConnected(true);
        retryCount.current = 0; // Reset retry count on successful connection
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
            // Check if this log is for the current user
            const discordLog = data.data;
            const currentUser = userRef.current;

            console.log("[WS] Discord log received:", discordLog);
            console.log("[WS] Current User:", currentUser);

            // Match employee name with current user's employeeName
            if (currentUser && currentUser.employeeName && discordLog.employeeName) {
              const userNameLower = currentUser.employeeName.toLowerCase();
              const logNameLower = discordLog.employeeName.toLowerCase();

              console.log(`[WS] Checking match: '${logNameLower}' vs '${userNameLower}'`);

              // Check if names match (fuzzy - contains check)
              if (logNameLower.includes(userNameLower) || userNameLower.includes(logNameLower)) {
                console.log("[WS] Discord log matches current user, showing confirmation modal");

                // Fetch recent transactions for this user
                fetch('/api/discord/my-recent-transactions', { credentials: 'include' })
                  .then(res => res.json())
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

        // Exponential Backoff: 500ms, 1000ms, 2000ms (capped at 2000ms)
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
        // ws.close() will trigger onclose, where reconnect logic happens
        ws.close();
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Save data helper
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

  const handleCheckIn = (idOrData, quantity, depositor, price = 0, customDate = null, _type = 'in', category = 'internal', warningIgnored = false, skipInventory = false) => {
    let payload;
    let logDetail = null;

    if (Array.isArray(idOrData)) {
      // Batch mode
      payload = idOrData.map(item => ({
        type: 'in',
        category: item.category || 'internal',
        itemId: item.id,
        quantity: item.quantity,
        depositor: item.depositor || 'Unbekannt',
        price: item.price,
        timestamp: item.date,
        warningIgnored: item.warningIgnored,
        skipInventory: item.skipInventory
      }));
      // Prepare detailed log for batch
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
      // Single mode
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
        skipInventory
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
          // Refetch data to ensure everything is in sync (inventory, logs, employee inventory)
          fetchData('Transaction: Check-In');

          // Log detailed info
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

  const handleCheckOut = (idOrData, quantity, depositor, price = 0, customDate = null, _type = 'out', category = 'internal', _warningIgnored = false, skipInventory = false) => {
    let payload;
    let logDetail = null;

    if (Array.isArray(idOrData)) {
      // Batch mode
      payload = idOrData.map(item => ({
        type: 'out',
        category: item.category || 'internal',
        itemId: item.id,
        quantity: item.quantity,
        depositor: item.depositor || 'Unbekannt',
        price: item.price,
        timestamp: item.date,
        skipInventory: item.skipInventory
      }));
      // Prepare detailed log for batch
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
      // Single mode
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
        skipInventory
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

          // Log detailed info
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

  const handleUpdateStock = (id, newQuantity) => {
    const oldItem = inventory.find(i => i.id === id);
    if (oldItem) {
      log('STATE', 'Update Stock', {
        id,
        name: oldItem.name,
        old: oldItem.current,
        new: newQuantity,
        diff: newQuantity - oldItem.current
      });
    } else {
      log('STATE', 'Update Stock', { id, newQuantity });
    }

    const newData = inventory.map(item => {
      if (item.id === id) {
        return { ...item, current: newQuantity };
      }
      return item;
    });
    saveInventory(newData);
  };

  const handleUpdateTarget = (id, newTarget) => {
    const oldItem = inventory.find(i => i.id === id);
    if (oldItem) {
      log('STATE', 'Update Target Stock', {
        id,
        name: oldItem.name,
        old: oldItem.target,
        new: newTarget,
        diff: newTarget - oldItem.target
      });
    } else {
      log('STATE', 'Update Target Stock', { id, newTarget });
    }

    const newData = inventory.map(item => {
      if (item.id === id) {
        return { ...item, target: newTarget };
      }
      return item;
    });
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
          // Refetch employees
          api.getEmployees().then(setEmployees);
          addLog("Datenbank zurückgesetzt");
        });
    }
  };

  const handleUpdateEmployees = (newEmployees) => {
    // Calculate Diff
    const changes = { added: [], removed: [], modified: [] };

    // Check Added / Modified
    newEmployees.forEach(newEmp => {
      const oldEmp = employees.find(e => e.id === newEmp.id || e.name === newEmp.name);
      if (!oldEmp) {
        changes.added.push(newEmp.name);
      } else if (JSON.stringify(newEmp) !== JSON.stringify(oldEmp)) {
        // Deep comparison simplified (or just check specific fields like status)
        if (newEmp.status !== oldEmp.status) {
          changes.modified.push({ name: newEmp.name, field: 'status', old: oldEmp.status, new: newEmp.status });
        }
        if (newEmp.role !== oldEmp.role) {
          changes.modified.push({ name: newEmp.name, field: 'role', old: oldEmp.role, new: newEmp.role });
        }
      }
    });

    // Check Removed
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

  const addLog = (msg) => {
    const log = { id: Date.now(), msg, time: new Date().toLocaleTimeString() };
    setLogs(prev => [log, ...prev].slice(0, 5));
  };

  // Order Handlers
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
        id,
        item: order.itemName,
        customer: order.customerName,
        old: order.status,
        new: status
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

  const handleSpecialBooking = ({ employee, reason, amount }) => {
    api.performTransaction({
      type: 'in', // Treat as 'in' so it counts as positive wage (or negative if price is negative)
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

  const handleConsumeIngredients = (employeeName, items) => {
    log('STATE', 'Consuming Ingredients (Employee)', { employee: employeeName, items });
    return api.consumeIngredients(employeeName, items)
      .then(data => {
        if (data.success) {
          fetchData('Ingredients Consumed'); // Refresh inventory
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

  const handleEmployeePayout = (amountOrBatch, date, depositor) => {
    if (Array.isArray(amountOrBatch)) {
      // Batch mode (Outstanding Wages)
      amountOrBatch.forEach(({ amount, date, depositor }) => {
        // Add random offset to prevent PK collision (timestamp is PK)
        // Only if date is provided (Past Payout). If null (Current), let server decide.
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
          timestamp: uniqueDateStr, // null means server time
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
      // Single mode (Current Week Employee Payout)
      const entry = {
        msg: 'Wochenlohn Auszahlung',
        price: -amountOrBatch,
        quantity: 1,
        category: 'internal',
        timestamp: date ? date.toISOString() : null, // null means server time
        depositor: depositor || user?.username || 'Buchhaltung',
        itemName: 'Auszahlung'
      };
      saveLogEntry(entry);
      addLog(`Wochenlohn ausgezahlt: ${amountOrBatch}€ (${depositor})`);
      log('TX', 'Single Payout', { amount: amountOrBatch, depositor });
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-violet-400">Lade Daten...</div>;

  if (!user) {
    return <Login />;
  }

  const isAdmin = user.role === 'Administrator';
  const isBuchhaltung = user.role === 'Buchhaltung' || isAdmin;
  const isLager = (user?.isLagerist === 1 || user?.isLagerist === true) || user.role === 'Lager' || isBuchhaltung;
  const isHaendler = (user?.isHaendler === 1 || user?.isHaendler === true) || user?.role === 'Händler' || isBuchhaltung;
  const isFuhrpark = user.role === 'Fuhrparkmanager' || isAdmin;
  const isPending = user.role === 'Pending';

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-violet-400 mb-4">Zugriff angefragt</h1>
          <p className="text-slate-300 mb-6">
            Deine Rechte wurden angefragt. Bitte melde dich bei der Buchhaltung, falls noch nicht geschehen, um freigeschaltet zu werden.
          </p>
          <div className="flex justify-center">
            <a href="/auth/logout" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors">Abmelden</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="p-4 md:p-8 pb-32 max-w-7xl mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="MET Logo" className="w-16 h-16 md:w-20 md:h-20" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                Syncrolog
              </h1>
              <p className="text-slate-400 mt-1">MET System Dashboard</p>
            </div>
            <SystemAlert />
          </div>
          <div className="text-right hidden md:block">
            <div className="text-sm text-slate-500 mb-1">System Status</div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Online
              </div>
              {saveStatus === 'saving' && <span className="text-xs text-amber-400">Speichere...</span>}
              {saveStatus === 'saved' && <span className="text-xs text-emerald-400">Gespeichert</span>}
              {saveStatus === 'error' && <span className="text-xs text-red-500 font-bold">Fehler beim Speichern!</span>}
            </div>
          </div>
        </header>

        {!isConnected && (
          <div className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-500/90 text-white rounded-lg shadow-lg backdrop-blur animate-pulse">
            <WifiOff className="w-5 h-5" />
            <span className="font-medium">Verbindung verloren</span>
          </div>
        )}



        {showReloadModal && <ReloadModal />}

        <div className="fixed bottom-1 right-1 px-2 py-1 bg-slate-950/80 rounded text-[10px] text-slate-600 font-mono z-50 pointer-events-none select-none">
          v.{version ? new Date(version).toISOString().slice(0, 19).replace('T', ' ') : '...'}
        </div>

        <Navbar user={user} />



        {logs.length > 0 && (
          <div className="mb-6 flex gap-4 overflow-x-auto pb-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full whitespace-nowrap border border-slate-700">
                <Activity className="w-3 h-3" />
                <span className="text-slate-500">{log.time}</span>
                <span>{log.msg}</span>
              </div>
            ))}
          </div>
        )}

        <Routes>
          <Route path="/" element={
            <InventoryPage
              inventory={inventory}
              onUpdateStock={handleUpdateStock}
              onUpdateTarget={handleUpdateTarget}
              onReorder={handleReorder}
              onVerify={handleVerify}
              user={user}
              orders={orders}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onDeleteOrder={handleDeleteOrder}
            />
          } />

          {/* Buchung Routes */}
          {/* Einlagern: Lager & Buchhaltung/Admin */}
          {(isLager || isBuchhaltung) && (
            <Route path="/buchung/einlagern" element={
              <ActionPage
                inventory={inventory}
                employees={employees.filter(e => e.status !== 'fired')} // Only active employees
                prices={prices}
                employeeInventory={employeeInventory}
                onConsumeIngredients={handleConsumeIngredients}
                onAction={(id, qty, dep, price, date, type, category, warningIgnored, skipInventory) => handleCheckIn(id, qty, dep, price, date, 'in', 'internal', warningIgnored, skipInventory)}
                type="in"
                title="Einlagern"
                label="Mitarbeiter"
                showPrice={true}
                user={user}
              />
            } />
          )}

          {/* Auslagern: Lager & Buchhaltung/Admin */}
          {(isLager || isBuchhaltung) && (
            <Route path="/buchung/auslagern" element={
              <ActionPage
                inventory={inventory}
                employees={employees.filter(e => e.status !== 'fired')} // Only active employees
                prices={prices}
                onAction={(id, qty, dep, price, date, type, category, warningIgnored, skipInventory) => handleCheckOut(id, qty, dep, price, date, 'out', 'internal', warningIgnored, skipInventory)}
                type="out"
                title="Auslagern"
                label="Mitarbeiter"
                showPrice={isBuchhaltung}
                user={user}
              />
            } />
          )}

          {/* Sonderbuchung: Buchhaltung/Admin only */}
          {isBuchhaltung && (
            <Route path="/buchung/sonderbuchung" element={
              <SpecialBookingPage
                employees={employees}
                onAction={handleSpecialBooking}
              />
            } />
          )}

          {/* Auftrag: Händler & Buchhaltung/Admin (Lager removed) */}
          {(isHaendler || isBuchhaltung) && (
            <Route path="/buchung/auftrag" element={
              <div className="animate-fade-in">
                <CreateOrderForm inventory={inventory} onSubmit={handleCreateOrder} />
              </div>
            } />
          )}

          {/* Trade Routes - Händler/Buchhaltung/Admin */}
          {(isHaendler || isBuchhaltung) && (
            <>
              <Route path="/buchung/einkauf" element={
                <ActionPage
                  inventory={inventory}
                  employees={employees}
                  prices={prices}
                  onAction={(id, qty, dep, price, date, type, category, warningIgnored, skipInventory) => handleCheckIn(id, qty, dep, price, date, 'in', 'trade', warningIgnored, skipInventory)}
                  type="in"
                  title="Einkauf (Ankauf)"
                  label="Verkäufer"
                  user={user}
                />
              } />
              <Route path="/buchung/verkauf" element={
                <ActionPage
                  inventory={inventory}
                  employees={employees}
                  prices={prices}
                  onAction={(id, qty, dep, price, date, type, category, warningIgnored, skipInventory) => handleCheckOut(id, qty, dep, price, date, 'out', 'trade', warningIgnored, skipInventory)}
                  type="out"
                  title="Verkauf (Abverkauf)"
                  label="Käufer"
                  user={user}
                />
              } />
            </>
          )}


          <Route path="/marketing" element={<MarketingPage prices={prices} inventory={inventory} />} />

          {/* Hub Pages */}
          {!isPending && <Route path="/buchung" element={<BookingHub user={user} />} />}
          {!isPending && <Route path="/protokolle" element={<ProtocolsHub user={user} />} />}
          {!isPending && <Route path="/sonstiges" element={<SonstigesHub user={user} />} />}
          <Route path="/trade" element={<Navigate to={(isHaendler || isBuchhaltung) ? "/buchung/einkauf" : "/"} replace />} />

          {/* Protokolle Routes */}
          {isBuchhaltung && <Route path="/protokolle/trade" element={<DailyTradeLog logs={transactionLogs} />} />}

          {isBuchhaltung && <Route path="/protokolle/weekly" element={<WeeklyProtocol logs={transactionLogs} user={user} />} />}
          {!isPending && <Route path="/protokolle/internal-storage" element={<InternalStorageProtocol logs={transactionLogs} user={user} employees={employees} onPayout={handleEmployeePayout} />} />}
          {(isBuchhaltung) && (
            <>
              <Route path="/protokolle/period" element={<PeriodProtocol logs={transactionLogs} inventory={inventory} employees={employees} />} />
              <Route path="/protokolle/analytics" element={<AnalyticsProtocol logs={transactionLogs} employees={employees} inventory={inventory} />} />
              <Route path="/protokolle/kassenbuch" element={<CashBookProtocol logs={transactionLogs} inventory={inventory} prices={prices} onAdjustBalance={handleSpecialBooking} user={user} />} />
              <Route path="/protokolle/lohn" element={<PayrollProtocol logs={transactionLogs} employees={employees} prices={prices} user={user} />} />
              <Route path="/protokolle/guv" element={<ProfitLossProtocol logs={transactionLogs} employees={employees} prices={prices} inventory={inventory} />} />
              <Route path="/protokolle/buchhaltung" element={<AccountingDashboard logs={transactionLogs} employees={employees} inventory={inventory} prices={prices} user={user} />} />
              <Route path="/protokolle/profitabilitaet" element={<ProductProfitability logs={transactionLogs} prices={prices} inventory={inventory} />} />
            </>
          )}{isLager && <Route path="/protokolle/storage" element={<StorageProtocol logs={transactionLogs} />} />}

          {/* Discord Integration - Super Admin Only */}
          {['823276402320998450', '690510884639866960'].includes(user?.discordId) && (
            <Route path="/protokolle/discord" element={<DiscordIntegrationPage />} />
          )}

          <Route path="/protokolle/monthly" element={<Navigate to="/protokolle/period" replace />} />

          {isBuchhaltung && <Route path="/kontrolle" element={<ControlPage employeeInventory={employeeInventory} employees={employees} inventory={inventory} />} />}

          {/* Sonstiges Routes - Admin Only */}
          {isAdmin && (
            <>
              <Route path="/sonstiges/werbung" element={<AdsPage />} />

              <Route path="/sonstiges/kontakte" element={<ContactsPage />} />
              <Route path="/sonstiges/partner" element={<PartnersPage />} />
              <Route path="/sonstiges/personal" element={<PersonnelPage />} />
              <Route path="/beleg" element={<BelegPage prices={prices} />} />
              <Route path="/preise" element={<PricesPage />} />
            </>
          )}


          {/* Sonstiges Routes - Public for all users */}
          {!isPending && (
            <>
              <Route path="/sonstiges/hausordnung" element={<HausordnungPage user={user} />} />
              <Route path="/sonstiges/beginner-guide" element={<BeginnerGuidePage user={user} />} />
            </>
          )}

          {/* Sammel-Event Routes */}
          {!isPending && (
            <>
              <Route path="/sammel-event" element={<SammelEventPage employees={employees} />} />
              {isBuchhaltung && (
                <Route path="/sammel-event/config" element={<SammelEventConfigPage employees={employees} inventory={inventory} />} />
              )}
            </>
          )}

          {/* Fuhrpark Route - Fuhrparkmanager & Admin */}
          {isFuhrpark && (
            <Route path="/sonstiges/fuhrpark" element={<FuhrparkPage user={user} />} />
          )}

          {/* System Routes */}
          {isBuchhaltung && (
            <>
              <Route path="/system" element={
                <ErrorBoundary>
                  <SystemPage employees={employees} onUpdateEmployees={handleUpdateEmployees} logs={transactionLogs} onDeleteLog={handleDeleteLog} onReset={handleReset} user={user} inventory={inventory} />
                </ErrorBoundary>
              } />
              <Route path="/system/employees" element={
                <ErrorBoundary>
                  <SystemPage employees={employees} onUpdateEmployees={handleUpdateEmployees} logs={transactionLogs} onDeleteLog={handleDeleteLog} onReset={handleReset} user={user} inventory={inventory} />
                </ErrorBoundary>
              } />
            </>
          )}

          {/* Super Admin Audit Log */}
          {(user?.discordId === '823276402320998450' || user?.discordId === '690510884639866960') && (
            <>
              <Route path="/aktivitaetslog" element={<AuditLogPage />} />
              <Route path="/admin/backup" element={<BackupProtocol user={user} />} />
              <Route path="/admin/performance" element={<PerformanceDashboard user={user} />} />
            </>
          )}
        </Routes>

        {/* Discord Confirmation Modal */}
        {pendingDiscordLog && (
          <DiscordConfirmationModal
            discordLog={pendingDiscordLog}
            recentTransactions={recentTransactions}
            onConfirm={async (discordLogId, transaction) => {
              try {
                const res = await fetch(`/api/discord/confirm/${discordLogId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ transactionTimestamp: transaction.timestamp })
                });
                if (res.ok) {
                  console.log('[Discord] Confirmation saved');
                  setPendingDiscordLog(null);
                }
              } catch (err) {
                console.error('[Discord] Confirmation failed:', err);
              }
            }}
            onDismiss={() => setPendingDiscordLog(null)}
            onNotMine={async () => {
              try {
                await fetch(`/api/discord/dismiss/${pendingDiscordLog.id}`, {
                  method: 'POST',
                  credentials: 'include'
                });
                setPendingDiscordLog(null);
              } catch (err) {
                console.error('[Discord] Dismiss failed:', err);
              }
            }}
          />
        )}
      </div>
    </Router>
  );
}

export default App;
