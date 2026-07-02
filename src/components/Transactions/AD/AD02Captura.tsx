// src/components/Transactions/AD/AD02Captura.tsx

import React, { useState, useEffect, useRef } from 'react';
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
  const usuario: any = auth.getUsuario();
  const [misTareas, setMisTareas]: any = useState([]);
  const [tareaActiva, setTareaActiva]: any = useState(null);
  const [todosLosSKUs, setTodosLosSKUs]: any = useState([]);
  const [curvaActual, setCurvaActual]: any = useState([]);
  const [busqueda, setBusqueda]: any = useState('');
  const [cargando, setCargando]: any = useState(true);
  const [cajaActual, setCajaActual]: any = useState(1);
  const [isMobile, setIsMobile]: any = useState(window.innerWidth < 768);
  const [guardando, setGuardando]: any = useState(false);
  const busquedaRef: any = useRef(null);

  const [showAgregarSKU, setShowAgregarSKU]: any = useState(false);
  const [skusManuales, setSkusManuales]: any = useState([]);
  const [nuevoSKUInput, setNuevoSKUInput]: any = useState('');
  const [nuevaCantidadInput, setNuevaCantidadInput]: any = useState('');
  const skuManualInputRef: any = useRef(null);
  const cantidadManualInputRef: any = useRef(null);

  useEffect(() => { cargarMisTareas(); }, []);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cargarMisTareas = async () => {
    setCargando(true);
    const { data } = await supabase.from('ad_auditorias').select('*')
      .eq('usuario_asignado', usuario?.id).in('estado', ['Pendiente', 'En Proceso'])
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
      const skuMap: Record<string, any> = {};
      sap.forEach((s: any) => {
        if (!skuMap[s.sku]) {
          skuMap[s.sku] = { id: s.id, sku: s.sku, denominacion: s.denominacion, cantidad_sap: 0 };
        }
        skuMap[s.sku].cantidad_sap += (s.cantidad_sap || 0);
      });

      setTodosLosSKUs(Object.values(skuMap).map((s: any) => {
        const capturado = capturasPrevias.filter((c: any) => c.sku === s.sku).reduce((sum: number, c: any) => sum + (c.cantidad_fisica || 0), 0);
        return { ...s, cantidad_fisica: undefined, diferencia: undefined, capturadoTotal: capturado };
      }));
    }
    setCajaActual(cajaIds.length + 1);
    if (tarea.estado === 'Pendiente') await supabase.from('ad_auditorias').update({ estado: 'En Proceso' }).eq('id', tarea.id);
    setTimeout(() => busquedaRef.current?.focus(), 300);
  };

  const buscarCurva = () => {
    if (!busqueda.trim()) return;
    let skuBuscado = busqueda.trim();
    if (skuBuscado.length > 11) skuBuscado = skuBuscado.substring(1, skuBuscado.length - 1);
    const prefijo = skuBuscado.substring(0, skuBuscado.length - 3);
    const curva = todosLosSKUs.filter((s: any) => s.sku.startsWith(prefijo) && s.sku.length === skuBuscado.length);
    if (curva.length === 0) { alert('SKU no encontrado'); return; }
    setCurvaActual(curva.map((s: any) => ({ ...s, cantidad_fisica: undefined, diferencia: undefined })));
    setTimeout(() => {
      const inputs = document.querySelectorAll('.ad02-input-cantidad');
      if (inputs.length > 0) (inputs[0] as HTMLInputElement).focus();
    }, 200);
  };

  const handleCantidadChange = (skuId: string, valor: number, index: number) => {
    setCurvaActual((prev: any) => prev.map((s: any, i: number) => {
      if (i === index) return { ...s, cantidad_fisica: valor, diferencia: s.cantidad_sap - (s.capturadoTotal || 0) - valor };
      return s;
    }));
  };

  const handleCantidadKeyDown = (e: any, index: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < curvaActual.length) {
        const inputs = document.querySelectorAll('.ad02-input-cantidad');
        (inputs[nextIndex] as HTMLInputElement)?.focus();
      } else {
        (document.querySelector('.ad02-btn-guardar') as HTMLElement)?.focus();
      }
    }
  };

  const guardarCaja = async () => {
    if (!tareaActiva || curvaActual.length === 0) return;
    const skusConFisico = curvaActual.filter((s: any) => s.cantidad_fisica !== undefined);
    if (skusConFisico.length === 0) { alert('Ingresa al menos una cantidad'); return; }

    setGuardando(true);

    const { data: caja } = await supabase.from('ad_capturas_cajas').insert([{
      auditoria_id: tareaActiva.id, numero_caja: cajaActual, capturado_por: usuario?.id, estado: 'Capturada'
    }]).select('id').single();

    if (caja) {
      await supabase.from('ad_capturas_skus').insert(skusConFisico.map((s: any) => ({
        caja_id: (caja as any).id, sku: s.sku, cantidad_sap: s.cantidad_sap, cantidad_fisica: s.cantidad_fisica || 0, diferencia: s.diferencia || 0
      })));
    }

    setCajaActual((prev: number) => prev + 1);
    setCurvaActual([]);
    setBusqueda('');

    const nuevosSKUs = todosLosSKUs.map((s: any) => {
      const capturadoAhora = skusConFisico.find((c: any) => c.sku === s.sku);
      if (capturadoAhora) {
        return { ...s, capturadoTotal: (s.capturadoTotal || 0) + (capturadoAhora.cantidad_fisica || 0) };
      }
      return s;
    });
    setTodosLosSKUs(nuevosSKUs);
    setGuardando(false);
    setTimeout(() => busquedaRef.current?.focus(), 300);
  };

  const agregarSKUaLista = () => {
    if (!nuevoSKUInput.trim() || !nuevaCantidadInput || parseInt(nuevaCantidadInput) <= 0) {
      alert('Ingresa SKU y cantidad válida');
      return;
    }
    setSkusManuales([...skusManuales, { sku: nuevoSKUInput.trim(), cantidad: parseInt(nuevaCantidadInput) }]);
    setNuevoSKUInput('');
    setNuevaCantidadInput('');
    setTimeout(() => skuManualInputRef.current?.focus(), 100);
  };

  const eliminarSKUdeLista = (index: number) => {
    setSkusManuales(skusManuales.filter((_: any, i: number) => i !== index));
  };

  const guardarCajaManual = async () => {
    if (!tareaActiva || skusManuales.length === 0) { alert('Agrega al menos un SKU'); return; }

    setGuardando(true);

    const { data: caja } = await supabase.from('ad_capturas_cajas').insert([{
      auditoria_id: tareaActiva.id, numero_caja: cajaActual, capturado_por: usuario?.id, estado: 'Capturada'
    }]).select('id').single();

    if (caja) {
      const inserts = skusManuales.map((s: any) => {
        const skuEnSAP = todosLosSKUs.find((t: any) => t.sku === s.sku);
        return {
          caja_id: (caja as any).id,
          sku: s.sku,
          cantidad_sap: skuEnSAP ? skuEnSAP.cantidad_sap : 0,
          cantidad_fisica: s.cantidad,
          diferencia: skuEnSAP ? (skuEnSAP.cantidad_sap - s.cantidad) : (0 - s.cantidad),
        };
      });

      await supabase.from('ad_capturas_skus').insert(inserts);
    }

    const nuevosSKUs = todosLosSKUs.map((s: any) => {
      const capturadoAhora = skusManuales.find((c: any) => c.sku === s.sku);
      if (capturadoAhora) {
        return { ...s, capturadoTotal: (s.capturadoTotal || 0) + capturadoAhora.cantidad };
      }
      return s;
    });
    setTodosLosSKUs(nuevosSKUs);

    setCajaActual((prev: number) => prev + 1);
    setSkusManuales([]);
    setShowAgregarSKU(false);
    setGuardando(false);
    setTimeout(() => busquedaRef.current?.focus(), 300);
  };

  const finalizarTarea = async () => {
    if (!tareaActiva) return;

    const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
    const HEADERS: any = { 'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G' };

    try {
      const respSAP = await fetch(API_URL + '/ad_datos_sap?select=sku,cantidad_sap&auditoria_id=eq.' + tareaActiva.id, { headers: HEADERS });
      const sap = await respSAP.json();

      const sapConsolidado: Record<string, number> = {};
      (sap || []).forEach((s: any) => {
        if (!sapConsolidado[s.sku]) sapConsolidado[s.sku] = 0;
        sapConsolidado[s.sku] += (s.cantidad_sap || 0);
      });

      const respCajas = await fetch(API_URL + '/ad_capturas_cajas?select=id&auditoria_id=eq.' + tareaActiva.id, { headers: HEADERS });
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

      let hayDiferencias = false;
      const todosLosSKUsSet = new Set([...Object.keys(sapConsolidado), ...Object.keys(fisicoConsolidado)]);

      todosLosSKUsSet.forEach(sku => {
        const sapTotal = sapConsolidado[sku] || 0;
        const fisicoTotal = fisicoConsolidado[sku] || 0;
        if (sapTotal !== fisicoTotal) {
          hayDiferencias = true;
        }
      });

      await fetch(API_URL + '/ad_auditorias?id=eq.' + tareaActiva.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: hayDiferencias ? 'Con Diferencias' : 'Finalizado', finalizado_en: new Date().toISOString() })
      });

      alert(hayDiferencias ? 'Tarea finalizada con diferencias' : 'Tarea finalizada correctamente');
    } catch (e) {
      alert('Error al finalizar');
    }

    setTareaActiva(null); setCurvaActual([]); setTodosLosSKUs([]); cargarMisTareas();
  };

  return (
    <div className="ad02-view">
      {!tareaActiva ? (
        <>
          <div className="ad02-header"><h2>Mis Tareas de Auditoria</h2></div>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cargando ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</p> :
                misTareas.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No tienes tareas</p> :
                misTareas.map((t: any) => (
                  <div key={t.id} style={{ padding: '12px', background: 'var(--bg-section)', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => abrirTarea(t)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#1d4ed8', fontSize: '13px' }}>{t.numero_tarea}</span>
                      <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600, background: 'var(--estado-proceso-bg)', color: 'var(--estado-proceso-text)' }}>{t.estado}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{t.codigo_local} - {t.nombre_local}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-placeholder)', marginTop: '2px' }}>Acta: {t.acta || '-'} | Guia: {t.guia || '-'}</div>
                  </div>
                ))
              }
            </div>
          ) : (
            <div className="ed03-tabla-container">
              <table className="ed03-tabla">
                <thead><tr><th>Tarea</th><th>Tienda</th><th>Acta</th><th>Guia</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {cargando ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando...</td></tr> :
                    misTareas.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No tienes tareas</td></tr> :
                    misTareas.map((t: any) => (
                      <tr key={t.id}><td className="ed03-ticket-id">{t.numero_tarea}</td><td>{t.codigo_local} - {t.nombre_local}</td><td>{t.acta || '-'}</td><td>{t.guia || '-'}</td><td><span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: 'var(--estado-proceso-bg)', color: 'var(--estado-proceso-text)' }}>{t.estado}</span></td><td><button className="ad02-btn-iniciar" onClick={() => abrirTarea(t)}>Iniciar</button></td></tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="ad02-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <div><h2 style={{ fontSize: isMobile ? '16px' : '20px' }}>{tareaActiva.numero_tarea}</h2><span className="ad02-subtitle">{tareaActiva.codigo_local} - {tareaActiva.nombre_local}</span></div>
            <div className="ad02-header-actions" style={{ flexWrap: 'wrap', gap: '6px' }}>
              <span className="ad02-caja-badge" style={{ fontSize: isMobile ? '11px' : '13px' }}>Caja #{cajaActual}</span>
              <button className="ad02-btn-finalizar" onClick={finalizarTarea} style={{ fontSize: isMobile ? '11px' : '13px', padding: isMobile ? '6px 10px' : '8px 16px' }}>Finalizar</button>
              <button className="ed01-btn-cancel" onClick={() => { setTareaActiva(null); setCurvaActual([]); setTodosLosSKUs([]); }} style={{ fontSize: isMobile ? '11px' : '13px' }}>Volver</button>
            </div>
          </div>

          <div className="ad02-busqueda">
            <input ref={busquedaRef} type="text" value={busqueda} onChange={(e: any) => setBusqueda(e.target.value)}
              onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); buscarCurva(); } }}
              placeholder="Escanear EAN o SKU..." autoFocus
              style={{ fontSize: isMobile ? '14px' : '18px', padding: isMobile ? '10px' : '14px' }} />
            <button className="ad02-btn-buscar" onClick={buscarCurva} style={{ fontSize: isMobile ? '13px' : '16px', padding: isMobile ? '10px 16px' : '14px 24px' }}>Buscar</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button
              onClick={() => { setShowAgregarSKU(!showAgregarSKU); setSkusManuales([]); }}
              style={{ padding: '8px 14px', background: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
            >
              + Caja Manual
            </button>
            {showAgregarSKU && skusManuales.length > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--warning-text)', padding: '6px 0' }}>
                {skusManuales.length} SKU(s) agregados
              </span>
            )}
          </div>

          {showAgregarSKU && (
            <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--warning-bg)', borderRadius: '8px', border: '1px solid var(--warning-border)' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--warning-text)', display: 'block', marginBottom: '2px' }}>SKU</label>
                  <input
                    ref={skuManualInputRef}
                    value={nuevoSKUInput}
                    onChange={(e: any) => setNuevoSKUInput(e.target.value)}
                    onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); cantidadManualInputRef.current?.focus(); } }}
                    placeholder="Escanear o escribir SKU"
                    style={{ padding: '8px 10px', border: '1px solid var(--warning-border)', borderRadius: '4px', fontSize: '14px', width: '180px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--warning-text)', display: 'block', marginBottom: '2px' }}>Cantidad</label>
                  <input
                    ref={cantidadManualInputRef}
                    type="number"
                    value={nuevaCantidadInput}
                    onChange={(e: any) => setNuevaCantidadInput(e.target.value)}
                    onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); agregarSKUaLista(); } }}
                    placeholder="0"
                    min="1"
                    style={{ padding: '8px 10px', border: '1px solid var(--warning-border)', borderRadius: '4px', fontSize: '14px', width: '90px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                </div>
                <button onClick={agregarSKUaLista} style={{ padding: '8px 14px', background: '#d97706', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', height: '38px' }}>
                  + Agregar
                </button>
              </div>

              {skusManuales.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--warning-bg)' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--warning-text)' }}>SKU</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--warning-text)', width: '80px' }}>Cantidad</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {skusManuales.map((s: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--warning-border)' }}>
                          <td style={{ padding: '6px 8px', fontFamily: 'Courier New, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{s.sku}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-primary)' }}>{s.cantidad}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button onClick={() => eliminarSKUdeLista(i)} style={{ width: '22px', height: '22px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '14px', lineHeight: '1' }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '10px' }}>
                    <button
                      onClick={guardarCajaManual}
                      disabled={guardando}
                      style={{ padding: '10px 20px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', width: '100%' }}
                    >
                      {guardando ? 'Guardando...' : 'Guardar Caja Manual (Caja #' + cajaActual + ')'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {curvaActual.length > 0 && (
            <>
              <div className="ad02-curva-info" style={{ fontSize: isMobile ? '11px' : '13px' }}>Curva: <strong>{curvaActual[0].sku.substring(0, curvaActual[0].sku.length - 3)}XXX</strong> ({curvaActual.length} items)</div>
              <div className="ed03-tabla-container">
                <table className="ed03-tabla" style={{ fontSize: isMobile ? '11px' : '13px' }}>
                  <thead><tr><th>SKU</th><th>Descripcion</th><th>SAP</th><th>Capt.</th><th>Fisico</th><th>Dif.</th></tr></thead>
                  <tbody>
                    {curvaActual.map((s: any, i: number) => (
                      <tr key={s.id} style={{ background: s.diferencia !== undefined ? (s.diferencia === 0 ? 'var(--success-bg)' : 'var(--error-bg)') : 'transparent' }}>
                        <td className="ed03-ticket-id" style={{ fontSize: isMobile ? '10px' : '13px' }}>{s.sku}</td>
                        <td style={{ fontSize: isMobile ? '10px' : '12px' }}>{s.denominacion}</td>
                        <td>{s.cantidad_sap}</td><td style={{ color: 'var(--text-muted)' }}>{s.capturadoTotal || 0}</td>
                        <td><input type="number" className="ad02-input-cantidad" value={s.cantidad_fisica ?? ''} onChange={(e: any) => handleCantidadChange(s.id, parseInt(e.target.value) || 0, i)} onKeyDown={(e: any) => handleCantidadKeyDown(e, i)}
                          style={{ width: isMobile ? '50px' : '70px', padding: isMobile ? '4px' : '8px', fontSize: isMobile ? '12px' : '14px', textAlign: 'center', border: '1px solid var(--border-input)', borderRadius: '4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }} /></td>
                        <td style={{ fontWeight: 600, color: s.diferencia !== undefined ? (s.diferencia === 0 ? 'var(--success-text)' : 'var(--error-text)') : 'var(--text-muted)', textAlign: 'center' }}>{s.diferencia !== undefined ? (s.diferencia === 0 ? 'OK' : s.diferencia) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ad02-footer" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <span className="ad02-totales" style={{ fontSize: isMobile ? '11px' : '13px' }}>SAP: {curvaActual.reduce((s: number, i: any) => s + i.cantidad_sap, 0)} | Capt: {curvaActual.reduce((s: number, i: any) => s + (i.capturadoTotal || 0), 0)} | Fis: {curvaActual.filter((s: any) => s.cantidad_fisica !== undefined).reduce((s: number, i: any) => s + (i.cantidad_fisica || 0), 0)}</span>
                <button className="ad02-btn-guardar" onClick={guardarCaja} disabled={guardando} style={{ fontSize: isMobile ? '11px' : '14px', padding: isMobile ? '8px 14px' : '10px 20px' }}>
                  {guardando ? 'Guardando...' : 'Guardar Caja'}
                </button>
              </div>
            </>
          )}

          {curvaActual.length === 0 && !showAgregarSKU && (
            <div className="ad02-empty"><p style={{ fontSize: isMobile ? '13px' : '16px' }}>Escanea un EAN o ingresa un SKU</p><p style={{ fontSize: isMobile ? '11px' : '13px' }}>Presiona Enter para ver la curva completa</p></div>
          )}
        </>
      )}
    </div>
  );
};

export default AD02Captura;
