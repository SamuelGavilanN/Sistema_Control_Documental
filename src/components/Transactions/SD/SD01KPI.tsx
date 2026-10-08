// src/components/Transactions/SD/SD01KPI.tsx

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
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
    const soloFecha = f.includes('T') ? f.split('T')[0] : f;
    const partes = soloFecha.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return soloFecha;
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

// Comparador genérico
const comparar = (a: any, b: any, dir: 'asc' | 'desc'): number => {
  let va = a;
  let vb = b;
  if (typeof va === 'number' && typeof vb === 'number') {
    return dir === 'asc' ? va - vb : vb - va;
  }
  va = String(va ?? '').toLowerCase();
  vb = String(vb ?? '').toLowerCase();
  if (va < vb) return dir === 'asc' ? -1 : 1;
  if (va > vb) return dir === 'asc' ? 1 : -1;
  return 0;
};

// ================ MultiSelect Usuarios ================
interface MultiSelectProps {
  options: Usuario[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}

const MultiSelectUsuarios: React.FC<MultiSelectProps> = ({ options, value, onChange, placeholder, disabled }) => {
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
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
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
      {open && !disabled && (
        <div className="sd01-kpi-multiselect-dropdown">
          {options.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Sin usuarios disponibles
            </div>
          ) : (
            options.map((u) => (
              <label key={u.id} className="sd01-kpi-multiselect-item">
                <input
                  type="checkbox"
                  checked={value.includes(u.id)}
                  onChange={() => toggle(u.id)}
                />
                {u.nombre} {u.apellido}{' '}
                <span style={{ color: 'var(--text-placeholder)', fontSize: 11 }}>· {u.rol}</span>
              </label>
            ))
          )}
          <div className="sd01-kpi-multiselect-footer">
            <button type="button" onClick={() => onChange(options.map((u) => u.id))}>Todos</button>
            <button type="button" onClick={() => onChange([])}>Limpiar</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ================ Componente principal ================
interface Filtros {
  fechaDesde: string;
  fechaHasta: string;
  usuarios: string[];
}

const filtrosVacios: Filtros = { fechaDesde: '', fechaHasta: '', usuarios: [] };

const SD01KPI: React.FC<SD01KPIProps> = ({ onClose }) => {
  const [cargando, setCargando] = useState(false);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [haConsultado, setHaConsultado] = useState(false);
  const [todosTransportes, setTodosTransportes] = useState<TransporteKPI[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tab, setTab] = useState<Tab>('resumen');

  const [filtrosForm, setFiltrosForm] = useState<Filtros>(filtrosVacios);
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros>(filtrosVacios);

  // Ordenamiento tabla usuarios
  const [ordenUsuarios, setOrdenUsuarios] = useState<{ col: string; dir: 'asc' | 'desc' }>({
    col: 'cantidad',
    dir: 'desc'
  });

  // Ordenamiento tabla detalle
  const [ordenDetalle, setOrdenDetalle] = useState<{ col: string; dir: 'asc' | 'desc' }>({
    col: 'creado_en',
    dir: 'desc'
  });

  const [escalaEvolucion, setEscalaEvolucion] = useState<'diario' | 'semanal' | 'mensual'>('diario');

  // ============ Cargar usuarios disponibles (solo con al menos 1 transporte finalizado) ============
  useEffect(() => {
    const cargarUsuariosDisponibles = async () => {
      setCargandoUsuarios(true);
      try {
        const resp = await fetch(
          `${API_URL}/sd01_documentos?select=creado_por&estado=eq.Finalizado&finalizado_en=not.is.null`,
          { headers: HEADERS }
        );
        const data = await resp.json();
        const idsUnicos: string[] = Array.from(
          new Set((data || []).map((d: any) => d.creado_por).filter(Boolean))
        );

        if (idsUnicos.length > 0) {
          const usuariosData: any[] = [];
          for (const chunk of chunkArray(idsUnicos, 80)) {
            const respU = await fetch(
              `${API_URL}/usuarios?select=id,nombre,apellido,rol,usuario&id=in.(${chunk.join(',')})`,
              { headers: HEADERS }
            );
            const uData = await respU.json();
            usuariosData.push(...(uData || []));
          }
          usuariosData.sort((a, b) =>
            `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`)
          );
          setUsuarios(usuariosData);
        }
      } catch (e) {
        console.error('Error cargando usuarios disponibles:', e);
      } finally {
        setCargandoUsuarios(false);
      }
    };
    cargarUsuariosDisponibles();
  }, []);

  // ============ Ejecutar consulta con filtros en el servidor ============
  const ejecutarConsulta = useCallback(async (filtros: Filtros) => {
    setCargando(true);
    setHaConsultado(true);
    try {
      const params = new URLSearchParams();
      params.set(
        'select',
        'id,id_documento,fecha_programacion,estado,creado_por,creado_en,finalizado_en'
      );
      params.append('estado', 'eq.Finalizado');
      params.append('finalizado_en', 'not.is.null');

      if (filtros.fechaDesde) {
        params.append('creado_en', `gte.${filtros.fechaDesde}T00:00:00`);
      }
      if (filtros.fechaHasta) {
        params.append('creado_en', `lte.${filtros.fechaHasta}T23:59:59`);
      }
      if (filtros.usuarios.length > 0) {
        params.append('creado_por', `in.(${filtros.usuarios.join(',')})`);
      }

      const docsData = await fetchAllPaginado(`${API_URL}/sd01_documentos?${params.toString()}`);

      if (docsData.length === 0) {
        setTodosTransportes([]);
        setCargando(false);
        return;
      }

      const docIds: string[] = docsData.map((d: any) => d.id_documento);
      const localesData: any[] = [];
      for (const chunk of chunkArray(docIds, 80)) {
        const p = new URLSearchParams();
        p.set('select', 'id,documento_id,cantidad_solicitada');
        p.append('documento_id', `in.(${chunk.join(',')})`);
        const l = await fetchAllPaginado(`${API_URL}/sd01_documento_locales?${p.toString()}`);
        localesData.push(...l);
      }

      const uIds: string[] = Array.from(
        new Set(docsData.map((d: any) => d.creado_por).filter(Boolean))
      );
      const usuariosMap = new Map<string, Usuario>();
      for (const chunk of chunkArray(uIds, 80)) {
        const respU = await fetch(
          `${API_URL}/usuarios?select=id,nombre,apellido,rol,usuario&id=in.(${chunk.join(',')})`,
          { headers: HEADERS }
        );
        const uData = await respU.json();
        (uData || []).forEach((u: any) => usuariosMap.set(u.id, u));
      }

      const localesPorDoc = new Map<string, number>();
      const bultosPorDoc = new Map<string, number>();
      localesData.forEach((l: any) => {
        localesPorDoc.set(l.documento_id, (localesPorDoc.get(l.documento_id) || 0) + 1);
        bultosPorDoc.set(
          l.documento_id,
          (bultosPorDoc.get(l.documento_id) || 0) + (Number(l.cantidad_solicitada) || 0)
        );
      });

      const kpis: TransporteKPI[] = docsData
        .filter((d: any) => d.creado_en && d.finalizado_en)
        .map((d: any) => {
          const creado = new Date(d.creado_en).getTime();
          const finalizado = new Date(d.finalizado_en).getTime();
          const duracion = finalizado - creado;
          const u = usuariosMap.get(d.creado_por);
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
      console.error('Error en consulta KPI:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  const handleActualizar = () => {
    setFiltrosAplicados({ ...filtrosForm });
    ejecutarConsulta(filtrosForm);
  };

  useEffect(() => {
    if (!cargandoUsuarios) {
      ejecutarConsulta(filtrosVacios);
    }
  }, [cargandoUsuarios]);

  const transportesFiltrados = todosTransportes;

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
      const dir = ordenUsuarios.dir;
      switch (ordenUsuarios.col) {
        case 'nombre': return comparar(a.usuario_nombre, b.usuario_nombre, dir);
        case 'cantidad': return comparar(a.cantidad, b.cantidad, dir);
        case 'promedio': return comparar(a.promedio, b.promedio, dir);
        case 'minimo': return comparar(a.minimo, b.minimo, dir);
        case 'maximo': return comparar(a.maximo, b.maximo, dir);
        case 'mediana': return comparar(a.mediana, b.mediana, dir);
        case 'locales': return comparar(a.promLocales, b.promLocales, dir);
        case 'porcentaje': return comparar(a.porcentaje, b.porcentaje, dir);
        default: return 0;
      }
    });

    return stats;
  }, [transportesFiltrados, kpisGenerales.total, ordenUsuarios]);

  // ============ Detalle transportes ordenado ============
  const transportesDetalleOrdenados = useMemo(() => {
    const copia = [...transportesFiltrados];
    copia.sort((a, b) => {
      const dir = ordenDetalle.dir;
      switch (ordenDetalle.col) {
        case 'id_documento': return comparar(a.id_documento, b.id_documento, dir);
        case 'fecha_programacion': return comparar(a.fecha_programacion, b.fecha_programacion, dir);
        case 'usuario': return comparar(a.usuario_nombre, b.usuario_nombre, dir);
        case 'cantidad_locales': return comparar(a.cantidad_locales, b.cantidad_locales, dir);
        case 'cantidad_bultos': return comparar(a.cantidad_bultos, b.cantidad_bultos, dir);
        case 'creado_en': return comparar(a.creado_en, b.creado_en, dir);
        case 'finalizado_en': return comparar(a.finalizado_en, b.finalizado_en, dir);
        case 'duracionMs': return comparar(a.duracionMs, b.duracionMs, dir);
        default: return 0;
      }
    });
    return copia;
  }, [transportesFiltrados, ordenDetalle]);

  // ============ Evolución ============
  const evolucion = useMemo(() => {
    const agrupado = new Map<string, number[]>();
    transportesFiltrados.forEach((t) => {
      let key: string;
      const d = new Date(t.creado_en);
      if (escalaEvolucion === 'diario') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
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

    return Array.from(agrupado.entries())
      .map(([key, duraciones]) => ({
        key,
        promedio: duraciones.reduce((s, d) => s + d, 0) / duraciones.length,
        cantidad: duraciones.length
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [transportesFiltrados, escalaEvolucion]);

  // ============ Exportaciones ============
  const exportarUsuarios = () => {
    const headers = [
      'Usuario', 'Rol', 'Transportes', 'Locales prom.', 'Promedio',
      'Mínimo', 'Máximo', 'Mediana', '% del Total'
    ];
    const rows = statsUsuarios.map((u) => [
      u.usuario_nombre, u.usuario_rol, u.cantidad, u.promLocales.toFixed(1),
      formatDuracion(u.promedio).texto, formatDuracion(u.minimo).texto,
      formatDuracion(u.maximo).texto, formatDuracion(u.mediana).texto,
      `${u.porcentaje.toFixed(1)}%`
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KPI Usuarios');
    XLSX.writeFile(wb, `KPI_Usuarios_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportarDetalle = () => {
    const headers = [
      'N° Transporte', 'Fecha Prog.', 'Usuario', 'Creado', 'Finalizado',
      'Duración (ms)', 'Duración', 'Locales', 'Bultos'
    ];
    const rows = transportesDetalleOrdenados.map((t) => [
      t.id_documento, t.fecha_programacion.slice(0, 10), t.usuario_nombre,
      t.creado_en, t.finalizado_en, t.duracionMs,
      formatDuracion(t.duracionMs).texto, t.cantidad_locales, t.cantidad_bultos
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle');
    XLSX.writeFile(wb, `KPI_Detalle_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ============ Cambio de orden ============
  const cambiarOrdenUsuarios = (col: string) => {
    setOrdenUsuarios((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' }
    );
  };

  const cambiarOrdenDetalle = (col: string) => {
    setOrdenDetalle((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' }
    );
  };

  const indicadorUsuarios = (col: string) =>
    ordenUsuarios.col === col ? (ordenUsuarios.dir === 'asc' ? ' ▲' : ' ▼') : '';

  const indicadorDetalle = (col: string) =>
    ordenDetalle.col === col ? (ordenDetalle.dir === 'asc' ? ' ▲' : ' ▼') : '';

  // ============ Gráfico ============
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
            <div className="value" style={{
              color: (() => {
                if (evolucion.length < 2) return 'var(--text-primary)';
                const first = evolucion.slice(0, Math.ceil(evolucion.length / 3));
                const last = evolucion.slice(-Math.ceil(evolucion.length / 3));
                const avgFirst = first.reduce((s, p) => s + p.promedio, 0) / first.length;
                const avgLast = last.reduce((s, p) => s + p.promedio, 0) / last.length;
                return avgLast < avgFirst ? '#22c55e' : avgLast > avgFirst ? '#f87171' : 'var(--text-primary)';
              })()
            }}>
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
              ±{' '}
              {formatDuracion(
                Math.max(...evolucion.map((p) => p.promedio)) -
                  Math.min(...evolucion.map((p) => p.promedio))
              ).corta}
            </div>
          </div>
        </div>
      </>
    );
  };

  // ============ Chips filtros activos ============
  const filtrosActivos = useMemo(() => {
    const chips: string[] = [];
    if (filtrosAplicados.fechaDesde || filtrosAplicados.fechaHasta) {
      chips.push(
        `🗓️ Creado ${filtrosAplicados.fechaDesde || '...'} → ${filtrosAplicados.fechaHasta || '...'}`
      );
    }
    if (filtrosAplicados.usuarios.length > 0) {
      const nombres = usuarios
        .filter((u) => filtrosAplicados.usuarios.includes(u.id))
        .map((u) => `${u.nombre} ${u.apellido}`);
      chips.push(`👤 ${nombres.length === 1 ? nombres[0] : `${nombres.length} usuarios`}`);
    }
    return chips;
  }, [filtrosAplicados, usuarios]);

  return (
    <div className="sd01-kpi-container">
      <div className="sd01-kpi-header">
        <div className="sd01-kpi-header-left">
          <h1>KPI de Transportes</h1>
          <p>Métricas de tiempos de ciclo desde la creación hasta la finalización</p>
        </div>
        <div className="sd01-kpi-header-actions">
          <button className="sd01-kpi-btn" onClick={onClose}>← Volver a SD01</button>
        </div>
      </div>

      <div className="sd01-kpi-note">
        ℹ️ Tiempos medidos desde <strong>creado_en</strong> hasta <strong>finalizado_en</strong>. Solo transportes <strong>Finalizados</strong>. El filtro de fechas aplica sobre la <strong>fecha de creación</strong> del transporte.
        <br />
        ⚠️ Los filtros se aplican al presionar <strong>Actualizar</strong>.
      </div>

      <div className="sd01-kpi-filters">
        <div className="sd01-kpi-filters-grid">
          <div className="sd01-kpi-filter-row">
            <label>Fecha creación desde</label>
            <input
              type="date"
              value={filtrosForm.fechaDesde}
              onChange={(e) => setFiltrosForm({ ...filtrosForm, fechaDesde: e.target.value })}
            />
          </div>
          <div className="sd01-kpi-filter-row">
            <label>Fecha creación hasta</label>
            <input
              type="date"
              value={filtrosForm.fechaHasta}
              onChange={(e) => setFiltrosForm({ ...filtrosForm, fechaHasta: e.target.value })}
            />
          </div>
          <div className="sd01-kpi-filter-row">
            <label>Usuarios a medir</label>
            <MultiSelectUsuarios
              options={usuarios}
              value={filtrosForm.usuarios}
              onChange={(v) => setFiltrosForm({ ...filtrosForm, usuarios: v })}
              placeholder={cargandoUsuarios ? 'Cargando...' : 'Todos los usuarios'}
              disabled={cargandoUsuarios}
            />
          </div>
          <div className="sd01-kpi-filter-row">
            <label>&nbsp;</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="sd01-kpi-btn sd01-kpi-btn-primary"
                onClick={handleActualizar}
                disabled={cargando}
                style={{ flex: 1 }}
              >
                {cargando ? '⏳ Consultando...' : '🔄 Actualizar'}
              </button>
              <button
                className="sd01-kpi-btn"
                onClick={() => {
                  setFiltrosForm(filtrosVacios);
                  setFiltrosAplicados(filtrosVacios);
                  ejecutarConsulta(filtrosVacios);
                }}
                disabled={cargando}
              >
                🧹 Limpiar
              </button>
            </div>
          </div>
        </div>

        {filtrosActivos.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Filtros activos
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {filtrosActivos.map((c, i) => (
                <span key={i} className="sd01-kpi-multiselect-chip">{c}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sd01-kpi-tabs">
        <button className={`sd01-kpi-tab ${tab === 'resumen' ? 'active' : ''}`} onClick={() => setTab('resumen')}>
          Resumen General
        </button>
        <button className={`sd01-kpi-tab ${tab === 'usuarios' ? 'active' : ''}`} onClick={() => setTab('usuarios')}>
          Por Usuario <span className="count">{statsUsuarios.length}</span>
        </button>
        <button className={`sd01-kpi-tab ${tab === 'detalle' ? 'active' : ''}`} onClick={() => setTab('detalle')}>
          Detalle Transportes <span className="count">{transportesFiltrados.length}</span>
        </button>
        <button className={`sd01-kpi-tab ${tab === 'evolucion' ? 'active' : ''}`} onClick={() => setTab('evolucion')}>
          Evolución Temporal
        </button>
      </div>

      {cargando && !haConsultado ? (
        <div className="sd01-kpi-panel">
          <div className="sd01-kpi-loading">Consultando datos...</div>
        </div>
      ) : transportesFiltrados.length === 0 ? (
        <div className="sd01-kpi-panel">
          <div className="sd01-kpi-empty">
            No hay transportes finalizados con los filtros aplicados.
          </div>
        </div>
      ) : (
        <>
          {tab === 'resumen' && (
            <div className="sd01-kpi-panel">
              <div className="sd01-kpi-grid">
                <div className="sd01-kpi-card">
                  <div className="sd01-kpi-label">Transportes Finalizados</div>
                  <div className="sd01-kpi-value">{kpisGenerales.total}</div>
                  <div className="sd01-kpi-sub">
                    {filtrosAplicados.fechaDesde || filtrosAplicados.fechaHasta
                      ? `${filtrosAplicados.fechaDesde || '...'} → ${filtrosAplicados.fechaHasta || '...'}`
                      : 'Todos los periodos'}
                  </div>
                </div>
                <div className="sd01-kpi-card success">
                  <div className="sd01-kpi-label">Tiempo Promedio</div>
                  <div className="sd01-kpi-value">{formatDuracion(kpisGenerales.promedio).corta}</div>
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

          {tab === 'usuarios' && (
            <div className="sd01-kpi-panel rounded">
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Estadísticas por usuario</h2>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Clic en cualquier encabezado para ordenar · "Locales prom." ayuda a interpretar el tiempo
                  </div>
                </div>
                <button className="sd01-kpi-btn" onClick={exportarUsuarios}>📊 Exportar Excel</button>
              </div>
              <div className="sd01-kpi-table-wrap">
                <table className="sd01-kpi-table">
                  <thead>
                    <tr>
                      <th onClick={() => cambiarOrdenUsuarios('nombre')}>Usuario{indicadorUsuarios('nombre')}</th>
                      <th className="num" onClick={() => cambiarOrdenUsuarios('cantidad')}>Transportes{indicadorUsuarios('cantidad')}</th>
                      <th className="num" onClick={() => cambiarOrdenUsuarios('locales')}>Locales prom.{indicadorUsuarios('locales')}</th>
                      <th className="num" onClick={() => cambiarOrdenUsuarios('promedio')}>Promedio{indicadorUsuarios('promedio')}</th>
                      <th className="num" onClick={() => cambiarOrdenUsuarios('minimo')}>Mínimo{indicadorUsuarios('minimo')}</th>
                      <th className="num" onClick={() => cambiarOrdenUsuarios('maximo')}>Máximo{indicadorUsuarios('maximo')}</th>
                      <th className="num" onClick={() => cambiarOrdenUsuarios('mediana')}>Mediana{indicadorUsuarios('mediana')}</th>
                      <th className="num" onClick={() => cambiarOrdenUsuarios('porcentaje')}>% del Total{indicadorUsuarios('porcentaje')}</th>
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
                            style={{ width: Math.min(100, (u.promedio / 60000) * 2) + 'px' }}
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

          {tab === 'detalle' && (
            <div className="sd01-kpi-panel rounded">
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Detalle de transportes finalizados</h2>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {transportesFiltrados.length} transportes · Clic en cualquier encabezado para ordenar
                  </div>
                </div>
                <button className="sd01-kpi-btn" onClick={exportarDetalle}>📊 Exportar Excel</button>
              </div>
              <div className="sd01-kpi-table-wrap">
                <table className="sd01-kpi-table">
                  <thead>
                    <tr>
                      <th onClick={() => cambiarOrdenDetalle('id_documento')}>N° Transporte{indicadorDetalle('id_documento')}</th>
                      <th onClick={() => cambiarOrdenDetalle('fecha_programacion')}>Fecha Prog.{indicadorDetalle('fecha_programacion')}</th>
                      <th onClick={() => cambiarOrdenDetalle('usuario')}>Usuario{indicadorDetalle('usuario')}</th>
                      <th className="num" onClick={() => cambiarOrdenDetalle('cantidad_locales')}>Locales{indicadorDetalle('cantidad_locales')}</th>
                      <th className="num" onClick={() => cambiarOrdenDetalle('cantidad_bultos')}>Bultos{indicadorDetalle('cantidad_bultos')}</th>
                      <th onClick={() => cambiarOrdenDetalle('creado_en')}>Creado{indicadorDetalle('creado_en')}</th>
                      <th onClick={() => cambiarOrdenDetalle('finalizado_en')}>Finalizado{indicadorDetalle('finalizado_en')}</th>
                      <th className="num" onClick={() => cambiarOrdenDetalle('duracionMs')}>Duración{indicadorDetalle('duracionMs')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transportesDetalleOrdenados.slice(0, 200).map((t) => (
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
                            style={{ width: Math.min(80, (t.duracionMs / 60000) * 2) + 'px' }}
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

          {tab === 'evolucion' && (
            <div className="sd01-kpi-panel rounded">
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Evolución temporal del promedio</h2>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Duración promedio por {escalaEvolucion} (agrupado por fecha de creación)
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['diario', 'semanal', 'mensual'] as const).map((e) => (
                    <button
                      key={e}
                      className="sd01-kpi-btn"
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
  );
};

export default SD01KPI;
