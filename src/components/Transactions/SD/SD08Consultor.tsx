// src/components/Transactions/SD/SD08Consultor.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import './SD08.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  apikey: 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  Authorization: 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const PAGE_SIZE = 50;

// --- Tipos de vista ---
type Vista = 'transportes' | 'locales' | 'bultos';

interface Filtros {
  fechaDesde: string;
  fechaHasta: string;
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
  fechaDesde: '',
  fechaHasta: '',
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
const normalizar = (t: any): string => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

interface SavedQuery { nombre: string; filtros: Filtros; }

const SD08Consultor: React.FC = () => {
  const [transportes, setTransportes] = useState<any[]>([]);
  const [locales, setLocales] = useState<any[]>([]);
  const [bultos, setBultos] = useState<any[]>([]);
  const [conductoresMap, setConductoresMap] = useState<Map<string, any>>(new Map());
  const [patentesMap, setPatentesMap] = useState<Map<string, any>>(new Map());
  const [documentosMap, setDocumentosMap] = useState<Map<string, any>>(new Map());

  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });

  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciales);
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [vista, setVista] = useState<Vista>('transportes');
  const [pagina, setPagina] = useState(1);
  const [paginaSize, setPaginaSize] = useState(PAGE_SIZE);
  const [ordenColumna, setOrdenColumna] = useState<string>('fecha_programacion');
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('desc');

  // Columnas visibles (por vista)
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

  // Consultas guardadas
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [nombreConsulta, setNombreConsulta] = useState('');

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  // Cargar consultas guardadas de localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sd08_saved_queries');
      if (raw) setSavedQueries(JSON.parse(raw));
    } catch {}
  }, []);

  // Carga inicial de datos
  useEffect(() => {
    const cargarTodo = async () => {
      setCargando(true);
      try {
        const [respTransp, respLocales, respBultos, respCond, respPat, respDocs] = await Promise.all([
          fetch(`${API_URL}/sd01_documentos?select=*`, { headers: HEADERS }),
          fetch(`${API_URL}/sd01_documento_locales?select=*`, { headers: HEADERS }),
          fetch(`${API_URL}/sd01_bultos?select=*`, { headers: HEADERS }),
          fetch(`${API_URL}/conductores?select=*`, { headers: HEADERS }),
          fetch(`${API_URL}/patentes?select=*`, { headers: HEADERS }),
          fetch(`${API_URL}/sd01_documentos?select=id,id_documento,fecha_programacion,estado,creado_por,creado_en,conductor_id,patente_principal_id,patente_adicional_id,modificado_por,modificado_en,fecha_inicio,finalizado_en,sello_lateral,sello_adicional,observaciones`, { headers: HEADERS })
        ]);

        const t = await respTransp.json();
        const l = await respLocales.json();
        const b = await respBultos.json();
        const c = await respCond.json();
        const p = await respPat.json();
        const d = await respDocs.json();

        setTransportes(Array.isArray(t) ? t : []);
        setLocales(Array.isArray(l) ? l : []);
        setBultos(Array.isArray(b) ? b : []);

        const cm = new Map<string, any>();
        (Array.isArray(c) ? c : []).forEach((x: any) => cm.set(x.id, x));
        setConductoresMap(cm);

        const pm = new Map<string, any>();
        (Array.isArray(p) ? p : []).forEach((x: any) => pm.set(x.id, x));
        setPatentesMap(pm);

        const dm = new Map<string, any>();
        (Array.isArray(d) ? d : []).forEach((x: any) => dm.set(x.id_documento, x));
        setDocumentosMap(dm);
      } catch (e) {
        console.error('Error cargando datos SD08:', e);
        mostrarMensaje('error', 'Error al cargar datos');
      } finally {
        setCargando(false);
      }
    };
    cargarTodo();
  }, []);

  // Helpers para enriquecer datos
  const getConductorNombre = useCallback((doc: any) => {
    const c = conductoresMap.get(doc.conductor_id);
    return c ? `${c.nombre} ${c.apellido}` : '-';
  }, [conductoresMap]);

  const getConductorRut = useCallback((doc: any) => {
    const c = conductoresMap.get(doc.conductor_id);
    return c?.numero_documento || '-';
  }, [conductoresMap]);

  const getPatente = useCallback((doc: any, adicional = false) => {
    const id = adicional ? doc.patente_adicional_id : doc.patente_principal_id;
    if (!id) return '';
    const p = patentesMap.get(id);
    return p?.numero_patente || '';
  }, [patentesMap]);

  const getSelloLateral = useCallback((doc: any) => doc?.sello_lateral || '', []);
  const getSelloAdicional = useCallback((doc: any) => doc?.sello_adicional || '', []);

  // ============= APLICAR FILTROS =============
  const transportesFiltrados = useMemo(() => {
    const filtroTexto = (v: any, q: string) => normalizar(v).includes(normalizar(q));

    // Primero filtro de transportes por criterios propios del documento
    let lista = transportes.filter((doc) => {
      // Fecha
      if (filtros.fechaDesde) {
        const f = (doc.fecha_programacion || '').slice(0, 10);
        if (f < filtros.fechaDesde) return false;
      }
      if (filtros.fechaHasta) {
        const f = (doc.fecha_programacion || '').slice(0, 10);
        if (f > filtros.fechaHasta) return false;
      }
      // N° transporte
      if (filtros.numeroTransporte && !filtroTexto(doc.id_documento, filtros.numeroTransporte)) return false;
      // Conductor
      if (filtros.conductor && !filtroTexto(getConductorNombre(doc), filtros.conductor)) return false;
      // Patente
      if (filtros.patente) {
        const pat = `${getPatente(doc)} ${getPatente(doc, true)}`;
        if (!filtroTexto(pat, filtros.patente)) return false;
      }
      // Estado
      if (filtros.estado && filtros.estado !== 'Todos' && doc.estado !== filtros.estado) return false;
      // Sello
      if (filtros.sello) {
        const sellos = `${getSelloLateral(doc)} ${getSelloAdicional(doc)}`;
        if (!filtroTexto(sellos, filtros.sello)) return false;
      }
      return true;
    });

    // Recolectar IDs de locales válidos por filtros de local
    const localIdsValidos = new Set<string>();
    if (filtros.codigoLocal) {
      locales.forEach((l) => {
        if (filtroTexto(l.codigo_local, filtros.codigoLocal)) localIdsValidos.add(l.id);
      });
    }

    // Recolectar doc IDs válidos por filtros de bulto
    let docIdsPorBultos: Set<string> | null = null;
    if (
      filtros.origenes.length > 0 ||
      filtros.tiposDoc.length > 0 ||
      filtros.numeroDocumento ||
      filtros.bultosMin ||
      filtros.bultosMax
    ) {
      docIdsPorBultos = new Set<string>();
      const localMap = new Map<string, any>();
      locales.forEach((l) => localMap.set(l.id, l));

      bultos.forEach((b) => {
        const local = localMap.get(b.local_id);
        if (!local) return;
        if (filtros.origenes.length > 0 && !filtros.origenes.includes(b.origen_carga)) return;
        if (filtros.tiposDoc.length > 0) {
          const td = b.tipo_documento || 'No aplica';
          if (!filtros.tiposDoc.includes(td)) return;
        }
        if (filtros.numeroDocumento && !filtroTexto(b.numero_documento, filtros.numeroDocumento)) return;
        if (filtros.bultosMin && Number(b.cantidad) < Number(filtros.bultosMin)) return;
        if (filtros.bultosMax && Number(b.cantidad) > Number(filtros.bultosMax)) return;
        docIdsPorBultos!.add(local.documento_id);
      });
    }

    // Filtrar transportes por local y por bulto
    lista = lista.filter((doc) => {
      if (filtros.codigoLocal) {
        const tieneLocal = locales.some(
          (l) => l.documento_id === doc.id_documento && localIdsValidos.has(l.id)
        );
        if (!tieneLocal) return false;
      }
      if (docIdsPorBultos && !docIdsPorBultos.has(doc.id_documento)) return false;
      return true;
    });

    return lista;
  }, [transportes, locales, bultos, filtros, conductoresMap, patentesMap, getConductorNombre, getPatente, getSelloLateral, getSelloAdicional]);

  // Filas de locales filtradas (solo las que pertenecen a transportes filtrados + filtros propios)
  const localesFiltrados = useMemo(() => {
    const filtroTexto = (v: any, q: string) => normalizar(v).includes(normalizar(q));
    const docIds = new Set(transportesFiltrados.map((d) => d.id_documento));
    let lista = locales.filter((l) => docIds.has(l.documento_id));

    if (filtros.codigoLocal) {
      lista = lista.filter((l) => filtroTexto(l.codigo_local, filtros.codigoLocal));
    }
    return lista;
  }, [locales, transportesFiltrados, filtros.codigoLocal]);

  // Filas de bultos filtradas
  const bultosFiltrados = useMemo(() => {
    const filtroTexto = (v: any, q: string) => normalizar(v).includes(normalizar(q));
    const localIds = new Set(localesFiltrados.map((l) => l.id));
    let lista = bultos.filter((b) => localIds.has(b.local_id));

    if (filtros.origenes.length > 0) {
      lista = lista.filter((b) => filtros.origenes.includes(b.origen_carga));
    }
    if (filtros.tiposDoc.length > 0) {
      lista = lista.filter((b) => {
        const td = b.tipo_documento || 'No aplica';
        return filtros.tiposDoc.includes(td);
      });
    }
    if (filtros.numeroDocumento) {
      lista = lista.filter((b) => filtroTexto(b.numero_documento, filtros.numeroDocumento));
    }
    if (filtros.bultosMin) {
      lista = lista.filter((b) => Number(b.cantidad) >= Number(filtros.bultosMin));
    }
    if (filtros.bultosMax) {
      lista = lista.filter((b) => Number(b.cantidad) <= Number(filtros.bultosMax));
    }
    return lista;
  }, [bultos, localesFiltrados, filtros]);

  // ============= CONSTRUCCIÓN DE FILAS PARA CADA VISTA =============
  const filasTransportes = useMemo(() => {
    return transportesFiltrados.map((doc) => {
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
        _creadoPor: doc.creado_por || '-',
        _fechaFormato: formatFecha(doc.fecha_programacion),
        _fechaHora: formatFechaHora(doc.creado_en)
      };
    });
  }, [transportesFiltrados, locales, bultos, getConductorNombre, getConductorRut, getPatente]);

  const filasLocales = useMemo(() => {
    const docMap = new Map(transportesFiltrados.map((d) => [d.id_documento, d]));
    return localesFiltrados.map((loc) => {
      const doc = docMap.get(loc.documento_id);
      const bultosDelLocal = bultos.filter((b) => b.local_id === loc.id);
      const totalBultos = bultosDelLocal.reduce((s, b) => s + (b.cantidad || 0), 0);
      return {
        ...loc,
        _id: loc.id,
        _doc: doc,
        _id_documento: loc.documento_id,
        _fecha_programacion: doc ? formatFecha(doc.fecha_programacion) : '-',
        _conductor: doc ? getConductorNombre(doc) : '-',
        _patente: doc ? getPatente(doc) : '-',
        _bultosCount: totalBultos,
        _fecha_entrega_fmt: formatFecha(loc.fecha_entrega)
      };
    });
  }, [localesFiltrados, transportesFiltrados, bultos, getConductorNombre, getPatente]);

  const filasBultos = useMemo(() => {
    const localMap = new Map(locales.map((l) => [l.id, l]));
    const docMap = new Map(transportes.map((d) => [d.id_documento, d]));
    return bultosFiltrados.map((b) => {
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
  }, [bultosFiltrados, locales, transportes]);

  // ============= ORDENAMIENTO =============
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

  // Paginación
  const totalPaginas = Math.max(1, Math.ceil(filasActuales.length / paginaSize));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filasPaginadas = filasActuales.slice((paginaActual - 1) * paginaSize, paginaActual * paginaSize);

  useEffect(() => { setPagina(1); }, [vista, filtros, paginaSize]);

  const cambiarOrden = (col: string) => {
    if (ordenColumna === col) setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
    else { setOrdenColumna(col); setOrdenDireccion('asc'); }
  };

  const indicador = (col: string) => ordenColumna === col ? (ordenDireccion === 'asc' ? ' ▲' : ' ▼') : '';

  // ============= FILTROS ACTIVOS =============
  const filtrosActivos = useMemo(() => {
    const chips: { label: string; quitar: () => void }[] = [];
    if (filtros.fechaDesde || filtros.fechaHasta) {
      chips.push({
        label: `📅 ${filtros.fechaDesde || '...'} → ${filtros.fechaHasta || '...'}`,
        quitar: () => setFiltros((f) => ({ ...f, fechaDesde: '', fechaHasta: '' }))
      });
    }
    if (filtros.numeroTransporte) chips.push({ label: `🚚 N° ${filtros.numeroTransporte}`, quitar: () => setFiltros((f) => ({ ...f, numeroTransporte: '' })) });
    if (filtros.conductor) chips.push({ label: `👤 ${filtros.conductor}`, quitar: () => setFiltros((f) => ({ ...f, conductor: '' })) });
    if (filtros.patente) chips.push({ label: `🚛 ${filtros.patente}`, quitar: () => setFiltros((f) => ({ ...f, patente: '' })) });
    if (filtros.codigoLocal) chips.push({ label: `🏬 ${filtros.codigoLocal}`, quitar: () => setFiltros((f) => ({ ...f, codigoLocal: '' })) });
    if (filtros.sello) chips.push({ label: `🔖 ${filtros.sello}`, quitar: () => setFiltros((f) => ({ ...f, sello: '' })) });
    if (filtros.numeroDocumento) chips.push({ label: `📄 Acta ${filtros.numeroDocumento}`, quitar: () => setFiltros((f) => ({ ...f, numeroDocumento: '' })) });
    if (filtros.estado && filtros.estado !== 'Todos') chips.push({ label: `⚙️ ${filtros.estado}`, quitar: () => setFiltros((f) => ({ ...f, estado: 'Todos' })) });
    filtros.origenes.forEach((o) => chips.push({ label: `📦 ${o}`, quitar: () => setFiltros((f) => ({ ...f, origenes: f.origenes.filter((x) => x !== o) })) }));
    filtros.tiposDoc.forEach((t) => chips.push({ label: `📑 ${t}`, quitar: () => setFiltros((f) => ({ ...f, tiposDoc: f.tiposDoc.filter((x) => x !== t) })) }));
    if (filtros.bultosMin || filtros.bultosMax) chips.push({
      label: `🔢 ${filtros.bultosMin || '0'} - ${filtros.bultosMax || '∞'}`,
      quitar: () => setFiltros((f) => ({ ...f, bultosMin: '', bultosMax: '' }))
    });
    return chips;
  }, [filtros]);

  const limpiarFiltros = () => setFiltros(filtrosIniciales);

  const toggleCheckbox = (campo: 'origenes' | 'tiposDoc', valor: string) => {
    setFiltros((f) => {
      const arr = f[campo];
      return { ...f, [campo]: arr.includes(valor) ? arr.filter((x) => x !== valor) : [...arr, valor] };
    });
  };

  // ============= EXPORTAR A EXCEL =============
  const exportarExcel = () => {
    if (filasActuales.length === 0) {
      mostrarMensaje('warning', 'No hay datos para exportar');
      return;
    }
    let headers: string[] = [];
    let rows: any[][] = [];

    if (vista === 'transportes') {
      headers = ['N° Transporte', 'Fecha Prog.', 'Conductor', 'RUT', 'Patente', 'Patente Adicional', 'Locales', 'Bultos', 'Estado', 'Creado Por', 'Creado En'];
      rows = filasActuales.map((t) => [
        t.id_documento, t._fechaFormato, t._conductor, t._rut,
        t._patente, t._patenteAdicional, t._localesCount, t._bultosCount,
        t.estado, t._creadoPor, t._fechaHora
      ]);
    } else if (vista === 'locales') {
      headers = ['N° Transporte', 'Fecha Prog.', 'Código Local', 'Nombre Local', 'Fecha Entrega', 'Hora Entrega', 'Conductor', 'Patente', 'Sello Trasero', 'Cant. Pallet', 'Bultos'];
      rows = filasActuales.map((l) => [
        l._id_documento, l._fecha_programacion, l.codigo_local, l.nombre_local,
        l._fecha_entrega_fmt, l.hora_entrega || '-', l._conductor, l._patente,
        l.sello_trasero || '-', l.cantidad_pallet || 0, l._bultosCount
      ]);
    } else {
      headers = ['N° Transporte', 'Fecha Prog.', 'Código Local', 'Origen', 'Tipo Doc', 'N° Documento', 'Cantidad', 'Observación'];
      rows = filasActuales.map((b) => [
        b._id_documento, b._fecha_programacion, b._codigo_local,
        b.origen_carga, b.tipo_documento || '-', b.numero_documento || '-',
        b.cantidad, b.observacion || '-'
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `SD08 ${vista}`);
    XLSX.writeFile(wb, `SD08_${vista}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    mostrarMensaje('success', 'Excel exportado');
  };

  // ============= GUARDAR / CARGAR CONSULTAS =============
  const guardarConsulta = () => {
    if (!nombreConsulta.trim()) {
      mostrarMensaje('warning', 'Ingresa un nombre para la consulta');
      return;
    }
    const nuevas = [...savedQueries.filter((q) => q.nombre !== nombreConsulta), { nombre: nombreConsulta, filtros }];
    setSavedQueries(nuevas);
    localStorage.setItem('sd08_saved_queries', JSON.stringify(nuevas));
    setNombreConsulta('');
    setShowSaveModal(false);
    mostrarMensaje('success', 'Consulta guardada');
  };

  const cargarConsulta = (q: SavedQuery) => {
    setFiltros(q.filtros);
    setShowLoadModal(false);
    mostrarMensaje('info', `Consulta "${q.nombre}" cargada`);
  };

  const eliminarConsulta = (nombre: string) => {
    const nuevas = savedQueries.filter((q) => q.nombre !== nombre);
    setSavedQueries(nuevas);
    localStorage.setItem('sd08_saved_queries', JSON.stringify(nuevas));
  };

  // ============= RENDER DE COLUMNAS =============
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
  const setColumnasActuales = vista === 'transportes' ? setColumnasTransportes : vista === 'locales' ? setColumnasLocales : setColumnasBultos;

  const toggleColumna = (col: string) => {
    setColumnasActuales((prev: string[]) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  return (
    <div className="sd08-container">
      {mensaje.visible && (
        <div className={`sd08-toast sd08-toast-${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      <div className="sd08-header">
        <h1>SD08 – Consultor de Transportes</h1>
        <p>Consulta avanzada con filtros combinados · {transportes.length} transportes · {locales.length} locales · {bultos.length} bultos cargados</p>
      </div>

      {/* Toolbar */}
      <div className="sd08-toolbar">
        <button className="sd08-btn sd08-btn-primary" onClick={() => setPagina(1)}>🔍 Consultar</button>
        <button className="sd08-btn" onClick={limpiarFiltros}>🧹 Limpiar</button>
        <button className="sd08-btn" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
          {mostrarFiltros ? '👁️ Ocultar filtros' : '👁️ Mostrar filtros'}
        </button>
        <div className="sd08-separator"></div>
        <button className="sd08-btn" onClick={() => setShowSaveModal(true)}>💾 Guardar consulta</button>
        <button className="sd08-btn" onClick={() => setShowLoadModal(true)}>📁 Cargar consulta {savedQueries.length > 0 && `(${savedQueries.length})`}</button>
        <div className="sd08-separator"></div>
        <button className="sd08-btn sd08-btn-success" style={{ marginLeft: 'auto' }} onClick={exportarExcel}>
          📊 Exportar Excel
        </button>
        <button className="sd08-btn" onClick={() => setMostrarColumnas(!mostrarColumnas)}>⚙️ Columnas</button>

        {mostrarColumnas && (
          <div className="sd08-columns-drawer">
            <h4>Mostrar columnas</h4>
            {columnasDisponibles.map((c) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={columnasActuales.includes(c.id)}
                  onChange={() => toggleColumna(c.id)}
                />
                {c.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className={`sd08-filters-panel ${mostrarFiltros ? '' : 'sd08-collapsed'}`}>
        <h3>Filtros de búsqueda {filtrosActivos.length > 0 && <span className="badge">{filtrosActivos.length} activos</span>}</h3>
        <div className="sd08-filters-grid">
          <div className="sd08-filter-group">
            <label>Fecha programación desde</label>
            <input type="date" value={filtros.fechaDesde} onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>Fecha programación hasta</label>
            <input type="date" value={filtros.fechaHasta} onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>N° Transporte</label>
            <input type="text" placeholder="Ej: SD01092026000001" value={filtros.numeroTransporte} onChange={(e) => setFiltros({ ...filtros, numeroTransporte: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>Conductor</label>
            <input type="text" placeholder="Nombre o apellido" value={filtros.conductor} onChange={(e) => setFiltros({ ...filtros, conductor: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>Patente</label>
            <input type="text" placeholder="Ej: ABCD12" value={filtros.patente} onChange={(e) => setFiltros({ ...filtros, patente: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>Código Local</label>
            <input type="text" placeholder="Ej: D001" value={filtros.codigoLocal} onChange={(e) => setFiltros({ ...filtros, codigoLocal: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>Sello (trasero / lateral / adicional)</label>
            <input type="text" placeholder="Número de sello" value={filtros.sello} onChange={(e) => setFiltros({ ...filtros, sello: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>N° Documento (acta)</label>
            <input type="text" placeholder="Ej: 22687" value={filtros.numeroDocumento} onChange={(e) => setFiltros({ ...filtros, numeroDocumento: e.target.value })} />
          </div>
          <div className="sd08-filter-group">
            <label>Estado</label>
            <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
              <option value="Todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
          <div className="sd08-filter-group">
            <label>Origen de Carga</label>
            <div className="sd08-multi-select">
              {ORIGENES_DISPONIBLES.map((o) => (
                <label key={o}>
                  <input type="checkbox" checked={filtros.origenes.includes(o)} onChange={() => toggleCheckbox('origenes', o)} />
                  {o}
                </label>
              ))}
            </div>
          </div>
          <div className="sd08-filter-group">
            <label>Tipo de Documento</label>
            <div className="sd08-multi-select">
              {TIPOS_DOC_DISPONIBLES.map((t) => (
                <label key={t}>
                  <input type="checkbox" checked={filtros.tiposDoc.includes(t)} onChange={() => toggleCheckbox('tiposDoc', t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div className="sd08-filter-group">
            <label>Rango bultos solicitados</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="number" placeholder="Min" style={{ width: '50%' }} value={filtros.bultosMin} onChange={(e) => setFiltros({ ...filtros, bultosMin: e.target.value })} />
              <input type="number" placeholder="Max" style={{ width: '50%' }} value={filtros.bultosMax} onChange={(e) => setFiltros({ ...filtros, bultosMax: e.target.value })} />
            </div>
          </div>
        </div>

        {filtrosActivos.length > 0 && (
          <div className="sd08-active-filters">
            <div className="sd08-active-filters-title">Filtros activos</div>
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

      {/* Tabs */}
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

      {/* Resultados */}
      <div className="sd08-results-wrapper">
        <div className="sd08-results-info">
          <span>Mostrando <strong>{filasPaginadas.length}</strong> de <strong>{filasActuales.length}</strong> registros</span>
          {vista === 'transportes' && <span className="chip">Total bultos: {formatNumber(filasTransportes.reduce((s, t) => s + t._bultosCount, 0))}</span>}
          {vista === 'locales' && <span className="chip">Total bultos: {formatNumber(filasLocales.reduce((s, l) => s + l._bultosCount, 0))}</span>}
          {vista === 'bultos' && <span className="chip">Total cantidad: {formatNumber(filasBultos.reduce((s, b) => s + (b.cantidad || 0), 0))}</span>}
        </div>

        <div className="sd08-results-table-wrap">
          {cargando ? (
            <div className="sd08-loading">Cargando datos...</div>
          ) : filasActuales.length === 0 ? (
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
                {vista === 'transportes' && filasPaginadas.map((t) => (
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
                    {columnasTransportes.includes('creado_por') && <td>{t._creadoPor}</td>}
                    {columnasTransportes.includes('creado_en') && <td>{t._fechaHora}</td>}
                    {columnasTransportes.includes('modificado_por') && <td>{t.modificado_por || '-'}</td>}
                    {columnasTransportes.includes('modificado_en') && <td>{t.modificado_en ? formatFechaHora(t.modificado_en) : '-'}</td>}
                    {columnasTransportes.includes('fecha_inicio') && <td>{t.fecha_inicio ? formatFechaHora(t.fecha_inicio) : '-'}</td>}
                    {columnasTransportes.includes('finalizado_en') && <td>{t.finalizado_en ? formatFechaHora(t.finalizado_en) : '-'}</td>}
                    {columnasTransportes.includes('sello_lateral') && <td>{t.sello_lateral || '-'}</td>}
                    {columnasTransportes.includes('sello_adicional') && <td>{t.sello_adicional || '-'}</td>}
                  </tr>
                ))}
                {vista === 'locales' && filasPaginadas.map((l) => (
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
                {vista === 'bultos' && filasPaginadas.map((b) => (
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

        {/* Paginación */}
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
      </div>

      {/* Modal guardar consulta */}
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
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                Se guardarán los filtros actuales con este nombre para recuperarlos después.
              </p>
            </div>
            <div className="sd08-modal-footer">
              <button className="sd08-btn" onClick={() => setShowSaveModal(false)}>Cancelar</button>
              <button className="sd08-btn sd08-btn-primary" onClick={guardarConsulta}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cargar consulta */}
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
                      <span
                        style={{ cursor: 'pointer', flex: 1, color: 'var(--text-primary)', fontWeight: 500 }}
                        onClick={() => cargarConsulta(q)}
                      >
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
