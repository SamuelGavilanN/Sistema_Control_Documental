// src/components/Transactions/SD/SD01KPI.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import './SD01KPI.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  apikey: 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  Authorization: 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const FETCH_PAGE = 1000;

type Tab = 'resumen' | 'usuarios' | 'detalle' | 'evolucion';

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  usuario: string;
}

interface TransporteKPI {
  id: string;
  id_documento: string;
  fecha_programacion: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_rol: string;
  creado_en: string;
  finalizado_en: string;
  duracionMs: number;
  cantidad_locales: number;
  cantidad_bultos: number;
}

interface SD01KPIProps {
  onClose: () => void;
}

const fetchAllPaginado = async (baseUrl: string): Promise<any[]> => {
  const out: any[] = [];
  let offset = 0;
  while (true) {
    const sep = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${sep}limit=${FETCH_PAGE}&offset=${offset}`;
    const resp = await fetch(url, { headers: HEADERS });
    if (!resp.ok) throw new Error(`Error al consultar: ${resp.statusText}`);
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) break;
    out.push(...data);
    if (data.length < FETCH_PAGE) break;
    offset += FETCH_PAGE;
  }
  return out;
};

const formatDuracion = (ms: number): { texto: string; corta: string } => {
  if (!ms || ms < 0) return { texto: '0m 00s', corta: '0m' };
  const totalSeg = Math.round(ms / 1000);
  const horas = Math.floor(totalSeg / 3600);
  const min = Math.floor((totalSeg % 3600) / 60);
  const seg = totalSeg % 60;
  if (horas > 0) {
    return {
      texto: `${horas}h ${String(min).padStart(2, '0')}m ${String(seg).padStart(2, '0')}s`,
      corta: `${horas}h ${String(min).padStart(2, '0')}m`
    };
  }
  return {
    texto: `${min}m ${String(seg).padStart(2, '0')}s`,
    corta: `${min}m ${String(seg).padStart(2, '0')}s`
  };
};

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

const formatFechaCorta = (f: string): string => {
  if (!f) return '-';
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return f;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  } catch { return f; }
};

const getIniciales = (nombre: string): string => {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 0) return '??';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

const getColorClase = (ms: number): 'fast' | 'medium' | 'slow' => {
  const min = ms / 60000;
  if (min <= 15) return 'fast';
  if (min <= 25) return 'medium';
  return 'slow';
};

const mediana = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const copia = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(copia.length / 2);
  if (copia.length % 2 === 0) return (copia[mid - 1] + copia[mid]) / 2;
  return copia[mid];
};

// ===================== MultiSelect Usuarios =====================
interface MultiSelectProps {
  options: Usuario[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}

const MultiSelectUsuarios: React.FC<MultiSelectProps> = ({ options, value, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const nombresSeleccionados = options
    .filter((u) => value.includes(u.id))
    .map((u) => `${u.nombre} ${u.apellido}`);

  return (
    <div className="sd01-kpi-multiselect" ref={ref}>
      <button
        type="button"
        className="sd01-kpi-multiselect-trigger"
        onClick={() => setOpen(!open)}
      >
        {nombresSeleccionados.length === 0 ? (
          <span className="sd01-kpi-multiselect-placeholder">{placeholder}</span>
        ) : (
          <span className="sd01-kpi-multiselect-chips">
            {nombresSeleccionados.slice(0, 2).map((n) => (
              <span key={n} className="sd01-kpi-multiselect-chip">{n}</span>
            ))}
            {nombresSeleccionados.length > 2 && (
              <span className="sd01-kpi-multiselect-chip">+{nombresSeleccionados.length - 2}</span>
            )}
          </span>
        )}
        <span className="sd01-kpi-multiselect-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="sd01-kpi-multiselect-dropdown">
          {options.map((u) => (
            <label key={u.id} className="sd01-kpi-multiselect-item">
              <input
                type="checkbox"
                checked={value.includes(u.id)}
                onChange={() => toggle(u.id)}
              />
              {u.nombre} {u.apellido} <span style={{ color: 'var(--text-placeholder)', fontSize: 11 }}>· {u.rol}</span>
            </label>
          ))}
          <div className="sd01-kpi-multiselect-footer">
            <button type="button" onClick={() => onChange(options.map((u) => u.id))}>Todos</button>
            <button type="button" onClick={() => onChange([])}>Limpiar</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================== Componente principal =====================
const SD01KPI: React.FC<SD01KPIProps> = ({ onClose }) => {
  const [cargando, setCargando] = useState(true);
  const [todosTransportes, setTodosTransportes] = useState<TransporteKPI[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tab, setTab] = useState<Tab>('resumen');

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<string[]>([]);

  // Ordenamiento de la tabla usuarios
  const [ordenUsuarios, setOrdenUsuarios] = useState<{ col: string; dir: 'asc' | 'desc' }>({
    col: 'cantidad',
    dir: 'desc'
  });

  // Evolución diaria
  const [escalaEvolucion, setEscalaEvolucion] = useState<'diario' | 'semanal' | 'mensual'>('diario');

  // ============ Carga inicial ============
  useEffect(() => {
    const cargarTodo = async () => {
      setCargando(true);
      try {
        const [docsData, localesData, usuariosData] = await Promise.all([
          fetchAllPaginado(`${API_URL}/sd01_documentos?select=id,id_documento,fecha_programacion,estado,creado_por,creado_en,finalizado_en&estado=eq.Finalizado&finalizado_en=not.is.null`),
          fetchAllPaginado(`${API_URL}/sd01_documento_locales?select=id,documento_id,cantidad_solicitada`),
          fetchAllPaginado(`${API_URL}/usuarios?select=id,nombre,apellido,rol,usuario`)
        ]);

        // Mapa de usuarios
        const uMap = new Map<string, Usuario>();
        usuariosData.forEach((u: any) => uMap.set(u.id, u));
        setUsuarios(usuariosData);

        // Contar locales y bultos por documento
        const localesPorDoc = new Map<string, number>();
        const bultosPorDoc = new Map<string, number>();
        localesData.forEach((l: any) => {
          const doc = l.documento_id;
          localesPorDoc.set(doc, (localesPorDoc.get(doc) || 0) + 1);
          bultosPorDoc.set(doc, (bultosPorDoc.get(doc) || 0) + (Number(l.cantidad_solicitada) || 0));
        });

        // Mapear a TransporteKPI
        const kpis: TransporteKPI[] = docsData
          .filter((d: any) => d.creado_en && d.finalizado_en)
          .map((d: any) => {
            const creado = new Date(d.creado_en).getTime();
            const finalizado = new Date(d.finalizado_en).getTime();
            const duracion = finalizado - creado;
            const u = uMap.get(d.creado_por);
            return {
              id: d.id,
              id_documento: d.id_documento,
              fecha_programacion: d.fecha_programacion || '',
              usuario_id: d.creado_por || 'sin-usuario',
              usuario_nombre: u ? `${u.nombre} ${u.apellido}`.trim() : 'Usuario desconocido',
              usuario_rol: u?.rol || '-',
              creado_en: d.creado_en,
              finalizado_en: d.finalizado_en,
              duracionMs: duracion > 0 ? duracion : 0,
              cantidad_locales: localesPorDoc.get(d.id_documento) || 0,
              cantidad_bultos: bultosPorDoc.get(d.id_documento) || 0
            };
          })
          .filter((t) => t.duracionMs > 0);

        setTodosTransportes(kpis);
      } catch (e) {
        console.error('Error cargando KPI:', e);
      } finally {
        setCargando(false);
      }
    };
    cargarTodo();
  }, []);

  // ============ Filtrado ============
  const transportesFiltrados = useMemo(() => {
    return todosTransportes.filter((t) => {
      if (fechaDesde) {
        const f = (t.fecha_programacion || '').slice(0, 10);
        if (f < fechaDesde) return false;
      }
      if (fechaHasta) {
        const f = (t.fecha_programacion || '').slice(0, 10);
        if (f > fechaHasta) return false;
      }
      if (usuariosSeleccionados.length > 0 && !usuariosSeleccionados.includes(t.usuario_id)) return false;
      return true;
    });
  }, [todosTransportes, fechaDesde, fechaHasta, usuariosSeleccionados]);

  // ============ KPIs generales ============
  const kpisGenerales = useMemo(() => {
    const n = transportesFiltrados.length;
    if (n === 0) {
      return { total: 0, promedio: 0, minimo: 0, maximo: 0, mediana: 0, promLocales: 0 };
    }
    const duraciones = transportesFiltrados.map((t) => t.duracionMs);
    const sumaLocales = transportesFiltrados.reduce((s, t) => s + t.cantidad_locales, 0);
    return {
      total: n,
      promedio: duraciones.reduce((s, d) => s + d, 0) / n,
      minimo: Math.min(...duraciones),
      maximo: Math.max(...duraciones),
      mediana: mediana(duraciones),
      promLocales: sumaLocales / n
    };
  }, [transportesFiltrados]);

  // ============ Por usuario ============
  const statsUsuarios = useMemo(() => {
    const agrupado = new Map<string, TransporteKPI[]>();
    transportesFiltrados.forEach((t) => {
      if (!agrupado.has(t.usuario_id)) agrupado.set(t.usuario_id, []);
      agrupado.get(t.usuario_id)!.push(t);
    });

    const stats = Array.from(agrupado.entries()).map(([uid, lista]) => {
      const duraciones = lista.map((t) => t.duracionMs);
      const locales = lista.map((t) => t.cantidad_locales);
      const u = lista[0];
      return {
        usuario_id: uid,
        usuario_nombre: u.usuario_nombre,
        usuario_rol: u.usuario_rol,
        cantidad: lista.length,
        promedio: duraciones.reduce((s, d) => s + d, 0) / lista.length,
        minimo: Math.min(...duraciones),
        maximo: Math.max(...duraciones),
        mediana: mediana(duraciones),
        promLocales: locales.reduce((s, l) => s + l, 0) / lista.length,
        porcentaje: (lista.length / kpisGenerales.total) * 100
      };
    });

    stats.sort((a, b) => {
      const dir = ordenUsuarios.dir === 'asc' ? 1 : -1;
      switch (ordenUsuarios.col) {
        case 'nombre': return a.usuario_nombre.localeCompare(b.usuario_nombre) * dir;
        case 'cantidad': return (a.cantidad - b.cantidad) * dir;
        case 'promedio': return (a.promedio - b.promedio) * dir;
        case 'minimo': return (a.minimo - b.minimo) * dir;
        case 'maximo': return (a.maximo - b.maximo) * dir;
        case 'locales': return (a.promLocales - b.promLocales) * dir;
        default: return 0;
      }
    });

    return stats;
  }, [transportesFiltrados, kpisGenerales.total, ordenUsuarios]);

  // ============ Evolución temporal ============
  const evolucion = useMemo(() => {
    const agrupado = new Map<string, number[]>();
    transportesFiltrados.forEach((t) => {
      let key: string;
      const d = new Date(t.fecha_programacion || t.creado_en);
      if (escalaEvolucion === 'diario') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (escalaEvolucion === 'semanal') {
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      if (!agrupado.has(key)) agrupado.set(key, []);
      agrupado.get(key)!.push(t.duracionMs);
    });

    const puntos = Array.from(agrupado.entries())
      .map(([key, duraciones]) => ({
        key,
        promedio: duraciones.reduce((s, d) => s + d, 0) / duraciones.length,
        cantidad: duraciones.length
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

    return puntos;
  }, [transportesFiltrados, escalaEvolucion]);

  // ============ Exportación ============
  const exportarUsuarios = () => {
    const headers = ['Usuario', 'Rol', 'Transportes', 'Locales prom.', 'Promedio', 'Mínimo', 'Máximo', 'Mediana', '% del Total'];
    const rows = statsUsuarios.map((u) => [
      u.usuario_nombre,
      u.usuario_rol,
      u.cantidad,
      u.promLocales.toFixed(1),
      formatDuracion(u.promedio).texto,
      formatDuracion(u.minimo).texto,
      formatDuracion(u.maximo).texto,
      formatDuracion(u.mediana).texto,
      `${u.porcentaje.toFixed(1)}%`
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KPI Usuarios');
    XLSX.writeFile(wb, `KPI_Usuarios_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportarDetalle = () => {
    const headers = ['N° Transporte', 'Fecha Prog.', 'Usuario', 'Creado', 'Finalizado', 'Duración (ms)', 'Duración', 'Locales', 'Bultos'];
    const rows = transportesFiltrados.map((t) => [
      t.id_documento,
      t.fecha_programacion.slice(0, 10),
      t.usuario_nombre,
      t.creado_en,
      t.finalizado_en,
      t.duracionMs,
      formatDuracion(t.duracionMs).texto,
      t.cantidad_locales,
      t.cantidad_bultos
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle');
    XLSX.writeFile(wb, `KPI_Detalle_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const cambiarOrden = (col: string) => {
    setOrdenUsuarios((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' }
    );
  };

  const indicador = (col: string) =>
    ordenUsuarios.col === col ? (ordenUsuarios.dir === 'asc' ? ' ▲' : ' ▼') : '';

  // ============ Render del gráfico ============
  const renderGrafico = () => {
    if (evolucion.length === 0) {
      return <div className="sd01-kpi-empty">Sin datos para graficar</div>;
    }

    const W = 1000;
    const H = 320;
    const padL = 60;
    const padR = 20;
    const padT = 40;
    const padB = 60;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const maxDur = Math.max(...evolucion.map((p) => p.promedio), 60000);
    const yMax = Math.ceil(maxDur / 60000 / 5) * 5 * 60000;
    const stepX = evolucion.length > 1 ? chartW / (evolucion.length - 1) : 0;

    const puntos = evolucion.map((p, i) => ({
      x: padL + i * stepX,
      y: padT + chartH - (p.promedio / yMax) * chartH,
      data: p
    }));

    const linePath = puntos
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const areaPath = `${linePath} L ${puntos[puntos.length - 1].x.toFixed(1)} ${padT + chartH} L ${puntos[0].x.toFixed(1)} ${padT + chartH} Z`;

    // Grid Y: 5 líneas
    const gridLines = [];
    for (let i = 0; i <= 5; i++) {
      const y = padT + (chartH / 5) * i;
      const valor = (yMax / 60000) * (1 - i / 5);
      gridLines.push({ y, valor: Math.round(valor) });
    }

    return (
      <>
        <div className="sd01-kpi-chart-wrap">
          <svg className="sd01-kpi-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="sd01AreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>

            <g className="chart-grid">
              {gridLines.map((g, i) => (
                <line key={i} x1={padL} y1={g.y} x2={W - padR} y2={g.y} />
              ))}
            </g>

            <g className="chart-axis">
              {gridLines.map((g, i) => (
                <text key={i} x={padL - 8} y={g.y + 4} textAnchor="end">
                  {g.valor}m
                </text>
              ))}
            </g>

            <path d={areaPath} fill="url(#sd01AreaGrad)" />
            <path className="chart-line" d={linePath} />

            {puntos.map((p, i) => {
              const mostrarLabel = evolucion.length <= 12 || i % Math.ceil(evolucion.length / 10) === 0;
              return (
                <g key={i}>
                  <circle className="chart-point" cx={p.x} cy={p.y} r="4" />
                  {mostrarLabel && (
                    <text
                      className="chart-point-label"
                      x={p.x}
                      y={padT + chartH + 20}
                      textAnchor="middle"
                    >
                      {escalaEvolucion === 'diario'
                        ? formatFechaCorta(p.data.key)
                        : p.data.key.slice(-7)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="sd01-kpi-chart-summary">
          <div className="sd01-kpi-chart-summary-item">
            <div className="label">Día con menor promedio</div>
            <div className="value">
              {(() => {
                const min = evolucion.reduce((a, b) => (a.promedio < b.promedio ? a : b));
                return `${formatFechaCorta(min.key)} · ${formatDuracion(min.promedio).corta}`;
              })()}
            </div>
          </div>
          <div className="sd01-kpi-chart-summary-item">
            <div className="label">Día con mayor promedio</div>
            <div className="value">
              {(() => {
                const max = evolucion.reduce((a, b) => (a.promedio > b.promedio ? a : b));
                return `${formatFechaCorta(max.key)} · ${formatDuracion(max.promedio).corta}`;
              })()}
            </div>
          </div>
          <div className="sd01-kpi-chart-summary-item">
            <div className="label">Tendencia</div>
            <div className="value" style={{ color: (() => {
              if (evolucion.length < 2) return 'var(--text-primary)';
              const first = evolucion.slice(0, Math.ceil(evolucion.length / 3));
              const last = evolucion.slice(-Math.ceil(evolucion.length / 3));
              const avgFirst = first.reduce((s, p) => s + p.promedio, 0) / first.length;
              const avgLast = last.reduce((s, p) => s + p.promedio, 0) / last.length;
              return avgLast < avgFirst ? '#22c55e' : avgLast > avgFirst ? '#f87171' : 'var(--text-primary)';
            })() }}>
              {(() => {
                if (evolucion.length < 2) return 'Sin datos';
                const first = evolucion.slice(0, Math.ceil(evolucion.length / 3));
                const last = evolucion.slice(-Math.ceil(evolucion.length / 3));
                const avgFirst = first.reduce((s, p) => s + p.promedio, 0) / first.length;
                const avgLast = last.reduce((s, p) => s + p.promedio, 0) / last.length;
                if (avgLast < avgFirst) return '↘ Mejora';
                if (avgLast > avgFirst) return '↗ Empeora';
                return '→ Estable';
              })()}
            </div>
          </div>
          <div className="sd01-kpi-chart-summary-item">
            <div className="label">Variación</div>
            <div className="value">
              ± {formatDuracion(Math.max(...evolucion.map((p) => p.promedio)) - Math.min(...evolucion.map((p) => p.promedio))).corta}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="sd01-kpi-overlay">
      <div className="sd01-kpi-window">
        <button className="sd01-kpi-close" onClick={onClose}>×</button>

        <div className="sd01-kpi-header">
          <h1>KPI de Transportes</h1>
          <p>Métricas de tiempos de ciclo desde la creación hasta la finalización</p>
        </div>

        <div className="sd01-kpi-note">
          ℹ️ Tiempos medidos desde <strong>creado_en</strong> hasta <strong>finalizado_en</strong>. Solo transportes <strong>Finalizados</strong>. La duración depende directamente de la cantidad de locales del transporte.
        </div>

        {/* Filtros */}
        <div className="sd01-kpi-filters">
          <div className="sd01-kpi-filters-grid">
            <div className="sd01-kpi-filter-row">
              <label>Fecha desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="sd01-kpi-filter-row">
              <label>Fecha hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            <div className="sd01-kpi-filter-row">
              <label>Usuarios a medir</label>
              <MultiSelectUsuarios
                options={usuarios}
                value={usuariosSeleccionados}
                onChange={setUsuariosSeleccionados}
                placeholder="Todos los usuarios"
              />
            </div>
            <div className="sd01-kpi-filter-row">
              <label>&nbsp;</label>
              <button
                className="sd01-btn"
                onClick={() => {
                  setFechaDesde('');
                  setFechaHasta('');
                  setUsuariosSeleccionados([]);
                }}
              >
                🧹 Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sd01-kpi-tabs">
          <button
            className={`sd01-kpi-tab ${tab === 'resumen' ? 'active' : ''}`}
            onClick={() => setTab('resumen')}
          >
            Resumen General
          </button>
          <button
            className={`sd01-kpi-tab ${tab === 'usuarios' ? 'active' : ''}`}
            onClick={() => setTab('usuarios')}
          >
            Por Usuario <span className="count">{statsUsuarios.length}</span>
          </button>
          <button
            className={`sd01-kpi-tab ${tab === 'detalle' ? 'active' : ''}`}
            onClick={() => setTab('detalle')}
          >
            Detalle Transportes <span className="count">{transportesFiltrados.length}</span>
          </button>
          <button
            className={`sd01-kpi-tab ${tab === 'evolucion' ? 'active' : ''}`}
            onClick={() => setTab('evolucion')}
          >
            Evolución Temporal
          </button>
        </div>

        {cargando ? (
          <div className="sd01-kpi-panel">
            <div className="sd01-kpi-loading">Cargando datos KPI...</div>
          </div>
        ) : transportesFiltrados.length === 0 ? (
          <div className="sd01-kpi-panel">
            <div className="sd01-kpi-empty">No hay transportes finalizados con los filtros aplicados.</div>
          </div>
        ) : (
          <>
            {/* ============ TAB: RESUMEN ============ */}
            {tab === 'resumen' && (
              <div className="sd01-kpi-panel">
                <div className="sd01-kpi-grid">
                  <div className="sd01-kpi-card">
                    <div className="sd01-kpi-label">Transportes Finalizados</div>
                    <div className="sd01-kpi-value">{kpisGenerales.total}</div>
                    <div className="sd01-kpi-sub">
                      {fechaDesde || fechaHasta
                        ? `${fechaDesde || '...'} → ${fechaHasta || '...'}`
                        : 'Todos los periodos'}
                    </div>
                  </div>
                  <div className="sd01-kpi-card success">
                    <div className="sd01-kpi-label">Tiempo Promedio</div>
                    <div className="sd01-kpi-value">
                      {(() => {
                        const d = formatDuracion(kpisGenerales.promedio);
                        const match = d.corta.match(/(\d+)m\s+(\d+)s/);
                        if (match) {
                          return <>{match[1]}<span className="unit">m</span> {match[2]}<span className="unit">s</span></>;
                        }
                        return d.corta;
                      })()}
                    </div>
                    <div className="sd01-kpi-sub">Media general</div>
                  </div>
                  <div className="sd01-kpi-card purple">
                    <div className="sd01-kpi-label">Tiempo Mínimo</div>
                    <div className="sd01-kpi-value">{formatDuracion(kpisGenerales.minimo).corta}</div>
                    <div className="sd01-kpi-sub">Más rápido</div>
                  </div>
                  <div className="sd01-kpi-card danger">
                    <div className="sd01-kpi-label">Tiempo Máximo</div>
                    <div className="sd01-kpi-value">{formatDuracion(kpisGenerales.maximo).corta}</div>
                    <div className="sd01-kpi-sub">Más lento</div>
                  </div>
                  <div className="sd01-kpi-card warning">
                    <div className="sd01-kpi-label">Mediana</div>
                    <div className="sd01-kpi-value">{formatDuracion(kpisGenerales.mediana).corta}</div>
                    <div className="sd01-kpi-sub">50% bajo este valor</div>
                  </div>
                  <div className="sd01-kpi-card">
                    <div className="sd01-kpi-label">Prom. Locales</div>
                    <div className="sd01-kpi-value">{kpisGenerales.promLocales.toFixed(1)}</div>
                    <div className="sd01-kpi-sub">Por transporte</div>
                  </div>
                </div>
              </div>
            )}

            {/* ============ TAB: USUARIOS ============ */}
            {tab === 'usuarios' && (
              <div className="sd01-kpi-panel rounded">
                <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Estadísticas por usuario</h2>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Ordenado por {ordenUsuarios.col} · La columna "Locales prom." ayuda a interpretar el tiempo
                    </div>
                  </div>
                  <button className="sd01-btn" onClick={exportarUsuarios}>📊 Exportar Excel</button>
                </div>
                <div className="sd01-kpi-table-wrap">
                  <table className="sd01-kpi-table">
                    <thead>
                      <tr>
                        <th onClick={() => cambiarOrden('nombre')}>Usuario{indicador('nombre')}</th>
                        <th className="num" onClick={() => cambiarOrden('cantidad')}>Transportes{indicador('cantidad')}</th>
                        <th className="num" onClick={() => cambiarOrden('locales')}>Locales prom.{indicador('locales')}</th>
                        <th className="num" onClick={() => cambiarOrden('promedio')}>Promedio{indicador('promedio')}</th>
                        <th className="num" onClick={() => cambiarOrden('minimo')}>Mínimo{indicador('minimo')}</th>
                        <th className="num" onClick={() => cambiarOrden('maximo')}>Máximo{indicador('maximo')}</th>
                        <th className="num">Mediana</th>
                        <th className="num">% del Total</th>
                        <th>Distribución</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsUsuarios.map((u) => (
                        <tr key={u.usuario_id}>
                          <td>
                            <div className="sd01-kpi-user-cell">
                              <div className="sd01-kpi-avatar">{getIniciales(u.usuario_nombre)}</div>
                              <div>
                                <div className="sd01-kpi-user-name">{u.usuario_nombre}</div>
                                <div className="sd01-kpi-user-role">{u.usuario_rol}</div>
                              </div>
                            </div>
                          </td>
                          <td className="num">{u.cantidad}</td>
                          <td className="num">{u.promLocales.toFixed(1)}</td>
                          <td className="num"><strong>{formatDuracion(u.promedio).corta}</strong></td>
                          <td className="num">{formatDuracion(u.minimo).corta}</td>
                          <td className="num">{formatDuracion(u.maximo).corta}</td>
                          <td className="num">{formatDuracion(u.mediana).corta}</td>
                          <td className="num">{u.porcentaje.toFixed(1)}%</td>
                          <td>
                            <span
                              className={`sd01-kpi-tiempo-bar ${getColorClase(u.promedio)}`}
                              style={{ width: Math.min(100, u.promedio / 60000 * 2) + 'px' }}
                            ></span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>PROMEDIO GENERAL</td>
                        <td className="num">{kpisGenerales.total}</td>
                        <td className="num">{kpisGenerales.promLocales.toFixed(1)}</td>
                        <td className="num">{formatDuracion(kpisGenerales.promedio).corta}</td>
                        <td className="num">{formatDuracion(kpisGenerales.minimo).corta}</td>
                        <td className="num">{formatDuracion(kpisGenerales.maximo).corta}</td>
                        <td className="num">{formatDuracion(kpisGenerales.mediana).corta}</td>
                        <td className="num">100%</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="sd01-kpi-legend">
                  <div className="sd01-kpi-legend-item">
                    <span className="sd01-kpi-legend-dot" style={{ background: '#22c55e' }}></span> ≤ 15 min (rápido)
                  </div>
                  <div className="sd01-kpi-legend-item">
                    <span className="sd01-kpi-legend-dot" style={{ background: '#fbbf24' }}></span> 15 – 25 min (normal)
                  </div>
                  <div className="sd01-kpi-legend-item">
                    <span className="sd01-kpi-legend-dot" style={{ background: '#f87171' }}></span> ≥ 25 min (lento)
                  </div>
                </div>
              </div>
            )}

            {/* ============ TAB: DETALLE ============ */}
            {tab === 'detalle' && (
              <div className="sd01-kpi-panel rounded">
                <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Detalle de transportes finalizados</h2>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {transportesFiltrados.length} transportes · La duración se correlaciona con la cantidad de locales
                    </div>
                  </div>
                  <button className="sd01-btn" onClick={exportarDetalle}>📊 Exportar Excel</button>
                </div>
                <div className="sd01-kpi-table-wrap">
                  <table className="sd01-kpi-table">
                    <thead>
                      <tr>
                        <th>N° Transporte</th>
                        <th>Fecha Prog.</th>
                        <th>Usuario</th>
                        <th className="num">Locales</th>
                        <th className="num">Bultos</th>
                        <th>Creado</th>
                        <th>Finalizado</th>
                        <th className="num">Duración</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transportesFiltrados.slice(0, 200).map((t) => (
                        <tr key={t.id}>
                          <td className="mono">{t.id_documento}</td>
                          <td>{formatFechaCorta(t.fecha_programacion)}</td>
                          <td>{t.usuario_nombre}</td>
                          <td className="num"><span className="sd01-kpi-locales-badge">{t.cantidad_locales}</span></td>
                          <td className="num">{t.cantidad_bultos}</td>
                          <td>{formatFechaHora(t.creado_en)}</td>
                          <td>{formatFechaHora(t.finalizado_en)}</td>
                          <td className="num">
                            <span
                              className={`sd01-kpi-tiempo-bar ${getColorClase(t.duracionMs)}`}
                              style={{ width: Math.min(80, t.duracionMs / 60000 * 2) + 'px' }}
                            ></span>
                            {formatDuracion(t.duracionMs).corta}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {transportesFiltrados.length > 200 && (
                    <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                      Mostrando 200 de {transportesFiltrados.length}. Exporta a Excel para ver todos.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============ TAB: EVOLUCIÓN ============ */}
            {tab === 'evolucion' && (
              <div className="sd01-kpi-panel rounded">
                <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Evolución temporal del promedio</h2>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Duración promedio por {escalaEvolucion}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['diario', 'semanal', 'mensual'] as const).map((e) => (
                      <button
                        key={e}
                        className="sd01-btn"
                        onClick={() => setEscalaEvolucion(e)}
                        style={
                          escalaEvolucion === e
                            ? { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }
                            : {}
                        }
                      >
                        {e.charAt(0).toUpperCase() + e.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {renderGrafico()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SD01KPI;
