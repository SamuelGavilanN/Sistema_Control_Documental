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
  const usuario = auth.getUsuario();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cargar favoritos con polling
  useEffect(() => {
    if (!usuario?.id) return;
    
    const cargarFavoritos = async () => {
      try {
        const resp = await fetch(
          API_URL + '/usuario_favoritos?select=transaccion_id&usuario_id=eq.' + usuario.id,
          { headers: HEADERS }
        );
        const data = await resp.json();
        if (data) {
          setFavoritos(data.map((f: any) => f.transaccion_id));
        }
      } catch (e) {}
    };

    cargarFavoritos();
    const intervalo = setInterval(cargarFavoritos, 5000);
    return () => clearInterval(intervalo);
  }, [usuario?.id]);

  // Filtrar solo favoritos que estén permitidos
  const transFavoritas = transacciones.filter(t => favoritos.includes(t.id));

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

      {transFavoritas.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: isMobile ? '30px 16px' : '50px 20px',
          color: 'var(--text-placeholder)'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '12px', opacity: 0.5 }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <p style={{ fontSize: '15px', marginBottom: '4px' }}>No tienes transacciones favoritas</p>
          <p style={{ fontSize: '13px' }}>
            Marca tus transacciones favoritas en el menú lateral con ★
          </p>
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                cursor: 'pointer'
              }}
            >
              <div style={{ width: '4px', height: '36px', background: t.color, borderRadius: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.desc}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="var(--text-placeholder)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Accesos rapidos a tus transacciones favoritas
          </p>
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
                  borderLeft: `4px solid ${t.color}`
                }}
                onMouseEnter={(e: any) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e: any) => { e.currentTarget.style.background = 'var(--bg-section)'; }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: t.color, margin: '0 0 6px' }}>{t.label}</h3>
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
