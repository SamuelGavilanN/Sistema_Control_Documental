import React from 'react';
import { ED01Row } from './ED01View';

interface ED01TablaProps {
  registros: ED01Row[];
  cargando: boolean;
  seleccionado: ED01Row | null;
  onSeleccionar: (reg: ED01Row) => void;
  onVerObservacion: (obs: string | null) => void;
  ordenColumna: string;
  ordenDireccion: 'asc' | 'desc';
  onOrdenar: (columna: string) => void;
  nombresUsuarios: Record<string, string>;
}

const columnas = [
  { key: 'estado', label: 'Estado', width: '90px' },
  { key: 'numero_tarea', label: 'Numero Tarea', width: '190px' },
  { key: 'numero_empaque', label: 'Numero Empaque', width: '145px' },
  { key: 'codigo_local', label: 'Cod Tienda', width: '85px' },
  { key: 'nombre_local', label: 'Tienda', width: '160px' },
  { key: 'cantidad_bultos', label: 'Cant. Bultos', width: '90px' },
  { key: 'cantidad_pallet', label: 'Cant. Pallet', width: '90px' },
  { key: 'creado_por', label: 'Creado Por', width: '140px' },
  { key: 'creado_en', label: 'Creado En', width: '150px' },
  { key: 'modificado_por', label: 'Mod. Por', width: '140px' },
  { key: 'modificado_en', label: 'Mod. En', width: '150px' },
  { key: 'observacion', label: 'Obs.', width: '70px' },
];

const ED01Tabla: React.FC<ED01TablaProps> = ({ registros, cargando, seleccionado, onSeleccionar, onVerObservacion, ordenColumna, ordenDireccion, onOrdenar, nombresUsuarios }) => {
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' };
      case 'Editando': return { color: '#b45309', bg: '#fef3c7' };
      case 'Cancelado': return { color: '#dc2626', bg: '#fef2f2' };
      default: return { color: '#64748b', bg: '#f1f5f9' };
    }
  };

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="ed01-tabla-container">
      <table className="ed01-tabla">
        <thead>
          <tr>
            {columnas.map(col => (
              <th key={col.key} style={{ width: col.width, cursor: 'pointer' }} onClick={() => onOrdenar(col.key)}>
                {col.label} {ordenColumna === col.key ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
              </th>
            ))}
            <th style={{ width: '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr><td colSpan={14} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando registros...</td></tr>
          ) : registros.length === 0 ? (
            <tr><td colSpan={14} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No hay registros</td></tr>
          ) : (
            registros.map(reg => {
              const badge = getEstadoBadge(reg.estado);
              return (
                <tr key={reg.id} className={seleccionado?.id === reg.id ? 'selected' : ''} onClick={() => onSeleccionar(reg)}>
                  <td><span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{reg.estado}</span></td>
                  <td className="ed01-mono">{reg.numero_tarea}</td>
                  <td className="ed01-numero-empaque">{reg.numero_empaque}</td>
                  <td>{reg.codigo_local}</td>
                  <td>{reg.nombre_local}</td>
                  <td>{reg.cantidad_bultos}</td>
                  <td>{reg.cantidad_pallet}</td>
                  <td className="ed01-usuario">{nombresUsuarios[reg.creado_por] || reg.creado_por || '-'}</td>
                  <td className="ed01-mono">{formatearFecha(reg.creado_en)}</td>
                  <td className="ed01-usuario">{reg.modificado_por ? (nombresUsuarios[reg.modificado_por] || reg.modificado_por) : '-'}</td>
                  <td className="ed01-mono">{formatearFecha(reg.modificado_en)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{reg.observacion ? 'Si' : 'No'}</span>
                      {reg.observacion && (
                        <button className="ed01-btn-ver-obs" onClick={(e) => { e.stopPropagation(); onVerObservacion(reg.observacion); }} title="Ver observacion">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 7C2.5 3.5 4.5 2 7 2C9.5 2 11.5 3.5 13 7C11.5 10.5 9.5 12 7 12C4.5 12 2.5 10.5 1 7Z" stroke="currentColor" strokeWidth="1.5"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                  <td></td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ED01Tabla;