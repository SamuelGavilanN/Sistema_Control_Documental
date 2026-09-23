// src/components/Transactions/SD/SD01View.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { auth } from '../../../lib/auth';
import SD01CrearTransporte from './SD01CrearTransporte';
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

type OrdenColumna = 'id_documento' | 'fecha_programacion' | 'conductor' | 'patente' | 'locales' | 'estado' | 'creado_por' | 'creado_en' | 'modificado_por' | 'modificado_en';
type OrdenDireccion = 'asc' | 'desc';

const SD01View: React.FC = () => {
  const [transportes, setTransportes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [transporteSeleccionado, setTransporteSeleccionado] = useState<any>(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });
  const [mostrarCrearTransporte, setMostrarCrearTransporte] = useState(false);
  const [mostrarEditarTransporte, setMostrarEditarTransporte] = useState(false);
  const [mostrarCargaExcel, setMostrarCargaExcel] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState<any>(null);

  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);

  // Nuevos estados
  const [mostrarFinalizados, setMostrarFinalizados] = useState(false);
  const [ordenColumna, setOrdenColumna] = useState<OrdenColumna>('creado_en');
  const [ordenDireccion, setOrdenDireccion] = useState<OrdenDireccion>('desc');
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null);

  const usuario = auth.getUsuario();

  const cargarTransportes = useCallback(async (paginaActual: number, incluirFinalizados: boolean) => {
    setCargando(true);
    try {
      const offset = (paginaActual - 1) * PAGE_SIZE;
      // Filtro de estado: si no incluye finalizados, excluye Finalizado y Cancelado
      let filtroEstado = '';
      if (!incluirFinalizados) {
        filtroEstado = '&estado=not.in.(Finalizado,Cancelado)';
      }

      const query = `${API_URL}/sd01_documentos?select=*,conductor:conductor_id(*),patente_principal:patente_principal_id(*),patente_adicional:patente_adicional_id(*),creador:creado_por(*),locales:sd01_documento_locales(*)&order=creado_en.desc&limit=${PAGE_SIZE}&offset=${offset}${filtroEstado}`;

      const resp = await fetch(query, { headers: HEADERS });
      if (!resp.ok) throw new Error('Error al cargar transportes');
      const data = await resp.json();
      setTransportes(data);

      // Conteo total
      const countQuery = `${API_URL}/sd01_documentos?select=id${filtroEstado}`;
      const countResp = await fetch(countQuery, { headers: { ...HEADERS, 'Prefer': 'count=exact' } });
      const countData = await countResp.json();
      const totalCount = Array.isArray(countData) ? countData.length : 0;
      setTotal(totalCount);
      setTotalPaginas(Math.ceil(totalCount / PAGE_SIZE));
    } catch (e) {
      console.error('Error cargando transportes:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTransportes(1, mostrarFinalizados);
    setPagina(1);
  }, [mostrarFinalizados]);

  useEffect(() => {
    cargarTransportes(pagina, mostrarFinalizados);
  }, [pagina]);

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  const seleccionarTransporte = (transporte: any) => {
    setTransporteSeleccionado(transporte);
  };

  const toggleFilaExpandida = (id: string) => {
    setFilaExpandida(filaExpandida === id ? null : id);
  };

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
        cargarTransportes(pagina, mostrarFinalizados);
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
    const motivo = window.prompt('¿Está seguro de cancelar el transporte ' + transporteSeleccionado.id_documento + '?\n\nIngrese el motivo:');
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
      cargarTransportes(pagina, mostrarFinalizados);
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
      cargarTransportes(pagina, mostrarFinalizados);
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
      cargarTransportes(pagina, mostrarFinalizados);
    } catch (e) {
      mostrarMensaje('error', 'Error al reabrir transporte');
    }
  };

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
    cargarTransportes(1, mostrarFinalizados);
    mostrarMensaje('success', 'Transporte creado exitosamente');
  };
  const handleTransporteEditado = () => {
    setMostrarEditarTransporte(false);
    setTransporteSeleccionado(null);
    cache.invalidatePrefix('sd01_transportes_');
    cargarTransportes(pagina, mostrarFinalizados);
    mostrarMensaje('success', 'Transporte editado exitosamente');
  };
  const handleCargarTransporte = () => setMostrarCargaExcel(true);
  const handleCargaExcelCompletada = () => {
    setMostrarCargaExcel(false);
    cache.invalidatePrefix('sd01_transportes_');
    cargarTransportes(1, mostrarFinalizados);
    mostrarMensaje('success', 'Transportes creados exitosamente');
  };

  const cambiarPagina = (nuevaPagina: number) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    setPagina(nuevaPagina);
    setTransporteSeleccionado(null);
    setFilaExpandida(null);
  };

  // Ordenamiento en cliente
  const cambiarOrden = (columna: OrdenColumna) => {
    if (ordenColumna === columna) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenColumna(columna);
      setOrdenDireccion('asc');
    }
  };

  const transportesOrdenados = useMemo(() => {
    const copia = [...transportes];
    const getValor = (t: any, col: OrdenColumna): any => {
      switch (col) {
        case 'id_documento': return t.id_documento || '';
        case 'fecha_programacion': return t.fecha_programacion || '';
        case 'conductor': return t.conductor ? `${t.conductor.nombre} ${t.conductor.apellido}` : '';
        case 'patente': return t.patente_principal?.numero_patente || '';
        case 'locales': return t.locales?.length || 0;
        case 'estado': return t.estado || '';
        case 'creado_por': return t.creador ? `${t.creador.nombre} ${t.creador.apellido}` : '';
        case 'creado_en': return t.creado_en || '';
        case 'modificado_por': return t.modificado_por || '';
        case 'modificado_en': return t.modificado_en || '';
        default: return '';
      }
    };
    copia.sort((a, b) => {
      const va = getValor(a, ordenColumna);
      const vb = getValor(b, ordenColumna);
      if (typeof va === 'number' && typeof vb === 'number') {
        return ordenDireccion === 'asc' ? va - vb : vb - va;
      }
      return ordenDireccion === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return copia;
  }, [transportes, ordenColumna, ordenDireccion]);

  // --- Helpers de formato ---
  const formatearFecha = (fecha: string) => {
    if (!fecha) return '-';
    const soloFecha = fecha.includes('T') ? fecha.split('T')[0] : fecha;
    const partes = soloFecha.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return soloFecha;
  };

  const formatearFechaHora = (fecha: string) => {
    if (!fecha) return '-';
    try {
      const d = new Date(fecha);
      if (isNaN(d.getTime())) return fecha;
      return `${d.toLocaleDateString('es-CL')} ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    } catch { return fecha; }
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
    const b = badges[estado] || badges['Cancelado'];
    return <span className="sd01-estado-badge" style={{ color: b.color, background: b.bg }}>{estado}</span>;
  };

  if (cargando && transportes.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#64748b', fontSize: '16px' }}>
        Cargando transportes...
      </div>
    );
  }

  if (mostrarDetalle) {
    return (
      <SD01IniciarTransporte
        transporte={mostrarDetalle}
        onClose={() => {
          setMostrarDetalle(null);
          setTransporteSeleccionado(null);
          cargarTransportes(pagina, mostrarFinalizados);
        }}
        onActualizar={() => {
          cache.invalidatePrefix('sd01_transportes_');
          cargarTransportes(pagina, mostrarFinalizados);
        }}
        usuario={usuario}
      />
    );
  }

  // Columnas con sus etiquetas
  const columnas: { key: OrdenColumna; label: string }[] = [
    { key: 'id_documento', label: 'ID Transporte' },
    { key: 'fecha_programacion', label: 'Fecha Programación' },
    { key: 'conductor', label: 'Conductor' },
    { key: 'patente', label: 'Patente' },
    { key: 'locales', label: 'Locales' },
    { key: 'estado', label: 'Estado' },
    { key: 'creado_por', label: 'Creado Por' },
    { key: 'creado_en', label: 'Creado En' },
    { key: 'modificado_por', label: 'Modificado Por' },
    { key: 'modificado_en', label: 'Modificado En' }
  ];

  return (
    <div className="sd01-container">
      {mensaje.visible && (
        <div className={`sd01-toast sd01-toast-${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      <div className="sd01-toolbar" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg-panel)', padding: '10px 16px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
        <button className="sd01-btn sd01-btn-primary" onClick={handleCrearTransporte}>
          + Crear Transporte
        </button>
        <button className="sd01-btn" onClick={handleCargarTransporte}>Cargar Excel</button>
        <button className="sd01-btn" onClick={() => cargarTransportes(pagina, mostrarFinalizados)}>Actualizar</button>

        <div className="sd01-separator"></div>

        <button className="sd01-btn" onClick={handleEditarTransporte} disabled={!transporteSeleccionado}>Editar</button>
        <button className="sd01-btn sd01-btn-danger" onClick={handleCancelarTransporte} disabled={!transporteSeleccionado}>Cancelar</button>
        <button className="sd01-btn sd01-btn-danger" onClick={handleEliminarSeleccionados} disabled={!transporteSeleccionado}>Eliminar</button>

        <div className="sd01-separator"></div>

        <button
          className="sd01-btn sd01-btn-success"
          onClick={handleIniciarTransporte}
          disabled={!transporteSeleccionado || !['Pendiente', 'En Proceso'].includes(transporteSeleccionado.estado)}
        >
          {transporteSeleccionado?.estado === 'En Proceso' ? 'Continuar' : 'Iniciar'}
        </button>
        <button className="sd01-btn sd01-btn-warning" onClick={handleReabrirTransporte} disabled={!transporteSeleccionado}>Reabrir</button>

        <div className="sd01-separator"></div>

        {/* Toggle finalizados */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={mostrarFinalizados}
            onChange={(e) => setMostrarFinalizados(e.target.checked)}
            style={{ accentColor: '#1d4ed8' }}
          />
          Mostrar finalizados
        </label>

        {/* Paginación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>|</span>
          <button className="sd01-btn" onClick={() => cambiarPagina(pagina - 1)} disabled={pagina <= 1} style={{ padding: '4px 8px' }}>‹</button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{pagina} / {totalPaginas}</span>
          <button className="sd01-btn" onClick={() => cambiarPagina(pagina + 1)} disabled={pagina >= totalPaginas} style={{ padding: '4px 8px' }}>›</button>
        </div>
      </div>

      <div className="sd01-table-wrapper" style={{ minHeight: '500px', overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
        <div className="sd01-table-scroll">
          <table className="sd01-table" style={{ minWidth: '1500px' }}>
            <thead>
              <tr>
                {columnas.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => cambiarOrden(col.key)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    {col.label}
                    {ordenColumna === col.key ? (ordenDireccion === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transportesOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={columnas.length} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                    No hay transportes registrados
                  </td>
                </tr>
              ) : (
                transportesOrdenados.map((transporte: any) => {
                  const seleccionado = transporteSeleccionado?.id === transporte.id;
                  const expandido = filaExpandida === transporte.id;
                  return (
                    <React.Fragment key={transporte.id}>
                      <tr
                        className={seleccionado ? 'sd01-row-selected' : ''}
                        style={{ background: seleccionado ? 'var(--table-row-selected)' : 'transparent', cursor: 'pointer' }}
                        onClick={() => {
                          seleccionarTransporte(transporte);
                          toggleFilaExpandida(transporte.id);
                        }}
                      >
                        <td className="sd01-id-documento">{transporte.id_documento}</td>
                        <td>{formatearFecha(transporte.fecha_programacion)}</td>
                        <td>{getConductorNombre(transporte)}</td>
                        <td>{getPatenteNumero(transporte)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="sd01-locales-badge">{transporte.locales?.length || 0}</span>
                        </td>
                        <td>{getEstadoBadge(transporte.estado)}</td>
                        <td>{getCreadoPorNombre(transporte)}</td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>{formatearFechaHora(transporte.creado_en)}</td>
                        <td>{transporte.modificado_por || '-'}</td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>{transporte.modificado_en ? formatearFechaHora(transporte.modificado_en) : '-'}</td>
                      </tr>
                      {expandido && (
                        <tr>
                          <td colSpan={columnas.length} style={{ padding: 0, background: 'var(--bg-section)' }}>
                            <div style={{ padding: '16px 24px' }}>
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)' }}>
                                Locales de Entrega ({transporte.locales?.length || 0})
                              </h4>
                              {(!transporte.locales || transporte.locales.length === 0) ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Sin locales asignados</p>
                              ) : (
                                <table className="sd01-table" style={{ minWidth: 'auto', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                                  <thead>
                                    <tr>
                                      <th>Código</th>
                                      <th>Nombre Local</th>
                                      <th>Fecha Entrega</th>
                                      <th>Hora Entrega</th>
                                      <th style={{ textAlign: 'right' }}>Cantidad Solicitada</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {transporte.locales.map((l: any) => (
                                      <tr key={l.id}>
                                        <td><strong>{l.codigo_local}</strong></td>
                                        <td>{l.nombre_local || '-'}</td>
                                        <td>{formatearFecha(l.fecha_entrega)}</td>
                                        <td>{l.hora_entrega || '-'}</td>
                                        <td style={{ textAlign: 'right' }}>{l.cantidad_solicitada || 0}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
      {mostrarCargaExcel && (
        <SD01CargaExcel onClose={() => setMostrarCargaExcel(false)} onTransportesCreados={handleCargaExcelCompletada} />
      )}
    </div>
  );
};

export default SD01View;
