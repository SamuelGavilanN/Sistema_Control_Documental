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
}

const AD02Captura: React.FC = () => {
  const usuario = auth.getUsuario();
  const [misTareas, setMisTareas] = useState<Auditoria[]>([]);
  const [tareaActiva, setTareaActiva] = useState<Auditoria | null>(null);
  const [skus, setSkus] = useState<SKUItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cajaActual, setCajaActual] = useState(1);
  const [capturasHechas, setCapturasHechas] = useState(0);
  const [totalSKUs, setTotalSKUs] = useState(0);

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
    const { data } = await supabase.from('ad_datos_sap').select('*').eq('auditoria_id', tarea.id).order('sku');
    if (data) {
      setSkus(data.map(s => ({ ...s, cantidad_fisica: undefined, diferencia: undefined })));
      setTotalSKUs(data.length);
    }
    // Actualizar estado a En Proceso
    if (tarea.estado === 'Pendiente') {
      await supabase.from('ad_auditorias').update({ estado: 'En Proceso' }).eq('id', tarea.id);
    }
  };

  const buscarSKU = () => {
    if (!busqueda.trim()) return;
    let skuBuscado = busqueda.trim();
    // Convertir EAN a SKU si tiene más de 11 dígitos
    if (skuBuscado.length > 11) {
      skuBuscado = skuBuscado.substring(1, skuBuscado.length - 1);
    }
    setBusqueda(skuBuscado);
  };

  const handleCantidadChange = (skuId: string, valor: number) => {
    setSkus(prev => prev.map(s => {
      if (s.id === skuId) {
        const diferencia = (s.cantidad_sap || 0) - (valor || 0);
        return { ...s, cantidad_fisica: valor, diferencia };
      }
      return s;
    }));
  };

  const guardarCaja = async () => {
    if (!tareaActiva) return;
    const skusConFisico = skus.filter(s => s.cantidad_fisica !== undefined && s.cantidad_fisica > 0);
    if (skusConFisico.length === 0) { alert('Ingresa al menos una cantidad física'); return; }

    const { data: caja } = await supabase.from('ad_capturas_cajas').insert([{
      auditoria_id: tareaActiva.id, numero_caja: cajaActual,
      capturado_por: usuario?.id, estado: 'Capturada'
    }]).select('id').single();

    if (caja) {
      const skusInsert = skusConFisico.map(s => ({
        caja_id: (caja as any).id, sku: s.sku,
        cantidad_sap: s.cantidad_sap, cantidad_fisica: s.cantidad_fisica,
        diferencia: s.diferencia
      }));
      await supabase.from('ad_capturas_skus').insert(skusInsert);
    }

    setCapturasHechas(prev => prev + skusConFisico.length);
    setCajaActual(prev => prev + 1);
    setSkus(prev => prev.map(s => ({ ...s, cantidad_fisica: undefined, diferencia: undefined })));
    setBusqueda('');
  };

  const finalizarTarea = async () => {
  if (!tareaActiva) return;
  
  // Obtener IDs de cajas
  const { data: cajas } = await supabase.from('ad_capturas_cajas').select('id').eq('auditoria_id', tareaActiva.id);
  const cajaIds = cajas?.map((c: any) => c.id) || [];
  
  let hayDiferencias = false;
  
  if (cajaIds.length > 0) {
    const { data: diferencias } = await supabase.from('ad_capturas_skus').select('*').in('caja_id', cajaIds);
    hayDiferencias = diferencias?.some((d: any) => d.diferencia !== 0) || false;
  }

  await supabase.from('ad_auditorias').update({
    estado: hayDiferencias ? 'Con Diferencias' : 'Finalizado',
    finalizado_en: new Date().toISOString()
  }).eq('id', tareaActiva.id);

  alert(hayDiferencias ? 'Tarea finalizada con diferencias' : 'Tarea finalizada correctamente');
  setTareaActiva(null); cargarMisTareas();
};

  const skusFiltrados = busqueda ? skus.filter(s => s.sku.includes(busqueda)) : skus;

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
                  misTareas.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No tienes tareas asignadas</td></tr> :
                  misTareas.map(t => (
                    <tr key={t.id}>
                      <td className="ed03-ticket-id">{t.numero_tarea}</td>
                      <td>{t.codigo_local} - {t.nombre_local}</td>
                      <td>{t.acta || '-'}</td><td>{t.guia || '-'}</td>
                      <td><span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>{t.estado}</span></td>
                      <td><button className="ed03-btn-ver" onClick={() => abrirTarea(t)}>Iniciar</button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="ad02-header">
            <div>
              <h2>{tareaActiva.numero_tarea}</h2>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{tareaActiva.codigo_local} - {tareaActiva.nombre_local} | Acta: {tareaActiva.acta} | Guía: {tareaActiva.guia}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Caja #{cajaActual}</span>
              <button className="ed01-btn-cancel" onClick={() => setTareaActiva(null)}>Volver</button>
            </div>
          </div>

          <div className="ad02-busqueda">
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Escanear EAN o SKU..." autoFocus
              style={{ flex: 1, padding: '14px', fontSize: '18px', border: '2px solid #e2e8f0', borderRadius: '8px' }} />
            <button onClick={buscarSKU} style={{ padding: '14px 20px', fontSize: '16px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Buscar</button>
          </div>

          <div className="ed03-tabla-container" style={{ maxHeight: '400px' }}>
            <table className="ed03-tabla">
              <thead><tr><th>SKU</th><th>Descripción</th><th>SAP</th><th>Físico</th><th>Dif.</th></tr></thead>
              <tbody>
                {skusFiltrados.map(s => {
                  const diff = s.diferencia;
                  return (
                    <tr key={s.id} style={{ background: diff !== undefined ? (diff === 0 ? '#dcfce7' : '#fef2f2') : 'transparent' }}>
                      <td className="ed03-ticket-id">{s.sku}</td>
                      <td style={{ fontSize: '12px' }}>{s.denominacion}</td>
                      <td>{s.cantidad_sap}</td>
                      <td><input type="number" value={s.cantidad_fisica || ''} onChange={e => handleCantidadChange(s.id, parseInt(e.target.value) || 0)}
                        style={{ width: '70px', padding: '6px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' }} /></td>
                      <td style={{ fontWeight: 600, color: diff === 0 ? '#15803d' : diff ? '#dc2626' : '#64748b' }}>{diff !== undefined ? (diff === 0 ? '✓' : diff) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Capturas: {capturasHechas}/{totalSKUs}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="ed01-btn-save" onClick={guardarCaja}>Guardar Caja</button>
              <button className="ed01-btn-save" onClick={finalizarTarea} style={{ background: '#15803d' }}>Finalizar Tarea</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AD02Captura;
