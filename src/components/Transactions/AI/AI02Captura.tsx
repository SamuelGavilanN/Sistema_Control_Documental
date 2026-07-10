// src/components/Transactions/AI/AI02Captura.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import './AI02.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const AI02Captura: React.FC = () => {
  const [tareas, setTareas]: any = useState([]);
  const [cargando, setCargando]: any = useState(true);
  const [mensaje, setMensaje]: any = useState({ tipo: '', texto: '', visible: false });
  const [tareaSeleccionada, setTareaSeleccionada]: any = useState(null);
  const [mostrarCrearTarea, setMostrarCrearTarea]: any = useState(false);
  const [mostrarCaptura, setMostrarCaptura]: any = useState(false);
  const [inputEmpaque, setInputEmpaque]: any = useState('');
  const [empaquesTarea, setEmpaquesTarea]: any = useState([]);
  const [bomsConsolidados, setBomsConsolidados]: any = useState([]);
  const [capturas, setCapturas]: any = useState([]);
  const [contador, setContador]: any = useState(0);
  const [inputBOM, setInputBOM]: any = useState('');
  const inputEmpaqueRef: any = useRef(null);
  const inputBOMRef: any = useRef(null);
  const usuario: any = auth.getUsuario();

  useEffect(() => { cargarTareas(); }, []);

  const cargarTareas = async () => {
    setCargando(true);
    try {
      const resp = await fetch(API_URL + '/ai_tareas?select=*&order=creado_en.desc', { headers: HEADERS });
      const data = await resp.json();
      if (data && data.length > 0) {
        const tareasConDatos = await Promise.all(data.map(async (tarea: any) => {
          const respEmpaques = await fetch(API_URL + '/ai_tarea_empaques?select=numero_empaque&tarea_id=eq.' + tarea.id, { headers: HEADERS });
          const empaques = await respEmpaques.json();
          
          let totalSistema = 0;
          for (const emp of (empaques || [])) {
            const respInv = await fetch(API_URL + '/ai_inventario?select=id&numero_empaque=eq.' + encodeURIComponent(emp.numero_empaque), { headers: HEADERS });
            const invData = await respInv.json();
            if (invData && invData.length > 0) {
              const respBoms = await fetch(API_URL + '/ai_inventario_boms?select=cantidad_maxima&empaque_id=eq.' + invData[0].id, { headers: HEADERS });
              const boms = await respBoms.json();
              totalSistema += boms ? boms.reduce((s: number, b: any) => s + b.cantidad_maxima, 0) : 0;
            }
          }

          const respCapturas = await fetch(API_URL + '/ai_capturas?select=id&tarea_id=eq.' + tarea.id, { headers: HEADERS });
          const capturasData = await respCapturas.json();
          const totalRevisados = capturasData ? capturasData.length : 0;

          return {
            ...tarea,
            empaques: (empaques || []).map((e: any) => e.numero_empaque),
            total_bultos_sistema: totalSistema,
            total_bultos_revisados: totalRevisados
          };
        }));
        setTareas(tareasConDatos);
      } else {
        setTareas([]);
      }
      setCargando(false);
    } catch (e) { setCargando(false); }
  };

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  const generarIdTarea = () => {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = ahora.getFullYear().toString().slice(-2);
    const random = String(Math.floor(Math.random() * 900) + 100);
    return 'AUI' + dia + mes + anio + random;
  };

  const handleAgregarEmpaque = async () => {
    const valor = inputEmpaque.trim();
    if (!valor) return;
    if (empaquesTarea.find((e: any) => e === valor)) {
      mostrarMensaje('warning', 'Empaque ya agregado');
      setInputEmpaque('');
      return;
    }

    // Verificar que existe en inventario
    const resp = await fetch(API_URL + '/ai_inventario?select=*&numero_empaque=eq.' + encodeURIComponent(valor), { headers: HEADERS });
    const data = await resp.json();
    if (!data || data.length === 0) {
      mostrarMensaje('error', 'Empaque no encontrado en inventario AI01');
      return;
    }

    setEmpaquesTarea([...empaquesTarea, valor]);
    setInputEmpaque('');
    setTimeout(() => inputEmpaqueRef.current?.focus(), 100);
  };

  const handleCrearTarea = async () => {
    if (empaquesTarea.length === 0) {
      mostrarMensaje('warning', 'Agregue al menos un empaque');
      return;
    }

    const idTarea = generarIdTarea();

    // Obtener cod_local y destino del primer empaque
    const resp = await fetch(API_URL + '/ai_inventario?select=cod_destino,destino&numero_empaque=eq.' + encodeURIComponent(empaquesTarea[0]), { headers: HEADERS });
    const data = await resp.json();
    const codLocal = data && data.length > 0 ? data[0].cod_destino : '';
    const local = data && data.length > 0 ? data[0].destino : '';

    // Calcular total sistema
    let totalSistema = 0;
    for (const emp of empaquesTarea) {
      const respInv = await fetch(API_URL + '/ai_inventario?select=id&numero_empaque=eq.' + encodeURIComponent(emp), { headers: HEADERS });
      const invData = await respInv.json();
      if (invData && invData.length > 0) {
        const respBoms = await fetch(API_URL + '/ai_inventario_boms?select=cantidad_maxima&empaque_id=eq.' + invData[0].id, { headers: HEADERS });
        const boms = await respBoms.json();
        totalSistema += boms ? boms.reduce((s: number, b: any) => s + b.cantidad_maxima, 0) : 0;
      }
    }

    try {
      const respTarea = await fetch(API_URL + '/ai_tareas', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          numero_tarea: idTarea,
          cod_local: codLocal,
          local: local,
          estado: 'Pendiente',
          total_bultos_sistema: totalSistema,
          creado_por: usuario?.id
        })
      });

      if (respTarea.ok) {
        const tareaData = await respTarea.json();
        const tarea = Array.isArray(tareaData) ? tareaData[0] : tareaData;

        for (const emp of empaquesTarea) {
          await fetch(API_URL + '/ai_tarea_empaques', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ tarea_id: tarea.id, numero_empaque: emp })
          });
        }

        mostrarMensaje('success', 'Tarea ' + idTarea + ' creada');
        setMostrarCrearTarea(false);
        setEmpaquesTarea([]);
        cargarTareas();
      }
    } catch (e) { mostrarMensaje('error', 'Error al crear tarea'); }
  };

  const handleIniciarTarea = async (tarea: any) => {
    setTareaSeleccionada(tarea);

    // Consolidar BOMs de todos los empaques
    let bomsTemp: any[] = [];
    for (const emp of tarea.empaques) {
      const respInv = await fetch(API_URL + '/ai_inventario?select=id&numero_empaque=eq.' + encodeURIComponent(emp), { headers: HEADERS });
      const invData = await respInv.json();
      if (invData && invData.length > 0) {
        const respBoms = await fetch(API_URL + '/ai_inventario_boms?select=*&empaque_id=eq.' + invData[0].id, { headers: HEADERS });
        const boms = await respBoms.json();
        if (boms) {
          for (const bom of boms) {
            const existente = bomsTemp.find((b: any) => b.bom_sku === bom.bom_sku);
            if (existente) {
              existente.cantidad_sistema += bom.cantidad_maxima;
            } else {
              bomsTemp.push({ bom_sku: bom.bom_sku, cantidad_sistema: bom.cantidad_maxima, cantidad_revisada: 0 });
            }
          }
        }
      }
    }

    // Cargar capturas existentes
    const respCapturas = await fetch(API_URL + '/ai_capturas?select=*&tarea_id=eq.' + tarea.id + '&order=creado_en.asc', { headers: HEADERS });
    const capturasData = await respCapturas.json() || [];

    // Actualizar cantidades revisadas
    capturasData.forEach((c: any) => {
      const bom = bomsTemp.find((b: any) => b.bom_sku === c.bom_sku);
      if (bom) bom.cantidad_revisada++;
    });

    setBomsConsolidados(bomsTemp);
    setCapturas(capturasData);
    setContador(capturasData.length);

    // Actualizar estado si estaba Pendiente
    if (tarea.estado === 'Pendiente') {
      await fetch(API_URL + '/ai_tareas?id=eq.' + tarea.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'En Proceso', iniciado_en: new Date().toISOString(), auditor: usuario?.id })
      });
    }

    setMostrarCaptura(true);
    setTimeout(() => inputBOMRef.current?.focus(), 300);
  };

  const handleCapturarBOM = async () => {
    const valor = inputBOM.trim();
    if (!valor || !tareaSeleccionada) return;

    const bomEsperado = bomsConsolidados.find((b: any) => b.bom_sku === valor);
    let estado = 'NO_ENCONTRADO';

    if (bomEsperado) {
      bomEsperado.cantidad_revisada++;
      const nuevaCantidad = bomEsperado.cantidad_revisada;
      
      if (nuevaCantidad < bomEsperado.cantidad_sistema) estado = 'FALTA';
      else if (nuevaCantidad === bomEsperado.cantidad_sistema) estado = 'OK';
      else estado = 'SOBRA';

      setBomsConsolidados([...bomsConsolidados]);
    }

    try {
      await fetch(API_URL + '/ai_capturas', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tarea_id: tareaSeleccionada.id,
          bom_sku: valor,
          cantidad_sistema: bomEsperado ? bomEsperado.cantidad_sistema : 0,
          capturado_por: usuario?.id
        })
      });
    } catch (e) {}

    setCapturas([{ bom_sku: valor, estado, creado_en: new Date().toISOString() }, ...capturas]);
    setContador(contador + 1);
    setInputBOM('');
    setTimeout(() => inputBOMRef.current?.focus(), 100);
  };

  const handleFinalizarTarea = async () => {
    if (!tareaSeleccionada) return;
    try {
      const totalRevisado = contador;
      const hayDiferencias = bomsConsolidados.some((b: any) => b.cantidad_revisada !== b.cantidad_sistema);
      
      await fetch(API_URL + '/ai_tareas?id=eq.' + tareaSeleccionada.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: hayDiferencias ? 'Con Diferencias' : 'Finalizado',
          total_bultos_revisados: totalRevisado,
          finalizado_en: new Date().toISOString()
        })
      });

      mostrarMensaje('success', hayDiferencias ? 'Tarea finalizada con diferencias' : 'Tarea finalizada correctamente');
      setMostrarCaptura(false);
      setTareaSeleccionada(null);
      cargarTareas();
    } catch (e) { mostrarMensaje('error', 'Error al finalizar'); }
  };

  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case 'OK': return { bg: 'var(--success-bg)', color: 'var(--success-text)' };
      case 'FALTA': return { bg: 'var(--warning-bg)', color: 'var(--warning-text)' };
      case 'SOBRA': return { bg: 'var(--error-bg)', color: 'var(--error-text)' };
      case 'NO_ENCONTRADO': return { bg: 'var(--error-bg)', color: 'var(--error-text)' };
      default: return { bg: 'var(--bg-panel)', color: 'var(--text-primary)' };
    }
  };

  if (cargando) {
    return <div className="ai02-view"><div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando...</div></div>;
  }

  return (
    <div className="ai02-view">
      {mensaje.visible && <div className={'ai02-toast ai02-toast-' + mensaje.tipo}>{mensaje.texto}</div>}

      <div className="ai02-header"><h2>AI02 · Captura Auditoria Inv</h2></div>

      <div className="ai02-toolbar">
        <button className="ai02-btn ai02-btn-primary" onClick={() => { setMostrarCrearTarea(true); setEmpaquesTarea([]); setInputEmpaque(''); }}>
          + Nueva Tarea
        </button>
      </div>

      <div className="ai02-grid">
        {tareas.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-placeholder)' }}>No hay tareas</div>
        ) : (
          tareas.map((tarea: any) => {
            const porcentaje = tarea.total_bultos_sistema > 0 ? Math.round((tarea.total_bultos_revisados / tarea.total_bultos_sistema) * 100) : 0;
            const colorProgreso = tarea.estado === 'Finalizado' ? '#15803d' : tarea.estado === 'Con Diferencias' ? '#dc2626' : '#3b82f6';
            
            return (
              <div key={tarea.id} className="ai02-card">
                <div className="ai02-card-header">
                  <span className="ai02-card-id">{tarea.numero_tarea}</span>
                  <span className="ai02-card-badge" style={{
                    background: tarea.estado === 'Pendiente' ? '#fef3c7' : tarea.estado === 'En Proceso' ? '#dbeafe' : tarea.estado === 'Finalizado' ? '#dcfce7' : '#fef2f2',
                    color: tarea.estado === 'Pendiente' ? '#b45309' : tarea.estado === 'En Proceso' ? '#1d4ed8' : tarea.estado === 'Finalizado' ? '#15803d' : '#dc2626'
                  }}>{tarea.estado}</span>
                </div>
                <div className="ai02-card-body">
                  <div className="ai02-card-row"><span>Local</span><strong>{tarea.cod_local} - {tarea.local}</strong></div>
                  <div className="ai02-card-row"><span>Empaques</span><strong>{tarea.empaques.length}</strong></div>
                  <div className="ai02-card-row"><span>Bultos Sistema</span><strong>{tarea.total_bultos_sistema}</strong></div>
                  <div className="ai02-card-row"><span>Bultos Revisados</span><strong>{tarea.total_bultos_revisados}</strong></div>
                  {tarea.empaques.length > 0 && (
                    <div className="ai02-card-empaques">
                      {tarea.empaques.slice(0, 3).map((emp: string, idx: number) => (
                        <span key={idx} className="ai02-card-empaque-badge">{emp}</span>
                      ))}
                      {tarea.empaques.length > 3 && <span className="ai02-card-empaque-badge">+{tarea.empaques.length - 3}</span>}
                    </div>
                  )}
                </div>
                <div className="ai02-progress">
                  <div className="ai02-progress-info">
                    <span>Progreso</span>
                    <span>{porcentaje}%</span>
                  </div>
                  <div className="ai02-progress-bar">
                    <div className="ai02-progress-fill" style={{ width: porcentaje + '%', background: colorProgreso }}></div>
                  </div>
                </div>
                <div className="ai02-card-footer">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auditor: {tarea.auditor ? (tarea.auditor_nombre || 'Asignado') : 'Pendiente'}</span>
                  {(tarea.estado === 'Pendiente' || tarea.estado === 'En Proceso') && (
                    <button className="ai02-btn ai02-btn-primary" onClick={() => handleIniciarTarea(tarea)} style={{ fontSize: '12px', padding: '6px 12px' }}>
                      {tarea.estado === 'Pendiente' ? 'Iniciar' : 'Continuar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Crear Tarea */}
      {mostrarCrearTarea && (
        <div className="ai02-modal-overlay" onClick={() => setMostrarCrearTarea(false)}>
          <div className="ai02-modal" onClick={(e: any) => e.stopPropagation()}>
            <div className="ai02-modal-header"><h2>Nueva Tarea de Auditoría</h2><button className="ai02-modal-close" onClick={() => setMostrarCrearTarea(false)}>×</button></div>
            <div className="ai02-modal-body">
              <div className="ai02-form-group">
                <label className="ai02-form-label">Agregar N° Empaque</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input ref={inputEmpaqueRef} type="text" className="ai02-form-input" value={inputEmpaque}
                    onChange={(e: any) => setInputEmpaque(e.target.value)}
                    onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarEmpaque(); } }}
                    placeholder="Escanear número de empaque..." />
                  <button className="ai02-btn ai02-btn-primary" onClick={handleAgregarEmpaque} style={{ whiteSpace: 'nowrap' }}>Agregar</button>
                </div>
              </div>
              {empaquesTarea.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label className="ai02-form-label">Empaques ({empaquesTarea.length})</label>
                  <div className="ai02-card-empaques">
                    {empaquesTarea.map((emp: string, idx: number) => (
                      <span key={idx} className="ai02-card-empaque-badge" style={{ fontSize: '11px', padding: '4px 10px' }}>
                        {emp}
                        <button onClick={() => setEmpaquesTarea(empaquesTarea.filter((_: string, i: number) => i !== idx))}
                          style={{ marginLeft: '6px', background: 'none', border: 'none', color: 'var(--error-text)', cursor: 'pointer', fontSize: '14px' }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="ai02-modal-footer">
              <button className="ai02-btn" onClick={() => setMostrarCrearTarea(false)}>Cancelar</button>
              <button className="ai02-btn ai02-btn-primary" onClick={handleCrearTarea} disabled={empaquesTarea.length === 0}>Crear Tarea</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Captura */}
      {mostrarCaptura && tareaSeleccionada && (
        <div className="ai02-modal-overlay" onClick={() => { setMostrarCaptura(false); setTareaSeleccionada(null); }}>
          <div className="ai02-modal" style={{ maxWidth: '700px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="ai02-modal-header">
              <h2>{tareaSeleccionada.numero_tarea} - Captura</h2>
              <button className="ai02-modal-close" onClick={() => { setMostrarCaptura(false); setTareaSeleccionada(null); }}>×</button>
            </div>
            <div className="ai02-modal-body">
              <div className="ai02-captura-resumen">
                <div className="ai02-captura-resumen-card"><span>Total Capturas</span><strong className="ai02-captura-contador" style={{ fontSize: '18px' }}>{contador}</strong></div>
                <div className="ai02-captura-resumen-card"><span>Sistema</span><strong style={{ fontSize: '18px' }}>{bomsConsolidados.reduce((s: number, b: any) => s + b.cantidad_sistema, 0)}</strong></div>
                <div className="ai02-captura-resumen-card"><span>Revisado</span><strong style={{ fontSize: '18px' }}>{bomsConsolidados.reduce((s: number, b: any) => s + b.cantidad_revisada, 0)}</strong></div>
              </div>

              <div className="ai02-captura-buscador">
                <input ref={inputBOMRef} type="text" className="ai02-captura-input" value={inputBOM}
                  onChange={(e: any) => setInputBOM(e.target.value)}
                  onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleCapturarBOM(); } }}
                  placeholder="Escanear BOM/SKU..." autoFocus />
                <button className="ai02-btn ai02-btn-primary" onClick={handleCapturarBOM} style={{ padding: '14px 24px', fontSize: '16px' }}>Capturar</button>
              </div>

              <div className="ai02-captura-bom-list">
                {bomsConsolidados.map((bom: any, idx: number) => {
                  const estilo = bom.cantidad_revisada === 0 ? { bg: 'var(--bg-panel)', color: 'var(--text-muted)' } :
                    bom.cantidad_revisada < bom.cantidad_sistema ? { bg: 'var(--warning-bg)', color: 'var(--warning-text)' } :
                    bom.cantidad_revisada === bom.cantidad_sistema ? { bg: 'var(--success-bg)', color: 'var(--success-text)' } :
                    { bg: 'var(--error-bg)', color: 'var(--error-text)' };
                  return (
                    <div key={idx} className="ai02-captura-bom-item" style={{ background: estilo.bg }}>
                      <span className="ai02-captura-bom-sku" style={{ color: estilo.color }}>{bom.bom_sku}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: estilo.color }}>
                        {bom.cantidad_revisada}/{bom.cantidad_sistema}
                      </span>
                    </div>
                  );
                })}
                {capturas.filter((c: any) => !bomsConsolidados.find((b: any) => b.bom_sku === c.bom_sku)).length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--error-text)', marginBottom: '4px' }}>BOMs No Encontrados</div>
                    {capturas.filter((c: any) => !bomsConsolidados.find((b: any) => b.bom_sku === c.bom_sku)).map((c: any, idx: number) => (
                      <div key={idx} className="ai02-captura-bom-item" style={{ background: 'var(--error-bg)' }}>
                        <span className="ai02-captura-bom-sku" style={{ color: 'var(--error-text)' }}>{c.bom_sku}</span>
                        <span style={{ fontSize: '11px', color: 'var(--error-text)' }}>No encontrado</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="ai02-btn ai02-btn-success" onClick={handleFinalizarTarea}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}>
                Finalizar Tarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AI02Captura;
