// src/components/Transactions/UT/UT03CapturaBOM.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import './UT03.css';

const TIENDAS_DISPONIBLES = ['C144 Tiendas sin Bodega'];

// Paleta de colores para diferenciar BOMs
const COLORES_BOM = [
  '#3b82f6', // azul
  '#10b981', // verde
  '#f59e0b', // ámbar
  '#ef4444', // rojo
  '#8b5cf6', // violeta
  '#ec4899', // rosa
  '#06b6d4', // cian
  '#84cc16', // lima
  '#f97316', // naranja
  '#14b8a6', // teal
  '#a855f7', // púrpura
  '#eab308'  // amarillo
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

  // Formulario de creación
  const [form, setForm] = useState({
    pedido: '',
    tienda: TIENDAS_DISPONIBLES[0],
    numero_acta: ''
  });

  // Tarea en curso
  const [tarea, setTarea] = useState<{
    pedido: string;
    tienda: string;
    numero_acta: string;
  } | null>(null);
  const [pallets, setPallets] = useState<PalletFinalizado[]>([]);
  const [capturasActuales, setCapturasActuales] = useState<string[]>([]);

  // Input de captura
  const [bomInput, setBomInput] = useState('');
  const [inputMode, setInputMode] = useState<'none' | 'text'>('none');
  const inputRef = useRef<HTMLInputElement>(null);

  // Estado general
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });

  // Tareas finalizadas
  const [tareas, setTareas] = useState<TareaFinalizada[]>([]);

  const usuario = auth.getUsuario();

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 3500);
  };

  // ============ MAPA DE COLORES POR BOM ============
  // Calcula un color único por cada código BOM capturado
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

  // ============ CARGA DE TAREAS FINALIZADAS ============
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

  // ============ MANTENER FOCO EN EL INPUT (para scanner físico) ============
  useEffect(() => {
    if (vista !== 'capturar') return;
    if (inputMode !== 'none') return;

    // Refoco después de cada cambio de vista o al montar
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [vista, inputMode]);

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
    setBomInput('');
    setInputMode('none');
    setVista('capturar');
  };

  const capturarBOM = () => {
    const codigo = bomInput.trim();
    if (!codigo) return;
    setCapturasActuales((prev) => [...prev, codigo]);
    setBomInput('');
    // Mantener el foco para el scanner
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      capturarBOM();
    }
  };

  const eliminarCaptura = (index: number) => {
    setCapturasActuales((prev) => prev.filter((_, i) => i !== index));
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
    if (capturasActuales.length === 0) {
      mostrarMensaje('warning', 'No hay capturas en este pallet');
      return;
    }
    const numeroPallet = pallets.length + 1;
    setPallets((prev) => [...prev, { numero: numeroPallet, boms: [...capturasActuales] }]);
    setCapturasActuales([]);
    setInputMode('none');
    setBomInput('');
    mostrarMensaje('success', `Pallet ${numeroPallet} guardado (${capturasActuales.length} bultos)`);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const finalizarTarea = async () => {
    if (!tarea) return;

    // Si hay capturas pendientes en el pallet actual, preguntar
    let palletsFinales = [...pallets];
    if (capturasActuales.length > 0) {
      const confirmar = window.confirm(
        `Hay ${capturasActuales.length} captura(s) sin guardar en el pallet actual. ¿Guardar como Pallet ${pallets.length + 1}?`
      );
      if (confirmar) {
        palletsFinales.push({ numero: pallets.length + 1, boms: [...capturasActuales] });
      } else {
        return;
      }
    }

    if (palletsFinales.length === 0) {
      mostrarMensaje('warning', 'Debes tener al menos un pallet revisado');
      return;
    }

    if (!window.confirm(`¿Finalizar tarea? Se guardarán ${palletsFinales.length} pallet(s).`)) return;

    setGuardando(true);
    try {
      const cantidadTotal = palletsFinales.reduce((s, p) => s + p.boms.length, 0);

      // 1. Insertar tarea
      const { data: tareaInsertada, error: errTarea } = await supabase
        .from('bom_pallet_tareas')
        .insert({
          pedido: tarea.pedido,
          tienda: tarea.tienda,
          numero_acta: tarea.numero_acta,
          usuario_id: usuario?.id || null,
          usuario_nombre: `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim() || usuario?.usuario || 'Desconocido',
          cantidad_pallets: palletsFinales.length,
          cantidad_total_bultos: cantidadTotal
        })
        .select()
        .single();

      if (errTarea) throw errTarea;

      // 2. Insertar pallets
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

      mostrarMensaje('success', `Tarea finalizada: ${palletsFinales.length} pallets, ${cantidadTotal} bultos`);

      // Limpiar
      setTarea(null);
      setPallets([]);
      setCapturasActuales([]);
      setForm({ pedido: '', tienda: TIENDAS_DISPONIBLES[0], numero_acta: '' });
      setVista('main');

      await cargarTareas();
    } catch (e) {
      console.error('Error finalizando tarea:', e);
      mostrarMensaje('error', 'Error al finalizar tarea: ' + (e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const cancelarTarea = () => {
    if (!window.confirm('¿Cancelar la tarea actual? Se perderán las capturas.')) return;
    setTarea(null);
    setPallets([]);
    setCapturasActuales([]);
    setForm({ pedido: '', tienda: TIENDAS_DISPONIBLES[0], numero_acta: '' });
    setVista('main');
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

        {/* Info de la tarea */}
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

        {/* Contador */}
        <div className="ut03-contador">
          <div className="ut03-contador-pallet">Pallet actual</div>
          <div className="ut03-contador-numero">{numeroPalletActual}</div>
          <div className="ut03-contador-label">
            {capturasActuales.length} bulto(s) capturado(s)
          </div>
        </div>

        {/* Zona de captura */}
        <div className="ut03-captura-zone">
          <input
            ref={inputRef}
            type="text"
            className="ut03-captura-input"
            value={bomInput}
            onChange={(e) => setBomInput(e.target.value)}
            onKeyDown={handleKeyDownInput}
            inputMode={inputMode}
            placeholder="Escanear BOM..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <div className="ut03-captura-botones">
            {inputMode === 'none' ? (
              <button
                className="ut03-btn ut03-btn-sm"
                onClick={abrirTeclado}
                type="button"
              >
                ⌨️ Abrir teclado
              </button>
            ) : (
              <button
                className="ut03-btn ut03-btn-sm"
                onClick={cerrarTeclado}
                type="button"
              >
                ⌨️ Cerrar teclado
              </button>
            )}
            <button
              className="ut03-btn ut03-btn-primary ut03-btn-sm"
              onClick={capturarBOM}
              type="button"
            >
              + Capturar
            </button>
          </div>
        </div>

        {/* Lista de capturas del pallet actual */}
        <div className="ut03-capturas-lista">
          {capturasActuales.length === 0 ? (
            <div className="ut03-empty-capturas">
              Sin capturas en este pallet
            </div>
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

        {/* Pallets finalizados */}
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
                      setCapturasActuales([...p.boms]);
                      setPallets(pallets.filter((x) => x.numero !== p.numero));
                    }
                  }}
                  type="button"
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Barra inferior */}
        <div className="ut03-bottom-bar">
          <button
            className="ut03-btn ut03-btn-success"
            onClick={palletRevisado}
            disabled={capturasActuales.length === 0}
            type="button"
          >
            ✓ Pallet {numeroPalletActual} Revisado ({capturasActuales.length} bultos)
          </button>
          <button
            className="ut03-btn ut03-btn-warning"
            onClick={finalizarTarea}
            disabled={guardando || (pallets.length === 0 && capturasActuales.length === 0)}
            type="button"
          >
            {guardando ? 'Guardando...' : `Finalizar Tarea (${pallets.length} pallet${pallets.length !== 1 ? 's' : ''})`}
          </button>
          <button
            className="ut03-btn"
            onClick={cancelarTarea}
            disabled={guardando}
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

      <button
        className="ut03-btn ut03-btn-primary"
        onClick={() => setVista('crear')}
        style={{ marginBottom: 16 }}
      >
        + Nueva Tarea
      </button>

      <div className="ut03-card-title" style={{ marginBottom: 8 }}>
        Tareas recientes
      </div>

      {cargando ? (
        <div className="ut03-loading">Cargando tareas...</div>
      ) : tareas.length === 0 ? (
        <div className="ut03-empty">
          No hay tareas registradas todavía.
        </div>
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
                  {t.cantidad_pallets > 0 ? Math.round((t.cantidad_total_bultos / t.cantidad_pallets) * 10) / 10 : 0}
                </div>
                <div className="ut03-stat-label">Prom/Pallet</div>
              </div>
            </div>

            {/* Detalle por pallet */}
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
