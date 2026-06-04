// src/components/Transactions/RD/RD01ModalCrear.tsx

import React from 'react';

interface RD01ModalCrearProps {
  isOpen: boolean;
  guardando: boolean;
  modoEdicion: boolean;
  ordenPendiente: boolean;
  form: any;
  bultosRegistrados: number;
  coloresTipos: any[];
  mensaje: string;
  tipoMensaje: 'error' | 'success' | 'warning' | 'info';
  colorSelectRef: React.RefObject<HTMLSelectElement>;
  cantidadInputRef: React.RefObject<HTMLInputElement>;
  solicitudInputRef: React.RefObject<HTMLInputElement>;
  onFormChange: (campo: string, valor: any) => void;
  onCodigoLocalChange: (codigo: string) => void;
  onSolicitudChange: (valor: string) => void;
  onGuardar: () => void;
  onClose: () => void;
  getMensajeStyle: () => React.CSSProperties;
}

const RD01ModalCrear: React.FC<RD01ModalCrearProps> = ({
  isOpen, guardando, modoEdicion, ordenPendiente, form, bultosRegistrados,
  coloresTipos, mensaje, tipoMensaje, colorSelectRef, cantidadInputRef,
  solicitudInputRef, onFormChange, onCodigoLocalChange, onSolicitudChange,
  onGuardar, onClose, getMensajeStyle,
}) => {
  if (!isOpen) return null;

  const camposBloqueados = ordenPendiente && !modoEdicion;
  const styleDisabled: React.CSSProperties = { background: '#f1f5f9', color: '#64748b' };

  const titulo = modoEdicion ? 'Editar Orden' : (ordenPendiente ? 'Continuar Solicitud ' + form.numero_solicitud : 'Nueva Orden');

  return (
    <div className="ed01-modal-overlay" onClick={() => !guardando && onClose()}>
      <div className="ed01-modal" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
        <div className="ed01-modal-header">
          <h2>{titulo}</h2>
          <button className="ed01-modal-close" onClick={onClose} disabled={guardando}>×</button>
        </div>

        <div className="ed01-modal-body">
          {ordenPendiente && !modoEdicion && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#1e40af' }}>
              <strong>Solicitud {form.numero_solicitud}:</strong> Registrados {bultosRegistrados} de {form.total_bultos} bultos.{' '}
              <strong>Faltan: {form.total_bultos - bultosRegistrados} bultos.</strong>
            </div>
          )}

          {modoEdicion && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#92400e' }}>
              <strong>✏️ Modo Edición:</strong> Modifique los datos necesarios y guarde los cambios.
            </div>
          )}

          {/* Fila 1: N° Solicitud | N° Guía */}
          <div className="ed01-row">
            <div className="ed01-field">
              <label>N° Solicitud *</label>
              <input
                ref={solicitudInputRef}
                type="text"
                value={form.numero_solicitud}
                onChange={e => onSolicitudChange(e.target.value)}
                placeholder="Ingrese número de solicitud"
                disabled={camposBloqueados}
                style={camposBloqueados ? styleDisabled : undefined}
              />
              {!camposBloqueados && !modoEdicion && (
                <small style={{ color: '#94a3b8', fontSize: '11px' }}>Al escribir se verificará si la solicitud ya existe</small>
              )}
            </div>
            <div className="ed01-field">
              <label>N° Guía *</label>
              <input
                type="text"
                value={form.numero_guia}
                onChange={e => onFormChange('numero_guia', e.target.value)}
                placeholder="N° Guía"
                disabled={camposBloqueados}
                style={camposBloqueados ? styleDisabled : undefined}
              />
            </div>
          </div>

          {/* Fila 2: Cod Local | Local */}
          <div className="ed01-row">
            <div className="ed01-field">
              <label>Cod Local *</label>
              <input
                type="text"
                value={form.codigo_local}
                onChange={e => onCodigoLocalChange(e.target.value)}
                placeholder="D001"
                maxLength={4}
                disabled={camposBloqueados}
                style={camposBloqueados ? styleDisabled : undefined}
              />
            </div>
            <div className="ed01-field">
              <label>Local</label>
              <input type="text" value={form.nombre_local} disabled placeholder="Auto-completado" />
            </div>
          </div>

          {/* Fila 3: Cantidad | Total */}
          <div className="ed01-row">
            <div className="ed01-field">
              <label>Cantidad a Registrar *</label>
              <input
                ref={cantidadInputRef}
                type="number"
                value={form.cantidad_bultos || ''}
                onChange={e => onFormChange('cantidad_bultos', parseInt(e.target.value) || 0)}
                min="0"
                placeholder={!modoEdicion && ordenPendiente ? 'Máx: ' + (form.total_bultos - bultosRegistrados) : '0'}
                style={{
                  border: '1px solid ' + ((!modoEdicion && ordenPendiente) ? '#f59e0b' : '#e2e8f0'),
                  background: (!modoEdicion && ordenPendiente) ? '#fffdf5' : 'white',
                }}
                autoFocus
              />
              {!modoEdicion && ordenPendiente && (
                <small style={{ color: '#b45309', fontSize: '11px' }}>Máximo permitido: {form.total_bultos - bultosRegistrados} bultos</small>
              )}
            </div>
            <div className="ed01-field">
              <label>Cantidad Total *</label>
              <input
                type="number"
                value={form.total_bultos || ''}
                onChange={e => onFormChange('total_bultos', parseInt(e.target.value) || 0)}
                min="0"
                placeholder="0"
                disabled={camposBloqueados}
                style={camposBloqueados ? styleDisabled : undefined}
              />
            </div>
          </div>

          {/* Fila 4: Color (ancho completo) */}
          <div className="ed01-field">
            <label>Color *</label>
            <select
              ref={colorSelectRef}
              value={form.color}
              onChange={e => onFormChange('color', e.target.value)}
              disabled={camposBloqueados}
              style={camposBloqueados ? styleDisabled : undefined}
            >
              <option value="">Seleccionar...</option>
              {coloresTipos.map((c: any) => (
                <option key={c.id} value={c.color}>{c.color}</option>
              ))}
            </select>
          </div>

          {mensaje && (
            <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, ...getMensajeStyle() }}>
              {mensaje}
            </div>
          )}
        </div>

        <div className="ed01-modal-footer">
          <button className="ed01-btn-cancel" onClick={onClose} disabled={guardando}>
            {modoEdicion ? 'Cancelar Edición' : (ordenPendiente ? 'Salir (queda Pendiente)' : 'Cerrar')}
          </button>
          <button className="ed01-btn-save" onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando...' : (modoEdicion ? 'Guardar Cambios' : 'Registrar Orden')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RD01ModalCrear;
