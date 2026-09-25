// src/components/Transactions/SD/SD08Consultor.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import './SD08.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  apikey: 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  Authorization: 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const PAGE_SIZE = 50;
const FETCH_PAGE = 1000;

type Vista = 'transportes' | 'locales' | 'bultos';

interface Filtros {
  fechaProgramacion: string;
  numeroTransporte: string;
  conductor: string;
  patente: string;
  codigoLocal: string;
  sello: string;
  numeroDocumento: string;
  estado: string;
  origenes: string[];
  tiposDoc: string[];
  bultosMin: string;
  bultosMax: string;
}

const filtrosIniciales: Filtros = {
  fechaProgramacion: '',
  numeroTransporte: '',
  conductor: '',
  patente: '',
  codigoLocal: '',
  sello: '',
  numeroDocumento: '',
  estado: 'Todos',
  origenes: [],
  tiposDoc: [],
  bultosMin: '',
  bultosMax: ''
};

const ORIGENES_DISPONIBLES = [
  'CD01 Fashions-Park',
  'CD16 Bodegas San Francisco',
  'OUT1 Outlet San Francisco',
  'OUT2 Outlet Lampa',
  'OUT3 Redestinacion',
  'CD12 Bodega Lampa',
  'CD30 Bodega HC',
  'CD31 Bodega AGV',
  'C144 Tiendas sin Bodega',
  'PV01 Primavera-Verano 2025',
  'MZ01 Pedido Mezclilla',
  'SG01 Internet',
  'SG02 Insumos',
  'SG03 Traspasos',
  'SG04 Valija',
  'SG05 Bultos Regularizar Stock',
  'SG06 Bultos Quedados en Camion'
];

const TIPOS_DOC_DISPONIBLES = ['Sap', 'Vtradex', 'Guia', 'No aplica'];

