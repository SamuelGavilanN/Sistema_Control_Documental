// src/components/Transactions/SD/SD03InformeUnDesp.tsx

import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import './SD03.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

// Función para determinar si un origen es Centro de Distribución
const esCentroDistribucion = (origen: string): boolean => {
  const o = origen.toUpperCase().trim();
  return o.startsWith('CD') || o.startsWith('OUT') || o.startsWith('AGV') || /^C\d+/.test(o);
};

// Extraer código de centro desde el origen (ej: "CD01 Fashions-Park" -> "CD01")
const getCodigoCentro = (origen: string): string => {
  const o = origen.toUpperCase().trim();
  if (o.startsWith('CD') || o.startsWith('OUT') || o.startsWith('C')) {
    return o.split(' ')[0];
  }
  if (o.startsWith('AGV')) return 'AGV';
  return o;
};

// Lista de centros conocidos para tener columnas fijas
const CENTROS_CONOCIDOS = [
  'CD01', 'CD12', 'CD16', 'CD30', 'CD31',
  'C144', 'OUT1', 'OUT2', 'OUT3', 'AGV'
];

const SD03InformeUnDesp: React.FC = () => {
  const [fechaFiltro, setFechaFiltro] = useState<string>('');
  const [datos, setDatos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string>('');

  const mostrarMensaje = (texto: string) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3000);
  };

  const cargarInforme = useCallback(async () => {
    setCargando(true);
    setMensaje('');
    try {
      let query = `${API_URL}/sd01_documentos?select=id,id_documento,fecha_programacion&order=fecha_programacion.asc`;
      if (fechaFiltro) {
        const fecha = fechaFiltro; // formato YYYY-MM-DD
        query += `&fecha_programacion=gte.${fecha}T00:00:00&fecha_programacion=lte.${fecha}T23:59:59`;
      }

      const resp = await fetch(query, { headers: HEADERS });
      if (!resp.ok) throw new Error('Error al consultar transportes');
      const documentos = await resp.json();

      if (documentos.length === 0) {
        setDatos([]);
        setCargando(false);
        return;
      }

      const docIds = documentos.map((d: any) => d.id_documento);
      const docIdsParam = docIds.join(',');

      // Obtener locales de esos documentos
      const respLocales = await fetch(
        `${API_URL}/sd01_documento_locales?select=id,documento_id,codigo_local&documento_id=in.(${docIdsParam})`,
        { headers: HEADERS }
      );
      const locales = await respLocales.json();

      const localIds = locales.map((l: any) => l.id);
      const localIdsParam = localIds.join(',');

      let bultos: any[] = [];
      if (localIdsParam) {
        const respBultos = await fetch(
          `${API_URL}/sd01_bultos?select=id,local_id,cantidad,origen_carga&local_id=in.(${localIdsParam})`,
          { headers: HEADERS }
        );
        bultos = await respBultos.json();
      }

      // Mapa de local -> documento
      const localDocMap = new Map<string, string>();
      locales.forEach((l: any) => {
        localDocMap.set(l.id, l.documento_id);
      });

      // Agrupar por documento
      const porDocumento = new Map<string, any>();
      documentos.forEach((doc: any) => {
        porDocumento.set(doc.id_documento, {
          fecha_programacion: doc.fecha_programacion,
          centros: new Map<string, number>()
        });
      });

      // Procesar bultos
      bultos.forEach((bulto: any) => {
        const documentoId = localDocMap.get(bulto.local_id);
        if (!documentoId) return;
        if (!esCentroDistribucion(bulto.origen_carga)) return;

        const doc = porDocumento.get(documentoId);
        if (!doc) return;

        const codigoCentro = getCodigoCentro(bulto.origen_carga);
        const actual = doc.centros.get(codigoCentro) || 0;
        doc.centros.set(codigoCentro, actual + (bulto.cantidad || 0));
      });

      // Convertir a array para la tabla
      const filas = Array.from(porDocumento.values()).map((doc: any) => {
        const fila: any = {
          fecha_programacion: doc.fecha_programacion,
          centros: doc.centros
        };
        return fila;
      });

      // Ordenar por fecha (ya viene ordenado, pero reordenamos por seguridad)
      filas.sort((a, b) => (a.fecha_programacion || '').localeCompare(b.fecha_programacion || ''));

      setDatos(filas);
    } catch (e) {
      console.error('Error cargando informe:', e);
      mostrarMensaje('Error al cargar el informe');
    }
    setCargando(false);
  }, [fechaFiltro]);

  const exportarExcel = () => {
    if (datos.length === 0) {
      mostrarMensaje('No hay datos para exportar');
      return;
    }

    // Construir encabezados
    const headers = ['Fecha Programación'];
    CENTROS_CONOCIDOS.forEach((centro) => {
      headers.push(`${centro} Bultos`, `${centro} Unidades`);
    });
    headers.push('Total Bultos', 'Total Unidades');

    const rows = datos.map((fila) => {
      const row: any[] = [fila.fecha_programacion ? fila.fecha_programacion.slice(0, 10) : ''];
      let totalBultos = 0;
      let totalUnidades = 0;

      CENTROS_CONOCIDOS.forEach((centro) => {
        const bultos = fila.centros.get(centro) || 0;
        const unidades = bultos * 16;
        row.push(bultos, unidades);
        totalBultos += bultos;
        totalUnidades += unidades;
      });

      row.push(totalBultos, totalUnidades);
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informe Despacho');
    XLSX.writeFile(wb, `Informe_Despacho_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="sd03-container">
      <div className="sd03-header">
        <h2>Informe Un Despacho</h2>
        <p>Consolidado por fecha de programación - Bultos por centro de distribución</p>
      </div>

      <div className="sd03-toolbar">
        <div className="sd03-filter-group">
          <label className="sd03-filter-label">Fecha Programación:</label>
          <input
            type="date"
            className="sd03-date-input"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
          />
        </div>
        <button className="sd03-btn sd03-btn-primary" onClick={cargarInforme} disabled={cargando}>
          {cargando ? 'Cargando...' : 'Actualizar Informe'}
        </button>
        <button className="sd03-btn sd03-btn-success" onClick={exportarExcel} disabled={datos.length === 0}>
          Exportar Excel
        </button>
        {mensaje && <span className="sd03-mensaje">{mensaje}</span>}
      </div>

      <div className="sd03-table-wrapper">
        {cargando ? (
          <div className="sd03-loading">Cargando datos...</div>
        ) : datos.length === 0 ? (
          <div className="sd03-empty">No hay datos para mostrar. Ajusta la fecha o pulsa Actualizar.</div>
        ) : (
          <table className="sd03-table">
            <thead>
              <tr>
                <th>Fecha Programación</th>
                {CENTROS_CONOCIDOS.map((centro) => (
                  <React.Fragment key={centro}>
                    <th>{centro} Bultos</th>
                    <th>{centro} Unidades</th>
                  </React.Fragment>
                ))}
                <th>Total Bultos</th>
                <th>Total Unidades</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((fila, idx) => {
                let totalBultos = 0;
                let totalUnidades = 0;
                return (
                  <tr key={idx}>
                    <td className="sd03-mono">{fila.fecha_programacion ? fila.fecha_programacion.slice(0, 10) : '-'}</td>
                    {CENTROS_CONOCIDOS.map((centro) => {
                      const bultos = fila.centros.get(centro) || 0;
                      const unidades = bultos * 16;
                      totalBultos += bultos;
                      totalUnidades += unidades;
                      return (
                        <React.Fragment key={centro}>
                          <td style={{ textAlign: 'center' }}>{bultos}</td>
                          <td style={{ textAlign: 'center' }}>{unidades}</td>
                        </React.Fragment>
                      );
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{totalBultos}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{totalUnidades}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SD03InformeUnDesp;
