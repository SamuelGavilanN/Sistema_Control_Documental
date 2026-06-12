// src/components/Transactions/AD/AD01View.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import * as XLSX from 'xlsx';
import './AD01.css';

interface Auditoria {
  id: string;
  numero_tarea: string;
  codigo_local: string;
  nombre_local: string;
  acta: string;
  guia: string;
  usuario_asignado: string;
  estado: string;
  creado_en: string;
}

const AD01View: React.FC = () => {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [auditoriaDetalle, setAuditoriaDetalle] = useState<any>(null);
  const [datosDetalle, setDatosDetalle] = useState<any[]>([]);
  const [datosSAP, setDatosSAP] = useState<any[]>([]);
  const [archivoSAP, setArchivoSAP] = useState<File | null>(null);
  const [archivoCorreo, setArchivoCorreo] = useState<File | null>(null);
  const [nombreArchivoSAP, setNombreArchivoSAP] = useState('');
  const [nombreArchivoCorreo, setNombreArchivoCorreo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [skusExpandidos, setSkusExpandidos] = useState<Set<string>>(new Set());

  useEffect(() => { cargarAuditorias(); cargarUsuarios(); }, []);
  useEffect(() => { const intervalo = setInterval(cargarAuditorias, 10000); return () => clearInterval(intervalo); }, []);
  useEffect(() => { if (!showDetalleModal || !auditoriaDetalle) return; const intervalo = setInterval(() => { verDetalleSilencioso(auditoriaDetalle); }, 5000); return () => clearInterval(intervalo); }, [showDetalleModal, auditoriaDetalle]);

  const cargarUsuarios = async () => {
    const { data } = await supabase.from('usuarios').select('id, nombre, apellido, rol');
    if (data) { setUsuarios(data); const m: Record<string, string> = {}; data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido}`; }); setNombresUsuarios(m); }
  };

  const cargarAuditorias = async () => {
    const { data } = await supabase.from('ad_auditorias').select('*').order('creado_en', { ascending: false });
    if (data) setAuditorias(data); setCargando(false);
  };

  const obtenerCantidad = (item: any): number => {
    const keys = Object.keys(item); const keyCantidad = keys.find(k => k.toLowerCase().includes('cantidad'));
    if (keyCantidad) return parseInt(String(item[keyCantidad]).trim()) || 0; return 0;
  };

  const procesarArchivos = async () => {
    if (!archivoSAP || !archivoCorreo) { alert('Selecciona ambos archivos'); return; }
    setProcesando(true);
    try {
      const dataSAP = await leerExcel(archivoSAP); const dataCorreo = await leerExcel(archivoCorreo);
      const mapaCorreo: Record<string, { acta: string; guia: string }> = {};
      dataCorreo.forEach((row: any) => { const d = String(row['Despacho HC'] || '').trim(); if (d) mapaCorreo[d] = { acta: String(row['Acta'] || '').trim(), guia: String(row['Guía'] || row['Guia'] || '').trim() }; });
      const grupos: Record<string, { nombre: string; entregas: Set<string>; items: any[] }> = {};
      dataSAP.forEach((row: any) => { const c = String(row['Destinat.'] || '').trim(); if (!c) return; if (!grupos[c]) grupos[c] = { nombre: String(row['Nombre destinatario de mercancías'] || '').trim(), entregas: new Set(), items: [] }; grupos[c].entregas.add(String(row['Entrega'] || '').trim()); grupos[c].items.push(row); });
      for (const [cod, g] of Object.entries(grupos)) {
        let acta = '', guia = '';
        for (const e of g.entregas) { if (mapaCorreo[e]) { acta = mapaCorreo[e].acta; guia = mapaCorreo[e].guia; break; } }
        const { data: tarea } = await supabase.rpc('generar_numero_auditoria');
        const { data: aud } = await supabase.from('ad_auditorias').insert([{ numero_tarea: tarea, codigo_local: cod, nombre_local: g.nombre, acta, guia, estado: 'Pendiente', creado_por: auth.getUsuario()?.id }]).select('id').single();
        if (!aud) continue;
        await supabase.from('ad_datos_sap').insert(g.items.map((item: any) => ({ auditoria_id: (aud as any).id, entrega: String(item['Entrega'] || '').trim(), denominacion: String(item['Denominación'] || item['Denominacion'] || '').trim(), codigo_local: cod, nombre_local: g.nombre, sku: String(item['Material'] || '').trim(), cantidad_sap: obtenerCantidad(item) })));
      }
      setMensaje('Auditorías creadas'); setNombreArchivoSAP(''); setNombreArchivoCorreo(''); setArchivoSAP(null); setArchivoCorreo(null);
      setTimeout(() => { setMensaje(''); setShowCrearModal(false); }, 1500); cargarAuditorias();
    } catch (e: any) { alert('Error: ' + e.message); } finally { setProcesando(false); }
  };

  const leerExcel = (file: File): Promise<any[]> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => { const data = new Uint8Array(e.target?.result as ArrayBuffer); const wb = XLSX.read(data, { type: 'array' }); resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); };
    reader.onerror = reject; reader.readAsArrayBuffer(file);
  });

  const handleAsignar = async (id: string, uid: string) => { await supabase.from('ad_auditorias').update({ usuario_asignado: uid || null }).eq('id', id); cargarAuditorias(); };
  const handleReabrir = async (id: string) => { await supabase.from('ad_auditorias').update({ estado: 'En Proceso' }).eq('id', id); cargarAuditorias(); };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    const { data: cajas } = await supabase.from('ad_capturas_cajas').select('id').eq('auditoria_id', id);
    const ids = cajas?.map((c: any) => c.id) || [];
    if (ids.length > 0) await supabase.from('ad_capturas_skus').delete().in('caja_id', ids);
    await supabase.from('ad_capturas_cajas').delete().eq('auditoria_id', id);
    await supabase.from('ad_datos_sap').delete().eq('auditoria_id', id);
    await supabase.from('ad_auditorias').delete().eq('id', id); cargarAuditorias();
  };

  const handleLimpiarCaptura = async (id: string) => {
    if (!confirm('¿Eliminar todas las capturas de esta tarea?')) return;
    const { data: cajas } = await supabase.from('ad_capturas_cajas').select('id').eq('auditoria_id', id);
    const ids = cajas?.map((c: any) => c.id) || [];
    if (ids.length > 0) await supabase.from('ad_capturas_skus').delete().in('caja_id', ids);
    await supabase.from('ad_capturas_cajas').delete().eq('auditoria_id', id);
    await supabase.from('ad_auditorias').update({ estado: 'Pendiente' }).eq('id', id); cargarAuditorias();
  };

  const verDetalle = async (a: Auditoria) => { setAuditoriaDetalle(a); setShowDetalleModal(true); await cargarDatosDetalle(a); };
  const verDetalleSilencioso = async (a: Auditoria) => { await cargarDatosDetalle(a); };

  const cargarDatosDetalle = async (a: Auditoria) => {
    const { data: sap } = await supabase.from('ad_datos_sap').select('*').eq('auditoria_id', a.id);
    setDatosSAP(sap || []);

    const { data: cajas } = await supabase.from('ad_capturas_cajas').select('id, numero_caja').eq('auditoria_id', a.id).order('numero_caja', { ascending: true });
    const cMap: Record<string, number> = {};
    (cajas || []).forEach((c: any) => { cMap[c.id] = c.numero_caja; });

    const cIds = (cajas || []).map((c: any) => c.id);
    let capturas: any[] = [];
    if (cIds.length > 0) {
      const { data } = await supabase.from('ad_capturas_skus').select('*').in('caja_id', cIds).order('capturado_en', { ascending: true });
      capturas = (data || []).map(c => ({ ...c, numero_caja: cMap[c.caja_id] || '-' }));
    }

    // AGRUPAR POR SKU (consolidar + huérfanos)
    const skuMap: Record<string, any> = {};

    // Procesar SKUs de SAP
    (sap || []).forEach((s: any) => {
      const key = String(s.sku || '').trim();
      if (!skuMap[key]) {
        skuMap[key] = { sku: key, denominacion: s.denominacion, entregas: [], cantidad_sap: 0, capturas: [], esHuerfano: false };
      }
      skuMap[key].entregas.push(s.entrega || '-');
      skuMap[key].cantidad_sap += (s.cantidad_sap || 0);
    });

    // Agregar capturas a SKUs de SAP
    Object.keys(skuMap).forEach(sku => {
      skuMap[sku].capturas = capturas.filter((c: any) => String(c.sku || '').trim() === sku);
    });

    // Agregar SKUs huérfanos (capturas sin SAP)
    capturas.forEach((c: any) => {
      const sku = String(c.sku || '').trim();
      if (!skuMap[sku]) {
        skuMap[sku] = {
          sku: sku,
          denominacion: 'SKU AGREGADO MANUALMENTE',
          entregas: ['-'],
          cantidad_sap: 0,
          capturas: [],
          esHuerfano: true,
        };
      }
      // Si ya existe pero la captura no está en el array, agregarla
      if (skuMap[sku] && !skuMap[sku].capturas.find((cap: any) => cap.id === c.id)) {
        skuMap[sku].capturas.push(c);
      }
    });

    // Construir detalle
    const detalle: any[] = [];

    Object.values(skuMap).forEach((item: any) => {
      const totalSAP = item.cantidad_sap;
      const totalFisico = item.capturas.reduce((sum: number, c: any) => sum + (c.cantidad_fisica || 0), 0);
      const diferencia = totalSAP - totalFisico;
      const entregasStr = [...new Set(item.entregas)].join(', ');

      detalle.push({
        sku: item.sku,
        denominacion: item.denominacion,
        entrega: entregasStr,
        cantidad_sap: totalSAP,
        cantidad_fisica: totalFisico,
        diferencia: diferencia,
        capturado: item.capturas.length > 0,
        capturas: item.capturas,
        esHuerfano: item.esHuerfano || false,
      });
    });

    setDatosDetalle(detalle);

    const { data: aa } = await supabase.from('ad_auditorias').select('*').eq('id', a.id).single();
    if (aa) setAuditoriaDetalle(aa);
  };

  const toggleExpandSKU = (sku: string) => {
    const nuevos = new Set(skusExpandidos);
    if (nuevos.has(sku)) { nuevos.delete(sku); } else { nuevos.add(sku); }
    setSkusExpandidos(nuevos);
  };

  const exportarExcel = () => {
    if (!auditoriaDetalle) return;

    const filas: any[] = [];

    datosDetalle.forEach((d: any) => {
      if (d.capturado && d.capturas.length > 0) {
        d.capturas.forEach((cap: any, idx: number) => {
          filas.push({
            'TAREA AUDITORIA': auditoriaDetalle.numero_tarea,
            'CAJA': 'Caja ' + cap.numero_caja,
            'SKU': d.sku,
            'DESCRIPCION': d.denominacion,
            'ENTREGAS': idx === 0 ? d.entrega : '',
            'SAP': idx === 0 ? (d.esHuerfano ? 'N/A' : d.cantidad_sap) : '-',
            'FISICO': cap.cantidad_fisica || 0,
            'DIFERENCIA': idx === 0 ? (d.esHuerfano ? 'N/A' : (d.diferencia === 0 ? 'OK' : d.diferencia)) : '-',
            'ESTADO': idx === 0 ? (d.esHuerfano ? 'Manual' : (d.diferencia === 0 ? 'OK' : 'Pend.')) : '-',
            'ACTA': idx === 0 ? (auditoriaDetalle.acta || '') : '',
            'GUIA': idx === 0 ? (auditoriaDetalle.guia || '') : '',
            'COD LOCAL': idx === 0 ? auditoriaDetalle.codigo_local : '',
            'LOCAL': idx === 0 ? auditoriaDetalle.nombre_local : '',
          });
        });

        if (d.diferencia > 0 && !d.esHuerfano) {
          filas.push({
            'TAREA AUDITORIA': auditoriaDetalle.numero_tarea,
            'CAJA': 'Pendiente (' + d.diferencia + ')',
            'SKU': d.sku,
            'DESCRIPCION': d.denominacion,
            'ENTREGAS': '',
            'SAP': '-',
            'FISICO': 0,
            'DIFERENCIA': '-',
            'ESTADO': 'Pend.',
            'ACTA': '',
            'GUIA': '',
            'COD LOCAL': '',
            'LOCAL': '',
          });
        }
      } else {
        filas.push({
          'TAREA AUDITORIA': auditoriaDetalle.numero_tarea,
          'CAJA': 'Pendiente',
          'SKU': d.sku,
          'DESCRIPCION': d.denominacion,
          'ENTREGAS': d.entrega,
          'SAP': d.esHuerfano ? 'N/A' : d.cantidad_sap,
          'FISICO': 0,
          'DIFERENCIA': d.esHuerfano ? 'N/A' : d.diferencia,
          'ESTADO': d.esHuerfano ? 'Manual' : 'Pend.',
          'ACTA': auditoriaDetalle.acta || '',
          'GUIA': auditoriaDetalle.guia || '',
          'COD LOCAL': auditoriaDetalle.codigo_local,
          'LOCAL': auditoriaDetalle.nombre_local,
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria');
    XLSX.writeFile(wb, `${auditoriaDetalle.numero_tarea}_${auditoriaDetalle.codigo_local}.xlsx`);
  };

  const exportarConsolidadoSKU = () => {
    if (!auditoriaDetalle) return;

    const skuMapCons: Record<string, any> = {};

    datosDetalle.forEach((d: any) => {
      if (!skuMapCons[d.sku]) {
        skuMapCons[d.sku] = { sku: d.sku, denominacion: d.denominacion, cantidad_sap: 0, cantidad_fisica: 0, esHuerfano: d.esHuerfano };
      }
      skuMapCons[d.sku].cantidad_sap += d.cantidad_sap;
      skuMapCons[d.sku].cantidad_fisica += d.cantidad_fisica;
    });

    const filas = Object.values(skuMapCons).map((item: any) => {
      const diferencia = item.cantidad_sap - item.cantidad_fisica;
      const estado = item.esHuerfano ? 'Manual' : (diferencia === 0 ? 'OK' : (diferencia > 0 ? 'Pendiente' : 'Con Diferencias'));
      return {
        'TAREA': auditoriaDetalle.numero_tarea,
        'SKU': item.sku,
        'DESCRIPCION': item.denominacion,
        'SAP': item.esHuerfano ? 'N/A' : item.cantidad_sap,
        'FISICO': item.cantidad_fisica,
        'DIFERENCIA': item.esHuerfano ? 'N/A' : diferencia,
        'ESTADO': estado,
        'LOCAL': auditoriaDetalle.codigo_local + ' - ' + auditoriaDetalle.nombre_local,
      };
    });

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado SKU');
    XLSX.writeFile(wb, `${auditoriaDetalle.numero_tarea}_consolidado_sku.xlsx`);
  };

  const getEstadoBadge = (e: string) => {
    switch (e) { case 'Pendiente': return { color: '#b45309', bg: '#fef3c7' }; case 'En Proceso': return { color: '#1d4ed8', bg: '#dbeafe' }; case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' }; case 'Con Diferencias': return { color: '#dc2626', bg: '#fef2f2' }; default: return { color: '#64748b', bg: '#f1f5f9' }; }
  };

  return (
    <div className="ad01-view">
      <div className="ad01-header"><h2>Gestión de Auditorías</h2><button className="ad01-btn-nueva" onClick={() => setShowCrearModal(true)}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Nueva Auditoría</button></div>
      <div className="ed03-tabla-container">
        <table className="ed03-tabla">
          <thead><tr><th>Tarea</th><th>Tienda</th><th>Acta</th><th>Guía</th><th>Asignado</th><th>Estado</th><th>Fecha</th><th style={{ width: '180px' }}>Acciones</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr> :
              auditorias.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>Sin auditorías</td></tr> :
              auditorias.map(a => {
                const eb = getEstadoBadge(a.estado);
                return (
                  <tr key={a.id}><td className="ed03-ticket-id">{a.numero_tarea}</td><td>{a.codigo_local} - {a.nombre_local}</td><td>{a.acta || '-'}</td><td>{a.guia || '-'}</td>
                    <td><select value={a.usuario_asignado || ''} onChange={e => handleAsignar(a.id, e.target.value)} className="ad01-select-asignar"><option value="">Sin asignar</option>{usuarios.filter(u => u.rol === 'Auditor' || u.rol === 'Admin' || u.rol === 'Owner').map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}</select></td>
                    <td><span style={{ background: eb.bg, color: eb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{a.estado}</span></td><td>{new Date(a.creado_en).toLocaleDateString('es-CL')}</td>
                    <td><div className="ad01-acciones">
                      <button className="ad01-btn-detalle" onClick={() => verDetalle(a)}>Detalle</button>
                      {(a.estado === 'Finalizado' || a.estado === 'Con Diferencias') && <button className="ad01-btn-reabrir" onClick={() => handleReabrir(a.id)}>Reabrir</button>}
                      {a.estado === 'Pendiente' && <button className="ad01-btn-eliminar" onClick={() => handleEliminar(a.id)}>Eliminar</button>}
                      {(a.estado === 'En Proceso' || a.estado === 'Con Diferencias') && <button className="ad01-btn-limpiar" onClick={() => handleLimpiarCaptura(a.id)}>Limpiar</button>}
                    </div></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {showCrearModal && (
        <div className="ed01-modal-overlay" onClick={() => setShowCrearModal(false)}><div className="ed01-modal" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
          <div className="ed01-modal-header"><h2>Nueva Auditoría</h2><button className="ed01-modal-close" onClick={() => setShowCrearModal(false)}>×</button></div>
          <div className="ed01-modal-body">
            <div className="ad01-upload-area"><label className="ad01-upload-label">Archivo BD SAP (.xlsx)</label><div className="ad01-upload-box" onClick={() => document.getElementById('file-sap')?.click()}><input id="file-sap" type="file" accept=".xlsx,.xls" hidden onChange={e => { setArchivoSAP(e.target.files?.[0] || null); setNombreArchivoSAP(e.target.files?.[0]?.name || ''); }} />{nombreArchivoSAP ? <span className="ad01-upload-nombre">{nombreArchivoSAP}</span> : <><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg><span>Seleccionar archivo</span></>}</div></div>
            <div className="ad01-upload-area"><label className="ad01-upload-label">Archivo Correo (.xlsx)</label><div className="ad01-upload-box" onClick={() => document.getElementById('file-correo')?.click()}><input id="file-correo" type="file" accept=".xlsx,.xls" hidden onChange={e => { setArchivoCorreo(e.target.files?.[0] || null); setNombreArchivoCorreo(e.target.files?.[0]?.name || ''); }} />{nombreArchivoCorreo ? <span className="ad01-upload-nombre">{nombreArchivoCorreo}</span> : <><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg><span>Seleccionar archivo</span></>}</div></div>
            {mensaje && <div className="ad01-mensaje">{mensaje}</div>}
          </div>
          <div className="ed01-modal-footer"><button className="ed01-btn-cancel" onClick={() => setShowCrearModal(false)}>Cancelar</button><button className="ed01-btn-save" onClick={procesarArchivos} disabled={procesando}>{procesando ? 'Procesando...' : 'Crear Auditorías'}</button></div>
        </div></div>
      )}

      {showDetalleModal && auditoriaDetalle && (
        <div className="ed01-modal-overlay" onClick={() => setShowDetalleModal(false)}><div className="ed01-modal" style={{ maxWidth: '950px' }} onClick={e => e.stopPropagation()}>
          <div className="ed01-modal-header"><h2>{auditoriaDetalle.numero_tarea} - {auditoriaDetalle.codigo_local} {auditoriaDetalle.nombre_local}</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="ad01-btn-exportar" onClick={exportarExcel}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1V10M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 10V12C1 12.5523 1.44772 13 2 13H12C12.5523 13 13 12.5523 13 12V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Exportar XLSX
              </button>
              <button className="ad01-btn-exportar" onClick={exportarConsolidadoSKU} style={{ background: '#1d4ed8' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1V10M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 10V12C1 12.5523 1.44772 13 2 13H12C12.5523 13 13 12.5523 13 12V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Consolidado SKU
              </button>
              <button className="ed01-modal-close" onClick={() => setShowDetalleModal(false)}>×</button>
            </div>
          </div>
          <div className="ed01-modal-body">
            <div className="ad01-detalle-header"><div><strong>Acta:</strong> {auditoriaDetalle.acta || '-'}</div><div><strong>Guía:</strong> {auditoriaDetalle.guia || '-'}</div><div><strong>Asignado:</strong> {nombresUsuarios[auditoriaDetalle.usuario_asignado] || 'Sin asignar'}</div><div><strong>Estado:</strong> <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: getEstadoBadge(auditoriaDetalle.estado).bg, color: getEstadoBadge(auditoriaDetalle.estado).color }}>{auditoriaDetalle.estado}</span></div></div>

            <div className="ad01-resumen-cards">
              <div className="ad01-resumen-card"><span>Total SAP</span><strong>{datosSAP.reduce((s: number, d: any) => s + (d.cantidad_sap || 0), 0)}</strong></div>
              <div className="ad01-resumen-card"><span>Total Físico</span><strong>{datosDetalle.reduce((s: number, d: any) => s + (d.cantidad_fisica || 0), 0)}</strong></div>
              <div className="ad01-resumen-card"><span>SKUs Revisados</span><strong>{datosDetalle.filter((d: any) => d.capturado).length}/{datosDetalle.length}</strong></div>
              <div className="ad01-resumen-card ad01-resumen-diff"><span>Con Diferencias</span><strong>{datosDetalle.filter((d: any) => d.diferencia !== 0).length}</strong></div>
            </div>

            <div className="ed03-tabla-container" style={{ maxHeight: '400px' }}>
              <table className="ed03-tabla">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>SKU</th>
                    <th>Descripción</th>
                    <th style={{ width: '130px' }}>Entregas</th>
                    <th style={{ width: '70px' }}>SAP</th>
                    <th style={{ width: '70px' }}>Físico</th>
                    <th style={{ width: '60px' }}>Dif.</th>
                    <th style={{ width: '70px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {datosDetalle.map((d: any, i: number) => {
                    const expandido = skusExpandidos.has(d.sku);
                    return (
                      <React.Fragment key={i}>
                        <tr
                          onClick={() => d.capturado && toggleExpandSKU(d.sku)}
                          style={{
                            cursor: d.capturado ? 'pointer' : 'default',
                            background: d.esHuerfano ? '#fef3c7' : (d.capturado ? (d.diferencia === 0 ? '#dcfce7' : '#fef2f2') : '#f8fafd')
                          }}
                        >
                          <td style={{ textAlign: 'center' }}>
                            {d.capturado && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <path d="M4 2L8 6L4 10" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            )}
                          </td>
                          <td className="ed03-ticket-id" style={{ fontSize: '12px' }}>{d.sku}</td>
                          <td style={{ fontSize: '12px' }}>{d.denominacion}</td>
                          <td style={{ fontSize: '11px' }}>{d.entrega}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.esHuerfano ? 'N/A' : d.cantidad_sap}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.capturado ? d.cantidad_fisica : '-'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: d.esHuerfano ? '#92400e' : (d.capturado ? (d.diferencia === 0 ? '#15803d' : '#dc2626') : '#94a3b8') }}>
                            {d.esHuerfano ? 'N/A' : (d.capturado ? (d.diferencia === 0 ? '✓' : d.diferencia) : d.diferencia)}
                          </td>
                          <td>
                            <span style={{
                              padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                              background: d.esHuerfano ? '#fef3c7' : (d.capturado ? (d.diferencia === 0 ? '#dcfce7' : '#fef2f2') : '#f1f5f9'),
                              color: d.esHuerfano ? '#92400e' : (d.capturado ? (d.diferencia === 0 ? '#15803d' : '#dc2626') : '#64748b')
                            }}>
                              {d.esHuerfano ? 'Manual' : (d.capturado ? (d.diferencia === 0 ? 'OK' : 'Dif.') : 'Pend.')}
                            </span>
                          </td>
                        </tr>
                        {expandido && d.capturas && d.capturas.length > 0 && (
                          <tr>
                            <td colSpan={8} style={{ padding: '0' }}>
                              <div style={{ background: '#f8fafd', border: '1px solid #e2e8f0', borderRadius: '8px', margin: '8px 16px', padding: '12px 16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                                  📦 Detalle de Capturas - SKU: {d.sku} {d.esHuerfano ? '(Manual)' : ''}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#64748b', marginBottom: '4px', flexWrap: 'wrap' }}>
                                    <span><strong>Entregas:</strong> {d.entrega}</span>
                                    <span><strong>Total SAP:</strong> {d.esHuerfano ? 'N/A' : d.cantidad_sap + ' un'}</span>
                                    <span><strong>Total Físico:</strong> {d.cantidad_fisica} un</span>
                                    <span><strong>Diferencia:</strong> <span style={{ color: d.esHuerfano ? '#92400e' : (d.diferencia === 0 ? '#15803d' : '#dc2626'), fontWeight: 600 }}>{d.esHuerfano ? 'N/A' : (d.diferencia === 0 ? '0' : d.diferencia)}</span></span>
                                  </div>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead><tr style={{ background: '#f1f5f9' }}><th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Caja</th><th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Cantidad</th><th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Acumulado</th></tr></thead>
                                    <tbody>
                                      {d.capturas.map((cap: any, idx: number) => {
                                        const acumulado = d.capturas.slice(0, idx + 1).reduce((s: number, c: any) => s + (c.cantidad_fisica || 0), 0);
                                        return (
                                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '6px 10px', fontWeight: 500, color: '#1d4ed8' }}>Caja {cap.numero_caja}</td>
                                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>{cap.cantidad_fisica}</td>
                                            <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748b' }}>{acumulado}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div></div>
      )}
    </div>
  );
};

export default AD01View;
