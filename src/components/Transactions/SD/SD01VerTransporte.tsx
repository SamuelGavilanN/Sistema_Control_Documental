// src/components/Transactions/SD/SD01VerTransporte.tsx

import React, { useState, useEffect } from 'react';
import './SD01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface SD01VerTransporteProps {
  onClose: () => void;
  transporte: any;
}

const SD01VerTransporte: React.FC<SD01VerTransporteProps> = ({ onClose, transporte }) => {
  const [detallesConductor, setDetallesConductor]: any = useState(null);
  const [detallesPatente, setDetallesPatente]: any = useState(null);
  const [locales, setLocales]: any = useState([]);
  const [cargando, setCargando]: any = useState(true);

  useEffect(() => {
    if (transporte) {
      cargarDetalles();
    }
  }, [transporte]);

  const cargarDetalles = async () => {
    try {
      if (transporte.conductor_id) {
        const resp = await fetch(API_URL + '/conductores?select=*&id=eq.' + transporte.conductor_id, { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) {
          setDetallesConductor(data[0]);
        }
      }

      if (transporte.patente_principal_id) {
        const resp = await fetch(API_URL + '/patentes?select=*&id=eq.' + transporte.patente_principal_id, { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) {
          setDetallesPatente(data[0]);
        }
      }

      const resp = await fetch(API_URL + '/sd01_documento_locales?select=*&documento_id=eq.' + transporte.id_documento, { headers: HEADERS });
      const data = await resp.json();
      if (data) {
        setLocales(data);
      }
    } catch (e) {
      console.error('Error cargando detalles:', e);
    }
    setCargando(false);
  };

  const formatearFecha = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  const formatearRut = (rut: string) => {
    if (!rut) return '-';
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');
    if (rutLimpio.length < 2) return rut;
    const dv = rutLimpio.slice(-1);
    const numero = rutLimpio.slice(0, -1);
    const numeroFormateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return numeroFormateado + '-' + dv;
  };

  if (cargando) {
    return (
      <div className="sd01-modal-overlay" onClick={onClose}>
        <div className="sd01-modal" onClick={(e: any) => e.stopPropagation()}>
          <div className="sd01-modal-header">
            <h2>Ver Transporte</h2>
            <button className="sd01-modal-close" onClick={onClose}>×</button>
          </div>
          <div className="sd01-modal-body">
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando detalles...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sd01-modal-overlay" onClick={onClose}>
      <div className="sd01-modal" style={{ maxWidth: '700px' }} onClick={(e: any) => e.stopPropagation()}>
        <div className="sd01-modal-header">
          <h2>Transporte {transporte.id_documento}</h2>
          <button className="sd01-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="sd01-modal-body">
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '20px',
            color: transporte.estado === 'Pendiente' ? '#b45309' : 
                   transporte.estado === 'En Proceso' ? '#1d4ed8' : 
                   transporte.estado === 'Finalizado' ? '#15803d' : '#64748b',
            background: transporte.estado === 'Pendiente' ? '#fef3c7' : 
                       transporte.estado === 'En Proceso' ? '#dbeafe' : 
                       transporte.estado === 'Finalizado' ? '#dcfce7' : '#f1f5f9'
          }}>
            {transporte.estado}
          </div>

          <div className="sd01-ver-grid">
            <div className="sd01-ver-card">
              <div className="sd01-ver-card-title">Programación</div>
              <div className="sd01-ver-field">
                <span className="sd01-ver-field-label">Fecha Programación</span>
                <span className="sd01-ver-field-value">
                  {formatearFecha(transporte.fecha_programacion)}
                </span>
              </div>
            </div>

            <div className="sd01-ver-card">
              <div className="sd01-ver-card-title">Conductor</div>
              <div className="sd01-ver-field">
                <span className="sd01-ver-field-label">Nombre</span>
                <span className="sd01-ver-field-value">
                  {detallesConductor ? detallesConductor.nombre + ' ' + detallesConductor.apellido : '-'}
                </span>
              </div>
              {detallesConductor && (
                <>
                  <div className="sd01-ver-field">
                    <span className="sd01-ver-field-label">RUT</span>
                    <span className="sd01-ver-field-value">
                      {formatearRut(detallesConductor.numero_documento)}
                    </span>
                  </div>
                  <div className="sd01-ver-field">
                    <span className="sd01-ver-field-label">Teléfono</span>
                    <span className="sd01-ver-field-value">
                      {detallesConductor.telefono || '-'}
                    </span>
                  </div>
                  {detallesConductor.empresa && (
                    <div className="sd01-ver-field">
                      <span className="sd01-ver-field-label">Transportista</span>
                      <span className="sd01-ver-field-value">
                        {detallesConductor.empresa}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="sd01-ver-card">
              <div className="sd01-ver-card-title">Patente</div>
              <div className="sd01-ver-field">
                <span className="sd01-ver-field-label">Patente</span>
                <span className="sd01-ver-field-value-large">
                  {detallesPatente ? detallesPatente.numero_patente : '-'}
                </span>
              </div>
              {detallesPatente && (
                <div className="sd01-ver-field">
                  <span className="sd01-ver-field-label">Tipo de Vehículo</span>
                  <span className="sd01-ver-field-value">
                    {detallesPatente.tipo_vehiculo || 'Otro'}
                  </span>
                </div>
              )}
            </div>

            <div className="sd01-ver-card">
              <div className="sd01-ver-card-title">Información</div>
              <div className="sd01-ver-field">
                <span className="sd01-ver-field-label">Creado Por</span>
                <span className="sd01-ver-field-value">
                  {transporte.creado_por_nombre || '-'}
                </span>
              </div>
              <div className="sd01-ver-field">
                <span className="sd01-ver-field-label">Asignado A</span>
                <span className="sd01-ver-field-value">
                  {transporte.administrativo || 'No asignado'}
                </span>
              </div>
              {transporte.observaciones && (
                <div className="sd01-ver-field">
                  <span className="sd01-ver-field-label">Observaciones</span>
                  <span className="sd01-ver-field-value" style={{ color: '#dc2626' }}>
                    {transporte.observaciones}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="sd01-ver-locales-title">
              Locales de Entrega
              <span className="sd01-ver-locales-count">
                {locales.length} {locales.length === 1 ? 'local' : 'locales'}
              </span>
            </div>
            
            {locales.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', background: '#f8fafd', borderRadius: '8px' }}>
                No hay locales registrados
              </div>
            ) : (
              <div>
                {locales.map((local: any, index: number) => (
                  <div key={local.id || index} className="sd01-ver-local-item">
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Código</span>
                      <span className="sd01-ver-local-code">{local.codigo_local}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Nombre Local</span>
                      <span className="sd01-ver-local-name">{local.nombre_local || '-'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Fecha Entrega</span>
                      <span className="sd01-ver-local-date">{formatearFecha(local.fecha_entrega)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Hora Entrega</span>
                      <span className="sd01-ver-local-time">{local.hora_entrega || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="sd01-modal-footer">
          <div></div>
          <button className="sd01-btn-cancel" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default SD01VerTransporte;
