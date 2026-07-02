// src/components/Transactions/AD/AD03Dashboard.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { auth } from '../../../lib/auth';
import './AD03.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = { 'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G' };

const COLORS = ['#15803d', '#dc2626', '#b45309'];

const formatNum = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const CustomScatterTooltip: React.FC<any> = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
        <p style={{ fontWeight: 600, color: '#1d4ed8', margin: '0 0 4px' }}>{data.name}</p>
        <p style={{ margin: '0 0 2px', color: 'var(--text-secondary)' }}>Local: {data.local}</p>
        <p style={{ margin: '0 0 2px', color: 'var(--text-secondary)' }}>SAP: {formatNum(data.sap)} | Físico: {formatNum(data.fisico)}</p>
        <p style={{ margin: '0', fontWeight: 700, color: data.y === 0 ? 'var(--success-text)' : data.y <= 5 ? 'var(--warning-text)' : 'var(--error-text)' }}>{data.y}%</p>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip: React.FC<any> = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
        <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ margin: '2px 0', color: entry.color }}>{entry.name}: <strong>{formatNum(entry.value)}</strong></p>
        ))}
      </div>
    );
  }
  return null;
};

const drawTablePDF = (
  pdf: any, headers: string[], rows: string[][], colWidths: number[],
  startX: number, startY: number, pageWidth: number, margin: number,
  headerBg: number[] = [26, 31, 46], fontSize: number = 8
): number => {
  let y = startY;
  const rowHeight = 6;
  pdf.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  pdf.rect(startX, y, pageWidth - margin * 2, rowHeight, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(fontSize);
  headers.forEach((header: string, i: number) => {
    pdf.text(header, startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0) + 2, y + 4);
  });
  y += rowHeight;
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(fontSize);
  rows.forEach((row: string[], rowIndex: number) => {
    if (y > 275) { pdf.addPage(); y = margin; }
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(248, 250, 253);
      pdf.rect(startX, y, pageWidth - margin * 2, rowHeight, 'F');
    }
    row.forEach((cell: string, i: number) => {
      pdf.text(String(cell), startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0) + 2, y + 4);
    });
    y += rowHeight;
  });
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.rect(startX, startY, pageWidth - margin * 2, y - startY);
  return y + 4;
};

