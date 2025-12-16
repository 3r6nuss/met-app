
import React, { useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initialInventory } from './data/initialData';
import { initialPrices } from './data/initialPrices';
import Navbar from './components/Navbar';
import InventoryPage from './pages/InventoryPage';
import ActionPage from './pages/ActionPage';
import ControlPage from './pages/ControlPage';
import DailyTradeLog from './pages/protocols/DailyTradeLog';
import DailyEmployeeLog from './pages/protocols/DailyEmployeeLog';
import WeeklyProtocol from './pages/protocols/WeeklyProtocol';
import PeriodProtocol from './pages/protocols/PeriodProtocol';
import StorageProtocol from './pages/protocols/StorageProtocol';
import InternalStorageProtocol from './pages/protocols/InternalStorageProtocol';
import SystemPage from './pages/SystemPage'; import PriceListModal from './components/PriceListModal';
import Login from './components/Login';
import { Activity } from 'lucide-react';
import UserManagement from './components/UserManagement';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import CalculatorPage from './pages/CalculatorPage';
import SpecialBookingPage from './pages/SpecialBookingPage';
import ComingSoonPage from './pages/ComingSoonPage';
import BusinessAccountPage from './pages/BusinessAccountPage';
import ContactsPage from './pages/ContactsPage';
import AdsPage from './pages/AdsPage';
import PartnersPage from './pages/PartnersPage';
import PersonnelPage from './pages/PersonnelPage';
import BeginnerGuidePage from './pages/BeginnerGuidePage';
import AuditLogPage from './pages/AuditLogPage';
import HausordnungPage from './pages/HausordnungPage';

import CreateOrderForm from './components/CreateOrderForm';

const API_URL = '/api';

