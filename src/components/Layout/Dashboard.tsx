import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '40px', border: '1px solid #f0f3f7' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>FASHIONSPARK · Portico</h1>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>Sistema de Gestión de Empaques Directos</p>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ background: '#f8fafd', borderRadius: '12px', padding: '20px', flex: 1, border: '1px solid #eef0f5' }}>
          <h3 style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Acceso rápido</h3>
          <p style={{ fontSize: '13px', color: '#475569' }}>Selecciona <strong>ED01 Registro Empaque</strong> en el menú lateral para comenzar.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;