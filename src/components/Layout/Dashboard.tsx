// src/components/Layout/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { auth } from '../../lib/auth';

interface DashboardProps {
  onModuleClick?: (moduleId: string) => void;
  rol?: string;
  permisos?: string[];
}

const transacciones = [
  { id: 'ad', label: 'AD01 · Gestión Auditoría', desc: 'Crear y gestionar tareas de auditoría', color: '#8b5cf6' },
  { id: 'ad-captura', label: 'AD02 · Captura Física', desc: 'Realizar capturas físicas de auditoría', color: '#ec4899' },
  { id: 'ad-dashboard', label: 'AD03 · Dashboard Auditoría', desc: 'KPIs y estadísticas de auditorías', color: '#06b6d4' },
  { id: 'ed', label: 'ED01 · Registro Empaque', desc: 'Registrar y gestionar empaques directos', color: '#3b82f6' },
  { id: 'ed-history', label: 'ED02 · Dashboard Producción', desc: 'KPIs y estadísticas de producción', color: '#6366f1' },
  { id: 'ed-tickets', label: 'ED03 · BT Portico', desc: 'Gestión de tickets desde pórtico', color: '#8b5cf6' },
  { id: 'ed-lotes', label: 'ED04 · Almacén Lotes', desc: 'Gestión de lotes de etiquetas', color: '#06b6d4' },
  { id: 'rd', label: 'RD01 · Recepción Devolución', desc: 'Gestionar ingresos de devolución', color: '#f59e0b' },
  { id: 'sd', label: 'SD01 · Salida Despacho', desc: 'Gestionar salidas de despacho', color: '#10b981' },
  { id: 'sd-asignador', label: 'SD02 · Asignador Móvil', desc: 'Asignar transportes pendientes', color: '#14b8a6' },
  { id: 'lp', label: 'LP01 · Crear Pedido', desc: 'Crear y gestionar pedidos', color: '#0ea5e9' },
  { id: 'lp-captura', label: 'LP02 · Capturar LPN', desc: 'Capturar códigos LPN', color: '#0891b2' },
  { id: 'rp', label: 'RP01 · Carga Revisión', desc: 'Cargar inventario de empaques', color: '#f97316' },
  { id: 'rp-revision', label: 'RP02 · Revisar Pallet', desc: 'Revisar pallets cargados', color: '#ef4444' },
  { id: 'tk', label: 'TK01 · Crear Ticket', desc: 'Crear tickets de soporte', color: '#dc2626' },
  { id: 'tk-dashboard', label: 'TK02 · Dashboard Tickets', desc: 'KPIs y métricas de tickets', color: '#b91c1c' },
  { id: 'bd-usuarios', label: 'BD01 · Usuarios', desc: 'Administración de usuarios', color: '#64748b' },
  { id: 'bd-locales', label: 'BD02 · Locales', desc: 'Administración de locales', color: '#475569' },
  { id: 'ut', label: 'UT01 · Correlativo QR', desc: 'Generar códigos QR', color: '#0891b2' },
];

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const Dashboard: React.FC<DashboardProps> = ({ onModuleClick, rol, permisos }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [cargandoFavoritos, setCargandoFavoritos] = useState(true);
  const usuario = auth.getUsuario();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cargar favoritos del usuario
  useEffect(() => {
    cargarFavoritos();
    const intervalo = setInterval(cargarFavoritos, 5000);
    return () => clearInterval(intervalo);
  }, [usuario?.id]);

  const cargarFavoritos = async () => {
    if (!usuario?.id) {
      setCargandoFavoritos(false);
      return;
    }
    try {
      const resp = await fetch(
        API_URL + '/usuario_favoritos?select=transaccion_id&usuario_id=eq.' + usuario.id,
        { headers: HEADERS }
      );
      const data = await resp.json();
      if (data) {
        setFavoritos(data.map((f: any) => f.transaccion_id));
      }
    } catch (e) {
      // Si la tabla no existe aún, no pasa nada
      console.error('Error cargando favoritos:', e);
    }
    setCargandoFavoritos(false);
  };

  const toggleFavorito = async (transaccionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!usuario?.id) return;

    const esFavorito = favoritos.includes(transaccionId);
    
    try {
      if (esFavorito) {
        // Eliminar de favoritos
        await fetch(
          API_URL + '/usuario_favoritos?usuario_id=eq.' + usuario.id + '&transaccion_id=eq.' + transaccionId,
          { method: 'DELETE', headers: HEADERS }
        );
        setFavoritos(favoritos.filter(f => f !== transaccionId));
      } else {
        // Agregar a favoritos
        await fetch(
          API_URL + '/usuario_favoritos',
          {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              usuario_id: usuario.id,
              transaccion_id: transaccionId
            })
          }
        );
        setFavoritos([...favoritos, transaccionId]);
      }
    } catch (e) {
      console.error('Error toggle favorito:', e);
    }
  };

  const itemPermitido = (itemId: string): boolean => {
    if (!permisos || permisos.length === 0) {
      if (itemId === 'ed-history' && rol === 'Portico') return false;
      if ((itemId === 'tk' || itemId === 'tk-dashboard') && rol === 'Portico') return false;
      if ((itemId === 'ad' || itemId === 'ad-captura' || itemId === 'ad-dashboard') && rol === 'Portico') return false;
      if ((itemId === 'bd-usuarios' || itemId === 'bd-locales') && rol !== 'Owner' && rol !== 'Admin') return false;
      if ((itemId === 'rd-salida' || itemId === 'rd-informe' || itemId === 'rd-dashboard') && rol !== 'Admin' && rol !== 'Owner') return false;
      return true;
    }
    return permisos.includes(itemId);
  };

  const trans = transacciones.filter(t => itemPermitido(t.id));

  // Separar favoritos y resto
  const transFavoritas = trans.filter(t => favoritos.includes(t.id));
  const transResto = trans.filter(t => !favoritos.includes(t.id));

  return (
    <div style={{ 
      background: 'var(--bg-panel)', 
      borderRadius: '16px', 
      padding: isMobile ? '16px' : '40px', 
      border: '1px solid var(--border)' 
    }}>
      <h1 style={{ 
        fontSize: isMobile ? '18px' : '24px', 
        fontWeight: 600, 
        color: 'var(--text-primary)', 
        marginBottom: '6px' 
      }}>
        FASHIONSPARK
      </h1>
      <p style={{ 
        fontSize: isMobile ? '12px' : '14px', 
        color: 'var(--text-muted)', 
        marginBottom: isMobile ? '16px' : '24px' 
      }}>
        Sistema de Gestion Documental
      </p>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Favoritos */}
          {transFavoritas.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '4px' }}>
                Favoritos
              </div>
              {transFavoritas.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => onModuleClick?.(t.id)} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    padding: '12px 14px', 
                    background: 'var(--bg-section)', 
                    borderRadius: '10px', 
                    border: '1px solid var(--border)', 
                    cursor: 'pointer',
                    marginBottom: '6px'
                  }}
                >
                  <div style={{ width: '4px', height: '36px', background: t.color, borderRadius: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.desc}</div>
                  </div>
                  <button
                    onClick={(e) => toggleFavorito(t.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: '#f59e0b',
                      fontSize: '18px',
                      flexShrink: 0
                    }}
                    title="Quitar de favoritos"
                  >
                    ★
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Resto */}
          {transResto.map(t => (
            <div 
              key={t.id} 
              onClick={() => onModuleClick?.(t.id)} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '12px 14px', 
                background: 'var(--bg-section)', 
                borderRadius: '10px', 
                border: '1px solid var(--border)', 
                cursor: 'pointer',
                marginBottom: '6px'
              }}
            >
              <div style={{ width: '4px', height: '36px', background: t.color, borderRadius: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.desc}</div>
              </div>
              <button
                onClick={(e) => toggleFavorito(t.id, e)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--text-muted)',
                  fontSize: '18px',
                  flexShrink: 0
                }}
                title="Agregar a favoritos"
              >
                ☆
              </button>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Selecciona una transaccion en el menu lateral para comenzar.
          </p>

          {/* Favoritos */}
          {transFavoritas.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ color: '#f59e0b' }}>★</span> Favoritos
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {transFavoritas.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => onModuleClick?.(t.id)} 
                    style={{ 
                      padding: '20px', 
                      background: 'var(--bg-section)', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border)', 
                      cursor: 'pointer', 
                      transition: 'all 0.15s', 
                      borderLeft: `4px solid ${t.color}`,
                      position: 'relative'
                    }}
                    onMouseEnter={(e: any) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e: any) => { e.currentTarget.style.background = 'var(--bg-section)'; }}
                  >
                    <button
                      onClick={(e) => toggleFavorito(t.id, e)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#f59e0b',
                        fontSize: '18px'
                      }}
                      title="Quitar de favoritos"
                    >
                      ★
                    </button>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: t.color, margin: '0 0 6px', paddingRight: '30px' }}>{t.label}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Todas las transacciones */}
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px', 
            marginBottom: '12px' 
          }}>
            Todas las Transacciones
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {transResto.map(t => (
              <div 
                key={t.id} 
                onClick={() => onModuleClick?.(t.id)} 
                style={{ 
                  padding: '20px', 
                  background: 'var(--bg-section)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border)', 
                  cursor: 'pointer', 
                  transition: 'all 0.15s', 
                  borderLeft: `4px solid ${t.color}`,
                  position: 'relative'
                }}
                onMouseEnter={(e: any) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e: any) => { e.currentTarget.style.background = 'var(--bg-section)'; }}
              >
                <button
                  onClick={(e) => toggleFavorito(t.id, e)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: 'var(--text-muted)',
                    fontSize: '18px'
                  }}
                  title="Agregar a favoritos"
                >
                  ☆
                </button>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: t.color, margin: '0 0 6px', paddingRight: '30px' }}>{t.label}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
