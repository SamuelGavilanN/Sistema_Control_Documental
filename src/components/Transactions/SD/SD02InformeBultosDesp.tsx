// src/components/Transactions/SD/SD02InformeBultosDesp.tsx

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { cache } from '../../../lib/cache';
import { auth } from '../../../lib/auth';
import './SD02.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface InformeRow {
  id_transporte: string;
  id_documento: string;
  fecha_programacion: string;
  codigo_local: string;
  nombre_local: string;
  fecha_entrega: string;
  hora_entrega: string;
  bultos_solicitados: number;
  bultos_despachados: number;
}

const SD02InformeBultosDesp: React.FC = () => {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [rows, setRows] = useState<InformeRow[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });
  const [totalSolicitados, setTotalSolicitados] = useState(0);
  const [totalDespachados, setTotalDespachados] = useState(0);
  const usuario = auth.getUsuario();

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  // Formatear fecha para consulta (usa la fecha tal cual para evitar desfase)
  const formatearFechaConsulta = (fecha: string) => {
    if (!fecha) return '';
    // Supabase espera YYYY-MM-DD
    return fecha;
  };

  const cargarInforme = useCallback(async () => {
    // Validaciones
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      mostrarMensaje('error', 'La fecha "desde" no puede ser mayor que la fecha "hasta"');
      return;
    }

    setCargando(true);
    setRows([]);
    setTotalSolicitados(0);
    setTotalDespachados(0);

    try {
      // Construir filtros dinámicamente
      let filtros = '';
      if (fechaDesde) filtros += `&fecha_programacion=gte.${fechaDesde}`;
      if (fechaHasta) filtros += `&fecha_programacion=lte.${fechaHasta}T23:59:59`;

      const cacheKey = `informe_bultos_desp_${fechaDesde}_${fechaHasta}`;
      const cacheTTL = 300000; // 5 minutos
      const cached = cache.get<InformeRow[]>(cacheKey);

      if (cached) {
        setRows(cached);
        calcularTotales(cached);
      } else {
        // 1. Obtener transportes filtrados por fecha de programación
        const respTransportes = await fetch(
          `${API_URL}/sd01_documentos?select=id,id_documento,fecha_programacion&order=fecha_programacion.asc${filtros}`,
          { headers: HEADERS }
        );
        if (!respTransportes.ok) throw new Error('Error al obtener transportes');
        const transportes = await respTransportes.json();

        if (!transportes || transportes.length === 0) {
          setRows([]);
          setCargando(false);
          mostrarMensaje('info', 'No hay transportes en el rango seleccionado');
          return;
        }

        // 2. Para cada transporte, obtener sus locales y bultos
        const informeRows: InformeRow[] = [];

        for (const transporte of transportes) {
          // Obtener locales del transporte
          const respLocales = await fetch(
            `${API_URL}/sd01_documento_locales?select=id,codigo_local,nombre_local,fecha_entrega,hora_entrega,cantidad_solicitada&documento_id=eq.${transporte.id_documento}`,
            { headers: HEADERS }
          );
          if (!respLocales.ok) continue;
          const locales = await respLocales.json();

          // Para cada local, obtener bultos despachados (suma de cantidades)
          for (const local of locales) {
            const respBultos = await fetch(
              `${API_URL}/sd01_bultos?select=cantidad&local_id=eq.${local.id}`,
              { headers: HEADERS }
            );
            if (!respBultos.ok) continue;
            const bultos = await respBultos.json();

            const bultosDespachados = Array.isArray(bultos)
              ? bultos.reduce((sum: number, b: any) => sum + (b.cantidad || 0), 0)
              : 0;

            informeRows.push({
              id_transporte: transporte.id_documento,
              id_documento: transporte.id_documento,
              fecha_programacion: transporte.fecha_programacion ? formatearFechaLectura(transporte.fecha_programacion) : '-',
              codigo_local: local.codigo_local,
              nombre_local: local.nombre_local || '-',
              fecha_entrega: local.fecha_entrega ? formatearFechaLectura(local.fecha_entrega) : '-',
              hora_entrega: local.hora_entrega || '-',
              bultos_solicitados: local.cantidad_solicitada || 0,
              bultos_despachados: bultosDespachados
            });
          }
        }

        cache.set(cacheKey, informeRows, cacheTTL);
        setRows(informeRows);
        calcularTotales(informeRows);
      }

      setCargando(false);
    } catch (e) {
      console.error('Error cargando informe:', e);
      mostrarMensaje('error', 'Error al cargar el informe');
      setCargando(false);
    }
  }, [fechaDesde, fechaHasta]);

  // Formatear fecha para lectura (sin desfase UTC)
  const formatearFechaLectura = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL', { timeZone: 'UTC' });
  };

  const calcularTotales = (data: InformeRow[]) => {
    const totalSol = data.reduce((sum, row) => sum + (row.bultos_solicitados || 0), 0);
    const totalDesp = data.reduce((sum, row) => sum + (row.bultos_despachados || 0), 0);
    setTotalSolicitados(totalSol);
    setTotalDespachados(totalDesp);
  };

  const exportarExcel = () => {
    if (rows.length === 0) {
      mostrarMensaje('warning', 'No hay datos para exportar');
      return;
    }

    const dataExport = rows.map(row => ({
      'Numero Transporte': row.id_transporte,
      'Fecha Programación': row.fecha_programacion,
      'Código Local': row.codigo_local,
      'Nombre Local': row.nombre_local,
      'Fecha Entrega': row.fecha_entrega,
      'Hora Entrega': row.hora_entrega,
      'Bultos Solicitados': row.bultos_solicitados,
      'Bultos Despachados': row.bultos_despachados
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informe Bultos');

    // Filas de totales al final
    const totalRow = {
      'Numero Transporte': '',
      'Fecha Programación': '',
      'Código Local': '',
      'Nombre Local': 'TOTALES',
      'Fecha Entrega': '',
      'Hora Entrega': '',
      'Bultos Solicitados': totalSolicitados,
      'Bultos Despachados': totalDespachados
    };
    XLSX.utils.sheet_add_json(ws, [totalRow], { origin: -1 });

    XLSX.writeFile(wb, `Informe_Bultos_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.xlsx`);
  };

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setRows([]);
    setTotalSolicitados(0);
    setTotalDespachados(0);
    cache.invalidatePrefix('informe_bultos_desp_');
  };

  return (
    <div className="sd02-container">
      <div className="sd02-header">
        <h2>Informe Bultos Despachados</h2>
        <p className="sd02-subtitle">Desglose de bultos por transporte y local</p>
      </div>

      {/* Barra de filtros y acciones */}
      <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: 'var(--bg-panel)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600 }}>Desde:</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid var(--border-input)',
              borderRadius: '6px',
              fontSize: '13px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600 }}>Hasta:</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid var(--border-input)',
              borderRadius: '6px',
              fontSize: '13px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <button
          onClick={() => cargarInforme()}
          className="sd01-btn sd01-btn-primary"
          style={{ padding: '8px 16px' }}
        >
          {cargando ? 'Cargando...' : 'Actualizar'}
        </button>

        <button
          onClick={limpiarFiltros}
          className="sd01-btn"
          style={{ padding: '8px 16px' }}
        >
          Limpiar
        </button>

        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={exportarExcel}
            className="sd01-btn"
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            disabled={rows.length === 0}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2H12V14H4V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M6 5H10M6 8H10M6 11H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Resumen de totales */}
      {rows.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '15px',
          padding: '12px',
          backgroundColor: 'var(--bg-section)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Registros:</span>
            <strong style={{ marginLeft: '6px' }}>{rows.length}</strong>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bultos Solicitados:</span>
            <strong style={{ marginLeft: '6px', color: 'var(--text-primary)' }}>{totalSolicitados}</strong>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bultos Despachados:</span>
            <strong style={{ marginLeft: '6px', color: 'var(--text-primary)' }}>{totalDespachados}</strong>
          </div>
        </div>
      )}

      {mensaje.visible && (
        <div style={{
          padding: '10px',
          borderRadius: '6px',
          marginBottom: '15px',
          fontSize: '13px',
          fontWeight: 500,
          background: mensaje.tipo === 'success' ? 'var(--success-bg)' : 
                      mensaje.tipo === 'error' ? 'var(--error-bg)' : 
                      mensaje.tipo === 'warning' ? 'var(--warning-bg)' : 'var(--info-bg)',
          color: mensaje.tipo === 'success' ? 'var(--success-text)' : 
                 mensaje.tipo === 'error' ? 'var(--error-text)' : 
                 mensaje.tipo === 'warning' ? 'var(--warning-text)' : 'var(--info-text)',
          border: mensaje.tipo === 'success' ? '1px solid var(--success-border)' : 
                  mensaje.tipo === 'error' ? '1px solid var(--error-border)' : 
                  mensaje.tipo === 'warning' ? '1px solid var(--warning-border)' : '1px solid var(--info-border)'
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* Tabla de resultados */}
      <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
        <table className="sd01-table" style={{ minWidth: '1200px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--table-header-bg)' }}>
            <tr>
              <th style={{ textAlign: 'left' }}>N° Transporte</th>
              <th>Fecha Programación</th>
              <th>Código Local</th>
              <th style={{ textAlign: 'left' }}>Nombre Local</th>
              <th>Fecha Entrega</th>
              <th>Hora Entrega</th>
              <th style={{ textAlign: 'right' }}>Bultos Solicitados</th>
              <th style={{ textAlign: 'right' }}>Bultos Despachados</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Cargando informe...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {fechaDesde || fechaHasta ? 'No hay datos para el rango seleccionado. Presione "Actualizar".' : 'Seleccione un rango de fechas y presione "Actualizar".'}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.id_documento}_${row.codigo_local}_${index}`}>
                  <td className="sd01-id-documento">{row.id_transporte}</td>
                  <td>{row.fecha_programacion}</td>
                  <td>{row.codigo_local}</td>
                  <td style={{ textAlign: 'left' }}>{row.nombre_local}</td>
                  <td>{row.fecha_entrega}</td>
                  <td>{row.hora_entrega}</td>
                  <td style={{ textAlign: 'right' }}>{row.bultos_solicitados}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.bultos_despachados}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SD02InformeBultosDesp;
