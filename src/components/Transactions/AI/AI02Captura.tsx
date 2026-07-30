// src/components/Transactions/AI/AI02Captura.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '../../../lib/auth';
import * as XLSX from 'xlsx';
import AI02Stats from './AI02Stats';
import './AI02.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

// Clave para guardar la sesión de captura en localStorage
const STORAGE_KEY = 'ai02_capture_session';

interface CapturaLocal {
  id: string;          // ID real (BD) o temporal (prefijo 'temp_')
  bom_sku: string;
  esNoEncontrado: boolean;
  creado_en: string;
}

const AI02Captura: React.FC = () => {
  // Estados globales con tipado explícito
  const [tareas, setTareas] = useState<any[]>([]);
  const [tareasFiltradas, setTareasFiltradas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });
  const [tareaSeleccionada, setTareaSeleccionada] = useState<any>(null);
  const [mostrarCrearTarea, setMostrarCrearTarea] = useState(false);
  const [mostrarCaptura, setMostrarCaptura] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [mostrarStats, setMostrarStats] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [inputEmpaque, setInputEmpaque] = useState('');
  const [empaquesTarea, setEmpaquesTarea] = useState<string[]>([]);
  const [bomsConsolidados, setBomsConsolidados] = useState<any[]>([]);
  const [capturas, setCapturas] = useState<CapturaLocal[]>([]); // ← CORREGIDO: usa CapturaLocal[]
  const [contador, setContador] = useState(0);
  const [inputBOM, setInputBOM] = useState('');
  const [finalizando, setFinalizando] = useState(false); // Para deshabilitar botón
  const inputEmpaqueRef = useRef<HTMLInputElement>(null);
  const inputBOMRef = useRef<HTMLInputElement>(null);
  const usuario: any = auth.getUsuario();

  // ------------------------------------------------------------------
  // 1. Recuperar sesión guardada (si existe) al montar el componente
  // ------------------------------------------------------------------
  useEffect(() => {
    cargarTareas();
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        if (sessionData.tareaId) {
          // Opcional: preguntar al usuario si desea continuar
          if (window.confirm('Tienes una captura pendiente. ¿Deseas continuar?')) {
            restaurarSesion(sessionData);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Restaura los datos de una sesión guardada
  const restaurarSesion = useCallback(async (sessionData: any) => {
    try {
      const resp = await fetch(API_URL + '/ai_tareas?select=*&id=eq.' + sessionData.tareaId, { headers: HEADERS });
      const data = await resp.json();
      if (!data || data.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      const tarea = data[0];
      let bomsTemp = sessionData.bomsConsolidados;
      let capturasData = sessionData.capturas;
      if (!bomsTemp || !capturasData) {
        await handleIniciarTarea(tarea, true);
        return;
      }
      setTareaSeleccionada(tarea);
      setBomsConsolidados(bomsTemp);
      setCapturas(capturasData);
      setContador(capturasData.length);
      setMostrarCaptura(true);
      setTimeout(() => inputBOMRef.current?.focus(), 300);
    } catch (e) {
      setTareaSeleccionada(sessionData.tarea);
      setBomsConsolidados(sessionData.bomsConsolidados);
      setCapturas(sessionData.capturas);
      setContador(sessionData.capturas.length);
      setMostrarCaptura(true);
      setTimeout(() => inputBOMRef.current?.focus(), 300);
    }
  }, []);

  // Guarda la sesión actual en localStorage
  const guardarSesion = useCallback(() => {
    if (!tareaSeleccionada) return;
    const session = {
      tareaId: tareaSeleccionada.id,
      tarea: tareaSeleccionada,
      bomsConsolidados,
      capturas,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [tareaSeleccionada, bomsConsolidados, capturas]);

  // Limpiar sesión guardada
  const limpiarSesion = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ------------------------------------------------------------------
  // Efectos para filtros y guardado automático
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!busqueda.trim()) {
      setTareasFiltradas(tareas);
    } else {
      const term = busqueda.toLowerCase();
      setTareasFiltradas(tareas.filter((t: any) =>
        t.numero_tarea.toLowerCase().includes(term) ||
        t.cod_local.toLowerCase().includes(term) ||
        t.local.toLowerCase().includes(term) ||
        t.empaques.some((e: string) => e.toLowerCase().includes(term)) ||
        t.auditor_nombre.toLowerCase().includes(term)
      ));
    }
  }, [busqueda, tareas]);

  // Guardar automáticamente cada vez que cambian capturas o boms (dentro de la captura activa)
  useEffect(() => {
    if (mostrarCaptura && tareaSeleccionada) {
      guardarSesion();
    }
  }, [capturas, bomsConsolidados, mostrarCaptura, tareaSeleccionada, guardarSesion]);

  // ------------------------------------------------------------------
  // Carga de tareas (similar a original)
  // ------------------------------------------------------------------
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
          const bomsSistema: string[] = [];
          for (const emp of (empaques || [])) {
            const respInv = await fetch(API_URL + '/ai_inventario?select=id&numero_empaque=eq.' + encodeURIComponent(emp.numero_empaque), { headers: HEADERS });
            const invData = await respInv.json();
            if (invData && invData.length > 0) {
              const respBoms = await fetch(API_URL + '/ai_inventario_boms?select=cantidad_maxima,bom_sku&empaque_id=eq.' + invData[0].id, { headers: HEADERS });
              const boms = await respBoms.json();
              if (boms) {
                boms.forEach((b: any) => {
                  totalSistema += b.cantidad_maxima;
                  bomsSistema.push(b.bom_sku);
                });
              }
            }
          }

          const respCapturas = await fetch(API_URL + '/ai_capturas?select=id,bom_sku&tarea_id=eq.' + tarea.id, { headers: HEADERS });
          const capturasData = await respCapturas.json();

          const totalRevisados = capturasData ? capturasData.filter((c: any) => bomsSistema.includes(c.bom_sku)).length : 0;

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
        setTareasFiltradas(tareasConDatos);
      } else {
        setTareas([]);
        setTareasFiltradas([]);
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

  // ------------------------------------------------------------------
  // Crear tarea (sin cambios relevantes)
  // ------------------------------------------------------------------
  const handleAgregarEmpaque = async () => {
    const valor = inputEmpaque.trim();
    if (!valor) return;
    if (empaquesTarea.find((e) => e === valor)) {
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

  const handleEliminarTarea = async (tarea: any) => {
    if (!window.confirm('¿Eliminar la tarea ' + tarea.numero_tarea + ' y todas sus capturas? Esta acción no se puede deshacer.')) return;

    try {
      await fetch(API_URL + '/ai_capturas?tarea_id=eq.' + tarea.id, { method: 'DELETE', headers: HEADERS });
      await fetch(API_URL + '/ai_tarea_empaques?tarea_id=eq.' + tarea.id, { method: 'DELETE', headers: HEADERS });
      await fetch(API_URL + '/ai_tareas?id=eq.' + tarea.id, { method: 'DELETE', headers: HEADERS });

      mostrarMensaje('success', 'Tarea ' + tarea.numero_tarea + ' eliminada correctamente');
      cargarTareas();
    } catch (e) {
      mostrarMensaje('error', 'Error al eliminar la tarea');
    }
  };

  // ------------------------------------------------------------------
  // Iniciar / continuar tarea (carga completa en local)
  // ------------------------------------------------------------------
  const handleIniciarTarea = async (tarea: any, esRestauracion = false) => {
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

    bomsTemp.forEach((b: any) => { b.cantidad_revisada = 0; });
    capturasData.forEach((c: any) => {
      const bom = bomsTemp.find((b: any) => b.bom_sku === c.bom_sku);
      if (bom) bom.cantidad_revisada++;
    });

    const capturasIniciales: CapturaLocal[] = capturasData.map((c: any) => ({
      id: c.id,
      bom_sku: c.bom_sku,
      esNoEncontrado: !bomsTemp.some((b: any) => b.bom_sku === c.bom_sku),
      creado_en: c.creado_en
    }));

    setBomsConsolidados(bomsTemp);
    setCapturas(capturasIniciales);
    setContador(capturasIniciales.length);

    if (tarea.estado === 'Pendiente') {
      await fetch(API_URL + '/ai_tareas?id=eq.' + tarea.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'En Proceso', iniciado_en: new Date().toISOString(), auditor: usuario?.id })
      });
    }

    setMostrarCaptura(true);
    if (!esRestauracion) {
      limpiarSesion();
    }
    setTimeout(() => inputBOMRef.current?.focus(), 300);
  };

  // ------------------------------------------------------------------
  // Capturar BOM (100% local, sin llamada al backend)
  // ------------------------------------------------------------------
  const handleCapturarBOM = () => {
    const valor = inputBOM.trim();
    if (!valor || !tareaSeleccionada) return;

    const bomEsperado = bomsConsolidados.find((b: any) => b.bom_sku === valor);
    if (bomEsperado) {
      bomEsperado.cantidad_revisada++;
      setBomsConsolidados([...bomsConsolidados]);
    }

    const nuevaCaptura: CapturaLocal = {
      id: 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      bom_sku: valor,
      esNoEncontrado: !bomEsperado,
      creado_en: new Date().toISOString()
    };

    setCapturas([nuevaCaptura, ...capturas]);
    setContador(contador + 1);
    setInputBOM('');
    setTimeout(() => inputBOMRef.current?.focus(), 100);
  };

  // ------------------------------------------------------------------
  // Eliminar captura (local + opcionalmente en BD si es real)
  // ------------------------------------------------------------------
  const handleEliminarCaptura = async (index: number) => {
    const captura = capturas[index];

    if (captura.id && !captura.id.startsWith('temp_')) {
      try {
        await fetch(API_URL + '/ai_capturas?id=eq.' + captura.id, { method: 'DELETE', headers: HEADERS });
      } catch (e) {
        console.warn('No se pudo eliminar captura remota, se marcará como eliminada localmente');
      }
    }

    if (!captura.esNoEncontrado) {
      const bomEsperado = bomsConsolidados.find((b: any) => b.bom_sku === captura.bom_sku);
      if (bomEsperado && bomEsperado.cantidad_revisada > 0) {
        bomEsperado.cantidad_revisada--;
        setBomsConsolidados([...bomsConsolidados]);
      }
    }

    const nuevasCapturas = capturas.filter((_, i) => i !== index);
    setCapturas(nuevasCapturas);
    setContador(contador - 1);
    mostrarMensaje('success', 'Captura eliminada');
  };

  // ------------------------------------------------------------------
  // Finalizar tarea (envía todas las capturas nuevas en lote)
  // ------------------------------------------------------------------
  const handleFinalizarTarea = async () => {
    if (!tareaSeleccionada || finalizando) return;
    setFinalizando(true);

    try {
      const capturasNuevas = capturas.filter(c => c.id.startsWith('temp_'));
      const capturasExistentes = capturas.filter(c => !c.id.startsWith('temp_'));

      if (capturasNuevas.length > 0) {
        const payload = capturasNuevas.map(c => ({
          tarea_id: tareaSeleccionada.id,
          bom_sku: c.bom_sku,
          cantidad_sistema: bomsConsolidados.find((b: any) => b.bom_sku === c.bom_sku)?.cantidad_sistema || 0,
          capturado_por: usuario?.id
        }));

        const resp = await fetch(API_URL + '/ai_capturas', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(payload)
        });

        if (!resp.ok) {
          throw new Error('Error al guardar capturas');
        }
      }

      const bomsSistema = bomsConsolidados.map((b: any) => b.bom_sku);
      const capturasValidas = capturasExistentes.concat(capturasNuevas).filter(c => bomsSistema.includes(c.bom_sku));
      const totalRevisado = capturasValidas.length;

      const hayDiferencias = bomsConsolidados.some((b: any) => b.cantidad_revisada !== b.cantidad_sistema);
      const hayNoEncontrados = capturasNuevas.some(c => c.esNoEncontrado || !bomsSistema.includes(c.bom_sku));

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

      limpiarSesion();
      mostrarMensaje('success', estadoFinal === 'Finalizado' ? 'Tarea finalizada correctamente' : 'Tarea finalizada con diferencias');
      setMostrarCaptura(false);
      setTareaSeleccionada(null);
      cargarTareas();
    } catch (e) {
      mostrarMensaje('error', 'Error al finalizar. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setFinalizando(false);
    }
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

    bomsTemp.forEach((b: any) => { b.cantidad_revisada = 0; });
    const capturasDetalle: CapturaLocal[] = capturasData.map((c: any) => {
      const bom = bomsTemp.find((b: any) => b.bom_sku === c.bom_sku);
      if (bom) bom.cantidad_revisada++;
      return {
        id: c.id,
        bom_sku: c.bom_sku,
        esNoEncontrado: !bomsTemp.some((b: any) => b.bom_sku === c.bom_sku),
        creado_en: c.creado_en
      };
    });

    setBomsConsolidados(bomsTemp);
    setCapturas(capturasDetalle);
    setMostrarDetalle(true);
  };

  const handleExportarExcel = async (tarea: any) => {
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

    const filas: any[] = [];
    const localCompleto = tarea.cod_local + ' - ' + tarea.local;

    bomsTemp.forEach((bom: any) => {
      const diff = bom.cantidad_sistema - bom.cantidad_revisada;
      let estado = 'OK';
      let diffTexto = 'OK';
      if (bom.cantidad_revisada === 0) {
        estado = 'Pendiente';
        diffTexto = '' + diff;
      } else if (diff > 0) {
        estado = 'FALTA';
        diffTexto = '' + diff;
      } else if (diff < 0) {
        estado = 'SOBRA';
        diffTexto = '' + diff;
      }
      filas.push({
        'TAREA': tarea.numero_tarea,
        'LOCAL': localCompleto,
        'ESTADO': estado,
        'BOM/SKU': bom.bom_sku,
        'CANT. SISTEMA': bom.cantidad_sistema,
        'CANT. REVISADA': bom.cantidad_revisada,
        'DIFERENCIA': diffTexto
      });
    });

    const bomsSistema = bomsTemp.map((b: any) => b.bom_sku);
    const noEncontrados = capturasData.filter((c: any) => !bomsSistema.includes(c.bom_sku));
    if (noEncontrados.length > 0) {
      const agrupados: Record<string, number> = {};
      noEncontrados.forEach((c: any) => {
        if (!agrupados[c.bom_sku]) agrupados[c.bom_sku] = 0;
        agrupados[c.bom_sku]++;
      });
      Object.keys(agrupados).forEach((bomSku: string) => {
        filas.push({
          'TAREA': tarea.numero_tarea,
          'LOCAL': localCompleto,
          'ESTADO': 'NO ENCONTRADO',
          'BOM/SKU': bomSku,
          'CANT. SISTEMA': 0,
          'CANT. REVISADA': agrupados[bomSku],
          'DIFERENCIA': 'X'
        });
      });
    }

    const ws = XLSX.utils.json_to_sheet(filas);
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
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

  // Renderizado (idéntico al original, con pequeña adaptación en el botón Finalizar)
  if (mostrarStats) {
    return <AI02Stats onVolver={() => setMostrarStats(false)} />;
  }

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
        <button className="ai02-btn" onClick={() => setMostrarStats(true)}>
          Estadísticas
        </button>
        <div className="ai02-separator"></div>
        <input
          type="text"
          className="ai02-form-input"
          style={{ flex: 1, maxWidth: '300px', padding: '8px 12px', fontSize: '13px' }}
          placeholder="Buscar por tarea, local, empaque..."
          value={busqueda}
          onChange={(e: any) => setBusqueda(e.target.value)}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {tareasFiltradas.length} de {tareas.length}
        </span>
      </div>

      <div className="ai02-grid">
        {tareasFiltradas.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-placeholder)' }}>
            {busqueda ? 'No se encontraron tareas' : 'No hay tareas'}
          </div>
        ) : (
          tareasFiltradas.map((tarea: any) => {
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
                    <button className="ai02-btn ai02-btn-danger" onClick={(e) => { e.stopPropagation(); handleEliminarTarea(tarea); }} style={{ fontSize: '11px', padding: '5px 10px' }}>
                      Eliminar
                    </button>
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
                    {empaquesTarea.map((emp, idx) => (
                      <span key={idx} className="ai02-card-empaque-badge" style={{ fontSize: '11px', padding: '4px 10px' }}>
                        {emp}
                        <button onClick={() => setEmpaquesTarea(empaquesTarea.filter((_, i) => i !== idx))}
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
        <div className="ai02-modal-overlay" onClick={() => { if (!finalizando) { setMostrarCaptura(false); setTareaSeleccionada(null); limpiarSesion(); } }}>
          <div className="ai02-modal" style={{ maxWidth: '700px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="ai02-modal-header">
              <h2>{tareaSeleccionada.numero_tarea} - Captura</h2>
              <button className="ai02-modal-close" onClick={() => { setMostrarCaptura(false); setTareaSeleccionada(null); limpiarSesion(); }} disabled={finalizando}>×</button>
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
                  placeholder="Escanear BOM/SKU..." autoFocus disabled={finalizando} />
                <button className="ai02-btn ai02-btn-primary" onClick={handleCapturarBOM} style={{ padding: '14px 24px', fontSize: '16px' }} disabled={finalizando}>Capturar</button>
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
              </div>

              {capturas.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Capturas ({capturas.length})
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {capturas.map((c, idx) => {
                      const esSistema = bomsConsolidados.find((b: any) => b.bom_sku === c.bom_sku);
                      return (
                        <div key={idx} className="ai02-captura-bom-item" style={{
                          background: c.esNoEncontrado ? 'var(--error-bg)' : 'var(--bg-panel)',
                          borderBottom: '1px solid var(--border)'
                        }}>
                          <span className="ai02-captura-bom-sku" style={{
                            color: c.esNoEncontrado ? 'var(--error-text)' : 'var(--text-primary)',
                            fontSize: '12px'
                          }}>{c.bom_sku}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {c.esNoEncontrado ? 'No encontrado' : 'Sistema'}
                            </span>
                            <button onClick={() => handleEliminarCaptura(idx)} disabled={finalizando} style={{
                              width: '20px', height: '20px', background: 'var(--error-bg)', color: 'var(--error-text)',
                              border: '1px solid var(--error-border)', borderRadius: '3px', cursor: 'pointer', fontSize: '12px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>×</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                className="ai02-btn ai02-btn-success"
                onClick={handleFinalizarTarea}
                disabled={finalizando}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px', marginTop: '12px', opacity: finalizando ? 0.7 : 1 }}
              >
                {finalizando ? 'Finalizando...' : 'Finalizar Tarea'}
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
                <div className="ai02-captura-resumen-card"><span>No Encontrados</span><strong style={{ color: 'var(--error-text)' }}>{capturas.filter(c => !bomsConsolidados.find((b: any) => b.bom_sku === c.bom_sku)).length}</strong></div>
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
