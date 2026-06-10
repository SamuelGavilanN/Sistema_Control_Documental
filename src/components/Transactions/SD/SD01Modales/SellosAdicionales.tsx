// src/components/Transactions/SD/SD01Modales/SellosAdicionales.tsx

import React, { useState } from 'react';

interface SellosAdicionalesProps {
  selloLateral: string;
  selloAdicional: string;
  onSelloLateralChange: (val: string) => void;
  onSelloAdicionalChange: (val: string) => void;
}

const SellosAdicionales: React.FC<SellosAdicionalesProps> = ({ selloLateral, selloAdicional, onSelloLateralChange, onSelloAdicionalChange }) => {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="sellos-container">
      <div className="sellos-header" onClick={() => setExpandido(!expandido)}>
        <span className="sellos-title">Sellos Adicionales</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`sellos-arrow ${expandido ? "rotated" : ""}`}><path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      {expandido && (
        <div className="sellos-body">
          <div className="sellos-field"><label>Sello Lateral</label><input type="text" value={selloLateral} onChange={e => onSelloLateralChange(e.target.value)} placeholder="N° Sello" /></div>
          <div className="sellos-field"><label>Sello Adicional</label><input type="text" value={selloAdicional} onChange={e => onSelloAdicionalChange(e.target.value)} placeholder="N° Sello" /></div>
        </div>
      )}
    </div>
  );
};

export default SellosAdicionales;