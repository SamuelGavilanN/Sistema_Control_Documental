// src/components/Transactions/SD/SD07ComparativaCD01.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import './SD07.css';

interface FilaDocxentra {
  acta: string;
  cod_local: string;
  cantidad: number;
}

interface FilaWms {
  acta: string;
  cod_local: string;
  cantidad: number;
}

interface FilaComparacion {
  acta: string;
  cod_local: string;
  cantidad_docxentra: number;
  cantidad_wms: number;
  diferencia: number;
  estado: 'Coincide' | 'Diferencia' | 'Solo Docxentra' | 'Solo WMS';
}

type OrdenColumna = 'acta' | 'cod_local' | 'cantidad_docxentra' | 'cantidad_wms' | 'diferencia' | 'estado';
type OrdenDireccion = 'asc' | 'desc';

const formatNumber = (num: number): string => num.toLocaleString('es-CL');

const normalizar = (texto: string): string => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

const SD07ComparativaCD01: React.FC = () => {
  const [fechaProgramacion, setFechaProgramacion] = useState('');
  const [rowsDocxentra, setRowsDocxentra] = useState<FilaDocxentra[]>([]);
  const [rowsWms, setRowsWms] = useState<FilaWms[]>([]);
  const [comparacion, setComparacion] = useState<FilaComparacion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [mostrarSubirModal, setMostrarSubirModal] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [ordenColumna, setOrdenColumna] = useState<OrdenColumna>('acta');
  const [ordenDireccion, setOrdenDireccion] = useState<OrdenDireccion>('asc');

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  // Cargar datos de Docxentra y WMS desde Supabase
  const cargarDatos = useCallback(async () => {
    if (!fechaProgramacion) {
      mostrarMensaje('warning', 'Selecciona una fecha de programación');
      return;
    }
    setCargando(true);
    try {
      // 1. Obtener bultos de CD01 desde Docxentra (con relación a documentos y locales)
      const { data: bultos, error: errorBultos } = await supabase
        .from('sd01_bultos')
        .select('*, documento:documento_id(*), local:local_id(*)')
        .eq('origen_carga', 'CD01 Fashions-Park');

      if (errorBultos) throw errorBultos;

      // Filtrar por fecha de programación (documento.fecha_programacion)
      const bultosFiltrados = (bultos || []).filter((b: any) => {
        const fecha = b.documento?.fecha_programacion;
        return fecha && fecha.startsWith(fechaProgramacion);
      });

      // Agrupar por acta y cod_local
      const mapaDocxentra = new Map<string, number>();
      bultosFiltrados.forEach((b: any) => {
        const acta = b.numero_documento || '';
        const codLocal = b.local?.codigo_local || b.local?.codigo_local || '';
        if (!acta) return;
        const key = `${normalizar(acta)}||${normalizar(codLocal)}`;
        mapaDocxentra.set(key, (mapaDocxentra.get(key) || 0) + (b.cantidad || 0));
      });

      const docxentraRows: FilaDocxentra[] = Array.from(mapaDocxentra.entries()).map(([key, cantidad]) => {
        const [acta, codLocal] = key.split('||');
        return { acta, cod_local: codLocal, cantidad };
      });
      setRowsDocxentra(docxentraRows);

      // 2. Obtener datos WMS desde Supabase
      const { data: wmsData, error: errorWms } = await supabase
        .from('wms_actas_cd01')
        .select('*');

      if (errorWms) throw errorWms;

      const mapaWms = new Map<string, number>();
      (wmsData || []).forEach((w: any) => {
        const acta = normalizar(w.acta);
        const codLocal = normalizar(w.cod_local);
        const key = `${acta}||${codLocal}`;
        mapaWms.set(key, (mapaWms.get(key) || 0) + (w.cantidad || 0));
      });

      const wmsRows: FilaWms[] = Array.from(mapaWms.entries()).map(([key, cantidad]) => {
        const [acta, codLocal] = key.split('||');
        return { acta, cod_local: codLocal, cantidad };
      });
      setRowsWms(wmsRows);
    } catch (e) {
      console.error('Error cargando datos:', e);
      mostrarMensaje('error', 'Error al cargar datos');
    } finally {
      setCargando(false);
    }
  }, [fechaProgramacion]);

  useEffect(() => {
    if (fechaProgramacion) cargarDatos();
  }, [fechaProgramacion, cargarDatos]);

  // Comparar Docxentra vs WMS
  useEffect(() => {
    const claves = new Set<string>();
    rowsDocxentra.forEach((r) => claves.add(`${r.acta}||${r.cod_local}`));
    rowsWms.forEach((r) => claves.add(`${r.acta}||${r.cod_local}`));

    const filas: FilaComparacion[] = Array.from(claves).map((key) => {
      const [acta, codLocal] = key.split('||');
      const docx = rowsDocxentra.find((r) => r.acta === acta && r.cod_local === codLocal);
      const wms = rowsWms.find((r) => r.acta === acta && r.cod_local === codLocal);
      const cantDocx = docx?.cantidad || 0;
      const cantWms = wms?.cantidad || 0;
      const diferencia = cantDocx - cantWms;

      let estado: FilaComparacion['estado'];
      if (cantDocx > 0 && cantWms > 0 && cantDocx === cantWms) estado = 'Coincide';
      else if (cantDocx > 0 && cantWms > 0 && cantDocx !== cantWms) estado = 'Diferencia';
      else if (cantDocx > 0 && cantWms === 0) estado = 'Solo Docxentra';
      else estado = 'Solo WMS';

      return { acta, cod_local: codLocal, cantidad_docxentra: cantDocx, cantidad_wms: cantWms, diferencia, estado };
    });

    setComparacion(filas);
  }, [rowsDocxentra, rowsWms]);

  // Ordenamiento
  const filasOrdenadas = useMemo(() => {
    const copia = [...comparacion];
    copia.sort((a, b) => {
      let valA: any = a[ordenColumna];
      let valB: any = b[ordenColumna];
      if (typeof valA === 'number') {
        return ordenDireccion === 'asc' ? valA - valB : valB - valA;
      }
      return ordenDireccion === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    return copia;
  }, [comparacion, ordenColumna, ordenDireccion]);

  const cambiarOrden = (columna: OrdenColumna) => {
    if (ordenColumna === columna) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenColumna(columna);
      setOrdenDireccion('asc');
    }
  };

  // Procesar archivo Excel WMS y guardar en Supabase
  const procesarArchivo = async () => {
    if (!archivo) {
      mostrarMensaje('warning', 'Selecciona un archivo Excel');
      return;
    }
    setProcesando(true);
    try {
      const data = await archivo.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Buscar encabezados (Acta, Cod Local, Suma de Cantidad)
      let headerIndex = -1;
      let idxActa = -1;
      let idxCodLocal = -1;
      let idxCantidad = -1;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const headers = row.map((cell: any) => normalizar(cell?.toString() || ''));

        const actaIndex = headers.findIndex((h: string) => h.includes('ACTA'));
        const codLocalIndex = headers.findIndex((h: string) => h.includes('COD') && h.includes('LOCAL'));
        const cantidadIndex = headers.findIndex((h: string) => h.includes('CANTIDAD') || h.includes('SUMA'));

        if (actaIndex !== -1 && codLocalIndex !== -1 && cantidadIndex !== -1) {
          headerIndex = i;
          idxActa = actaIndex;
          idxCodLocal = codLocalIndex;
          idxCantidad = cantidadIndex;
          break;
        }
      }

      if (headerIndex === -1) {
        mostrarMensaje('error', 'No se encontraron las columnas "Acta", "Cod Local" y "Suma de Cantidad"');
        setProcesando(false);
        return;
      }

      // Recoger filas de datos
      const filasData = rows.slice(headerIndex + 1).filter((r: any) => r && r[idxActa]);

      const registrosWms = filasData.map((r: any) => ({
        acta: String(r[idxActa]).trim(),
        cod_local: String(r[idxCodLocal]).trim(),
        cantidad: parseInt(r[idxCantidad]) || 0
      }));

      if (registrosWms.length === 0) {
        mostrarMensaje('warning', 'No hay datos en el archivo');
        setProcesando(false);
        return;
      }

      // 1. Eliminar datos anteriores
      const { error: deleteError } = await supabase.from('wms_actas_cd01').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) throw deleteError;

      // 2. Insertar nuevos en lotes
      const BATCH = 100;
      for (let i = 0; i < registrosWms.length; i += BATCH) {
        const batch = registrosWms.slice(i, i + BATCH);
        const { error: insertError } = await supabase.from('wms_actas_cd01').insert(batch);
        if (insertError) throw insertError;
      }

      mostrarMensaje('success', `Informe WMS cargado correctamente (${registrosWms.length} registros)`);
      setMostrarSubirModal(false);
      setArchivo(null);
      cargarDatos();
    } catch (e) {
      console.error('Error subiendo archivo:', e);
      mostrarMensaje('error', 'Error al procesar el archivo: ' + (e as Error).message);
    } finally {
      setProcesando(false);
    }
  };

  // Exportar a Excel
  const exportarExcel = () => {
    if (filasOrdenadas.length === 0) {
      mostrarMensaje('warning', 'No hay datos para exportar');
      return;
    }
    const headers = ['Acta', 'Cod Local', 'Bultos Docxentra', 'Bultos WMS', 'Diferencia', 'Estado'];
    const rows = filasOrdenadas.map((f) => [
      f.acta,
      f.cod_local,
      f.cantidad_docxentra,
      f.cantidad_wms,
      f.diferencia,
      f.estado
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparativa');
    XLSX.writeFile(wb, `Comparativa_CD01_${fechaProgramacion}.xlsx`);
  };

  // Resumen del dashboard
  const resumen = useMemo(() => {
    const total = filasOrdenadas.length;
    const sinDif = filasOrdenadas.filter((f) => f.estado === 'Coincide').length;
    const conDif = total - sinDif;
    return { total, sinDif, conDif };
  }, [filasOrdenadas]);

  return (
    <div className="sd07-container">
      <div className="sd07-header">
        <h2>SD07 – Comparativa CD01 vs WMS</h2>
        <p>Compara actas y bultos registrados en Docxentra (CD01) contra el informe del WMS</p>
      </div>

      {/* Barra de herramientas */}
      <div className="sd07-toolbar">
        <div className="sd07-filter-group">
          <label>Fecha Programación:</label>
          <input
            type="date"
            value={fechaProgramacion}
            onChange={(e) => setFechaProgramacion(e.target.value)}
            className="sd07-date-input"
          />
        </div>

        <button className="sd07-btn sd07-btn-primary" onClick={cargarDatos} disabled={cargando}>
          {cargando ? 'Cargando...' : 'Actualizar'}
        </button>

        <button className="sd07-btn" onClick={() => setMostrarSubirModal(true)}>
          📤 Subir Informe WMS
        </button>

        <button className="sd07-btn sd07-btn-success" onClick={exportarExcel} disabled={filasOrdenadas.length === 0}>
          📊 Exportar Excel
        </button>
      </div>

      {/* Dashboard resumen */}
      {filasOrdenadas.length > 0 && (
        <div className="sd07-resumen">
          <div className="sd07-total-card">
            <span>Total Actas</span>
            <strong>{resumen.total}</strong>
          </div>
          <div className="sd07-total-card">
            <span>Sin Diferencias</span>
            <strong style={{ color: '#16a34a' }}>{resumen.sinDif}</strong>
          </div>
          <div className="sd07-total-card">
            <span>Con Diferencias</span>
            <strong style={{ color: '#dc2626' }}>{resumen.conDif}</strong>
          </div>
        </div>
      )}

      {/* Tabla comparativa */}
      <div className="sd07-table-wrapper">
        {cargando ? (
          <div className="sd07-loading">Cargando...</div>
        ) : filasOrdenadas.length === 0 ? (
          <div className="sd07-empty">No hay datos para la fecha seleccionada. Sube un informe WMS o cambia la fecha.</div>
        ) : (
          <table className="sd07-table">
            <thead>
              <tr>
                <th onClick={() => cambiarOrden('acta')}>Acta {ordenColumna === 'acta' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => cambiarOrden('cod_local')}>Cod Local {ordenColumna === 'cod_local' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => cambiarOrden('cantidad_docxentra')}>Bultos Docxentra {ordenColumna === 'cantidad_docxentra' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => cambiarOrden('cantidad_wms')}>Bultos WMS {ordenColumna === 'cantidad_wms' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => cambiarOrden('diferencia')}>Diferencia {ordenColumna === 'diferencia' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => cambiarOrden('estado')}>Estado {ordenColumna === 'estado' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {filasOrdenadas.map((f, idx) => (
                <tr key={`${f.acta}-${f.cod_local}-${idx}`}>
                  <td>{f.acta}</td>
                  <td>{f.cod_local}</td>
                  <td>{formatNumber(f.cantidad_docxentra)}</td>
                  <td>{formatNumber(f.cantidad_wms)}</td>
                  <td style={{ color: f.diferencia !== 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                    {formatNumber(f.diferencia)}
                  </td>
                  <td>
                    <span className={`sd07-badge sd07-badge-${f.estado.toLowerCase().replace(/ /g, '-')}`}>
                      {f.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Subir Informe WMS */}
      {mostrarSubirModal && (
        <div className="sd07-modal-overlay" onClick={() => setMostrarSubirModal(false)}>
          <div className="sd07-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd07-modal-header">
              <h2>Subir Informe WMS</h2>
              <button className="sd07-modal-close" onClick={() => setMostrarSubirModal(false)}>×</button>
            </div>
            <div className="sd07-modal-body">
              <p style={{ fontSize: '13px', marginBottom: '16px' }}>
                El archivo debe contener las columnas: <strong>Acta</strong>, <strong>Cod Local</strong> y <strong>Suma de Cantidad</strong>.
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              />
              <div className="sd07-modal-actions">
                <button className="sd07-btn" onClick={() => setMostrarSubirModal(false)}>Cancelar</button>
                <button className="sd07-btn sd07-btn-primary" onClick={procesarArchivo} disabled={!archivo || procesando}>
                  {procesando ? 'Procesando...' : 'Cargar y Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD07ComparativaCD01;
