// src/components/Transactions/SD/SD01IniciarTransporte.tsx

import React, { useState, useEffect } from 'react';
import SD01IngresarBultos from './SD01IngresarBultos';
import './SD01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface SD01IniciarTransporteProps {
  transporte: any;
  onClose: () => void;
  onActualizar: () => void;
  usuario: any;
}

const SD01IniciarTransporte: React.FC<SD01IniciarTransporteProps> = ({ transporte, onClose, onActualizar, usuario }) => {
  const [locales, setLocales] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarInfo, setMostrarInfo] = useState(true);
  const [localActual, setLocalActual] = useState<any>(null);
  const [mostrarModalBultos, setMostrarModalBultos] = useState(false);

  // Detalles del conductor y patentes (se cargan desde el transporte)
  const [detallesConductor, setDetallesConductor] = useState<any>(null);
  const [detallesPatentePrincipal, setDetallesPatentePrincipal] = useState<any>(null);
  const [detallesPatenteAdicional, setDetallesPatenteAdicional] = useState<any>(null);

  useEffect(() => {
    if (transporte) {
      cargarDetalles();
      cargarLocales();
    }
  }, [transporte]);

  const cargarDetalles = async () => {
    try {
      if (transporte.conductor_id) {
        const resp = await fetch(API_URL + '/conductores?select=*&id=eq.' + transporte.conductor_id, { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) setDetallesConductor(data[0]);
      }
      if (transporte.patente_principal_id) {
        const resp = await fetch(API_URL + '/patentes?select=*&id=eq.' + transporte.patente_principal_id, { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) setDetallesPatentePrincipal(data[0]);
      }
      if (transporte.patente_adicional_id) {
        const resp = await fetch(API_URL + '/patentes?select=*&id=eq.' + transporte.patente_adicional_id, { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) setDetallesPatenteAdicional(data[0]);
      }
    } catch (e) {
      console.error('Error cargando detalles:', e);
    }
  };

  const cargarLocales = async () => {
    try {
      const resp = await fetch(API_URL + '/sd01_documento_locales?select=*&documento_id=eq.' + transporte.id_documento, { headers: HEADERS });
      const data = await resp.json();
      if (data) {
        setLocales(data);
      }
    } catch (e) {
      console.error('Error cargando locales:', e);
    }
    setCargando(false);
  };

  const handleLocalChange = (index: number, field: string, value: any) => {
    const nuevos = [...locales];
    nuevos[index][field] = value;
    setLocales(nuevos);
  };

  const guardarCambiosLocal = async (index: number) => {
    const local = locales[index];
    try {
      await fetch(API_URL + '/sd01_documento_locales?id=eq.' + local.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sello_trasero: local.sello_trasero || null,
          cantidad_pallet: local.cantidad_pallet || null,
          modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
          modificado_en: new Date().toISOString()
        })
      });
      // No mostramos mensaje para no saturar
    } catch (e) {
      console.error('Error guardando local:', e);
    }
  };

  const handleIngresarBultos = (local: any) => {
    setLocalActual(local);
    setMostrarModalBultos(true);
  };

  const handleBultosGuardados = () => {
    setMostrarModalBultos(false);
    // Recargar locales para actualizar el contador de bultos si lo mostramos
    cargarLocales();
    onActualizar();
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
        <div className="sd01-modal" style={{ maxWidth: '900px' }} onClick={(e: any) => e.stopPropagation()}>
          <div className="sd01-modal-header">
            <h2>Iniciar Transporte</h2>
            <button className="sd01-modal-close" onClick={onClose}>×</button>
          </div>
          <div className="sd01-modal-body" style={{ textAlign: 'center', padding: '40px' }}>
            Cargando datos...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sd01-modal-overlay" onClick={onClose}>
      <div className="sd01-modal" style={{ maxWidth: '950px' }} onClick={(e: any) => e.stopPropagation()}>
        <div className="sd01-modal-header">
          <h2>Transporte {transporte.id_documento}</h2>
          <button className="sd01-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="sd01-modal-body">
          {/* Toggle para ocultar/mostrar tarjetas de información */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button 
              onClick={() => setMostrarInfo(!mostrarInfo)}
              style={{
                background: 'var(--btn-bg)',
                border: '1px solid var(--btn-border)',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              {mostrarInfo ? 'Ocultar datos del transporte' : 'Mostrar datos del transporte'}
            </button>
          </div>

          {mostrarInfo && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {/* Tarjeta: Fecha Programación */}
              <div className="sd01-ver-card">
                <div className="sd01-ver-card-title">Programación</div>
                <div className="sd01-ver-field">
                  <span className="sd01-ver-field-label">Fecha Programación</span>
                  <span className="sd01-ver-field-value">{formatearFecha(transporte.fecha_programacion)}</span>
                </div>
                {transporte.fecha_inicio && (
                  <div className="sd01-ver-field">
                    <span className="sd01-ver-field-label">Hora Inicio</span>
                    <span className="sd01-ver-field-value">
                      {new Date(transporte.fecha_inicio).toLocaleString('es-CL')}
                    </span>
                  </div>
                )}
              </div>

              {/* Tarjeta: Conductor */}
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
                      <span className="sd01-ver-field-value">{formatearRut(detallesConductor.numero_documento)}</span>
                    </div>
                    <div className="sd01-ver-field">
                      <span className="sd01-ver-field-label">Teléfono</span>
                      <span className="sd01-ver-field-value">{detallesConductor.telefono || '-'}</span>
                    </div>
                    <div className="sd01-ver-field">
                      <span className="sd01-ver-field-label">Transportista</span>
                      <span className="sd01-ver-field-value">{detallesConductor.empresa || '-'}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Tarjeta: Patente Principal */}
              <div className="sd01-ver-card">
                <div className="sd01-ver-card-title">Patente Principal</div>
                <div className="sd01-ver-field">
                  <span className="sd01-ver-field-label">Patente</span>
                  <span className="sd01-ver-field-value-large">
                    {detallesPatentePrincipal ? detallesPatentePrincipal.numero_patente : '-'}
                  </span>
                </div>
                {detallesPatentePrincipal && (
                  <div className="sd01-ver-field">
                    <span className="sd01-ver-field-label">Tipo de Vehículo</span>
                    <span className="sd01-ver-field-value">{detallesPatentePrincipal.tipo_vehiculo || 'Otro'}</span>
                  </div>
                )}
              </div>

              {/* Tarjeta: Patente Adicional */}
              <div className="sd01-ver-card">
                <div className="sd01-ver-card-title">Patente Adicional</div>
                {detallesPatenteAdicional ? (
                  <>
                    <div className="sd01-ver-field">
                      <span className="sd01-ver-field-label">Patente</span>
                      <span className="sd01-ver-field-value-large">{detallesPatenteAdicional.numero_patente}</span>
                    </div>
                    <div className="sd01-ver-field">
                      <span className="sd01-ver-field-label">Tipo de Vehículo</span>
                      <span className="sd01-ver-field-value">{detallesPatenteAdicional.tipo_vehiculo || 'Otro'}</span>
                    </div>
                  </>
                ) : (
                  <div className="sd01-ver-field">
                    <span className="sd01-ver-field-value" style={{ color: 'var(--text-muted)' }}>No asignada</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabla de locales con campos editables */}
          <div style={{ marginTop: '8px' }}>
            <div className="sd01-ver-locales-title">
              Datos Destino
              <span className="sd01-ver-locales-count">{locales.length} locales</span>
            </div>
            <div className="sd01-table-scroll">
              <table className="sd01-table" style={{ minWidth: '800px' }}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre Local</th>
                    <th>Fecha Entrega</th>
                    <th>Hora Entrega</th>
                    <th>Sello Trasero</th>
                    <th>Cantidad Pallet</th>
                    <th style={{ textAlign: 'center' }}>Bultos</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {locales.map((local, index) => (
                    <tr key={local.id}>
                      <td><strong>{local.codigo_local}</strong></td>
                      <td>{local.nombre_local || '-'}</td>
                      <td>{formatearFecha(local.fecha_entrega)}</td>
                      <td>{local.hora_entrega || '-'}</td>
                      <td>
                        <input
                          type="text"
                          className="sd01-form-input"
                          style={{ width: '100px', padding: '4px 8px', fontSize: '13px' }}
                          value={local.sello_trasero || ''}
                          onChange={(e) => handleLocalChange(index, 'sello_trasero', e.target.value)}
                          onBlur={() => guardarCambiosLocal(index)}
                          placeholder="Sello"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="sd01-form-input"
                          style={{ width: '80px', padding: '4px 8px', fontSize: '13px' }}
                          value={local.cantidad_pallet || ''}
                          onChange={(e) => handleLocalChange(index, 'cantidad_pallet', e.target.value ? Number(e.target.value) : null)}
                          onBlur={() => guardarCambiosLocal(index)}
                          placeholder="0"
                          min="0"
                        />
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                        {local.bultos_count || 0}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="sd01-btn sd01-btn-primary"
                          style={{ padding: '2px 8px', fontSize: '12px' }}
                          onClick={() => handleIngresarBultos(local)}
                        >
                          + Bultos
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="sd01-modal-footer">
          <div></div>
          <button className="sd01-btn-cancel" onClick={onClose}>Cerrar</button>
        </div>
      </div>

      {/* Modal de ingreso de bultos */}
      {mostrarModalBultos && localActual && (
        <SD01IngresarBultos
          local={localActual}
          documentoId={transporte.id_documento}
          onClose={() => setMostrarModalBultos(false)}
          onGuardado={handleBultosGuardados}
          usuario={usuario}
        />
      )}
    </div>
  );
};

export default SD01IniciarTransporte;
