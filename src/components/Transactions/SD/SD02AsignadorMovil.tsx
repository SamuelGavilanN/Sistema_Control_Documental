// src/components/Transactions/SD/SD02AsignadorMovil.tsx

import React, { useState, useEffect } from 'react';
import { auth } from '../../../lib/auth';
import './SD02.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const SD02AsignadorMovil: React.FC = () => {
  const [transportes, setTransportes]: any = useState([]);
  const [transportesFiltrados, setTransportesFiltrados]: any = useState([]);
  const [busqueda, setBusqueda]: any = useState('');
  const [cargando, setCargando]: any = useState(true);
  const [transporteSeleccionado, setTransporteSeleccionado]: any = useState(null);
  const [usuariosAdmin, setUsuariosAdmin]: any = useState([]);
  const [usuarioAsignar, setUsuarioAsignar]: any = useState('');
  const [asignando, setAsignando]: any = useState(false);
  const [mensaje, setMensaje]: any = useState({ tipo: '', texto: '', visible: false });
  const usuario: any = auth.getUsuario();

  useEffect(() => {
    cargarTransportes();
    cargarUsuariosAdmin();
    const intervalo = setInterval(cargarTransportes, 10000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    filtrarTransportes();
  }, [busqueda, transportes]);

  const cargarTransportes = async () => {
    try {
      const resp = await fetch(
        API_URL + '/sd01_documentos?select=*&estado=eq.Pendiente&asignado_a=is.null&order=creado_en.desc',
        { headers: HEADERS }
      );
      const data = await resp.json();
      if (data && data.length > 0) {
        const transportesConDetalles = await Promise.all(data.map(async (transporte: any) => {
          const respLocales = await fetch(
            API_URL + '/sd01_documento_locales?select=*&documento_id=eq.' + transporte.id_documento,
            { headers: HEADERS }
          );
          const locales = await respLocales.json();

          let conductorNombre = '';
          let conductorRut = '';
          let conductorTelefono = '';
          let conductorEmpresa = '';
          let patentePrincipalNumero = '';
          let patentePrincipalTipo = '';
          let patenteAdicionalNumero = '';
          let patenteAdicionalTipo = '';

          if (transporte.conductor_id) {
            try {
              const respConductor = await fetch(
                API_URL + '/conductores?select=*&id=eq.' + transporte.conductor_id,
                { headers: HEADERS }
              );
              const conductorData = await respConductor.json();
              if (conductorData && conductorData.length > 0) {
                conductorNombre = conductorData[0].nombre + ' ' + conductorData[0].apellido;
                conductorRut = conductorData[0].numero_documento || '';
                conductorTelefono = conductorData[0].telefono || '';
                conductorEmpresa = conductorData[0].empresa || '';
              }
            } catch (e) {}
          }

          if (transporte.patente_principal_id) {
            try {
              const respPatente = await fetch(
                API_URL + '/patentes?select=*&id=eq.' + transporte.patente_principal_id,
                { headers: HEADERS }
              );
              const patenteData = await respPatente.json();
              if (patenteData && patenteData.length > 0) {
                patentePrincipalNumero = patenteData[0].numero_patente;
                patentePrincipalTipo = patenteData[0].tipo_vehiculo || '';
              }
            } catch (e) {}
          }

          if (transporte.patente_adicional_id) {
            try {
              const respPatente = await fetch(
                API_URL + '/patentes?select=*&id=eq.' + transporte.patente_adicional_id,
                { headers: HEADERS }
              );
              const patenteData = await respPatente.json();
              if (patenteData && patenteData.length > 0) {
                patenteAdicionalNumero = patenteData[0].numero_patente;
                patenteAdicionalTipo = patenteData[0].tipo_vehiculo || '';
              }
            } catch (e) {}
          }

          return {
            ...transporte,
            locales: locales || [],
            conductor_nombre: conductorNombre,
            conductor_rut: conductorRut,
            conductor_telefono: conductorTelefono,
            conductor_empresa: conductorEmpresa,
            patente_principal_numero: patentePrincipalNumero,
            patente_principal_tipo: patentePrincipalTipo,
            patente_adicional_numero: patenteAdicionalNumero,
            patente_adicional_tipo: patenteAdicionalTipo
          };
        }));
        setTransportes(transportesConDetalles);
      } else {
        setTransportes([]);
      }
      setCargando(false);
    } catch (e) {
      console.error('Error cargando transportes:', e);
      setCargando(false);
    }
  };

  const cargarUsuariosAdmin = async () => {
    try {
      const resp = await fetch(
        API_URL + '/usuarios?select=id,nombre,apellido,rol&or=(rol.eq.Administrativo,rol.eq.Lider)&activo=eq.true&order=nombre.asc',
        { headers: HEADERS }
      );
      const data = await resp.json();
      if (data) setUsuariosAdmin(data);
    } catch (e) {}
  };

  const filtrarTransportes = () => {
    if (!busqueda.trim()) {
      setTransportesFiltrados(transportes);
      return;
    }

    const termino = busqueda.toLowerCase();
    const filtrados = transportes.filter((t: any) => {
      const conductor = t.conductor_nombre.toLowerCase();
      const patentePrincipal = t.patente_principal_numero.toLowerCase();
      const patenteAdicional = t.patente_adicional_numero.toLowerCase();
      const localesNombres = t.locales.map((l: any) => 
        l.codigo_local.toLowerCase() + ' ' + (l.nombre_local || '').toLowerCase()
      ).join(' ');
      
      return conductor.includes(termino) || 
             patentePrincipal.includes(termino) || 
             patenteAdicional.includes(termino) || 
             localesNombres.includes(termino);
    });

    setTransportesFiltrados(filtrados);
  };

  const handleSeleccionarTransporte = (transporte: any) => {
    setTransporteSeleccionado(transporte);
    setUsuarioAsignar('');
  };

  const handleAsignar = async () => {
    if (!usuarioAsignar) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar un usuario', visible: true });
      setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 3000);
      return;
    }

    setAsignando(true);
    try {
      const usuarioSeleccionado = usuariosAdmin.find((u: any) => u.id === usuarioAsignar);
      await fetch(API_URL + '/sd01_documentos?id=eq.' + transporteSeleccionado.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asignado_a: usuarioAsignar,
          administrativo: usuarioSeleccionado ? usuarioSeleccionado.nombre + ' ' + usuarioSeleccionado.apellido : '',
          modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
          modificado_en: new Date().toISOString()
        })
      });

      setMensaje({ tipo: 'success', texto: 'Transporte asignado exitosamente', visible: true });
      setTimeout(() => {
        setMensaje({ tipo: '', texto: '', visible: false });
        setTransporteSeleccionado(null);
        cargarTransportes();
      }, 1500);
    } catch (e) {
      setMensaje({ tipo: 'error', texto: 'Error al asignar transporte', visible: true });
      setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 3000);
    }
    setAsignando(false);
  };

  const formatearFecha = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  const formatearHora = (fecha: string) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  if (cargando) {
    return (
      <div className="sd02-container">
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Cargando transportes...
        </div>
      </div>
    );
  }

  return (
    <div className="sd02-container">
      {mensaje.visible && (
        <div className={'sd02-toast sd02-toast-' + mensaje.tipo}>
          {mensaje.texto}
        </div>
      )}

      <div className="sd02-header">
        <h2>Asignador Móvil</h2>
        <p className="sd02-subtitle">Transportes pendientes sin asignar</p>
      </div>

      <div className="sd02-search">
        <input
          type="text"
          className="sd02-search-input"
          placeholder="Buscar por conductor, patente o local..."
          value={busqueda}
          onChange={(e: any) => setBusqueda(e.target.value)}
        />
        <svg className="sd02-search-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M8.25 14.25C11.5637 14.25 14.25 11.5637 14.25 8.25C14.25 4.93629 11.5637 2.25 8.25 2.25C4.93629 2.25 2.25 4.93629 2.25 8.25C2.25 11.5637 4.93629 14.25 8.25 14.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15.75 15.75L12.4875 12.4875" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div className="sd02-count">
        Mostrando <strong>{transportesFiltrados.length}</strong> de <strong>{transportes.length}</strong> transportes
      </div>

      {transportesFiltrados.length === 0 ? (
        <div className="sd02-empty">
          {busqueda ? 'No se encontraron transportes' : 'No hay transportes pendientes sin asignar'}
        </div>
      ) : (
        <div className="sd02-list">
          {transportesFiltrados.map((transporte: any) => (
            <div
              key={transporte.id}
              className="sd02-card"
              onClick={() => handleSeleccionarTransporte(transporte)}
            >
              <div className="sd02-card-header">
                <span className="sd02-card-id">{transporte.id_documento}</span>
                <span className="sd02-card-estado" style={{
                  color: 'var(--estado-pendiente-text)',
                  background: 'var(--estado-pendiente-bg)'
                }}>
                  Pendiente
                </span>
              </div>
              <div className="sd02-card-body">
                <div className="sd02-card-row">
                  <span className="sd02-card-label">Conductor</span>
                  <span className="sd02-card-value">{transporte.conductor_nombre || '-'}</span>
                </div>
                <div className="sd02-card-row">
                  <span className="sd02-card-label">Patente</span>
                  <span className="sd02-card-value">
                    {transporte.patente_principal_numero || '-'}
                    {transporte.patente_adicional_numero && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '12px' }}>
                        + {transporte.patente_adicional_numero}
                      </span>
                    )}
                  </span>
                </div>
                <div className="sd02-card-row">
                  <span className="sd02-card-label">Locales</span>
                  <span className="sd02-card-value">{transporte.locales.length}</span>
                </div>
                {transporte.locales.length > 0 && (
                  <div className="sd02-card-locales">
                    {transporte.locales.slice(0, 3).map((local: any, idx: number) => (
                      <span key={idx} className="sd02-card-local-badge">
                        {local.codigo_local} {local.nombre_local ? '- ' + local.nombre_local : ''}
                      </span>
                    ))}
                    {transporte.locales.length > 3 && (
                      <span className="sd02-card-local-badge">+{transporte.locales.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="sd02-card-footer">
                <span>{formatearFecha(transporte.fecha_programacion)}</span>
                <span>{formatearHora(transporte.creado_en)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {transporteSeleccionado && (
        <div className="sd02-modal-overlay" onClick={() => setTransporteSeleccionado(null)}>
          <div className="sd02-modal" onClick={(e: any) => e.stopPropagation()}>
            <div className="sd02-modal-header">
              <h2>{transporteSeleccionado.id_documento}</h2>
              <button className="sd02-modal-close" onClick={() => setTransporteSeleccionado(null)}>×</button>
            </div>
            <div className="sd02-modal-body">
              <div className="sd02-modal-section">
                <div className="sd02-modal-section-title">Información del Transporte</div>
                <div className="sd02-modal-info-grid">
                  <div className="sd02-modal-info-item">
                    <span className="sd02-modal-info-label">Conductor</span>
                    <span className="sd02-modal-info-value">{transporteSeleccionado.conductor_nombre || '-'}</span>
                  </div>
                  <div className="sd02-modal-info-item">
                    <span className="sd02-modal-info-label">Patente Principal</span>
                    <span className="sd02-modal-info-value-large">{transporteSeleccionado.patente_principal_numero || '-'}</span>
                  </div>
                  {transporteSeleccionado.patente_adicional_numero && (
                    <div className="sd02-modal-info-item">
                      <span className="sd02-modal-info-label">Patente Adicional</span>
                      <span className="sd02-modal-info-value-large">{transporteSeleccionado.patente_adicional_numero}</span>
                    </div>
                  )}
                  <div className="sd02-modal-info-item">
                    <span className="sd02-modal-info-label">Fecha Programación</span>
                    <span className="sd02-modal-info-value">{formatearFecha(transporteSeleccionado.fecha_programacion)}</span>
                  </div>
                  <div className="sd02-modal-info-item">
                    <span className="sd02-modal-info-label">Estado</span>
                    <span className="sd02-modal-info-value" style={{ color: 'var(--estado-pendiente-text)', fontWeight: 600 }}>Pendiente</span>
                  </div>
                  {transporteSeleccionado.conductor_rut && (
                    <div className="sd02-modal-info-item">
                      <span className="sd02-modal-info-label">RUT Conductor</span>
                      <span className="sd02-modal-info-value">{transporteSeleccionado.conductor_rut}</span>
                    </div>
                  )}
                  {transporteSeleccionado.conductor_telefono && (
                    <div className="sd02-modal-info-item">
                      <span className="sd02-modal-info-label">Teléfono</span>
                      <span className="sd02-modal-info-value">{transporteSeleccionado.conductor_telefono}</span>
                    </div>
                  )}
                  {transporteSeleccionado.conductor_empresa && (
                    <div className="sd02-modal-info-item">
                      <span className="sd02-modal-info-label">Transportista</span>
                      <span className="sd02-modal-info-value">{transporteSeleccionado.conductor_empresa}</span>
                    </div>
                  )}
                  {transporteSeleccionado.patente_principal_tipo && (
                    <div className="sd02-modal-info-item">
                      <span className="sd02-modal-info-label">Tipo Vehículo Principal</span>
                      <span className="sd02-modal-info-value">{transporteSeleccionado.patente_principal_tipo}</span>
                    </div>
                  )}
                  {transporteSeleccionado.patente_adicional_tipo && (
                    <div className="sd02-modal-info-item">
                      <span className="sd02-modal-info-label">Tipo Vehículo Adicional</span>
                      <span className="sd02-modal-info-value">{transporteSeleccionado.patente_adicional_tipo}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="sd02-modal-section">
                <div className="sd02-modal-section-title">
                  Locales ({transporteSeleccionado.locales.length})
                </div>
                <div className="sd02-modal-locales-list">
                  {transporteSeleccionado.locales.map((local: any, idx: number) => (
                    <div key={idx} className="sd02-modal-local-item">
                      <div>
                        <span className="sd02-modal-local-code">{local.codigo_local}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          {local.nombre_local || ''}
                        </span>
                      </div>
                      <span className="sd02-modal-local-date">
                        {formatearFecha(local.fecha_entrega)} {local.hora_entrega || ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sd02-asignar-section">
                <div className="sd02-modal-section-title">Asignar a Usuario</div>
                <select
                  className="sd02-asignar-select"
                  value={usuarioAsignar}
                  onChange={(e: any) => setUsuarioAsignar(e.target.value)}
                >
                  <option value="">Seleccionar usuario...</option>
                  {usuariosAdmin.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido} ({u.rol})
                    </option>
                  ))}
                </select>
                <button
                  className="sd02-btn-asignar"
                  onClick={handleAsignar}
                  disabled={asignando || !usuarioAsignar}
                >
                  {asignando ? 'Asignando...' : 'Asignar Transporte'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD02AsignadorMovil;