const formatNumber = (n: number): string => (n || 0).toLocaleString('es-CL');
const formatFecha = (f: string): string => {
  if (!f) return '-';
  const soloFecha = f.includes('T') ? f.split('T')[0] : f;
  const p = soloFecha.split('-');
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  return soloFecha;
};
const formatFechaHora = (f: string): string => {
  if (!f) return '-';
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return f;
    return `${d.toLocaleDateString('es-CL')} ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return f; }
};
const normalizar = (t: any): string =>
  String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const contieneTexto = (valor: any, query: string): boolean =>
  normalizar(valor).includes(normalizar(query));

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

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

// ============ MultiSelectDropdown (rediseñado) ============
interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}

const MultiSelectDropdown: React.FC<MultiSelectProps> = ({ options, value, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setBusqueda('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  const quitar = (opt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== opt));
  };

  const filtradas = useMemo(() => {
    if (!busqueda.trim()) return options;
    const q = normalizar(busqueda);
    return options.filter((o) => normalizar(o).includes(q));
  }, [options, busqueda]);

  // Máximo de chips visibles dentro del trigger
  const MAX_CHIPS = 2;
  const visibles = value.slice(0, MAX_CHIPS);
  const restantes = value.length - visibles.length;

  return (
    <div className="sd08-multiselect" ref={wrapperRef}>
      <button
        type="button"
        className={`sd08-multiselect-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        {value.length === 0 ? (
          <span className="sd08-multiselect-placeholder">{placeholder}</span>
        ) : (
          <span className="sd08-multiselect-chips">
            {visibles.map((v) => (
              <span key={v} className="sd08-multiselect-chip">
                {v}
                <span className="x" onClick={(e) => quitar(v, e)}>×</span>
              </span>
            ))}
            {restantes > 0 && (
              <span className="sd08-multiselect-more">+{restantes}</span>
            )}
          </span>
        )}
        <span className="sd08-multiselect-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="sd08-multiselect-dropdown">
          {options.length > 6 && (
            <div className="sd08-multiselect-search">
              <input
                type="text"
                placeholder="Buscar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                autoFocus
              />
            </div>
          )}
          <div className="sd08-multiselect-list">
            {filtradas.length === 0 ? (
              <div className="sd08-multiselect-empty">Sin resultados</div>
            ) : (
              filtradas.map((opt) => (
                <label
                  key={opt}
                  className={`sd08-multiselect-item ${value.includes(opt) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(opt)}
                    onChange={() => toggle(opt)}
                  />
                  {opt}
                </label>
              ))
            )}
          </div>
          <div className="sd08-multiselect-footer">
            <button type="button" onClick={() => onChange(options)}>Seleccionar todo</button>
            <button type="button" onClick={() => onChange([])}>Limpiar</button>
          </div>
        </div>
      )}
    </div>
  );
};

interface SavedQuery { nombre: string; filtros: Filtros; }

const SD08Consultor: React.FC = () => {
  const [conductores, setConductores] = useState<any[]>([]);
  const [patentes, setPatentes] = useState<any[]>([]);
  const [conductoresMap, setConductoresMap] = useState<Map<string, any>>(new Map());
  const [patentesMap, setPatentesMap] = useState<Map<string, any>>(new Map());

  const [transportes, setTransportes] = useState<any[]>([]);
  const [locales, setLocales] = useState<any[]>([]);
  const [bultos, setBultos] = useState<any[]>([]);

  const [consultando, setConsultando] = useState(false);
  const [haConsultado, setHaConsultado] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });

  const [filtrosForm, setFiltrosForm] = useState<Filtros>(filtrosIniciales);
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros>(filtrosIniciales);

  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [vista, setVista] = useState<Vista>('transportes');
  const [pagina, setPagina] = useState(1);
  const [paginaSize, setPaginaSize] = useState(PAGE_SIZE);
  const [ordenColumna, setOrdenColumna] = useState<string>('fecha_programacion');
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('desc');

  const [columnasTransportes, setColumnasTransportes] = useState<string[]>([
    'id_documento', 'fecha_programacion', 'conductor', 'rut', 'patente', 'locales', 'bultos', 'estado', 'creado_por', 'creado_en'
  ]);
  const [columnasLocales, setColumnasLocales] = useState<string[]>([
    'id_documento', 'fecha_programacion', 'codigo_local', 'nombre_local', 'fecha_entrega', 'hora_entrega', 'conductor', 'patente', 'sello_trasero', 'cantidad_pallet', 'bultos'
  ]);
  const [columnasBultos, setColumnasBultos] = useState<string[]>([
    'id_documento', 'fecha_programacion', 'codigo_local', 'origen_carga', 'tipo_documento', 'numero_documento', 'cantidad', 'observacion'
  ]);
  const [mostrarColumnas, setMostrarColumnas] = useState(false);

  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [nombreConsulta, setNombreConsulta] = useState('');

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sd08_saved_queries');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Compatibilidad con consultas antiguas que tenían fechaDesde/fechaHasta
        const migradas = parsed.map((q: any) => ({
          ...q,
          filtros: {
            ...filtrosIniciales,
            ...q.filtros,
            fechaProgramacion: q.filtros?.fechaProgramacion || q.filtros?.fechaDesde || ''
          }
        }));
        setSavedQueries(migradas);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [c, p] = await Promise.all([
          fetchAllPaginado(`${API_URL}/conductores?select=*`),
          fetchAllPaginado(`${API_URL}/patentes?select=*`)
        ]);
        setConductores(c);
        setPatentes(p);
        const cm = new Map<string, any>();
        c.forEach((x: any) => cm.set(x.id, x));
        setConductoresMap(cm);
        const pm = new Map<string, any>();
        p.forEach((x: any) => pm.set(x.id, x));
        setPatentesMap(pm);
      } catch (e) {
        console.error('Error cargando catálogos:', e);
      }
    };
    cargarCatalogos();
  }, []);

  const getConductorNombre = useCallback((doc: any) => {
    const c = conductoresMap.get(doc?.conductor_id);
    return c ? `${c.nombre} ${c.apellido}` : '-';
  }, [conductoresMap]);

  const getConductorRut = useCallback((doc: any) => {
    const c = conductoresMap.get(doc?.conductor_id);
    return c?.numero_documento || '-';
  }, [conductoresMap]);

  const getPatente = useCallback((doc: any, adicional = false) => {
    const id = adicional ? doc?.patente_adicional_id : doc?.patente_principal_id;
    if (!id) return '';
    const p = patentesMap.get(id);
    return p?.numero_patente || '';
  }, [patentesMap]);

  // ===============================
  // CONSULTA BAJO DEMANDA
  // ===============================
  const ejecutarConsulta = async (f: Filtros) => {
    setConsultando(true);
    setHaConsultado(true);
    try {
      let conductorIdsFiltro: string[] | null = null;
      if (f.conductor.trim()) {
        const q = normalizar(f.conductor);
        conductorIdsFiltro = conductores.filter((c) => normalizar(`${c.nombre} ${c.apellido}`).includes(q)).map((c) => c.id);
        if (conductorIdsFiltro.length === 0) {
          setTransportes([]); setLocales([]); setBultos([]);
          setFiltrosAplicados({ ...f });
          setConsultando(false);
          mostrarMensaje('info', 'No hay conductores que coincidan con la búsqueda');
          return;
        }
      }
      let patenteIdsFiltro: string[] | null = null;
      if (f.patente.trim()) {
        const q = normalizar(f.patente);
        patenteIdsFiltro = patentes.filter((p) => normalizar(p.numero_patente).includes(q)).map((p) => p.id);
        if (patenteIdsFiltro.length === 0) {
          setTransportes([]); setLocales([]); setBultos([]);
          setFiltrosAplicados({ ...f });
          setConsultando(false);
          mostrarMensaje('info', 'No hay patentes que coincidan con la búsqueda');
          return;
        }
      }

      const paramsDoc = new URLSearchParams();
      paramsDoc.set('select', '*');
      // Fecha única: mismo día en desde y hasta
      if (f.fechaProgramacion) {
        paramsDoc.append('fecha_programacion', `gte.${f.fechaProgramacion}T00:00:00`);
        paramsDoc.append('fecha_programacion', `lte.${f.fechaProgramacion}T23:59:59`);
      }
      if (f.numeroTransporte) paramsDoc.append('id_documento', `ilike.*${f.numeroTransporte}*`);
      if (f.estado && f.estado !== 'Todos') paramsDoc.append('estado', `eq.${f.estado}`);
      if (f.sello) {
        paramsDoc.append('or', `(sello_lateral.ilike.*${f.sello}*,sello_adicional.ilike.*${f.sello}*)`);
      }
      if (conductorIdsFiltro) {
        paramsDoc.append('conductor_id', `in.(${conductorIdsFiltro.join(',')})`);
      }
      if (patenteIdsFiltro) {
        paramsDoc.append('or', `(patente_principal_id.in.(${patenteIdsFiltro.join(',')}),patente_adicional_id.in.(${patenteIdsFiltro.join(',')}))`);
      }

      const docs = await fetchAllPaginado(`${API_URL}/sd01_documentos?${paramsDoc.toString()}`);
      if (docs.length === 0) {
        setTransportes([]); setLocales([]); setBultos([]);
        setFiltrosAplicados({ ...f });
        setConsultando(false);
        mostrarMensaje('info', 'No se encontraron transportes con esos filtros');
        return;
      }
      const docIds = docs.map((d) => d.id_documento);

      const localesChunks: any[] = [];
      for (const chunk of chunkArray(docIds, 80)) {
        const p = new URLSearchParams();
        p.set('select', '*');
        p.append('documento_id', `in.(${chunk.join(',')})`);
        if (f.codigoLocal) p.append('codigo_local', `ilike.*${f.codigoLocal}*`);
        const l = await fetchAllPaginado(`${API_URL}/sd01_documento_locales?${p.toString()}`);
        localesChunks.push(...l);
      }
      const locs = localesChunks;

      let bults: any[] = [];
      if (locs.length > 0) {
        const locIds = locs.map((l) => l.id);
        const tieneFiltrosBulto = f.origenes.length > 0 || f.tiposDoc.length > 0 || !!f.numeroDocumento || !!f.bultosMin || !!f.bultosMax;

        for (const chunk of chunkArray(locIds, 80)) {
          const p = new URLSearchParams();
          p.set('select', '*');
          p.append('local_id', `in.(${chunk.join(',')})`);
          if (f.origenes.length > 0) p.append('origen_carga', `in.(${f.origenes.map((o) => `"${o}"`).join(',')})`);
          if (f.tiposDoc.length > 0) {
            const tiposConValor = f.tiposDoc.filter((t) => t !== 'No aplica');
            const incluyeNA = f.tiposDoc.includes('No aplica');
            const orParts: string[] = [];
            if (tiposConValor.length > 0) orParts.push(`tipo_documento.in.(${tiposConValor.join(',')})`);
            if (incluyeNA) { orParts.push(`tipo_documento.is.null`); orParts.push(`tipo_documento.eq.`); }
            p.append('or', `(${orParts.join(',')})`);
          }
          if (f.numeroDocumento) p.append('numero_documento', `ilike.*${f.numeroDocumento}*`);
          if (f.bultosMin) p.append('cantidad', `gte.${f.bultosMin}`);
          if (f.bultosMax) p.append('cantidad', `lte.${f.bultosMax}`);
          const b = await fetchAllPaginado(`${API_URL}/sd01_bultos?${p.toString()}`);
          bults.push(...b);
        }

        if (tieneFiltrosBulto) {
          const locIdsConBulto = new Set(bults.map((b) => b.local_id));
          const locsFiltrados = locs.filter((l) => locIdsConBulto.has(l.id));
          const docIdsConLocal = new Set(locsFiltrados.map((l) => l.documento_id));
          const docsFiltrados = docs.filter((d) => docIdsConLocal.has(d.id_documento));
          setTransportes(docsFiltrados);
          setLocales(locsFiltrados);
          setBultos(bults);
        } else {
          setTransportes(docs);
          setLocales(locs);
          setBultos(bults);
        }
      } else {
        setTransportes(docs);
        setLocales([]);
        setBultos([]);
      }

      setFiltrosAplicados({ ...f });
      setPagina(1);
    } catch (e) {
      console.error('Error en consulta SD08:', e);
      mostrarMensaje('error', 'Error al consultar: ' + (e as Error).message);
    } finally {
      setConsultando(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltrosForm(filtrosIniciales);
    setFiltrosAplicados(filtrosIniciales);
    setTransportes([]);
    setLocales([]);
    setBultos([]);
    setHaConsultado(false);
    setPagina(1);
  };

  const quitarFiltro = (campo: keyof Filtros, valor?: string) => {
    const nuevo = { ...filtrosAplicados };
    if (campo === 'origenes' && valor) nuevo.origenes = nuevo.origenes.filter((o) => o !== valor);
    else if (campo === 'tiposDoc' && valor) nuevo.tiposDoc = nuevo.tiposDoc.filter((t) => t !== valor);
    else if (campo === 'bultosMin' || campo === 'bultosMax') { nuevo.bultosMin = ''; nuevo.bultosMax = ''; }
    else if (campo === 'estado') nuevo.estado = 'Todos';
    else (nuevo as any)[campo] = '';

    setFiltrosForm(nuevo);
    if (haConsultado) {
      setTimeout(() => { ejecutarConsulta(nuevo); }, 0);
    } else {
      setFiltrosAplicados(nuevo);
    }
  };

  const filasTransportes = useMemo(() => {
    return transportes.map((doc) => {
      const localesDelDoc = locales.filter((l) => l.documento_id === doc.id_documento);
      const locIds = new Set(localesDelDoc.map((l) => l.id));
      const bultosDelDoc = bultos.filter((b) => locIds.has(b.local_id));
      const totalBultos = bultosDelDoc.reduce((s, b) => s + (b.cantidad || 0), 0);
      return {
        ...doc,
        _id: doc.id,
        _conductor: getConductorNombre(doc),
        _rut: getConductorRut(doc),
        _patente: getPatente(doc),
        _patenteAdicional: getPatente(doc, true),
        _localesCount: localesDelDoc.length,
        _bultosCount: totalBultos,
        _fechaFormato: formatFecha(doc.fecha_programacion),
        _fechaHora: formatFechaHora(doc.creado_en)
      };
    });
  }, [transportes, locales, bultos, getConductorNombre, getConductorRut, getPatente]);

  const filasLocales = useMemo(() => {
    const docMap = new Map(transportes.map((d) => [d.id_documento, d]));
    return locales
      .filter((loc) => docMap.has(loc.documento_id))
      .map((loc) => {
        const doc = docMap.get(loc.documento_id);
        const bultosDelLocal = bultos.filter((b) => b.local_id === loc.id);
        const totalBultos = bultosDelLocal.reduce((s, b) => s + (b.cantidad || 0), 0);
        return {
          ...loc,
          _id: loc.id,
          _id_documento: loc.documento_id,
          _fecha_programacion: doc ? formatFecha(doc.fecha_programacion) : '-',
          _conductor: doc ? getConductorNombre(doc) : '-',
          _patente: doc ? getPatente(doc) : '-',
          _bultosCount: totalBultos,
          _fecha_entrega_fmt: formatFecha(loc.fecha_entrega)
        };
      });
  }, [locales, transportes, bultos, getConductorNombre, getPatente]);

  const filasBultos = useMemo(() => {
    const localMap = new Map(locales.map((l) => [l.id, l]));
    const docMap = new Map(transportes.map((d) => [d.id_documento, d]));
    return bultos.map((b) => {
      const local = localMap.get(b.local_id);
      const doc = local ? docMap.get(local.documento_id) : null;
      return {
        ...b,
        _id: b.id,
        _codigo_local: local?.codigo_local || '-',
        _id_documento: local?.documento_id || '-',
        _fecha_programacion: doc ? formatFecha(doc.fecha_programacion) : '-'
      };
    });
  }, [bultos, locales, transportes]);

  const ordenarFilas = useCallback((filas: any[], columna: string, direccion: 'asc' | 'desc') => {
    const copia = [...filas];
    copia.sort((a, b) => {
      let va: any = a[columna] ?? a[`_${columna}`] ?? '';
      let vb: any = b[columna] ?? b[`_${columna}`] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return direccion === 'asc' ? va - vb : vb - va;
      }
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
      if (va < vb) return direccion === 'asc' ? -1 : 1;
      if (va > vb) return direccion === 'asc' ? 1 : -1;
      return 0;
    });
    return copia;
  }, []);

  const filasActuales = useMemo(() => {
    const base = vista === 'transportes' ? filasTransportes : vista === 'locales' ? filasLocales : filasBultos;
    return ordenarFilas(base, ordenColumna, ordenDireccion);
  }, [vista, filasTransportes, filasLocales, filasBultos, ordenColumna, ordenDireccion, ordenarFilas]);

  const totalPaginas = Math.max(1, Math.ceil(filasActuales.length / paginaSize));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filasPaginadas = filasActuales.slice((paginaActual - 1) * paginaSize, paginaActual * paginaSize);

  useEffect(() => { setPagina(1); }, [vista, filtrosAplicados, paginaSize]);

  const cambiarOrden = (col: string) => {
    if (ordenColumna === col) setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
    else { setOrdenColumna(col); setOrdenDireccion('asc'); }
  };

  const indicador = (col: string) => ordenColumna === col ? (ordenDireccion === 'asc' ? ' ▲' : ' ▼') : '';

  const filtrosActivos = useMemo(() => {
    const f = filtrosAplicados;
    const chips: { label: string; quitar: () => void }[] = [];
    if (f.fechaProgramacion) chips.push({ label: `📅 ${formatFecha(f.fechaProgramacion)}`, quitar: () => quitarFiltro('fechaProgramacion') });
    if (f.numeroTransporte) chips.push({ label: `🚚 ${f.numeroTransporte}`, quitar: () => quitarFiltro('numeroTransporte') });
    if (f.conductor) chips.push({ label: `👤 ${f.conductor}`, quitar: () => quitarFiltro('conductor') });
    if (f.patente) chips.push({ label: `🚛 ${f.patente}`, quitar: () => quitarFiltro('patente') });
    if (f.codigoLocal) chips.push({ label: `🏬 ${f.codigoLocal}`, quitar: () => quitarFiltro('codigoLocal') });
    if (f.sello) chips.push({ label: `🔖 ${f.sello}`, quitar: () => quitarFiltro('sello') });
    if (f.numeroDocumento) chips.push({ label: `📄 ${f.numeroDocumento}`, quitar: () => quitarFiltro('numeroDocumento') });
    if (f.estado && f.estado !== 'Todos') chips.push({ label: `⚙️ ${f.estado}`, quitar: () => quitarFiltro('estado') });
    f.origenes.forEach((o) => chips.push({ label: `📦 ${o}`, quitar: () => quitarFiltro('origenes', o) }));
    f.tiposDoc.forEach((t) => chips.push({ label: `📑 ${t}`, quitar: () => quitarFiltro('tiposDoc', t) }));
    if (f.bultosMin || f.bultosMax) chips.push({ label: `🔢 ${f.bultosMin || '0'} - ${f.bultosMax || '∞'}`, quitar: () => quitarFiltro('bultosMin') });
    return chips;
  }, [filtrosAplicados]);

  const exportarExcel = () => {
    if (filasActuales.length === 0) {
      mostrarMensaje('warning', 'No hay datos para exportar');
      return;
    }
    let headers: string[] = [];
    let rows: any[][] = [];
    if (vista === 'transportes') {
      headers = ['N° Transporte', 'Fecha Prog.', 'Conductor', 'RUT', 'Patente', 'Patente Adicional', 'Locales', 'Bultos', 'Estado', 'Creado Por', 'Creado En'];
      rows = filasActuales.map((t: any) => [t.id_documento, t._fechaFormato, t._conductor, t._rut, t._patente, t._patenteAdicional, t._localesCount, t._bultosCount, t.estado, t.creado_por || '-', t._fechaHora]);
    } else if (vista === 'locales') {
      headers = ['N° Transporte', 'Fecha Prog.', 'Código Local', 'Nombre Local', 'Fecha Entrega', 'Hora Entrega', 'Conductor', 'Patente', 'Sello Trasero', 'Cant. Pallet', 'Bultos'];
      rows = filasActuales.map((l: any) => [l._id_documento, l._fecha_programacion, l.codigo_local, l.nombre_local, l._fecha_entrega_fmt, l.hora_entrega || '-', l._conductor, l._patente, l.sello_trasero || '-', l.cantidad_pallet || 0, l._bultosCount]);
    } else {
      headers = ['N° Transporte', 'Fecha Prog.', 'Código Local', 'Origen', 'Tipo Doc', 'N° Documento', 'Cantidad', 'Observación'];
      rows = filasActuales.map((b: any) => [b._id_documento, b._fecha_programacion, b._codigo_local, b.origen_carga, b.tipo_documento || '-', b.numero_documento || '-', b.cantidad, b.observacion || '-']);
    }
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `SD08 ${vista}`);
    XLSX.writeFile(wb, `SD08_${vista}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    mostrarMensaje('success', 'Excel exportado');
  };

  const guardarConsulta = () => {
    if (!nombreConsulta.trim()) { mostrarMensaje('warning', 'Ingresa un nombre'); return; }
    const nuevas = [...savedQueries.filter((q) => q.nombre !== nombreConsulta), { nombre: nombreConsulta, filtros: filtrosAplicados }];
    setSavedQueries(nuevas);
    localStorage.setItem('sd08_saved_queries', JSON.stringify(nuevas));
    setNombreConsulta('');
    setShowSaveModal(false);
    mostrarMensaje('success', 'Consulta guardada');
  };

  const cargarConsulta = (q: SavedQuery) => {
    setFiltrosForm(q.filtros);
    setShowLoadModal(false);
    ejecutarConsulta(q.filtros);
    mostrarMensaje('info', `Consulta "${q.nombre}" cargada`);
  };

  const eliminarConsulta = (nombre: string) => {
    const nuevas = savedQueries.filter((q) => q.nombre !== nombre);
    setSavedQueries(nuevas);
    localStorage.setItem('sd08_saved_queries', JSON.stringify(nuevas));
  };

  const columnasDisponiblesTransportes = [
    { id: 'id_documento', label: 'N° Transporte' },
    { id: 'fecha_programacion', label: 'Fecha Programación' },
    { id: 'conductor', label: 'Conductor' },
    { id: 'rut', label: 'RUT' },
    { id: 'patente', label: 'Patente' },
    { id: 'patenteAdicional', label: 'Patente Adicional' },
    { id: 'locales', label: 'Locales' },
    { id: 'bultos', label: 'Bultos' },
    { id: 'estado', label: 'Estado' },
    { id: 'creado_por', label: 'Creado Por' },
    { id: 'creado_en', label: 'Creado En' },
    { id: 'modificado_por', label: 'Modificado Por' },
    { id: 'modificado_en', label: 'Modificado En' },
    { id: 'fecha_inicio', label: 'Fecha Inicio' },
    { id: 'finalizado_en', label: 'Finalizado En' },
    { id: 'sello_lateral', label: 'Sello Lateral' },
    { id: 'sello_adicional', label: 'Sello Adicional' }
  ];
  const columnasDisponiblesLocales = [
    { id: 'id_documento', label: 'N° Transporte' },
    { id: 'fecha_programacion', label: 'Fecha Programación' },
    { id: 'codigo_local', label: 'Código Local' },
    { id: 'nombre_local', label: 'Nombre Local' },
    { id: 'fecha_entrega', label: 'Fecha Entrega' },
    { id: 'hora_entrega', label: 'Hora Entrega' },
    { id: 'conductor', label: 'Conductor' },
    { id: 'patente', label: 'Patente' },
    { id: 'sello_trasero', label: 'Sello Trasero' },
    { id: 'cantidad_pallet', label: 'Cant. Pallet' },
    { id: 'bultos', label: 'Total Bultos' },
    { id: 'cantidad_solicitada', label: 'Cant. Solicitada' }
  ];
  const columnasDisponiblesBultos = [
    { id: 'id_documento', label: 'N° Transporte' },
    { id: 'fecha_programacion', label: 'Fecha Programación' },
    { id: 'codigo_local', label: 'Código Local' },
    { id: 'origen_carga', label: 'Origen' },
    { id: 'tipo_documento', label: 'Tipo Doc' },
    { id: 'numero_documento', label: 'N° Documento' },
    { id: 'cantidad', label: 'Cantidad' },
    { id: 'observacion', label: 'Observación' }
  ];

  const columnasDisponibles = vista === 'transportes' ? columnasDisponiblesTransportes : vista === 'locales' ? columnasDisponiblesLocales : columnasDisponiblesBultos;
  const columnasActuales = vista === 'transportes' ? columnasTransportes : vista === 'locales' ? columnasLocales : columnasBultos;
  const setColumnasActuales: any = vista === 'transportes' ? setColumnasTransportes : vista === 'locales' ? setColumnasLocales : setColumnasBultos;

  const toggleColumna = (col: string) => {
    setColumnasActuales((prev: string[]) => prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]);
  };

  return (
    <div className="sd08-container">
      {mensaje.visible && (
        <div className={`sd08-toast sd08-toast-${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      <div className="sd08-header">
        <h1>SD08 – Consultor de Transportes</h1>
        <p>
          Consulta bajo demanda · {conductores.length} conductores · {patentes.length} patentes cargadas
          {haConsultado && <> · Últimos resultados: {transportes.length} transportes · {locales.length} locales · {bultos.length} bultos</>}
        </p>
      </div>

      <div className="sd08-toolbar">
        <button className="sd08-btn sd08-btn-primary" onClick={() => ejecutarConsulta(filtrosForm)} disabled={consultando}>
          {consultando ? '⏳ Consultando...' : '🔍 Consultar'}
        </button>
        <button className="sd08-btn" onClick={limpiarFiltros} disabled={consultando}>🧹 Limpiar</button>
        <button className="sd08-btn" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
          {mostrarFiltros ? '👁️ Ocultar filtros' : '👁️ Mostrar filtros'}
        </button>
        <div className="sd08-separator"></div>
        <button className="sd08-btn" onClick={() => setShowSaveModal(true)}>💾 Guardar consulta</button>
        <button className="sd08-btn" onClick={() => setShowLoadModal(true)}>
          📁 Cargar consulta {savedQueries.length > 0 && `(${savedQueries.length})`}
        </button>
        <div className="sd08-separator"></div>
        <button className="sd08-btn sd08-btn-success" style={{ marginLeft: 'auto' }} onClick={exportarExcel} disabled={filasActuales.length === 0}>
          📊 Exportar Excel
        </button>
        <button className="sd08-btn" onClick={() => setMostrarColumnas(!mostrarColumnas)}>⚙️ Columnas</button>

        {mostrarColumnas && (
          <div className="sd08-columns-drawer">
            <h4>Mostrar columnas</h4>
            {columnasDisponibles.map((c) => (
              <label key={c.id}>
                <input type="checkbox" checked={columnasActuales.includes(c.id)} onChange={() => toggleColumna(c.id)} />
                {c.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className={`sd08-filters-panel ${mostrarFiltros ? '' : 'sd08-collapsed'}`}>
        <h3>
          Filtros de búsqueda
          {filtrosActivos.length > 0 && <span className="badge">{filtrosActivos.length} activos</span>}
        </h3>
        <div className="sd08-filters-grid">
          <div className="sd08-filter-group">
            <label>Fecha programación</label>
            <input
              type="date"
              value={filtrosForm.fechaProgramacion}
              onChange={(e) => setFiltrosForm({ ...filtrosForm, fechaProgramacion: e.target.value })}
            />
          </div>
          <div className="sd08-filter-group">
            <label>N° Transporte</label>
            <input type="text" placeholder="Ej: SD01092026000001" value={filtrosForm.numeroTransporte} onChange={(e) => setFiltrosForm({ ...filtrosForm, numeroTransporte: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>Conductor</label>
            <input type="text" placeholder="Nombre o apellido" value={filtrosForm.conductor} onChange={(e) => setFiltrosForm({ ...filtrosForm, conductor: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>Patente</label>
            <input type="text" placeholder="Ej: ABCD12" value={filtrosForm.patente} onChange={(e) => setFiltrosForm({ ...filtrosForm, patente: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>Código Local</label>
            <input type="text" placeholder="Ej: D001" value={filtrosForm.codigoLocal} onChange={(e) => setFiltrosForm({ ...filtrosForm, codigoLocal: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>Sello (trasero / lateral / adicional)</label>
            <input type="text" placeholder="Número de sello" value={filtrosForm.sello} onChange={(e) => setFiltrosForm({ ...filtrosForm, sello: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>N° Documento (acta)</label>
            <input type="text" placeholder="Ej: 22687" value={filtrosForm.numeroDocumento} onChange={(e) => setFiltrosForm({ ...filtrosForm, numeroDocumento: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>Estado</label>
            <select value={filtrosForm.estado} onChange={(e) => setFiltrosForm({ ...filtrosForm, estado: e.target.value })}>
              <option value="Todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
          <div className="sd08-filter-group">
            <label>Origen de Carga</label>
            <MultiSelectDropdown
              options={ORIGENES_DISPONIBLES}
              value={filtrosForm.origenes}
              onChange={(v) => setFiltrosForm({ ...filtrosForm, origenes: v })}
              placeholder="Seleccionar orígenes..."
            />
          </div>
          <div className="sd08-filter-group">
            <label>Tipo de Documento</label>
            <MultiSelectDropdown
              options={TIPOS_DOC_DISPONIBLES}
              value={filtrosForm.tiposDoc}
              onChange={(v) => setFiltrosForm({ ...filtrosForm, tiposDoc: v })}
              placeholder="Seleccionar tipos..."
            />
          </div>
          <div className="sd08-filter-group">
            <label>Rango bultos solicitados</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="number" placeholder="Min" style={{ width: '50%' }} value={filtrosForm.bultosMin} onChange={(e) => setFiltrosForm({ ...filtrosForm, bultosMin: e.target.value })} />
              <input type="number" placeholder="Max" style={{ width: '50%' }} value={filtrosForm.bultosMax} onChange={(e) => setFiltrosForm({ ...filtrosForm, bultosMax: e.target.value })} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="sd08-btn" onClick={() => setFiltrosForm(filtrosIniciales)}>Resetear formulario</button>
          <button className="sd08-btn sd08-btn-primary" onClick={() => ejecutarConsulta(filtrosForm)} disabled={consultando}>
            {consultando ? '⏳ Consultando...' : '🔍 Aplicar filtros'}
          </button>
        </div>

        {filtrosActivos.length > 0 && (
          <div className="sd08-active-filters">
            <div className="sd08-active-filters-title">Filtros activos (aplicados)</div>
            <div className="sd08-filter-chips">
              {filtrosActivos.map((c, i) => (
                <span key={i} className="sd08-filter-chip">
                  {c.label}
                  <span className="x" onClick={c.quitar}>×</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sd08-tabs-view">
        <div className={`sd08-tab-view ${vista === 'transportes' ? 'active' : ''}`} onClick={() => setVista('transportes')}>
          Transportes <span className="count">{filasTransportes.length}</span>
        </div>
        <div className={`sd08-tab-view ${vista === 'locales' ? 'active' : ''}`} onClick={() => setVista('locales')}>
          Locales <span className="count">{filasLocales.length}</span>
        </div>
        <div className={`sd08-tab-view ${vista === 'bultos' ? 'active' : ''}`} onClick={() => setVista('bultos')}>
          Bultos <span className="count">{filasBultos.length}</span>
        </div>
      </div>

      <div className="sd08-results-wrapper">
        {!haConsultado ? (
          <div className="sd08-empty" style={{ padding: '80px 20px' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Presiona "Consultar" para cargar datos
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Selecciona los filtros que necesites y haz clic en Consultar. Solo se traerán los datos que coincidan.
            </p>
          </div>
        ) : consultando ? (
          <div className="sd08-loading">Consultando datos...</div>
        ) : (
          <>
            <div className="sd08-results-info">
              <span>Mostrando <strong>{filasPaginadas.length}</strong> de <strong>{filasActuales.length}</strong> registros</span>
              {vista === 'transportes' && <span className="chip">Total bultos: {formatNumber(filasTransportes.reduce((s, t) => s + t._bultosCount, 0))}</span>}
              {vista === 'locales' && <span className="chip">Total bultos: {formatNumber(filasLocales.reduce((s, l) => s + l._bultosCount, 0))}</span>}
              {vista === 'bultos' && <span className="chip">Total cantidad: {formatNumber(filasBultos.reduce((s, b) => s + (b.cantidad || 0), 0))}</span>}
            </div>

            <div className="sd08-results-table-wrap">
              {filasActuales.length === 0 ? (
                <div className="sd08-empty">No hay resultados con los filtros aplicados.</div>
              ) : (
                <table className="sd08-results">
                  <thead>
                    <tr>
                      {vista === 'transportes' && columnasTransportes.map((col) => {
                        const cfg = columnasDisponiblesTransportes.find((c) => c.id === col);
                        if (!cfg) return null;
                        return <th key={col} onClick={() => cambiarOrden(col)}>{cfg.label}{indicador(col)}</th>;
                      })}
                      {vista === 'locales' && columnasLocales.map((col) => {
                        const cfg = columnasDisponiblesLocales.find((c) => c.id === col);
                        if (!cfg) return null;
                        return <th key={col} onClick={() => cambiarOrden(col)}>{cfg.label}{indicador(col)}</th>;
                      })}
                      {vista === 'bultos' && columnasBultos.map((col) => {
                        const cfg = columnasDisponiblesBultos.find((c) => c.id === col);
                        if (!cfg) return null;
                        return <th key={col} onClick={() => cambiarOrden(col)}>{cfg.label}{indicador(col)}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {vista === 'transportes' && filasPaginadas.map((t: any) => (
                      <tr key={t._id}>
                        {columnasTransportes.includes('id_documento') && <td className="sd08-mono">{t.id_documento}</td>}
                        {columnasTransportes.includes('fecha_programacion') && <td>{t._fechaFormato}</td>}
                        {columnasTransportes.includes('conductor') && <td>{t._conductor}</td>}
                        {columnasTransportes.includes('rut') && <td>{t._rut}</td>}
                        {columnasTransportes.includes('patente') && <td>{t._patente}</td>}
                        {columnasTransportes.includes('patenteAdicional') && <td>{t._patenteAdicional || '-'}</td>}
                        {columnasTransportes.includes('locales') && <td className="sd08-num">{t._localesCount}</td>}
                        {columnasTransportes.includes('bultos') && <td className="sd08-num">{formatNumber(t._bultosCount)}</td>}
                        {columnasTransportes.includes('estado') && <td><span className={`sd08-badge sd08-badge-${(t.estado || '').toLowerCase().replace(' ', '')}`}>{t.estado}</span></td>}
                        {columnasTransportes.includes('creado_por') && <td>{t.creado_por || '-'}</td>}
                        {columnasTransportes.includes('creado_en') && <td>{t._fechaHora}</td>}
                        {columnasTransportes.includes('modificado_por') && <td>{t.modificado_por || '-'}</td>}
                        {columnasTransportes.includes('modificado_en') && <td>{t.modificado_en ? formatFechaHora(t.modificado_en) : '-'}</td>}
                        {columnasTransportes.includes('fecha_inicio') && <td>{t.fecha_inicio ? formatFechaHora(t.fecha_inicio) : '-'}</td>}
                        {columnasTransportes.includes('finalizado_en') && <td>{t.finalizado_en ? formatFechaHora(t.finalizado_en) : '-'}</td>}
                        {columnasTransportes.includes('sello_lateral') && <td>{t.sello_lateral || '-'}</td>}
                        {columnasTransportes.includes('sello_adicional') && <td>{t.sello_adicional || '-'}</td>}
                      </tr>
                    ))}
                    {vista === 'locales' && filasPaginadas.map((l: any) => (
                      <tr key={l._id}>
                        {columnasLocales.includes('id_documento') && <td className="sd08-mono">{l._id_documento}</td>}
                        {columnasLocales.includes('fecha_programacion') && <td>{l._fecha_programacion}</td>}
                        {columnasLocales.includes('codigo_local') && <td className="sd08-mono">{l.codigo_local}</td>}
                        {columnasLocales.includes('nombre_local') && <td>{l.nombre_local || '-'}</td>}
                        {columnasLocales.includes('fecha_entrega') && <td>{l._fecha_entrega_fmt}</td>}
                        {columnasLocales.includes('hora_entrega') && <td>{l.hora_entrega || '-'}</td>}
                        {columnasLocales.includes('conductor') && <td>{l._conductor}</td>}
                        {columnasLocales.includes('patente') && <td>{l._patente}</td>}
                        {columnasLocales.includes('sello_trasero') && <td>{l.sello_trasero || '-'}</td>}
                        {columnasLocales.includes('cantidad_pallet') && <td className="sd08-num">{l.cantidad_pallet || 0}</td>}
                        {columnasLocales.includes('bultos') && <td className="sd08-num">{formatNumber(l._bultosCount)}</td>}
                        {columnasLocales.includes('cantidad_solicitada') && <td className="sd08-num">{l.cantidad_solicitada || 0}</td>}
                      </tr>
                    ))}
                    {vista === 'bultos' && filasPaginadas.map((b: any) => (
                      <tr key={b._id}>
                        {columnasBultos.includes('id_documento') && <td className="sd08-mono">{b._id_documento}</td>}
                        {columnasBultos.includes('fecha_programacion') && <td>{b._fecha_programacion}</td>}
                        {columnasBultos.includes('codigo_local') && <td className="sd08-mono">{b._codigo_local}</td>}
                        {columnasBultos.includes('origen_carga') && <td>{b.origen_carga}</td>}
                        {columnasBultos.includes('tipo_documento') && <td>{b.tipo_documento || '-'}</td>}
                        {columnasBultos.includes('numero_documento') && <td>{b.numero_documento || '-'}</td>}
                        {columnasBultos.includes('cantidad') && <td className="sd08-num">{formatNumber(b.cantidad)}</td>}
                        {columnasBultos.includes('observacion') && <td>{b.observacion || '-'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="sd08-pagination">
              <span>
                Registros por página:{' '}
                <select value={paginaSize} onChange={(e) => setPaginaSize(Number(e.target.value))} style={{ padding: '2px 6px', border: '1px solid var(--border-input)', borderRadius: 4, fontSize: 12, background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </span>
              <div className="pages">
                <button disabled={paginaActual <= 1} onClick={() => setPagina(1)}>«</button>
                <button disabled={paginaActual <= 1} onClick={() => setPagina(paginaActual - 1)}>‹ Anterior</button>
                <span style={{ padding: '0 8px' }}>Página {paginaActual} de {totalPaginas}</span>
                <button disabled={paginaActual >= totalPaginas} onClick={() => setPagina(paginaActual + 1)}>Siguiente ›</button>
                <button disabled={paginaActual >= totalPaginas} onClick={() => setPagina(totalPaginas)}>»</button>
              </div>
            </div>
          </>
        )}
      </div>

      {showSaveModal && (
        <div className="sd08-modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="sd08-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd08-modal-header">
              <h2>Guardar consulta</h2>
              <button className="sd08-modal-close" onClick={() => setShowSaveModal(false)}>×</button>
            </div>
            <div className="sd08-modal-body">
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                Nombre de la consulta
              </label>
              <input
                type="text"
                value={nombreConsulta}
                onChange={(e) => setNombreConsulta(e.target.value)}
                placeholder="Ej: Finalizados CD01 septiembre"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-input)', borderRadius: 8, fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                autoFocus
              />
            </div>
            <div className="sd08-modal-footer">
              <button className="sd08-btn" onClick={() => setShowSaveModal(false)}>Cancelar</button>
              <button className="sd08-btn sd08-btn-primary" onClick={guardarConsulta}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="sd08-modal-overlay" onClick={() => setShowLoadModal(false)}>
          <div className="sd08-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd08-modal-header">
              <h2>Consultas guardadas</h2>
              <button className="sd08-modal-close" onClick={() => setShowLoadModal(false)}>×</button>
            </div>
            <div className="sd08-modal-body">
              {savedQueries.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No hay consultas guardadas</p>
              ) : (
                <div className="sd08-saved-list">
                  {savedQueries.map((q) => (
                    <div key={q.nombre} className="sd08-saved-item">
                      <span style={{ cursor: 'pointer', flex: 1, color: 'var(--text-primary)', fontWeight: 500 }} onClick={() => cargarConsulta(q)}>
                        {q.nombre}
                      </span>
                      <button onClick={() => eliminarConsulta(q.nombre)} title="Eliminar">🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="sd08-modal-footer">
              <button className="sd08-btn" onClick={() => setShowLoadModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD08Consultor;
