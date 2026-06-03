// src/components/Transactions/RD/RD01ModalCrear.tsx

import React, { useRef } from 'react';

interface Solicitud {
  color: string;
  codigo_local: string;
  nombre_local: string;
  numero_solicitud: string;
  numero_guia: string;
  cantidad_bultos: number;
  total_bultos: number;
}

interface ColorTipo {
  id: string;
  color: string;
  color_hex: string;
  tipo_devolucion: string;
  almacen_destino: string;
}

interface RD01ModalCrearProps {
  isOpen: boolean;
  guardando: boolean;
  guardadoParcial: boolean;
  solicitudes: Solicitud[];
  solicitudActualIndex: number;
  palletContador: number;
  bultosGuardados: number;
  coloresTipos: ColorTipo[];
  mensaje: string;
  colorSelectRefs: React.MutableRefObject<(HTMLSelectElement | null)[]>;
  cantidadInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onSolicitudChange: (index: number, campo: keyof Solicitud, valor: any) => void;
  onCodigoLocalChange: (index: number, codigo: string) => void;
  onAgregarSolicitud: () => void;
  onEliminarSolicitud: (index: number) => void;
  onGuardar: () => void;
  onClose: () => void;
}

const RD01ModalCrear: React.FC<RD01ModalCrearProps> = ({
  isOpen,
  guardando,
  guardadoParcial,
  solicitudes,
  solicitudActualIndex,
  palletContador,
  bultosGuardados,
  coloresTipos,
  mensaje,
  colorSelectRefs,
  cantidadInputRefs,
  onSolicitudChange,
  onCodigoLocalChange,
  onAgregarSolicitud,
  onEliminarSolicitud,
  onGuardar,
  onClose,
}) => {
  if (!isOpen) return null;

  const tituloModal = guardadoParcial
    ? 'Continuando: ' + (solicitudes[solicitudActualIndex]?.numero_solicitud || '') + ' - Pallet P' + String(palletContador + 1).padStart(2, '0')
    : 'Nuevo Ingreso Devolución';

  return (
    <div className="ed01-modal-overlay" onClick={() => !guardando && onClose()}>
      <div className="ed01-modal" style={{ maxWidth: '1200px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div className="ed01-modal-header">
          <h2>{tituloModal}</h2>
          <button className="ed01-modal-close" onClick={onClose} disabled={guardando}>×</button>
        </div>

        <div className="ed01-modal-body">
          {guardadoParcial && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', fontSize: '13px', color: '#1e40af' }}>
              <strong>{solicitudes[solicitudActualIndex]?.numero_solicitud}:</strong> Guardado: {bultosGuardados} de {solicitudes[solicitudActualIndex]?.total_bultos} bultos. <strong>Faltan: {solicitudes[solicitudActualIndex]?.total_bultos - bultosGuardados} bultos.</strong>
            </div>
          )}

          {!guardadoParcial && (
            <div className="rd01-pallet-info">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2V16M2 9H16" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round"/></svg>
              <span>ID Pallet se genera automáticamente. Si faltan bultos queda Pendiente, si sobran Con Diferencias.</span>
            </div>
          )}

          <div className="ed03-tabla-container" style={{ maxHeight: '400px', marginBottom: '12px', overflowX: 'auto' }}>
            <table className="ed03-tabla" style={{ minWidth: '950px' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>Color *</th>
                  <th style={{ minWidth: '100px' }}>Cod Local *</th>
                  <th style={{ minWidth: '160px' }}>Local</th>
                  <th style={{ minWidth: '130px' }}>N° Solicitud *</th>
                  <th style={{ minWidth: '120px' }}>N° Guía *</th>
                  <th style={{ minWidth: '110px' }}>Cant. Bultos *</th>
                  <th style={{ minWidth: '110px' }}>Total Bultos *</th>
                  <th style={{ minWidth: '80px' }}>Progreso</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((sol, index) => {
                  const isDisabled = guardadoParcial && index !== solicitudActualIndex;
                  const isActual = guardadoParcial && index === solicitudActualIndex;
                  let progreso = '';
                  if (index === solicitudActualIndex && guardadoParcial) progreso = bultosGuardados + '/' + sol.total_bultos;

                  return (
                    <tr key={index} style={{ opacity: isDisabled ? 0.4 : 1, background: isActual ? '#fef9e7' : 'transparent' }}>
                      <td>
                        <select ref={(el) => { colorSelectRefs.current[index] = el; }} value={sol.color} onChange={e => onSolicitudChange(index, 'color', e.target.value)} disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }}>
                          <option value="">Seleccionar...</option>
                          {coloresTipos.map(c => (<option key={c.id} value={c.color}>{c.color}</option>))}
                        </select>
                      </td>
                      <td><input type="text" value={sol.codigo_local} onChange={e => onCodigoLocalChange(index, e.target.value)} placeholder="D001" maxLength={4} disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }} /></td>
                      <td><input type="text" value={sol.nombre_local} disabled placeholder="Auto" style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafd', color: '#64748b' }} /></td>
                      <td><input type="text" value={sol.numero_solicitud} onChange={e => onSolicitudChange(index, 'numero_solicitud', e.target.value)} placeholder="2060563" disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }} /></td>
                      <td><input type="text" value={sol.numero_guia} onChange={e => onSolicitudChange(index, 'numero_guia', e.target.value)} placeholder="264" disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }} /></td>
                      <td><input type="number" ref={(el) => { cantidadInputRefs.current[index] = el; }} className="rd01-input-cantidad" value={sol.cantidad_bultos || ''} onChange={e => onSolicitudChange(index, 'cantidad_bultos', parseInt(e.target.value) || 0)} min="0" placeholder={isActual ? 'Máx: ' + (sol.total_bultos - bultosGuardados) : '0'} disabled={isDisabled} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid ' + (isActual ? '#f59e0b' : '#e2e8f0'), borderRadius: '6px', background: isDisabled ? '#f1f5f9' : (isActual ? '#fffdf5' : 'white') }} /></td>
                      <td><input type="number" value={sol.total_bultos || ''} onChange={e => onSolicitudChange(index, 'total_bultos', parseInt(e.target.value) || 0)} min="0" placeholder="0" disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }} /></td>
                      <td style={{ textAlign: 'center' }}>{progreso && (<span style={{ display: 'inline-block', padding: '4px 10px', background: '#fef3c7', borderRadius: '6px', fontWeight: 600, color: '#92400e', fontSize: '13px' }}>{progreso}</span>)}</td>
                      <td>{solicitudes.length > 1 && !guardadoParcial && (<button onClick={() => onEliminarSolicitud(index)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#ef4444', fontSize: '18px', cursor: 'pointer' }} title="Eliminar fila">×</button>)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!guardadoParcial && (
            <button className="rd01-btn-agregar-solicitud" onClick={onAgregarSolicitud}>+ Agregar fila</button>
          )}

          {mensaje && (
            <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: mensaje.includes('Error') ? '#fef2f2' : (mensaje.includes('✅') ? '#dcfce7' : (mensaje.includes('⚠️') ? '#fef3c7' : '#eff6ff')), color: mensaje.includes('Error') ? '#dc2626' : (mensaje.includes('✅') ? '#15803d' : (mensaje.includes('⚠️') ? '#92400e' : '#1e40af')), border: '1px solid ' + (mensaje.includes('Error') ? '#fecaca' : (mensaje.includes('✅') ? '#bbf7d0' : (mensaje.includes('⚠️') ? '#fde68a' : '#bfdbfe'))), fontWeight: 500 }}>{mensaje}</div>
          )}
        </div>

        <div className="ed01-modal-footer">
          <button className="ed01-btn-cancel" onClick={onClose} disabled={guardando}>{guardadoParcial ? 'Salir' : 'Cancelar'}</button>
          <button className="ed01-btn-save" onClick={onGuardar} disabled={guardando}>{guardando ? 'Guardando...' : (guardadoParcial ? 'Guardar P' + String(palletContador + 1).padStart(2, '0') : 'Iniciar Registro')}</button>
        </div>
      </div>
    </div>
  );
};

export default RD01ModalCrear;
