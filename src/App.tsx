import React, { useState, useEffect } from 'react';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './components/Layout/Dashboard';
import ED01View from './components/Transactions/ED01/ED01View';
import Login from './components/Login/Login';
import { auth } from './lib/auth';
import { cargarLocales } from './data/locales';
import './App.css';

export type TabId = string;

const App: React.FC = () => {
  const [usuario, setUsuario] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [openTabs, setOpenTabs] = useState<TabId[]>(['dashboard']);
  const [cargando, setCargando] = useState(true);
  const [tabsMontadas, setTabsMontadas] = useState<Set<string>>(new Set(['dashboard']));

  useEffect(() => {
    const usuarioGuardado = auth.getUsuario();
    if (usuarioGuardado) {
      setUsuario(usuarioGuardado);
    } else {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (usuario) {
      cargarLocales().finally(() => setCargando(false));
    }
  }, [usuario]);

  const handleLogin = (userData: any) => setUsuario(userData);

  const handleLogout = () => {
    auth.logout();
    setUsuario(null);
    setActiveTab('dashboard');
    setOpenTabs(['dashboard']);
    setTabsMontadas(new Set(['dashboard']));
    setCargando(true);
  };

  if (!usuario) return <Login onLogin={handleLogin} />;

  const openModule = (moduleId: string) => {
    setTabsMontadas(prev => new Set([...prev, moduleId]));
    if (!openTabs.includes(moduleId)) setOpenTabs([...openTabs, moduleId]);
    setActiveTab(moduleId);
  };

  const closeTab = (tabId: string) => {
    const newOpenTabs = openTabs.filter(tab => tab !== tabId);
    setOpenTabs(newOpenTabs);
    if (activeTab === tabId) setActiveTab(newOpenTabs.length > 0 ? newOpenTabs[newOpenTabs.length - 1] : 'dashboard');
  };

  if (cargando) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b', fontSize: '16px' }}>Cargando datos...</div>;
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} onModuleClick={openModule} rol={usuario?.rol} />
      <div className="main-panel">
        <Header activeTab={activeTab} openTabs={openTabs} onTabClick={setActiveTab} onTabClose={closeTab} usuario={usuario} onLogout={handleLogout} />
        <div className="workspace">
          <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
            <Dashboard />
          </div>
          {tabsMontadas.has('ed') && (
            <div style={{ display: activeTab === 'ed' ? 'block' : 'none' }}>
              <ED01View key="ed01" />
            </div>
          )}
          {!['dashboard', 'ed'].includes(activeTab) && (
            <div className="module-container"><h3>Módulo en desarrollo</h3></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;