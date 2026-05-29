import React, { useState, useEffect } from 'react';

interface DashboardProps {
  onModuleClick?: (moduleId: string) => void;
  rol?: string;
  permisos?: string[];
}

const transacciones = [
  { id: 'ad', label: 'AD01 · Gestión Auditoría', desc: 'Crear y gestionar tareas de auditoría', color: '#8b5cf6' },
  { id: 'ad-captura', label: 'AD02 · Captura Física', desc: 'Realizar capturas físicas de auditoría', color: '#ec4899' },
  { id: 'ad-dashboard', label: 'AD03 · Dashboard Auditoría', desc: 'KPIs y estadísticas de auditorías', color: '#06b6d4' },
];

const Dashboard: React.FC<DashboardProps> = ({ onModuleClick, rol, permisos }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filtrar por permisos
  const trans = permisos && permisos.length > 0
    ? transacciones.filter(t => permisos.includes(t.id))
    : transacciones;

  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: isMobile ? '16px' : '40px', border: '1px solid #f0f3f7' }}>
      <h1 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>FASHIONSPARK</h1>
      <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#64748b', marginBottom: isMobile ? '16px' : '24px' }}>Sistema de Gestion Documental</p>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {trans.map(t => (
            <div key={t.id} onClick={() => onModuleClick?.(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#f8fafd', borderRadius: '10px', border: '1px solid #eef0f5', cursor: 'pointer' }}>
              <div style={{ width: '4px', height: '36px', background: t.color, borderRadius: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{t.label}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.desc}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>Selecciona una transaccion en el menu lateral para comenzar.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {trans.map(t => (
              <div key={t.id} onClick={() => onModuleClick?.(t.id)} style={{ padding: '20px', background: '#f8fafd', borderRadius: '12px', border: '1px solid #eef0f5', cursor: 'pointer', transition: 'all 0.15s', borderLeft: `4px solid ${t.color}` }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafd'; }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: t.color, margin: '0 0 6px' }}>{t.label}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
