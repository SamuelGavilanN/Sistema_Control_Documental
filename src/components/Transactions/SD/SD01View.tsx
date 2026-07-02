// src/components/Transactions/SD/SD01View.tsx

import React, { useState, useEffect } from 'react';
import { auth } from '../../../lib/auth';
import SD01CrearTransporte from './SD01CrearTransporte';
import SD01VerTransporte from './SD01VerTransporte';
import './SD01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const SD01View: React.FC = () => {
  const [transportes, setTransportes]: any = useState([]);
  const [cargando, setCargando]: any = useState(true);
  const [transporteSeleccionado, setTransporteSeleccionado]: any = useState(null);
  const [mensaje, setMensaje]: any = useState({ tipo: '', texto: '', visible: false });
  const [mostrarCrearTransporte, setMostrarCrearTransporte]: any = useState(false);
  const [mostrarEditarTransporte, setMostrarEditarTransporte]: any = useState(false);
  const [mostrarVerTransporte, setMostrarVerTransporte]: any = useState(false);
  const [usuariosAdmin, setUsuariosAdmin]: any = useState([]);
  const [mostrarAsignarModal, setMostrarAsignarModal]: any = useState(false);
  const [usuarioAsignar, setUsuarioAsignar]: any = useState('');
  const usuario: any = auth.getUsuario();

  useEffect(() => {
    cargarTransportes();
    cargarUsuariosAdmin();
    const intervalo = setInterval(cargarTransportes, 10000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarTransportes = async () => {
    try {
      const resp = await fetch(API_URL + '/sd01_documentos?select=*&order=creado_en.desc', { headers: HEADERS });
      const data = await resp.json();
      if (data && data.length > 0) {
        const transportesConDetalles = await Promise.all(data.map(async (transporte: any) => {
          const respLocales = await fetch(API_URL + '/sd01_documento_locales?select=id&documento_id=eq.' + transporte.id_documento, { headers: HEADERS });
          const locales = await respLocales.json();
          
          let conductorNombre = '-';
          let patenteNumero = '-';
          let creadoPorNombre = '-';
          
          if (transporte.conductor_id) {
            try {
              const respConductor = await fetch(API_URL + '/conductores?select=nombre,apellido&id=eq.' + transporte.conductor_id, { headers: HEADERS });
              const conductorData = await respConductor.json();
              if (conductorData && conductorData.length > 0) {
                conductorNombre = conductorData[0].nombre + ' ' + conductorData[0].apellido;
              }
            } catch (e) {}
          }
          
          if (transporte.patente_principal_id) {
            try {
              const respPatente = await fetch(API_URL + '/patentes?select=numero_patente&id=eq.' + transporte.patente_principal_id, { headers: HEADERS });
              const patenteData = await respPatente.json();
              if (patenteData && patenteData.length > 0) {
                patenteNumero = patenteData[0].numero_patente;
              }
            } catch (e) {}
          }

          if (transporte.creado_por) {
            try {
              const respUsuario = await fetch(API_URL + '/usuarios?select=nombre,apellido&id=eq.' + transporte.creado_por, { headers: HEADERS });
              const usuarioData = await respUsuario.json();
              if (usuarioData && usuarioData.length > 0) {
                creadoPorNombre = usuarioData[0].nombre + ' ' + usuarioData[0].apellido;
              }
            } catch (e) {}
          }
          
          return { 
            ...transporte, 
            cantidad_locales: locales ? locales.length : 0,
            conductor_nombre: conductorNombre,
            patente_principal: patenteNumero,
            creado_por_nombre: creadoPorNombre
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
      const resp = await fetch(API_URL + '/usuarios?select=id,nombre,apellido,rol&or=(rol.eq.Administrativo,rol.eq.Lider)&activo=eq.true', { headers: HEADERS });
      const data = await resp.json();
      if (data) setUsuariosAdmin(data);
    } catch (e) {}
  };

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  const handleSeleccionarTransporte = (transporte: any) => {
    if (transporteSeleccionado && transporteSeleccionado.id === transporte.id) {
      setTransporteSeleccionado(null);
    } else {
      setTransporteSeleccionado(transporte);
    }
  };

  const handleCrearTransporte = () => {
    setMostrarCrearTransporte(true);
  };

  const handleTransporteCreado = () => {
    setMostrarCrearTransporte(false);
    cargarTransportes();
    mostrarMensaje('success', 'Transporte creado exitosamente');
  };

  const handleTransporteEditado = () => {
    setMostrarEditarTransporte(false);
    setTransporteSeleccionado(null);
    cargarTransportes();
    mostrarMensaje('success', 'Transporte editado exitosamente');
  };

  const handleCargarTransporte = () => {
    mostrarMensaje('info', 'Funcionalidad de carga masiva en desarrollo');
  };

  const handleEditarTransporte = () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Debe seleccionar un transporte de la tabla');
      return;
    }
    if (transporteSeleccionado.estado === 'Cancelado' || transporteSeleccionado.estado === 'Finalizado') {
      mostrarMensaje('error', 'No se puede editar un transporte Cancelado o Finalizado');
      return;
    }
    setMostrarEditarTransporte(true);
  };

  const handleCancelarTransporte = async () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Debe seleccionar un transporte de la tabla');
      return;
    }
    if (transporteSeleccionado.estado === 'Cancelado') {
      mostrarMensaje('error', 'El transporte ya está cancelado');
      return;
    }
    if (transporteSeleccionado.estado === 'Finalizado') {
      mostrarMensaje('error', 'No se puede cancelar un transporte finalizado');
      return;
    }

    const motivo = window.prompt(
      '¿Está seguro de cancelar el transporte ' + transporteSeleccionado.id_documento + '?\n\n' +
      'Por favor, ingrese el motivo de la cancelación:'
    );

    if (motivo === null) return;

    if (!motivo.trim()) {
      mostrarMensaje('warning', 'Debe ingresar un motivo para cancelar el transporte');
      return;
    }

    try {
      await fetch(API_URL + '/sd01_documentos?id=eq.' + transporteSeleccionado.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'Cancelado',
          cancelado_en: new Date().toISOString(),
          observaciones: 'Cancelado: ' + motivo.trim(),
          modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
          modificado_en: new Date().toISOString()
        })
      });
      mostrarMensaje('success', 'Transporte cancelado exitosamente');
      setTransporteSeleccionado(null);
      cargarTransportes();
    } catch (e) {
      mostrarMensaje('error', 'Error al cancelar transporte');
    }
  };

  const handleVerTransporte = () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Debe seleccionar un transporte de la tabla');
      return;
    }
    setMostrarVerTransporte(true);
  };

  const handleAsignarTransporte = () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Debe seleccionar un transporte de la tabla');
      return;
    }
    if (transporteSeleccionado.estado === 'Cancelado' || transporteSeleccionado.estado === 'Finalizado') {
      mostrarMensaje('error', 'No se puede asignar un transporte Cancelado o Finalizado');
      return;
    }
    setUsuarioAsignar(transporteSeleccionado.asignado_a || '');
    setMostrarAsignarModal(true);
  };

  const handleConfirmarAsignacion = async () => {
    if (!usuarioAsignar) {
      mostrarMensaje('warning', 'Debe seleccionar un usuario');
      return;
    }
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
      mostrarMensaje('success', 'Transporte asignado exitosamente');
      setMostrarAsignarModal(false);
      setTransporteSeleccionado(null);
      cargarTransportes();
    } catch (e) {
      mostrarMensaje('error', 'Error al asignar transporte');
    }
  };

  const handleReabrirTransporte = async () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Debe seleccionar un transporte de la tabla');
      return;
    }
    if (transporteSeleccionado.estado !== 'Finalizado') {
      mostrarMensaje('error', 'Solo se pueden reabrir transportes en estado Finalizado');
      return;
    }
    if (!window.confirm('¿Está seguro de reabrir el transporte ' + transporteSeleccionado.id_documento + '? Pasará a estado Pendiente.')) return;
    try {
      await fetch(API_URL + '/sd01_documentos?id=eq.' + transporteSeleccionado.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'Pendiente',
          finalizado_en: null,
          modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
          modificado_en: new Date().toISOString()
        })
      });
      mostrarMensaje('success', 'Transporte reabierto exitosamente');
      setTransporteSeleccionado(null);
      cargarTransportes();
    } catch (e) {
      mostrarMensaje('error', 'Error al reabrir transporte');
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges: any = {
      'Pendiente': { color: '#b45309', bg: '#fef3c7' },
      'En Proceso': { color: '#1d4ed8', bg: '#dbeafe' },
      'Finalizado': { color: '#15803d', bg: '#dcfce7' },
      'Cancelado': { color: '#64748b', bg: '#f1f5f9' }
    };
    const badge = badges[estado] || badges['Cancelado'];
    return (
      <span className="sd01-estado-badge" style={{ color: badge.color, background: badge.bg }}>
        {estado}
      </span>
    );
  };

  const formatearFecha = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  const formatearFechaHora = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL') + ' ' + new Date(fecha).toLocaleTimeString('es-CL');
  };

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#64748b', fontSize: '16px' }}>
        Cargando transportes...
      </div>
    );
  }

  return (
    <div className="sd01-container">
      {mensaje.visible && (
        <div className={'sd01-toast sd01-toast-' + mensaje.tipo}>
          {mensaje.texto}
        </div>
      )}

      <div className="sd01-toolbar">
        <button className="sd01-btn sd01-btn-primary" onClick={handleCrearTransporte}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Crear Transporte
        </button>

        <button className="sd01-btn" onClick={handleCargarTransporte}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 10V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V10M4.66667 6.66667L8 10M8 10L11.3333 6.66667M8 10V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Cargar Excel
        </button>

        <div className="sd01-separator"></div>

        <button 
          className="sd01-btn" 
          onClick={handleEditarTransporte}
          disabled={!transporteSeleccionado}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M11.3333 2.00004C11.5084 1.82494 11.7163 1.68605 11.9451 1.59129C12.1738 1.49653 12.4187 1.44775 12.6663 1.44775C12.9138 1.44775 13.1587 1.49653 13.3875 1.59129C13.6163 1.68605 13.8242 1.82494 13.9993 2.00004C14.1744 2.17514 14.3133 2.38305 14.408 2.61187C14.5028 2.8407 14.5516 3.08557 14.5516 3.33337C14.5516 3.58118 14.5028 3.82605 14.408 4.05487C14.3133 4.2837 14.1744 4.49161 13.9993 4.66671L5.33333 13.3327L2 13.9994L2.66667 10.666L11.3333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Editar
        </button>

        <button 
          className="sd01-btn sd01-btn-danger" 
          onClick={handleCancelarTransporte}
          disabled={!transporteSeleccionado}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4H14M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Cancelar
        </button>

        <div className="sd01-separator"></div>

        <button 
          className="sd01-btn" 
          onClick={handleVerTransporte}
          disabled={!transporteSeleccionado}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1.33325 8.00004C1.33325 8.00004 3.99992 3.33337 7.99992 3.33337C11.9999 3.33337 14.6666 8.00004 14.6666 8.00004C14.6666 8.00004 11.9999 12.6667 7.99992 12.6667C3.99992 12.6667 1.33325 8.00004 1.33325 8.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Ver
        </button>

        <div className="sd01-separator"></div>

        <button 
          className="sd01-btn" 
          onClick={handleAsignarTransporte}
          disabled={!transporteSeleccionado}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10.6667 14V12.6667C10.6667 11.9594 10.3857 11.2811 9.88562 10.781C9.38552 10.281 8.70724 10 8 10H4C3.29276 10 2.61448 10.281 2.11438 10.781C1.61428 11.2811 1.33333 11.9594 1.33333 12.6667V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 7.33333C7.47276 7.33333 8.66667 6.13943 8.66667 4.66667C8.66667 3.19391 7.47276 2 6 2C4.52724 2 3.33333 3.19391 3.33333 4.66667C3.33333 6.13943 4.52724 7.33333 6 7.33333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Asignar
        </button>

        <button 
          className="sd01-btn sd01-btn-warning" 
          onClick={handleReabrirTransporte}
          disabled={!transporteSeleccionado}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1.33333 8.00004C1.33333 8.00004 3.99999 3.33337 7.99999 3.33337C11.3333 3.33337 13.6667 6.66671 14.6667 8.00004C13.6667 9.33337 11.3333 12.6667 7.99999 12.6667C3.99999 12.6667 1.33333 8.00004 1.33333 8.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Reabrir
        </button>
      </div>

      {transporteSeleccionado && (
        <div className="sd01-selected-info">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8.00004C14.6667 4.31814 11.6819 1.33337 8 1.33337C4.3181 1.33337 1.33333 4.31814 1.33333 8.00004C1.33333 11.6819 4.3181 14.6667 8 14.6667Z" stroke="#1d4ed8" strokeWidth="1.5"/>
            <path d="M8 5.33337V8.66671" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="11" r="0.666667" fill="#1d4ed8"/>
          </svg>
          <span>Transporte seleccionado: <strong>{transporteSeleccionado.id_documento}</strong> - {transporteSeleccionado.estado}</span>
          <button className="sd01-selected-close" onClick={() => setTransporteSeleccionado(null)}>×</button>
        </div>
      )}

      <div className="sd01-table-wrapper">
        <div className="sd01-table-scroll">
          <table className="sd01-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>ID Transporte</th>
                <th>Fecha Programación</th>
                <th>Conductor</th>
                <th>Patente</th>
                <th>Asignado A</th>
                <th style={{ textAlign: 'center' }}>Locales</th>
                <th>Estado</th>
                <th>Creado Por</th>
                <th>Creado En</th>
                <th>Modificado Por</th>
                <th>Modificado En</th>
              </tr>
            </thead>
            <tbody>
              {transportes.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                    No hay transportes registrados
                  </td>
                </tr>
              ) : (
                transportes.map((transporte: any) => (
                  <tr
                    key={transporte.id}
                    onClick={() => handleSeleccionarTransporte(transporte)}
                    className={transporteSeleccionado && transporteSeleccionado.id === transporte.id ? 'sd01-row-selected' : ''}
                  >
                    <td>
                      <input
                        type="radio"
                        className="sd01-radio"
                        checked={transporteSeleccionado && transporteSeleccionado.id === transporte.id}
                        onChange={() => handleSeleccionarTransporte(transporte)}
                        onClick={(e: any) => e.stopPropagation()}
                      />
                    </td>
                    <td className="sd01-id-documento">{transporte.id_documento}</td>
                    <td>{formatearFecha(transporte.fecha_programacion)}</td>
                    <td>{transporte.conductor_nombre}</td>
                    <td>{transporte.patente_principal}</td>
                    <td>{transporte.administrativo || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="sd01-locales-badge">{transporte.cantidad_locales || 0}</span>
                    </td>
                    <td>{getEstadoBadge(transporte.estado)}</td>
                    <td>{transporte.creado_por_nombre || '-'}</td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>{formatearFechaHora(transporte.creado_en)}</td>
                    <td>{transporte.modificado_por || '-'}</td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>{transporte.modificado_en ? formatearFechaHora(transporte.modificado_en) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sd01-footer">
        Total de transportes: <strong style={{ color: '#1e293b' }}>{transportes.length}</strong>
      </div>

      {mostrarCrearTransporte && (
        <SD01CrearTransporte
          onClose={() => setMostrarCrearTransporte(false)}
          onTransporteCreado={handleTransporteCreado}
        />
      )}

      {mostrarEditarTransporte && (
        <SD01CrearTransporte
          onClose={() => setMostrarEditarTransporte(false)}
          onTransporteCreado={handleTransporteEditado}
          transporteEditar={transporteSeleccionado}
        />
      )}

      {mostrarVerTransporte && (
        <SD01VerTransporte
          onClose={() => setMostrarVerTransporte(false)}
          transporte={transporteSeleccionado}
        />
      )}

      {mostrarAsignarModal && (
        <div className="sd01-modal-overlay" onClick={() => setMostrarAsignarModal(false)}>
          <div className="sd01-modal" style={{ maxWidth: '480px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="sd01-modal-header">
              <h2>Asignar Transporte</h2>
              <button className="sd01-modal-close" onClick={() => setMostrarAsignarModal(false)}>×</button>
            </div>
            <div className="sd01-modal-body">
              <div className="sd01-form-group" style={{ marginBottom: '16px' }}>
                <label className="sd01-form-label">
                  Transporte: <strong>{transporteSeleccionado?.id_documento}</strong>
                </label>
              </div>
              <div className="sd01-form-group">
                <label className="sd01-form-label">Asignar a (Administrativo o Líder)</label>
                <select
                  className="sd01-form-select"
                  value={usuarioAsignar}
                  onChange={(e: any) => setUsuarioAsignar(e.target.value)}
                >
                  <option value="">Seleccionar usuario...</option>
                  {usuariosAdmin.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.rol})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="sd01-modal-footer">
              <button className="sd01-btn-cancel" onClick={() => setMostrarAsignarModal(false)}>Cancelar</button>
              <button className="sd01-btn-save" onClick={handleConfirmarAsignacion}>Asignar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD01View;
