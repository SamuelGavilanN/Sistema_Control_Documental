// src/components/Transactions/SD/SD01VerModal.tsx

import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SD01VerModalProps {
  isOpen: boolean;
  transporte: any;
  locales: any[];
  onClose: () => void;
  onEditar: () => void;
  onCancelar: () => void;
}

const SD01VerModal: React.FC<SD01VerModalProps> = ({
  isOpen,
  transporte,
  locales,
  onClose,
  onEditar,
  onCancelar
}) => {
  if (!isOpen || !transporte) return null;

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Borrador': return { color: '#64748b', bg: '#f1f5f9', label: 'Borrador' };
      case 'Pendiente': return { color: '#b45309', bg: '#fef3c7', label: 'Pendiente' };
      case 'Asignado': return { color: '#1d4ed8', bg: '#dbeafe', label: 'Asignado' };
      case 'En Proceso': return { color: '#7c3aed', bg: '#ede9fe', label: 'En Proceso' };
      case 'Finalizado': return { color: '#15803d', bg: '#dcfce7', label: 'Finalizado' };
      case 'Cancelado': return { color: '#dc2626', bg: '#fef2f2', label: 'Cancelado' };
      default: return { color: '#64748b', bg: '#f1f5f9', label: estado };
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const estadoInfo = getEstadoBadge(transporte.estado);

  const puedeEditar = transporte.estado !== 'Finalizado' && transporte.estado !== 'Cancelado';
  const puedeCancelar = transporte.estado !== 'Cancelado' && transporte.estado !== 'Finalizado';

  return (
    <div className="ed01-modal-overlay" onClick={onClose}>
      <div className="ed01-modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
        <div className="ed01-modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {transporte.id_documento}
            <span style={{
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              background: estadoInfo.bg,
              color: estadoInfo.color
            }}>
              {estadoInfo.label}
            </span>
          </h2>
          <button className="ed01-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="ed01-modal-body">
          {/* Información General */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Fecha Programación</label>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                {transporte.fecha_programacion ? new Date(transporte.fecha_programacion + 'T00:00:00').toLocaleDateString('es-CL') : '-'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Conductor</label>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{transporte.nombre_conductor || '-'}</p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Patente Principal</label>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{transporte.numero_patente || '-'}</p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Patente Adicional</label>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{transporte.patente_adicional || '-'}</p>
            </div>
          </div>

          {/* Administrativo y KPIs */}
          <div style={{ background: '#f8fafd', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>
              📋 Asignación y KPIs
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Administrativo</label>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                  {transporte.nombre_administrativo || 'Sin asignar'}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Asignado</label>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                  {formatDate(transporte.fecha_asignacion)}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Iniciado</label>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                  {formatDate(transporte.fecha_inicio)}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Finalizado</label>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                  {formatDate(transporte.fecha_fin)}
                </p>
              </div>
              {transporte.motivo_cancelacion && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Motivo de Cancelación</label>
                  <p style={{ fontSize: '14px', color: '#dc2626', fontWeight: 500 }}>
                    {transporte.motivo_cancelacion}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Locales */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
              📍 Locales ({transporte.total_locales || 0})
            </h4>
            <div style={{ border: '1px solid #eef0f5', borderRadius: '8px', overflow: 'auto', maxHeight: '200px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#fafcff' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #eef0f5' }}>Código</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #eef0f5' }}>Local</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #eef0f5' }}>Fecha Entrega</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #eef0f5' }}>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {locales.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>Sin locales asignados</td></tr>
                  ) : (
                    locales.map((loc: any) => (
                      <tr key={loc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1d4ed8' }}>{loc.codigo_local}</td>
                        <td style={{ padding: '8px 12px' }}>{loc.nombre_local}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {loc.fecha_entrega ? new Date(loc.fecha_entrega + 'T00:00:00').toLocaleDateString('es-CL') : '-'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>{loc.hora_entrega || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observaciones */}
          {transporte.observaciones && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                📝 Observaciones
              </h4>
              <p style={{ fontSize: '13px', color: '#475569', background: '#f8fafd', padding: '12px', borderRadius: '8px' }}>
                {transporte.observaciones}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div style={{ fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #eef0f5', paddingTop: '12px' }}>
            <span>Creado por: {transporte.creado_por_nombre || '-'} · </span>
            <span>{new Date(transporte.creado_en).toLocaleString('es-CL')}</span>
            {transporte.modificado_en && (
              <span> · Modificado: {new Date(transporte.modificado_en).toLocaleString('es-CL')}</span>
            )}
          </div>
        </div>

        <div className="ed01-modal-footer">
          <button className="ed01-btn-cancel" onClick={onClose}>Cerrar</button>
          {puedeEditar && (
            <button className="rd01-btn-editar" onClick={onEditar}>
              ✏️ Editar
            </button>
          )}
          {puedeCancelar && (
            <button className="rd01-btn-eliminar" onClick={onCancelar}>
              ✕ Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SD01VerModal;
