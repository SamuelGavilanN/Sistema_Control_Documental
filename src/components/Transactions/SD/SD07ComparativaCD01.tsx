// src/components/Transactions/SD/SD07ComparativaCD01.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import './SD07.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Content-Type': 'application/json'
};

interface FilaDocxentra { acta: string; cod_local: string; cantidad: number; }
interface FilaWms { acta: string; cod_local: string; cantidad: number; }
interface FilaComparacion {
  acta: string; cod_local: string; cantidad_docxentra: number; cantidad_wms: number;
  diferencia: number; estado: 'Coincide' | 'Diferencia' | 'Solo Docxentra' | 'Solo WMS';
}

type OrdenColumna = 'acta' | 'cod_local' | 'cantidad_docxentra' | 'cantidad_wms' | 'diferencia' | 'estado';
type OrdenDireccion = 'asc' | 'desc';

const formatNumber = (num: number) => num.toLocaleString('es-CL');
const normalizar = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

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

  const mostrar = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 6000);
  };

  const cargarDatos = useCallback(async () => {
    if (!fechaProgramacion) { mostrar('warning', 'Selecciona una fecha de programación'); return; }
    setCargando(true);
    try {
      // 1. Obtener bultos de CD01
      const respBultos = await fetch(`${API_URL}/sd01_bultos?select=*&origen_carga=eq.CD01 Fashions-Park`, { headers: HEADERS });
      if (!respBultos.ok) throw new Error('Error al obtener bultos');
      const bultos: any[] = await respBultos.json();
      console.log('Bultos CD01 encontrados:', bultos.length);

      if (bultos.length === 0) {
        mostrar('info', 'No hay bultos registrados para CD01 en el sistema. Verifica el origen_carga.');
        setRowsDocxentra([]); setRowsWms([]); setComparacion([]);
        setCargando(false);
        return;
      }

      // 2. Extraer IDs de sd01_documento_locales (local_id en bultos)
      const localIds: string[] = Array.from(new Set(bultos.map((b: any) => b.local_id).filter(Boolean)));
      console.log('Local IDs (sd01_documento_locales):', localIds.length);

      // 3. Obtener codigo_local desde sd01_documento_locales
      let localMap = new Map<string, { codigo_local: string; nombre_local: string }>();
      if (localIds.length > 0) {
        // Dividir en bloques para no exceder URL
        const chunkSize = 50;
        for (let i = 0; i < localIds.length; i += chunkSize) {
          const chunk = localIds.slice(i, i + chunkSize);
          const inParams = chunk.join(',');
          const respLocales = await fetch(`${API_URL}/sd01_documento_locales?select=id,codigo_local,nombre_local&id=in.(${inParams})`, { headers: HEADERS });
          if (!respLocales.ok) throw new Error('Error al obtener documento_locales');
          const localesData: any[] = await respLocales.json();
          localesData.forEach((l: any) => localMap.set(l.id, { codigo_local: l.codigo_local, nombre_local: l.nombre_local }));
        }
      }
      console.log('Locales mapeados:', localMap.size);

      // 4. Extraer documento_ids (son id_documento string)
      const documentoIds: string[] = Array.from(new Set(bultos.map((b: any) => b.documento_id).filter(Boolean)));
      console.log('Documento IDs (id_documento):', documentoIds.length);

      // 5. Obtener fecha_programacion desde sd01_documentos usando id_documento
      let docMap = new Map<string, string>();
      if (documentoIds.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < documentoIds.length; i += chunkSize) {
          const chunk = documentoIds.slice(i, i + chunkSize);
          const inParams = chunk.join(',');
          const respDocs = await fetch(`${API_URL}/sd01_documentos?select=id_documento,fecha_programacion&id_documento=in.(${inParams})`, { headers: HEADERS });
          if (!respDocs.ok) throw new Error('Error al obtener documentos');
          const docsData: any[] = await respDocs.json();
          docsData.forEach((d: any) => docMap.set(d.id_documento, d.fecha_programacion));
        }
      }
      console.log('Documentos mapeados:', docMap.size);

      // 6. Filtrar por fecha y agrupar por acta + codigo_local
      const mapaDocx = new Map<string, number>();
      bultos.forEach((b: any) => {
        const fecha = docMap.get(b.documento_id);
        if (!fecha) return;
        // Normalizar fecha: si viene "2026-09-07T12:00:00", startsWith("2026-09-07") funciona
        if (fecha.startsWith(fechaProgramacion)) {
          const acta = b.numero_documento || '';
          const localInfo = localMap.get(b.local_id);
          const codLocal = localInfo?.codigo_local || '';
          if (!acta || !codLocal) return;
          const key = `${normalizar(acta)}||${normalizar(codLocal)}`;
          mapaDocx.set(key, (mapaDocx.get(key) || 0) + (b.cantidad || 0));
        }
      });

      const docxRows: FilaDocxentra[] = Array.from(mapaDocx.entries()).map(([key, cant]) => {
        const [acta, cod] = key.split('||');
        return { acta, cod_local: cod, cantidad: cant };
      });
      setRowsDocxentra(docxRows);
      console.log('Filas Docxentra después de filtro:', docxRows.length);

      if (docxRows.length === 0) {
        mostrar('info', `No hay bultos de CD01 para la fecha ${fechaProgramacion}. Revisa la fecha o los datos.`);
      }

      // 7. Obtener datos WMS
      const respWms = await fetch(`${API_URL}/wms_actas_cd01?select=*`, { headers: HEADERS });
      if (!respWms.ok) throw new Error('Error al obtener WMS');
      const wmsData: any[] = await respWms.json();
      console.log('Datos WMS encontrados:', wmsData.length);

      if (wmsData.length === 0) {
        mostrar('warning', 'No hay datos en WMS. Sube un informe actualizado.');
      }

      const mapaWms = new Map<string, number>();
      wmsData.forEach((w: any) => {
        const key = `${normalizar(w.acta)}||${normalizar(w.cod_local)}`;
        mapaWms.set(key, (mapaWms.get(key) || 0) + (w.cantidad || 0));
      });
      const wmsRows: FilaWms[] = Array.from(mapaWms.entries()).map(([key, cant]) => {
        const [acta, cod] = key.split('||');
        return { acta, cod_local: cod, cantidad: cant };
      });
      setRowsWms(wmsRows);
    } catch (e) {
      console.error('Error cargando datos:', e);
      mostrar('error', 'Error al cargar datos: ' + (e as Error).message);
    } finally {
      setCargando(false);
    }
  }, [fechaProgramacion]);

  useEffect(() => {
    if (fechaProgramacion) cargarDatos();
  }, [fechaProgramacion, cargarDatos]);

  // Comparación
  useEffect(() => {
    const claves = new Set<string>();
    rowsDocxentra.forEach(r => claves.add(`${r.acta}||${r.cod_local}`));
    rowsWms.forEach(r => claves.add(`${r.acta}||${r.cod_local}`));
    const filas: FilaComparacion[] = Array.from(claves).map(key => {
      const [acta, codLocal] = key.split('||');
      const docx = rowsDocxentra.find(r => r.acta === acta && r.cod_local === codLocal);
      const wms = rowsWms.find(r => r.acta === acta && r.cod_local === codLocal);
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

  const filasOrdenadas = useMemo(() => {
    const copia = [...comparacion];
    copia.sort((a, b) => {
      const valA: any = a[ordenColumna];
      const valB: any = b[ordenColumna];
      if (typeof valA === 'number') return ordenDireccion === 'asc' ? valA - valB : valB - valA;
      return ordenDireccion === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    return copia;
  }, [comparacion, ordenColumna, ordenDireccion]);

  const cambiarOrden = (columna: OrdenColumna) => {
    if (ordenColumna === columna) setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
    else { setOrdenColumna(columna); setOrdenDireccion('asc'); }
  };

  const procesarArchivo = async () => {
    if (!archivo) { mostrar('warning', 'Selecciona archivo'); return; }
    setProcesando(true);
    try {
      const data = await archivo.arrayBuffer();
      const wb = XLSX.read(data, { cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      let headerIndex = -1, idxActa = -1, idxCod = -1, idxCant = -1;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const headers = row.map((cell: any) => normalizar(String(cell || '')));
        const a = headers.findIndex(h => h.includes('ACTA'));
        const c = headers.findIndex(h => h.includes('COD') && h.includes('LOCAL'));
        const q = headers.findIndex(h => h.includes('CANTIDAD') || h.includes('SUMA'));
        if (a !== -1 && c !== -1 && q !== -1) { headerIndex = i; idxActa = a; idxCod = c; idxCant = q; break; }
      }
      if (headerIndex === -1) { mostrar('error', 'No se encontraron las columnas "Acta", "Cod Local" y "Suma de Cantidad"'); setProcesando(false); return; }

      const filas = rows.slice(headerIndex + 1).filter(r => r && r[idxActa]);
      const registros = filas.map(r => ({
        acta: String(r[idxActa]).trim(),
        cod_local: String(r[idxCod]).trim(),
        cantidad: parseInt(r[idxCant]) || 0
      }));
      if (registros.length === 0) { mostrar('warning', 'El archivo no contiene datos'); setProcesando(false); return; }

      // Eliminar datos anteriores
      await fetch(`${API_URL}/wms_actas_cd01?id=neq.00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE', headers: HEADERS
      });

      // Insertar nuevos en lotes
      const BATCH = 100;
      for (let i = 0; i < registros.length; i += BATCH) {
        const batch = registros.slice(i, i + BATCH);
        await fetch(`${API_URL}/wms_actas_cd01`, {
          method: 'POST', headers: { ...HEADERS, 'Prefer': 'return=representation' }, body: JSON.stringify(batch)
        });
      }
      mostrar('success', `Informe WMS cargado correctamente (${registros.length} registros)`);
      setMostrarSubirModal(false);
      setArchivo(null);
      cargarDatos();
    } catch (e) {
      console.error('Error subiendo archivo:', e);
      mostrar('error', 'Error al procesar archivo: ' + (e as Error).message);
    } finally { setProcesando(false); }
  };

  const exportarExcel = () => {
    if (filasOrdenadas.length === 0) return;
    const headers = ['Acta', 'Cod Local', 'Bultos Docxentra', 'Bultos WMS', 'Diferencia', 'Estado'];
    const rows = filasOrdenadas.map(f => [f.acta, f.cod_local, f.cantidad_docxentra, f.cantidad_wms, f.diferencia, f.estado]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparativa');
    XLSX.writeFile(wb, `Comparativa_CD01_${fechaProgramacion}.xlsx`);
  };

  const resumen = useMemo(() => {
    const total = filasOrdenadas.length;
    const sinDif = filasOrdenadas.filter(f => f.estado === 'Coincide').length;
    return { total, sinDif, conDif: total - sinDif };
  }, [filasOrdenadas]);

  return (
    <div className="sd07-container">
      <div className="sd07-header">
        <h2>SD07 – Comparativa CD01 vs WMS</h2>
        <p>Compara actas y bultos registrados en Docxentra (CD01) contra el informe del WMS</p>
      </div>
      <div className="sd07-toolbar">
        <div className="sd07-filter-group">
          <label>Fecha Programación:</label>
          <input type="date" value={fechaProgramacion} onChange={(e) => setFechaProgramacion(e.target.value)} className="sd07-date-input" />
        </div>
        <button className="sd07-btn sd07-btn-primary" onClick={cargarDatos} disabled={cargando}>{cargando ? 'Cargando...' : 'Actualizar'}</button>
        <button className="sd07-btn" onClick={() => setMostrarSubirModal(true)}>📤 Subir Informe WMS</button>
        <button className="sd07-btn sd07-btn-success" onClick={exportarExcel} disabled={filasOrdenadas.length === 0}>📊 Exportar Excel</button>
      </div>
      {filasOrdenadas.length > 0 && (
        <div className="sd07-resumen">
          <div className="sd07-total-card"><span>Total Actas</span><strong>{resumen.total}</strong></div>
          <div className="sd07-total-card"><span>Sin Diferencias</span><strong style={{ color: '#16a34a' }}>{resumen.sinDif}</strong></div>
          <div className="sd07-total-card"><span>Con Diferencias</span><strong style={{ color: '#dc2626' }}>{resumen.conDif}</strong></div>
        </div>
      )}
      <div className="sd07-table-wrapper">
        {cargando ? <div className="sd07-loading">Cargando...</div> :
         filasOrdenadas.length === 0 ? <div className="sd07-empty">No hay datos para la fecha. Revisa los mensajes arriba.</div> :
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
                 <td style={{ color: f.diferencia !== 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{formatNumber(f.diferencia)}</td>
                 <td><span className={`sd07-badge sd07-badge-${f.estado.toLowerCase().replace(/ /g, '-')}`}>{f.estado}</span></td>
               </tr>
             ))}
           </tbody>
         </table>}
      </div>
      {mostrarSubirModal && (
        <div className="sd07-modal-overlay" onClick={() => setMostrarSubirModal(false)}>
          <div className="sd07-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd07-modal-header">
              <h2>Subir Informe WMS</h2>
              <button className="sd07-modal-close" onClick={() => setMostrarSubirModal(false)}>×</button>
            </div>
            <div className="sd07-modal-body">
              <p style={{ fontSize: '13px', marginBottom: '16px' }}>El archivo debe contener las columnas: <strong>Acta</strong>, <strong>Cod Local</strong> y <strong>Suma de Cantidad</strong>.</p>
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
              <div className="sd07-modal-actions">
                <button className="sd07-btn" onClick={() => setMostrarSubirModal(false)}>Cancelar</button>
                <button className="sd07-btn sd07-btn-primary" onClick={procesarArchivo} disabled={!archivo || procesando}>{procesando ? 'Procesando...' : 'Cargar y Guardar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD07ComparativaCD01;
