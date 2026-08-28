// src/components/Transactions/SD/SD01View.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '../../../lib/auth';
import SD01CrearTransporte from './SD01CrearTransporte';
import SD01VerTransporte from './SD01VerTransporte';
import SD01CargaExcel from './SD01CargaExcel';
import SD01IniciarTransporte from './SD01IniciarTransporte';
import { cache } from '../../../lib/cache';
import './SD01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const PAGE_SIZE = 20;

const SD01View: React.FC = () => {
  const [transportes, setTransportes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [transporteSeleccionado, setTransporteSeleccionado] = useState<any>(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });
  const [mostrarCrearTransporte, setMostrarCrearTransporte] = useState(false);
  const [mostrarEditarTransporte, setMostrarEditarTransporte] = useState(false);
  const [mostrarVerTransporte, setMostrarVerTransporte] = useState(false);
  const [mostrarCargaExcel, setMostrarCargaExcel] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState<any>(null);
  const [usuariosAdmin, setUsuariosAdmin] = useState<any[]>([]);
  const [mostrarAsignarModal, setMostrarAsignarModal] = useState(false);
  const [usuarioAsignar, setUsuarioAsignar] = useState('');

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);

  const usuario = auth.getUsuario();

  const cargarTransportes = useCallback(async (paginaActual: number) => {
    setCargando(true);
    try {
      const offset = (paginaActual - 1) * PAGE_SIZE;

      const query = `${API_URL}/sd01_documentos?select=*,conductor:conductor_id(*),patente_principal:patente_principal_id(*),patente_adicional:patente_adicional_id(*),creador:creado_por(*),locales:sd01_documento_locales(*)&order=creado_en.desc&limit=${PAGE_SIZE}&offset=${offset}`;

      const cacheKey = `sd01_transportes_p${paginaActual}`;
      const cacheTTL = 10000;
      const cached = cache.get<any>(cacheKey);
      if (cached) {
        setTransportes(cached);
      } else {
        const resp = await fetch(query, { headers: HEADERS });
        if (!resp.ok) throw new Error('Error al cargar transportes');
        const data = await resp.json();
        cache.set(cacheKey, data, cacheTTL);
        setTransportes(data);
      }

      const countCacheKey = 'sd01_transportes_total';
      const cachedTotal = cache.get<number>(countCacheKey);
      let totalCount: number = cachedTotal || 0;
      if (totalCount === 0) {
        const countResp = await fetch(`${API_URL}/sd01_documentos?select=id`, { headers: { ...HEADERS, 'Prefer': 'count=exact' } });
        const countData = await countResp.json();
        totalCount = Array.isArray(countData) ? countData.length : 0;
        cache.set(countCacheKey, totalCount, cacheTTL);
      }

      setTotal(totalCount);
      setTotalPaginas(Math.ceil(totalCount / PAGE_SIZE));
      setCargando(false);
    } catch (e) {
      console.error('Error cargando transportes:', e);
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTransportes(1);
    cargarUsuariosAdmin();
    const intervalo = setInterval(() => cargarTransportes(pagina), 15000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    cargarTransportes(pagina);
  }, [pagina]);

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

  // Selección única
  const seleccionarTransporte = (transporte: any) => {
    setTransporteSeleccionado(transporte);
  };

  // Eliminar seleccionados (ya no aplica, eliminado)
  const handleEliminarSeleccionados = async () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Seleccione un transporte para eliminar');
      return;
    }

    const t = transporteSeleccionado;
    if (t.estado !== 'Pendiente') {
      mostrarMensaje('error', 'Solo se pueden eliminar transportes en estado Pendiente');
      return;
    }

    if (!window.confirm('¿Eliminar el transporte ' + t.id_documento + '?')) return;

    try {
      await fetch(API_URL + '/sd01_documento_locales?documento_id=eq.' + t.id_documento, { method: 'DELETE', headers: HEADERS });
      const resp = await fetch(API_URL + '/sd01_documentos?id=eq.' + t.id, { method: 'DELETE', headers: HEADERS });
      if (resp.ok) {
        mostrarMensaje('success', 'Transporte eliminado correctamente');
        setTransporteSeleccionado(null);
        cache.invalidatePrefix('sd01_transportes_');
        cargarTransportes(pagina);
      } else {
        mostrarMensaje('error', 'Error al eliminar transporte');
      }
    } catch (e) {
      mostrarMensaje('error', 'Error de red al eliminar');
    }
  };

  const handleCancelarTransporte = async () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Debe seleccionar un transporte');
      return;
    }
    if (!['Pendiente', 'En Proceso'].includes(transporteSeleccionado.estado)) {
      mostrarMensaje('error', 'Solo se pueden cancelar transportes en Pendiente o En Proceso');
      return;
    }

    const motivo = window.prompt(
      '¿Está seguro de cancelar el transporte ' + transporteSeleccionado.id_documento + '?\n\nIngrese el motivo:'
    );
    if (motivo === null) return;
    if (!motivo.trim()) {
      mostrarMensaje('warning', 'Debe ingresar un motivo');
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
      cache.invalidatePrefix('sd01_transportes_');
      cargarTransportes(pagina);
    } catch (e) {
      mostrarMensaje('error', 'Error al cancelar transporte');
    }
  };

  const handleIniciarTransporte = async () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Debe seleccionar un transporte');
      return;
    }
    if (!['Pendiente', 'En Proceso'].includes(transporteSeleccionado.estado)) {
      mostrarMensaje('error', 'Solo se pueden iniciar o continuar transportes en Pendiente o En Proceso');
      return;
    }

    try {
      let actualizado = { ...transporteSeleccionado };
      if (transporteSeleccionado.estado === 'Pendiente') {
        const now = new Date().toISOString();
        await fetch(API_URL + '/sd01_documentos?id=eq.' + transporteSeleccionado.id, {
          method: 'PATCH',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            estado: 'En Proceso',
            fecha_inicio: now,
            modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
            modificado_en: now
          })
        });
        actualizado = { ...transporteSeleccionado, estado: 'En Proceso', fecha_inicio: now };
      }
      setTransporteSeleccionado(actualizado);
      setMostrarDetalle(actualizado);
      cache.invalidatePrefix('sd01_transportes_');
      cargarTransportes(pagina);
    } catch (e) {
      mostrarMensaje('error', 'Error al iniciar transporte');
    }
  };

  const handleReabrirTransporte = async () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Debe seleccionar un transporte');
      return;
    }
    if (transporteSeleccionado.estado !== 'Finalizado') {
      mostrarMensaje('error', 'Solo se pueden reabrir transportes en estado Finalizado');
      return;
    }
    if (!window.confirm('¿Reabrir el transporte ' + transporteSeleccionado.id_documento + '? Pasará a Pendiente.')) return;
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
      cache.invalidatePrefix('sd01_transportes_');
      cargarTransportes(pagina);
    } catch (e) {
      mostrarMensaje('error', 'Error al reabrir transporte');
    }
  };

  // Editar cualquier estado excepto Cancelado y Finalizado
  const handleEditarTransporte = () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Debe seleccionar un transporte');
      return;
    }
    if (transporteSeleccionado.estado === 'Cancelado' || transporteSeleccionado.estado === 'Finalizado') {
      mostrarMensaje('error', 'No se puede editar un transporte cancelado o finalizado');
      return;
    }
    setMostrarEditarTransporte(true);
  };

  const handleCrearTransporte = () => setMostrarCrearTransporte(true);
  const handleTransporteCreado = () => {
    setMostrarCrearTransporte(false);
    cache.invalidatePrefix('sd01_transportes_');
    cargarTransportes(1);
    mostrarMensaje('success', 'Transporte creado exitosamente');
  };
  const handleTransporteEditado = () => {
    setMostrarEditarTransporte(false);
    setTransporteSeleccionado(null);
    cache.invalidatePrefix('sd01_transportes_');
    cargarTransportes(pagina);
    mostrarMensaje('success', 'Transporte editado exitosamente');
  };
  const handleCargarTransporte = () => setMostrarCargaExcel(true);
  const handleCargaExcelCompletada = () => {
    setMostrarCargaExcel(false);
    cache.invalidatePrefix('sd01_transportes_');
    cargarTransportes(1);
    mostrarMensaje('success', 'Transportes creados exitosamente');
  };
  const handleVerTransporte = () => {
    if (!transporteSeleccionado) {
      mostrarMensaje('warning', 'Debe seleccionar un transporte');
      return;
    }
    setMostrarVerTransporte(true);
  };

  // Funciones de paginación
  const cambiarPagina = (nuevaPagina: number) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    setPagina(nuevaPagina);
    setTransporteSeleccionado(null);
  };
  const cambiarLimite = (nuevoLimite: number) => {
    setPagina(1);
    setTransporteSeleccionado(null);
  };

  // Formatear datos
  const formatearFecha = (fecha: string) => {
    if (!fecha) return '-';
    const fechaStr = fecha.includes('T') ? fecha : fecha + 'T12:00:00';
    return new Date(fechaStr).toLocaleDateString('es-CL');
  };
  const formatearFechaHora = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL') + ' ' + new Date(fecha).toLocaleTimeString('es-CL');
  };

  const getConductorNombre = (t: any) => t.conductor ? `${t.conductor.nombre} ${t.conductor.apellido}` : '-';
  const getPatenteNumero = (t: any) => t.patente_principal ? t.patente_principal.numero_patente : '-';
  const getCreadoPorNombre = (t: any) => t.creador ? `${t.creador.nombre} ${t.creador.apellido}` : '-';

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

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#64748b', fontSize: '16px' }}>
        Cargando transportes...
      </div>
    );
  }

  // Si mostramos la vista detalle
  if (mostrarDetalle) {
    return (
      <SD01IniciarTransporte
        transporte={mostrarDetalle}
        onClose={() => {
          setMostrarDetalle(null);
          setTransporteSeleccionado(null);
          cargarTransportes(pagina);
        }}
        onActualizar={() => {
          cache.invalidatePrefix('sd01_transportes_');
          cargarTransportes(pagina);
        }}
        usuario={usuario}
      />
    );
  }

  return (
    <div className="sd01-container">
      {mensaje.visible && (
        <div className={`sd01-toast sd01-toast-${mensaje.tipo}`}>
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

        <button className="sd01-btn" onClick={() => cargarTransportes(pagina)} title="Actualizar tabla">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12.6667 2L12.6667 5.33333L9.33333 5.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Actualizar
        </button>

        <div className="sd01-separator"></div>

        <button className="sd01-btn" onClick={handleEditarTransporte} disabled={!transporteSeleccionado}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M11.3333 2.00004C11.5084 1.82494 11.7163 1.68605 11.9451 1.59129C12.1738 1.49653 12.4187 1.44775 12.6663 1.44775C12.9138 1.44775 13.1587 1.49653 13.3875 1.59129C13.6163 1.68605 13.8242 1.82494 13.9993 2.00004C14.1744 2.17514 14.3133 2.38305 14.408 2.61187C14.5028 2.8407 14.5516 3.08557 14.5516 3.33337C14.5516 3.58118 14.5028 3.82605 14.408 4.05487C14.3133 4.2837 14.1744 4.49161 13.9993 4.66671L5.33333 13.3327L2 13.9994L2.66667 10.666L11.3333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Editar
        </button>

        <button className="sd01-btn sd01-btn-danger" onClick={handleCancelarTransporte} disabled={!transporteSeleccionado}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4H14M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Cancelar
        </button>

        <button className="sd01-btn sd01-btn-danger" onClick={handleEliminarSeleccionados} disabled={!transporteSeleccionado}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4H14M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Eliminar ({transporteSeleccionado ? 1 : 0})
        </button>

        <div className="sd01-separator"></div>

        <button className="sd01-btn" onClick={handleVerTransporte} disabled={!transporteSeleccionado}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1.33325 8.00004C1.33325 8.00004 3.99992 3.33337 7.99992 3.33337C11.9999 3.33337 14.6666 8.00004 14.6666 8.00004C14.6666 8.00004 11.9999 12.6667 7.99992 12.6667C3.99992 12.6667 1.33325 8.00004 1.33325 8.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Ver
        </button>

        <button className="sd01-btn sd01-btn-success" onClick={handleIniciarTransporte} disabled={!transporteSeleccionado || !['Pendiente', 'En Proceso'].includes(transporteSeleccionado.estado)} style={{ background: transporteSeleccionado?.estado === 'Pendiente' ? '#16a34a' : transporteSeleccionado?.estado === 'En Proceso' ? '#3b82f6' : 'var(--bg-readonly)', color: ['Pendiente', 'En Proceso'].includes(transporteSeleccionado?.estado) ? 'white' : 'var(--text-muted)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 2L12 8L4 14V2Z" fill="currentColor"/>
          </svg>
          {transporteSeleccionado?.estado === 'En Proceso' ? 'Continuar' : 'Iniciar'}
        </button>

        <div className="sd01-separator"></div>

        <button className="sd01-btn sd01-btn-warning" onClick={handleReabrirTransporte} disabled={!transporteSeleccionado}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1.33333 8.00004C1.33333 8.00004 3.99999 3.33337 7.99999 3.33337C11.3333 3.33337 13.6667 6.66671 14.6667 8.00004C13.6667 9.33337 11.3333 12.6667 7.99999 12.6667C3.99999 12.6667 1.33333 8.00004 1.33333 8.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Reabrir
        </button>

        {/* Paginación en toolbar */}
        <div className="sd01-separator"></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mostrar</span>
          <select value={20} onChange={(e) => cambiarLimite(Number(e.target.value))} style={{ padding: '4px 8px', border: '1px solid var(--border-input)', borderRadius: '6px', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px' }}>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>|</span>
          <button className="sd01-btn" onClick={() => cambiarPagina(pagina - 1)} disabled={pagina <= 1} style={{ padding: '4px 8px' }}>‹</button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{pagina} / {totalPaginas}</span>
          <button className="sd01-btn" onClick={() => cambiarPagina(pagina + 1)} disabled={pagina >= totalPaginas} style={{ padding: '4px 8px' }}>›</button>
        </div>
      </div>

      <div className="sd01-table-wrapper" style={{ minHeight: '500px' }}>
        <div className="sd01-table-scroll">
          <table className="sd01-table" style={{ minWidth: '1500px' }}>
            <thead>
              <tr>
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
                  <td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                    No hay transportes registrados
                  </td>
                </tr>
              ) : (
                transportes.map((transporte: any) => {
                  const seleccionado = transporteSeleccionado?.id === transporte.id;
                  return (
                    <tr
                      key={transporte.id}
                      className={seleccionado ? 'sd01-row-selected' : ''}
                      style={{ background: seleccionado ? 'var(--table-row-selected)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => seleccionarTransporte(transporte)}
                    >
                      <td className="sd01-id-documento">{transporte.id_documento}</td>
                      <td>{formatearFecha(transporte.fecha_programacion)}</td>
                      <td>{getConductorNombre(transporte)}</td>
                      <td>{getPatenteNumero(transporte)}</td>
                      <td>{transporte.administrativo || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="sd01-locales-badge">{transporte.locales?.length || 0}</span>
                      </td>
                      <td>{getEstadoBadge(transporte.estado)}</td>
                      <td>{getCreadoPorNombre(transporte)}</td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{formatearFechaHora(transporte.creado_en)}</td>
                      <td>{transporte.modificado_por || '-'}</td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{transporte.modificado_en ? formatearFechaHora(transporte.modificado_en) : '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sd01-footer">
        Total de transportes: <strong style={{ color: '#1e293b' }}>{total}</strong>
      </div>

      {mostrarCrearTransporte && (
        <SD01CrearTransporte onClose={() => setMostrarCrearTransporte(false)} onTransporteCreado={handleTransporteCreado} />
      )}
      {mostrarEditarTransporte && (
        <SD01CrearTransporte onClose={() => setMostrarEditarTransporte(false)} onTransporteCreado={handleTransporteEditado} transporteEditar={transporteSeleccionado} />
      )}
      {mostrarVerTransporte && (
        <SD01VerTransporte onClose={() => setMostrarVerTransporte(false)} transporte={transporteSeleccionado} />
      )}
      {mostrarCargaExcel && (
        <SD01CargaExcel onClose={() => setMostrarCargaExcel(false)} onTransportesCreados={handleCargaExcelCompletada} />
      )}
    </div>
  );
};

export default SD01View;