function App() {
  const [inventory, setInventory] = useState(initialInventory);
  const [logs, setLogs] = useState([]); // Activity logs (short term)
  const [transactionLogs, setTransactionLogs] = useState([]); // Full history from logs.json
  const [employees, setEmployees] = useState([]); // Employee list
  const [employeeInventory, setEmployeeInventory] = useState([]); // Employee inventory
  const [prices, setPrices] = useState([]); // Price list
  const [orders, setOrders] = useState([]); // Orders
  const [personnel, setPersonnel] = useState([]); // Personnel list (from /api/personnel)
  const [maintenanceSettings, setMaintenanceSettings] = useState({ maintenance_mode: 'false', maintenance_text: '', maintenance_image: '' });
  const [showPriceList, setShowPriceList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [user, setUser] = useState(null);

  // Fetch data helper
  const fetchData = () => {
    // Don't set loading to true on background updates to avoid flickering
    // setLoading(true); 

    Promise.all([
      fetch(`${API_URL}/inventory`).then(res => res.json()),
      fetch(`${API_URL}/logs`).then(res => res.json()),
      fetch(`${API_URL}/employees`).then(res => res.json()),
      fetch(`${API_URL}/employee-inventory`).then(res => res.json()),
      fetch(`${API_URL}/prices`).then(res => res.json()),
      fetch(`${API_URL}/orders`).then(res => res.json()),
      fetch(`${API_URL}/settings`).then(res => {
        if (res.ok) return res.json();
        return {};
      }),
      fetch(`${API_URL}/personnel`).then(res => {
        if (res.ok) return res.json();
        return [];
      }),
      fetch(`${API_URL}/user`).then(res => {
        if (res.ok) return res.json();
        return null;
      })
    ])
      .then(([invData, logsData, empData, empInvData, priceData, ordersData, settingsData, personnelData, userData]) => {
        setInventory(invData);
        setTransactionLogs(logsData);
        setEmployees(empData);
        setEmployeeInventory(empInvData);
        setPrices(priceData);
        setOrders(ordersData || []);
        if (settingsData) setMaintenanceSettings(settingsData);
        setPersonnel(personnelData || []);
        if (userData) setUser(userData); // Only update user if fetched successfully
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch data:", err);
        setLoading(false);
      });
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // WebSocket Connection
  useEffect(() => {
    let ws;
    let reconnectTimer;

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
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'UPDATE') {
            console.log("Received update signal, refreshing data...");
            fetchData();
          }
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected, reconnecting in 3s...");
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Save data helper
  const saveInventory = (newData) => {
    setInventory(newData);
    setSaveStatus('saving');

    fetch(`${API_URL}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData)
    })
      .then(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      })
      .catch(err => {
        console.error("Failed to save:", err);
        setSaveStatus('error');
      });
  };

  const saveLogEntry = (entry) => {
    const newLog = { ...entry, timestamp: entry.timestamp || new Date().toISOString() };
    setTransactionLogs(prev => [newLog, ...prev]);

    fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog)
    }).catch(err => console.error("Failed to save log:", err));
  };

  const handleCheckIn = (idOrData, quantity, depositor, price = 0, customDate = null, type = 'in', category = 'internal', warningIgnored = false, skipInventory = false) => {
    let payload;

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
    }

    fetch(`${API_URL}/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Refetch data to ensure everything is in sync (inventory, logs, employee inventory)
          fetchData();
          if (Array.isArray(idOrData)) {
            addLog(`${skipInventory ? '[PROTOKOLL] ' : ''}Batch Einlagerung: ${idOrData.length} Items`);
          } else {
            const item = inventory.find(i => i.id === idOrData);
            addLog(`${skipInventory ? '[PROTOKOLL] ' : ''}Eingelagert: ${quantity}x ${item.name} (${depositor || 'Unbekannt'})`);
          }
        } else {
          console.error("Transaction failed:", data.error);
          alert("Fehler bei der Transaktion: " + data.error);
        }
      })
      .catch(err => {
        console.error("Transaction error:", err);
        alert("Netzwerkfehler bei der Transaktion");
      });
  };

  const handleCheckOut = (idOrData, quantity, depositor, price = 0, customDate = null, type = 'out', category = 'internal', warningIgnored = false, skipInventory = false) => {
    let payload;

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
    }

    fetch(`${API_URL}/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetchData();
          if (Array.isArray(idOrData)) {
            addLog(`${skipInventory ? '[PROTOKOLL] ' : ''}Batch Auslagerung: ${idOrData.length} Items`);
          } else {
            const item = inventory.find(i => i.id === idOrData);
            addLog(`${skipInventory ? '[PROTOKOLL] ' : ''}Ausgelagert: ${quantity}x ${item.name} (${depositor || 'Unbekannt'})`);
          }
        } else {
          console.error("Transaction failed:", data.error);
          alert("Fehler bei der Transaktion: " + data.error);
        }
      })
      .catch(err => {
        console.error("Transaction error:", err);
        alert("Netzwerkfehler bei der Transaktion");
      });
  };

  const handleUpdateStock = (id, newQuantity) => {
    const newData = inventory.map(item => {
      if (item.id === id) {
        return { ...item, current: newQuantity };
      }
      return item;
    });
    saveInventory(newData);
  };

  const handleUpdateTarget = (id, newTarget) => {
    const newData = inventory.map(item => {
      if (item.id === id) {
        return { ...item, target: newTarget };
      }
      return item;
    });
    saveInventory(newData);
  };

  const handleReorder = (newInventory) => {
    saveInventory(newInventory);
  };

  const handleVerify = (name) => {
    const verificationEntry = {
      verifier: name,
      timestamp: new Date().toISOString(),
      snapshot: inventory
    };

    fetch(`${API_URL}/verifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verificationEntry)
    })
      .then(() => addLog(`Lagerliste bestätigt von ${name}`))
      .catch(err => console.error("Failed to save verification:", err));
  };

  const handleReset = () => {
    if (confirm("Wirklich alles zurücksetzen?")) {
      fetch(`${API_URL}/reset`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          setInventory(data);
          setTransactionLogs([]);
          // Refetch employees
          fetch(`${API_URL}/employees`).then(res => res.json()).then(setEmployees);
          addLog("Datenbank zurückgesetzt");
        });
    }
  };

  const handleUpdateEmployees = (newEmployees) => {
    setEmployees(newEmployees);
    fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmployees)
    }).catch(err => console.error("Failed to save employees:", err));
  };

  const handleDeleteLog = (timestamp) => {
    if (confirm("Eintrag wirklich löschen?")) {
      fetch(`${API_URL}/logs/${encodeURIComponent(timestamp)}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            fetchData();
            addLog("Eintrag gelöscht");
          } else {
            alert("Fehler beim Löschen: " + data.error);
          }
        })
        .catch(err => alert("Netzwerkfehler"));
    }
  };

  const addLog = (msg) => {
    const log = { id: Date.now(), msg, time: new Date().toLocaleTimeString() };
    setLogs(prev => [log, ...prev].slice(0, 5));
  };

  // Order Handlers
  const handleCreateOrder = (orderData) => {
    fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetchData();
          addLog(`Neuer Auftrag: ${orderData.quantity}x ${orderData.itemName}`);
          alert("Auftrag erfolgreich erstellt!");
        } else {
          alert("Fehler beim Erstellen des Auftrags");
        }
      })
      .catch(err => alert("Netzwerkfehler"));
  };

  const handleUpdateOrderStatus = (id, status) => {
    fetch(`${API_URL}/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) fetchData();
      });
  };

  const handleDeleteOrder = (id) => {
    if (confirm("Auftrag wirklich löschen?")) {
      fetch(`${API_URL}/orders/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.success) fetchData();
        });
    }
  };

  const handleSpecialBooking = ({ employee, reason, amount }) => {
    fetch(`${API_URL}/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'in', // Treat as 'in' so it counts as positive wage (or negative if price is negative)
        category: 'internal',
        itemId: null,
        itemName: reason,
        quantity: 1,
        depositor: employee,
        price: amount,
        skipInventory: true
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetchData();
          addLog(`Sonderbuchung: ${amount}€ für ${employee} (${reason})`);
          alert("Sonderbuchung erfolgreich!");
        } else {
          alert("Fehler: " + data.error);
        }
      })
      .catch(err => alert("Netzwerkfehler"));
  };

  const handleConsumeIngredients = (employeeName, items) => {
    return fetch(`${API_URL}/employee-inventory/consume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeName, items })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetchData(); // Refresh inventory
          return { success: true };
        } else {
          return { success: false, error: data.error };
        }
      })
      .catch(err => ({ success: false, error: "Netzwerkfehler" }));
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
  const isPending = user.role === 'Pending';
  const isSuperAdmin = user?.discordId === '823276402320998450' || user?.discordId === '690510884639866960';

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
      <MaintenanceOverlay
        active={maintenanceSettings.maintenance_mode === 'true'}
        text={maintenanceSettings.maintenance_text}
        image={maintenanceSettings.maintenance_image}
        isSuperAdmin={isSuperAdmin}
      />
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

        <Navbar onOpenPriceList={() => setShowPriceList(true)} user={user} />

        {showPriceList && <PriceListModal onClose={() => setShowPriceList(false)} />}



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
                employees={employees}
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
                employees={employees}
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

          {/* Calculator Route */}
          <Route path="/rechner" element={<CalculatorPage prices={prices} />} />
          <Route path="/buchung/rechner" element={<CalculatorPage prices={prices} />} />

          {/* Redirect old routes */}
          <Route path="/buchung" element={<Navigate to={isLager ? "/buchung/auslagern" : "/"} replace />} />
          <Route path="/trade" element={<Navigate to={(isHaendler || isBuchhaltung) ? "/buchung/einkauf" : "/"} replace />} />

          {/* Protokolle Routes */}
          {isBuchhaltung && <Route path="/protokolle/trade" element={<DailyTradeLog logs={transactionLogs} />} />}

          {isBuchhaltung && <Route path="/protokolle/weekly" element={<WeeklyProtocol logs={transactionLogs} user={user} />} />}
          {isAdmin && <Route path="/protokolle/employee" element={<DailyEmployeeLog logs={transactionLogs} user={user} onPayout={handleEmployeePayout} />} />}
          {!isPending && <Route path="/protokolle/internal-storage" element={<InternalStorageProtocol logs={transactionLogs} user={user} employees={personnel} onPayout={handleEmployeePayout} />} />}
          {isBuchhaltung && <Route path="/protokolle/period" element={<PeriodProtocol logs={transactionLogs} />} />}
          {isLager && <Route path="/protokolle/storage" element={<StorageProtocol logs={transactionLogs} />} />}

          <Route path="/protokolle/monthly" element={<Navigate to="/protokolle/period" replace />} />

          {isBuchhaltung && <Route path="/kontrolle" element={<ControlPage employeeInventory={employeeInventory} employees={employees} inventory={inventory} />} />}

          {/* Sonstiges Routes - Admin Only */}
          {isAdmin && (
            <>
              <Route path="/sonstiges/werbung" element={<AdsPage />} />
              <Route path="/sonstiges/konto" element={<BusinessAccountPage logs={transactionLogs} inventory={inventory} prices={prices} onAdjustBalance={handleSpecialBooking} user={user} />} />
              <Route path="/sonstiges/kontakte" element={<ContactsPage />} />
              <Route path="/sonstiges/partner" element={<PartnersPage />} />
              <Route path="/sonstiges/personal" element={<PersonnelPage />} />
            </>
          )}


          {/* Sonstiges Routes - Public for all users */}
          {!isPending && (
            <>
              <Route path="/sonstiges/hausordnung" element={<HausordnungPage user={user} />} />
              <Route path="/sonstiges/beginner-guide" element={<BeginnerGuidePage user={user} />} />
            </>
          )}

          {/* System Routes */}
          {isBuchhaltung && (
            <>
              <Route path="/system" element={
                <ErrorBoundary>
                  <SystemPage
                    employees={employees}
                    onUpdateEmployees={handleUpdateEmployees}
                    logs={transactionLogs}
                    onDeleteLog={handleDeleteLog}
                    onReset={handleReset}
                    user={user}
                    inventory={inventory}
                    maintenanceSettings={maintenanceSettings}
                    isSuperAdmin={isSuperAdmin}
                  />
                </ErrorBoundary>
              } />
              <Route path="/system/employees" element={
                <ErrorBoundary>
                  <SystemPage
                    employees={employees}
                    onUpdateEmployees={handleUpdateEmployees}
                    logs={transactionLogs}
                    onDeleteLog={handleDeleteLog}
                    onReset={handleReset}
                    user={user}
                    inventory={inventory}
                    maintenanceSettings={maintenanceSettings}
                    isSuperAdmin={isSuperAdmin}
                  />
                </ErrorBoundary>
              } />
            </>
          )}

          {/* Super Admin Audit Log */}
          {(user?.discordId === '823276402320998450' || user?.discordId === '690510884639866960') && (
            <Route path="/aktivitaetslog" element={<AuditLogPage />} />
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
