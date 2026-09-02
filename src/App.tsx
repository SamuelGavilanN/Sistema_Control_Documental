// src/App.tsx

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './components/Layout/Dashboard';

// Módulos ED
import ED01View from './components/Transactions/ED01/ED01View';
import ED02Dashboard from './components/Transactions/ED01/ED02Dashboard';
import ED03Tickets from './components/Transactions/ED01/ED03Tickets';
import ED04Lotes from './components/Transactions/ED01/ED04Lotes';

// Módulos SD
import SD01View from './components/Transactions/SD/SD01View';
import SD02InformeBultos from './components/Transactions/SD/SD02InformeBultos'; // ÚNICO SD02
import SD03InformeUnDesp from './components/Transactions/SD/SD03InformeUnDesp';
import SD04AnalisisBultosDesp from './components/Transactions/SD/SD04AnalisisBultosDesp';

// Módulos UT
import UT01View from './components/Transactions/UT/UT01View';
import UT02RevisionPallet from './components/Transactions/UT/UT02RevisionPallet';

// Módulos BD
import BD01Usuarios from './components/Transactions/BD/BD01Usuarios';
import BD02Locales from './components/Transactions/BD/BD02Locales';

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
  const [permisos, setPermisos] = useState<string[]>([]);

  useEffect(() => {
    const usuarioGuardado = auth.getUsuario();
    if (usuarioGuardado) { setUsuario(usuarioGuardado); } else { setCargando(false); }
  }, []);

  useEffect(() => {
    if (usuario) {
      cargarLocales().finally(() => setCargando(false));
      cargarPermisos(usuario.id);
    }
  }, [usuario]);

  const cargarPermisos = async (userId: string) => {
    try {
      const resp = await fetch(
        'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1/usuario_permisos?select=transaccion_id&usuario_id=eq.' + userId + '&activo=eq.true',
        { headers: { 'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G' } }
      );
      const data = await resp.json();
      if (data && data.length > 0) setPermisos(data.map((p: any) => p.transaccion_id));
    } catch (e) {}
  };

  const handleLogin = (userData: any) => setUsuario(userData);
  const handleLogout = () => {
    auth.logout(); setUsuario(null); setActiveTab('dashboard'); setOpenTabs(['dashboard']); setTabsMontadas(new Set(['dashboard'])); setCargando(true); setPermisos([]);
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
      <Sidebar activeTab={activeTab} onModuleClick={openModule} rol={usuario?.rol} permisos={permisos} />
      <div className="main-panel">
        <Header activeTab={activeTab} openTabs={openTabs} onTabClick={setActiveTab} onTabClose={closeTab} usuario={usuario} onLogout={handleLogout} onOpenModule={openModule} />
        <div className="workspace">
          <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
            <Dashboard onModuleClick={openModule} rol={usuario?.rol} permisos={permisos} />
          </div>
          {/* ED */}
          {tabsMontadas.has('ed') && <div style={{ display: activeTab === 'ed' ? 'block' : 'none' }}><ED01View key="ed01" /></div>}
          {tabsMontadas.has('ed-history') && <div style={{ display: activeTab === 'ed-history' ? 'block' : 'none' }}><ED02Dashboard key="ed02" /></div>}
          {tabsMontadas.has('ed-tickets') && <div style={{ display: activeTab === 'ed-tickets' ? 'block' : 'none' }}><ED03Tickets key="ed03" /></div>}
          {tabsMontadas.has('ed-lotes') && <div style={{ display: activeTab === 'ed-lotes' ? 'block' : 'none' }}><ED04Lotes key="ed04" /></div>}

          {/* SD */}
          {tabsMontadas.has('sd') && <div style={{ display: activeTab === 'sd' ? 'block' : 'none' }}><SD01View key="sd01" /></div>}
          {tabsMontadas.has('sd-informe-bultos') && <div style={{ display: activeTab === 'sd-informe-bultos' ? 'block' : 'none' }}><SD02InformeBultos key="sd-informe-bultos" /></div>}
          {tabsMontadas.has('sd-informe-unidades') && <div style={{ display: activeTab === 'sd-informe-unidades' ? 'block' : 'none' }}><SD03InformeUnDesp key="sd-informe-unidades" /></div>}
          {tabsMontadas.has('sd-analisis-bultos') && <div style={{ display: activeTab === 'sd-analisis-bultos' ? 'block' : 'none' }}><SD04AnalisisBultosDesp key="sd-analisis-bultos" /></div>}

          {/* UT */}
          {tabsMontadas.has('ut') && <div style={{ display: activeTab === 'ut' ? 'block' : 'none' }}><UT01View key="ut01" /></div>}
          {tabsMontadas.has('ut-revision') && <div style={{ display: activeTab === 'ut-revision' ? 'block' : 'none' }}><UT02RevisionPallet key="ut02" /></div>}

          {/* BD */}
          {tabsMontadas.has('bd-usuarios') && <div style={{ display: activeTab === 'bd-usuarios' ? 'block' : 'none' }}><BD01Usuarios key="bd01" /></div>}
          {tabsMontadas.has('bd-locales') && <div style={{ display: activeTab === 'bd-locales' ? 'block' : 'none' }}><BD02Locales key="bd02" /></div>}

          {/* Módulo no encontrado */}
          {!['dashboard', 'ed', 'ed-history', 'ed-tickets', 'ed-lotes', 'sd', 'sd-informe-bultos', 'sd-informe-unidades', 'sd-analisis-bultos', 'ut', 'ut-revision', 'bd-usuarios', 'bd-locales'].includes(activeTab) && (
            <div className="module-container"><h3>Módulo en desarrollo</h3></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
