// src/components/Transactions/SD/SD01Modales/SellosAdicionales.tsx

import React from 'react';

interface SellosAdicionalesProps {
  selloLateral: string;
  selloAdicional: string;
  onSelloLateralChange: (val: string) => void;
  onSelloAdicionalChange: (val: string) => void;
}

const SellosAdicionales: React.FC<SellosAdicionalesProps> = ({ selloLateral, selloAdicional, onSelloLateralChange, onSelloAdicionalChange }) => {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="sellos-field" style={{ flex: 1, minWidth: '150px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>Sello Lateral</label>
        <input
          type="text"
          value={selloLateral}
          onChange={e => onSelloLateralChange(e.target.value)}
          placeholder="N° Sello"
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
        />
      </div>
      <div className="sellos-field" style={{ flex: 1, minWidth: '150px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>Sello Adicional</label>
        <input
          type="text"
          value={selloAdicional}
          onChange={e => onSelloAdicionalChange(e.target.value)}
          placeholder="N° Sello"
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
        />
      </div>
    </div>
  );
};

export default SellosAdicionales;
