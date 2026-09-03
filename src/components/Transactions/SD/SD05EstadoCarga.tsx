// src/components/Transactions/SD/SD05EstadoCarga.tsx

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { auth } from '../../../lib/auth';
import './SD05.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface Frecuencia {
  id: string;
  dia_carga: string;
  drop_local: string;
  codigo_local: string;
  nombre_local: string;
  cantidad_estimada_despacho: number;
}

interface WmsCarga {
  id: string;
  numero_ubicacion: string;
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

const SD05EstadoCarga: React.FC = () => {
  const [frecuencias, setFrecuencias] = useState<Frecuencia[]>([]);
  const [wmsData, setWmsData] = useState<WmsCarga[]>([]);
  const [filtroDia, setFiltroDia] = useState<string>('');
  const [datos, setDatos] = useState<FilaDashboard[]>([]);
  const [orden, setOrden] = useState<{ columna: string; direccion: 'asc' | 'desc' }>({ columna: 'codigo', direccion: 'asc' });
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });
  const [vistaCompleta, setVistaCompleta] = useState(false);
  const [mostrarSubirModal, setMostrarSubirModal] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [indiceCarrusel, setIndiceCarrusel] = useState(0);
  const [localesDeficit, setLocalesDeficit] = useState<FilaDashboard[]>([]);

  const usuario = auth.getUsuario();

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  const obtenerDiaActual = useCallback(() => {
    const ahora = new Date();
    const hora = ahora.getHours();
    let diaIndex = ahora.getDay();
    if (hora < 4) {
      diaIndex = (diaIndex + 6) % 7;
    }
    return DIAS[diaIndex];
  }, []);

  useEffect(() => {
    const dia = obtenerDiaActual();
    setFiltroDia(dia);
    cargarDatos();
  }, [obtenerDiaActual]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [respFrec, respWms] = await Promise.all([
        fetch(`${API_URL}/frecuencias?select=*&activo=eq.true`, { headers: HEADERS }),
        fetch(`${API_URL}/wms_carga?select=numero_ubicacion,cantidad&order=creado_en.desc`, { headers: HEADERS })
      ]);
      
      const frecData = await respFrec.json();
      const wmsDataRaw = await respWms.json();
      
      if (Array.isArray(frecData)) setFrecuencias(frecData);
      if (Array.isArray(wmsDataRaw)) {
        const mapWms = new Map<string, number>();
        wmsDataRaw.forEach((item: any) => {
          const ubicacion = item.numero_ubicacion;
          const cantidad = item.cantidad || 0;
          const actual = mapWms.get(ubicacion) || 0;
          mapWms.set(ubicacion, actual + cantidad);
        });
        const wmsArray: WmsCarga[] = Array.from(mapWms.entries()).map(([ubicacion, cantidad]) => ({
          id: ubicacion,
          numero_ubicacion: ubicacion,
          cantidad
        }));
        setWmsData(wmsArray);
      }
    } catch (e) {
      console.error('Error cargando datos:', e);
      mostrarMensaje('error', 'Error al cargar datos');
    }
    setCargando(false);
  };

  useEffect(() => {
    const datosFiltrados = frecuencias
      .filter((f) => !filtroDia || f.dia_carga === filtroDia)
      .map((f) => {
        const wms = wmsData.find((w) => w.numero_ubicacion === f.codigo_local);
        const cantidad_actual = wms ? wms.cantidad : 0;
        const cantidad_estimada = f.cantidad_estimada_despacho || 0;
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
    const deficit = datosFiltrados.filter((d) => d.diferencia < 0);
    setLocalesDeficit(deficit);
  }, [frecuencias, wmsData, filtroDia, orden]);

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

  const procesarArchivo = async () => {
    if (!archivo) {
      mostrarMensaje('warning', 'Seleccione un archivo Excel');
      return;
    }
    try {
      const data = await archivo.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      let headerRowIndex = -1;
      let headers: string[] = [];
      let idxUbicacion = -1;
      let idxCantidad = -1;

      for (let i = 0; i < Math.min(20, rows.length); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const normRow = row.map((cell: any) => cell ? normalizar(String(cell)) : '');
        const ubIndex = normRow.findIndex((h: string) => h.includes('ubicacion') || h.includes('ubicación'));
        const cantIndex = normRow.findIndex((h: string) => h.includes('cantidad'));
        if (ubIndex !== -1 && cantIndex !== -1) {
          headerRowIndex = i;
          headers = normRow;
          idxUbicacion = ubIndex;
          idxCantidad = cantIndex;
          break;
        }
      }

      if (headerRowIndex === -1) {
        mostrarMensaje('error', 'No se encontró la columna "Número de Ubicación" en el archivo');
        return;
      }

      const filasData = rows.slice(headerRowIndex + 1).filter((r: any) => r && r[idxUbicacion] && String(r[idxUbicacion]).trim() !== '');
      const items = filasData.map((r: any) => ({
        numero_ubicacion: String(r[idxUbicacion]).trim(),
        cantidad: parseInt(r[idxCantidad]) || 0,
        estado: (() => {
          const idxEstado = headers.findIndex((h: string) => h.includes('estado'));
          return idxEstado !== -1 ? String(r[idxEstado]).trim() : '';
        })(),
        raw_data: r
      }));

      await fetch(`${API_URL}/wms_carga`, { method: 'DELETE', headers: HEADERS });

      const BATCH = 100;
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH);
        await fetch(`${API_URL}/wms_carga`, {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify(batch)
        });
      }

      mostrarMensaje('success', `Informe WMS cargado correctamente (${items.length} registros)`);
      setMostrarSubirModal(false);
      setArchivo(null);
      cargarDatos();
    } catch (e) {
      console.error('Error subiendo archivo:', e);
      mostrarMensaje('error', 'Error al procesar el archivo');
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
              <span style={{ color: '#f87171', fontWeight: 'bold' }}>Déficit: {formatNumber(Math.abs(t.diferencia))}</span>
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
                  <td style={{ color: d.diferencia < 0 ? '#f87171' : '#4ade80', fontWeight: 600 }}>{formatNumber(d.diferencia)}</td>
                  <td style={{ color: d.pct_cumplimiento >= 100 ? '#4ade80' : d.pct_cumplimiento >= 80 ? '#fbbf24' : '#f87171', fontWeight: 600 }}>{d.pct_cumplimiento}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {mostrarSubirModal && (
        <div className="sd05-modal-overlay" onClick={() => setMostrarSubirModal(false)}>
          <div className="sd05-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd05-modal-header">
              <h2>Subir Informe WMS</h2>
              <button className="sd05-modal-close" onClick={() => setMostrarSubirModal(false)}>×</button>
            </div>
            <div className="sd05-modal-body">
              <p className="sd05-modal-desc">
                Selecciona el archivo Excel del WMS. Debe contener al menos las columnas 
                <strong> "Número de Ubicación"</strong> y <strong>"Cantidad"</strong>.
              </p>
              <div className="sd05-file-upload">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  id="sd05-file-input"
                  onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <label htmlFor="sd05-file-input" className="sd05-file-label">
                  {archivo ? archivo.name : 'Haz clic para seleccionar archivo'}
                </label>
              </div>
              <div className="sd05-modal-footer">
                <button className="sd05-btn" onClick={() => setMostrarSubirModal(false)}>Cancelar</button>
                <button className="sd05-btn sd05-btn-primary" onClick={procesarArchivo} disabled={!archivo}>
                  {archivo ? 'Procesar y Cargar' : 'Seleccione un archivo'}
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
