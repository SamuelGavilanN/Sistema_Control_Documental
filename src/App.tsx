import React, { useState, useEffect } from 'react';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './components/Layout/Dashboard';
import ED01View from './components/Transactions/ED01/ED01View';
import ED02Dashboard from './components/Transactions/ED01/ED02Dashboard';
import ED03Tickets from './components/Transactions/ED01/ED03Tickets';
import TK01CrearTicket from './components/Transactions/TK/TK01CrearTicket';
import AD01View from './components/Transactions/AD/AD01View';
import AD02Captura from './components/Transactions/AD/AD02Captura';
import AD03Dashboard from './components/Transactions/AD/AD03Dashboard';
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
    if (usuarioGuardado) { setUsuario(usuarioGuardado); } else { setCargando(false); }
  }, []);

  useEffect(() => {
    if (usuario) { cargarLocales().finally(() => setCargando(false)); }
  }, [usuario]);

  const handleLogin = (userData: any) => setUsuario(userData);
  const handleLogout = () => {
    auth.logout(); setUsuario(null); setActiveTab('dashboard'); setOpenTabs(['dashboard']); setTabsMontadas(new Set(['dashboard'])); setCargando(true);
  };

  if (!usuario) return <Login onLogin={handleLogin} />;

  const openModule = (moduleId: string) => {
    setTabsMontadas((prev: Set<string>) => { const nuevo = new Set(prev); nuevo.add(moduleId); return nuevo; });
    if (!openTabs.includes(moduleId)) setOpenTabs([...openTabs, moduleId]);
    setActiveTab(moduleId);
  };

  const closeTab = (tabId: string) => {
    const newOpenTabs = openTabs.filter(tab => tab !== tabId);
    setOpenTabs(newOpenTabs);
    if (activeTab === tabId) setActiveTab(newOpenTabs.length > 0 ? newOpenTabs[newOpenTabs.length - 1] : 'dashboard');
  };

  if (cargando) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b', fontSize: '16px' }}>Cargando datos...</div>;

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} onModuleClick={openModule} rol={usuario?.rol} />
      <div className="main-panel">
        <Header activeTab={activeTab} openTabs={openTabs} onTabClick={setActiveTab} onTabClose={closeTab} usuario={usuario} onLogout={handleLogout} onOpenModule={openModule} />
        <div className="workspace">
          <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}><Dashboard /></div>
          {tabsMontadas.has('ed') && <div style={{ display: activeTab === 'ed' ? 'block' : 'none' }}><ED01View key="ed01" /></div>}
          {tabsMontadas.has('ed-history') && <div style={{ display: activeTab === 'ed-history' ? 'block' : 'none' }}><ED02Dashboard key="ed02" /></div>}
          {tabsMontadas.has('ed-tickets') && <div style={{ display: activeTab === 'ed-tickets' ? 'block' : 'none' }}><ED03Tickets key="ed03" /></div>}
          {tabsMontadas.has('tk') && <div style={{ display: activeTab === 'tk' ? 'block' : 'none' }}><TK01CrearTicket key="tk01" /></div>}
          {tabsMontadas.has('ad') && <div style={{ display: activeTab === 'ad' ? 'block' : 'none' }}><AD01View key="ad01" /></div>}
          {tabsMontadas.has('ad-captura') && <div style={{ display: activeTab === 'ad-captura' ? 'block' : 'none' }}><AD02Captura key="ad02" /></div>}
          {tabsMontadas.has('ad-dashboard') && <div style={{ display: activeTab === 'ad-dashboard' ? 'block' : 'none' }}><AD03Dashboard key="ad03" /></div>}
          {!['dashboard', 'ed', 'ed-history', 'ed-tickets', 'tk', 'tk-dashboard', 'ad', 'ad-captura', 'ad-dashboard'].includes(activeTab) && (
            <div className="module-container"><h3>Modulo en desarrollo</h3></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
