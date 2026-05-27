import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import './AD02.css';

interface Auditoria {
  id: string;
  numero_tarea: string;
  codigo_local: string;
  nombre_local: string;
  acta: string;
  guia: string;
  estado: string;
}

interface SKUItem {
  id: string;
  sku: string;
  denominacion: string;
  cantidad_sap: number;
  cantidad_fisica?: number;
  diferencia?: number;
  capturadoTotal?: number;
}

const AD02Captura: React.FC = () => {
  const usuario = auth.getUsuario();
  const [misTareas, setMisTareas] = useState<Auditoria[]>([]);
  const [tareaActiva, setTareaActiva] = useState<Auditoria | null>(null);
  const [todosLosSKUs, setTodosLosSKUs] = useState<SKUItem[]>([]);
  const [curvaActual, setCurvaActual] = useState<SKUItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cajaActual, setCajaActual] = useState(1);

  useEffect(() => { cargarMisTareas(); }, []);

  const cargarMisTareas = async () => {
    setCargando(true);
    const { data } = await supabase.from('ad_auditorias').select('*')
      .eq('usuario_asignado', usuario?.id)
      .in('estado', ['Pendiente', 'En Proceso'])
      .order('creado_en', { ascending: false });
    if (data) setMisTareas(data);
    setCargando(false);
  };

  const abrirTarea = async (tarea: Auditoria) => {
    setTareaActiva(tarea);
    const { data: sap } = await supabase.from('ad_datos_sap').select('*').eq('auditoria_id', tarea.id).order('sku');
    
    const { data: cajas } = await supabase.from('ad_capturas_cajas').select('id').eq('auditoria_id', tarea.id);
    const cajaIds = cajas?.map((c: any) => c.id) || [];
    let capturasPrevias: any[] = [];
    if (cajaIds.length > 0) {
      const { data: caps } = await supabase.from('ad_capturas_skus').select('*').in('caja_id', cajaIds);
      capturasPrevias = caps || [];
    }

    if (sap) {
      const skusConCaptura = sap.map((s: any) => {
        const capturado = capturasPrevias.filter((c: any) => c.sku === s.sku).reduce((sum: number, c: any) => sum + (c.cantidad_fisica || 0), 0);
        return { ...s, cantidad_fisica: undefined, diferencia: undefined, capturadoTotal: capturado };
      });
      setTodosLosSKUs(skusConCaptura);
    }
    
    setCajaActual(cajaIds.length + 1);
    if (tarea.estado === 'Pendiente') {
      await supabase.from('ad_auditorias').update({ estado: 'En Proceso' }).eq('id', tarea.id);
    }
  };

  const buscarCurva = () => {
    if (!busqueda.trim()) return;
    let skuBuscado = busqueda.trim();
    if (skuBuscado.length > 11) skuBuscado = skuBuscado.substring(1, skuBuscado.length - 1);
    const prefijo = skuBuscado.substring(0, skuBuscado.length - 3);
    const curva = todosLosSKUs.filter(s => s.sku.startsWith(prefijo) && s.sku.length === skuBuscado.length);
    if (curva.length === 0) { alert('SKU no encontrado'); return; }
    setCurvaActual(curva.map(s => ({ ...s, cantidad_fisica: undefined, diferencia: undefined })));
  };

  const handleCantidadChange = (skuId: string, valor: number) => {
    setCurvaActual(prev => prev.map(s => {
      if (s.id === skuId) return { ...s, cantidad_fisica: valor, diferencia: s.cantidad_sap - (s.capturadoTotal || 0) - valor };
      return s;
    }));
  };

  const guardarCaja = async () => {
    if (!tareaActiva || curvaActual.length === 0) return;
    const skusConFisico = curvaActual.filter(s => s.cantidad_fisica !== undefined && s.cantidad_fisica > 0);
    if (skusConFisico.length === 0) { alert('Ingresa al menos una cantidad'); return; }

    const { data: caja } = await supabase.from('ad_capturas_cajas').insert([{
      auditoria_id: tareaActiva.id, numero_caja: cajaActual, capturado_por: usuario?.id, estado: 'Capturada'
    }]).select('id').single();

    if (caja) {
      const skusInsert = skusConFisico.map(s => ({
        caja_id: (caja as any).id, sku: s.sku, cantidad_sap: s.cantidad_sap, cantidad_fisica: s.cantidad_fisica, diferencia: s.diferencia
      }));
      await supabase.from('ad_capturas_skus').insert(skusInsert);
    }

    setCajaActual(prev => prev + 1);
    setCurvaActual([]);
    setBusqueda('');
    abrirTarea(tareaActiva);
  };

  const finalizarTarea = async () => {
    if (!tareaActiva) return;
    const { data: cajas } = await supabase.from('ad_capturas_cajas').select('id').eq('auditoria_id', tareaActiva.id);
    const cajaIds = cajas?.map((c: any) => c.id) || [];
    let hayDiferencias = false;
    if (cajaIds.length > 0) {
      const { data: diferencias } = await supabase.from('ad_capturas_skus').select('*').in('caja_id', cajaIds);
      hayDiferencias = diferencias?.some((d: any) => d.diferencia !== 0) || false;
    }
    await supabase.from('ad_auditorias').update({
      estado: hayDiferencias ? 'Con Diferencias' : 'Finalizado', finalizado_en: new Date().toISOString()
    }).eq('id', tareaActiva.id);
    alert(hayDiferencias ? 'Tarea finalizada con diferencias' : 'Tarea finalizada correctamente');
    setTareaActiva(null); setCurvaActual([]); setTodosLosSKUs([]); cargarMisTareas();
  };

  return (
    <div className="ad02-view">
      {!tareaActiva ? (
        <>
          <div className="ad02-header"><h2>Mis Tareas de Auditoría</h2></div>
          <div className="ed03-tabla-container">
            <table className="ed03-tabla">
              <thead><tr><th>Tarea</th><th>Tienda</th><th>Acta</th><th>Guía</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {cargando ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr> :
                  misTareas.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No tienes tareas</td></tr> :
                  misTareas.map(t => (
                    <tr key={t.id}>
                      <td className="ed03-ticket-id">{t.numero_tarea}</td><td>{t.codigo_local} - {t.nombre_local}</td><td>{t.acta || '-'}</td><td>{t.guia || '-'}</td>
                      <td><span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>{t.estado}</span></td>
                      <td><button className="ad02-btn-iniciar" onClick={() => abrirTarea(t)}>Iniciar</button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="ad02-header">
            <div><h2>{tareaActiva.numero_tarea}</h2><span className="ad02-subtitle">{tareaActiva.codigo_local} - {tareaActiva.nombre_local} | Acta: {tareaActiva.acta} | Guía: {tareaActiva.guia}</span></div>
            <div className="ad02-header-actions">
              <span className="ad02-caja-badge">Caja #{cajaActual}</span>
              <button className="ad02-btn-finalizar" onClick={finalizarTarea}>Finalizar Tarea</button>
              <button className="ed01-btn-cancel" onClick={() => { setTareaActiva(null); setCurvaActual([]); setTodosLosSKUs([]); }}>Volver</button>
            </div>
          </div>

          <div className="ad02-busqueda">
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarCurva(); } }} placeholder="Escanear EAN o SKU y presionar Enter..." autoFocus />
            <button className="ad02-btn-buscar" onClick={buscarCurva}>Buscar</button>
          </div>

          {curvaActual.length > 0 && (
            <>
              <div className="ad02-curva-info">Curva: <strong>{curvaActual[0].sku.substring(0, curvaActual[0].sku.length - 3)}XXX</strong> ({curvaActual.length} items)</div>
              <div className="ed03-tabla-container">
                <table className="ed03-tabla">
                  <thead><tr><th>SKU</th><th>Descripción</th><th>SAP</th><th>Capturado</th><th>Físico</th><th>Dif.</th></tr></thead>
                  <tbody>
                    {curvaActual.map((s, i) => {
                      const diff = s.diferencia;
                      return (
                        <tr key={s.id} style={{ background: diff !== undefined ? (diff === 0 ? '#dcfce7' : '#fef2f2') : 'transparent' }}>
                          <td className="ed03-ticket-id">{s.sku}</td><td style={{ fontSize: '12px' }}>{s.denominacion}</td>
                          <td>{s.cantidad_sap}</td><td style={{ color: '#64748b' }}>{s.capturadoTotal || 0}</td>
                          <td><input type="number" value={s.cantidad_fisica ?? ''} onChange={e => handleCantidadChange(s.id, parseInt(e.target.value) || 0)} style={{ width: '70px', padding: '8px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' }} /></td>
                          <td style={{ fontWeight: 600, color: diff !== undefined ? (diff === 0 ? '#15803d' : '#dc2626') : '#64748b', textAlign: 'center' }}>{diff !== undefined ? (diff === 0 ? '✓' : diff) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="ad02-footer">
                <span className="ad02-totales">SAP: {curvaActual.reduce((s, i) => s + i.cantidad_sap, 0)} | Capturado: {curvaActual.reduce((s, i) => s + (i.capturadoTotal || 0), 0)} | Físico: {curvaActual.filter(s => s.cantidad_fisica !== undefined).reduce((s, i) => s + (i.cantidad_fisica || 0), 0)}</span>
                <button className="ad02-btn-guardar" onClick={guardarCaja}>Guardar Caja</button>
              </div>
            </>
          )}

          {curvaActual.length === 0 && (
            <div className="ad02-empty"><p>Escanea un EAN o ingresa un SKU</p><p>Presiona Enter para ver la curva completa</p></div>
          )}
        </>
      )}
    </div>
  );
};

export default AD02Captura;
