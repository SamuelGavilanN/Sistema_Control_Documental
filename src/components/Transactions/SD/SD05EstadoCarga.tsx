// src/components/Transactions/SD/SD05EstadoCarga.tsx

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth'; // <-- IMPORTACIÓN AGREGADA
import './SD05.css';

interface Frecuencia {
  id: string;
  dia_carga: string;
  drop_local: string;
  codigo_local: string;
  nombre_local: string;
  cantidad_estimada_despacho: number;
}

interface WmsConsolidado {
  drop_local: string;
  cantidad: number;
}

interface FilaDashboard {
  dia_carga: string;
  codigo: string;
  tienda: string;
  cantidad_estimada: number;
  cantidad_actual: number;
  diferencia: number;
  pct_cumplimiento: number;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const formatNumber = (num: number): string => num.toLocaleString('es-CL');

const normalizar = (texto: string): string => {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
};

const SD05EstadoCarga: React.FC = () => {
  const [frecuencias, setFrecuencias] = useState<Frecuencia[]>([]);
  const [wmsConsolidado, setWmsConsolidado] = useState<WmsConsolidado[]>([]);
  const [filtroDia, setFiltroDia] = useState('');
  const [datos, setDatos] = useState<FilaDashboard[]>([]);
  const [orden, setOrden] = useState<{ columna: string; direccion: 'asc' | 'desc' }>({ columna: 'codigo', direccion: 'asc' });
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });
  const [vistaCompleta, setVistaCompleta] = useState(false);
  const [mostrarSubirModal, setMostrarSubirModal] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [indiceCarrusel, setIndiceCarrusel] = useState(0);
  const [localesDeficit, setLocalesDeficit] = useState<FilaDashboard[]>([]);

  const usuario = auth.getUsuario();

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  // Calcular día actual (después de las 4 AM)
  const obtenerDiaActual = useCallback(() => {
    const ahora = new Date();
    const hora = ahora.getHours();
    let diaIndex = ahora.getDay(); // 0=domingo
    if (hora < 4) diaIndex = (diaIndex + 6) % 7;
    return DIAS[diaIndex];
  }, []);

  useEffect(() => {
    setFiltroDia(obtenerDiaActual());
    cargarDatos();
  }, []);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [frecResp, wmsResp] = await Promise.all([
        supabase.from('frecuencias').select('*').eq('activo', true),
        supabase.from('wms_carga_consolidada').select('*')
      ]);

      if (frecResp.error) throw frecResp.error;
      if (wmsResp.error) throw wmsResp.error;

      setFrecuencias(frecResp.data || []);
      setWmsConsolidado(
        (wmsResp.data || []).map((item: any) => ({
          drop_local: normalizar(item.drop_local),
          cantidad: item.cantidad || 0
        }))
      );
    } catch (e) {
      console.error('Error cargando datos:', e);
      mostrarMensaje('error', 'Error al cargar datos');
    } finally {
      setCargando(false);
    }
  }, []);

  // Filtrar y combinar datos
  useEffect(() => {
    const datosFiltrados = frecuencias
      .filter((f) => !filtroDia || f.dia_carga === filtroDia)
      .map((f) => {
        const wms = wmsConsolidado.find((w) => w.drop_local === normalizar(f.drop_local));
        const cantidad_actual = wms ? wms.cantidad : 0;
        const cantidad_estimada = f.cantidad_estimada_despacho || 0;
        // Si estimado es 0 pero actual > 0, igualamos estimado a actual
        let estimado = cantidad_estimada;
        if (estimado === 0 && cantidad_actual > 0) estimado = cantidad_actual;
        const diferencia = cantidad_actual - estimado;
        const pct = estimado > 0 ? Math.round((cantidad_actual / estimado) * 100) : 0;
        return {
          dia_carga: f.dia_carga,
          codigo: f.codigo_local,
          tienda: f.nombre_local || f.drop_local || '',
          cantidad_estimada: estimado,
          cantidad_actual,
          diferencia,
          pct_cumplimiento: pct
        };
      })
      .filter((d) => d.cantidad_estimada > 0 || d.cantidad_actual > 0)
      .sort((a, b) => {
        const { columna, direccion } = orden;
        let valA = a[columna as keyof FilaDashboard];
        let valB = b[columna as keyof FilaDashboard];
        if (typeof valA === 'string') return direccion === 'asc' ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
        return direccion === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });

    setDatos(datosFiltrados);
    setLocalesDeficit(datosFiltrados.filter((d) => d.diferencia < 0));
  }, [frecuencias, wmsConsolidado, filtroDia, orden]);

  // Carrusel automático (cada 30 segundos)
  useEffect(() => {
    if (localesDeficit.length === 0) return;
    const interval = setInterval(() => {
      setIndiceCarrusel((prev) => (prev + 1) % Math.ceil(localesDeficit.length / 4));
    }, 30000);
    return () => clearInterval(interval);
  }, [localesDeficit.length]);

  const cambiarOrden = (columna: string) => {
    setOrden((prev) => ({
      columna,
      direccion: prev.columna === columna ? (prev.direccion === 'asc' ? 'desc' : 'asc') : 'asc'
    }));
  };

  // Exportar a Excel
  const exportarExcel = () => {
    if (datos.length === 0) {
      mostrarMensaje('warning', 'No hay datos para exportar');
      return;
    }
    const headers = ['Dia Carga', 'Código', 'Tienda', 'Cantidad Estimada', 'Cantidad Actual', 'Dif', '% Cumplimiento'];
    const rows = datos.map((d) => [
      d.dia_carga, d.codigo, d.tienda, d.cantidad_estimada, d.cantidad_actual, d.diferencia, `${d.pct_cumplimiento}%`
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estado Carga');
    XLSX.writeFile(wb, `Estado_Carga_${filtroDia}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Procesar archivo WMS y consolidar
  const procesarArchivo = async () => {
    if (!archivo) {
      mostrarMensaje('warning', 'Seleccione un archivo Excel');
      return;
    }
    setProcesando(true);
    try {
      const data = await archivo.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Buscar encabezados (normalizados)
      let headerIndex = -1;
      let idxUbicacion = -1;
      let idxCantidad = -1;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const headersRow = row.map((cell: any) => normalizar(cell?.toString() || ''));

        const ubicacionIndex = headersRow.findIndex((h: string) => h.includes('UBICACION'));
        const cantidadIndex = headersRow.findIndex((h: string) => h.includes('CANTIDAD') && !h.includes('REVISION'));

        if (ubicacionIndex !== -1 && cantidadIndex !== -1) {
          headerIndex = i;
          idxUbicacion = ubicacionIndex;
          idxCantidad = cantidadIndex;
          break;
        }
      }

      if (headerIndex === -1) {
        mostrarMensaje('error', 'No se encontró la columna "Número de Ubicación" o "Cantidad"');
        setProcesando(false);
        return;
      }

      // Recoger filas de datos
      const filasData = rows.slice(headerIndex + 1).filter((r: any) => r && r[idxUbicacion]);

      // Consolidar por ubicación normalizada (mayúsculas y sin espacios)
      const mapa = new Map<string, number>();
      filasData.forEach((r: any) => {
        const ubicacion = normalizar(String(r[idxUbicacion]).trim());
        const cantidad = parseInt(r[idxCantidad]) || 0;
        if (ubicacion) {
          const actual = mapa.get(ubicacion) || 0;
          mapa.set(ubicacion, actual + cantidad);
        }
      });

      const consolidado = Array.from(mapa.entries()).map(([drop, cantidad]) => ({
        drop_local: drop,
        cantidad
      }));

      if (consolidado.length === 0) {
        mostrarMensaje('error', 'No se encontraron datos para consolidar');
        setProcesando(false);
        return;
      }

      // 1. Eliminar todos los registros de wms_carga_consolidada
      const { error: deleteError } = await supabase.from('wms_carga_consolidada').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) throw deleteError;

      // 2. Insertar nuevos datos en lotes
      const BATCH = 100;
      for (let i = 0; i < consolidado.length; i += BATCH) {
        const batch = consolidado.slice(i, i + BATCH);
        const { error: insertError } = await supabase.from('wms_carga_consolidada').insert(batch);
        if (insertError) throw insertError;
      }

      mostrarMensaje('success', `Informe WMS cargado y consolidado (${consolidado.length} DROPs)`);
      setMostrarSubirModal(false);
      setArchivo(null);
      await cargarDatos();
    } catch (e) {
      console.error('Error subiendo archivo:', e);
      mostrarMensaje('error', 'Error al procesar el archivo: ' + (e as Error).message);
    } finally {
      setProcesando(false);
    }
  };

  const renderCarrusel = () => {
    if (localesDeficit.length === 0) return null;
    const totalPorPagina = 4;
    const totalPaginas = Math.ceil(localesDeficit.length / totalPorPagina);
    const paginaActual = Math.min(indiceCarrusel % totalPaginas, totalPaginas - 1);
    const inicio = paginaActual * totalPorPagina;
    const tarjetas = localesDeficit.slice(inicio, inicio + totalPorPagina);

    return (
      <div className="sd05-carrusel">
        <h3>🚨 Locales en Déficit ({localesDeficit.length})</h3>
        <div className="sd05-carrusel-tarjetas">
          {tarjetas.map((t) => (
            <div key={t.codigo} className="sd05-carrusel-tarjeta">
              <strong>{t.codigo}</strong>
              <span>{t.tienda}</span>
              <span>Estimado: {formatNumber(t.cantidad_estimada)}</span>
              <span>Actual: {formatNumber(t.cantidad_actual)}</span>
              <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Déficit: {formatNumber(Math.abs(t.diferencia))}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`sd05-container ${vistaCompleta ? 'sd05-vista-completa' : ''}`}>
      {mensaje.visible && (
        <div className={`sd05-toast sd05-toast-${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      {!vistaCompleta && (
        <div className="sd05-header">
          <h2>SD05 – Estado de Carga</h2>
          <p className="sd05-subtitle">Análisis de carga por local y día</p>
        </div>
      )}

      <div className="sd05-toolbar">
        <div className="sd05-filter-group">
          <label className="sd05-filter-label">Día de Carga:</label>
          <select className="sd05-select" value={filtroDia} onChange={(e) => setFiltroDia(e.target.value)}>
            {DIAS.map((dia) => (
              <option key={dia} value={dia}>{dia}</option>
            ))}
          </select>
        </div>

        <button className="sd05-btn sd05-btn-primary" onClick={cargarDatos} disabled={cargando}>
          {cargando ? 'Cargando...' : 'Actualizar'}
        </button>

        <button className="sd05-btn" onClick={() => setMostrarSubirModal(true)}>
          📤 Subir Informe WMS
        </button>

        <button className="sd05-btn sd05-btn-success" onClick={exportarExcel} disabled={datos.length === 0}>
          📊 Exportar Excel
        </button>

        <div className="sd05-separator"></div>

        <button className="sd05-btn" onClick={() => setVistaCompleta(!vistaCompleta)}>
          {vistaCompleta ? '❌ Salir de Vista Completa' : '⛶ Vista Completa'}
        </button>
      </div>

      {renderCarrusel()}

      <div className="sd05-totales">
        <div className="sd05-total-card">
          <span>Total Estimado</span>
          <strong>{formatNumber(datos.reduce((s, d) => s + d.cantidad_estimada, 0))}</strong>
        </div>
        <div className="sd05-total-card">
          <span>Total Actual</span>
          <strong>{formatNumber(datos.reduce((s, d) => s + d.cantidad_actual, 0))}</strong>
        </div>
        <div className="sd05-total-card">
          <span>% Cumplimiento</span>
          <strong style={{ color: datos.reduce((s, d) => s + d.cantidad_estimada, 0) > 0 ? (datos.reduce((s, d) => s + d.cantidad_actual, 0) / datos.reduce((s, d) => s + d.cantidad_estimada, 0)) * 100 >= 100 ? '#16a34a' : '#d97706' : '#dc2626' }}>
            {datos.reduce((s, d) => s + d.cantidad_estimada, 0) > 0 ? Math.round((datos.reduce((s, d) => s + d.cantidad_actual, 0) / datos.reduce((s, d) => s + d.cantidad_estimada, 0)) * 100) : 0}%
          </strong>
        </div>
      </div>

      <div className="sd05-table-wrapper">
        {cargando ? (
          <div className="sd05-loading">Cargando datos...</div>
        ) : datos.length === 0 ? (
          <div className="sd05-empty">No hay datos para el día seleccionado. Ajusta el filtro.</div>
        ) : (
          <table className="sd05-table">
            <thead>
              <tr>
                <th onClick={() => cambiarOrden('dia_carga')}>Dia Carga {orden.columna === 'dia_carga' ? (orden.direccion === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => cambiarOrden('codigo')}>Código {orden.columna === 'codigo' ? (orden.direccion === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => cambiarOrden('tienda')}>Tienda {orden.columna === 'tienda' ? (orden.direccion === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => cambiarOrden('cantidad_estimada')}>Cantidad Estimada {orden.columna === 'cantidad_estimada' ? (orden.direccion === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => cambiarOrden('cantidad_actual')}>Cantidad Actual {orden.columna === 'cantidad_actual' ? (orden.direccion === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => cambiarOrden('diferencia')}>Dif {orden.columna === 'diferencia' ? (orden.direccion === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => cambiarOrden('pct_cumplimiento')}>% Cumplimiento {orden.columna === 'pct_cumplimiento' ? (orden.direccion === 'asc' ? '▲' : '▼') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((d) => (
                <tr key={d.codigo}>
                  <td>{d.dia_carga}</td>
                  <td><strong>{d.codigo}</strong></td>
                  <td>{d.tienda}</td>
                  <td>{formatNumber(d.cantidad_estimada)}</td>
                  <td>{formatNumber(d.cantidad_actual)}</td>
                  <td style={{ color: d.diferencia < 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{formatNumber(d.diferencia)}</td>
                  <td style={{ color: d.pct_cumplimiento >= 100 ? '#16a34a' : d.pct_cumplimiento >= 80 ? '#d97706' : '#dc2626', fontWeight: 600 }}>{d.pct_cumplimiento}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Subir Informe WMS */}
      {mostrarSubirModal && (
        <div className="sd05-modal-overlay" onClick={() => setMostrarSubirModal(false)}>
          <div className="sd05-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd05-modal-header">
              <h2>📤 Subir Informe WMS</h2>
              <button className="sd05-modal-close" onClick={() => setMostrarSubirModal(false)}>×</button>
            </div>
            <div className="sd05-modal-body">
              <p className="sd05-modal-desc">
                Selecciona el archivo Excel del WMS. El sistema buscará automáticamente las columnas <strong>"Número de Ubicación"</strong> y <strong>"Cantidad"</strong>, y consolidará las cantidades por DROP.
              </p>
              <div className="sd05-file-upload">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                  id="wms-file"
                />
                <label htmlFor="wms-file" className="sd05-file-label">
                  <span>📁</span>
                  {archivo ? archivo.name : 'Haz clic para seleccionar archivo'}
                </label>
              </div>
              <div className="sd05-modal-actions">
                <button className="sd05-btn" onClick={() => setMostrarSubirModal(false)}>Cancelar</button>
                <button className="sd05-btn sd05-btn-primary" onClick={procesarArchivo} disabled={!archivo || procesando}>
                  {procesando ? 'Procesando...' : 'Cargar y Consolidar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD05EstadoCarga;
