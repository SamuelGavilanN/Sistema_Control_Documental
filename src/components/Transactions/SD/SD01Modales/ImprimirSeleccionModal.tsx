// src/components/Transactions/SD/SD01Modales/ImprimirSeleccionModal.tsx

import React, { useState } from 'react';

interface ImprimirSeleccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImprimir: (copiasSeleccionadas: string[]) => void;
  localesSeleccionados: number;
}

const COPIAS_DISPONIBLES = [
  { id: "Local", label: "Local" },
  { id: "Guardia", label: "Guardia" },
  { id: "Conductor", label: "Conductor" },
  { id: "Original", label: "Original" },
];

const ImprimirSeleccionModal: React.FC<ImprimirSeleccionModalProps> = ({ isOpen, onClose, onImprimir, localesSeleccionados }) => {
  const [copiasSeleccionadas, setCopiasSeleccionadas] = useState<string[]>(["Local"]);

  const toggleCopia = (id: string) => {
    setCopiasSeleccionadas(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleImprimir = () => {
    if (copiasSeleccionadas.length === 0) { alert("Selecciona al menos un tipo de copia"); return; }
    onImprimir(copiasSeleccionadas);
  };

  if (!isOpen) return null;

  return (
    <div className="isel-overlay" onClick={onClose}>
      <div className="isel-modal" onClick={e => e.stopPropagation()}>
        <div className="isel-header"><h2>Imprimir Locales Seleccionados</h2><button className="isel-close" onClick={onClose}>×</button></div>
        <div className="isel-body">
          <div className="isel-info">{localesSeleccionados} local(es) seleccionado(s)</div>
          <div className="isel-label">Tipos de copia:</div>
          <div className="isel-copias">
            {COPIAS_DISPONIBLES.map(copia => (
              <div key={copia.id} className={`isel-copia ${copiasSeleccionadas.includes(copia.id) ? "selected" : ""}`} onClick={() => toggleCopia(copia.id)}>
                <div className="isel-copia-check">
                  {copiasSeleccionadas.includes(copia.id) ? (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#1a1f2e" /><path d="M5 9L8 12L13 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8.5" stroke="#cbd5e1" strokeWidth="1.5" /></svg>
                  )}
                </div>
                <span className="isel-copia-label">{copia.label}</span>
              </div>
            ))}
          </div>
          <div className="isel-resumen">
            <div className="isel-resumen-item"><span>Locales:</span><strong>{localesSeleccionados}</strong></div>
            <div className="isel-resumen-item"><span>Copias por local:</span><strong>{copiasSeleccionadas.length}</strong></div>
            <div className="isel-resumen-item isel-total"><span>Total hojas:</span><strong>{localesSeleccionados * copiasSeleccionadas.length}</strong></div>
          </div>
        </div>
        <div className="isel-footer">
          <button className="isel-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="isel-btn-print" onClick={handleImprimir}>Imprimir ({localesSeleccionados * copiasSeleccionadas.length} hojas)</button>
        </div>
      </div>
    </div>
  );
};

export default ImprimirSeleccionModal;