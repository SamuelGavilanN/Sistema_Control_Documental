// src/components/Transactions/RD/RD01Tabla.tsx

import React from 'react';

interface RD01TablaProps {
  registros: any[];
  cargando: boolean;
  nombresUsuarios: Record<string, string>;
  onVerDetalle: (registro: any) => void;
  onCancelar: (registro: any) => void;
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

const RD01Tabla: React.FC<RD01TablaProps> = ({ registros, cargando, nombresUsuarios, onVerDetalle, onCancelar }) => {
  return (
    <div className="ed03-tabla-container" style={{ overflowX: 'auto' }}>
      <table className="ed03-tabla" style={{ minWidth: '2100px' }}>
        <thead>
          <tr>
            <th style={{ minWidth: '190px' }}>ID Pallet</th>
            <th style={{ minWidth: '80px' }}>Pallet</th>
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
            <th style={{ minWidth: '130px' }}>Modificado Por</th>
            <th style={{ minWidth: '110px' }}>Modificado En</th>
            <th style={{ minWidth: '90px' }}>Obs.</th>
            <th style={{ minWidth: '140px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr><td colSpan={19} style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr>
          ) : registros.length === 0 ? (
            <tr><td colSpan={19} style={{ textAlign: 'center', padding: '40px' }}>Sin registros</td></tr>
          ) : (
            registros.map((reg: any, i: number) => {
              const eb = getEstadoBadge(reg.estado);
              const tipoBadgeStyle: React.CSSProperties = {
                background: (reg.color_hex || '#ccc') + '20',
                color: reg.color_hex || '#333',
                border: '1px solid ' + (reg.color_hex || '#ccc') + '40',
                fontSize: '11px',
              };
              return (
                <tr key={reg.id} style={{ background: reg.estado === 'Con Diferencias' ? '#fff5f5' : reg.estado === 'Pendiente' ? '#fffdf5' : 'transparent' }}>
                  <td style={{ fontFamily: 'Courier New, monospace', fontSize: '12px', color: '#1d4ed8', fontWeight: 600 }}>{reg.id_pallet}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: '#eef2ff', color: '#1d4ed8' }}>{reg.pallet_actual} de {reg.total_pallets_solicitud}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="rd01-color-badge" style={{ background: reg.color_hex || '#ccc' }} />
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>{reg.color}</span>
                    </div>
                  </td>
                  <td>{reg.codigo_local}</td>
                  <td style={{ whiteSpace: 'normal', wordBreak: 'normal', minWidth: '150px' }}>{reg.nombre_local}</td>
                  <td className="ed03-ticket-id" style={{ whiteSpace: 'nowrap' }}>{reg.numero_solicitud}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{reg.numero_guia}</td>
                  <td style={{ textAlign: 'center' }}>{reg.cantidad_bultos}</td>
                  <td style={{ textAlign: 'center' }}>{reg.total_bultos}</td>
                  <td style={{ textAlign: 'center' }}>
                    {reg.diferencia !== null && reg.diferencia !== 0 ? (
                      <span style={{ fontWeight: 700, color: reg.diferencia > 0 ? '#dc2626' : '#b45309', fontSize: '13px' }}>
                        {reg.diferencia > 0 ? '+' : ''}{reg.diferencia}
                      </span>
                    ) : (<span style={{ color: '#94a3b8' }}>-</span>)}
                  </td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: eb.bg, color: eb.color }}>{reg.estado}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="rd01-tipo-badge" style={tipoBadgeStyle}>{reg.tipo_devolucion}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{reg.almacen_destino}</td>
                  <td className="ed01-usuario" style={{ whiteSpace: 'nowrap' }}>{nombresUsuarios[reg.creado_por] || reg.creado_por}</td>
                  <td className="ed01-mono" style={{ whiteSpace: 'nowrap' }}>{new Date(reg.creado_en).toLocaleDateString('es-CL')}</td>
                  <td className="ed01-usuario" style={{ whiteSpace: 'nowrap' }}>{reg.modificado_por ? (nombresUsuarios[reg.modificado_por] || reg.modificado_por) : '-'}</td>
                  <td className="ed01-mono" style={{ whiteSpace: 'nowrap' }}>{reg.modificado_en ? new Date(reg.modificado_en).toLocaleDateString('es-CL') : '-'}</td>
                  <td style={{ textAlign: 'center' }}>{reg.observacion ? 'Si' : 'No'}</td>
                  <td>
                    <div className="rd01-acciones" style={{ whiteSpace: 'nowrap' }}>
                      <button className="rd01-btn-detalle" onClick={() => onVerDetalle(reg)}>Detalle</button>
                      {reg.estado !== 'Cancelado' && (<button className="rd01-btn-cancelar" onClick={() => onCancelar(reg)}>Cancelar</button>)}
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
