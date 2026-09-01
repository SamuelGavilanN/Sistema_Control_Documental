// src/components/Transactions/SD/SD03InformeUnDesp.tsx

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './SD03.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

// Función para identificar centro de distribución
const esCentroDistribucion = (origen: string): boolean => {
  const o = origen.toUpperCase().trim();
  if (o.startsWith('CD') || o.startsWith('OUT') || o.startsWith('AGV')) return true;
  if (/^C\d+/.test(o)) return true;
  return false;
};

const SD03InformeUnDesp: React.FC = () => {
  const [fecha, setFecha] = useState('');
  const [datos, setDatos] = useState<any[]>([]);
  const [centros, setCentros] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Cargar informe al montar si hay fecha seleccionada
  useEffect(() => {
    if (fecha) cargarInforme();
  }, [fecha]);

  const cargarInforme = async () => {
    if (!fecha) return;
    setCargando(true);
    setMensaje('');
    try {
      // Consultar todos los documentos finalizados en esa fecha (00:00 a 23:59)
      const desde = fecha + 'T00:00:00.000Z';
      const hasta = fecha + 'T23:59:59.999Z';

      const resp = await fetch(
        `${API_URL}/sd01_documentos?select=*,locales:sd01_documento_locales(*,bultos:sd01_bultos(*))&finalizado_en=gte.${desde}&finalizado_en=lte.${hasta}`,
        { headers: HEADERS }
      );
      const data = await resp.json();
      if (!Array.isArray(data)) throw new Error('Respuesta inválida');

      // Procesar datos
      const porHora: Record<number, Record<string, number>> = {};
      const centrosSet = new Set<string>();

      data.forEach((doc: any) => {
        const hora = doc.finalizado_en ? new Date(doc.finalizado_en).getUTCHours() : -1;
        if (hora < 0) return;

        if (!porHora[hora]) porHora[hora] = {};

        // Sumar bultos por centro
        (doc.locales || []).forEach((local: any) => {
          (local.bultos || []).forEach((bulto: any) => {
            const origen = bulto.origen_carga || '';
            if (esCentroDistribucion(origen)) {
              if (!porHora[hora][origen]) porHora[hora][origen] = 0;
              porHora[hora][origen] += bulto.cantidad || 0;
              centrosSet.add(origen);
            }
          });
        });
      });

      const centrosList = Array.from(centrosSet).sort();
      setCentros(centrosList);

      // Convertir a array para tabla
      const rows = Object.keys(porHora).map((horaStr) => {
        const hora = parseInt(horaStr);
        const centrosData = porHora[hora];
        let totalBultos = 0;
        const row: any = {
          hora: `${hora.toString().padStart(2, '0')}:00`,
          unidades: 0
        };
        centrosList.forEach((centro) => {
          const cant = centrosData[centro] || 0;
          row[centro] = cant;
          totalBultos += cant;
        });
        row.unidades = totalBultos * 16;
        return row;
      });

      // Ordenar por hora
      rows.sort((a, b) => a.hora.localeCompare(b.hora));
      setDatos(rows);
    } catch (e: any) {
      console.error('Error cargando informe:', e);
      setMensaje('Error al cargar el informe: ' + (e.message || 'Desconocido'));
    }
    setCargando(false);
  };

  const exportarExcel = () => {
    if (datos.length === 0) return;
    const exportRows = datos.map((row) => {
      const r: any = { 'Hora Finalización': row.hora };
      centros.forEach((c) => {
        r[c] = row[c] || 0;
      });
      r['Unidades'] = row.unidades;
      return r;
    });
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informe');
    XLSX.writeFile(wb, `Informe_Unidades_${fecha}.xlsx`);
  };

  return (
    <div className="sd03-container">
      <div className="sd03-header">
        <h2>Informe Unidades Despachadas</h2>
        <p className="sd03-subtitle">Consolidado por hora de finalización</p>
      </div>

      <div className="sd03-toolbar">
        <div className="sd03-filter-group">
          <label className="sd03-filter-label">Fecha:</label>
          <input
            type="date"
            className="sd03-date-input"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
        <button className="sd03-btn sd03-btn-primary" onClick={cargarInforme} disabled={cargando}>
          {cargando ? 'Consultando...' : 'Actualizar'}
        </button>
        <button className="sd03-btn sd03-btn-success" onClick={exportarExcel} disabled={datos.length === 0}>
          Exportar Excel
        </button>
      </div>

      {mensaje && (
        <div className="sd03-mensaje">{mensaje}</div>
      )}

      <div className="sd03-table-wrapper">
        <table className="sd03-table">
          <thead>
            <tr>
              <th>Hora Finalización</th>
              {centros.map((centro) => (
                <th key={centro}>{centro}</th>
              ))}
              <th>Unidades</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={centros.length + 2} className="sd03-empty">Cargando datos...</td></tr>
            ) : datos.length === 0 ? (
              <tr><td colSpan={centros.length + 2} className="sd03-empty">No hay datos para la fecha seleccionada</td></tr>
            ) : (
              datos.map((row, idx) => (
                <tr key={idx}>
                  <td className="sd03-mono">{row.hora}</td>
                  {centros.map((centro) => (
                    <td key={centro} className="sd03-mono">{row[centro] || 0}</td>
                  ))}
                  <td className="sd03-unidades">{row.unidades}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SD03InformeUnDesp;
