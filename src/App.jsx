import React, { useState, useEffect } from 'react';
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
import DebugMenu from './components/DebugMenu';
import PriceListModal from './components/PriceListModal';
import Login from './components/Login';
import { Activity } from 'lucide-react';

const API_URL = '/api';

function App() {
  const [inventory, setInventory] = useState(initialInventory);
  const [logs, setLogs] = useState([]); // Activity logs (short term)
  const [transactionLogs, setTransactionLogs] = useState([]); // Full history from logs.json
  const [employees, setEmployees] = useState([]); // Employee list
  const [prices, setPrices] = useState([]); // Price list
  const [showPriceList, setShowPriceList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [user, setUser] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/inventory`).then(res => res.json()),
      fetch(`${API_URL}/logs`).then(res => res.json()),
      fetch(`${API_URL}/employees`).then(res => res.json()),
      fetch(`${API_URL}/prices`).then(res => res.json()),
      fetch(`${API_URL}/user`).then(res => {
        if (res.ok) return res.json();
        return null;
      })
    ])
      .then(([invData, logsData, empData, priceData, userData]) => {
        setInventory(invData);
        setTransactionLogs(logsData);
        setEmployees(empData);
        setPrices(priceData);
        setUser(userData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch data:", err);
        // Fallback to initial data if server fails
        setInventory(initialInventory);
        setPrices(initialPrices);
        setLoading(false);
        setSaveStatus('error');
      });
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
    const newLog = { ...entry, timestamp: new Date().toISOString() };
    setTransactionLogs(prev => [newLog, ...prev]);

    fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog)
    }).catch(err => console.error("Failed to save log:", err));
  };

  const handleCheckIn = (id, quantity, depositor, price = 0, type = 'in', category = 'internal') => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const newData = inventory.map(i => {
      // Add quantity to the target item
      if (i.id === id) {
        return { ...i, current: i.current + quantity };
      }
      return i;
    });
    saveInventory(newData);

    const actionLabel = category === 'trade' ? 'Gekauft' : 'Eingelagert';
    addLog(`${actionLabel}: ${quantity}x ${item.name} (${depositor || 'Unbekannt'})`);

    saveLogEntry({
      type: 'in',
      category, // 'internal' or 'trade'
      itemId: id,
      itemName: item.name,
      quantity,
      depositor: depositor || 'Unbekannt',
      price
    });
  };

  const handleCheckOut = (id, quantity, depositor, price = 0, type = 'out', category = 'internal') => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const newData = inventory.map(i => {
      if (i.id === id) {
        return { ...i, current: Math.max(0, i.current - quantity) };
      }
      return i;
    });
    saveInventory(newData);

    const actionLabel = category === 'trade' ? 'Verkauft' : 'Ausgelagert';
    addLog(`${actionLabel}: ${quantity}x ${item.name} (${depositor || 'Unbekannt'})`);

    saveLogEntry({
      type: 'out',
      category,
      itemId: id,
      itemName: item.name,
      quantity,
      depositor: depositor || 'Unbekannt',
      price
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

  const handleUpdateLogs = (newLogs) => {
    setTransactionLogs(newLogs);
    fetch(`${API_URL}/logs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLogs)
    }).catch(err => console.error("Failed to update logs:", err));
  };

  const handleDeleteLog = (timestamp) => {
    const newLogs = transactionLogs.filter(log => log.timestamp !== timestamp);
    handleUpdateLogs(newLogs);
  };

  const addLog = (msg) => {
    const log = { id: Date.now(), msg, time: new Date().toLocaleTimeString() };
    setLogs(prev => [log, ...prev].slice(0, 5));
  };



  // ... (imports)

  // ... (inside App component)

  if (loading) return <div className="flex items-center justify-center min-h-screen text-violet-400">Lade Daten...</div>;

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="p-4 md:p-8 pb-32 max-w-7xl mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
              Lagerverwaltung
            </h1>
            <p className="text-slate-400 mt-1">MET System Dashboard</p>
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
          <Route path="/" element={<InventoryPage inventory={inventory} onUpdateStock={handleUpdateStock} onVerify={handleVerify} />} />

          {/* Buchung Routes */}
          <Route path="/buchung/einlagern" element={
            <ActionPage
              inventory={inventory}
              employees={employees}
              prices={prices}
              onAction={(id, qty, dep, price) => handleCheckIn(id, qty, dep, price, 'in', 'internal')}
              type="in"
              title="Einlagern"
              label="Mitarbeiter"
              showPrice={true}
            />
          } />
          <Route path="/buchung/auslagern" element={
            <ActionPage
              inventory={inventory}
              employees={employees}
              prices={prices}
              onAction={(id, qty, dep, price) => handleCheckOut(id, qty, dep, price, 'out', 'internal')}
              type="out"
              title="Auslagern"
              label="Mitarbeiter"
              showPrice={false}
            />
          } />
          <Route path="/buchung/einkauf" element={
            <ActionPage
              inventory={inventory}
              employees={employees}
              prices={prices}
              onAction={(id, qty, dep, price) => handleCheckIn(id, qty, dep, price, 'in', 'trade')}
              type="in"
              title="Einkauf (Ankauf)"
              label="Verkäufer"
            />
          } />
          <Route path="/buchung/verkauf" element={
            <ActionPage
              inventory={inventory}
              employees={employees}
              prices={prices}
              onAction={(id, qty, dep, price) => handleCheckOut(id, qty, dep, price, 'out', 'trade')}
              type="out"
              title="Verkauf (Abverkauf)"
              label="Käufer"
            />
          } />

          {/* Redirect old routes */}
          <Route path="/buchung" element={<Navigate to="/buchung/einlagern" replace />} />
          <Route path="/trade" element={<Navigate to="/buchung/einkauf" replace />} />

          {/* Protokolle Routes */}
          <Route path="/protokolle/trade" element={<DailyTradeLog logs={transactionLogs} />} />
          <Route path="/protokolle/employee" element={<DailyEmployeeLog logs={transactionLogs} onUpdateLogs={handleUpdateLogs} />} />
          <Route path="/protokolle/weekly" element={<WeeklyProtocol logs={transactionLogs} />} />
          <Route path="/protokolle/period" element={<PeriodProtocol logs={transactionLogs} />} />
          <Route path="/protokolle/storage" element={<StorageProtocol logs={transactionLogs} />} />
          <Route path="/protokolle/monthly" element={<Navigate to="/protokolle/period" replace />} />

          <Route path="/kontrolle" element={<ControlPage />} />
        </Routes>

        <DebugMenu
          onReset={handleReset}
          employees={employees}
          onUpdateEmployees={handleUpdateEmployees}
          logs={transactionLogs}
          onDeleteLog={handleDeleteLog}
        />
      </div>
    </Router>
  );
}

export default App;