const AD03Dashboard: React.FC = () => {
  const [datos, setDatos]: any = useState([]);
  const [cargando, setCargando]: any = useState(true);
  const [filtroLocal, setFiltroLocal]: any = useState('');
  const [filtroDesde, setFiltroDesde]: any = useState('');
  const [filtroHasta, setFiltroHasta]: any = useState('');
  const [localesData, setLocalesData]: any = useState([]);
  const [tareasPorcentaje, setTareasPorcentaje]: any = useState([]);
  const [cargandoPorcentajes, setCargandoPorcentajes]: any = useState(false);
  const [showInformeModal, setShowInformeModal]: any = useState(false);
  const [textoInforme, setTextoInforme]: any = useState('');
  const [generandoPDF, setGenerandoPDF]: any = useState(false);
  const [detalleDiferencias, setDetalleDiferencias]: any = useState([]);
  const chartBarRef: any = useRef(null);
  const chartPieRef: any = useRef(null);
  const chartScatterRef: any = useRef(null);

  useEffect(() => { cargarLocales(); cargarDatos(); }, []);
  useEffect(() => { cargarDatos(); }, [filtroLocal, filtroDesde, filtroHasta]);

  const cargarLocales = async () => {
    try {
      const resp = await fetch(API_URL + '/ad_auditorias?select=codigo_local,nombre_local', { headers: HEADERS });
      const data = await resp.json();
      if (data) {
        const mapa = new Map<string, string>();
        data.forEach((d: any) => { if (!mapa.has(d.codigo_local)) mapa.set(d.codigo_local, d.nombre_local); });
        setLocalesData(Array.from(mapa.entries()).map(([cod, nom]) => ({ codigo: cod, nombre: nom })));
      }
    } catch (e) {}
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      let url = API_URL + '/ad_auditorias?select=*&order=creado_en.asc';
      if (filtroLocal) url += '&codigo_local=eq.' + filtroLocal;
      if (filtroDesde) url += '&creado_en=gte.' + filtroDesde;
      if (filtroHasta) url += '&creado_en=lte.' + filtroHasta + 'T23:59:59';
      const resp = await fetch(url, { headers: HEADERS });
      const data = await resp.json();
      setDatos(data || []);
    } catch (e) {}
    setCargando(false);
  };

  const cargarPorcentajesTareas = async () => {
    setCargandoPorcentajes(true);
    try {
      const resultados: any[] = [];
      const diferenciasDetalle: any[] = [];
      for (const auditoria of datos) {
        const respSAP = await fetch(API_URL + '/ad_datos_sap?select=*&auditoria_id=eq.' + auditoria.id, { headers: HEADERS });
        const sapData = await respSAP.json();
        const sapConsolidado: Record<string, any> = {};
        (sapData || []).forEach((s: any) => {
          if (!sapConsolidado[s.sku]) sapConsolidado[s.sku] = { sku: s.sku, denominacion: s.denominacion, cantidad_sap: 0 };
          sapConsolidado[s.sku].cantidad_sap += (s.cantidad_sap || 0);
        });
        const respCajas = await fetch(API_URL + '/ad_capturas_cajas?select=id&auditoria_id=eq.' + auditoria.id, { headers: HEADERS });
        const cajas = await respCajas.json();
        const cajaIds = (cajas || []).map((c: any) => c.id);
        let capturas: any[] = [];
        if (cajaIds.length > 0) {
          const idsParam = cajaIds.map((id: string) => '"' + id + '"').join(',');
          const respCap = await fetch(API_URL + '/ad_capturas_skus?select=*&caja_id=in.(' + idsParam + ')', { headers: HEADERS });
          capturas = await respCap.json();
        }
        const fisicoConsolidado: Record<string, number> = {};
        (capturas || []).forEach((c: any) => {
          if (!fisicoConsolidado[c.sku]) fisicoConsolidado[c.sku] = 0;
          fisicoConsolidado[c.sku] += (c.cantidad_fisica || 0);
        });
        let totalSAP = 0; let totalFisico = 0; let diferenciaAbsoluta = 0;
        const todosLosSKUs = new Set([...Object.keys(sapConsolidado), ...Object.keys(fisicoConsolidado)]);
        todosLosSKUs.forEach(sku => {
          const sap = sapConsolidado[sku]?.cantidad_sap || 0;
          const fisico = fisicoConsolidado[sku] || 0;
          totalSAP += sap; totalFisico += fisico;
          diferenciaAbsoluta += Math.abs(sap - fisico);
          if (sap !== fisico) {
            diferenciasDetalle.push({
              tarea: auditoria.numero_tarea, local: auditoria.codigo_local + ' - ' + auditoria.nombre_local,
              sku: sku, denominacion: sapConsolidado[sku]?.denominacion || 'SKU Manual',
              sap: sap, fisico: fisico, diferencia: sap - fisico,
              estado: sap - fisico === 0 ? 'OK' : (sap - fisico > 0 ? 'Pendiente' : 'Con Diferencias'),
            });
          }
        });
        const porcentajeDif = totalSAP > 0 ? (diferenciaAbsoluta / totalSAP) * 100 : 0;
        resultados.push({
          id: auditoria.id, numero_tarea: auditoria.numero_tarea, codigo_local: auditoria.codigo_local,
          nombre_local: auditoria.nombre_local, estado: auditoria.estado,
          totalSAP, totalFisico, diferenciaAbsoluta,
          porcentajeDif: parseFloat(porcentajeDif.toFixed(1)), creado_en: auditoria.creado_en,
        });
      }
      setTareasPorcentaje(resultados);
      setDetalleDiferencias(diferenciasDetalle);
    } catch (e) {}
    setCargandoPorcentajes(false);
  };

  const [porcentajesGlobales, setPorcentajesGlobales]: any = useState({
    totalUnidadesSAP: 0, totalUnidadesFisico: 0, unidadesDiferencia: 0, porcentajeDif: 0,
  });

  useEffect(() => {
    if (datos.length === 0) {
      setPorcentajesGlobales({ totalUnidadesSAP: 0, totalUnidadesFisico: 0, unidadesDiferencia: 0, porcentajeDif: 0 });
      return;
    }
    calcularPorcentajeGlobal(datos);
  }, [datos]);

  const calcularPorcentajeGlobal = async (datosFiltrados: any[]) => {
    try {
      let totalSAP = 0; let totalFisico = 0; let difAbsoluta = 0;
      for (const auditoria of datosFiltrados) {
        const respSAP = await fetch(API_URL + '/ad_datos_sap?select=sku,cantidad_sap&auditoria_id=eq.' + auditoria.id, { headers: HEADERS });
        const sapData = await respSAP.json();
        const sapConsolidado: Record<string, number> = {};
        (sapData || []).forEach((s: any) => {
          if (!sapConsolidado[s.sku]) sapConsolidado[s.sku] = 0;
          sapConsolidado[s.sku] += (s.cantidad_sap || 0);
        });
        const respCajas = await fetch(API_URL + '/ad_capturas_cajas?select=id&auditoria_id=eq.' + auditoria.id, { headers: HEADERS });
        const cajas = await respCajas.json();
        const cajaIds = (cajas || []).map((c: any) => c.id);
        let capturas: any[] = [];
        if (cajaIds.length > 0) {
          const idsParam = cajaIds.map((id: string) => '"' + id + '"').join(',');
          const respCap = await fetch(API_URL + '/ad_capturas_skus?select=sku,cantidad_fisica&caja_id=in.(' + idsParam + ')', { headers: HEADERS });
          capturas = await respCap.json();
        }
        const fisicoConsolidado: Record<string, number> = {};
        (capturas || []).forEach((c: any) => {
          if (!fisicoConsolidado[c.sku]) fisicoConsolidado[c.sku] = 0;
          fisicoConsolidado[c.sku] += (c.cantidad_fisica || 0);
        });
        const todosSKUs = new Set([...Object.keys(sapConsolidado), ...Object.keys(fisicoConsolidado)]);
        todosSKUs.forEach(sku => {
          const sap = sapConsolidado[sku] || 0;
          const fisico = fisicoConsolidado[sku] || 0;
          totalSAP += sap; totalFisico += fisico;
          difAbsoluta += Math.abs(sap - fisico);
        });
      }
      const porcentaje = totalSAP > 0 ? (difAbsoluta / totalSAP) * 100 : 0;
      setPorcentajesGlobales({
        totalUnidadesSAP: totalSAP,
        totalUnidadesFisico: totalFisico,
        unidadesDiferencia: difAbsoluta,
        porcentajeDif: parseFloat(porcentaje.toFixed(1)),
      });
    } catch (e) {}
  };

  const porDia: Record<string, any> = {};
  datos.forEach((d: any) => {
    const dia = new Date(d.creado_en).toLocaleDateString('es-CL');
    if (!porDia[dia]) porDia[dia] = { dia, total: 0, ok: 0, diferencias: 0 };
    porDia[dia].total++;
    if (d.estado === 'Finalizado') porDia[dia].ok++;
    if (d.estado === 'Con Diferencias') porDia[dia].diferencias++;
  });
  const datosBarra = Object.values(porDia).map((d: any) => ({ ...d, porcentajeDif: d.total > 0 ? ((d.diferencias / d.total) * 100).toFixed(1) : '0' }));
  const total = datos.length;
  const finalizadas = datos.filter((d: any) => d.estado === 'Finalizado').length;
  const conDiferencias = datos.filter((d: any) => d.estado === 'Con Diferencias').length;
  const pendientes = datos.filter((d: any) => d.estado === 'Pendiente' || d.estado === 'En Proceso').length;
  const totalCerradas = finalizadas + conDiferencias;
  const porcentajeDiferenciasTareas = totalCerradas > 0 ? ((conDiferencias / totalCerradas) * 100).toFixed(1) : '0';
  const datosPie = [
    { name: 'OK', value: finalizadas }, { name: 'Con Diferencias', value: conDiferencias }, { name: 'Pendientes', value: pendientes },
  ].filter((d: any) => d.value > 0);
  const datosScatter = tareasPorcentaje.map((t: any, index: number) => ({
    x: index + 1, y: t.porcentajeDif, name: t.numero_tarea, local: t.codigo_local, sap: t.totalSAP, fisico: t.totalFisico,
    fill: t.porcentajeDif === 0 ? '#15803d' : t.porcentajeDif <= 5 ? '#f59e0b' : '#dc2626',
  }));

  const generarPDF = async () => {
    setGenerandoPDF(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; const margin = 12; let yPos = margin;
      const usuario = auth.getUsuario();
      const nombreUsuario = usuario ? usuario.nombre + ' ' + usuario.apellido : 'Usuario';
      const fechaInforme = new Date().toLocaleDateString('es-CL');
      const nombreLocal = filtroLocal ? localesData.find((l: any) => l.codigo === filtroLocal)?.nombre || filtroLocal : 'Todos los locales';

      pdf.setFillColor(26, 31, 46); pdf.rect(0, 0, pageWidth, 55, 'F');
      pdf.setFillColor(220, 38, 38); pdf.rect(0, 55, pageWidth, 3, 'F');
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(26);
      pdf.text('Informe de Auditoría', margin, 28); pdf.setFontSize(13);
      pdf.text('FASHIONSPARK · Docxentra SGD', margin, 40);
      pdf.setTextColor(30, 41, 59); pdf.setFontSize(11); yPos = 68;

      const infoItems: [string, string][] = [
        ['Período:', (filtroDesde || 'Inicio') + ' — ' + (filtroHasta || 'Fin')],
        ['Local:', nombreLocal], ['Generado por:', nombreUsuario], ['Fecha:', fechaInforme],
      ];
      infoItems.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold'); pdf.text(label, margin, yPos);
        pdf.setFont('helvetica', 'normal'); pdf.text(value, margin + 35, yPos); yPos += 7;
      });

      if (textoInforme.trim()) {
        yPos += 8;
        pdf.setFillColor(248, 250, 253); pdf.rect(margin - 3, yPos - 5, pageWidth - margin * 2 + 6, 8, 'F');
        pdf.setFontSize(13); pdf.setTextColor(26, 31, 46); pdf.setFont('helvetica', 'bold');
        pdf.text('Resumen Ejecutivo', margin, yPos); yPos += 8;
        pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(71, 85, 105);
        const lines = pdf.splitTextToSize(textoInforme, pageWidth - margin * 2);
        pdf.text(lines, margin, yPos); yPos += lines.length * 4.5 + 8;
      }

      yPos += 2;
      pdf.setFontSize(13); pdf.setTextColor(26, 31, 46); pdf.setFont('helvetica', 'bold');
      pdf.text('Indicadores Clave (KPIs)', margin, yPos); yPos += 8;
      const kpiCards = [
        { label: 'Total Auditorías', value: formatNum(total), color: [30, 41, 59] },
        { label: 'Finalizadas OK', value: formatNum(finalizadas), color: [21, 128, 61] },
        { label: 'Con Diferencias', value: formatNum(conDiferencias), color: [220, 38, 38] },
        { label: 'Pendientes', value: formatNum(pendientes), color: [180, 83, 9] },
        { label: '% Tareas con Dif.', value: porcentajeDiferenciasTareas + '%', color: [220, 38, 38] },
        { label: '% Unidades con Dif.', value: porcentajesGlobales.porcentajeDif + '%', color: [220, 38, 38] },
      ];
      const cardWidth = (pageWidth - margin * 2 - 12) / 3;
      kpiCards.forEach((kpi, i) => {
        const col = i % 3; const row = Math.floor(i / 3);
        const x = margin + col * (cardWidth + 6); const cy = yPos + row * 22;
        pdf.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        pdf.roundedRect(x, cy, cardWidth, 18, 3, 3, 'F');
        pdf.setTextColor(255, 255, 255); pdf.setFontSize(8);
        pdf.text(kpi.label, x + 4, cy + 7); pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold'); pdf.text(kpi.value, x + 4, cy + 15);
      });
      yPos += 50;

      if (chartBarRef.current) {
        if (yPos > 180) { pdf.addPage(); yPos = margin; }
        pdf.setFontSize(13); pdf.setTextColor(26, 31, 46); pdf.setFont('helvetica', 'bold');
        pdf.text('Auditorías por Día', margin, yPos); yPos += 5;
        const canvasBar = await html2canvas(chartBarRef.current, { scale: 2, backgroundColor: '#ffffff' });
        const imgBar = canvasBar.toDataURL('image/png');
        const imgWidth = pageWidth - margin * 2; const imgHeight = (canvasBar.height * imgWidth) / canvasBar.width;
        if (yPos + imgHeight > 280) { pdf.addPage(); yPos = margin; }
        pdf.addImage(imgBar, 'PNG', margin, yPos, imgWidth, imgHeight); yPos += imgHeight + 8;
      }
      if (chartPieRef.current) {
        if (yPos > 180) { pdf.addPage(); yPos = margin; }
        pdf.setFontSize(13); pdf.setTextColor(26, 31, 46); pdf.setFont('helvetica', 'bold');
        pdf.text('Distribución de Estados', margin, yPos); yPos += 5;
        const canvasPie = await html2canvas(chartPieRef.current, { scale: 2, backgroundColor: '#ffffff' });
        const imgPie = canvasPie.toDataURL('image/png');
        const imgWidth = pageWidth - margin * 2; const imgHeight = (canvasPie.height * imgWidth) / canvasPie.width;
        if (yPos + imgHeight > 280) { pdf.addPage(); yPos = margin; }
        pdf.addImage(imgPie, 'PNG', margin, yPos, imgWidth, imgHeight); yPos += imgHeight + 8;
      }
      if (chartScatterRef.current) {
        if (yPos > 180) { pdf.addPage(); yPos = margin; }
        pdf.setFontSize(13); pdf.setTextColor(26, 31, 46); pdf.setFont('helvetica', 'bold');
        pdf.text('% Diferencias de Unidades por Tarea', margin, yPos); yPos += 5;
        const canvasScatter = await html2canvas(chartScatterRef.current, { scale: 2, backgroundColor: '#ffffff' });
        const imgScatter = canvasScatter.toDataURL('image/png');
        const imgWidth = pageWidth - margin * 2; const imgHeight = (canvasScatter.height * imgWidth) / canvasScatter.width;
        if (yPos + imgHeight > 280) { pdf.addPage(); yPos = margin; }
        pdf.addImage(imgScatter, 'PNG', margin, yPos, imgWidth, imgHeight); yPos += imgHeight + 10;
      }
      if (tareasPorcentaje.length > 0) {
        pdf.addPage(); yPos = margin;
        pdf.setFontSize(13); pdf.setTextColor(26, 31, 46); pdf.setFont('helvetica', 'bold');
        pdf.text('Análisis de Diferencias por Tarea', margin, yPos); yPos += 8;
        const headersTarea = ['Tarea', 'Local', 'SAP', 'Físico', 'Dif.', '% Dif.'];
        const colWidthsTarea = [38, 55, 25, 25, 22, 21];
        const rowsTarea = tareasPorcentaje.map((t: any) => [t.numero_tarea, t.codigo_local + ' - ' + t.nombre_local, formatNum(t.totalSAP), formatNum(t.totalFisico), formatNum(t.diferenciaAbsoluta), t.porcentajeDif + '%']);
        yPos = drawTablePDF(pdf, headersTarea, rowsTarea, colWidthsTarea, margin, yPos, pageWidth, margin, [26, 31, 46], 8);
      }
      if (detalleDiferencias.length > 0) {
        pdf.addPage(); yPos = margin;
        pdf.setFontSize(13); pdf.setTextColor(26, 31, 46); pdf.setFont('helvetica', 'bold');
        pdf.text('Detalle de Diferencias por SKU', margin, yPos); yPos += 8;
        const headersDif = ['Tarea', 'SKU', 'Descripción', 'SAP', 'Físico', 'Dif.', 'Est.'];
        const colWidthsDif = [35, 28, 52, 22, 22, 20, 15];
        const rowsDif = detalleDiferencias.map((d: any) => [d.tarea, d.sku, d.denominacion.length > 38 ? d.denominacion.substring(0, 35) + '...' : d.denominacion, formatNum(d.sap), formatNum(d.fisico), formatNum(d.diferencia), d.estado === 'Pendiente' ? 'Pend.' : d.estado === 'Con Diferencias' ? 'C/Dif.' : d.estado]);
        yPos = drawTablePDF(pdf, headersDif, rowsDif, colWidthsDif, margin, yPos, pageWidth, margin, [26, 31, 46], 7);
      }
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i); pdf.setFontSize(7); pdf.setTextColor(148, 163, 184); pdf.setFont('helvetica', 'normal');
        pdf.text('Generado por Docxentra SGD · ' + fechaInforme + ' · Página ' + i + ' de ' + totalPages, margin, 292);
      }
      pdf.save('Informe_Auditoria_' + fechaInforme.replace(/\//g, '-') + '.pdf');
    } catch (e) { console.error('Error generando PDF:', e); alert('Error al generar el PDF'); }
    finally { setGenerandoPDF(false); }
  };

  return (
    <div className="ad03-view">
      <div className="ad03-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dashboard Auditoría</h2>
        <button className="ad03-btn-aplicar" onClick={() => { setShowInformeModal(true); cargarPorcentajesTareas(); }} style={{ background: '#15803d' }}>Generar Informe PDF</button>
      </div>
      <div className="ad03-filtros">
        <select value={filtroLocal} onChange={(e: any) => setFiltroLocal(e.target.value)}>
          <option value="">Todos los locales</option>
          {localesData.map((l: any) => <option key={l.codigo} value={l.codigo}>{l.codigo} - {l.nombre}</option>)}
        </select>
        <input type="date" value={filtroDesde} onChange={(e: any) => setFiltroDesde(e.target.value)} placeholder="Desde" />
        <input type="date" value={filtroHasta} onChange={(e: any) => setFiltroHasta(e.target.value)} placeholder="Hasta" />
        <button className="ad03-btn-aplicar" onClick={cargarDatos}>Aplicar Filtros</button>
        <button className="ad03-btn-aplicar" onClick={cargarPorcentajesTareas} disabled={cargandoPorcentajes} style={{ background: '#1d4ed8' }}>
          {cargandoPorcentajes ? 'Calculando...' : 'Calcular % por Tarea'}
        </button>
      </div>
      <div className="ad03-kpis">
        <div className="ad03-kpi"><span>Total Auditorías</span><strong>{formatNum(total)}</strong></div>
        <div className="ad03-kpi ad03-kpi-ok"><span>Finalizadas OK</span><strong>{formatNum(finalizadas)}</strong></div>
        <div className="ad03-kpi ad03-kpi-diff"><span>Con Diferencias</span><strong>{formatNum(conDiferencias)}</strong></div>
        <div className="ad03-kpi ad03-kpi-pend"><span>Pendientes</span><strong>{formatNum(pendientes)}</strong></div>
        <div className="ad03-kpi ad03-kpi-porc"><span>% Tareas con Dif.</span><strong>{porcentajeDiferenciasTareas}%</strong></div>
        <div className="ad03-kpi ad03-kpi-porc" style={{ background: porcentajesGlobales.porcentajeDif > 0 ? 'var(--error-bg)' : 'var(--bg-card)' }}>
          <span>% Unidades con Dif.</span>
          <strong style={{ color: porcentajesGlobales.porcentajeDif > 0 ? 'var(--error-text)' : 'var(--success-text)' }}>{porcentajesGlobales.porcentajeDif}%</strong>
          <small style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>{formatNum(porcentajesGlobales.unidadesDiferencia)} de {formatNum(porcentajesGlobales.totalUnidadesSAP)} un</small>
        </div>
      </div>
      <div className="ad03-charts">
        <div className="ad03-chart" ref={chartBarRef}>
          <h3>Auditorías por Día</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosBarra}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="dia" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11, formatter: (val: number) => formatNum(val) }} allowDecimals={false} />
              <Tooltip content={<CustomBarTooltip />} /><Legend />
              <Bar dataKey="ok" fill="#15803d" radius={[4,4,0,0]} name="OK" />
              <Bar dataKey="diferencias" fill="#dc2626" radius={[4,4,0,0]} name="Con Diferencias" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="ad03-chart" ref={chartPieRef}>
          <h3>Distribución de Estados</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={datosPie} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, value }) => name + ': ' + formatNum(value)}>
                {datosPie.map((_: any, index: number) => <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: any) => formatNum(value)} /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="ad03-tabla-container" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>Resumen por Día</h3>
        <table className="ed03-tabla">
          <thead><tr><th>Día</th><th>Total</th><th>OK</th><th>Diferencias</th><th>% Dif. Tareas</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando...</td></tr> :
              datosBarra.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin datos</td></tr> :
              datosBarra.map((d: any, i: number) => {
                const cerradas = d.ok + d.diferencias; const pctTareas = cerradas > 0 ? ((d.diferencias / cerradas) * 100).toFixed(1) : '0';
                return (<tr key={i}><td className="ed03-ticket-id">{d.dia}</td><td>{formatNum(d.total)}</td><td>{formatNum(d.ok)}</td><td style={{ color: '#dc2626', fontWeight: 600 }}>{formatNum(d.diferencias)}</td><td style={{ fontWeight: 600, color: '#dc2626' }}>{pctTareas}%</td></tr>);
              })}
          </tbody>
        </table>
      </div>
      <div className="ad03-tabla-container" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>Análisis de Diferencias por Tarea</h3>
        <table className="ed03-tabla">
          <thead><tr><th>Tarea</th><th>Local</th><th>Estado</th><th>Total SAP</th><th>Total Físico</th><th>Dif. Absoluta</th><th>% Dif.</th><th>Fecha</th></tr></thead>
          <tbody>
            {tareasPorcentaje.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-placeholder)' }}>{cargandoPorcentajes ? 'Calculando...' : 'Haz clic en "Calcular % por Tarea"'}</td></tr>
            ) : (
              tareasPorcentaje.map((t: any, i: number) => (
                <tr key={t.id} style={{ background: t.porcentajeDif > 0 ? 'var(--error-bg)' : 'transparent' }}>
                  <td className="ed03-ticket-id">{t.numero_tarea}</td><td>{t.codigo_local} - {t.nombre_local}</td><td>{t.estado}</td>
                  <td style={{ textAlign: 'center' }}>{formatNum(t.totalSAP)}</td><td style={{ textAlign: 'center' }}>{formatNum(t.totalFisico)}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: t.diferenciaAbsoluta > 0 ? 'var(--error-text)' : 'var(--success-text)' }}>{t.diferenciaAbsoluta > 0 ? formatNum(t.diferenciaAbsoluta) : '-'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}><span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', background: t.porcentajeDif === 0 ? 'var(--success-bg)' : t.porcentajeDif <= 5 ? 'var(--warning-bg)' : 'var(--error-bg)', color: t.porcentajeDif === 0 ? 'var(--success-text)' : t.porcentajeDif <= 5 ? 'var(--warning-text)' : 'var(--error-text)' }}>{t.porcentajeDif}%</span></td>
                  <td>{new Date(t.creado_en).toLocaleDateString('es-CL')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {tareasPorcentaje.length > 0 && (
        <div className="ad03-chart" ref={chartScatterRef}>
          <h3>% Diferencias de Unidades por Tarea</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" dataKey="x" stroke="var(--text-muted)" tick={{ fontSize: 11 }} label={{ value: 'Tareas', position: 'bottom', offset: 40, style: { fill: 'var(--text-muted)', fontSize: 12 } }} domain={[0, datosScatter.length + 1]} />
              <YAxis type="number" dataKey="y" stroke="var(--text-muted)" tick={{ fontSize: 11 }} unit="%" label={{ value: '% Diferencias', angle: -90, position: 'left', offset: 20, style: { fill: 'var(--text-muted)', fontSize: 12 } }} />
              <ZAxis range={[100, 100]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomScatterTooltip />} />
              <Scatter data={datosScatter} shape="circle" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
      {showInformeModal && (
        <div className="sd01-modal-overlay" onClick={() => setShowInformeModal(false)}>
          <div className="sd01-modal" style={{ maxWidth: '650px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="sd01-modal-header"><h2>Generar Informe PDF</h2><button className="sd01-modal-close" onClick={() => setShowInformeModal(false)}>×</button></div>
            <div className="sd01-modal-body">
              <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}><strong>Período:</strong> {filtroDesde || 'Inicio'} - {filtroHasta || 'Fin'} | <strong>Local:</strong> {filtroLocal || 'Todos'}</div>
              <div className="sd01-form-group"><label className="sd01-form-label">Resumen Ejecutivo (opcional)</label><textarea value={textoInforme} onChange={(e: any) => setTextoInforme(e.target.value)} rows={6} placeholder="Escribe tus conclusiones..." style={{ width: '100%', padding: '10px', border: '1px solid var(--border-input)', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', background: 'var(--bg-input)', color: 'var(--text-primary)' }} /></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>El PDF incluirá: Portada, KPIs, Gráficos, Tabla de Análisis y Detalle de Diferencias por SKU.</div>
            </div>
            <div className="sd01-modal-footer"><button className="sd01-btn-cancel" onClick={() => setShowInformeModal(false)}>Cancelar</button><button className="sd01-btn-save" onClick={generarPDF} disabled={generandoPDF} style={{ background: '#15803d' }}>{generandoPDF ? 'Generando PDF...' : 'Generar PDF'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AD03Dashboard;
