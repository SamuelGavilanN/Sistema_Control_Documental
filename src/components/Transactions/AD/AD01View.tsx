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
  const [archivoSAP, setArchivoSAP] = useState<File | null>(null);
  const [archivoCorreo, setArchivoCorreo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => { cargarAuditorias(); cargarUsuarios(); }, []);

  const cargarUsuarios = async () => {
    const { data } = await supabase.from('usuarios').select('id, nombre, apellido, rol');
    if (data) {
      setUsuarios(data);
      const m: Record<string, string> = {};
      data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido}`; });
      setNombresUsuarios(m);
    }
  };

  const cargarAuditorias = async () => {
    setCargando(true);
    const { data } = await supabase.from('ad_auditorias').select('*').order('creado_en', { ascending: false });
    if (data) setAuditorias(data);
    setCargando(false);
  };

  const procesarArchivos = async () => {
    if (!archivoSAP || !archivoCorreo) { alert('Selecciona ambos archivos'); return; }
    setProcesando(true);
    try {
      const dataSAP = await leerExcel(archivoSAP);
      const dataCorreo = await leerExcel(archivoCorreo);

      const mapaCorreo: Record<string, { acta: string; guia: string }> = {};
      dataCorreo.forEach((row: any) => {
        const despacho = String(row['Despacho HC'] || '').trim();
        if (despacho) mapaCorreo[despacho] = { acta: String(row['Acta'] || '').trim(), guia: String(row['Guía'] || row['Guia'] || '').trim() };
      });

      const grupos: Record<string, { nombre: string; entregas: Set<string>; items: any[] }> = {};
      dataSAP.forEach((row: any) => {
        const codLocal = String(row['Destinat.'] || '').trim();
        const nombreLocal = String(row['Nombre destinatario de mercancías'] || '').trim();
        const entrega = String(row['Entrega'] || '').trim();
        if (!codLocal) return;
        if (!grupos[codLocal]) grupos[codLocal] = { nombre: nombreLocal, entregas: new Set(), items: [] };
        grupos[codLocal].entregas.add(entrega);
        grupos[codLocal].items.push(row);
      });

      for (const [codLocal, grupo] of Object.entries(grupos)) {
        let acta = ''; let guia = '';
        for (const entrega of grupo.entregas) {
          if (mapaCorreo[entrega]) { acta = mapaCorreo[entrega].acta; guia = mapaCorreo[entrega].guia; break; }
        }
        const { data: tarea } = await supabase.rpc('generar_numero_auditoria');
        const { data: auditoria } = await supabase.from('ad_auditorias').insert([{
          numero_tarea: tarea, codigo_local: codLocal, nombre_local: grupo.nombre, acta, guia, estado: 'Pendiente', creado_por: auth.getUsuario()?.id
        }]).select('id').single();
        if (!auditoria) continue;
        const itemsInsert = grupo.items.map((item: any) => ({
          auditoria_id: (auditoria as any).id, entrega: String(item['Entrega'] || '').trim(), denominacion: String(item['Denominación'] || '').trim(),
          codigo_local: codLocal, nombre_local: grupo.nombre, sku: String(item['Material'] || '').trim(), cantidad_sap: parseInt(item['Cantidad entrega']) || 0
        }));
        await supabase.from('ad_datos_sap').insert(itemsInsert);
      }
      setMensaje('Auditorías creadas exitosamente');
      setTimeout(() => { setMensaje(''); setShowCrearModal(false); }, 2000);
      cargarAuditorias();
    } catch (e: any) { alert('Error: ' + e.message); }
    finally { setProcesando(false); }
  };

  const leerExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(sheet));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleAsignar = async (auditoriaId: string, usuarioId: string) => {
    await supabase.from('ad_auditorias').update({ usuario_asignado: usuarioId || null }).eq('id', auditoriaId);
    cargarAuditorias();
  };

  const verDetalle = async (auditoria: Auditoria) => {
    setAuditoriaDetalle(auditoria);
    const { data: sap } = await supabase.from('ad_datos_sap').select('*').eq('auditoria_id', auditoria.id);
    const { data: cajas } = await supabase.from('ad_capturas_cajas').select('id').eq('auditoria_id', auditoria.id);
    const cajaIds = cajas?.map((c: any) => c.id) || [];
    let capturas: any[] = [];
    if (cajaIds.length > 0) {
      const { data } = await supabase.from('ad_capturas_skus').select('*').in('caja_id', cajaIds);
      capturas = data || [];
    }
    const detalle = (sap || []).map((s: any) => {
      const captura = capturas.find((c: any) => c.sku === s.sku);
      return { sku: s.sku, denominacion: s.denominacion, cantidad_sap: s.cantidad_sap, cantidad_fisica: captura?.cantidad_fisica || 0, diferencia: (s.cantidad_sap || 0) - (captura?.cantidad_fisica || 0), capturado: !!captura };
    });
    setDatosDetalle(detalle);
    setShowDetalleModal(true);
  };

  const getEstadoBadge = (e: string) => {
    switch (e) { case 'Pendiente': return { color: '#b45309', bg: '#fef3c7' }; case 'En Proceso': return { color: '#1d4ed8', bg: '#dbeafe' }; case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' }; case 'Con Diferencias': return { color: '#dc2626', bg: '#fef2f2' }; default: return { color: '#64748b', bg: '#f1f5f9' }; }
  };

  return (
    <div className="ad01-view">
      <div className="ad01-header">
        <h2>Gestión de Auditorías</h2>
        <button className="toolbar-btn toolbar-btn-primary" onClick={() => setShowCrearModal(true)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Nueva Auditoría
        </button>
      </div>

      <div className="ed03-tabla-container">
        <table className="ed03-tabla">
          <thead>
            <tr><th>Tarea</th><th>Tienda</th><th>Acta</th><th>Guía</th><th>Asignado</th><th>Estado</th><th>Fecha</th><th style={{ width: '80px' }}></th></tr>
          </thead>
          <tbody>
            {cargando ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr> :
              auditorias.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>Sin auditorías</td></tr> :
              auditorias.map(a => {
                const eb = getEstadoBadge(a.estado);
                return (
                  <tr key={a.id}>
                    <td className="ed03-ticket-id">{a.numero_tarea}</td>
                    <td>{a.codigo_local} - {a.nombre_local}</td>
                    <td>{a.acta || '-'}</td><td>{a.guia || '-'}</td>
                    <td>
                      <select value={a.usuario_asignado || ''} onChange={e => handleAsignar(a.id, e.target.value)} style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white' }}>
                        <option value="">Sin asignar</option>
                        {usuarios.filter(u => u.rol === 'Auditor' || u.rol === 'Admin' || u.rol === 'Owner').map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
                      </select>
                    </td>
                    <td><span style={{ background: eb.bg, color: eb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{a.estado}</span></td>
                    <td>{new Date(a.creado_en).toLocaleDateString('es-CL')}</td>
                    <td><button className="ed03-btn-ver" onClick={() => verDetalle(a)}>Detalle</button></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Modal Nueva Auditoría */}
      {showCrearModal && (
        <div className="ed01-modal-overlay" onClick={() => setShowCrearModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header"><h2>Nueva Auditoría</h2><button className="ed01-modal-close" onClick={() => setShowCrearModal(false)}>×</button></div>
            <div className="ed01-modal-body">
              <div className="ed01-field"><label>Archivo BD SAP (.xlsx)</label><input type="file" accept=".xlsx,.xls" onChange={e => setArchivoSAP(e.target.files?.[0] || null)} /></div>
              <div className="ed01-field"><label>Archivo Correo (.xlsx)</label><input type="file" accept=".xlsx,.xls" onChange={e => setArchivoCorreo(e.target.files?.[0] || null)} /></div>
              {mensaje && <div style={{ padding: '10px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '13px' }}>{mensaje}</div>}
            </div>
            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => setShowCrearModal(false)}>Cancelar</button>
              <button className="ed01-btn-save" onClick={procesarArchivos} disabled={procesando}>{procesando ? 'Procesando...' : 'Crear Auditorías'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {showDetalleModal && auditoriaDetalle && (
        <div className="ed01-modal-overlay" onClick={() => setShowDetalleModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '850px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header"><h2>{auditoriaDetalle.numero_tarea} - {auditoriaDetalle.codigo_local} {auditoriaDetalle.nombre_local}</h2><button className="ed01-modal-close" onClick={() => setShowDetalleModal(false)}>×</button></div>
            <div className="ed01-modal-body">
              <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
                <div><strong>Acta:</strong> {auditoriaDetalle.acta || '-'}</div>
                <div><strong>Guía:</strong> {auditoriaDetalle.guia || '-'}</div>
                <div><strong>Asignado:</strong> {nombresUsuarios[auditoriaDetalle.usuario_asignado] || 'Sin asignar'}</div>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ background: '#f8fafd', padding: '10px 14px', borderRadius: '8px', textAlign: 'center' }}><span style={{ fontSize: '11px', color: '#64748b' }}>Total SAP</span><br /><strong>{datosDetalle.reduce((s, d) => s + d.cantidad_sap, 0)}</strong></div>
                <div style={{ background: '#f8fafd', padding: '10px 14px', borderRadius: '8px', textAlign: 'center' }}><span style={{ fontSize: '11px', color: '#64748b' }}>Total Físico</span><br /><strong>{datosDetalle.reduce((s, d) => s + d.cantidad_fisica, 0)}</strong></div>
                <div style={{ background: '#f8fafd', padding: '10px 14px', borderRadius: '8px', textAlign: 'center' }}><span style={{ fontSize: '11px', color: '#64748b' }}>Revisados</span><br /><strong>{datosDetalle.filter(d => d.capturado).length}/{datosDetalle.length}</strong></div>
                <div style={{ background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', textAlign: 'center' }}><span style={{ fontSize: '11px', color: '#dc2626' }}>Con Diferencias</span><br /><strong style={{ color: '#dc2626' }}>{datosDetalle.filter(d => d.diferencia !== 0).length}</strong></div>
              </div>
              <div className="ed03-tabla-container" style={{ maxHeight: '400px' }}>
                <table className="ed03-tabla">
                  <thead><tr><th>SKU</th><th>Descripción</th><th style={{ width: '70px' }}>SAP</th><th style={{ width: '70px' }}>Físico</th><th style={{ width: '60px' }}>Dif.</th><th style={{ width: '70px' }}>Estado</th></tr></thead>
                  <tbody>
                    {datosDetalle.map((d, i) => (
                      <tr key={i} style={{ background: d.capturado ? (d.diferencia === 0 ? '#dcfce7' : '#fef2f2') : '#f8fafd' }}>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default AD01View;
