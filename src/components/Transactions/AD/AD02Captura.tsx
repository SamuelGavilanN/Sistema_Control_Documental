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
  const usuario = auth.getUsuario();
  const [misTareas, setMisTareas] = useState<Auditoria[]>([]);
  const [tareaActiva, setTareaActiva] = useState<Auditoria | null>(null);
  const [todosLosSKUs, setTodosLosSKUs] = useState<SKUItem[]>([]);
  const [curvaActual, setCurvaActual] = useState<SKUItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cajaActual, setCajaActual] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const busquedaRef = useRef<HTMLInputElement>(null);
  const primerInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detectar cambios de tamaño
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cargar tareas iniciales
  useEffect(() => {
    cargarMisTareas();
    return () => {
      // Limpiar polling al desmontar
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Iniciar polling cuando NO hay tarea activa
  useEffect(() => {
    if (!tareaActiva) {
      // Iniciar polling cada 10 segundos
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      pollingIntervalRef.current = setInterval(() => {
        cargarMisTareasSilencioso();
      }, 10000);
    } else {
      // Detener polling cuando hay tarea activa
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [tareaActiva]);

  const cargarMisTareas = async (mostrarCargando: boolean = true) => {
    if (mostrarCargando) setCargando(true);
    const { data } = await supabase.from('ad_auditorias').select('*')
      .eq('usuario_asignado', usuario?.id)
      .in('estado', ['Pendiente', 'En Proceso'])
      .order('creado_en', { ascending: false });
    if (data) {
      setMisTareas(data);
      // Si la tarea activa ya no está en la lista (ej: fue reabierta pero desapareció),
      // la actualizamos silenciosamente
      if (tareaActiva) {
        const tareaActualizada = data.find(t => t.id === tareaActiva.id);
        if (tareaActualizada && tareaActualizada.estado !== tareaActiva.estado) {
          // La tarea activa cambió de estado (ej: de Con Diferencias a En Proceso)
          setTareaActiva(tareaActualizada);
        } else if (!tareaActualizada) {
          // La tarea activa ya no está disponible (quizás fue eliminada o completada)
          setTareaActiva(null);
          setCurvaActual([]);
          setTodosLosSKUs([]);
        }
      }
    }
    if (mostrarCargando) setCargando(false);
  };

  const cargarMisTareasSilencioso = async () => {
    const { data } = await supabase.from('ad_auditorias').select('*')
      .eq('usuario_asignado', usuario?.id)
      .in('estado', ['Pendiente', 'En Proceso'])
      .order('creado_en', { ascending: false });
    if (data) {
      setMisTareas(data);
      // Si la tarea activa ya no está en la lista (ej: fue reabierta pero desapareció),
      // la actualizamos silenciosamente
      if (tareaActiva) {
        const tareaActualizada = data.find(t => t.id === tareaActiva.id);
        if (!tareaActualizada) {
          // La tarea activa ya no está disponible (quizás fue eliminada o completada)
          setTareaActiva(null);
          setCurvaActual([]);
          setTodosLosSKUs([]);
        }
      }
    }
  };

  const abrirTarea = async (tarea: Auditoria) => {
    // Detener polling mientras se trabaja en una tarea
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

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
      setTodosLosSKUs(sap.map((s: any) => {
        const capturado = capturasPrevias.filter((c: any) => c.sku === s.sku).reduce((sum: number, c: any) => sum + (c.cantidad_fisica || 0), 0);
        return { ...s, cantidad_fisica: undefined, diferencia: undefined, capturadoTotal: capturado };
      }));
    }
    setCajaActual(cajaIds.length + 1);
    if (tarea.estado === 'Pendiente') {
      await supabase.from('ad_auditorias').update({ estado: 'En Proceso' }).eq('id', tarea.id);
      setTareaActiva(prev => prev ? { ...prev, estado: 'En Proceso' } : null);
    }
    setTimeout(() => busquedaRef.current?.focus(), 300);
  };

  const buscarCurva = () => {
    if (!busqueda.trim()) return;
    let skuBuscado = busqueda.trim();
    if (skuBuscado.length > 11) skuBuscado = skuBuscado.substring(1, skuBuscado.length - 1);
    const prefijo = skuBuscado.substring(0, skuBuscado.length - 3);
    const curva = todosLosSKUs.filter(s => s.sku.startsWith(prefijo) && s.sku.length === skuBuscado.length);
    if (curva.length === 0) {
      alert('SKU no encontrado');
      return;
    }
    setCurvaActual(curva.map(s => ({ ...s, cantidad_fisica: undefined, diferencia: undefined })));
    // Enfocar primer input de cantidad después de buscar
    setTimeout(() => {
      const inputs = document.querySelectorAll('.ad02-input-cantidad');
      if (inputs.length > 0) (inputs[0] as HTMLInputElement).focus();
    }, 200);
  };

  const handleCantidadChange = (skuId: string, valor: number, index: number) => {
    setCurvaActual(prev => prev.map((s, i) => {
      if (i === index) {
        const diferencia = (s.cantidad_sap || 0) - (s.capturadoTotal || 0) - valor;
        return { ...s, cantidad_fisica: valor, diferencia };
      }
      return s;
    }));
  };

  const handleCantidadKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < curvaActual.length) {
        const inputs = document.querySelectorAll('.ad02-input-cantidad');
        (inputs[nextIndex] as HTMLInputElement)?.focus();
      } else {
        // Último campo: enfocar botón guardar
        (document.querySelector('.ad02-btn-guardar') as HTMLElement)?.focus();
      }
    }
  };

  const guardarCaja = async () => {
    if (!tareaActiva || curvaActual.length === 0) return;
    const skusConFisico = curvaActual.filter(s => s.cantidad_fisica !== undefined && s.cantidad_fisica > 0);
    if (skusConFisico.length === 0) {
      alert('Ingresa al menos una cantidad mayor a 0');
      return;
    }

    const { data: caja, error: cajaError } = await supabase.from('ad_capturas_cajas').insert([{
      auditoria_id: tareaActiva.id,
      numero_caja: cajaActual,
      capturado_por: usuario?.id,
      estado: 'Capturada'
    }]).select('id').single();

    if (cajaError) {
      console.error('Error al crear caja:', cajaError);
      alert('Error al guardar la caja: ' + cajaError.message);
      return;
    }

    if (caja) {
      const { error: skuError } = await supabase.from('ad_capturas_skus').insert(
        skusConFisico.map(s => ({
          caja_id: (caja as any).id,
          sku: s.sku,
          cantidad_sap: s.cantidad_sap,
          cantidad_fisica: s.cantidad_fisica || 0,
          diferencia: (s.cantidad_sap || 0) - (s.capturadoTotal || 0) - (s.cantidad_fisica || 0)
        }))
      );
      if (skuError) {
        console.error('Error al guardar SKUs:', skuError);
        alert('Error al guardar los SKUs: ' + skuError.message);
        return;
      }
    }

    setCajaActual(prev => prev + 1);
    setCurvaActual([]);
    setBusqueda('');
    // Recargar la tarea para actualizar los totales capturados
    await abrirTarea(tareaActiva);
    // Enfocar búsqueda para la siguiente curva
    setTimeout(() => busquedaRef.current?.focus(), 300);
  };

  const finalizarTarea = async () => {
    if (!tareaActiva) return;
    
    const confirmar = confirm('¿Estás seguro de finalizar esta tarea?');
    if (!confirmar) return;

    const { data: cajas } = await supabase.from('ad_capturas_cajas').select('id').eq('auditoria_id', tareaActiva.id);
    const cajaIds = cajas?.map((c: any) => c.id) || [];
    let hayDiferencias = false;
    
    if (cajaIds.length > 0) {
      const { data: capturas } = await supabase.from('ad_capturas_skus').select('*').in('caja_id', cajaIds);
      const agrupado: Record<string, { sap: number; fisico: number }> = {};
      (capturas || []).forEach((c: any) => {
        if (!agrupado[c.sku]) agrupado[c.sku] = { sap: c.cantidad_sap, fisico: 0 };
        agrupado[c.sku].fisico += c.cantidad_fisica || 0;
      });
      // Verificar diferencias comparando con los datos SAP originales
      const { data: sapData } = await supabase.from('ad_datos_sap').select('sku, cantidad_sap').eq('auditoria_id', tareaActiva.id);
      if (sapData) {
        hayDiferencias = sapData.some(sap => {
          const capturado = agrupado[sap.sku];
          return capturado ? sap.cantidad_sap !== capturado.fisico : sap.cantidad_sap > 0;
        });
      }
    }

    const nuevoEstado = hayDiferencias ? 'Con Diferencias' : 'Finalizado';
    await supabase.from('ad_auditorias').update({ 
      estado: nuevoEstado, 
      finalizado_en: new Date().toISOString() 
    }).eq('id', tareaActiva.id);
    
    alert(hayDiferencias ? 'Tarea finalizada con diferencias' : 'Tarea finalizada correctamente');
    setTareaActiva(null);
    setCurvaActual([]);
    setTodosLosSKUs([]);
    // Recargar la lista de tareas después de finalizar
    await cargarMisTareas();
  };

  const volverALista = async () => {
    setTareaActiva(null);
    setCurvaActual([]);
    setTodosLosSKUs([]);
    await cargarMisTareas();
  };

  return (
    <div className="ad02-view">
      {!tareaActiva ? (
        <>
          <div className="ad02-header">
            <h2>Mis Tareas de Auditoría</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {cargando ? 'Cargando...' : `${misTareas.length} tarea(s) pendiente(s)`}
            </span>
          </div>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cargando ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>Cargando...</p>
              ) : misTareas.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>No tienes tareas pendientes</p>
              ) : (
                misTareas.map(t => (
                  <div key={t.id} onClick={() => abrirTarea(t)} style={{ padding: '12px', background: '#f8fafd', borderRadius: '8px', border: '1px solid #eef0f5', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#1d4ed8', fontSize: '13px' }}>{t.numero_tarea}</span>
                      <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600, background: t.estado === 'En Proceso' ? '#dbeafe' : '#fef3c7', color: t.estado === 'En Proceso' ? '#1d4ed8' : '#b45309' }}>{t.estado}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{t.codigo_local} - {t.nombre_local}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Acta: {t.acta || '-'} | Guía: {t.guia || '-'}</div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="ed03-tabla-container">
              <table className="ed03-tabla">
                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th>Tienda</th>
                    <th>Acta</th>
                    <th>Guía</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr>
                  ) : misTareas.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No tienes tareas pendientes</td></tr>
                  ) : (
                    misTareas.map(t => (
                      <tr key={t.id}>
                        <td className="ed03-ticket-id">{t.numero_tarea}</td>
                        <td>{t.codigo_local} - {t.nombre_local}</td>
                        <td>{t.acta || '-'}</td>
                        <td>{t.guia || '-'}</td>
                        <td>
                          <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: t.estado === 'En Proceso' ? '#dbeafe' : '#fef3c7', color: t.estado === 'En Proceso' ? '#1d4ed8' : '#b45309' }}>
                            {t.estado}
                          </span>
                        </td>
                        <td>
                          <button className="ad02-btn-iniciar" onClick={() => abrirTarea(t)}>Iniciar</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="ad02-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: isMobile ? '16px' : '20px' }}>{tareaActiva.numero_tarea}</h2>
              <span className="ad02-subtitle">{tareaActiva.codigo_local} - {tareaActiva.nombre_local}</span>
            </div>
            <div className="ad02-header-actions" style={{ flexWrap: 'wrap', gap: '6px' }}>
              <span className="ad02-caja-badge" style={{ fontSize: isMobile ? '11px' : '13px' }}>Caja #{cajaActual}</span>
              <button className="ad02-btn-finalizar" onClick={finalizarTarea} style={{ fontSize: isMobile ? '11px' : '13px', padding: isMobile ? '6px 10px' : '8px 16px' }}>Finalizar</button>
              <button className="ed01-btn-cancel" onClick={volverALista} style={{ fontSize: isMobile ? '11px' : '13px' }}>Volver</button>
            </div>
          </div>

          <div className="ad02-busqueda">
            <input
              ref={busquedaRef}
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarCurva(); } }}
              placeholder="Escanear EAN o SKU..."
              autoFocus
              style={{ fontSize: isMobile ? '14px' : '18px', padding: isMobile ? '10px' : '14px' }}
            />
            <button className="ad02-btn-buscar" onClick={buscarCurva} style={{ fontSize: isMobile ? '13px' : '16px', padding: isMobile ? '10px 16px' : '14px 24px' }}>Buscar</button>
          </div>

          {curvaActual.length > 0 && (
            <>
              <div className="ad02-curva-info" style={{ fontSize: isMobile ? '11px' : '13px' }}>
                Curva: <strong>{curvaActual[0].sku.substring(0, curvaActual[0].sku.length - 3)}XXX</strong> ({curvaActual.length} items)
              </div>
              <div className="ed03-tabla-container">
                <table className="ed03-tabla" style={{ fontSize: isMobile ? '11px' : '13px' }}>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Descripción</th>
                      <th>SAP</th>
                      <th>Capt.</th>
                      <th>Físico</th>
                      <th>Dif.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curvaActual.map((s, i) => (
                      <tr key={s.id} style={{ background: s.diferencia !== undefined ? (s.diferencia === 0 ? '#dcfce7' : '#fef2f2') : 'transparent' }}>
                        <td className="ed03-ticket-id" style={{ fontSize: isMobile ? '10px' : '13px' }}>{s.sku}</td>
                        <td style={{ fontSize: isMobile ? '10px' : '12px' }}>{s.denominacion}</td>
                        <td>{s.cantidad_sap}</td>
                        <td style={{ color: '#64748b' }}>{s.capturadoTotal || 0}</td>
                        <td>
                          <input
                            ref={i === 0 ? primerInputRef : undefined}
                            type="number"
                            className="ad02-input-cantidad"
                            value={s.cantidad_fisica ?? ''}
                            onChange={e => handleCantidadChange(s.id, parseInt(e.target.value) || 0, i)}
                            onKeyDown={e => handleCantidadKeyDown(e, i)}
                            style={{ width: isMobile ? '50px' : '70px', padding: isMobile ? '4px' : '8px', fontSize: isMobile ? '12px' : '14px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: s.diferencia !== undefined ? (s.diferencia === 0 ? '#15803d' : '#dc2626') : '#64748b', textAlign: 'center' }}>
                          {s.diferencia !== undefined ? (s.diferencia === 0 ? '✓' : s.diferencia) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ad02-footer" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <span className="ad02-totales" style={{ fontSize: isMobile ? '11px' : '13px' }}>
                  SAP: {curvaActual.reduce((s, i) => s + (i.cantidad_sap || 0), 0)} | 
                  Capt: {curvaActual.reduce((s, i) => s + (i.capturadoTotal || 0), 0)} | 
                  Fis: {curvaActual.filter(s => s.cantidad_fisica !== undefined).reduce((s, i) => s + (i.cantidad_fisica || 0), 0)}
                </span>
                <button className="ad02-btn-guardar" onClick={guardarCaja} style={{ fontSize: isMobile ? '11px' : '14px', padding: isMobile ? '8px 14px' : '10px 20px' }}>
                  Guardar Caja
                </button>
              </div>
            </>
          )}

          {curvaActual.length === 0 && (
            <div className="ad02-empty">
              <p style={{ fontSize: isMobile ? '13px' : '16px' }}>Escanea un EAN o ingresa un SKU</p>
              <p style={{ fontSize: isMobile ? '11px' : '13px' }}>Presiona Enter para ver la curva completa</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AD02Captura;
