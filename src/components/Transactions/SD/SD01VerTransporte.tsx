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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div style={{
              background: '#f8fafd',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid #eef0f5'
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📅 Programación
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Fecha Programación</span>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                    {formatearFecha(transporte.fecha_programacion)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{
              background: '#f8fafd',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid #eef0f5'
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🚛 Conductor
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Nombre</span>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                    {detallesConductor ? detallesConductor.nombre + ' ' + detallesConductor.apellido : '-'}
                  </span>
                </div>
                {detallesConductor && (
                  <>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>RUT</span>
                      <span style={{ fontSize: '14px', color: '#475569' }}>
                        {formatearRut(detallesConductor.numero_documento)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Teléfono</span>
                      <span style={{ fontSize: '14px', color: '#475569' }}>
                        {detallesConductor.telefono || '-'}
                      </span>
                    </div>
                    {detallesConductor.empresa && (
                      <div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Transportista</span>
                        <span style={{ fontSize: '14px', color: '#475569' }}>
                          {detallesConductor.empresa}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div style={{
              background: '#f8fafd',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid #eef0f5'
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🚗 Patente
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Patente</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', fontFamily: 'Courier New, monospace' }}>
                    {detallesPatente ? detallesPatente.numero_patente : '-'}
                  </span>
                </div>
                {detallesPatente && (
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Tipo de Vehículo</span>
                    <span style={{ fontSize: '14px', color: '#475569' }}>
                      {detallesPatente.tipo_vehiculo || 'Otro'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div style={{
              background: '#f8fafd',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid #eef0f5'
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                👤 Información
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Creado Por</span>
                  <span style={{ fontSize: '14px', color: '#475569' }}>
                    {transporte.creado_por_nombre || '-'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Asignado A</span>
                  <span style={{ fontSize: '14px', color: '#475569' }}>
                    {transporte.administrativo || 'No asignado'}
                  </span>
                </div>
                {transporte.observaciones && (
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Observaciones</span>
                    <span style={{ fontSize: '14px', color: '#dc2626' }}>
                      {transporte.observaciones}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📍 Locales de Entrega
              <span style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#64748b',
                background: '#f1f5f9',
                padding: '2px 10px',
                borderRadius: '10px'
              }}>
                {locales.length} {locales.length === 1 ? 'local' : 'locales'}
              </span>
            </h3>
            
            {locales.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', background: '#f8fafd', borderRadius: '8px' }}>
                No hay locales registrados
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {locales.map((local: any, index: number) => (
                  <div
                    key={local.id || index}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.5fr 1fr 1fr',
                      gap: '12px',
                      padding: '14px 16px',
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #eef0f5',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Código</span>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', fontFamily: 'Courier New, monospace' }}>
                        {local.codigo_local}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Nombre Local</span>
                      <span style={{ fontSize: '14px', color: '#475569' }}>
                        {local.nombre_local || '-'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Fecha Entrega</span>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                        {formatearFecha(local.fecha_entrega)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Hora Entrega</span>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                        {local.hora_entrega || '-'}
                      </span>
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
