// src/components/Transactions/RD/RD01ModalDetalle.tsx

import React from 'react';

interface RD01ModalDetalleProps {
  isOpen: boolean;
  orden: any;
  onClose: () => void;
  onEliminar: (orden: any) => void;
  onEditar: (orden: any) => void;
}

const RD01ModalDetalle: React.FC<RD01ModalDetalleProps> = ({ isOpen, orden, onClose, onEliminar, onEditar }) => {
  if (!isOpen || !orden) return null;

  return (
    <div className="ed01-modal-overlay" onClick={onClose}>
      <div className="ed01-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="ed01-modal-header">
          <h2>Detalle Orden</h2>
          <button className="ed01-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ed01-modal-body">
          <div className="rd01-detalle-info">
            <div className="rd01-detalle-row"><div><strong>ID Pallet:</strong> {orden.id_pallet || 'Sin asignar'}</div></div>
            <div className="rd01-detalle-row"><div><strong>Color:</strong> {orden.color}</div><div><strong>Local:</strong> {orden.codigo_local} - {orden.nombre_local}</div></div>
            <div className="rd01-detalle-row"><div><strong>Solicitud:</strong> {orden.numero_solicitud}</div><div><strong>Guía:</strong> {orden.numero_guia}</div></div>
            <div className="rd01-detalle-row"><div><strong>Cantidad:</strong> {orden.cantidad_bultos}</div><div><strong>Total:</strong> {orden.total_bultos}</div></div>
            {orden.diferencia !== null && orden.diferencia !== 0 && (
              <div className="rd01-detalle-row"><div><strong>Diferencia:</strong> <span style={{ color: orden.diferencia > 0 ? '#dc2626' : '#b45309', fontWeight: 700 }}>{orden.diferencia > 0 ? '+' : ''}{orden.diferencia}</span></div></div>
            )}
            <div className="rd01-detalle-row"><div><strong>Estado:</strong> {orden.estado}</div><div><strong>Tipo:</strong> {orden.tipo_devolucion}</div></div>
            <div className="rd01-detalle-row"><div><strong>Almacén:</strong> {orden.almacen_destino}</div><div><strong>Creado:</strong> {new Date(orden.creado_en).toLocaleString('es-CL')}</div></div>
            {orden.modificado_en && (
              <div className="rd01-detalle-row"><div><strong>Modificado:</strong> {new Date(orden.modificado_en).toLocaleString('es-CL')}</div></div>
            )}
          </div>
        </div>
        <div className="ed01-modal-footer">
          <button className="ed01-btn-cancel" onClick={onClose}>Cerrar</button>
          <button className="ed01-btn-detalle" onClick={() => { onClose(); onEditar(orden); }} style={{ marginRight: '8px' }}>Editar</button>
          <button className="ed01-btn-save" style={{ background: '#dc2626' }} onClick={() => { if (confirm('¿Eliminar permanentemente?')) { onClose(); onEliminar(orden); } }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
};

export default RD01ModalDetalle;
