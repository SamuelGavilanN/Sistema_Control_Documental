// src/components/Transactions/SD/SD04AnalisisBultosDesp.tsx

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { auth } from '../../../lib/auth';
import { cache } from '../../../lib/cache';
import './SD04.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface LocalAnalisis {
  id: string;
  codigo_local: string;
  nombre_local: string;
  drop_local: string;
  zona: string;
}

interface FilaDato {
  codigo_local: string;
  nombre_local: string;
  drop_local: string;
  porFecha: Record<string, { programado: number; despachado: number }>;
}

// Formatear número con separador de miles
const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const SD04AnalisisBultosDesp: React.FC = () => {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [localesAnalisis, setLocalesAnalisis] = useState<LocalAnalisis[]>([]);
  const [localesDisponibles, setLocalesDisponibles] = useState<LocalAnalisis[]>([]);
  const [datos, setDatos] = useState<FilaDato[]>([]);
  const [fechas, setFechas] = useState<string[]>([]);
  const [totales, setTotales] = useState({
    totalSolicitado: 0,
    totalDespachado: 0,
    pctCumplimiento: 0,
    localesDeficit: 0,
    localesCumplimiento: 0
  });
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });
  const [mostrarModalLocales, setMostrarModalLocales] = useState(false);
  const [nuevoLocal, setNuevoLocal] = useState('');

  const usuario = auth.getUsuario();

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  // Cargar locales de análisis y todos los locales
  const cargarLocales = useCallback(async () => {
    try {
      // Locales de análisis
      const respAnalisis = await fetch(`${API_URL}/sd04_locales_analisis?select=*&activo=eq.true&order=codigo_local.asc`, {
        headers: HEADERS
      });
      const dataAnalisis = await respAnalisis.json();
      if (Array.isArray(dataAnalisis)) {
        setLocalesAnalisis(dataAnalisis);
      }

      // Todos los locales activos (para el modal)
      const respLocales = await fetch(`${API_URL}/locales?select=id,codigo_local,nombre_local,drop_local,zona&activo=eq.true&order=codigo_local.asc`, {
        headers: HEADERS
      });
      const dataLocales = await respLocales.json();
      if (Array.isArray(dataLocales)) {
        setLocalesDisponibles(dataLocales);
      }
    } catch (e) {
      console.error('Error cargando locales:', e);
    }
  }, []);

  useEffect(() => {
    cargarLocales();
  }, [cargarLocales]);

  // Cargar datos del informe
  const cargarDatos = useCallback(async () => {
    if (!fechaDesde || !fechaHasta) {
      mostrarMensaje('warning', 'Seleccione un rango de fechas');
      return;
    }

    setCargando(true);
    setDatos([]);
    setFechas([]);

    try {
      const desde = fechaDesde;
      const hasta = fechaHasta;

      // 1. Obtener SOLO documentos en estado Finalizado
      const respDocs = await fetch(
        `${API_URL}/sd01_documentos?select=id,id_documento,fecha_programacion&estado=eq.Finalizado&fecha_programacion=gte.${desde}&fecha_programacion=lte.${hasta}T23:59:59`,
        { headers: HEADERS }
      );
      const docs = await respDocs.json();
      if (!Array.isArray(docs) || docs.length === 0) {
        setCargando(false);
        mostrarMensaje('info', 'No hay transportes finalizados en el rango seleccionado');
        return;
      }

      // Extraer fechas únicas de programación (solo la parte YYYY-MM-DD)
      const fechasSet = new Set(docs.map((d: any) => d.fecha_programacion.slice(0, 10)).sort());
      const fechasArr = Array.from(fechasSet);
      setFechas(fechasArr);

      // 2. Obtener locales de los documentos
      const docIds = docs.map((d: any) => d.id_documento);
      const docIdsParam = docIds.join(',');

      const respLocales = await fetch(
        `${API_URL}/sd01_documento_locales?select=id,documento_id,codigo_local,cantidad_solicitada&documento_id=in.(${docIdsParam})`,
        { headers: HEADERS }
      );
      const localesDocs = await respLocales.json();
      if (!Array.isArray(localesDocs)) {
        throw new Error('Error obteniendo locales de documentos');
      }

      // 3. Obtener todos los bultos de esos locales
      const localIds = localesDocs.map((l: any) => l.id);
      let bultos: any[] = [];
      if (localIds.length > 0) {
        const localIdsParam = localIds.join(',');
        const respBultos = await fetch(
          `${API_URL}/sd01_bultos?select=id,local_id,cantidad&local_id=in.(${localIdsParam})`,
          { headers: HEADERS }
        );
        bultos = await respBultos.json();
      }

      // Construir un mapa: localId -> { documentoId, codigo_local, cantidad_solicitada, fecha }
      const localDocMap = new Map<string, any>();
      localesDocs.forEach((l: any) => {
        const doc = docs.find((d: any) => d.id_documento === l.documento_id);
        if (doc) {
          localDocMap.set(l.id, {
            codigo_local: l.codigo_local,
            cantidad_solicitada: l.cantidad_solicitada || 0,
            fecha: doc.fecha_programacion.slice(0, 10)
          });
        }
      });

      // Sumar bultos despachados por local
      const despachoPorLocal = new Map<string, number>();
      bultos.forEach((b: any) => {
        const actual = despachoPorLocal.get(b.local_id) || 0;
        despachoPorLocal.set(b.local_id, actual + (b.cantidad || 0));
      });

      // Ahora armar las filas por cada local de análisis
      const filas: FilaDato[] = [];
      localesAnalisis.forEach((la) => {
        const fila: FilaDato = {
          codigo_local: la.codigo_local,
          nombre_local: la.nombre_local || '',
          drop_local: la.drop_local || '',
          porFecha: {}
        };

        fechasArr.forEach((fecha) => {
          let programado = 0;
          let despachado = 0;

          localesDocs.forEach((l: any) => {
            const info = localDocMap.get(l.id);
            if (!info) return;
            if (info.codigo_local === la.codigo_local && info.fecha === fecha) {
              programado += info.cantidad_solicitada;
              despachado += despachoPorLocal.get(l.id) || 0;
            }
          });

          // Ajuste: si despachado > 0 y programado = 0, igualar programado a despachado
          if (programado === 0 && despachado > 0) {
            programado = despachado;
          }

          fila.porFecha[fecha] = { programado, despachado };
        });

        // Filtrar locales que no tienen actividad (programado=0 y despachado=0 en todas las fechas)
        const tieneActividad = Object.values(fila.porFecha).some(
          (val) => val.programado > 0 || val.despachado > 0
        );
        if (tieneActividad) {
          filas.push(fila);
        }
      });

      // Calcular totales globales (usando los valores ajustados)
      let totalSolicitado = 0;
      let totalDespachado = 0;
      let localesDeficit = 0;
      let localesCumplimiento = 0;

      filas.forEach((fila) => {
        let solLocal = 0;
        let despLocal = 0;
        Object.values(fila.porFecha).forEach((val) => {
          solLocal += val.programado;
          despLocal += val.despachado;
        });
        totalSolicitado += solLocal;
        totalDespachado += despLocal;
        if (solLocal > 0) {
          if (despLocal < solLocal) {
            localesDeficit++;
          } else {
            localesCumplimiento++;
          }
        }
      });

      setTotales({
        totalSolicitado,
        totalDespachado,
        pctCumplimiento: totalSolicitado > 0 ? Math.round((totalDespachado / totalSolicitado) * 100) : 0,
        localesDeficit,
        localesCumplimiento
      });

      setDatos(filas);
      setCargando(false);
    } catch (e) {
      console.error('Error cargando datos:', e);
      mostrarMensaje('error', 'Error al cargar los datos');
      setCargando(false);
    }
  }, [fechaDesde, fechaHasta, localesAnalisis]);

  // Agregar local al análisis
  const agregarLocalAnalisis = async () => {
    if (!nuevoLocal) {
      mostrarMensaje('warning', 'Seleccione un local');
      return;
    }
    const local = localesDisponibles.find((l) => l.codigo_local === nuevoLocal);
    if (!local) return;

    try {
      const existe = localesAnalisis.find((l) => l.codigo_local === nuevoLocal);
      if (existe) {
        mostrarMensaje('warning', 'El local ya está en la lista');
        return;
      }

      const resp = await fetch(`${API_URL}/sd04_locales_analisis`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          codigo_local: local.codigo_local,
          nombre_local: local.nombre_local,
          drop_local: local.drop_local,
          zona: local.zona,
          activo: true
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const nuevo = Array.isArray(data) ? data[0] : data;
        setLocalesAnalisis([...localesAnalisis, nuevo]);
        setNuevoLocal('');
        mostrarMensaje('success', 'Local agregado al análisis');
      } else {
        mostrarMensaje('error', 'Error al agregar local');
      }
    } catch (e) {
      mostrarMensaje('error', 'Error de red al agregar');
    }
  };

  const eliminarLocalAnalisis = async (id: string) => {
    if (!window.confirm('¿Eliminar este local del análisis?')) return;
    try {
      await fetch(`${API_URL}/sd04_locales_analisis?id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
      setLocalesAnalisis(localesAnalisis.filter((l) => l.id !== id));
      mostrarMensaje('success', 'Local eliminado');
    } catch (e) {
      mostrarMensaje('error', 'Error al eliminar');
    }
  };

  // Exportar a Excel
  const exportarExcel = () => {
    if (datos.length === 0) {
      mostrarMensaje('warning', 'No hay datos para exportar');
      return;
    }

    // Encabezados
    const headers = ['DROP', 'Código', 'Tienda'];
    fechas.forEach((fecha) => {
      headers.push(`Bultos Prog ${fecha}`, `Bultos Desp ${fecha}`, `Dif ${fecha}`, `% Cumpl ${fecha}`);
    });

    const rows = datos.map((fila) => {
      const row: any[] = [fila.drop_local, fila.codigo_local, fila.nombre_local];
      fechas.forEach((fecha) => {
        const val = fila.porFecha[fecha] || { programado: 0, despachado: 0 };
        const dif = val.despachado - val.programado;
        const pct = val.programado > 0 ? Math.round((val.despachado / val.programado) * 100) : 0;
        row.push(val.programado, val.despachado, dif, pct);
      });
      return row;
    });

    // Fila de totales
    const totalRow: any[] = ['TOTAL', '', ''];
    fechas.forEach((fecha) => {
      let sol = 0, desp = 0;
      datos.forEach((fila) => {
        const val = fila.porFecha[fecha] || { programado: 0, despachado: 0 };
        sol += val.programado;
        desp += val.despachado;
      });
      const dif = desp - sol;
      const pct = sol > 0 ? Math.round((desp / sol) * 100) : 0;
      totalRow.push(sol, desp, dif, pct);
    });
    rows.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Análisis Bultos');
    XLSX.writeFile(wb, `Analisis_Bultos_${fechaDesde}_${fechaHasta}.xlsx`);
  };

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setDatos([]);
    setFechas([]);
  };

  return (
    <div className="sd04-container">
      <div className="sd04-header">
        <h2>SD04 – Análisis Bultos Despachados</h2>
        <p className="sd04-subtitle">Comparativo entre bultos programados y despachados por local y fecha de programación (solo transportes finalizados)</p>
      </div>

      {/* Barra de herramientas */}
      <div className="sd04-toolbar">
        <div className="sd04-filter-group">
          <label className="sd04-filter-label">Desde:</label>
          <input
            type="date"
            className="sd04-date-input"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>
        <div className="sd04-filter-group">
          <label className="sd04-filter-label">Hasta:</label>
          <input
            type="date"
            className="sd04-date-input"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>

        <button className="sd04-btn sd04-btn-primary" onClick={cargarDatos} disabled={cargando}>
          {cargando ? 'Cargando...' : 'Actualizar'}
        </button>

        <button className="sd04-btn" onClick={limpiarFiltros}>
          Limpiar
        </button>

        <div className="sd04-separator"></div>

        <button className="sd04-btn" onClick={() => setMostrarModalLocales(true)}>
          Configurar Locales
        </button>

        <button className="sd04-btn sd04-btn-success" onClick={exportarExcel} disabled={datos.length === 0}>
          Exportar Excel
        </button>
      </div>

      {/* Mensajes */}
      {mensaje.visible && (
        <div className={`sd04-toast sd04-toast-${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      {/* Totales en la parte superior */}
      {datos.length > 0 && (
        <div className="sd04-totales">
          <div className="sd04-total-card">
            <span>Total Solicitado</span>
            <strong>{formatNumber(totales.totalSolicitado)}</strong>
          </div>
          <div className="sd04-total-card">
            <span>Total Despachado</span>
            <strong>{formatNumber(totales.totalDespachado)}</strong>
          </div>
          <div className="sd04-total-card">
            <span>% Total Cumplimiento</span>
            <strong style={{ color: totales.pctCumplimiento >= 100 ? '#16a34a' : totales.pctCumplimiento >= 80 ? '#d97706' : '#dc2626' }}>
              {totales.pctCumplimiento}%
            </strong>
          </div>
          <div className="sd04-total-card">
            <span>Locales en Déficit</span>
            <strong style={{ color: '#dc2626' }}>{formatNumber(totales.localesDeficit)}</strong>
          </div>
          <div className="sd04-total-card">
            <span>Locales en Cumplimiento</span>
            <strong style={{ color: '#16a34a' }}>{formatNumber(totales.localesCumplimiento)}</strong>
          </div>
        </div>
      )}

      {/* Tabla dinámica */}
      <div className="sd04-table-wrapper">
        {cargando ? (
          <div className="sd04-loading">Cargando datos...</div>
        ) : datos.length === 0 ? (
          <div className="sd04-empty">
            {fechaDesde && fechaHasta ? 'No hay datos para el rango seleccionado. Presione Actualizar.' : 'Seleccione un rango de fechas y presione Actualizar.'}
          </div>
        ) : (
          <table className="sd04-table">
            <thead>
              <tr>
                <th className="sd04-sticky-col">DROP</th>
                <th className="sd04-sticky-col">Código</th>
                <th className="sd04-sticky-col">Tienda</th>
                {fechas.map((fecha) => (
                  <React.Fragment key={fecha}>
                    <th colSpan={4} className="sd04-fecha-header">{fecha}</th>
                  </React.Fragment>
                ))}
              </tr>
              <tr>
                <th className="sd04-sticky-col"></th>
                <th className="sd04-sticky-col"></th>
                <th className="sd04-sticky-col"></th>
                {fechas.map((fecha) => (
                  <React.Fragment key={fecha}>
                    <th>Bultos Prog</th>
                    <th>Bultos Desp</th>
                    <th>Dif</th>
                    <th>% Cumpl</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.map((fila, idx) => (
                <tr key={fila.codigo_local}>
                  <td className="sd04-sticky-col">{fila.drop_local}</td>
                  <td className="sd04-sticky-col">{fila.codigo_local}</td>
                  <td className="sd04-sticky-col">{fila.nombre_local}</td>
                  {fechas.map((fecha) => {
                    const val = fila.porFecha[fecha] || { programado: 0, despachado: 0 };
                    const dif = val.despachado - val.programado;
                    const pct = val.programado > 0 ? Math.round((val.despachado / val.programado) * 100) : 0;
                    const color = pct >= 100 ? '#16a34a' : pct >= 80 ? '#d97706' : '#dc2626';
                    return (
                      <React.Fragment key={fecha}>
                        <td>{formatNumber(val.programado)}</td>
                        <td>{formatNumber(val.despachado)}</td>
                        <td style={{ color: dif < 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{formatNumber(dif)}</td>
                        <td style={{ color, fontWeight: 600 }}>{pct}%</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              {/* Fila de totales por día */}
              <tr className="sd04-total-row">
                <td className="sd04-sticky-col"><strong>TOTAL</strong></td>
                <td className="sd04-sticky-col"></td>
                <td className="sd04-sticky-col"></td>
                {fechas.map((fecha) => {
                  let sol = 0, desp = 0;
                  datos.forEach((fila) => {
                    const val = fila.porFecha[fecha] || { programado: 0, despachado: 0 };
                    sol += val.programado;
                    desp += val.despachado;
                  });
                  const dif = desp - sol;
                  const pct = sol > 0 ? Math.round((desp / sol) * 100) : 0;
                  return (
                    <React.Fragment key={fecha}>
                      <td><strong>{formatNumber(sol)}</strong></td>
                      <td><strong>{formatNumber(desp)}</strong></td>
                      <td><strong style={{ color: dif < 0 ? '#dc2626' : '#16a34a' }}>{formatNumber(dif)}</strong></td>
                      <td><strong>{pct}%</strong></td>
                    </React.Fragment>
                  );
                })}
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Modal para configurar locales de análisis */}
      {mostrarModalLocales && (
        <div className="sd04-modal-overlay" onClick={() => setMostrarModalLocales(false)}>
          <div className="sd04-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd04-modal-header">
              <h2>Configurar Locales de Análisis</h2>
              <button className="sd04-modal-close" onClick={() => setMostrarModalLocales(false)}>×</button>
            </div>
            <div className="sd04-modal-body">
              <div className="sd04-agregar-local">
                <select
                  className="sd04-select"
                  value={nuevoLocal}
                  onChange={(e) => setNuevoLocal(e.target.value)}
                >
                  <option value="">Seleccione un local...</option>
                  {localesDisponibles
                    .filter((l) => !localesAnalisis.find((la) => la.codigo_local === l.codigo_local))
                    .map((l) => (
                      <option key={l.id} value={l.codigo_local}>
                        {l.codigo_local} - {l.nombre_local} ({l.drop_local})
                      </option>
                    ))}
                </select>
                <button className="sd04-btn sd04-btn-primary" onClick={agregarLocalAnalisis}>Agregar</button>
              </div>

              <div className="sd04-lista-locales">
                <table className="sd04-table-mini">
                  <thead>
                    <tr>
                      <th>DROP</th>
                      <th>Código</th>
                      <th>Tienda</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {localesAnalisis.map((la) => (
                      <tr key={la.id}>
                        <td>{la.drop_local}</td>
                        <td>{la.codigo_local}</td>
                        <td>{la.nombre_local}</td>
                        <td>
                          <button
                            className="sd04-btn-delete"
                            onClick={() => eliminarLocalAnalisis(la.id)}
                          >×</button>
                        </td>
                      </tr>
                    ))}
                    {localesAnalisis.length === 0 && (
                      <tr><td colSpan={4} className="sd04-empty-mini">No hay locales configurados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="sd04-modal-footer">
              <button className="sd04-btn" onClick={() => setMostrarModalLocales(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD04AnalisisBultosDesp;
