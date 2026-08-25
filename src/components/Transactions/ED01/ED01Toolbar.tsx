// src/components/Transactions/ED01/ED01Toolbar.tsx

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
  // Props de paginación
  paginaActual?: number;
  totalPaginas?: number;
  limitePorPagina?: number;
  totalRegistros?: number;
  onCambiarPagina?: (pagina: number) => void;
  onCambiarLimite?: (limite: number) => void;
}

const ED01Toolbar: React.FC<ED01ToolbarProps> = ({
  onNuevo,
  onEditar,
  onCancelar,
  onImprimir,
  onFiltro,
  onExportar,
  registroSeleccionado,
  loteActivo,
  empaquesDisponibles,
  paginaActual = 1,
  totalPaginas = 1,
  limitePorPagina = 50,
  totalRegistros = 0,
  onCambiarPagina,
  onCambiarLimite,
}) => {
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

      {/* Información de lote */}
      {loteActivo && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
          <span>Lote: <strong style={{ color: 'var(--text-primary)' }}>{loteActivo.id_lote}</strong></span>
          <span>Disponibles: <strong style={{ color: empaquesDisponibles > 10 ? 'var(--success-text)' : 'var(--error-text)' }}>{empaquesDisponibles}</strong></span>
        </div>
      )}

      {/* Controles de paginación */}
      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span>Mostrar</span>
          <select
            value={limitePorPagina}
            onChange={(e) => onCambiarLimite?.(Number(e.target.value))}
            style={{
              padding: '4px 8px',
              border: '1px solid var(--border-input)',
              borderRadius: '6px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <span>registros</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => onCambiarPagina?.(paginaActual - 1)}
            disabled={paginaActual <= 1}
            className="toolbar-btn"
            style={{ padding: '4px 10px' }}
          >
            ‹
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Página {paginaActual} de {totalPaginas} ({totalRegistros} registros)
          </span>
          <button
            onClick={() => onCambiarPagina?.(paginaActual + 1)}
            disabled={paginaActual >= totalPaginas}
            className="toolbar-btn"
            style={{ padding: '4px 10px' }}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};

export default ED01Toolbar;
