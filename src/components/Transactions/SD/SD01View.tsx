// src/components/Transactions/SD/SD01View.tsx

import React, { useState, useEffect } from 'react';
import { auth } from '../../../lib/auth';
import SD01CrearTransporte from './SD01CrearTransporte';

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
          
          if (transporte.conductor_id) {
            const respConductor = await fetch(API_URL + '/sd01_conductores?select=nombre,apellido&id=eq.' + transporte.conductor_id, { headers: HEADERS });
            const conductorData = await respConductor.json();
            if (conductorData && conductorData.length > 0) {
              conductorNombre = conductorData[0].nombre + ' ' + conductorData[0].apellido;
            }
          }
          
          if (transporte.patente_principal_id) {
            const respPatente = await fetch(API_URL + '/sd01_patentes?select=numero_patente&id=eq.' + transporte.patente_principal_id, { headers: HEADERS });
            const patenteData = await respPatente.json();
            if (patenteData && patenteData.length > 0) {
              patenteNumero = patenteData[0].numero_patente;
            }
          }
          
          return { 
            ...transporte, 
            cantidad_locales: locales ? locales.length : 0,
            conductor_nombre: conductorNombre,
            patente_principal: patenteNumero
          };
        }));
        setTransportes(transportesConDetalles);
      } else {
        setTransportes([]);
      }
      setCargando(false);
    } catch (e) {
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
    mostrarMensaje('info', 'Modal de edición en desarrollo');
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
    if (!window.confirm('¿Está seguro de cancelar el transporte ' + transporteSeleccionado.id_documento + '?')) return;
    try {
      await fetch(API_URL + '/sd01_documentos?id=eq.' + transporteSeleccionado.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'Cancelado',
          cancelado_en: new Date().toISOString(),
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
    mostrarMensaje('info', 'Modal de visualización en desarrollo');
  };

  const handleIniciarTransporte = async () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Debe seleccionar un transporte de la tabla');
      return;
    }
    if (transporteSeleccionado.estado !== 'Pendiente') {
      mostrarMensaje('error', 'Solo se pueden iniciar transportes en estado Pendiente');
      return;
    }
    try {
      await fetch(API_URL + '/sd01_documentos?id=eq.' + transporteSeleccionado.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'En Proceso',
          iniciado_en: new Date().toISOString(),
          modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
          modificado_en: new Date().toISOString()
        })
      });
      mostrarMensaje('success', 'Transporte iniciado exitosamente');
      setTransporteSeleccionado(null);
      cargarTransportes();
    } catch (e) {
      mostrarMensaje('error', 'Error al iniciar transporte');
    }
  };

  const handleFinalizarTransporte = async () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Debe seleccionar un transporte de la tabla');
      return;
    }
    if (transporteSeleccionado.estado !== 'En Proceso') {
      mostrarMensaje('error', 'Solo se pueden finalizar transportes en estado En Proceso');
      return;
    }
    if (!window.confirm('¿Está seguro de finalizar el transporte ' + transporteSeleccionado.id_documento + '?')) return;
    try {
      await fetch(API_URL + '/sd01_documentos?id=eq.' + transporteSeleccionado.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'Finalizado',
          finalizado_en: new Date().toISOString(),
          modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
          modificado_en: new Date().toISOString()
        })
      });
      mostrarMensaje('success', 'Transporte finalizado exitosamente');
      setTransporteSeleccionado(null);
      cargarTransportes();
    } catch (e) {
      mostrarMensaje('error', 'Error al finalizar transporte');
    }
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
      'Cancelado': { color: '#64748b', bg: '#f1f5f9' },
      'Borrador': { color: '#64748b', bg: '#f1f5f9' }
    };
    const badge = badges[estado] || badges['Borrador'];
    return (
      <span style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        color: badge.color,
        background: badge.bg
      }}>
        {estado}
      </span>
    );
  };

  const getMensajeStyle = () => {
    const styles: any = {
      success: { bg: '#dcfce7', color: '#15803d', border: '1px solid #86efac' },
      error: { bg: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' },
      warning: { bg: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
      info: { bg: '#eff6ff', color: '#1e40af', border: '1px solid #93c5fd' }
    };
    return styles[mensaje.tipo] || styles.info;
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
    <div style={{ padding: '24px', background: '#f5f7fb', minHeight: '100vh' }}>
      {mensaje.visible && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 2000,
          padding: '14px 24px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 500,
          ...getMensajeStyle(),
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          animation: 'slideInRight 0.3s ease',
          maxWidth: '420px'
        }}>
          {mensaje.texto}
        </div>
      )}

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid #eef0f5'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleCrearTransporte}
            style={{
              padding: '8px 16px',
              background: '#1d4ed8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e: any) => e.target.style.background = '#1e40af'}
            onMouseLeave={(e: any) => e.target.style.background = '#1d4ed8'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            + Crear Transporte
          </button>

          <button
            onClick={handleCargarTransporte}
            style={{
              padding: '8px 16px',
              background: '#15803d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e: any) => e.target.style.background = '#166534'}
            onMouseLeave={(e: any) => e.target.style.background = '#15803d'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 10V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V10M4.66667 6.66667L8 10M8 10L11.3333 6.66667M8 10V2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            📁 Cargar Transporte
          </button>

          <div style={{ width: '1px', height: '28px', background: '#e2e8f0', margin: '0 4px' }}></div>

          <button
            onClick={handleEditarTransporte}
            style={{
              padding: '8px 16px',
              background: transporteSeleccionado ? '#f59e0b' : '#e2e8f0',
              color: transporteSeleccionado ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: transporteSeleccionado ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M11.3333 2.00004C11.5084 1.82494 11.7163 1.68605 11.9451 1.59129C12.1738 1.49653 12.4187 1.44775 12.6663 1.44775C12.9138 1.44775 13.1587 1.49653 13.3875 1.59129C13.6163 1.68605 13.8242 1.82494 13.9993 2.00004C14.1744 2.17514 14.3133 2.38305 14.408 2.61187C14.5028 2.8407 14.5516 3.08557 14.5516 3.33337C14.5516 3.58118 14.5028 3.82605 14.408 4.05487C14.3133 4.2837 14.1744 4.49161 13.9993 4.66671L5.33333 13.3327L2 13.9994L2.66667 10.666L11.3333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Editar Transporte
          </button>

          <button
            onClick={handleCancelarTransporte}
            style={{
              padding: '8px 16px',
              background: transporteSeleccionado ? '#dc2626' : '#e2e8f0',
              color: transporteSeleccionado ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: transporteSeleccionado ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4H14M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Cancelar Transporte
          </button>

          <div style={{ width: '1px', height: '28px', background: '#e2e8f0', margin: '0 4px' }}></div>

          <button
            onClick={handleVerTransporte}
            style={{
              padding: '8px 16px',
              background: transporteSeleccionado ? '#6366f1' : '#e2e8f0',
              color: transporteSeleccionado ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: transporteSeleccionado ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1.33325 8.00004C1.33325 8.00004 3.99992 3.33337 7.99992 3.33337C11.9999 3.33337 14.6666 8.00004 14.6666 8.00004C14.6666 8.00004 11.9999 12.6667 7.99992 12.6667C3.99992 12.6667 1.33325 8.00004 1.33325 8.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ver Transporte
          </button>

          <button
            onClick={handleIniciarTransporte}
            style={{
              padding: '8px 16px',
              background: transporteSeleccionado ? '#0891b2' : '#e2e8f0',
              color: transporteSeleccionado ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: transporteSeleccionado ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 2L13 8L3 14V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Iniciar Transporte
          </button>

          <button
            onClick={handleFinalizarTransporte}
            style={{
              padding: '8px 16px',
              background: transporteSeleccionado ? '#059669' : '#e2e8f0',
              color: transporteSeleccionado ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: transporteSeleccionado ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3337 4L6.00033 11.3333L2.66699 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Finalizar Transporte
          </button>

          <div style={{ width: '1px', height: '28px', background: '#e2e8f0', margin: '0 4px' }}></div>

          <button
            onClick={handleAsignarTransporte}
            style={{
              padding: '8px 16px',
              background: transporteSeleccionado ? '#7c3aed' : '#e2e8f0',
              color: transporteSeleccionado ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: transporteSeleccionado ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10.6667 14V12.6667C10.6667 11.9594 10.3857 11.2811 9.88562 10.781C9.38552 10.281 8.70724 10 8 10H4C3.29276 10 2.61448 10.281 2.11438 10.781C1.61428 11.2811 1.33333 11.9594 1.33333 12.6667V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 7.33333C7.47276 7.33333 8.66667 6.13943 8.66667 4.66667C8.66667 3.19391 7.47276 2 6 2C4.52724 2 3.33333 3.19391 3.33333 4.66667C3.33333 6.13943 4.52724 7.33333 6 7.33333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.6667 14V12.6667C14.6667 11.9594 14.3857 11.2811 13.8856 10.781C13.3855 10.281 12.7072 10 12 10H11.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.6667 2.08667C11.2403 2.23354 11.7487 2.56713 12.1118 3.03487C12.4748 3.50261 12.6719 4.07789 12.6719 4.67C12.6719 5.26211 12.4748 5.83739 12.1118 6.30513C11.7487 6.77287 11.2403 7.10646 10.6667 7.25333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Asignar Transporte
          </button>

          <button
            onClick={handleReabrirTransporte}
            style={{
              padding: '8px 16px',
              background: transporteSeleccionado ? '#d97706' : '#e2e8f0',
              color: transporteSeleccionado ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: transporteSeleccionado ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1.33333 8.00004C1.33333 8.00004 3.99999 3.33337 7.99999 3.33337C11.3333 3.33337 13.6667 6.66671 14.6667 8.00004C13.6667 9.33337 11.3333 12.6667 7.99999 12.6667C3.99999 12.6667 1.33333 8.00004 1.33333 8.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.66667 5.33337V10.6667L7.33333 8.00004L10 10.6667V5.33337" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Reabrir Transporte
          </button>
        </div>

        {transporteSeleccionado && (
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            background: '#f8fafd',
            borderRadius: '8px',
            border: '1px solid #dbeafe',
            fontSize: '13px',
            color: '#1e40af',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8.00004C14.6667 4.31814 11.6819 1.33337 8 1.33337C4.3181 1.33337 1.33333 4.31814 1.33333 8.00004C1.33333 11.6819 4.3181 14.6667 8 14.6667Z" stroke="#1d4ed8" strokeWidth="1.5"/>
              <path d="M8 5.33337V8.66671" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="11" r="0.666667" fill="#1d4ed8"/>
            </svg>
            <span>Transporte seleccionado: <strong>{transporteSeleccionado.id_documento}</strong> - {transporteSeleccionado.estado}</span>
            <button
              onClick={() => setTransporteSeleccionado(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px'
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="ed03-tabla-container" style={{
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid #eef0f5',
        overflow: 'hidden'
      }}>
        <table className="ed03-tabla" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafd', borderBottom: '1px solid #eef0f5' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', width: '40px' }}></th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>ID Transporte</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Fecha Programación</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Conductor</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Patente</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Asignado A</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Locales</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Estado</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Creado Por</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Creado En</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Modificado Por</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Modificado En</th>
            </tr>
          </thead>
          <tbody>
            {transportes.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                  No hay transportes registrados. Haga clic en "+ Crear Transporte" para comenzar.
                </td>
              </tr>
            ) : (
              transportes.map((transporte: any) => (
                <tr
                  key={transporte.id}
                  onClick={() => handleSeleccionarTransporte(transporte)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: transporteSeleccionado && transporteSeleccionado.id === transporte.id ? '#eff6ff' : 'white',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e: any) => {
                    if (!(transporteSeleccionado && transporteSeleccionado.id === transporte.id)) {
                      e.currentTarget.style.background = '#f8fafd';
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    if (!(transporteSeleccionado && transporteSeleccionado.id === transporte.id)) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <input
                      type="radio"
                      checked={transporteSeleccionado && transporteSeleccionado.id === transporte.id}
                      onChange={() => handleSeleccionarTransporte(transporte)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#1d4ed8' }}
                      onClick={(e: any) => e.stopPropagation()}
                    />
                  </td>
                  <td className="ed03-ticket-id" style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    {transporte.id_documento}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                    {formatearFecha(transporte.fecha_programacion)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                    {transporte.conductor_nombre || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                    {transporte.patente_principal || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                    {transporte.administrativo || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#475569' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      background: '#f1f5f9',
                      borderRadius: '12px',
                      fontWeight: 600
                    }}>
                      {transporte.cantidad_locales || 0}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {getEstadoBadge(transporte.estado)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                    {transporte.creado_por_nombre || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>
                    {formatearFechaHora(transporte.creado_en)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                    {transporte.modificado_por || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>
                    {transporte.modificado_en ? formatearFechaHora(transporte.modificado_en) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: '16px',
        padding: '10px 16px',
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #eef0f5',
        fontSize: '12px',
        color: '#64748b',
        textAlign: 'right'
      }}>
        Total de transportes: <strong style={{ color: '#1e293b' }}>{transportes.length}</strong>
      </div>

      {mostrarCrearTransporte && (
        <SD01CrearTransporte
          onClose={() => setMostrarCrearTransporte(false)}
          onTransporteCreado={handleTransporteCreado}
        />
      )}

      {mostrarAsignarModal && (
        <div className="ed01-modal-overlay" onClick={() => setMostrarAsignarModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '480px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="ed01-modal-header">
              <h2>Asignar Transporte</h2>
              <button className="ed01-modal-close" onClick={() => setMostrarAsignarModal(false)}>×</button>
            </div>
            <div className="ed01-modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Transporte: <strong>{transporteSeleccionado?.id_documento}</strong>
                </label>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Asignar a (Administrativo o Líder)
                </label>
                <select
                  value={usuarioAsignar}
                  onChange={(e: any) => setUsuarioAsignar(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#1e293b',
                    background: 'white'
                  }}
                >
                  <option value="">Seleccionar usuario...</option>
                  {usuariosAdmin.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.rol})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => setMostrarAsignarModal(false)}>Cancelar</button>
              <button className="ed01-btn-save" onClick={handleConfirmarAsignacion}>Asignar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default SD01View;
