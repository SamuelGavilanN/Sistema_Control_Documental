// src/components/Transactions/RD/RD01ModalCrear.tsx

import React from 'react';

interface RD01ModalCrearProps {
  isOpen: boolean;
  guardando: boolean;
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
  isOpen, guardando, ordenPendiente, form, bultosRegistrados,
  coloresTipos, mensaje, tipoMensaje, colorSelectRef, cantidadInputRef,
  solicitudInputRef, onFormChange, onCodigoLocalChange, onSolicitudChange,
  onGuardar, onClose, getMensajeStyle,
}) => {
  if (!isOpen) return null;

  const camposBloqueados = ordenPendiente;
  const styleDisabled: React.CSSProperties = { background: '#f1f5f9', color: '#64748b' };

  return (
    <div className="ed01-modal-overlay" onClick={() => !guardando && onClose()}>
      <div className="ed01-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="ed01-modal-header">
          <h2>{ordenPendiente ? 'Continuar Solicitud ' + form.numero_solicitud : 'Nueva Orden'}</h2>
          <button className="ed01-modal-close" onClick={onClose} disabled={guardando}>×</button>
        </div>

        <div className="ed01-modal-body">
          {ordenPendiente && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#1e40af' }}>
              <strong>Solicitud {form.numero_solicitud}:</strong> Registrados {bultosRegistrados} de {form.total_bultos} bultos.{' '}
              <strong>Faltan: {form.total_bultos - bultosRegistrados} bultos.</strong>
            </div>
          )}

          {/* Color */}
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

          {/* Cod Local + Nombre Local */}
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
              <label>Nombre Local</label>
              <input type="text" value={form.nombre_local} disabled placeholder="Auto-completado" />
            </div>
          </div>

          {/* N° Solicitud */}
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
            <small style={{ color: '#94a3b8', fontSize: '11px' }}>
              {!camposBloqueados && 'Al escribir se verificará si la solicitud ya existe'}
            </small>
          </div>

          {/* N° Guía + Total */}
          <div className="ed01-row">
            <div className="ed01-field">
              <label>N° Guía *</label>
              <input
                type="text"
                value={form.numero_guia}
                onChange={e => onFormChange('numero_guia', e.target.value)}
                placeholder="264"
                disabled={camposBloqueados}
                style={camposBloqueados ? styleDisabled : undefined}
              />
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

          {/* Cantidad a Registrar */}
          <div className="ed01-field">
            <label>Cantidad a Registrar *</label>
            <input
              ref={cantidadInputRef}
              type="number"
              value={form.cantidad_bultos || ''}
              onChange={e => onFormChange('cantidad_bultos', parseInt(e.target.value) || 0)}
              min="0"
              placeholder={ordenPendiente ? 'Máx: ' + (form.total_bultos - bultosRegistrados) : '0'}
              style={{
                border: '1px solid ' + (ordenPendiente ? '#f59e0b' : '#e2e8f0'),
                background: ordenPendiente ? '#fffdf5' : 'white',
              }}
              autoFocus
            />
            {ordenPendiente && (
              <small style={{ color: '#b45309', fontSize: '11px' }}>
                Máximo permitido: {form.total_bultos - bultosRegistrados} bultos
              </small>
            )}
          </div>

          {mensaje && (
            <div style={{
              marginTop: '12px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px',
              fontWeight: 500, ...getMensajeStyle(),
            }}>
              {mensaje}
            </div>
          )}
        </div>

        <div className="ed01-modal-footer">
          <button className="ed01-btn-cancel" onClick={onClose} disabled={guardando}>
            {ordenPendiente ? 'Salir (queda Pendiente)' : 'Cancelar'}
          </button>
          <button className="ed01-btn-save" onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Registrar Orden'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RD01ModalCrear;
