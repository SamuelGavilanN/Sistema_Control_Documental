// src/components/Transactions/UT/UT03CapturaBOM.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import './UT03.css';

const TIENDAS_DISPONIBLES = ['C144 Tiendas sin Bodega'];

const COLORES_BOM = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f97316', '#14b8a6', '#a855f7', '#eab308'
];

type Vista = 'main' | 'crear' | 'capturar';

interface PalletFinalizado {
  numero: number;
  boms: string[];
}

interface TareaFinalizada {
  id: string;
  pedido: string;
  tienda: string;
  numero_acta: string;
  usuario_id: string;
  usuario_nombre: string;
  cantidad_pallets: number;
  cantidad_total_bultos: number;
  creado_en: string;
  pallets: Array<{
    numero_pallet: number;
    boms: string[];
    cantidad_bultos: number;
  }>;
}

const formatFechaHora = (f: string): string => {
  if (!f) return '-';
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return f;
    return `${d.toLocaleDateString('es-CL')} ${d.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  } catch { return f; }
};

const UT03CapturaBOM: React.FC = () => {
  const [vista, setVista] = useState<Vista>('main');

  const [form, setForm] = useState({
    pedido: '',
    tienda: TIENDAS_DISPONIBLES[0],
    numero_acta: ''
  });

  const [tarea, setTarea] = useState<{
    pedido: string;
    tienda: string;
    numero_acta: string;
  } | null>(null);
  const [pallets, setPallets] = useState<PalletFinalizado[]>([]);
  const [capturasActuales, setCapturasActuales] = useState<string[]>([]);

  // Ref para valor sincrónico de capturas (evita problemas de timing con scanner físico)
  const capturasRef = useRef<string[]>([]);
  // Bandera para bloquear capturas durante transiciones (evita caracteres residuales del scanner)
  const [inputBloqueado, setInputBloqueado] = useState(false);

  const [bomInput, setBomInput] = useState('');
  const [inputMode, setInputMode] = useState<'none' | 'text'>('none');
  const inputRef = useRef<HTMLInputElement>(null);

  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });

  const [tareas, setTareas] = useState<TareaFinalizada[]>([]);

  const usuario = auth.getUsuario();

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 3500);
  };

  // Sincronizar ref con el state
  useEffect(() => {
    capturasRef.current = capturasActuales;
  }, [capturasActuales]);

  // ============ COLORES POR BOM ============
  const coloresBOM = useMemo(() => {
    const map = new Map<string, string>();
    const todosLosBoms: string[] = [
      ...pallets.flatMap((p) => p.boms),
      ...capturasActuales
    ];
    const unicos = Array.from(new Set(todosLosBoms));
    unicos.forEach((bom, i) => {
      map.set(bom, COLORES_BOM[i % COLORES_BOM.length]);
    });
    return map;
  }, [pallets, capturasActuales]);

  // ============ CARGA DE TAREAS ============
  const cargarTareas = async () => {
    setCargando(true);
    try {
      const { data: tareasData, error: errT } = await supabase
        .from('bom_pallet_tareas')
        .select('*')
        .order('creado_en', { ascending: false })
        .limit(30);

      if (errT) throw errT;
      if (!tareasData || tareasData.length === 0) {
        setTareas([]);
        return;
      }

      const ids = tareasData.map((t: any) => t.id);
      const { data: palletsData, error: errP } = await supabase
        .from('bom_pallet_pallets')
        .select('*')
        .in('tarea_id', ids)
        .order('numero_pallet', { ascending: true });

      if (errP) throw errP;

      const palletsPorTarea = new Map<string, any[]>();
      (palletsData || []).forEach((p: any) => {
        if (!palletsPorTarea.has(p.tarea_id)) palletsPorTarea.set(p.tarea_id, []);
        palletsPorTarea.get(p.tarea_id)!.push({
          numero_pallet: p.numero_pallet,
          boms: p.boms || [],
          cantidad_bultos: p.cantidad_bultos || 0
        });
      });

      setTareas(
        tareasData.map((t: any) => ({
          ...t,
          pallets: palletsPorTarea.get(t.id) || []
        }))
      );
    } catch (e) {
      console.error('Error cargando tareas:', e);
      mostrarMensaje('error', 'Error al cargar tareas');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTareas();
  }, []);

  // ============ FOCO AUTOMÁTICO PARA SCANNER ============
  useEffect(() => {
    if (vista !== 'capturar') return;
    if (inputMode !== 'none') return;
    if (inputBloqueado) return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [vista, inputMode, inputBloqueado]);

  // ============ HANDLERS ============
  const iniciarCaptura = () => {
    if (!form.pedido.trim()) {
      mostrarMensaje('warning', 'Ingresa el pedido');
      return;
    }
    if (!form.numero_acta.trim()) {
      mostrarMensaje('warning', 'Ingresa el número de acta');
      return;
    }
    setTarea({
      pedido: form.pedido.trim(),
      tienda: form.tienda,
      numero_acta: form.numero_acta.trim()
    });
    setPallets([]);
    setCapturasActuales([]);
    capturasRef.current = [];
    setBomInput('');
    setInputBloqueado(false);
    setInputMode('none');
    setVista('capturar');
  };

  const capturarBOM = () => {
    if (inputBloqueado) return;
    const codigo = bomInput.trim();
    if (!codigo) return;

    const nuevas = [...capturasRef.current, codigo];
    capturasRef.current = nuevas;
    setCapturasActuales(nuevas);
    setBomInput('');
    // Limpiar también el DOM por si el scanner dejó algo residual
    if (inputRef.current) inputRef.current.value = '';

    setTimeout(() => {
      if (!inputBloqueado) inputRef.current?.focus();
    }, 50);
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      capturarBOM();
    }
  };

  const eliminarCaptura = (index: number) => {
    const nuevas = capturasRef.current.filter((_, i) => i !== index);
    capturasRef.current = nuevas;
    setCapturasActuales(nuevas);
  };

  const abrirTeclado = () => {
    setInputMode('text');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const cerrarTeclado = () => {
    setInputMode('none');
    inputRef.current?.blur();
  };

  const palletRevisado = () => {
    // Bloqueo inmediato del input (evita caracteres residuales del scanner)
    setInputBloqueado(true);

    const capturas = capturasRef.current;
    if (capturas.length === 0) {
      setInputBloqueado(false);
      mostrarMensaje('warning', 'No hay capturas en este pallet');
      return;
    }

    // Snapshot antes de cualquier modificación
    const snapshot = [...capturas];
    const numeroPallet = pallets.length + 1;

    // Reset COMPLETO del estado del pallet
    capturasRef.current = [];
    setCapturasActuales([]);
    setBomInput('');
    if (inputRef.current) inputRef.current.value = '';

    // Agregar el pallet a la lista
    setPallets((prev) => [...prev, { numero: numeroPallet, boms: snapshot }]);

    mostrarMensaje('success', `Pallet ${numeroPallet} guardado (${snapshot.length} bultos)`);

    // Desbloquear después de un delay suficiente para que el scanner termine de enviar
    setTimeout(() => {
      setInputBloqueado(false);
      setInputMode('none');
      inputRef.current?.focus();
    }, 700);
  };

  const finalizarTarea = async () => {
    if (!tarea) return;

    // Bloquear input por si acaso
    setInputBloqueado(true);

    let palletsFinales = [...pallets];
    const capturasPendientes = [...capturasRef.current];

    if (capturasPendientes.length > 0) {
      const confirmar = window.confirm(
        `Hay ${capturasPendientes.length} captura(s) sin guardar en el pallet actual. ¿Guardar como Pallet ${pallets.length + 1}?`
      );
      if (confirmar) {
        palletsFinales.push({ numero: pallets.length + 1, boms: capturasPendientes });
      } else {
        setInputBloqueado(false);
        return;
      }
    }

    if (palletsFinales.length === 0) {
      mostrarMensaje('warning', 'Debes tener al menos un pallet revisado');
      setInputBloqueado(false);
      return;
    }

    if (!window.confirm(`¿Finalizar tarea? Se guardarán ${palletsFinales.length} pallet(s).`)) {
      setInputBloqueado(false);
      return;
    }

    setGuardando(true);
    try {
      const cantidadTotal = palletsFinales.reduce((s, p) => s + p.boms.length, 0);

      const { data: tareaInsertada, error: errTarea } = await supabase
        .from('bom_pallet_tareas')
        .insert({
          pedido: tarea.pedido,
          tienda: tarea.tienda,
          numero_acta: tarea.numero_acta,
          usuario_id: usuario?.id || null,
          usuario_nombre:
            `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim() ||
            usuario?.usuario ||
            'Desconocido',
          cantidad_pallets: palletsFinales.length,
          cantidad_total_bultos: cantidadTotal
        })
        .select()
        .single();

      if (errTarea) throw errTarea;

      const palletsRows = palletsFinales.map((p) => ({
        tarea_id: tareaInsertada.id,
        numero_pallet: p.numero,
        boms: p.boms,
        cantidad_bultos: p.boms.length
      }));

      const { error: errPallets } = await supabase
        .from('bom_pallet_pallets')
        .insert(palletsRows);

      if (errPallets) throw errPallets;

      mostrarMensaje(
        'success',
        `Tarea finalizada: ${palletsFinales.length} pallets, ${cantidadTotal} bultos`
      );

      setTarea(null);
      setPallets([]);
      setCapturasActuales([]);
      capturasRef.current = [];
      setForm({ pedido: '', tienda: TIENDAS_DISPONIBLES[0], numero_acta: '' });
      setInputBloqueado(false);
      setVista('main');

      await cargarTareas();
    } catch (e) {
      console.error('Error finalizando tarea:', e);
      mostrarMensaje('error', 'Error al finalizar tarea: ' + (e as Error).message);
      setInputBloqueado(false);
    } finally {
      setGuardando(false);
    }
  };

  const cancelarTarea = () => {
    if (!window.confirm('¿Cancelar la tarea actual? Se perderán las capturas.')) return;
    setTarea(null);
    setPallets([]);
    setCapturasActuales([]);
    capturasRef.current = [];
    setForm({ pedido: '', tienda: TIENDAS_DISPONIBLES[0], numero_acta: '' });
    setInputBloqueado(false);
    setVista('main');
  };

  const eliminarTarea = async (t: TareaFinalizada) => {
    if (!window.confirm(`¿Eliminar la tarea "${t.pedido}" (Acta ${t.numero_acta})?\n\nSe eliminarán también todos sus pallets. Esta acción no se puede deshacer.`)) {
      return;
    }
    setEliminandoId(t.id);
    try {
      // Los pallets se eliminan en cascada por la FK (on delete cascade)
      const { error } = await supabase
        .from('bom_pallet_tareas')
        .delete()
        .eq('id', t.id);

      if (error) throw error;

      mostrarMensaje('success', 'Tarea eliminada');
      await cargarTareas();
    } catch (e) {
      console.error('Error eliminando tarea:', e);
      mostrarMensaje('error', 'Error al eliminar tarea: ' + (e as Error).message);
    } finally {
      setEliminandoId(null);
    }
  };

  // ============ EXPORTAR EXCEL ============
  const exportarCapturas = (t: TareaFinalizada) => {
    const rows: any[][] = [];
    t.pallets.forEach((p) => {
      p.boms.forEach((bom) => {
        rows.push([t.pedido, t.numero_acta, t.tienda, `Pallet ${p.numero_pallet}`, bom]);
      });
    });
    const headers = ['Pedido', 'N° Acta', 'Tienda', 'Id Pallet', 'BOM'];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Capturas');
    XLSX.writeFile(wb, `Capturas_BOM_${t.pedido}_${t.numero_acta}.xlsx`);
  };

  const exportarConsolidacion = (t: TareaFinalizada) => {
    const rows = t.pallets.map((p) => [
      t.pedido,
      t.numero_acta,
      `Pallet ${p.numero_pallet}`,
      p.cantidad_bultos,
      t.usuario_nombre
    ]);
    const headers = ['Encabezado', 'Numero Acta', 'Id Pallet', 'Cantidad Bultos', 'Responsable'];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidación');
    XLSX.writeFile(wb, `Consolidacion_BOM_${t.pedido}_${t.numero_acta}.xlsx`);
  };

  // ============ VISTA: CREAR TAREA ============
  if (vista === 'crear') {
    return (
      <div className="ut03-container">
        {mensaje.visible && (
          <div className={`ut03-toast ut03-toast-${mensaje.tipo}`}>{mensaje.texto}</div>
        )}
        <div className="ut03-header">
          <h1>Nueva Tarea · Captura BOM</h1>
          <p>Completa los datos antes de iniciar la captura</p>
        </div>

        <div className="ut03-card">
          <div className="ut03-form-group">
            <label className="ut03-form-label">Pedido *</label>
            <input
              type="text"
              className="ut03-input"
              value={form.pedido}
              onChange={(e) => setForm({ ...form, pedido: e.target.value })}
              placeholder="Ej: PED-2026-001"
              autoFocus
            />
          </div>
          <div className="ut03-form-group">
            <label className="ut03-form-label">Tienda *</label>
            <select
              className="ut03-select"
              value={form.tienda}
              onChange={(e) => setForm({ ...form, tienda: e.target.value })}
            >
              {TIENDAS_DISPONIBLES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="ut03-form-group">
            <label className="ut03-form-label">N° Acta *</label>
            <input
              type="text"
              className="ut03-input"
              value={form.numero_acta}
              onChange={(e) => setForm({ ...form, numero_acta: e.target.value })}
              placeholder="Ej: 22687"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <button className="ut03-btn ut03-btn-primary" onClick={iniciarCaptura}>
            Iniciar Captura
          </button>
          <button className="ut03-btn" onClick={() => setVista('main')}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ============ VISTA: CAPTURAR ============
  if (vista === 'capturar' && tarea) {
    const numeroPalletActual = pallets.length + 1;

    return (
      <div className="ut03-container">
        {mensaje.visible && (
          <div className={`ut03-toast ut03-toast-${mensaje.tipo}`}>{mensaje.texto}</div>
        )}

        <div className="ut03-header">
          <h1>Captura BOM</h1>
          <p>Tarea en curso</p>
        </div>

        <div className="ut03-info-grid">
          <div className="ut03-info-item">
            <div className="ut03-info-label">Pedido</div>
            <div className="ut03-info-value">{tarea.pedido}</div>
          </div>
          <div className="ut03-info-item">
            <div className="ut03-info-label">N° Acta</div>
            <div className="ut03-info-value">{tarea.numero_acta}</div>
          </div>
          <div className="ut03-info-item" style={{ gridColumn: '1 / -1' }}>
            <div className="ut03-info-label">Tienda</div>
            <div className="ut03-info-value" style={{ fontSize: 12 }}>{tarea.tienda}</div>
          </div>
        </div>

        <div className="ut03-contador">
          <div className="ut03-contador-pallet">Pallet actual</div>
          <div className="ut03-contador-numero">{numeroPalletActual}</div>
          <div className="ut03-contador-label">
            {capturasActuales.length} bulto(s) capturado(s)
          </div>
        </div>

        <div className="ut03-captura-zone">
          <input
            ref={inputRef}
            type="text"
            className="ut03-captura-input"
            value={bomInput}
            onChange={(e) => setBomInput(e.target.value)}
            onKeyDown={handleKeyDownInput}
            inputMode={inputMode}
            placeholder={inputBloqueado ? 'Procesando...' : 'Escanear BOM...'}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={inputBloqueado}
          />
          <div className="ut03-captura-botones">
            {inputMode === 'none' ? (
              <button
                className="ut03-btn ut03-btn-sm"
                onClick={abrirTeclado}
                type="button"
                disabled={inputBloqueado}
              >
                ⌨️ Abrir teclado
              </button>
            ) : (
              <button
                className="ut03-btn ut03-btn-sm"
                onClick={cerrarTeclado}
                type="button"
                disabled={inputBloqueado}
              >
                ⌨️ Cerrar teclado
              </button>
            )}
            <button
              className="ut03-btn ut03-btn-primary ut03-btn-sm"
              onClick={capturarBOM}
              type="button"
              disabled={inputBloqueado}
            >
              + Capturar
            </button>
          </div>
        </div>

        <div className="ut03-capturas-lista">
          {capturasActuales.length === 0 ? (
            <div className="ut03-empty-capturas">Sin capturas en este pallet</div>
          ) : (
            capturasActuales.map((bom, idx) => (
              <div key={`${bom}-${idx}`} className="ut03-captura-item">
                <span
                  className="ut03-captura-dot"
                  style={{ background: coloresBOM.get(bom) || '#64748b' }}
                />
                <span className="ut03-captura-bom">{bom}</span>
                <button
                  className="ut03-captura-eliminar"
                  onClick={() => eliminarCaptura(idx)}
                  type="button"
                  title="Eliminar captura"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {pallets.length > 0 && (
          <div className="ut03-pallets-finalizados">
            <div className="ut03-card-title">Pallets revisados ({pallets.length})</div>
            {pallets.map((p) => (
              <div key={p.numero} className="ut03-pallet-item">
                <div className="ut03-pallet-info">
                  <span className="ut03-pallet-label">Pallet {p.numero}</span>
                  <span className="ut03-pallet-count">{p.boms.length} bulto(s)</span>
                </div>
                <button
                  className="ut03-btn ut03-btn-sm"
                  onClick={() => {
                    if (window.confirm(`¿Devolver el Pallet ${p.numero} a captura?`)) {
                      const nuevos = [...p.boms];
                      capturasRef.current = nuevos;
                      setCapturasActuales(nuevos);
                      setPallets(pallets.filter((x) => x.numero !== p.numero));
                    }
                  }}
                  type="button"
                  disabled={inputBloqueado}
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="ut03-bottom-bar">
          <button
            className="ut03-btn ut03-btn-success"
            onClick={palletRevisado}
            disabled={capturasActuales.length === 0 || inputBloqueado}
            type="button"
          >
            ✓ Pallet {numeroPalletActual} Revisado ({capturasActuales.length} bultos)
          </button>
          <button
            className="ut03-btn ut03-btn-warning"
            onClick={finalizarTarea}
            disabled={guardando || inputBloqueado || (pallets.length === 0 && capturasActuales.length === 0)}
            type="button"
          >
            {guardando
              ? 'Guardando...'
              : `Finalizar Tarea (${pallets.length} pallet${pallets.length !== 1 ? 's' : ''})`}
          </button>
          <button
            className="ut03-btn"
            onClick={cancelarTarea}
            disabled={guardando || inputBloqueado}
            type="button"
            style={{ fontSize: 13 }}
          >
            Cancelar Tarea
          </button>
        </div>
      </div>
    );
  }

  // ============ VISTA: MAIN ============
  return (
    <div className="ut03-container">
      {mensaje.visible && (
        <div className={`ut03-toast ut03-toast-${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      <div className="ut03-header">
        <h1>UT03 · Captura BOM en Pallet</h1>
        <p>Registro y consolidación de BOM por pallet</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className="ut03-btn ut03-btn-primary"
          onClick={() => setVista('crear')}
          style={{ flex: 2 }}
        >
          + Nueva Tarea
        </button>
        <button
          className="ut03-btn"
          onClick={cargarTareas}
          disabled={cargando}
          style={{ flex: 1 }}
          title="Actualizar lista de tareas"
        >
          {cargando ? '⏳' : '🔄 Actualizar'}
        </button>
      </div>

      <div className="ut03-card-title" style={{ marginBottom: 8 }}>
        Tareas recientes {tareas.length > 0 && `(${tareas.length})`}
      </div>

      {cargando ? (
        <div className="ut03-loading">Cargando tareas...</div>
      ) : tareas.length === 0 ? (
        <div className="ut03-empty">No hay tareas registradas todavía.</div>
      ) : (
        tareas.map((t) => (
          <div key={t.id} className="ut03-tarea-card">
            <div className="ut03-tarea-card-header">
              <div>
                <div className="ut03-tarea-card-pedido">{t.pedido}</div>
                <div className="ut03-tarea-card-meta">
                  Acta {t.numero_acta} · {t.tienda}
                </div>
              </div>
              <button
                className="ut03-captura-eliminar"
                onClick={() => eliminarTarea(t)}
                disabled={eliminandoId === t.id}
                title="Eliminar tarea"
                style={{ alignSelf: 'flex-start' }}
              >
                {eliminandoId === t.id ? '…' : '×'}
              </button>
            </div>

            <div className="ut03-tarea-card-body">
              <div className="ut03-stat">
                <div className="ut03-stat-value">{t.cantidad_pallets}</div>
                <div className="ut03-stat-label">Pallets</div>
              </div>
              <div className="ut03-stat">
                <div className="ut03-stat-value">{t.cantidad_total_bultos}</div>
                <div className="ut03-stat-label">Bultos</div>
              </div>
              <div className="ut03-stat">
                <div className="ut03-stat-value" style={{ fontSize: 12, fontFamily: 'sans-serif' }}>
                  {t.cantidad_pallets > 0
                    ? Math.round((t.cantidad_total_bultos / t.cantidad_pallets) * 10) / 10
                    : 0}
                </div>
                <div className="ut03-stat-label">Prom/Pallet</div>
              </div>
            </div>

            {t.pallets.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {t.pallets.map((p) => (
                  <div
                    key={p.numero_pallet}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      padding: '4px 0',
                      borderTop: '1px solid var(--border)'
                    }}
                  >
                    <span>Pallet {p.numero_pallet}</span>
                    <span>{p.cantidad_bultos} bulto(s)</span>
                  </div>
                ))}
              </div>
            )}

            <div className="ut03-tarea-card-footer">
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {t.usuario_nombre}
                </div>
                <div style={{ fontSize: 11 }}>{formatFechaHora(t.creado_en)}</div>
              </div>
              <div className="ut03-tarea-card-actions">
                <button
                  className="ut03-btn ut03-btn-sm"
                  onClick={() => exportarCapturas(t)}
                  type="button"
                >
                  📄 Capturas
                </button>
                <button
                  className="ut03-btn ut03-btn-sm ut03-btn-success"
                  onClick={() => exportarConsolidacion(t)}
                  type="button"
                >
                  📊 Consolidado
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default UT03CapturaBOM;
