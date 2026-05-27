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
  'tk': 'TK01 · Crear Ticket',
  'tk-dashboard': 'TK02 · Dashboard',
};

interface Notificacion {
  id: string;
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

  const getTabTitle = (tabId: string): string => moduleTitles[tabId] || tabId;
  const iniciales = usuario ? `${usuario.nombre?.charAt(0) || ''}${usuario.apellido?.charAt(0) || ''}`.toUpperCase() : '??';
  const nombreCompleto = usuario ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() : 'Usuario';
  const noVistas = notificaciones.filter(n => !n.visto).length;

  useEffect(() => {
    if (!usuario) return;
    cargarNotificaciones();
    const intervalo = setInterval(cargarNotificaciones, 30000);
    return () => clearInterval(intervalo);
  }, [usuario]);

  const cargarNotificaciones = async () => {
    try {
      const resp = await fetch(`${API_URL}/ticket_notificaciones?usuario_id=eq.${usuario?.id}&order=creado_en.desc&limit=10`, { headers: HEADERS });
      const notifs = await resp.json();
      if (!notifs || notifs.length === 0) return;

      const nuevas: Notificacion[] = [];
      for (const n of notifs) {
        const resp2 = await fetch(`${API_URL}/tickets?select=numero_ticket,tipo_problema,prioridad,area&id=eq.${n.ticket_id}`, { headers: HEADERS });
        const tickets = await resp2.json();
        const ticket = tickets?.[0];
        nuevas.push({
          id: n.id, ticket_numero: ticket?.numero_ticket || '', tipo_problema: ticket?.tipo_problema || '',
          prioridad: ticket?.prioridad || '', area: ticket?.area || '', creado_en: n.creado_en, visto: n.visto
        });
      }

      const anteriores = notificaciones.map(n => n.id);
      const recienLlegadas = nuevas.filter(n => !anteriores.includes(n.id) && !n.visto);
      if (recienLlegadas.length > 0) { setToastActual(recienLlegadas[0]); setTimeout(() => setToastActual(null), 5000); }
      setNotificaciones(nuevas);
    } catch (e) { console.error(e); }
  };

  const marcarVisto = async (notifId: string) => {
    await fetch(`${API_URL}/ticket_notificaciones?id=eq.${notifId}`, { method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ visto: true }) });
    cargarNotificaciones();
  };

  const marcarTodasVisto = async () => {
    for (const n of notificaciones.filter(n => !n.visto)) {
      await fetch(`${API_URL}/ticket_notificaciones?id=eq.${n.id}`, { method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ visto: true }) });
    }
    cargarNotificaciones();
  };

  const handleNotifClick = (n: Notificacion) => {
    marcarVisto(n.id);
    setShowNotifMenu(false);
    onOpenModule?.('ed-tickets');
  };

  const handleToastClick = () => {
    setToastActual(null);
    onOpenModule?.('ed-tickets');
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
        <button className="notif-btn" onClick={() => { setShowNotifMenu(!showNotifMenu); setShowUserMenu(false); }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 2C5.34315 2 4 3.34315 4 5V9L2 12H14L12 9V5C12 3.34315 10.6569 2 9 2H7Z" stroke="#64748b" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 15C7 16.1046 7.89543 17 9 17C10.1046 17 11 16.1046 11 15" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/></svg>
          {noVistas > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: '#dc2626', color: 'white', fontSize: '10px', fontWeight: 600, padding: '1px 5px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>{noVistas}</span>}
        </button>

        {showNotifMenu && (
          <div className="user-menu" style={{ minWidth: '300px', right: 0, left: 'auto' }}>
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
        <div className="user-info" onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifMenu(false); }}>
          <div className="user-avatar"><span>{iniciales}</span></div><span className="user-name">{nombreCompleto}</span>
          <svg className="user-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {showUserMenu && <div className="user-menu"><div className="user-menu-item" onClick={() => { onLogout(); setShowUserMenu(false); }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 13V11H3V3H6V1H2V13H6Z" fill="#64748b"/><path d="M10 4L14 8L10 12V9H6V7H10V4Z" fill="#64748b"/></svg><span>Cerrar Sesion</span></div></div>}
      </div>

      {toastActual && (
        <div onClick={handleToastClick} style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 3000, background: 'white', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', border: '1px solid #eef0f5', minWidth: '320px', animation: 'slideIn 0.3s ease', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Nuevo Ticket · {toastActual.area}</span><span style={{ background: getPrioridadColor(toastActual.prioridad), color: 'white', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600 }}>{toastActual.prioridad}</span></div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: '0 0 2px' }}>{toastActual.ticket_numero}</p><p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{toastActual.tipo_problema}</p>
          <button onClick={(e) => { e.stopPropagation(); setToastActual(null); }} style={{ position: 'absolute', top: '8px', right: '12px', background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>
      )}

      <style>{`@keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}.notif-btn{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:white;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;transition:all 0.15s;position:relative}.notif-btn:hover{background:#f8fafd}`}</style>
    </div>
  );
};

export default Header;
