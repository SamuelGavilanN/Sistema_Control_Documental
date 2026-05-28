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

  useEffect(() => { cargarAuditorias(); cargarUsuarios(); }, []);
  useEffect(() => { const intervalo = setInterval(cargarAuditorias, 10000); return () => clearInterval(intervalo); }, []);
  useEffect(() => {
    if (!showDetalleModal || !auditoriaDetalle) return;
    const intervalo = setInterval(() => { verDetalleSilencioso(auditoriaDetalle); }, 5000);
    return () => clearInterval(intervalo);
  }, [showDetalleModal, auditoriaDetalle]);

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
      dataSAP.forEach((row: any) => {
        const c = String(row['Destinat.'] || '').trim(); if (!c) return;
        if (!grupos[c]) grupos[c] = { nombre: String(row['Nombre destinatario de mercancías'] || '').trim(), entregas: new Set(), items: [] };
        grupos[c].entregas.add(String(row['Entrega'] || '').trim()); grupos[c].items.push(row);
      });
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
    const { data: sap } = await supabase.from('ad_datos_sap').select('*').eq('auditoria_id', a.id); setDatosSAP(sap || []);
    const { data: cajas } = await supabase.from('ad_capturas_cajas').select('id, numero_caja').eq('auditoria_id', a.id).order('numero_caja', { ascending: true });
    const cMap: Record<string, number> = {}; (cajas || []).forEach((c: any) => { cMap[c.id] = c.numero_caja; });
    const cIds = (cajas || []).map((c: any) => c.id);
    let capturas: any[] = [];
    if (cIds.length > 0) { const { data } = await supabase.from('ad_capturas_skus').select('*').in('caja_id', cIds).order('capturado_en', { ascending: true }); capturas = (data || []).map(c => ({ ...c, numero_caja: cMap[c.caja_id] || '-' })); }
    const detalle: any[] = [];
    (sap || []).forEach((s: any) => {
      const csku = capturas.filter((c: any) => c.sku === s.sku); const sapTotal = s.cantidad_sap || 0;
      if (csku.length === 0) { detalle.push({ sku: s.sku, denominacion: s.denominacion, cantidad_sap: sapTotal, cantidad_fisica: 0, diferencia: sapTotal, capturado: false, cajas: 'Pendiente' }); }
      else { let fa = 0; csku.forEach((c: any, i: number) => { fa += c.cantidad_fisica || 0; detalle.push({ sku: s.sku, denominacion: s.denominacion, cantidad_sap: sapTotal, cantidad_fisica: c.cantidad_fisica || 0, diferencia: i === csku.length - 1 ? sapTotal - fa : 0, capturado: true, cajas: `Caja ${c.numero_caja}` }); });
        if (fa < sapTotal) detalle.push({ sku: s.sku, denominacion: s.denominacion, cantidad_sap: sapTotal, cantidad_fisica: 0, diferencia: sapTotal - fa, capturado: false, cajas: 'Pendiente' }); }
    });
    setDatosDetalle(detalle);
    const { data: aa } = await supabase.from('ad_auditorias').select('*').eq('id', a.id).single(); if (aa) setAuditoriaDetalle(aa);
  };

  const exportarExcel = () => {
    if (!auditoriaDetalle) return;
    const datos = datosDetalle.map(d => ({ 'TAREA AUDITORIA': auditoriaDetalle.numero_tarea, 'CAJA': d.cajas, 'ENTREGA': datosSAP.find(s => s.sku === d.sku)?.entrega || '', 'ACTA': auditoriaDetalle.acta || '', 'GUIA': auditoriaDetalle.guia || '', 'COD LOCAL': auditoriaDetalle.codigo_local, 'LOCAL': auditoriaDetalle.nombre_local, 'DESCRIPCION': d.denominacion, 'SKU': d.sku, 'SAP': d.cantidad_sap, 'FISICO': d.cantidad_fisica || 0, 'DIFERENCIA': d.diferencia || 0, 'ESTADO': d.capturado ? (d.diferencia === 0 ? 'OK' : 'CON DIFERENCIA') : 'PENDIENTE' }));
    const ws = XLSX.utils.json_to_sheet(datos); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Auditoria'); XLSX.writeFile(wb, `${auditoriaDetalle.numero_tarea}_${auditoriaDetalle.codigo_local}.xlsx`);
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
        <div className="ed01-modal-overlay" onClick={() => setShowDetalleModal(false)}><div className="ed01-modal" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
          <div className="ed01-modal-header"><h2>{auditoriaDetalle.numero_tarea} - {auditoriaDetalle.codigo_local} {auditoriaDetalle.nombre_local}</h2>
            <div style={{ display: 'flex', gap: '8px' }}><button className="ad01-btn-exportar" onClick={exportarExcel}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1V10M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 10V12C1 12.5523 1.44772 13 2 13H12C12.5523 13 13 12.5523 13 12V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Exportar XLSX</button><button className="ed01-modal-close" onClick={() => setShowDetalleModal(false)}>×</button></div>
          </div>
          <div className="ed01-modal-body">
            <div className="ad01-detalle-header"><div><strong>Acta:</strong> {auditoriaDetalle.acta || '-'}</div><div><strong>Guía:</strong> {auditoriaDetalle.guia || '-'}</div><div><strong>Asignado:</strong> {nombresUsuarios[auditoriaDetalle.usuario_asignado] || 'Sin asignar'}</div><div><strong>Estado:</strong> <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: getEstadoBadge(auditoriaDetalle.estado).bg, color: getEstadoBadge(auditoriaDetalle.estado).color }}>{auditoriaDetalle.estado}</span></div></div>
            <div className="ad01-resumen-cards">
              <div className="ad01-resumen-card"><span>Total SAP</span><strong>{datosDetalle.reduce((s, d) => s + d.cantidad_sap, 0)}</strong></div>
              <div className="ad01-resumen-card"><span>Total Físico</span><strong>{datosDetalle.reduce((s, d) => s + d.cantidad_fisica, 0)}</strong></div>
              <div className="ad01-resumen-card"><span>Revisados</span><strong>{datosDetalle.filter(d => d.capturado).length}/{datosDetalle.length}</strong></div>
              <div className="ad01-resumen-card ad01-resumen-diff"><span>Con Diferencias</span><strong>{datosDetalle.filter(d => d.diferencia !== 0).length}</strong></div>
            </div>
            <div className="ed03-tabla-container" style={{ maxHeight: '400px' }}>
              <table className="ed03-tabla">
                <thead><tr><th>Caja</th><th>SKU</th><th>Descripción</th><th style={{ width: '60px' }}>SAP</th><th style={{ width: '60px' }}>Físico</th><th style={{ width: '50px' }}>Dif.</th><th style={{ width: '60px' }}>Estado</th></tr></thead>
                <tbody>
                  {datosDetalle.map((d, i) => (
                    <tr key={i} style={{ background: d.capturado ? (d.diferencia === 0 ? '#dcfce7' : '#fef2f2') : '#f8fafd' }}>
                      <td style={{ fontSize: '11px', fontWeight: 600, color: '#1d4ed8' }}>{d.cajas}</td>
                      <td className="ed03-ticket-id">{d.sku}</td><td style={{ fontSize: '12px' }}>{d.denominacion}</td><td>{d.cantidad_sap}</td>
                      <td>{d.capturado ? d.cantidad_fisica : '-'}</td>
                      <td style={{ fontWeight: 600, color: d.capturado ? (d.diferencia === 0 ? '#15803d' : '#dc2626') : '#94a3b8' }}>{d.capturado ? (d.diferencia === 0 ? '✓' : d.diferencia) : '-'}</td>
                      <td><span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: d.capturado ? (d.diferencia === 0 ? '#dcfce7' : '#fef2f2') : '#f1f5f9', color: d.capturado ? (d.diferencia === 0 ? '#15803d' : '#dc2626') : '#64748b' }}>{d.capturado ? (d.diferencia === 0 ? 'OK' : 'Dif.') : 'Pend.'}</span></td>
                    </tr>
                  ))}
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
