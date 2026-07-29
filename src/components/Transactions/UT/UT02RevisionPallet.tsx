// src/components/Transactions/UT/UT02RevisionPallet.tsx

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { auth } from '../../../lib/auth';
import './UT02.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const UT02RevisionPallet: React.FC = () => {
  const [seccion, setSeccion]: any = useState('inventario');
  const [empaques, setEmpaques]: any = useState([]);
  const [cargando, setCargando]: any = useState(true);
  const [mensaje, setMensaje]: any = useState({ tipo: '', texto: '', visible: false });
  const [empaqueExpandido, setEmpaqueExpandido]: any = useState(null);
  const [empaqueSeleccionado, setEmpaqueSeleccionado]: any = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion]: any = useState(false);
  const [empaqueAEliminar, setEmpaqueAEliminar]: any = useState(null);
  const fileInputRef: any = useRef(null);
  
  const [tareas, setTareas]: any = useState([]);
  const [tareasFiltradas, setTareasFiltradas]: any = useState([]);
  const [busqueda, setBusqueda]: any = useState('');
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

  useEffect(() => {
    if (seccion === 'inventario') {
      cargarInventario();
      const intervalo = setInterval(cargarInventario, 10000);
      return () => clearInterval(intervalo);
    }
  }, [seccion]);

  useEffect(() => {
    if (seccion === 'revision') {
      cargarTareas();
    }
  }, [seccion]);

  useEffect(() => {
    if (!busqueda.trim()) {
      setTareasFiltradas(tareas);
    } else {
      const term = busqueda.toLowerCase();
      setTareasFiltradas(tareas.filter((t: any) =>
        t.numero_tarea.toLowerCase().includes(term) ||
        (t.cod_local || '').toLowerCase().includes(term) ||
        (t.local || '').toLowerCase().includes(term) ||
        t.empaques.some((e: string) => e.toLowerCase().includes(term))
      ));
    }
  }, [busqueda, tareas]);

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  // ============ FUNCIONES DE INVENTARIO ============
  
  const cargarInventario = async () => {
    try {
      const resp = await fetch(API_URL + '/ut02_inventario?select=*&order=creado_en.desc', { headers: HEADERS });
      const data = await resp.json();
      if (data && data.length > 0) {
        const empaquesConBoms = await Promise.all(data.map(async (empaque: any) => {
          const respBoms = await fetch(API_URL + '/ut02_inventario_boms?select=*&empaque_id=eq.' + empaque.id + '&order=bom_sku.asc', { headers: HEADERS });
          const boms = await respBoms.json();
          const cantidadTotal = boms ? boms.reduce((s: number, b: any) => s + b.cantidad_maxima, 0) : 0;
          return { ...empaque, boms: boms || [], cantidad_total: cantidadTotal };
        }));
        setEmpaques(empaquesConBoms);
      } else {
        setEmpaques([]);
      }
      setCargando(false);
    } catch (e) { setCargando(false); }
  };

  const procesarArchivo = async (file: File) => {
    setCargando(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 2) { mostrarMensaje('error', 'El archivo está vacío'); setCargando(false); return; }

      const headers = rows[0];
      const dataRows = rows.slice(1).filter((row: any) => row.length > 0);
      const colEmpaque = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('empaque'));
      const colBOM = headers.findIndex((h: string) => h && (h.toString().toLowerCase().includes('bom') || h.toString().toLowerCase().includes('sku')));
      const colCantidad = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('cantidad'));
      const colUltimaMod = headers.findIndex((h: string) => {
        if (!h) return false;
        const header = h.toString().toLowerCase().trim();
        return (header.includes('ltima')) && (header.includes('modificacion') || header.includes('modificación')) && (header.endsWith('en') || header.includes(' en')) && !header.includes('por');
      });
      const colCodDestino = headers.findIndex((h: string) => h && (h.toString().toLowerCase().includes('cod.destino') || h.toString().toLowerCase().includes('cod_destino')));
      const colDestino = headers.findIndex((h: string) => h && h.toString().toLowerCase() === 'destino');

      if (colEmpaque < 0 || colBOM < 0) { mostrarMensaje('error', 'Columnas requeridas no encontradas'); setCargando(false); return; }

      const grupo1: Record<string, any> = {};
      dataRows.forEach((row: any) => {
        const empaque = String(row[colEmpaque] || '').trim();
        const bom = String(row[colBOM] || '').trim();
        const ultimaMod = colUltimaMod >= 0 ? String(row[colUltimaMod] || '').trim() : '';
        const cantidad = colCantidad >= 0 ? (parseInt(row[colCantidad]) || 1) : 1;
        const codDestino = colCodDestino >= 0 ? String(row[colCodDestino] || '').trim() : '';
        const destino = colDestino >= 0 ? String(row[colDestino] || '').trim() : '';
        if (!empaque || !bom) return;
        const key = empaque + '|' + bom + '|' + ultimaMod;
        if (!grupo1[key]) { grupo1[key] = { empaque, bom, codDestino, destino, cantidad }; }
        else { if (cantidad > grupo1[key].cantidad) grupo1[key].cantidad = cantidad; }
      });

      const consolidado: Record<string, any> = {};
      Object.values(grupo1).forEach((item: any) => {
        const key = item.empaque + '|' + item.bom;
        if (!consolidado[key]) { consolidado[key] = { empaque: item.empaque, codDestino: item.codDestino, destino: item.destino, bom: item.bom, cantidad: 0 }; }
        consolidado[key].cantidad += item.cantidad;
      });

      const empaquesMap: Record<string, any> = {};
      Object.values(consolidado).forEach((item: any) => {
        if (!empaquesMap[item.empaque]) { empaquesMap[item.empaque] = { codDestino: item.codDestino, destino: item.destino, boms: {} }; }
        empaquesMap[item.empaque].boms[item.bom] = item.cantidad;
      });

      let creados = 0;
      for (const numEmpaque of Object.keys(empaquesMap)) {
        const emp = empaquesMap[numEmpaque];
        const respExistente = await fetch(API_URL + '/ut02_inventario?select=id&numero_empaque=eq.' + encodeURIComponent(numEmpaque), { headers: HEADERS });
        const existente = await respExistente.json();
        let empaqueId;
        if (existente && existente.length > 0) {
          empaqueId = existente[0].id;
          await fetch(API_URL + '/ut02_inventario?id=eq.' + empaqueId, { method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ cod_destino: emp.codDestino, destino: emp.destino, estado: 'Pendiente' }) });
          await fetch(API_URL + '/ut02_inventario_boms?empaque_id=eq.' + empaqueId, { method: 'DELETE', headers: HEADERS });
        } else {
          const respEmpaque = await fetch(API_URL + '/ut02_inventario', { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify({ numero_empaque: numEmpaque, cod_destino: emp.codDestino, destino: emp.destino, estado: 'Pendiente', creado_por: usuario?.id }) });
          const empaqueData = await respEmpaque.json();
          empaqueId = Array.isArray(empaqueData) ? empaqueData[0].id : empaqueData.id;
        }
        for (const bom of Object.keys(emp.boms)) {
          await fetch(API_URL + '/ut02_inventario_boms', { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ empaque_id: empaqueId, bom_sku: bom, cantidad_maxima: emp.boms[bom] }) });
        }
        creados++;
      }

      let totalCajas = 0;
      Object.values(consolidado).forEach((item: any) => { totalCajas += item.cantidad; });
      mostrarMensaje('success', creados + ' empaques procesados. Total cajas: ' + totalCajas);
      cargarInventario();
    } catch (e) { mostrarMensaje('error', 'Error al procesar el archivo'); }
    setCargando(false);
  };

  const handleEliminarEmpaque = (empaque: any) => { setEmpaqueAEliminar(empaque); setMostrarConfirmacion(true); };

  const confirmarEliminar = async () => {
    if (!empaqueAEliminar) return;
    try {
      await fetch(API_URL + '/ut02_inventario?id=eq.' + empaqueAEliminar.id, { method: 'DELETE', headers: HEADERS });
      mostrarMensaje('success', 'Empaque eliminado');
      setEmpaqueSeleccionado(null); setEmpaqueExpandido(null); cargarInventario();
    } catch (e) { mostrarMensaje('error', 'Error al eliminar'); }
    setMostrarConfirmacion(false); setEmpaqueAEliminar(null);
  };

  const toggleExpandir = (empaque: any) => {
    setEmpaqueExpandido(empaqueExpandido && empaqueExpandido.id === empaque.id ? null : empaque);
  };

  // ============ FUNCIONES DE REVISIÓN ============

  const cargarTareas = async () => {
    setCargando(true);
    try {
      const resp = await fetch(API_URL + '/ut02_tareas?select=*&order=creado_en.desc', { headers: HEADERS });
      const data = await resp.json();
      if (data && data.length > 0) {
        const tareasConDatos = await Promise.all(data.map(async (tarea: any) => {
          const respEmpaques = await fetch(API_URL + '/ut02_tarea_empaques?select=numero_empaque&tarea_id=eq.' + tarea.id, { headers: HEADERS });
          const empaques = await respEmpaques.json();
          let totalSistema = 0;
          const bomsSistema: string[] = [];
          for (const emp of (empaques || [])) {
            const respInv = await fetch(API_URL + '/ut02_inventario?select=id&numero_empaque=eq.' + encodeURIComponent(emp.numero_empaque), { headers: HEADERS });
            const invData = await respInv.json();
            if (invData && invData.length > 0) {
              const respBoms = await fetch(API_URL + '/ut02_inventario_boms?select=cantidad_maxima,bom_sku&empaque_id=eq.' + invData[0].id, { headers: HEADERS });
              const boms = await respBoms.json();
              if (boms) { boms.forEach((b: any) => { totalSistema += b.cantidad_maxima; bomsSistema.push(b.bom_sku); }); }
            }
          }
          const respCapturas = await fetch(API_URL + '/ut02_capturas?select=id,bom_sku&tarea_id=eq.' + tarea.id, { headers: HEADERS });
          const capturasData = await respCapturas.json();
          const totalRevisados = capturasData ? capturasData.filter((c: any) => bomsSistema.includes(c.bom_sku)).length : 0;
          return { ...tarea, empaques: (empaques || []).map((e: any) => e.numero_empaque), total_bultos_sistema: totalSistema, total_bultos_revisados: totalRevisados };
        }));
        setTareas(tareasConDatos); setTareasFiltradas(tareasConDatos);
      } else { setTareas([]); setTareasFiltradas([]); }
      setCargando(false);
    } catch (e) { setCargando(false); }
  };

  const generarIdTarea = () => {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = ahora.getFullYear().toString().slice(-2);
    const random = String(Math.floor(Math.random() * 900) + 100);
    return 'UT2' + dia + mes + anio + random;
  };

  const handleAgregarEmpaque = async () => {
    const valor = inputEmpaque.trim();
    if (!valor) return;
    if (empaquesTarea.find((e: any) => e === valor)) { mostrarMensaje('warning', 'Empaque ya agregado'); setInputEmpaque(''); return; }
    const resp = await fetch(API_URL + '/ut02_inventario?select=*&numero_empaque=eq.' + encodeURIComponent(valor), { headers: HEADERS });
    const data = await resp.json();
    if (!data || data.length === 0) { mostrarMensaje('error', 'Empaque no encontrado en inventario'); return; }
    setEmpaquesTarea([...empaquesTarea, valor]); setInputEmpaque('');
    setTimeout(() => inputEmpaqueRef.current?.focus(), 100);
  };

  const handleCrearEIniciarTarea = async () => {
    if (empaquesTarea.length === 0) { mostrarMensaje('warning', 'Agregue al menos un empaque'); return; }
    const idTarea = generarIdTarea();
    const resp = await fetch(API_URL + '/ut02_inventario?select=cod_destino,destino&numero_empaque=eq.' + encodeURIComponent(empaquesTarea[0]), { headers: HEADERS });
    const data = await resp.json();
    const codLocal = data && data.length > 0 ? data[0].cod_destino : '';
    const local = data && data.length > 0 ? data[0].destino : '';
    let totalSistema = 0;
    for (const emp of empaquesTarea) {
      const respInv = await fetch(API_URL + '/ut02_inventario?select=id&numero_empaque=eq.' + encodeURIComponent(emp), { headers: HEADERS });
      const invData = await respInv.json();
      if (invData && invData.length > 0) {
        const respBoms = await fetch(API_URL + '/ut02_inventario_boms?select=cantidad_maxima&empaque_id=eq.' + invData[0].id, { headers: HEADERS });
        const boms = await respBoms.json();
        totalSistema += boms ? boms.reduce((s: number, b: any) => s + b.cantidad_maxima, 0) : 0;
      }
    }
    try {
      const respTarea = await fetch(API_URL + '/ut02_tareas', { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify({ numero_tarea: idTarea, cod_local: codLocal, local: local, estado: 'En Proceso', total_bultos_sistema: totalSistema, creado_por: usuario?.id, iniciado_en: new Date().toISOString(), auditor: usuario?.id }) });
      if (respTarea.ok) {
        const tareaData = await respTarea.json();
        const tarea = Array.isArray(tareaData) ? tareaData[0] : tareaData;
        for (const emp of empaquesTarea) { await fetch(API_URL + '/ut02_tarea_empaques', { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ tarea_id: tarea.id, numero_empaque: emp }) }); }
        setMostrarCrearTarea(false); setEmpaquesTarea([]);
        setTareaSeleccionada({ ...tarea, empaques: empaquesTarea, total_bultos_sistema: totalSistema });
        let bomsTemp: any[] = [];
        for (const emp of empaquesTarea) {
          const respInv = await fetch(API_URL + '/ut02_inventario?select=id&numero_empaque=eq.' + encodeURIComponent(emp), { headers: HEADERS });
          const invData = await respInv.json();
          if (invData && invData.length > 0) {
            const respBoms = await fetch(API_URL + '/ut02_inventario_boms?select=*&empaque_id=eq.' + invData[0].id, { headers: HEADERS });
            const boms = await respBoms.json();
            if (boms) {
              for (const bom of boms) {
                const existente = bomsTemp.find((b: any) => b.bom_sku === bom.bom_sku);
                if (existente) { existente.cantidad_sistema += bom.cantidad_maxima; }
                else { bomsTemp.push({ bom_sku: bom.bom_sku, cantidad_sistema: bom.cantidad_maxima, cantidad_revisada: 0 }); }
              }
            }
          }
        }
        setBomsConsolidados(bomsTemp); setCapturas([]); setContador(0); setMostrarCaptura(true);
        setTimeout(() => inputBOMRef.current?.focus(), 300);
      }
    } catch (e) { mostrarMensaje('error', 'Error al crear tarea'); }
  };

  const handleIniciarTarea = async (tarea: any) => {
    setTareaSeleccionada(tarea);
    let bomsTemp: any[] = [];
    for (const emp of tarea.empaques) {
      const respInv = await fetch(API_URL + '/ut02_inventario?select=id&numero_empaque=eq.' + encodeURIComponent(emp), { headers: HEADERS });
      const invData = await respInv.json();
      if (invData && invData.length > 0) {
        const respBoms = await fetch(API_URL + '/ut02_inventario_boms?select=*&empaque_id=eq.' + invData[0].id, { headers: HEADERS });
        const boms = await respBoms.json();
        if (boms) {
          for (const bom of boms) {
            const existente = bomsTemp.find((b: any) => b.bom_sku === bom.bom_sku);
            if (existente) { existente.cantidad_sistema += bom.cantidad_maxima; }
            else { bomsTemp.push({ bom_sku: bom.bom_sku, cantidad_sistema: bom.cantidad_maxima, cantidad_revisada: 0 }); }
          }
        }
      }
    }
    const respCapturas = await fetch(API_URL + '/ut02_capturas?select=*&tarea_id=eq.' + tarea.id + '&order=creado_en.asc', { headers: HEADERS });
    const capturasData = await respCapturas.json() || [];
    capturasData.forEach((c: any) => { const bom = bomsTemp.find((b: any) => b.bom_sku === c.bom_sku); if (bom) bom.cantidad_revisada++; });
    setBomsConsolidados(bomsTemp); setCapturas(capturasData); setContador(capturasData.length);
    if (tarea.estado === 'Pendiente') {
      await fetch(API_URL + '/ut02_tareas?id=eq.' + tarea.id, { method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'En Proceso', iniciado_en: new Date().toISOString(), auditor: usuario?.id }) });
    }
    setMostrarCaptura(true);
    setTimeout(() => inputBOMRef.current?.focus(), 300);
  };

  // ============ MODIFICACIÓN PRINCIPAL: handleCapturarBOM con límite ============
  const handleCapturarBOM = async () => {
    const valor = inputBOM.trim();
    if (!valor || !tareaSeleccionada) return;

    const bomEsperado = bomsConsolidados.find((b: any) => b.bom_sku === valor);

    // Verificar si ya se alcanzó el límite para este BOM
    if (bomEsperado) {
      if (bomEsperado.cantidad_revisada >= bomEsperado.cantidad_sistema) {
        mostrarMensaje('warning', `Límite alcanzado para ${valor} (${bomEsperado.cantidad_sistema} unidades)`);
        setInputBOM('');
        setTimeout(() => inputBOMRef.current?.focus(), 100);
        return;
      }
      // Incrementar contador
      bomEsperado.cantidad_revisada++;
      setBomsConsolidados([...bomsConsolidados]);
    }

    // Registrar la captura (siempre se registra, incluso si no esperado)
    try {
      const resp = await fetch(API_URL + '/ut02_capturas', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          tarea_id: tareaSeleccionada.id,
          bom_sku: valor,
          cantidad_sistema: bomEsperado ? bomEsperado.cantidad_sistema : 0,
          capturado_por: usuario?.id
        })
      });
      const capturaData = await resp.json();
      const nuevaCaptura = Array.isArray(capturaData) ? capturaData[0] : capturaData;
      setCapturas([{ id: nuevaCaptura.id, bom_sku: valor, esNoEncontrado: !bomEsperado, creado_en: new Date().toISOString() }, ...capturas]);
    } catch (e) {
      setCapturas([{ id: Date.now().toString(), bom_sku: valor, esNoEncontrado: !bomEsperado, creado_en: new Date().toISOString() }, ...capturas]);
    }
    setContador(contador + 1);
    setInputBOM('');
    setTimeout(() => inputBOMRef.current?.focus(), 100);
  };

  const handleEliminarCaptura = async (index: number) => {
    const captura = capturas[index];
    if (captura.id && captura.id.length > 20) { try { await fetch(API_URL + '/ut02_capturas?id=eq.' + captura.id, { method: 'DELETE', headers: HEADERS }); } catch (e) {} }
    if (!captura.esNoEncontrado) {
      const bomEsperado = bomsConsolidados.find((b: any) => b.bom_sku === captura.bom_sku);
      if (bomEsperado && bomEsperado.cantidad_revisada > 0) { bomEsperado.cantidad_revisada--; setBomsConsolidados([...bomsConsolidados]); }
    }
    setCapturas(capturas.filter((_: any, i: number) => i !== index)); setContador(contador - 1);
    mostrarMensaje('success', 'Captura eliminada');
  };

  const handleFinalizarTarea = async () => {
    if (!tareaSeleccionada) return;
    try {
      const bomsSistema = bomsConsolidados.map((b: any) => b.bom_sku);
      const capturasValidas = capturas.filter((c: any) => bomsSistema.includes(c.bom_sku));
      // Ahora solo puede haber diferencias por faltantes (ya no hay sobrantes de esperados)
      const hayFaltantes = bomsConsolidados.some((b: any) => b.cantidad_revisada < b.cantidad_sistema);
      const hayNoEncontrados = capturas.some((c: any) => c.esNoEncontrado || !bomsSistema.includes(c.bom_sku));
      const estadoFinal = (hayFaltantes || hayNoEncontrados) ? 'Con Diferencias' : 'Finalizado';
      await fetch(API_URL + '/ut02_tareas?id=eq.' + tareaSeleccionada.id, { method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: estadoFinal, total_bultos_revisados: capturasValidas.length, finalizado_en: new Date().toISOString() }) });
      mostrarMensaje('success', estadoFinal === 'Finalizado' ? 'Tarea finalizada correctamente' : 'Tarea finalizada con diferencias');
      setMostrarCaptura(false); setTareaSeleccionada(null); cargarTareas();
    } catch (e) { mostrarMensaje('error', 'Error al finalizar'); }
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

  if (cargando && seccion === 'inventario' && empaques.length === 0) {
    return <div className="ut02-view"><div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando...</div></div>;
  }

  return (
    <div className="ut02-view">
      {mensaje.visible && <div className={'ut02-toast ut02-toast-' + mensaje.tipo}>{mensaje.texto}</div>}

      <div className="ut02-header">
        <h2>UT02 · Herramienta Revisión de Pallet</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`ut02-btn ${seccion === 'inventario' ? 'ut02-btn-primary' : ''}`} onClick={() => setSeccion('inventario')}>
            Inventario
          </button>
          <button className={`ut02-btn ${seccion === 'revision' ? 'ut02-btn-primary' : ''}`} onClick={() => setSeccion('revision')}>
            Revisar Pallet
          </button>
        </div>
      </div>

      {/* ============ SECCIÓN INVENTARIO ============ */}
      {seccion === 'inventario' && (
        <>
          <div className="ut02-toolbar">
            <button className="ut02-btn ut02-btn-primary" onClick={() => fileInputRef.current?.click()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 10V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V10M4.66667 6.66667L8 10M8 10L11.3333 6.66667M8 10V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Cargar Excel
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e: any) => { const file = e.target.files?.[0]; if (file) procesarArchivo(file); }} />
            <div className="ut02-separator"></div>
            <button className="ut02-btn" onClick={() => empaqueSeleccionado && toggleExpandir(empaqueSeleccionado)} disabled={!empaqueSeleccionado}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.33325 8.00004C1.33325 8.00004 3.99992 3.33337 7.99992 3.33337C11.9999 3.33337 14.6666 8.00004 14.6666 8.00004C14.6666 8.00004 11.9999 12.6667 7.99992 12.6667C3.99992 12.6667 1.33325 8.00004 1.33325 8.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Ver Detalle
            </button>
            <button className="ut02-btn ut02-btn-danger" onClick={(e) => { e.stopPropagation(); if (empaqueSeleccionado) handleEliminarEmpaque(empaqueSeleccionado); }} disabled={!empaqueSeleccionado}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4H14M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Eliminar
            </button>
            <div className="ut02-separator"></div>
            <button className="ut02-btn ut02-btn-success" onClick={() => setSeccion('revision')}>
              Revisar Pallet
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="ed03-tabla" style={{ minWidth: '1000px' }}>
              <thead><tr><th style={{ width: '40px' }}></th><th>Número de Empaque</th><th>Cod. Destino</th><th>Destino</th><th style={{ textAlign: 'center' }}>Cant. Total</th></tr></thead>
              <tbody>
                {empaques.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-placeholder)' }}>No hay empaques en el inventario</td></tr> :
                  empaques.map((empaque: any) => {
                    const seleccionado = empaqueSeleccionado && empaqueSeleccionado.id === empaque.id;
                    return (
                      <React.Fragment key={empaque.id}>
                        <tr onClick={() => setEmpaqueSeleccionado(seleccionado ? null : empaque)} style={{ cursor: 'pointer', background: seleccionado ? 'var(--table-row-selected)' : 'transparent' }}>
                          <td><input type="radio" className="sd01-radio" checked={seleccionado} onChange={() => setEmpaqueSeleccionado(empaque)} onClick={(e: any) => e.stopPropagation()} /></td>
                          <td style={{ fontFamily: 'Courier New, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{empaque.numero_empaque}</td>
                          <td>{empaque.cod_destino || '-'}</td>
                          <td>{empaque.destino || '-'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{empaque.cantidad_total}</td>
                        </tr>
                        {empaqueExpandido && empaqueExpandido.id === empaque.id && (
                          <tr><td colSpan={5} style={{ padding: '0' }}><div style={{ padding: '16px', background: 'var(--bg-section)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <thead><tr style={{ background: 'var(--table-header-bg)' }}><th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--table-header-text)' }}>BOM/SKU</th><th style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--table-header-text)' }}>Cantidad</th></tr></thead>
                              <tbody>{empaque.boms.map((bom: any) => (
                                <tr key={bom.id} style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px 10px', fontFamily: 'Courier New, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{bom.bom_sku}</td><td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}>{bom.cantidad_maxima}</td></tr>
                              ))}</tbody>
                            </table>
                          </div></td></tr>
                        )}
                      </React.Fragment>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ============ SECCIÓN REVISIÓN ============ */}
      {seccion === 'revision' && (
        <>
          <div className="ut02-toolbar">
            <button className="ut02-btn ut02-btn-primary" onClick={() => { setMostrarCrearTarea(true); setEmpaquesTarea([]); setInputEmpaque(''); }}>
              + Nueva Tarea
            </button>
            <div className="ut02-separator"></div>
            <input type="text" className="ut02-form-input" style={{ flex: 1, maxWidth: '300px', padding: '8px 12px', fontSize: '13px' }} placeholder="Buscar por tarea, local, empaque..." value={busqueda} onChange={(e: any) => setBusqueda(e.target.value)} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tareasFiltradas.length} de {tareas.length}</span>
          </div>

          <div className="ut02-grid">
            {tareasFiltradas.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-placeholder)' }}>{busqueda ? 'No se encontraron tareas' : 'No hay tareas'}</div>
            ) : (
              tareasFiltradas.map((tarea: any) => {
                const porcentaje = tarea.total_bultos_sistema > 0 ? Math.round((tarea.total_bultos_revisados / tarea.total_bultos_sistema) * 100) : 0;
                const eb = getEstadoBadge(tarea.estado);
                return (
                  <div key={tarea.id} className="ut02-card">
                    <div className="ut02-card-header"><span className="ut02-card-id">{tarea.numero_tarea}</span><span className="ut02-card-badge" style={{ background: eb.bg, color: eb.color }}>{tarea.estado}</span></div>
                    <div className="ut02-card-body">
                      <div className="ut02-card-row"><span>Local</span><strong>{tarea.cod_local} - {tarea.local}</strong></div>
                      <div className="ut02-card-row"><span>Empaques</span><strong>{tarea.empaques.length}</strong></div>
                      <div className="ut02-card-row"><span>Bultos Sistema</span><strong>{tarea.total_bultos_sistema}</strong></div>
                      <div className="ut02-card-row"><span>Bultos Revisados</span><strong>{tarea.total_bultos_revisados}</strong></div>
                      {tarea.empaques.length > 0 && <div className="ut02-card-empaques">{tarea.empaques.slice(0, 3).map((emp: string, idx: number) => <span key={idx} className="ut02-card-empaque-badge">{emp}</span>)}{tarea.empaques.length > 3 && <span className="ut02-card-empaque-badge">+{tarea.empaques.length - 3}</span>}</div>}
                    </div>
                    <div className="ut02-progress"><div className="ut02-progress-info"><span>Progreso</span><span>{Math.min(porcentaje, 100)}%</span></div><div className="ut02-progress-bar"><div className="ut02-progress-fill" style={{ width: Math.min(porcentaje, 100) + '%', background: tarea.estado === 'Finalizado' ? '#15803d' : tarea.estado === 'Con Diferencias' ? '#dc2626' : '#3b82f6' }}></div></div></div>
                    <div className="ut02-card-footer">
                      {(tarea.estado === 'Pendiente' || tarea.estado === 'En Proceso') && (
                        <button className="ut02-btn ut02-btn-primary" onClick={() => handleIniciarTarea(tarea)} style={{ fontSize: '11px', padding: '5px 10px' }}>
                          {tarea.estado === 'Pendiente' ? 'Iniciar' : 'Continuar'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Modal Crear Tarea */}
      {mostrarCrearTarea && (
        <div className="ut02-modal-overlay" onClick={() => setMostrarCrearTarea(false)}>
          <div className="ut02-modal" onClick={(e: any) => e.stopPropagation()}>
            <div className="ut02-modal-header"><h2>Nueva Tarea de Revisión</h2><button className="ut02-modal-close" onClick={() => setMostrarCrearTarea(false)}>×</button></div>
            <div className="ut02-modal-body">
              <div className="ut02-form-group">
                <label className="ut02-form-label">Agregar N° Empaque</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input ref={inputEmpaqueRef} type="text" className="ut02-form-input" value={inputEmpaque} onChange={(e: any) => setInputEmpaque(e.target.value)} onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarEmpaque(); } }} placeholder="Escanear número de empaque..." />
                  <button className="ut02-btn ut02-btn-primary" onClick={handleAgregarEmpaque} style={{ whiteSpace: 'nowrap' }}>Agregar</button>
                </div>
              </div>
              {empaquesTarea.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label className="ut02-form-label">Empaques ({empaquesTarea.length})</label>
                  <div className="ut02-card-empaques">
                    {empaquesTarea.map((emp: string, idx: number) => (
                      <span key={idx} className="ut02-card-empaque-badge" style={{ fontSize: '11px', padding: '4px 10px' }}>
                        {emp}
                        <button onClick={() => setEmpaquesTarea(empaquesTarea.filter((_: string, i: number) => i !== idx))} style={{ marginLeft: '6px', background: 'none', border: 'none', color: 'var(--error-text)', cursor: 'pointer', fontSize: '14px' }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="ut02-modal-footer">
              <button className="ut02-btn" onClick={() => setMostrarCrearTarea(false)}>Cancelar</button>
              <button className="ut02-btn ut02-btn-success" onClick={handleCrearEIniciarTarea} disabled={empaquesTarea.length === 0}>Crear e Iniciar Revisión</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODIFICACIÓN: Modal Captura con contadores en la parte superior ============ */}
      {mostrarCaptura && tareaSeleccionada && (
        <div className="ut02-modal-overlay" onClick={() => { setMostrarCaptura(false); setTareaSeleccionada(null); }}>
          <div className="ut02-modal" style={{ maxWidth: '700px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="ut02-modal-header">
              <h2>{tareaSeleccionada.numero_tarea} - Captura</h2>
              <button className="ut02-modal-close" onClick={() => { setMostrarCaptura(false); setTareaSeleccionada(null); }}>×</button>
            </div>
            <div className="ut02-modal-body">
              {/* Contadores en la parte superior */}
              <div className="ut02-captura-resumen" style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div className="ut02-captura-card" style={{ flex: 1, background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Capturas</span>
                  <strong style={{ fontSize: '24px', display: 'block' }}>{contador}</strong>
                </div>
                <div className="ut02-captura-card" style={{ flex: 1, background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sistema</span>
                  <strong style={{ fontSize: '24px', display: 'block', color: '#3b82f6' }}>{bomsConsolidados.reduce((s: number, b: any) => s + b.cantidad_sistema, 0)}</strong>
                </div>
                <div className="ut02-captura-card" style={{ flex: 1, background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Revisado</span>
                  <strong style={{ fontSize: '24px', display: 'block', color: '#15803d' }}>{bomsConsolidados.reduce((s: number, b: any) => s + b.cantidad_revisada, 0)}</strong>
                </div>
                <div className="ut02-captura-card" style={{ flex: 1, background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Faltante</span>
                  <strong style={{ fontSize: '24px', display: 'block', color: '#dc2626' }}>
                    {bomsConsolidados.reduce((s: number, b: any) => s + (b.cantidad_sistema - b.cantidad_revisada), 0)}
                  </strong>
                </div>
              </div>

              <div className="ut02-captura-buscador">
                <input ref={inputBOMRef} type="text" className="ut02-captura-input" value={inputBOM} onChange={(e: any) => setInputBOM(e.target.value)} onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleCapturarBOM(); } }} placeholder="Escanear BOM/SKU..." autoFocus />
                <button className="ut02-btn ut02-btn-primary" onClick={handleCapturarBOM} style={{ padding: '14px 24px', fontSize: '16px' }}>Capturar</button>
              </div>
              <div className="ut02-captura-bom-list">
                {bomsConsolidados.map((bom: any, idx: number) => {
                  const diff = bom.cantidad_sistema - bom.cantidad_revisada;
                  let bg = 'var(--bg-panel)';
                  let color = 'var(--text-muted)';
                  if (bom.cantidad_revisada === 0) { bg = 'var(--bg-panel)'; color = 'var(--text-muted)'; }
                  else if (diff > 0) { bg = 'var(--warning-bg)'; color = 'var(--warning-text)'; }
                  else if (diff === 0) { bg = 'var(--success-bg)'; color = 'var(--success-text)'; }
                  // Ya no habrá diff < 0 porque limitamos la captura, pero lo dejamos por si acaso
                  else { bg = 'var(--error-bg)'; color = 'var(--error-text)'; }
                  return <div key={idx} className="ut02-captura-bom-item" style={{ background: bg }}><span className="ut02-captura-bom-sku" style={{ color }}>{bom.bom_sku}</span><span style={{ fontSize: '12px', fontWeight: 600, color }}>{bom.cantidad_revisada}/{bom.cantidad_sistema}</span></div>;
                })}
              </div>
              {capturas.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Capturas ({capturas.length})</div>
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {capturas.map((c: any, idx: number) => (
                      <div key={idx} className="ut02-captura-bom-item" style={{ background: c.esNoEncontrado ? 'var(--error-bg)' : 'var(--bg-panel)', borderBottom: '1px solid var(--border)' }}>
                        <span className="ut02-captura-bom-sku" style={{ color: c.esNoEncontrado ? 'var(--error-text)' : 'var(--text-primary)', fontSize: '12px' }}>{c.bom_sku}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{c.esNoEncontrado ? 'No encontrado' : 'Sistema'}</span>
                          <button onClick={() => handleEliminarCaptura(idx)} style={{ width: '20px', height: '20px', background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button className="ut02-btn ut02-btn-success" onClick={handleFinalizarTarea} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px', marginTop: '12px' }}>Finalizar Tarea</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación */}
      {mostrarConfirmacion && (
        <div className="ut02-modal-overlay" onClick={() => setMostrarConfirmacion(false)}>
          <div className="ut02-modal" style={{ maxWidth: '420px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="ut02-modal-header"><h2>Confirmar Eliminación</h2><button className="ut02-modal-close" onClick={() => setMostrarConfirmacion(false)}>×</button></div>
            <div className="ut02-modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>¿Está seguro de eliminar el empaque <strong>{empaqueAEliminar?.numero_empaque}</strong>?</p>
              <p style={{ color: 'var(--error-text)', fontSize: '12px', marginTop: '8px' }}>Esta acción no se puede deshacer.</p>
            </div>
            <div className="ut02-modal-footer">
              <button className="ut02-btn" onClick={() => setMostrarConfirmacion(false)}>Cancelar</button>
              <button className="ut02-btn ut02-btn-danger" onClick={confirmarEliminar} style={{ background: '#dc2626', color: 'white', borderColor: '#dc2626' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UT02RevisionPallet;
