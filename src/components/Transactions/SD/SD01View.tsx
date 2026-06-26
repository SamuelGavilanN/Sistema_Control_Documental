// src/components/Transactions/SD/SD01View.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import { locales as localesData, cargarLocales } from '../../../data/locales';
import * as XLSX from 'xlsx';
import SD01VerModal from './SD01VerModal';
import SD01EditarModal from './SD01EditarModal';
import SD01CancelarModal from './SD01CancelarModal';
import './SD01.css';

// Configuración de Supabase
const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const API_KEY = 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G';

// HEADERS bien definidos para todas las peticiones
const getHeaders = (includeContentType: boolean = true) => {
  const headers: any = {
    'apikey': API_KEY,
    'Authorization': `Bearer ${API_KEY}`,
  };
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

interface LocalRow {
  id: number;
  codigoLocal: string;
  nombreLocal: string;
  fechaEntrega: string;
  horaEntrega: string;
}

const generateTimeOptions = () => {
  const options: string[] = [];
  for (let h = 6; h < 24; h++) {
    options.push(h.toString().padStart(2, '0') + ':00');
    options.push(h.toString().padStart(2, '0') + ':30');
  }
  for (let h = 0; h < 6; h++) {
    options.push(h.toString().padStart(2, '0') + ':00');
    options.push(h.toString().padStart(2, '0') + ':30');
  }
  return options;
};
const timeOptions = generateTimeOptions();

const SD01View: React.FC = () => {
  const usuario = auth.getUsuario();

  const [transportes, setTransportes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal Manual
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [fechaProgramacion, setFechaProgramacion] = useState('');
  const [conductor, setConductor] = useState('');
  const [conductorId, setConductorId] = useState<string | null>(null);
  const [patentePrincipal, setPatentePrincipal] = useState('');
  const [patentePrincipalId, setPatentePrincipalId] = useState<string | null>(null);
  const [patenteAdicional, setPatenteAdicional] = useState('');
  const [patenteAdicionalId, setPatenteAdicionalId] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [locales, setLocales] = useState<LocalRow[]>([
    { id: 1, codigoLocal: '', nombreLocal: '', fechaEntrega: '', horaEntrega: '' }
  ]);

  // Modales Ver/Editar/Cancelar
  const [showVerModal, setShowVerModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [transporteSeleccionado, setTransporteSeleccionado] = useState<any>(null);
  const [localesSeleccionados, setLocalesSeleccionados] = useState<any[]>([]);

  // Modal Excel
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [archivoExcel, setArchivoExcel] = useState<any>(null);
  const [nombreArchivoExcel, setNombreArchivoExcel] = useState('');
  const [vistaPrevia, setVistaPrevia] = useState<any[]>([]);
  const [procesandoExcel, setProcesandoExcel] = useState(false);
  const [mensajeExcel, setMensajeExcel] = useState('');

  const [conductores, setConductores] = useState<any[]>([]);
  const [patentes, setPatentes] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'error'>('success');

  // Autocomplete states
  const [showConductorSuggestions, setShowConductorSuggestions] = useState(false);
  const [conductorSuggestions, setConductorSuggestions] = useState<any[]>([]);
  const [conductorHighlight, setConductorHighlight] = useState(-1);
  const [showPatentePSuggestions, setShowPatentePSuggestions] = useState(false);
  const [patentePSuggestions, setPatentePSuggestions] = useState<any[]>([]);
  const [patentePHighlight, setPatentePHighlight] = useState(-1);
  const [showPatenteASuggestions, setShowPatenteASuggestions] = useState(false);
  const [patenteASuggestions, setPatenteASuggestions] = useState<any[]>([]);
  const [patenteAHighlight, setPatenteAHighlight] = useState(-1);

  const conductorRef = useRef<HTMLInputElement>(null);
  const patentePRef = useRef<HTMLInputElement>(null);
  const patenteARef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarLocales();
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    const intervalo = setInterval(cargarTransportes, 30000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      const headers = getHeaders(false);
      const [respCond, respPat] = await Promise.all([
        fetch(`${API_URL}/sd01_conductores?select=*&activo=eq.true&order=nombre,apellido`, { headers }),
        fetch(`${API_URL}/sd01_patentes?select=*&activo=eq.true&order=numero_patente`, { headers }),
      ]);
      const conductoresData = await respCond.json();
      setConductores((conductoresData || []).map((c: any) => ({
        ...c,
        nombre_completo: (c.nombre || '') + ' ' + (c.apellido || '')
      })));
      const patentesData = await respPat.json();
      setPatentes(patentesData || []);
      await cargarTransportes();
    } catch (e) {
      console.error('Error cargando datos iniciales:', e);
      await cargarTransportes();
    }
  };

  const cargarTransportes = async () => {
    setCargando(true);
    try {
      const headers = getHeaders(false);
      const resp = await fetch(`${API_URL}/sd01_documentos?select=*&order=creado_en.desc`, { headers });
      
      if (!resp.ok) {
        throw new Error(`Error ${resp.status}: ${resp.statusText}`);
      }
      
      const data = await resp.json();
      if (data && Array.isArray(data)) {
        const enriquecidos = [];
        for (const d of data) {
          const respLoc = await fetch(`${API_URL}/sd01_documento_locales?select=id&documento_id=eq.${d.id_documento}`, { headers });
          const locData = await respLoc.json();

          const conductorData = conductores.find((c: any) => c.id === d.conductor_id);
          const patenteData = patentes.find((p: any) => p.id === d.patente_principal_id);
          const patenteAData = patentes.find((p: any) => p.id === d.patente_adicional_id);

          enriquecidos.push({
            ...d,
            nombre_conductor: conductorData?.nombre_completo || (conductorData?.nombre ? conductorData.nombre + ' ' + conductorData.apellido : '-'),
            numero_patente: patenteData?.numero_patente || '-',
            patente_adicional: patenteAData?.numero_patente || '-',
            total_locales: locData?.length || 0,
            conductor_obj: conductorData || null,
            patente_obj: patenteData || null,
            patente_adicional_obj: patenteAData || null,
          });
        }
        setTransportes(enriquecidos);
      }
    } catch (e) {
      console.error('Error cargando transportes:', e);
      setMensaje('Error al cargar transportes: ' + (e instanceof Error ? e.message : 'Error desconocido'));
      setTipoMensaje('error');
    }
    setCargando(false);
  };

  // ============ GENERAR ID ÚNICO ============
  const generarIdDocumento = async (): Promise<string> => {
    const now = new Date();
    const fecha = String(now.getDate()).padStart(2, '0') + 
                  String(now.getMonth() + 1).padStart(2, '0') + 
                  now.getFullYear();
    
    try {
      const headers = getHeaders(false);
      const resp = await fetch(
        `${API_URL}/sd01_documentos?select=id_documento&id_documento=like.SD01-${fecha}-%&order=id_documento.desc&limit=1`,
        { headers }
      );
      
      if (!resp.ok) {
        console.warn('No se pudo obtener el último ID, usando contador por defecto');
        return `SD01-${fecha}-0001`;
      }
      
      const data = await resp.json();
      let count = 1;
      if (data && data.length > 0) {
        const lastId = data[0].id_documento;
        const match = lastId.match(/-(\d{4})$/);
        if (match) {
          count = parseInt(match[1]) + 1;
        }
      }
      
      return `SD01-${fecha}-${String(count).padStart(4, '0')}`;
    } catch (e) {
      console.warn('Error generando ID, usando contador por defecto:', e);
      return `SD01-${fecha}-0001`;
    }
  };

  // ============ MANUAL ============
  const addLocal = () => {
    const newId = Math.max(...locales.map(l => l.id), 0) + 1;
    setLocales([...locales, { id: newId, codigoLocal: '', nombreLocal: '', fechaEntrega: '', horaEntrega: '' }]);
  };

  const removeLocal = (id: number) => {
    if (locales.length === 1) return;
    setLocales(locales.filter(l => l.id !== id));
  };

  const updateLocal = (id: number, field: keyof LocalRow, value: string) => {
    setLocales(locales.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === 'codigoLocal' && value.trim()) {
        const loc = localesData.find((x: any) => x.codigo_local?.toUpperCase() === value.toUpperCase());
        if (loc) updated.nombreLocal = loc.nombre_local;
        else updated.nombreLocal = '';
      }
      return updated;
    }));
  };

  const filterStartsWith = (list: any[], field: string, search: string) => {
    if (!search) return [];
    return list.filter((item: any) => String(item[field] || '').toLowerCase().startsWith(search.toLowerCase()));
  };

  // Conductor autocomplete
  const handleConductorChange = (v: string) => {
    setConductor(v);
    setConductorId(null);
    const f = filterStartsWith(conductores, 'nombre_completo', v);
    setConductorSuggestions(f);
    setShowConductorSuggestions(f.length > 0);
    setConductorHighlight(-1);
  };

  const handleConductorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && showConductorSuggestions && conductorSuggestions.length > 0) {
      e.preventDefault();
      const i = conductorHighlight >= 0 ? conductorHighlight : 0;
      if (conductorSuggestions[i]) {
        selectConductor(conductorSuggestions[i]);
        return;
      }
    }
    
    if (!showConductorSuggestions || conductorSuggestions.length === 0) {
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setConductorHighlight(p => p < conductorSuggestions.length - 1 ? p + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setConductorHighlight(p => p > 0 ? p - 1 : conductorSuggestions.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const i = conductorHighlight >= 0 ? conductorHighlight : 0;
      if (conductorSuggestions[i]) selectConductor(conductorSuggestions[i]);
    } else if (e.key === 'Escape') {
      setShowConductorSuggestions(false);
      setConductorHighlight(-1);
    }
  };

  const selectConductor = (c: any) => {
    setConductor(c.nombre_completo || '');
    setConductorId(c.id);
    setShowConductorSuggestions(false);
    setConductorHighlight(-1);
    setTimeout(() => patentePRef.current?.focus(), 50);
  };

  // Patente P autocomplete
  const handlePatentePChange = (v: string) => {
    setPatentePrincipal(v);
    setPatentePrincipalId(null);
    const f = filterStartsWith(patentes, 'numero_patente', v);
    setPatentePSuggestions(f);
    setShowPatentePSuggestions(f.length > 0);
    setPatentePHighlight(-1);
  };

  const handlePatentePKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && showPatentePSuggestions && patentePSuggestions.length > 0) {
      e.preventDefault();
      const i = patentePHighlight >= 0 ? patentePHighlight : 0;
      if (patentePSuggestions[i]) {
        selectPatenteP(patentePSuggestions[i]);
        return;
      }
    }
    
    if (!showPatentePSuggestions || patentePSuggestions.length === 0) {
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPatentePHighlight(p => p < patentePSuggestions.length - 1 ? p + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPatentePHighlight(p => p > 0 ? p - 1 : patentePSuggestions.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const i = patentePHighlight >= 0 ? patentePHighlight : 0;
      if (patentePSuggestions[i]) selectPatenteP(patentePSuggestions[i]);
    } else if (e.key === 'Escape') {
      setShowPatentePSuggestions(false);
      setPatentePHighlight(-1);
    }
  };

  const selectPatenteP = (p: any) => {
    setPatentePrincipal(p.numero_patente || '');
    setPatentePrincipalId(p.id);
    setShowPatentePSuggestions(false);
    setPatentePHighlight(-1);
    setTimeout(() => patenteARef.current?.focus(), 50);
  };

  // Patente A autocomplete
  const handlePatenteAChange = (v: string) => {
    setPatenteAdicional(v);
    setPatenteAdicionalId(null);
    const f = filterStartsWith(patentes, 'numero_patente', v);
    setPatenteASuggestions(f);
    setShowPatenteASuggestions(f.length > 0);
    setPatenteAHighlight(-1);
  };

  const handlePatenteAKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && showPatenteASuggestions && patenteASuggestions.length > 0) {
      e.preventDefault();
      const i = patenteAHighlight >= 0 ? patenteAHighlight : 0;
      if (patenteASuggestions[i]) {
        selectPatenteA(patenteASuggestions[i]);
        return;
      }
    }
    
    if (!showPatenteASuggestions || patenteASuggestions.length === 0) {
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPatenteAHighlight(p => p < patenteASuggestions.length - 1 ? p + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPatenteAHighlight(p => p > 0 ? p - 1 : patenteASuggestions.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const i = patenteAHighlight >= 0 ? patenteAHighlight : 0;
      if (patenteASuggestions[i]) selectPatenteA(patenteASuggestions[i]);
    } else if (e.key === 'Escape') {
      setShowPatenteASuggestions(false);
      setPatenteAHighlight(-1);
    }
  };

  const selectPatenteA = (p: any) => {
    setPatenteAdicional(p.numero_patente || '');
    setPatenteAdicionalId(p.id);
    setShowPatenteASuggestions(false);
    setPatenteAHighlight(-1);
  };

  // Guardar Manual
  const handleGuardarManual = async (estado: string) => {
    if (!fechaProgramacion) {
      setMensaje('Selecciona fecha de programación');
      setTipoMensaje('error');
      return;
    }
    if (!conductorId) {
      setMensaje('Selecciona un conductor válido de la lista');
      setTipoMensaje('error');
      return;
    }
    if (!patentePrincipalId) {
      setMensaje('Selecciona una patente principal válida de la lista');
      setTipoMensaje('error');
      return;
    }
    const localesValidos = locales.filter(l => l.codigoLocal.trim());
    if (localesValidos.length === 0) {
      setMensaje('Agrega al menos un local');
      setTipoMensaje('error');
      return;
    }

    setGuardando(true);
    try {
      const user = auth.getUsuario();
      const idDocumento = await generarIdDocumento();
      console.log('ID generado:', idDocumento);

      const body = {
        id_documento: idDocumento,
        conductor_id: conductorId,
        patente_principal_id: patentePrincipalId,
        patente_adicional_id: patenteAdicionalId || null,
        fecha_programacion: fechaProgramacion,
        observaciones: observaciones || '',
        estado: estado,
        creado_por: user?.id,
        creado_en: new Date().toISOString(),
      };

      console.log('Guardando transporte:', body);

      const headers = getHeaders(true);
      const resp = await fetch(`${API_URL}/sd01_documentos`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Error response:', errorText);
        throw new Error(`Error al crear transporte: ${resp.status} - ${errorText}`);
      }

      // Guardar locales
      for (const loc of localesValidos) {
        await fetch(`${API_URL}/sd01_documento_locales`, {
          method: 'POST',
          headers: getHeaders(true),
          body: JSON.stringify({
            documento_id: idDocumento,
            codigo_local: loc.codigoLocal,
            nombre_local: loc.nombreLocal,
            fecha_entrega: loc.fechaEntrega || null,
            hora_entrega: loc.horaEntrega || null,
            sello_trasero: '',
            cantidad_pallet: 0,
            total_carga: 0
          }),
        });
      }

      setMensaje(`✅ Transporte ${idDocumento} creado`);
      setTipoMensaje('success');
      setTimeout(() => {
        setShowCrearModal(false);
        limpiarFormulario();
        setMensaje('');
      }, 1500);
      cargarTransportes();
    } catch (e: any) {
      console.error('Error guardando:', e);
      setMensaje('Error: ' + e.message);
      setTipoMensaje('error');
    } finally {
      setGuardando(false);
    }
  };

  const limpiarFormulario = () => {
    setFechaProgramacion('');
    setConductor('');
    setConductorId(null);
    setPatentePrincipal('');
    setPatentePrincipalId(null);
    setPatenteAdicional('');
    setPatenteAdicionalId(null);
    setObservaciones('');
    setLocales([{ id: 1, codigoLocal: '', nombreLocal: '', fechaEntrega: '', horaEntrega: '' }]);
  };

  // ============ VER, EDITAR, CANCELAR ============
  const handleVer = async (transporte: any) => {
    setTransporteSeleccionado(transporte);
    try {
      const headers = getHeaders(false);
      const resp = await fetch(
        `${API_URL}/sd01_documento_locales?select=*&documento_id=eq.${transporte.id_documento}`,
        { headers }
      );
      const data = await resp.json();
      setLocalesSeleccionados(data || []);
      setShowVerModal(true);
    } catch (e) {
      console.error('Error cargando locales:', e);
      setLocalesSeleccionados([]);
      setShowVerModal(true);
    }
  };

  const handleEditar = async (transporte: any) => {
    setTransporteSeleccionado(transporte);
    try {
      const headers = getHeaders(false);
      const resp = await fetch(
        `${API_URL}/sd01_documento_locales?select=*&documento_id=eq.${transporte.id_documento}`,
        { headers }
      );
      const data = await resp.json();
      setLocalesSeleccionados(data || []);
      setShowEditarModal(true);
    } catch (e) {
      console.error('Error cargando locales:', e);
      setLocalesSeleccionados([]);
      setShowEditarModal(true);
    }
  };

  const handleCancelar = (transporte: any) => {
    setTransporteSeleccionado(transporte);
    setShowCancelarModal(true);
  };

  const handleGuardarEdicion = async (data: any) => {
    try {
      console.log('Guardando edición:', data);

      const headers = getHeaders(true);
      await fetch(`${API_URL}/sd01_documentos?id_documento=eq.${data.id_documento}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fecha_programacion: data.fecha_programacion,
          conductor_id: data.conductor_id,
          patente_principal_id: data.patente_principal_id,
          patente_adicional_id: data.patente_adicional_id || null,
          observaciones: data.observaciones || '',
          modificado_por: auth.getUsuario()?.id,
          modificado_en: new Date().toISOString(),
        }),
      });

      // Eliminar locales existentes
      await fetch(`${API_URL}/sd01_documento_locales?documento_id=eq.${data.id_documento}`, {
        method: 'DELETE',
        headers: getHeaders(false),
      });

      // Insertar nuevos locales
      for (const loc of data.locales) {
        await fetch(`${API_URL}/sd01_documento_locales`, {
          method: 'POST',
          headers: getHeaders(true),
          body: JSON.stringify({
            documento_id: data.id_documento,
            codigo_local: loc.codigoLocal,
            nombre_local: loc.nombreLocal,
            fecha_entrega: loc.fechaEntrega || null,
            hora_entrega: loc.horaEntrega || null,
            sello_trasero: '',
            cantidad_pallet: 0,
            total_carga: 0
          }),
        });
      }

      setShowEditarModal(false);
      cargarTransportes();
      setMensaje('✅ Transporte actualizado correctamente');
      setTipoMensaje('success');
      setTimeout(() => setMensaje(''), 3000);
    } catch (error: any) {
      console.error('Error en edición:', error);
      setMensaje('Error: ' + error.message);
      setTipoMensaje('error');
    }
  };

  const handleConfirmarCancelacion = async (motivo: string) => {
    try {
      const headers = getHeaders(true);
      await fetch(`${API_URL}/sd01_documentos?id_documento=eq.${transporteSeleccionado.id_documento}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          estado: 'Cancelado',
          motivo_cancelacion: motivo,
          modificado_por: auth.getUsuario()?.id,
          modificado_en: new Date().toISOString(),
        }),
      });

      setShowCancelarModal(false);
      cargarTransportes();
      setMensaje('✅ Transporte cancelado correctamente');
      setTipoMensaje('success');
      setTimeout(() => setMensaje(''), 3000);
    } catch (error: any) {
      console.error('Error en cancelación:', error);
      setMensaje('Error: ' + error.message);
      setTipoMensaje('error');
    }
  };

  // ============ CARGA EXCEL ============
  const procesarArchivoExcel = () => {
    if (!archivoExcel) {
      setMensajeExcel('Selecciona un archivo');
      return;
    }
    setProcesandoExcel(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][];
        console.log('Filas leídas:', sheet.length);

        const transportesAgrupados: any[][] = [];
        let grupoActual: any[] = [];

        for (const row of sheet) {
          const tieneDatos = row.some((cell: any) => cell !== undefined && cell !== null && String(cell).trim() !== '');
          if (!tieneDatos) {
            if (grupoActual.length > 0) {
              transportesAgrupados.push(grupoActual);
              grupoActual = [];
            }
          } else {
            grupoActual.push(row);
          }
        }
        if (grupoActual.length > 0) transportesAgrupados.push(grupoActual);

        console.log('Grupos encontrados:', transportesAgrupados.length);

        const vista: any[] = [];
        for (const grupo of transportesAgrupados) {
          if (grupo.length < 2) continue;

          const headerRow = grupo[0];
          const colCodTi = headerRow.findIndex((h: any) => {
            const header = String(h || '').trim().toUpperCase();
            return header === 'CÓD TI' || header === 'COD TI' || header === 'CODIGO TI';
          });
          const colTienda = headerRow.findIndex((h: any) => String(h || '').trim().toUpperCase() === 'TIENDA');
          const colConductor = headerRow.findIndex((h: any) => String(h || '').trim().toUpperCase() === 'CONDUCTOR');
          const colVehiculo = headerRow.findIndex((h: any) => {
            const header = String(h || '').trim().toUpperCase();
            return header === 'VEHÍCULO' || header === 'VEHICULO' || header === 'PATENTE';
          });
          const colFecha = headerRow.findIndex((h: any) => String(h || '').trim().toUpperCase() === 'FECHA ENTREGA');
          const colHora = headerRow.findIndex((h: any) => String(h || '').trim().toUpperCase() === 'HORA ENTREGA');

          if (colCodTi === -1) {
            console.warn('Columna CÓD TI no encontrada en grupo:', grupo[0]);
            continue;
          }

          const conductorNombre = String(grupo[1][colConductor] || '').trim();
          const patente = String(grupo[1][colVehiculo] || '').trim();
          const fechaEntrega = String(grupo[1][colFecha] || '').trim();
          const horaEntrega = String(grupo[1][colHora] || '').trim();

          const localesTransporte: any[] = [];
          for (let i = 1; i < grupo.length; i++) {
            const row = grupo[i];
            const codTi = String(row[colCodTi] || '').trim();
            const tienda = String(row[colTienda] || '').trim();
            if (codTi) {
              localesTransporte.push({ codigo: codTi, nombre: tienda });
            }
          }

          vista.push({
            conductor: conductorNombre,
            patente: patente,
            fechaEntrega: fechaEntrega,
            horaEntrega: horaEntrega,
            locales: localesTransporte,
            totalLocales: localesTransporte.length,
          });
        }

        setVistaPrevia(vista);
        setProcesandoExcel(false);
        if (vista.length === 0) {
          setMensajeExcel('⚠️ No se encontraron transportes válidos. Verifica el formato del archivo.');
        } else {
          setMensajeExcel(`✅ ${vista.length} transporte(s) encontrado(s)`);
        }
      } catch (error: any) {
        setMensajeExcel('Error al procesar archivo: ' + error.message);
        setProcesandoExcel(false);
      }
    };
    reader.onerror = () => {
      setMensajeExcel('Error al leer el archivo');
      setProcesandoExcel(false);
    };
    reader.readAsArrayBuffer(archivoExcel);
  };

  const guardarTransportesExcel = async () => {
    if (vistaPrevia.length === 0) return;
    setProcesandoExcel(true);
    setMensajeExcel('');
    try {
      const user = auth.getUsuario();
      let creados = 0;
      let errores = 0;

      for (const t of vistaPrevia) {
        const conductorData = conductores.find((c: any) =>
          c.nombre_completo?.toUpperCase() === t.conductor.toUpperCase()
        );
        const patenteData = patentes.find((p: any) =>
          p.numero_patente?.toUpperCase() === t.patente.toUpperCase()
        );

        if (!conductorData) {
          console.warn('Conductor no encontrado:', t.conductor);
          errores++;
          continue;
        }
        if (!patenteData) {
          console.warn('Patente no encontrada:', t.patente);
          errores++;
          continue;
        }

        const idDocumento = await generarIdDocumento();
        const headers = getHeaders(true);

        await fetch(`${API_URL}/sd01_documentos`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            id_documento: idDocumento,
            conductor_id: conductorData.id,
            patente_principal_id: patenteData.id,
            fecha_programacion: new Date().toISOString().split('T')[0],
            observaciones: '',
            estado: 'Pendiente',
            creado_por: user?.id,
            creado_en: new Date().toISOString(),
          }),
        });

        for (const loc of t.locales) {
          await fetch(`${API_URL}/sd01_documento_locales`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              documento_id: idDocumento,
              codigo_local: loc.codigo,
              nombre_local: loc.nombre,
              fecha_entrega: t.fechaEntrega || null,
              hora_entrega: t.horaEntrega || null,
              sello_trasero: '',
              cantidad_pallet: 0,
              total_carga: 0,
            }),
          });
        }
        creados++;
      }

      setMensajeExcel(`✅ ${creados} transporte(s) creado(s). ${errores > 0 ? `⚠️ ${errores} con errores.` : ''}`);
      setTimeout(() => {
        setShowExcelModal(false);
        setVistaPrevia([]);
        setArchivoExcel(null);
        setNombreArchivoExcel('');
        setMensajeExcel('');
      }, 2000);
      cargarTransportes();
    } catch (e: any) {
      setMensajeExcel('Error: ' + e.message);
    } finally {
      setProcesandoExcel(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Borrador': return { color: '#64748b', bg: '#f1f5f9' };
      case 'Pendiente': return { color: '#b45309', bg: '#fef3c7' };
      case 'Asignado': return { color: '#1d4ed8', bg: '#dbeafe' };
      case 'En Proceso': return { color: '#7c3aed', bg: '#ede9fe' };
      case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' };
      case 'Cancelado': return { color: '#dc2626', bg: '#fef2f2' };
      default: return { color: '#64748b', bg: '#f1f5f9' };
    }
  };

  const puedeEditar = (estado: string) => {
    return estado !== 'Finalizado' && estado !== 'Cancelado';
  };

  const puedeCancelar = (estado: string) => {
    return estado !== 'Cancelado' && estado !== 'Finalizado';
  };

  return (
    <div className="sd01-view">
      <div className="sd01-header">
        <h2>SD01 · Gestión de Transportes</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="sd01-btn-nueva"
            onClick={() => {
              limpiarFormulario();
              setShowCrearModal(true);
              setTimeout(() => conductorRef.current?.focus(), 100);
            }}
          >
            + Nuevo Transporte
          </button>
          <button
            className="sd01-btn-nueva"
            style={{ background: '#1d4ed8' }}
            onClick={() => {
              setShowExcelModal(true);
              setVistaPrevia([]);
              setArchivoExcel(null);
              setNombreArchivoExcel('');
              setMensajeExcel('');
            }}
          >
            📁 Carga Excel
          </button>
        </div>
      </div>

      {mensaje && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          background: tipoMensaje === 'success' ? '#dcfce7' : '#fef2f2',
          color: tipoMensaje === 'success' ? '#15803d' : '#dc2626',
        }}>
          {mensaje}
        </div>
      )}

      {/* TABLA */}
      <div className="ed03-tabla-container">
        <table className="ed03-tabla">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha Prog.</th>
              <th>Conductor</th>
              <th>Patente</th>
              <th>Locales</th>
              <th>Estado</th>
              <th>Creado</th>
              <th style={{ width: '240px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr>
            ) : transportes.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Sin transportes</td></tr>
            ) : (
              transportes.map((t: any) => {
                const eb = getEstadoBadge(t.estado);
                return (
                  <tr key={t.id} style={{
                    background: t.estado === 'Cancelado' ? '#fef2f2' :
                               t.estado === 'Finalizado' ? '#f0fdf4' :
                               t.estado === 'Asignado' ? '#eff6ff' :
                               t.estado === 'En Proceso' ? '#f5f3ff' : 'transparent'
                  }}>
                    <td className="ed03-ticket-id">{t.id_documento}</td>
                    <td>
                      {t.fecha_programacion ? new Date(t.fecha_programacion + 'T00:00:00').toLocaleDateString('es-CL') : '-'}
                    </td>
                    <td>{t.nombre_conductor || '-'}</td>
                    <td>{t.numero_patente || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{t.total_locales || 0}</td>
                    <td>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: eb.bg,
                        color: eb.color
                      }}>
                        {t.estado}
                      </span>
                    </td>
                    <td>{new Date(t.creado_en).toLocaleDateString('es-CL')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleVer(t)}
                          style={{
                            padding: '5px 10px',
                            background: '#1a1f2e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Ver
                        </button>
                        {puedeEditar(t.estado) && (
                          <button
                            onClick={() => handleEditar(t)}
                            style={{
                              padding: '5px 10px',
                              background: '#b45309',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            Editar
                          </button>
                        )}
                        {puedeCancelar(t.estado) && (
                          <button
                            onClick={() => handleCancelar(t)}
                            style={{
                              padding: '5px 10px',
                              background: '#dc2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR MANUAL */}
      {showCrearModal && (
        <div className="ed01-modal-overlay" onClick={() => !guardando && setShowCrearModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '800px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header">
              <h2>Nuevo Transporte</h2>
              <button className="ed01-modal-close" onClick={() => setShowCrearModal(false)}>×</button>
            </div>
            <div className="ed01-modal-body">
              {/* El contenido del modal es igual al anterior */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Fecha Programación *
                </label>
                <input
                  type="date"
                  value={fechaProgramacion}
                  onChange={e => setFechaProgramacion(e.target.value)}
                  style={{ width: '200px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Conductor *
                  </label>
                  <input
                    ref={conductorRef}
                    type="text"
                    value={conductor}
                    onChange={e => handleConductorChange(e.target.value)}
                    onFocus={() => { if (conductor) handleConductorChange(conductor); }}
                    onKeyDown={handleConductorKeyDown}
                    placeholder="Buscar..."
                    autoComplete="off"
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                  />
                  {showConductorSuggestions && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '2px solid #3b82f6',
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 10,
                      maxHeight: '180px',
                      overflowY: 'auto'
                    }}>
                      {conductorSuggestions.map((c: any, i: number) => (
                        <div
                          key={c.id}
                          onClick={() => selectConductor(c)}
                          style={{
                            padding: '10px 14px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            background: i === conductorHighlight ? '#1d4ed8' : 'white',
                            color: i === conductorHighlight ? 'white' : '#1e293b',
                            fontWeight: i === conductorHighlight ? 600 : 400,
                            borderBottom: '1px solid #f1f5f9'
                          }}
                        >
                          {c.nombre_completo}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Patente Principal *
                  </label>
                  <input
                    ref={patentePRef}
                    type="text"
                    value={patentePrincipal}
                    onChange={e => handlePatentePChange(e.target.value)}
                    onFocus={() => { if (patentePrincipal) handlePatentePChange(patentePrincipal); }}
                    onKeyDown={handlePatentePKeyDown}
                    placeholder="Buscar..."
                    autoComplete="off"
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                  />
                  {showPatentePSuggestions && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '2px solid #3b82f6',
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 10,
                      maxHeight: '180px',
                      overflowY: 'auto'
                    }}>
                      {patentePSuggestions.map((p: any, i: number) => (
                        <div
                          key={p.id}
                          onClick={() => selectPatenteP(p)}
                          style={{
                            padding: '10px 14px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            background: i === patentePHighlight ? '#1d4ed8' : 'white',
                            color: i === patentePHighlight ? 'white' : '#1e293b',
                            fontWeight: i === patentePHighlight ? 600 : 400,
                            borderBottom: '1px solid #f1f5f9'
                          }}
                        >
                          {p.numero_patente}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Patente Adicional
                  </label>
                  <input
                    ref={patenteARef}
                    type="text"
                    value={patenteAdicional}
                    onChange={e => handlePatenteAChange(e.target.value)}
                    onFocus={() => { if (patenteAdicional) handlePatenteAChange(patenteAdicional); }}
                    onKeyDown={handlePatenteAKeyDown}
                    placeholder="Buscar..."
                    autoComplete="off"
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                  />
                  {showPatenteASuggestions && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '2px solid #3b82f6',
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 10,
                      maxHeight: '180px',
                      overflowY: 'auto'
                    }}>
                      {patenteASuggestions.map((p: any, i: number) => (
                        <div
                          key={p.id}
                          onClick={() => selectPatenteA(p)}
                          style={{
                            padding: '10px 14px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            background: i === patenteAHighlight ? '#1d4ed8' : 'white',
                            color: i === patenteAHighlight ? 'white' : '#1e293b',
                            fontWeight: i === patenteAHighlight ? 600 : 400,
                            borderBottom: '1px solid #f1f5f9'
                          }}
                        >
                          {p.numero_patente}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Locales */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Locales *</label>
                  <button
                    onClick={addLocal}
                    style={{ padding: '6px 14px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    + Agregar
                  </button>
                </div>
                <div style={{ border: '1px solid #eef0f5', borderRadius: '8px', overflow: 'auto', maxHeight: '200px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#fafcff' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Código</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Nombre</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Fecha Entrega</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Hora</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {locales.map((loc) => (
                        <tr key={loc.id}>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={loc.codigoLocal}
                              onChange={e => updateLocal(loc.id, 'codigoLocal', e.target.value.toUpperCase())}
                              placeholder="T001"
                              maxLength={4}
                              style={{ width: '80px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={loc.nombreLocal}
                              readOnly
                              placeholder="Auto"
                              style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', background: '#f8fafd', color: '#64748b' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="date"
                              value={loc.fechaEntrega}
                              onChange={e => updateLocal(loc.id, 'fechaEntrega', e.target.value)}
                              style={{ width: '130px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <select
                              value={loc.horaEntrega}
                              onChange={e => updateLocal(loc.id, 'horaEntrega', e.target.value)}
                              style={{ width: '100px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }}
                            >
                              <option value="">--</option>
                              {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {locales.length > 1 && (
                              <button
                                onClick={() => removeLocal(loc.id)}
                                style={{ width: '24px', height: '24px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Observaciones
                </label>
                <textarea
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  rows={2}
                  placeholder="Observaciones..."
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              {mensaje && (
                <div style={{
                  marginBottom: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: tipoMensaje === 'success' ? '#dcfce7' : '#fef2f2',
                  color: tipoMensaje === 'success' ? '#15803d' : '#dc2626'
                }}>
                  {mensaje}
                </div>
              )}
            </div>

            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => setShowCrearModal(false)}>
                Cancelar
              </button>
              <button
                className="ed01-btn-save"
                style={{ background: '#f59e0b' }}
                onClick={() => handleGuardarManual('Borrador')}
                disabled={guardando}
              >
                {guardando ? '...' : 'Guardar Borrador'}
              </button>
              <button
                className="ed01-btn-save"
                onClick={() => handleGuardarManual('Pendiente')}
                disabled={guardando}
              >
                {guardando ? '...' : 'Crear Transporte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCEL */}
      {showExcelModal && (
        <div className="ed01-modal-overlay" onClick={() => !procesandoExcel && setShowExcelModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '700px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header">
              <h2>Carga Masiva por Excel</h2>
              <button className="ed01-modal-close" onClick={() => setShowExcelModal(false)}>×</button>
            </div>
            <div className="ed01-modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                  Archivo Excel (.xlsx)
                </label>
                <div
                  onClick={() => document.getElementById('file-excel-sd')?.click()}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '28px',
                    border: '2px dashed #e2e8f0',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: '#fafcff',
                    color: '#94a3b8',
                    fontSize: '13px'
                  }}
                >
                  <input
                    id="file-excel-sd"
                    type="file"
                    accept=".xlsx,.xls"
                    hidden
                    onChange={(e: any) => {
                      setArchivoExcel(e.target.files?.[0] || null);
                      setNombreArchivoExcel(e.target.files?.[0]?.name || '');
                      setVistaPrevia([]);
                    }}
                  />
                  {nombreArchivoExcel ? (
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>{nombreArchivoExcel}</span>
                  ) : (
                    <><span>Seleccionar archivo</span></>
                  )}
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                Columnas: <strong>Cód TI, Tienda, Conductor, Vehículo, Fecha Entrega, Hora Entrega</strong><br />
                Los transportes se separan por una fila en blanco.
              </p>

              {archivoExcel && (
                <button
                  className="sd01-btn-nueva"
                  onClick={procesarArchivoExcel}
                  style={{ marginBottom: '12px' }}
                >
                  🔍 Analizar archivo
                </button>
              )}

              {vistaPrevia.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                    {vistaPrevia.length} transporte(s) encontrado(s):
                  </h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {vistaPrevia.map((t: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          padding: '10px',
                          marginBottom: '8px',
                          background: '#f8fafd',
                          borderRadius: '8px',
                          border: '1px solid #eef0f5',
                          fontSize: '13px'
                        }}
                      >
                        <div>
                          <strong>Conductor:</strong> {t.conductor} | <strong>Patente:</strong> {t.patente} |
                          <strong>Fecha:</strong> {t.fechaEntrega} | <strong>Hora:</strong> {t.horaEntrega}
                        </div>
                        <div style={{ marginTop: '4px', color: '#64748b' }}>
                          {t.totalLocales} locales: {t.locales.map((l: any) => l.codigo + ' ' + l.nombre).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mensajeExcel && (
                <div style={{
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: mensajeExcel.includes('✅') ? '#dcfce7' : '#fef2f2',
                  color: mensajeExcel.includes('✅') ? '#15803d' : '#dc2626'
                }}>
                  {mensajeExcel}
                </div>
              )}
            </div>

            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => setShowExcelModal(false)}>
                Cancelar
              </button>
              {vistaPrevia.length > 0 && (
                <button
                  className="ed01-btn-save"
                  onClick={guardarTransportesExcel}
                  disabled={procesandoExcel}
                >
                  {procesandoExcel ? 'Creando...' : `Crear ${vistaPrevia.length} Transportes`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALES VER, EDITAR, CANCELAR */}
      <SD01VerModal
        isOpen={showVerModal}
        transporte={transporteSeleccionado}
        locales={localesSeleccionados}
        onClose={() => setShowVerModal(false)}
        onEditar={() => {
          setShowVerModal(false);
          if (transporteSeleccionado) handleEditar(transporteSeleccionado);
        }}
        onCancelar={() => {
          setShowVerModal(false);
          if (transporteSeleccionado) handleCancelar(transporteSeleccionado);
        }}
      />

      <SD01EditarModal
        isOpen={showEditarModal}
        transporte={transporteSeleccionado}
        localesAsignados={localesSeleccionados}
        conductores={conductores}
        patentes={patentes}
        onClose={() => setShowEditarModal(false)}
        onGuardar={handleGuardarEdicion}
        onCancelar={() => setShowEditarModal(false)}
      />

      <SD01CancelarModal
        isOpen={showCancelarModal}
        transporte={transporteSeleccionado}
        onClose={() => setShowCancelarModal(false)}
        onConfirmar={handleConfirmarCancelacion}
      />
    </div>
  );
};

export default SD01View;
