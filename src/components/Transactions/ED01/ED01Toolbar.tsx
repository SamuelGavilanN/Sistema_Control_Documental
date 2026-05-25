import React from 'react';

interface ED01ToolbarProps {
  onNuevo: () => void;
  onEditar: () => void;
  onCancelar: () => void;
  onImprimir: () => void;
  onFiltro: () => void;
  registroSeleccionado: boolean;
}

const ED01Toolbar: React.FC<ED01ToolbarProps> = ({ onNuevo, onEditar, onCancelar, onImprimir, onFiltro, registroSeleccionado }) => {
  return (
    <div className="ed01-toolbar">
      <div className="toolbar-group">
        <button className="toolbar-btn toolbar-btn-primary" onClick={onNuevo}>+ Nuevo Empaque</button>
        <button className="toolbar-btn" onClick={onEditar} disabled={!registroSeleccionado}>✏️ Editar Empaque</button>
        <button className="toolbar-btn" onClick={onImprimir} disabled={!registroSeleccionado}>🖨️ Imprimir Etiqueta</button>
        <button className="toolbar-btn" onClick={onCancelar} disabled={!registroSeleccionado}>✕ Cancelar Empaque</button>
        <button className="toolbar-btn" onClick={onFiltro}>🔍 Filtro</button>
      </div>
    </div>
  );
};

export default ED01Toolbar;