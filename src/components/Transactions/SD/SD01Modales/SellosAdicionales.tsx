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
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Sello Lateral:</label>
        <input
          type="text"
          value={selloLateral}
          onChange={e => onSelloLateralChange(e.target.value)}
          placeholder="N° Sello"
          style={{ width: '130px', padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Sello Adicional:</label>
        <input
          type="text"
          value={selloAdicional}
          onChange={e => onSelloAdicionalChange(e.target.value)}
          placeholder="N° Sello"
          style={{ width: '130px', padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }}
        />
      </div>
    </div>
  );
};

export default SellosAdicionales;
