import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Login from './components/Login';
import AppLayout from './components/AppLayout';
import AppRoutes from './components/AppRoutes';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { isPending } from './utils/permissions';

function AppInner() {
  const { loading, user } = useAppState();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-violet-400">Lade Daten...</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (isPending(user)) {
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
      <AppLayout>
        <AppRoutes />
      </AppLayout>
    </Router>
  );
}

function App() {
  return (
    <AppStateProvider>
      <AppInner />
    </AppStateProvider>
  );
}

export default App;
