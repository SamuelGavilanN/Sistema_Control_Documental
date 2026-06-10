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
  'ad': 'AD01 · Gestión Auditoría',
  'ad-captura': 'AD02 · Captura Física',
  'ad-dashboard': 'AD03 · Dashboard',
  'tk': 'TK01 · Crear Ticket',
  'tk-dashboard': 'TK02 · Dashboard',
  'bd-usuarios': 'BD01 · Usuarios',
  'bd-locales': 'BD02 · Locales',
  'rd': 'RD01 · Ingreso Devolución',
  'rd-salida': 'RD02 · Salida Devolución',
  'rd-informe': 'RD03 · Informe',
  'rd-dashboard': 'RD04 · Dashboard Devolución',
  'sd': 'SD01 · Salida Despacho',
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

  const getTabTitle = (tabId: string): string => moduleTitles[tabId] || tabId;
  const iniciales = usuario ? `${usuario.nombre?.charAt(0) || ''}${usuario.apellido?.charAt(0) || ''}`.toUpperCase() : '??';
  const nombreCompleto = usuario ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() : 'Usuario';
  const noVistas = notificaciones.filter(n => !n.visto).length;

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

  const cargarNombresUsuarios = async () => {
    try {
      const resp = await fetch(`${API_URL}/usuarios?select=id,nombre,apellido`, { headers: HEADERS });
      const data = await resp.json();
      if (data) { const m: Record<string, string> = {}; data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido}`; }); setNombresUsuarios(m); }
    } catch (e) {}
  };

  const abrirModalDesdeToast = async (n: Notificacion) => {
    setToastActual(null);
    await fetch(`${API_URL}/ticket_notificaciones?id=eq.${n.id}`, { method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ visto: true }) });
    const resp = await fetch(`${API_URL}/tickets?select=*&id=eq.${n.ticket_id}`, { headers: HEADERS });
    const tickets = await resp.json(); const ticket = tickets?.[0];
    const resp2 = await fetch(`${API_URL}/ticket_respuestas?select=*&ticket_id=eq.${ticket?.id}&order=creado_en.asc`, { headers: HEADERS });
    setTicketModalData(ticket); setTicketRespuestas(await resp2.json() || []); setRespuestaTexto(''); setShowTicketModal(true);
    cargarNotificaciones();
  };

  const cargarNotificaciones = async () => {
    try {
      if (!usuario?.id) return;
      const resp = await fetch(`${API_URL}/ticket_notificaciones?usuario_id=eq.${usuario.id}&visto=eq.false&order=creado_en.desc&limit=20`, { headers: HEADERS });
      const notifs = await resp.json();
      if (!notifs || notifs.length === 0) return;
      const nuevas: Notificacion[] = [];
      for (const n of notifs) {
        const resp2 = await fetch(`${API_URL}/tickets?select=numero_ticket,tipo_problema,prioridad,area&id=eq.${n.ticket_id}`, { headers: HEADERS });
        const tickets = await resp2.json(); const ticket = tickets?.[0];
        nuevas.push({ id: n.id, ticket_id: n.ticket_id, ticket_numero: ticket?.numero_ticket || '', tipo_problema: ticket?.tipo_problema || '', prioridad: ticket?.prioridad || '', area: ticket?.area || '', creado_en: n.creado_en, visto: n.visto });
      }
      setNotificaciones(nuevas);
      const noVistasList = nuevas.filter(n => !n.visto && !toastMostrado.has(n.id));
      if (noVistasList.length > 0) { setToastActual(noVistasList[0]); setToastMostrado(prev => new Set([...prev, noVistasList[0].id])); setTimeout(() => setToastActual(null), 8000); }
    } catch (e) {}
  };

  const marcarVisto = async (notifId: string) => {
    await fetch(`${API_URL}/ticket_notificaciones?id=eq.${notifId}`, { method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ visto: true }) });
    cargarNotificaciones();
  };

  const marcarTodasVisto = async () => {
    for (const n of notificaciones) { await fetch(`${API_URL}/ticket_notificaciones?id=eq.${n.id}`, { method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ visto: true }) }); }
    cargarNotificaciones();
  };

  const handleNotifClick = async (n: Notificacion) => {
    marcarVisto(n.id); setShowNotifMenu(false);
    const resp = await fetch(`${API_URL}/tickets?select=*&id=eq.${n.ticket_id}`, { headers: HEADERS });
    const tickets = await resp.json(); const ticket = tickets?.[0];
    const resp2 = await fetch(`${API_URL}/ticket_respuestas?select=*&ticket_id=eq.${ticket?.id}&order=creado_en.asc`, { headers: HEADERS });
    setTicketModalData(ticket); setTicketRespuestas(await resp2.json() || []); setRespuestaTexto(''); setShowTicketModal(true);
  };

  const handleResponderDesdeModal = async () => {
    if (!respuestaTexto.trim() || !ticketModalData) return;
    await fetch(`${API_URL}/ticket_respuestas`, { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_id: ticketModalData.id, mensaje: respuestaTexto, creado_por: usuario?.id }) });
    if (ticketModalData.creado_por !== usuario?.id) { await fetch(`${API_URL}/ticket_notificaciones`, { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_id: ticketModalData.id, usuario_id: ticketModalData.creado_por }) }); }
    setRespuestaTexto('');
    const resp = await fetch(`${API_URL}/ticket_respuestas?select=*&ticket_id=eq.${ticketModalData.id}&order=creado_en.asc`, { headers: HEADERS });
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
      <div className="notif-area" style={{ position: 'relative', marginRight: '10px' }}>
        <button className="notif-btn" onClick={(e) => { e.stopPropagation(); setShowNotifMenu(!showNotifMenu); setShowUserMenu(false); }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 2C5.34315 2 4 3.34315 4 5V9L2 12H14L12 9V5C12 3.34315 10.6569 2 9 2H7Z" stroke="#64748b" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 15C7 16.1046 7.89543 17 9 17C10.1046 17 11 16.1046 11 15" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/></svg>
          {noVistas > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: '#dc2626', color: 'white', fontSize: '10px', fontWeight: 600, padding: '1px 5px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>{noVistas}</span>}
        </button>
        {showNotifMenu && (
          <div className="user-menu" style={{ minWidth: '300px', right: 0, left: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #eef0f5' }}><span style={{ fontWeight: 600, fontSize: '13px' }}>Notificaciones</span><button onClick={marcarTodasVisto} style={{ fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>Marcar todas vistas</button></div>
            {notificaciones.length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Sin notificaciones</div> : notificaciones.map(n => (
              <div key={n.id} className="user-menu-item" onClick={() => handleNotifClick(n)} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px', opacity: n.visto ? 0.6 : 1 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: n.visto ? 'transparent' : getPrioridadColor(n.prioridad) }}></span><span style={{ fontWeight: 600, fontSize: '13px' }}>{n.ticket_numero}</span><span style={{ fontSize: '11px', color: '#64748b' }}>{n.tipo_problema}</span></div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(n.creado_en).toLocaleString('es-CL')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="user-area">
        <div className="user-info" onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); setShowNotifMenu(false); }}>
          <div className="user-avatar"><span>{iniciales}</span></div><span className="user-name">{nombreCompleto}</span>
          <svg className="user-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {showUserMenu && (
          <div className="user-menu" onClick={e => e.stopPropagation()}>
            <div className="user-menu-item" onClick={() => { onLogout(); setShowUserMenu(false); }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 13V11H3V3H6V1H2V13H6Z" fill="#64748b"/><path d="M10 4L14 8L10 12V9H6V7H10V4Z" fill="#64748b"/></svg><span>Cerrar Sesion</span>
            </div>
          </div>
        )}
      </div>

      {toastActual && (
        <div onClick={() => abrirModalDesdeToast(toastActual)} style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 3000, background: 'white', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', border: '1px solid #eef0f5', minWidth: '320px', cursor: 'pointer', animation: 'slideIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Nuevo Ticket · {toastActual.area}</span><span style={{ background: getPrioridadColor(toastActual.prioridad), color: 'white', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600 }}>{toastActual.prioridad}</span></div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: '0 0 2px' }}>{toastActual.ticket_numero}</p><p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{toastActual.tipo_problema}</p>
        </div>
      )}

      {showTicketModal && ticketModalData && (
        <div className="ed01-modal-overlay" onClick={() => setShowTicketModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header"><h2>{ticketModalData.numero_ticket}</h2><button className="ed01-modal-close" onClick={() => setShowTicketModal(false)}>×</button></div>
            <div className="ed01-modal-body">
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', fontSize: '13px' }}><div><strong>Tipo:</strong> {ticketModalData.tipo_problema}</div><div><strong>Prioridad:</strong> {ticketModalData.prioridad}</div><div><strong>Empaque:</strong> {ticketModalData.numero_empaque || '-'}</div><div><strong>Estado:</strong> {ticketModalData.estado}</div></div>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}><strong>Descripcion:</strong> {ticketModalData.descripcion}</p>
              <div style={{ marginBottom: '16px', maxHeight: '250px', overflowY: 'auto' }}><h4 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Historial</h4>
                {ticketRespuestas.length === 0 ? <p style={{ fontSize: '12px', color: '#94a3b8' }}>Sin respuestas</p> : ticketRespuestas.map((r: any) => (
                  <div key={r.id} style={{ background: '#f8fafd', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', border: '1px solid #eef0f5' }}><p style={{ fontSize: '13px', color: '#1e293b', margin: '0 0 4px' }}>{r.mensaje}</p><span style={{ fontSize: '10px', color: '#94a3b8' }}>{nombresUsuarios[r.creado_por] || 'Usuario'} · {new Date(r.creado_en).toLocaleString('es-CL')}</span></div>
                ))}
              </div>
              {ticketModalData.estado !== 'Resuelto' && ticketModalData.estado !== 'Cerrado' && (
                <div><textarea value={respuestaTexto} onChange={e => setRespuestaTexto(e.target.value)} placeholder="Escribe una respuesta..." rows={3} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', marginBottom: '10px' }} />
                  <button className="ed01-btn-save" onClick={handleResponderDesdeModal}>Responder</button></div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}.notif-btn{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:white;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;transition:all 0.15s;position:relative}.notif-btn:hover{background:#f8fafd}`}</style>
    </div>
  );
};

export default Header;
