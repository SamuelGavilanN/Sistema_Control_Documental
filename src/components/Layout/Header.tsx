// src/components/Layout/Header.tsx

import React, { useState, useEffect } from 'react';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const API_KEY = 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G';
const HEADERS = { 'apikey': API_KEY, 'Authorization': 'Bearer ' + API_KEY };

interface HeaderProps {
  activeTab: string;
  openTabs: string[];
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  usuario: any;
  onLogout: () => void;
  onOpenModule?: (moduleId: string) => void;
}

const moduleTitles: Record<string, string> = {
  'dashboard': 'Ventana de Trabajo',
  'ed': 'ED01 · Reg Empaque',
  'ed-history': 'ED02 · Dashboard',
  'ed-tickets': 'ED03 · BT Portico',
  'ed-lotes': 'ED04 · Almacén Lotes',
  'ad': 'AD01 · Gestión Auditoría',
  'ad-captura': 'AD02 · Captura Física',
  'ad-dashboard': 'AD03 · Dashboard',
  'rp': 'RP01 · Carga Revisión',
  'rp-revision': 'RP02 · Revisar Pallet',
  'tk': 'TK01 · Crear Ticket',
  'tk-dashboard': 'TK02 · Dashboard',
  'bd-usuarios': 'BD01 · Usuarios',
  'bd-locales': 'BD02 · Locales',
  'rd': 'RD01 · Ingreso Devolución',
  'rd-salida': 'RD02 · Salida Devolución',
  'rd-informe': 'RD03 · Informe',
  'rd-dashboard': 'RD04 · Dashboard Devolución',
  'sd': 'SD01 · Salida Despacho',
  'sd-asignador': 'SD02 · Asignador Móvil',
  'lp': 'LP01 · Crear Pedido',
  'lp-captura': 'LP02 · Capturar LPN',
  'ut': 'UT01 · Correlativo QR',
};

interface Notificacion {
  id: string;
  ticket_id: string;
  ticket_numero: string;
  tipo_problema: string;
  prioridad: string;
  area: string;
  creado_en: string;
  visto: boolean;
}

