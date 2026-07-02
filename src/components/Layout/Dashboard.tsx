// src/components/Layout/Dashboard.tsx

import React, { useState, useEffect } from 'react';

interface DashboardProps {
  onModuleClick?: (moduleId: string) => void;
  rol?: string;
  permisos?: string[];
}

const transacciones = [
  { id: 'ed', label: 'ED01 · Registro Empaque', desc: 'Registrar y gestionar empaques directos', color: '#3b82f6' },
  { id: 'ed-history', label: 'ED02 · Dashboard Producción', desc: 'KPIs y estadísticas de producción', color: '#6366f1' },
  { id: 'ed-tickets', label: 'ED03 · BT Portico', desc: 'Gestión de tickets desde pórtico', color: '#8b5cf6' },
  { id: 'ad', label: 'AD01 · Gestión Auditoría', desc: 'Crear y gestionar tareas de auditoría', color: '#ec4899' },
  { id: 'ad-captura', label: 'AD02 · Captura Física', desc: 'Realizar capturas físicas de auditoría', color: '#f43f5e' },
  { id: 'ad-dashboard', label: 'AD03 · Dashboard Auditoría', desc: 'KPIs y estadísticas de auditorías', color: '#06b6d4' },
  { id: 'rd', label: 'RD01 · Recepción Devolución', desc: 'Gestionar ingresos de devolución', color: '#f59e0b' },
  { id: 'sd', label: 'SD01 · Salida Despacho', desc: 'Gestionar salidas de despacho', color: '#10b981' },
  { id: 'lp', label: 'LP01 · Crear Pedido', desc: 'Crear y gestionar pedidos', color: '#14b8a6' },
  { id: 'lp-captura', label: 'LP02 · Capturar LPN', desc: 'Capturar códigos LPN', color: '#0ea5e9' },
  { id: 'tk', label: 'TK01 · Crear Ticket', desc: 'Crear tickets de soporte', color: '#ef4444' },
  { id: 'tk-dashboard', label: 'TK02 · Dashboard Tickets', desc: 'KPIs y métricas de tickets', color: '#dc2626' },
  { id: 'bd-usuarios', label: 'BD01 · Usuarios', desc: 'Administración de usuarios', color: '#64748b' },
  { id: 'bd-locales', label: 'BD02 · Locales', desc: 'Administración de locales', color: '#475569' },
  { id: 'ut', label: 'UT01 · Correlativo QR', desc: 'Generar códigos QR', color: '#0891b2' },
];

const Dashboard: React.FC<DashboardProps> = ({ onModuleClick, rol, permisos }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemPermitido = (itemId: string): boolean => {
    if (!permisos || permisos.length === 0) {
      if (itemId === 'ed-history' && rol === 'Portico') return false;
      if ((itemId === 'tk' || itemId === 'tk-dashboard') && rol === 'Portico') return false;
      if ((itemId === 'ad' || itemId === 'ad-captura' || itemId === 'ad-dashboard') && rol === 'Portico') return false;
      if ((itemId === 'bd-usuarios' || itemId === 'bd-locales') && rol !== 'Owner' && rol !== 'Admin') return false;
      return true;
    }
    return permisos.includes(itemId);
  };

  const trans = transacciones.filter(t => itemPermitido(t.id));

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
        Sistema de Gestión Documental
      </p>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {trans.map(t => (
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
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e: any) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e: any) => { e.currentTarget.style.background = 'var(--bg-section)'; }}
            >
              <div style={{ 
                width: '4px', 
                height: '36px', 
                background: t.color, 
                borderRadius: '2px', 
                flexShrink: 0 
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: 'var(--text-primary)' 
                }}>
                  {t.label}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-muted)', 
                  marginTop: '2px', 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis' 
                }}>
                  {t.desc}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="var(--text-placeholder)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--text-muted)', 
            marginBottom: '24px' 
          }}>
            Selecciona una transacción en el menú lateral para comenzar.
          </p>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '16px' 
          }}>
            {trans.map(t => (
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
                <h3 style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: t.color, 
                  margin: '0 0 6px' 
                }}>
                  {t.label}
                </h3>
                <p style={{ 
                  fontSize: '13px', 
                  color: 'var(--text-muted)', 
                  margin: 0 
                }}>
                  {t.desc}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
