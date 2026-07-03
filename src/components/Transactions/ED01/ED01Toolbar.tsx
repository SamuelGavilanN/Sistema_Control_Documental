// src/components/Transactions/ED/ED01Toolbar.tsx

import React from 'react';

interface ED01ToolbarProps {
  onNuevo: () => void;
  onEditar: () => void;
  onCancelar: () => void;
  onImprimir: () => void;
  onFiltro: () => void;
  onExportar: () => void;
  registroSeleccionado: boolean;
  loteActivo: any;
  empaquesDisponibles: number;
}

const ED01Toolbar: React.FC<ED01ToolbarProps> = ({ onNuevo, onEditar, onCancelar, onImprimir, onFiltro, onExportar, registroSeleccionado, loteActivo, empaquesDisponibles }) => {
  return (
    <div className="ed01-toolbar">
      <div className="toolbar-group">
        <button className="toolbar-btn toolbar-btn-primary" onClick={onNuevo} title={!loteActivo ? 'No hay lote activo' : empaquesDisponibles <= 0 ? 'Lote agotado' : ''}>
          + Nuevo Empaque
        </button>
        <button className="toolbar-btn" onClick={onEditar} disabled={!registroSeleccionado}>Editar Empaque</button>
        <button className="toolbar-btn" onClick={onImprimir} disabled={!registroSeleccionado}>Imprimir Etiqueta</button>
        <button className="toolbar-btn" onClick={onCancelar} disabled={!registroSeleccionado}>Cancelar Empaque</button>
        <button className="toolbar-btn" onClick={onFiltro}>Filtro</button>
        <button className="toolbar-btn" onClick={onExportar}>Exportar Excel</button>
      </div>
      {loteActivo && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
          <span>Lote: <strong style={{ color: 'var(--text-primary)' }}>{loteActivo.id_lote}</strong></span>
          <span>Disponibles: <strong style={{ color: empaquesDisponibles > 10 ? 'var(--success-text)' : 'var(--error-text)' }}>{empaquesDisponibles}</strong></span>
        </div>
      )}
    </div>
  );
};

export default ED01Toolbar;
