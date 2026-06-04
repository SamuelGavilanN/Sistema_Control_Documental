// src/components/Transactions/RD/RD01Tabla.tsx

import React from 'react';

interface RD01TablaProps {
  ordenes: any[];
  cargando: boolean;
  nombresUsuarios: Record<string, string>;
  onVerDetalle: (orden: any) => void;
  onCancelar: (orden: any) => void;
}

const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' };
    case 'Pendiente': return { color: '#b45309', bg: '#fef3c7' };
    case 'Con Diferencias': return { color: '#dc2626', bg: '#fef2f2' };
    case 'Cancelado': return { color: '#64748b', bg: '#f1f5f9' };
    default: return { color: '#64748b', bg: '#f1f5f9' };
  }
};

const RD01Tabla: React.FC<RD01TablaProps> = ({ ordenes, cargando, nombresUsuarios, onVerDetalle, onCancelar }) => {
  return (
    <div className="ed03-tabla-container" style={{ overflowX: 'auto' }}>
      <table className="ed03-tabla" style={{ minWidth: '1800px' }}>
        <thead>
          <tr>
            <th style={{ minWidth: '170px' }}>ID Pallet</th>
            <th style={{ minWidth: '100px' }}>Color</th>
            <th style={{ minWidth: '85px' }}>Cod Local</th>
            <th style={{ minWidth: '150px' }}>Local</th>
            <th style={{ minWidth: '110px' }}>N° Solicitud</th>
            <th style={{ minWidth: '100px' }}>N° Guía</th>
            <th style={{ minWidth: '90px' }}>Cant. Bultos</th>
            <th style={{ minWidth: '90px' }}>Total Bultos</th>
            <th style={{ minWidth: '80px' }}>Diferencia</th>
            <th style={{ minWidth: '110px' }}>Estado</th>
            <th style={{ minWidth: '200px' }}>Tipo Devolución</th>
            <th style={{ minWidth: '130px' }}>Almacén Destino</th>
            <th style={{ minWidth: '130px' }}>Creado Por</th>
            <th style={{ minWidth: '110px' }}>Creado En</th>
            <th style={{ minWidth: '140px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr><td colSpan={15} style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr>
          ) : ordenes.length === 0 ? (
            <tr><td colSpan={15} style={{ textAlign: 'center', padding: '40px' }}>Sin órdenes</td></tr>
          ) : (
            ordenes.map((orden: any) => {
              const eb = getEstadoBadge(orden.estado);
              return (
                <tr key={orden.id} style={{ background: orden.estado === 'Con Diferencias' ? '#fff5f5' : orden.estado === 'Pendiente' ? '#fffdf5' : 'transparent' }}>
                  <td style={{ fontFamily: 'Courier New, monospace', fontSize: '12px', color: orden.id_pallet ? '#1d4ed8' : '#94a3b8', fontWeight: 600 }}>
                    {orden.id_pallet || 'Sin asignar'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="rd01-color-badge" style={{ background: orden.color_hex || '#ccc' }} />
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>{orden.color}</span>
                    </div>
                  </td>
                  <td>{orden.codigo_local}</td>
                  <td style={{ whiteSpace: 'normal', wordBreak: 'normal', minWidth: '150px' }}>{orden.nombre_local}</td>
                  <td className="ed03-ticket-id" style={{ whiteSpace: 'nowrap' }}>{orden.numero_solicitud}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{orden.numero_guia}</td>
                  <td style={{ textAlign: 'center' }}>{orden.cantidad_bultos}</td>
                  <td style={{ textAlign: 'center' }}>{orden.total_bultos}</td>
                  <td style={{ textAlign: 'center' }}>
                    {orden.diferencia !== null && orden.diferencia !== 0 ? (
                      <span style={{ fontWeight: 700, color: orden.diferencia > 0 ? '#dc2626' : '#b45309', fontSize: '13px' }}>
                        {orden.diferencia > 0 ? '+' : ''}{orden.diferencia}
                      </span>
                    ) : (<span style={{ color: '#94a3b8' }}>-</span>)}
                  </td>
                  <td><span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: eb.bg, color: eb.color }}>{orden.estado}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}><span className="rd01-tipo-badge" style={{ background: (orden.color_hex || '#ccc') + '20', color: orden.color_hex || '#333', border: '1px solid ' + (orden.color_hex || '#ccc') + '40', fontSize: '11px' }}>{orden.tipo_devolucion}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{orden.almacen_destino}</td>
                  <td className="ed01-usuario" style={{ whiteSpace: 'nowrap' }}>{nombresUsuarios[orden.creado_por] || orden.creado_por}</td>
                  <td className="ed01-mono" style={{ whiteSpace: 'nowrap' }}>{new Date(orden.creado_en).toLocaleDateString('es-CL')}</td>
                  <td>
                    <div className="rd01-acciones" style={{ whiteSpace: 'nowrap' }}>
                      <button className="rd01-btn-detalle" onClick={() => onVerDetalle(orden)}>Detalle</button>
                      {orden.estado !== 'Cancelado' && (<button className="rd01-btn-cancelar" onClick={() => onCancelar(orden)}>Cancelar</button>)}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RD01Tabla;