const Header: React.FC<HeaderProps> = ({ activeTab, openTabs, onTabClick, onTabClose, usuario, onLogout, onOpenModule }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [toastActual, setToastActual] = useState<Notificacion | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketModalData, setTicketModalData] = useState<any>(null);
  const [ticketRespuestas, setTicketRespuestas] = useState<any[]>([]);
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});
  const [toastMostrado, setToastMostrado] = useState<Set<string>>(new Set());
  const [darkMode, setDarkMode] = useState(false);

  const getTabTitle = (tabId: string): string => moduleTitles[tabId] || tabId;
  const iniciales = usuario ? `${usuario.nombre?.charAt(0) || ''}${usuario.apellido?.charAt(0) || ''}`.toUpperCase() : '??';
  const nombreCompleto = usuario ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() : 'Usuario';
  const noVistas = notificaciones.filter(n => !n.visto).length;

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  useEffect(() => {
    if (!usuario) return;
    cargarNombresUsuarios();
    cargarNotificaciones();
    const intervalo = setInterval(cargarNotificaciones, 5000);
    return () => clearInterval(intervalo);
  }, [usuario]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-area') && !target.closest('.notif-area')) {
        setShowUserMenu(false); setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  };

  const cargarNombresUsuarios = async () => {
    try {
      const resp = await fetch(API_URL + '/usuarios?select=id,nombre,apellido', { headers: HEADERS });
      const data = await resp.json();
      if (data) { const m: Record<string, string> = {}; data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido}`; }); setNombresUsuarios(m); }
    } catch (e) {}
  };

  const abrirModalDesdeToast = async (n: Notificacion) => {
    setToastActual(null);
    await fetch(API_URL + '/ticket_notificaciones?id=eq.' + n.id, { method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ visto: true }) });
    const resp = await fetch(API_URL + '/tickets?select=*&id=eq.' + n.ticket_id, { headers: HEADERS });
    const tickets = await resp.json(); const ticket = tickets?.[0];
    const resp2 = await fetch(API_URL + '/ticket_respuestas?select=*&ticket_id=eq.' + ticket?.id + '&order=creado_en.asc', { headers: HEADERS });
    setTicketModalData(ticket); setTicketRespuestas(await resp2.json() || []); setRespuestaTexto(''); setShowTicketModal(true);
    cargarNotificaciones();
  };

  const cargarNotificaciones = async () => {
    try {
      if (!usuario?.id) return;
      const resp = await fetch(API_URL + '/ticket_notificaciones?usuario_id=eq.' + usuario.id + '&visto=eq.false&order=creado_en.desc&limit=20', { headers: HEADERS });
      const notifs = await resp.json();
      if (!notifs || notifs.length === 0) return;
      const nuevas: Notificacion[] = [];
      for (const n of notifs) {
        const resp2 = await fetch(API_URL + '/tickets?select=numero_ticket,tipo_problema,prioridad,area&id=eq.' + n.ticket_id, { headers: HEADERS });
        const tickets = await resp2.json(); const ticket = tickets?.[0];
        nuevas.push({ id: n.id, ticket_id: n.ticket_id, ticket_numero: ticket?.numero_ticket || '', tipo_problema: ticket?.tipo_problema || '', prioridad: ticket?.prioridad || '', area: ticket?.area || '', creado_en: n.creado_en, visto: n.visto });
      }
      setNotificaciones(nuevas);
      const noVistasList = nuevas.filter(n => !n.visto && !toastMostrado.has(n.id));
      if (noVistasList.length > 0) { setToastActual(noVistasList[0]); setToastMostrado(prev => new Set([...prev, noVistasList[0].id])); setTimeout(() => setToastActual(null), 8000); }
    } catch (e) {}
  };

  const marcarVisto = async (notifId: string) => {
    await fetch(API_URL + '/ticket_notificaciones?id=eq.' + notifId, { method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ visto: true }) });
    cargarNotificaciones();
  };

  const marcarTodasVisto = async () => {
    for (const n of notificaciones) { await fetch(API_URL + '/ticket_notificaciones?id=eq.' + n.id, { method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ visto: true }) }); }
    cargarNotificaciones();
  };

  const handleNotifClick = async (n: Notificacion) => {
    marcarVisto(n.id); setShowNotifMenu(false);
    const resp = await fetch(API_URL + '/tickets?select=*&id=eq.' + n.ticket_id, { headers: HEADERS });
    const tickets = await resp.json(); const ticket = tickets?.[0];
    const resp2 = await fetch(API_URL + '/ticket_respuestas?select=*&ticket_id=eq.' + ticket?.id + '&order=creado_en.asc', { headers: HEADERS });
    setTicketModalData(ticket); setTicketRespuestas(await resp2.json() || []); setRespuestaTexto(''); setShowTicketModal(true);
  };

  const handleResponderDesdeModal = async () => {
    if (!respuestaTexto.trim() || !ticketModalData) return;
    await fetch(API_URL + '/ticket_respuestas', { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_id: ticketModalData.id, mensaje: respuestaTexto, creado_por: usuario?.id }) });
    if (ticketModalData.creado_por !== usuario?.id) { await fetch(API_URL + '/ticket_notificaciones', { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_id: ticketModalData.id, usuario_id: ticketModalData.creado_por }) }); }
    setRespuestaTexto('');
    const resp = await fetch(API_URL + '/ticket_respuestas?select=*&ticket_id=eq.' + ticketModalData.id + '&order=creado_en.asc', { headers: HEADERS });
    setTicketRespuestas(await resp.json());
  };

  const getPrioridadColor = (p: string) => {
    switch (p) { case 'Urgente': return '#dc2626'; case 'Alta': return '#ea580c'; case 'Media': return '#b45309'; default: return '#15803d'; }
  };

  return (
    <div className="top-header">
      <div className="tabs-bar">
        {openTabs.map(tabId => (
          <div key={tabId} className={`tab ${activeTab === tabId ? 'active-tab' : ''}`} onClick={() => onTabClick(tabId)}>
            <span>{getTabTitle(tabId)}</span>
            {tabId !== 'dashboard' && <span className="tab-close" onClick={(e) => { e.stopPropagation(); onTabClose(tabId); }}>×</span>}
          </div>
        ))}
      </div>

      <button 
        onClick={toggleDarkMode} 
        className="theme-toggle-btn"
        title={darkMode ? 'Modo Claro' : 'Modo Oscuro'}
        style={{
          width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--btn-bg)', border: '1px solid var(--btn-border)', borderRadius: '8px',
          cursor: 'pointer', transition: 'all 0.15s', marginRight: '10px', color: 'var(--text-muted)'
        }}
      >
        {darkMode ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 1V2M8 14V15M1 8H2M14 8H15M3.05 3.05L3.76 3.76M12.24 12.24L12.95 12.95M3.05 12.95L3.76 12.24M12.24 3.76L12.95 3.05" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13.5 8.5C12.5 11 10 13 7.5 13C5.5 13 3.5 12 2.5 10C4 11 7 10.5 8.5 8C10 5.5 9.5 3 8.5 2C12 2.5 14 5.5 13.5 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <div className="notif-area" style={{ position: 'relative', marginRight: '10px' }}>
        <button className="notif-btn" onClick={(e) => { e.stopPropagation(); setShowNotifMenu(!showNotifMenu); setShowUserMenu(false); }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 2C5.34315 2 4 3.34315 4 5V9L2 12H14L12 9V5C12 3.34315 10.6569 2 9 2H7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 15C7 16.1046 7.89543 17 9 17C10.1046 17 11 16.1046 11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          {noVistas > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: '#dc2626', color: 'white', fontSize: '10px', fontWeight: 600, padding: '1px 5px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>{no
