// src/components/Transactions/RD/RD01ModalDetalle.tsx

import React, { useState } from 'react';
import RD01DetallePallets from './RD01DetallePallets';

interface RD01ModalDetalleProps {
  isOpen: boolean;
  registro: any;
  onClose: () => void;
  onCancelar: (registro: any, observacion: string) => void;
}

const RD01ModalDetalle: React.FC<RD01ModalDetalleProps> = ({ isOpen, registro, onClose, onCancelar }) => {
  const [observacion, setObservacion] = useState('');

  if (!isOpen || !registro) return null;

  return (
    <div className="ed01-modal-overlay" onClick={onClose}>
      <div className="ed01-modal" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
        <div className="ed01-modal-header">
          <h2>Detalle Devolución</h2>
          <button className="ed01-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ed01-modal-body">
          <div className="rd01-detalle-info">
            <div className="rd01-detalle-row"><div><strong>ID Pallet:</strong> {registro.id_pallet}</div></div>
            <div className="rd01-detalle-row">
              <div><strong>Color:</strong> {registro.color}</div>
              <div><strong>Local:</strong> {registro.codigo_local} - {registro.nombre_local}</div>
            </div>
            <div className="rd01-detalle-row">
              <div><strong>Solicitud:</strong> {registro.numero_solicitud}</div>
              <div><strong>Guía:</strong> {registro.numero_guia}</div>
            </div>
            <div className="rd01-detalle-row">
              <div><strong>Cant. Bultos:</strong> {registro.cantidad_bultos}</div>
              <div><strong>Total Bultos:</strong> {registro.total_bultos}</div>
            </div>
            {registro.diferencia !== null && registro.diferencia !== 0 && (
              <div className="rd01-detalle-row">
                <div><strong>Diferencia:</strong> <span style={{ color: registro.diferencia > 0 ? '#dc2626' : '#b45309', fontWeight: 700 }}>{registro.diferencia > 0 ? '+' : ''}{registro.diferencia}</span></div>
              </div>
            )}
            <div className="rd01-detalle-row">
              <div><strong>Estado:</strong> {registro.estado}</div>
              <div><strong>Tipo:</strong> {registro.tipo_devolucion}</div>
            </div>
            <div className="rd01-detalle-row">
              <div><strong>Almacén:</strong> {registro.almacen_destino}</div>
              <div><strong>Creado:</strong> {new Date(registro.creado_en).toLocaleString('es-CL')}</div>
            </div>
          </div>
          <div className="rd01-detalle-pallets">
            <h4>Pallets de esta Solicitud</h4>
            <RD01DetallePallets numeroSolicitud={registro.numero_solicitud} />
          </div>
          {registro.estado !== 'Cancelado' && (
            <div className="ed01-field" style={{ marginTop: '16px' }}>
              <label>Observación (para cancelar)</label>
              <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={2} placeholder="Motivo de cancelación..." />
            </div>
          )}
        </div>
        <div className="ed01-modal-footer">
          <button className="ed01-btn-cancel" onClick={onClose}>Cerrar</button>
          {registro.estado !== 'Cancelado' && (
            <button className="ed01-btn-save" style={{ background: '#dc2626' }} onClick={() => onCancelar(registro, observacion)}>Cancelar Devolución</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RD01ModalDetalle;
