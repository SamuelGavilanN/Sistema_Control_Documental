import React, { useState, useEffect } from 'react';

interface DashboardProps {
  onModuleClick?: (moduleId: string) => void;
  rol?: string;
}

const transacciones = [
  { id: 'ed', label: 'ED01 · Registro Empaque', desc: 'Registrar nuevos empaques y generar etiquetas', icon: '📦', color: '#3b82f6' },
  { id: 'ed-history', label: 'ED02 · Dashboard Producción', desc: 'Visualizar flujo de empaques y estadísticas', icon: '📊', color: '#10b981' },
  { id: 'ed-tickets', label: 'ED03 · BT Portico', desc: 'Bandeja de tickets del área Portico', icon: '🎫', color: '#f59e0b' },
  { id: 'ad', label: 'AD01 · Gestión Auditoría', desc: 'Crear y gestionar tareas de auditoría', icon: '🔍', color: '#8b5cf6' },
  { id: 'ad-captura', label: 'AD02 · Captura Física', desc: 'Realizar capturas físicas de auditoría', icon: '📋', color: '#ec4899' },
  { id: 'ad-dashboard', label: 'AD03 · Dashboard Auditoría', desc: 'KPIs y estadísticas de auditorías', icon: '📈', color: '#06b6d4' },
  { id: 'tk', label: 'TK01 · Crear Ticket', desc: 'Crear tickets de soporte', icon: '🎫', color: '#ef4444' },
];

const filtradasPorRol = (rol?: string) => {
  if (!rol || rol === 'Owner' || rol === 'Admin') return transacciones;
  if (rol === 'Lider') return transacciones.filter(t => t.id.startsWith('ed') || t.id.startsWith('tk'));
  if (rol === 'Portico') return transacciones.filter(t => t.id.startsWith('ed'));
  if (rol === 'Auditor') return transacciones.filter(t => t.id.startsWith('ad'));
  return transacciones;
};

const Dashboard: React.FC<DashboardProps> = ({ onModuleClick, rol }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const trans = filtradasPorRol(rol);

  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: isMobile ? '20px' : '40px', border: '1px solid #f0f3f7' }}>
      <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>FASHIONSPARK · Portico</h1>
      <p style={{ fontSize: isMobile ? '13px' : '14px', color: '#64748b', marginBottom: isMobile ? '20px' : '24px' }}>Sistema de Gestión de Empaques Directos</p>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {trans.map(t => (
            <div
              key={t.id}
              onClick={() => onModuleClick?.(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 16px', background: '#f8fafd', borderRadius: '12px',
                border: '1px solid #eef0f5', cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <span style={{ fontSize: '24px' }}>{t.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{t.label}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{t.desc}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {trans.map(t => (
            <div
              key={t.id}
              onClick={() => onModuleClick?.(t.id)}
              style={{
                padding: '20px', background: '#f8fafd', borderRadius: '12px',
                border: '1px solid #eef0f5', cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafd'; e.currentTarget.style.borderColor = '#eef0f5'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>{t.icon}</span>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: t.color, margin: 0 }}>{t.label}</h3>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{t.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
