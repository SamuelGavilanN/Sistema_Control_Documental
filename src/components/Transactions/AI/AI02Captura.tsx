// src/components/Transactions/AI/AI02Captura.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import * as XLSX from 'xlsx';
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
  const [mostrarDetalle, setMostrarDetalle]: any = useState(false);
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

          const respCapturas = await fetch(API_URL + '/ai_capturas?select=id,bom_sku&tarea_id=eq.' + tarea.id, { headers: HEADERS });
          const capturasData = await respCapturas.json();
          
          // Solo contar BOMs que están en el sistema (no los no encontrados)
          const bomsSistema: string[] = [];
          for (const emp of (empaques || [])) {
            const respInv = await fetch(API_URL + '/ai_inventario?select=id&numero_empaque=eq.' + encodeURIComponent(emp.numero_empaque), { headers: HEADERS });
            const invData = await respInv.json();
            if (invData && invData.length > 0) {
              const respBoms = await fetch(API_URL + '/ai_inventario_boms?select=bom_sku&empaque_id=eq.' + invData[0].id, { headers: HEADERS });
              const boms = await respBoms.json();
              if (boms) boms.forEach((b: any) => bomsSistema.push(b.bom_sku));
            }
          }
          
          const totalRevisados = capturasData ? capturasData.filter((c: any) => bomsSistema.includes(c.bom_sku)).length : 0;

          // Obtener nombre del auditor
          let auditorNombre = '-';
          if (tarea.auditor) {
            try {
              const respUser = await fetch(API_URL + '/usuarios?select=nombre,apellido&id=eq.' + tarea.auditor, { headers: HEADERS });
              const userData = await respUser.json();
              if (userData && userData.length > 0) {
                auditorNombre = userData[0].nombre + ' ' + userData[0].apellido;
              }
            } catch (e) {}
          }

          return {
            ...tarea,
            empaques: (empaques || []).map((e: any) => e.numero_empaque),
            total_bultos_sistema: totalSistema,
            total_bultos_revisados: totalRevisados,
            auditor_nombre: auditorNombre
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

    const resp = await fetch(API_URL + '/ai_inventario?select=cod_destino,destino&numero_empaque=eq.' + encodeURIComponent(empaquesTarea[0]), { headers: HEADERS });
    const data = await resp.json();
    const codLocal = data && data.length > 0 ? data[0].cod_destino : '';
    const local = data && data.length > 0 ? data[0].destino : '';

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

    const respCapturas = await fetch(API_URL + '/ai_capturas?select=*&tarea_id=eq.' + tarea.id + '&order=creado_en.asc', { headers: HEADERS });
    const capturasData = await respCapturas.json() || [];

    capturasData.forEach((c: any) => {
      const bom = bomsTemp.find((b: any) => b.bom_sku === c.bom_sku);
      if (bom) bom.cantidad_revisada++;
    });

    setBomsConsolidados(bomsTemp);
    setCapturas(capturasData);
    setContador(capturasData.length);

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

    if (bomEsperado) {
      bomEsperado.cantidad_revisada++;
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

    const nuevaCaptura = { 
      id: Date.now().toString(),
      bom_sku: valor, 
      esNoEncontrado: !bomEsperado,
      creado_en: new Date().toISOString() 
    };
    setCapturas([nuevaCaptura, ...capturas]);
    setContador(contador + 1);
    setInputBOM('');
    setTimeout(() => inputBOMRef.current?.focus(), 100);
  };

  const handleEliminarCaptura = async (index: number) => {
    const captura = capturas[index];
    if (!captura.esNoEncontrado) {
      mostrarMensaje('warning', 'Solo se pueden eliminar capturas no encontradas');
      return;
    }

    // Eliminar de la BD
    if (captura.id && captura.id.length > 10) {
      await fetch(API_URL + '/ai_capturas?id=eq.' + captura.id, { method: 'DELETE', headers: HEADERS });
    }

    const nuevasCapturas = capturas.filter((_: any, i: number) => i !== index);
    setCapturas(nuevasCapturas);
    setContador(contador - 1);
    mostrarMensaje('success', 'Captura eliminada');
  };

  const handleFinalizarTarea = async () => {
    if (!tareaSeleccionada) return;
    try {
      // Contar solo BOMs del sistema que fueron revisados
      const bomsSistema = bomsConsolidados.map((b: any) => b.bom_sku);
      const capturasValidas = capturas.filter((c: any) => bomsSistema.includes(c.bom_sku));
      const totalRevisado = capturasValidas.length;
      
      const hayDiferencias = bomsConsolidados.some((b: any) => b.cantidad_revisada !== b.cantidad_sistema);
      const hayNoEncontrados = capturas.some((c: any) => c.esNoEncontrado);
      
      const estadoFinal = (hayDiferencias || hayNoEncontrados) ? 'Con Diferencias' : 'Finalizado';
      
      await fetch(API_URL + '/ai_tareas?id=eq.' + tareaSeleccionada.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: estadoFinal,
          total_bultos_revisados: totalRevisado,
          finalizado_en: new Date().toISOString()
        })
      });

      mostrarMensaje('success', estadoFinal === 'Finalizado' ? 'Tarea finalizada correctamente' : 'Tarea finalizada con diferencias');
      setMostrarCaptura(false);
      setTareaSeleccionada(null);
      cargarTareas();
    } catch (e) { mostrarMensaje('error', 'Error al finalizar'); }
  };

  const handleReabrirTarea = async (tarea: any) => {
    if (!window.confirm('¿Reabrir tarea ' + tarea.numero_tarea + '?')) return;
    try {
      await fetch(API_URL + '/ai_tareas?id=eq.' + tarea.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'En Proceso', finalizado_en: null })
      });
      mostrarMensaje('success', 'Tarea reabierta');
      cargarTareas();
    } catch (e) { mostrarMensaje('error', 'Error al reabrir'); }
  };

  const handleVerDetalle = async (tarea: any) => {
    setTareaSeleccionada(tarea);
    
    // Cargar datos completos
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

    const respCapturas = await fetch(API_URL + '/ai_capturas?select=*&tarea_id=eq.' + tarea.id + '&order=creado_en.asc', { headers: HEADERS });
    const capturasData = await respCapturas.json() || [];

    capturasData.forEach((c: any) => {
      const bom = bomsTemp.find((b: any) => b.bom_sku === c.bom_sku);
      if (bom) bom.cantidad_revisada++;
    });

    setBomsConsolidados(bomsTemp);
    setCapturas(capturasData);
    setMostrarDetalle(true);
  };

  const handleExportarExcel = (tarea: any) => {
    const filas: any[] = [];
    
    // Encabezado
    filas.push({
      'TAREA': tarea.numero_tarea,
      'LOCAL': tarea.cod_local + ' - ' + tarea.local,
      'ESTADO': tarea.estado,
      'BULTOS SISTEMA': tarea.total_bultos_sistema,
      'BULTOS REVISADOS': tarea.total_bultos_revisados,
      'AUDITOR': tarea.auditor_nombre || '-',
      'FECHA': new Date(tarea.creado_en).toLocaleString('es-CL')
    });
    
    filas.push({});
    filas.push({ 'BOM/SKU': 'BOM/SKU', 'CANT. SISTEMA': 'CANT. SISTEMA', 'CANT. REVISADA': 'CANT. REVISADA', 'DIFERENCIA': 'DIFERENCIA', 'ESTADO': 'ESTADO' });
    
    bomsConsolidados.forEach((bom: any) => {
      const diff = bom.cantidad_sistema - bom.cantidad_revisada;
      filas.push({
        'BOM/SKU': bom.bom_sku,
        'CANT. SISTEMA': bom.cantidad_sistema,
        'CANT. REVISADA': bom.cantidad_revisada,
        'DIFERENCIA': diff === 0 ? 'OK' : diff,
        'ESTADO': diff === 0 ? 'OK' : (diff > 0 ? 'FALTA' : 'SOBRA')
      });
    });

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria');
    XLSX.writeFile(wb, tarea.numero_tarea + '_' + tarea.cod_local + '.xlsx');
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Pendiente': return { color: '#b45309', bg: '#fef3c7' };
      case 'En Proceso': return { color: '#1d4ed8', bg: '#dbeafe' };
      case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' };
      case 'Con Diferencias': return { color: '#dc2626', bg: '#fef2f2' };
      default: return { color: '#64748b', bg: '#f1f5f9' };
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
            const eb = getEstadoBadge(tarea.estado);
            
            return (
              <div key={tarea.id} className="ai02-card">
                <div className="ai02-card-header">
                  <span className="ai02-card-id">{tarea.numero_tarea}</span>
                  <span className="ai02-card-badge" style={{ background: eb.bg, color: eb.color }}>{tarea.estado}</span>
                </div>
                <div className="ai02-card-body">
                  <div className="ai02-card-row"><span>Local</span><strong>{tarea.cod_local} - {tarea.local}</strong></div>
                  <div className="ai02-card-row"><span>Empaques</span><strong>{tarea.empaques.length}</strong></div>
                  <div className="ai02-card-row"><span>Bultos Sistema</span><strong>{tarea.total_bultos_sistema}</strong></div>
                  <div className="ai02-card-row"><span>Bultos Revisados</span><strong>{tarea.total_bultos_revisados}</strong></div>
                  <div className="ai02-card-row"><span>Auditor</span><strong>{tarea.auditor_nombre}</strong></div>
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
                    <span>Progreso (solo sistema)</span>
                    <span>{Math.min(porcentaje, 100)}%</span>
                  </div>
                  <div className="ai02-progress-bar">
                    <div className="ai02-progress-fill" style={{ width: Math.min(porcentaje, 100) + '%', background: colorProgreso }}></div>
                  </div>
                </div>
                <div className="ai02-card-footer">
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(tarea.estado === 'Pendiente' || tarea.estado === 'En Proceso') && (
                      <button className="ai02-btn ai02-btn-primary" onClick={() => handleIniciarTarea(tarea)} style={{ fontSize: '11px', padding: '5px 10px' }}>
                        {tarea.estado === 'Pendiente' ? 'Iniciar' : 'Continuar'}
                      </button>
                    )}
                    {(tarea.estado === 'Finalizado' || tarea.estado === 'Con Diferencias') && (
                      <>
                        <button className="ai02-btn" onClick={() => handleVerDetalle(tarea)} style={{ fontSize: '11px', padding: '5px 10px' }}>Ver</button>
                        <button className="ai02-btn" onClick={() => handleReabrirTarea(tarea)} style={{ fontSize: '11px', padding: '5px 10px' }}>Reabrir</button>
                      </>
                    )}
                    <button className="ai02-btn" onClick={() => handleExportarExcel(tarea)} style={{ fontSize: '11px', padding: '5px 10px' }}>Excel</button>
                  </div>
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
                <div className="ai02-captura-resumen-card"><span>Total Capturas</span><strong style={{ fontSize: '18px' }}>{contador}</strong></div>
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
                  const diff = bom.cantidad_sistema - bom.cantidad_revisada;
                  const bg = bom.cantidad_revisada === 0 ? 'var(--bg-panel)' :
                    diff > 0 ? 'var(--warning-bg)' :
                    diff === 0 ? 'var(--success-bg)' : 'var(--error-bg)';
                  const color = bom.cantidad_revisada === 0 ? 'var(--text-muted)' :
                    diff > 0 ? 'var(--warning-text)' :
                    diff === 0 ? 'var(--success-text)' : 'var(--error-text)';
                  return (
                    <div key={idx} className="ai02-captura-bom-item" style={{ background: bg }}>
                      <span className="ai02-captura-bom-sku" style={{ color: color }}>{bom.bom_sku}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: color }}>
                        {bom.cantidad_revisada}/{bom.cantidad_sistema}
                      </span>
                    </div>
                  );
                })}
                {capturas.filter((c: any) => c.esNoEncontrado || !bomsConsolidados.find((b: any) => b.bom_sku === c.bom_sku)).length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--error-text)', marginBottom: '4px' }}>
                      BOMs No Encontrados ({capturas.filter((c: any) => c.esNoEncontrado || !bomsConsolidados.find((b: any) => b.bom_sku === c.bom_sku)).length})
                    </div>
                    {capturas.filter((c: any) => c.esNoEncontrado || !bomsConsolidados.find((b: any) => b.bom_sku === c.bom_sku)).map((c: any, idx: number) => (
                      <div key={idx} className="ai02-captura-bom-item" style={{ background: 'var(--error-bg)' }}>
                        <span className="ai02-captura-bom-sku" style={{ color: 'var(--error-text)' }}>{c.bom_sku}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--error-text)' }}>No encontrado</span>
                          <button onClick={() => handleEliminarCaptura(capturas.indexOf(c))} style={{
                            width: '20px', height: '20px', background: 'transparent', color: 'var(--error-text)',
                            border: '1px solid var(--error-border)', borderRadius: '3px', cursor: 'pointer', fontSize: '12px'
                          }}>×</button>
                        </div>
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

      {/* Modal Detalle */}
      {mostrarDetalle && tareaSeleccionada && (
        <div className="ai02-modal-overlay" onClick={() => setMostrarDetalle(false)}>
          <div className="ai02-modal" style={{ maxWidth: '700px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="ai02-modal-header">
              <h2>{tareaSeleccionada.numero_tarea} - Detalle</h2>
              <button className="ai02-modal-close" onClick={() => setMostrarDetalle(false)}>×</button>
            </div>
            <div className="ai02-modal-body">
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', fontSize: '13px' }}>
                <div><strong>Local:</strong> {tareaSeleccionada.cod_local} - {tareaSeleccionada.local}</div>
                <div><strong>Estado:</strong> {tareaSeleccionada.estado}</div>
                <div><strong>Auditor:</strong> {tareaSeleccionada.auditor_nombre}</div>
                <div><strong>Empaques:</strong> {tareaSeleccionada.empaques.join(', ')}</div>
              </div>
              <div className="ai02-captura-resumen" style={{ marginBottom: '16px' }}>
                <div className="ai02-captura-resumen-card"><span>Sistema</span><strong>{bomsConsolidados.reduce((s: number, b: any) => s + b.cantidad_sistema, 0)}</strong></div>
                <div className="ai02-captura-resumen-card"><span>Revisado</span><strong>{bomsConsolidados.reduce((s: number, b: any) => s + b.cantidad_revisada, 0)}</strong></div>
                <div className="ai02-captura-resumen-card"><span>No Encontrados</span><strong style={{ color: 'var(--error-text)' }}>{capturas.filter((c: any) => c.esNoEncontrado || !bomsConsolidados.find((b: any) => b.bom_sku === c.bom_sku)).length}</strong></div>
              </div>
              <div className="ai02-captura-bom-list" style={{ maxHeight: '400px' }}>
                {bomsConsolidados.map((bom: any, idx: number) => {
                  const diff = bom.cantidad_sistema - bom.cantidad_revisada;
                  const bg = diff > 0 ? 'var(--warning-bg)' : diff === 0 ? 'var(--success-bg)' : 'var(--error-bg)';
                  const color = diff > 0 ? 'var(--warning-text)' : diff === 0 ? 'var(--success-text)' : 'var(--error-text)';
                  return (
                    <div key={idx} className="ai02-captura-bom-item" style={{ background: bg }}>
                      <span className="ai02-captura-bom-sku" style={{ color: color }}>{bom.bom_sku}</span>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Sist: {bom.cantidad_sistema}</span>
                        <span style={{ fontWeight: 600, color: color }}>Rev: {bom.cantidad_revisada}</span>
                        <span style={{ fontWeight: 600, color: color }}>{diff === 0 ? 'OK' : (diff > 0 ? 'Falta ' + diff : 'Sobra ' + Math.abs(diff))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="ai02-modal-footer">
              <button className="ai02-btn" onClick={() => setMostrarDetalle(false)}>Cerrar</button>
              <button className="ai02-btn ai02-btn-primary" onClick={() => { setMostrarDetalle(false); handleExportarExcel(tareaSeleccionada); }}>Exportar Excel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AI02Captura;
