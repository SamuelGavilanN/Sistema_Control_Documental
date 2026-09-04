// src/components/Transactions/SD/SD01CrearTransporte.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import { generarIdTransporte } from '../../../lib/generarIdTransporte';
import './SD01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

// Listas fijas
const EMPRESAS_VALIDAS = [
  'FASHIONSPARK',
  'COTELEY',
  'VERONICA FERNANDEZ',
  'FEDEX',
  'HUARA'
];

const TIPOS_VEHICULOS = [
  'CAMION',
  'FURGON',
  'RAMPLA',
  'TRACTO'
];

interface SD01CrearTransporteProps {
  onClose: () => void;
  onTransporteCreado: () => void;
  transporteEditar?: any;
}

const SD01CrearTransporte: React.FC<SD01CrearTransporteProps> = ({ onClose, onTransporteCreado, transporteEditar }) => {
  const usuario: any = auth.getUsuario();
  const esEdicion = !!transporteEditar;

  const [fechaProgramacion, setFechaProgramacion] = useState('');
  const [conductorId, setConductorId] = useState('');
  const [conductorTexto, setConductorTexto] = useState('');
  const [patentePrincipalId, setPatentePrincipalId] = useState('');
  const [patentePrincipalTexto, setPatentePrincipalTexto] = useState('');
  const [patenteAdicionalId, setPatenteAdicionalId] = useState('');
  const [patenteAdicionalTexto, setPatenteAdicionalTexto] = useState('');
  const [locales, setLocales] = useState<any[]>([{ id: null, codigo_local: '', nombre_local: '', fecha_entrega: '', hora_entrega: '', cantidad_solicitada: '' }]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const [conductores, setConductores] = useState<any[]>([]);
  const [patentes, setPatentes] = useState<any[]>([]);
  const [todosLocales, setTodosLocales] = useState<any[]>([]);

  // Autocompletado
  const [mostrarSugerenciasConductor, setMostrarSugerenciasConductor] = useState(false);
  const [sugerenciasConductor, setSugerenciasConductor] = useState<any[]>([]);
  const [indiceSeleccionadoConductor, setIndiceSeleccionadoConductor] = useState(-1);

  const [mostrarSugerenciasPatentePrincipal, setMostrarSugerenciasPatentePrincipal] = useState(false);
  const [sugerenciasPatentePrincipal, setSugerenciasPatentePrincipal] = useState<any[]>([]);
  const [indiceSeleccionadoPatentePrincipal, setIndiceSeleccionadoPatentePrincipal] = useState(-1);

  const [mostrarSugerenciasPatenteAdicional, setMostrarSugerenciasPatenteAdicional] = useState(false);
  const [sugerenciasPatenteAdicional, setSugerenciasPatenteAdicional] = useState<any[]>([]);
  const [indiceSeleccionadoPatenteAdicional, setIndiceSeleccionadoPatenteAdicional] = useState(-1);

  const inputConductorRef = useRef<HTMLInputElement>(null);
  const inputPatentePrincipalRef = useRef<HTMLInputElement>(null);
  const inputPatenteAdicionalRef = useRef<HTMLInputElement>(null);
  const sugerenciasConductorRef = useRef<HTMLDivElement>(null);

  // Modales para agregar conductor y patente
  const [showModalConductor, setShowModalConductor] = useState(false);
  const [showModalPatente, setShowModalPatente] = useState(false);

  // Estados para nuevo conductor
  const [nuevoConductor, setNuevoConductor] = useState({
    nombre: '',
    apellido: '',
    numero_documento: '',
    telefono: '',
    empresa: 'FASHIONSPARK'
  });

  // Estados para nueva patente
  const [nuevaPatente, setNuevaPatente] = useState({
    numero_patente: '',
    tipo_vehiculo: 'CAMION',
    cantidad_sellos: 0
  });

  useEffect(() => {
    cargarConductores();
    cargarPatentes();
    cargarLocales();

    if (esEdicion && transporteEditar) {
      cargarDatosEdicion();
    }
  }, []);

  const cargarDatosEdicion = async () => {
    if (transporteEditar.fecha_programacion) {
      const fecha = transporteEditar.fecha_programacion;
      setFechaProgramacion(fecha.includes('T') ? fecha.split('T')[0] : fecha);
    }

    if (transporteEditar.conductor_id) {
      try {
        const resp = await fetch(API_URL + '/conductores?select=*&id=eq.' + transporteEditar.conductor_id, { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) {
          setConductorId(data[0].id);
          setConductorTexto(data[0].nombre + ' ' + data[0].apellido);
        }
      } catch (e) {}
    }

    if (transporteEditar.patente_principal_id) {
      try {
        const resp = await fetch(API_URL + '/patentes?select=*&id=eq.' + transporteEditar.patente_principal_id, { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) {
          setPatentePrincipalId(data[0].id);
          setPatentePrincipalTexto(data[0].numero_patente);
        }
      } catch (e) {}
    }

    if (transporteEditar.patente_adicional_id) {
      try {
        const resp = await fetch(API_URL + '/patentes?select=*&id=eq.' + transporteEditar.patente_adicional_id, { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) {
          setPatenteAdicionalId(data[0].id);
          setPatenteAdicionalTexto(data[0].numero_patente);
        }
      } catch (e) {}
    }

    try {
      const resp = await fetch(API_URL + '/sd01_documento_locales?select=*&documento_id=eq.' + transporteEditar.id_documento, { headers: HEADERS });
      const data = await resp.json();
      if (data && data.length > 0) {
        const localesData = data.map((l: any) => ({
          id: l.id,
          codigo_local: l.codigo_local || '',
          nombre_local: l.nombre_local || '',
          fecha_entrega: l.fecha_entrega || '',
          hora_entrega: l.hora_entrega || '',
          cantidad_solicitada: l.cantidad_solicitada || ''
        }));
        setLocales(localesData);
      }
    } catch (e) {}
  };

  const cargarConductores = async () => {
    try {
      const resp = await fetch(API_URL + '/conductores?select=*&activo=eq.true&order=nombre.asc', { headers: HEADERS });
      const data = await resp.json();
      if (data) setConductores(data);
    } catch (e) {
      console.error('Error cargando conductores:', e);
    }
  };

  const cargarPatentes = async () => {
    try {
      const resp = await fetch(API_URL + '/patentes?select=*&activo=eq.true&order=numero_patente.asc', { headers: HEADERS });
      const data = await resp.json();
      if (data) setPatentes(data);
    } catch (e) {
      console.error('Error cargando patentes:', e);
    }
  };

  const cargarLocales = async () => {
    try {
      const resp = await fetch(API_URL + '/locales?select=*&activo=eq.true&order=codigo_local.asc', { headers: HEADERS });
      const data = await resp.json();
      if (data) setTodosLocales(data);
    } catch (e) {
      console.error('Error cargando locales:', e);
    }
  };

  // Funciones de autocompletado (iguales a antes)
  const handleBuscarConductor = (valor: string) => {
    setConductorTexto(valor);
    setConductorId('');

    if (valor.trim() === '') {
      setSugerenciasConductor([]);
      setMostrarSugerenciasConductor(false);
      setIndiceSeleccionadoConductor(-1);
      return;
    }

    const palabras = valor.trim().split(/\s+/);
    let sugerencias: any[] = [];

    if (palabras.length === 1) {
      const busqueda = palabras[0];
      sugerencias = conductores.filter((c: any) => {
        const nombre = String(c.nombre || '').toLowerCase();
        const apellido = String(c.apellido || '').toLowerCase();
        const empresa = String(c.empresa || '').toLowerCase();
        return nombre.startsWith(busqueda.toLowerCase()) ||
               apellido.startsWith(busqueda.toLowerCase()) ||
               empresa.startsWith(busqueda.toLowerCase());
      });
    } else if (palabras.length >= 2) {
      const busqueda1 = palabras[0].toLowerCase();
      const busqueda2 = palabras[1].toLowerCase();
      sugerencias = conductores.filter((c: any) => {
        const nombre = String(c.nombre || '').toLowerCase();
        const apellido = String(c.apellido || '').toLowerCase();
        return (nombre.startsWith(busqueda1) && apellido.startsWith(busqueda2)) ||
               (apellido.startsWith(busqueda1) && nombre.startsWith(busqueda2));
      });
    }

    setSugerenciasConductor(sugerencias);
    setMostrarSugerenciasConductor(sugerencias.length > 0);
    setIndiceSeleccionadoConductor(-1);
  };

  const handleSeleccionarConductor = (conductor: any) => {
    setConductorId(conductor.id);
    setConductorTexto(conductor.nombre + ' ' + conductor.apellido);
    setMostrarSugerenciasConductor(false);
    setSugerenciasConductor([]);
    setIndiceSeleccionadoConductor(-1);
    if (inputConductorRef.current) inputConductorRef.current.focus();
  };

  const handleKeyDownConductor = (e: any) => {
    if (!mostrarSugerenciasConductor || sugerenciasConductor.length === 0) {
      if (e.key === 'Enter') { e.preventDefault(); return; }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceSeleccionadoConductor((prev: number) => prev < sugerenciasConductor.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceSeleccionadoConductor((prev: number) => prev > 0 ? prev - 1 : sugerenciasConductor.length - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (indiceSeleccionadoConductor >= 0 && indiceSeleccionadoConductor < sugerenciasConductor.length) {
        handleSeleccionarConductor(sugerenciasConductor[indiceSeleccionadoConductor]);
      } else if (sugerenciasConductor.length === 1) {
        handleSeleccionarConductor(sugerenciasConductor[0]);
      }
    } else if (e.key === 'Escape') {
      setMostrarSugerenciasConductor(false);
    }
  };

  // (Funciones de patente principal y adicional iguales a antes)
  const handleBuscarPatentePrincipal = (valor: string) => {
    setPatentePrincipalTexto(valor.toUpperCase());
    setPatentePrincipalId('');
    if (valor.trim() === '') {
      setSugerenciasPatentePrincipal([]);
      setMostrarSugerenciasPatentePrincipal(false);
      setIndiceSeleccionadoPatentePrincipal(-1);
      return;
    }
    const busqueda = valor.toUpperCase();
    const sugerencias = patentes.filter((p: any) => {
      const numeroPatente = String(p.numero_patente || '').toUpperCase();
      return numeroPatente.startsWith(busqueda);
    });
    setSugerenciasPatentePrincipal(sugerencias);
    setMostrarSugerenciasPatentePrincipal(sugerencias.length > 0);
    setIndiceSeleccionadoPatentePrincipal(-1);
  };

  const handleSeleccionarPatentePrincipal = (patente: any) => {
    setPatentePrincipalId(patente.id);
    setPatentePrincipalTexto(patente.numero_patente);
    setMostrarSugerenciasPatentePrincipal(false);
    setSugerenciasPatentePrincipal([]);
    setIndiceSeleccionadoPatentePrincipal(-1);
    if (inputPatentePrincipalRef.current) inputPatentePrincipalRef.current.focus();
  };

  const handleKeyDownPatentePrincipal = (e: any) => {
    if (!mostrarSugerenciasPatentePrincipal || sugerenciasPatentePrincipal.length === 0) {
      if (e.key === 'Enter') { e.preventDefault(); return; }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceSeleccionadoPatentePrincipal((prev: number) => prev < sugerenciasPatentePrincipal.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceSeleccionadoPatentePrincipal((prev: number) => prev > 0 ? prev - 1 : sugerenciasPatentePrincipal.length - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (indiceSeleccionadoPatentePrincipal >= 0 && indiceSeleccionadoPatentePrincipal < sugerenciasPatentePrincipal.length) {
        handleSeleccionarPatentePrincipal(sugerenciasPatentePrincipal[indiceSeleccionadoPatentePrincipal]);
      } else if (sugerenciasPatentePrincipal.length === 1) {
        handleSeleccionarPatentePrincipal(sugerenciasPatentePrincipal[0]);
      }
    } else if (e.key === 'Escape') {
      setMostrarSugerenciasPatentePrincipal(false);
    }
  };

  const handleBuscarPatenteAdicional = (valor: string) => {
    setPatenteAdicionalTexto(valor.toUpperCase());
    setPatenteAdicionalId('');
    if (valor.trim() === '') {
      setSugerenciasPatenteAdicional([]);
      setMostrarSugerenciasPatenteAdicional(false);
      setIndiceSeleccionadoPatenteAdicional(-1);
      return;
    }
    const busqueda = valor.toUpperCase();
    const sugerencias = patentes.filter((p: any) => {
      const numeroPatente = String(p.numero_patente || '').toUpperCase();
      return numeroPatente.startsWith(busqueda) && p.id !== patentePrincipalId;
    });
    setSugerenciasPatenteAdicional(sugerencias);
    setMostrarSugerenciasPatenteAdicional(sugerencias.length > 0);
    setIndiceSeleccionadoPatenteAdicional(-1);
  };

  const handleSeleccionarPatenteAdicional = (patente: any) => {
    setPatenteAdicionalId(patente.id);
    setPatenteAdicionalTexto(patente.numero_patente);
    setMostrarSugerenciasPatenteAdicional(false);
    setSugerenciasPatenteAdicional([]);
    setIndiceSeleccionadoPatenteAdicional(-1);
    if (inputPatenteAdicionalRef.current) inputPatenteAdicionalRef.current.focus();
  };

  const handleKeyDownPatenteAdicional = (e: any) => {
    if (!mostrarSugerenciasPatenteAdicional || sugerenciasPatenteAdicional.length === 0) {
      if (e.key === 'Enter') { e.preventDefault(); return; }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceSeleccionadoPatenteAdicional((prev: number) => prev < sugerenciasPatenteAdicional.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceSeleccionadoPatenteAdicional((prev: number) => prev > 0 ? prev - 1 : sugerenciasPatenteAdicional.length - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (indiceSeleccionadoPatenteAdicional >= 0 && indiceSeleccionadoPatenteAdicional < sugerenciasPatenteAdicional.length) {
        handleSeleccionarPatenteAdicional(sugerenciasPatenteAdicional[indiceSeleccionadoPatenteAdicional]);
      } else if (sugerenciasPatenteAdicional.length === 1) {
        handleSeleccionarPatenteAdicional(sugerenciasPatenteAdicional[0]);
      }
    } else if (e.key === 'Escape') {
      setMostrarSugerenciasPatenteAdicional(false);
    }
  };

  // Funciones de locales
  const handleCodigoLocalChange = (index: number, valor: string) => {
    const nuevosLocales = [...locales];
    nuevosLocales[index].codigo_local = valor.toUpperCase();
    const localEncontrado = todosLocales.find((l: any) => l.codigo_local.toUpperCase() === valor.toUpperCase());
    if (localEncontrado) {
      nuevosLocales[index].nombre_local = localEncontrado.nombre_local;
    } else {
      nuevosLocales[index].nombre_local = '';
    }
    setLocales(nuevosLocales);
  };

  const handleLocalChange = (index: number, campo: string, valor: string) => {
    const nuevosLocales = [...locales];
    nuevosLocales[index][campo] = valor;
    setLocales(nuevosLocales);
  };

  const agregarLocal = () => {
    setLocales([...locales, { id: null, codigo_local: '', nombre_local: '', fecha_entrega: '', hora_entrega: '', cantidad_solicitada: '' }]);
  };

  const eliminarLocal = (index: number) => {
    if (locales.length === 1) {
      setMensaje({ tipo: 'warning', texto: 'Debe tener al menos un local' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
      return;
    }
    const nuevosLocales = locales.filter((_, i) => i !== index);
    setLocales(nuevosLocales);
  };

  const validarFormulario = () => {
    if (!fechaProgramacion) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar una fecha de programación' });
      return false;
    }
    if (!conductorId) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar un conductor de la lista' });
      return false;
    }
    if (!patentePrincipalId) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar una patente principal' });
      return false;
    }
    // Validar duplicados de códigos de local
    const codigos = locales.map(l => l.codigo_local).filter(Boolean);
    const duplicados = codigos.filter((c, i) => codigos.indexOf(c) !== i);
    if (duplicados.length > 0) {
      setMensaje({ tipo: 'error', texto: `El código de local ${duplicados[0]} está repetido en el transporte` });
      return false;
    }
    for (let i = 0; i < locales.length; i++) {
      if (!locales[i].codigo_local) {
        setMensaje({ tipo: 'error', texto: `El local ${i + 1} debe tener un código` });
        return false;
      }
      if (!locales[i].fecha_entrega) {
        setMensaje({ tipo: 'error', texto: `El local ${i + 1} debe tener fecha de entrega` });
        return false;
      }
    }
    return true;
  };

  const handleGuardar = async () => {
    if (!validarFormulario()) {
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
      return;
    }

    setGuardando(true);
    try {
      if (esEdicion) {
        // --- Lógica de guardado para edición ---
        const resp = await fetch(API_URL + '/sd01_documento_locales?select=id,codigo_local&documento_id=eq.' + transporteEditar.id_documento, { headers: HEADERS });
        const existentes = await resp.json();

        const idsActuales = new Set(locales.filter(l => l.id).map(l => l.id));

        for (const existente of existentes) {
          if (!idsActuales.has(existente.id)) {
            await fetch(API_URL + '/sd01_documento_locales?id=eq.' + existente.id, { method: 'DELETE', headers: HEADERS });
          }
        }

        for (const local of locales) {
          if (local.id) {
            await fetch(API_URL + '/sd01_documento_locales?id=eq.' + local.id, {
              method: 'PATCH',
              headers: { ...HEADERS, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                codigo_local: local.codigo_local,
                nombre_local: local.nombre_local,
                fecha_entrega: local.fecha_entrega || null,
                hora_entrega: local.hora_entrega || null,
                cantidad_solicitada: local.cantidad_solicitada ? parseInt(local.cantidad_solicitada) : 0
              })
            });
          } else {
            await fetch(API_URL + '/sd01_documento_locales', {
              method: 'POST',
              headers: { ...HEADERS, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documento_id: transporteEditar.id_documento,
                codigo_local: local.codigo_local,
                nombre_local: local.nombre_local,
                fecha_entrega: local.fecha_entrega || null,
                hora_entrega: local.hora_entrega || null,
                cantidad_solicitada: local.cantidad_solicitada ? parseInt(local.cantidad_solicitada) : 0
              })
            });
          }
        }

        await fetch(API_URL + '/sd01_documentos?id=eq.' + transporteEditar.id, {
          method: 'PATCH',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conductor_id: conductorId,
            patente_principal_id: patentePrincipalId,
            patente_adicional_id: patenteAdicionalId || null,
            fecha_programacion: fechaProgramacion + 'T12:00:00',
            modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
            modificado_en: new Date().toISOString()
          })
        });

      } else {
        // --- Lógica de creación (igual que antes) ---
        const idDocumento = await generarIdTransporte(fechaProgramacion);

        const transporteData = {
          id_documento: idDocumento,
          conductor_id: conductorId,
          patente_principal_id: patentePrincipalId,
          patente_adicional_id: patenteAdicionalId || null,
          fecha_programacion: fechaProgramacion + 'T12:00:00',
          estado: 'Pendiente',
          creado_por: usuario?.id,
          modificado_por: usuario?.nombre + ' ' + usuario?.apellido
        };

        const respTransporte = await fetch(API_URL + '/sd01_documentos', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(transporteData)
        });

        if (!respTransporte.ok) {
          const errorData = await respTransporte.json();
          console.error('Error creando transporte:', errorData);
          setMensaje({ tipo: 'error', texto: 'Error al crear el transporte: ' + (errorData.message || 'Error desconocido') });
          setGuardando(false);
          return;
        }

        for (const local of locales) {
          await fetch(API_URL + '/sd01_documento_locales', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documento_id: idDocumento,
              codigo_local: local.codigo_local,
              nombre_local: local.nombre_local,
              fecha_entrega: local.fecha_entrega || null,
              hora_entrega: local.hora_entrega || null,
              cantidad_solicitada: local.cantidad_solicitada ? parseInt(local.cantidad_solicitada) : 0
            })
          });
        }
      }

      onTransporteCreado();
    } catch (e) {
      console.error('Error:', e);
      setMensaje({ tipo: 'error', texto: 'Error al ' + (esEdicion ? 'editar' : 'crear') + ' el transporte' });
    }
    setGuardando(false);
  };

  // Funciones para guardar nuevo conductor y patente
  const guardarNuevoConductor = async () => {
    if (!nuevoConductor.nombre || !nuevoConductor.apellido) {
      alert('Nombre y apellido son obligatorios');
      return;
    }
    if (!EMPRESAS_VALIDAS.includes(nuevoConductor.empresa)) {
      alert('La empresa debe ser una de la lista: ' + EMPRESAS_VALIDAS.join(', '));
      return;
    }

    try {
      const resp = await fetch(API_URL + '/conductores', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          nombre: nuevoConductor.nombre,
          apellido: nuevoConductor.apellido,
          numero_documento: nuevoConductor.numero_documento || '',
          telefono: nuevoConductor.telefono || '',
          empresa: nuevoConductor.empresa,
          activo: true
        })
      });
      const data = await resp.json();
      const creado = Array.isArray(data) ? data[0] : data;
      if (creado?.id) {
        setConductorId(creado.id);
        setConductorTexto(creado.nombre + ' ' + creado.apellido);
        cargarConductores();
        setShowModalConductor(false);
        setNuevoConductor({ nombre: '', apellido: '', numero_documento: '', telefono: '', empresa: 'FASHIONSPARK' });
      }
    } catch (e) {
      console.error('Error creando conductor:', e);
      alert('Error al crear conductor');
    }
  };

  const guardarNuevaPatente = async () => {
    if (!nuevaPatente.numero_patente) {
      alert('Número de patente es obligatorio');
      return;
    }

    try {
      const cantidadSellos = Number(nuevaPatente.cantidad_sellos) || 0;
      const resp = await fetch(API_URL + '/patentes', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          numero_patente: nuevaPatente.numero_patente.toUpperCase(),
          tipo_vehiculo: nuevaPatente.tipo_vehiculo,
          cantidad_sellos: cantidadSellos,
          activo: true
        })
      });
      const data = await resp.json();
      const creada = Array.isArray(data) ? data[0] : data;
      if (creada?.id) {
        setPatentePrincipalId(creada.id);
        setPatentePrincipalTexto(creada.numero_patente);
        cargarPatentes();
        setShowModalPatente(false);
        setNuevaPatente({ numero_patente: '', tipo_vehiculo: 'CAMION', cantidad_sellos: 0 });
      }
    } catch (e) {
      console.error('Error creando patente:', e);
      alert('Error al crear patente');
    }
  };

  return (
    <div className="sd01-modal-overlay" onClick={onClose}>
      <div className="sd01-modal" onClick={(e: any) => e.stopPropagation()}>
        <div className="sd01-modal-header">
          <h2>{esEdicion ? 'Editar Transporte' : 'Crear Nuevo Transporte'}</h2>
          <button className="sd01-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="sd01-modal-body">
          {mensaje.texto && (
            <div className={'sd01-alert ' + (mensaje.tipo === 'error' ? 'sd01-alert-error' : 'sd01-alert-warning')}>
              {mensaje.texto}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="sd01-form-group">
              <label className="sd01-form-label">Fecha Programación *</label>
              <input type="date" className="sd01-form-input" value={fechaProgramacion} onChange={(e: any) => setFechaProgramacion(e.target.value)} />
            </div>

            <div className="sd01-form-group">
              <label className="sd01-form-label">Conductor *</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div className="sd01-autocomplete-wrapper" style={{ flex: 1 }}>
                  <input ref={inputConductorRef} type="text" className="sd01-autocomplete-input" value={conductorTexto} onChange={(e: any) => handleBuscarConductor(e.target.value)} onKeyDown={handleKeyDownConductor} onFocus={() => { if (conductorTexto.trim() && sugerenciasConductor.length > 0) setMostrarSugerenciasConductor(true); }} onBlur={() => setTimeout(() => setMostrarSugerenciasConductor(false), 200)} placeholder="Buscar conductor..." autoComplete="off" />
                  {conductorId && <span className="sd01-autocomplete-check">✓</span>}
                  {mostrarSugerenciasConductor && sugerenciasConductor.length > 0 && (
                    <div className="sd01-autocomplete-dropdown" ref={sugerenciasConductorRef}>
                      {sugerenciasConductor.map((conductor: any, index: number) => (
                        <div key={conductor.id} className={'sd01-autocomplete-item ' + (index === indiceSeleccionadoConductor ? 'sd01-autocomplete-item-highlighted' : '')} onClick={() => handleSeleccionarConductor(conductor)} onMouseEnter={() => setIndiceSeleccionadoConductor(index)}>
                          <strong>{conductor.nombre} {conductor.apellido}</strong>
                          {conductor.empresa && <span style={{ fontSize: '11px', marginLeft: '8px', opacity: 0.7 }}> - {conductor.empresa}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" className="sd01-btn sd01-btn-primary" onClick={() => setShowModalConductor(true)} title="Nuevo Conductor" style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                  +
                </button>
              </div>
            </div>

            <div className="sd01-form-group">
              <label className="sd01-form-label">Patente Principal *</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div className="sd01-autocomplete-wrapper" style={{ flex: 1 }}>
                  <input ref={inputPatentePrincipalRef} type="text" className="sd01-autocomplete-input" value={patentePrincipalTexto} onChange={(e: any) => handleBuscarPatentePrincipal(e.target.value)} onKeyDown={handleKeyDownPatentePrincipal} onFocus={() => { if (patentePrincipalTexto.trim() && sugerenciasPatentePrincipal.length > 0) setMostrarSugerenciasPatentePrincipal(true); }} onBlur={() => setTimeout(() => setMostrarSugerenciasPatentePrincipal(false), 200)} placeholder="Buscar patente..." autoComplete="off" style={{ textTransform: 'uppercase' }} />
                  {patentePrincipalId && <span className="sd01-autocomplete-check">✓</span>}
                  {mostrarSugerenciasPatentePrincipal && sugerenciasPatentePrincipal.length > 0 && (
                    <div className="sd01-autocomplete-dropdown">
                      {sugerenciasPatentePrincipal.map((patente: any, index: number) => (
                        <div key={patente.id} className={'sd01-autocomplete-item ' + (index === indiceSeleccionadoPatentePrincipal ? 'sd01-autocomplete-item-highlighted' : '')} onClick={() => handleSeleccionarPatentePrincipal(patente)} onMouseEnter={() => setIndiceSeleccionadoPatentePrincipal(index)}>
                          <strong>{patente.numero_patente}</strong>
                          <span style={{ fontSize: '11px', marginLeft: '8px', opacity: 0.7 }}> - {patente.tipo_vehiculo || 'Otro'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" className="sd01-btn sd01-btn-primary" onClick={() => setShowModalPatente(true)} title="Nueva Patente" style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                  +
                </button>
              </div>
            </div>

            <div className="sd01-form-group">
              <label className="sd01-form-label">Patente Adicional (opcional)</label>
              <div className="sd01-autocomplete-wrapper">
                <input ref={inputPatenteAdicionalRef} type="text" className="sd01-autocomplete-input" value={patenteAdicionalTexto} onChange={(e: any) => handleBuscarPatenteAdicional(e.target.value)} onKeyDown={handleKeyDownPatenteAdicional} onFocus={() => { if (patenteAdicionalTexto.trim() && sugerenciasPatenteAdicional.length > 0) setMostrarSugerenciasPatenteAdicional(true); }} onBlur={() => setTimeout(() => setMostrarSugerenciasPatenteAdicional(false), 200)} placeholder="Buscar patente adicional..." autoComplete="off" style={{ textTransform: 'uppercase' }} />
                {patenteAdicionalId && <span className="sd01-autocomplete-check">✓</span>}
                {mostrarSugerenciasPatenteAdicional && sugerenciasPatenteAdicional.length > 0 && (
                  <div className="sd01-autocomplete-dropdown">
                    {sugerenciasPatenteAdicional.map((patente: any, index: number) => (
                      <div key={patente.id} className={'sd01-autocomplete-item ' + (index === indiceSeleccionadoPatenteAdicional ? 'sd01-autocomplete-item-highlighted' : '')} onClick={() => handleSeleccionarPatenteAdicional(patente)} onMouseEnter={() => setIndiceSeleccionadoPatenteAdicional(index)}>
                        <strong>{patente.numero_patente}</strong>
                        <span style={{ fontSize: '11px', marginLeft: '8px', opacity: 0.7 }}> - {patente.tipo_vehiculo || 'Otro'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sd01-locales-section">
            <div className="sd01-locales-header">
              <h3 className="sd01-locales-title">Locales de Entrega</h3>
              <button className="sd01-btn-add-local" onClick={agregarLocal}>
                <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Agregar Local
              </button>
            </div>

            <div className="sd01-locales-list">
              {locales.map((local: any, index: number) => (
                <div key={index} className="sd01-local-card">
                  <div className="sd01-form-group">
                    <label className="sd01-form-label" style={{ fontSize: '12px' }}>Código Local *</label>
                    <input type="text" className="sd01-form-input" value={local.codigo_local} onChange={(e: any) => handleCodigoLocalChange(index, e.target.value)} placeholder="Ej: D001" style={{ textTransform: 'uppercase' }} />
                  </div>
                  <div className="sd01-form-group">
                    <label className="sd01-form-label" style={{ fontSize: '12px' }}>Nombre Local</label>
                    <input type="text" className="sd01-form-input" value={local.nombre_local} readOnly />
                  </div>
                  <div className="sd01-form-group">
                    <label className="sd01-form-label" style={{ fontSize: '12px' }}>Fecha Entrega *</label>
                    <input type="date" className="sd01-form-input" value={local.fecha_entrega} onChange={(e: any) => handleLocalChange(index, 'fecha_entrega', e.target.value)} />
                  </div>
                  <div className="sd01-form-group">
                    <label className="sd01-form-label" style={{ fontSize: '12px' }}>Hora Entrega</label>
                    <input type="time" className="sd01-form-input" value={local.hora_entrega} onChange={(e: any) => handleLocalChange(index, 'hora_entrega', e.target.value)} />
                  </div>
                  <div className="sd01-form-group">
                    <label className="sd01-form-label" style={{ fontSize: '12px' }}>Cantidad Solicitada</label>
                    <input type="number" className="sd01-form-input" value={local.cantidad_solicitada} onChange={(e: any) => handleLocalChange(index, 'cantidad_solicitada', e.target.value)} placeholder="0" min="0" />
                  </div>
                  <button className="sd01-btn-delete-local" onClick={() => eliminarLocal(index)} title="Eliminar local">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sd01-modal-footer">
          <div></div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="sd01-btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="sd01-btn-save" onClick={handleGuardar} disabled={guardando}>
              {guardando ? (esEdicion ? 'Guardando...' : 'Creando...') : (esEdicion ? 'Guardar Cambios' : 'Crear Transporte')}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Nuevo Conductor */}
      {showModalConductor && (
        <div className="sd01-modal-overlay" onClick={() => setShowModalConductor(false)}>
          <div className="sd01-modal" style={{ maxWidth: '500px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="sd01-modal-header">
              <h2>Nuevo Conductor</h2>
              <button className="sd01-modal-close" onClick={() => setShowModalConductor(false)}>×</button>
            </div>
            <div className="sd01-modal-body">
              <div className="sd01-form-group" style={{ marginBottom: '12px' }}>
                <label className="sd01-form-label">Nombre *</label>
                <input type="text" className="sd01-form-input" value={nuevoConductor.nombre} onChange={(e) => setNuevoConductor({ ...nuevoConductor, nombre: e.target.value })} />
              </div>
              <div className="sd01-form-group" style={{ marginBottom: '12px' }}>
                <label className="sd01-form-label">Apellido *</label>
                <input type="text" className="sd01-form-input" value={nuevoConductor.apellido} onChange={(e) => setNuevoConductor({ ...nuevoConductor, apellido: e.target.value })} />
              </div>
              <div className="sd01-form-group" style={{ marginBottom: '12px' }}>
                <label className="sd01-form-label">RUT</label>
                <input type="text" className="sd01-form-input" value={nuevoConductor.numero_documento} onChange={(e) => setNuevoConductor({ ...nuevoConductor, numero_documento: e.target.value })} />
              </div>
              <div className="sd01-form-group" style={{ marginBottom: '12px' }}>
                <label className="sd01-form-label">Teléfono</label>
                <input type="text" className="sd01-form-input" value={nuevoConductor.telefono} onChange={(e) => setNuevoConductor({ ...nuevoConductor, telefono: e.target.value })} />
              </div>
              <div className="sd01-form-group" style={{ marginBottom: '12px' }}>
                <label className="sd01-form-label">Empresa *</label>
                <select className="sd01-form-select" value={nuevoConductor.empresa} onChange={(e) => setNuevoConductor({ ...nuevoConductor, empresa: e.target.value })}>
                  {EMPRESAS_VALIDAS.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="sd01-modal-footer">
              <button className="sd01-btn-cancel" onClick={() => setShowModalConductor(false)}>Cancelar</button>
              <button className="sd01-btn-save" onClick={guardarNuevoConductor}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Patente */}
      {showModalPatente && (
        <div className="sd01-modal-overlay" onClick={() => setShowModalPatente(false)}>
          <div className="sd01-modal" style={{ maxWidth: '500px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="sd01-modal-header">
              <h2>Nueva Patente</h2>
              <button className="sd01-modal-close" onClick={() => setShowModalPatente(false)}>×</button>
            </div>
            <div className="sd01-modal-body">
              <div className="sd01-form-group" style={{ marginBottom: '12px' }}>
                <label className="sd01-form-label">Número Patente *</label>
                <input type="text" className="sd01-form-input" value={nuevaPatente.numero_patente} onChange={(e) => setNuevaPatente({ ...nuevaPatente, numero_patente: e.target.value.toUpperCase() })} />
              </div>
              <div className="sd01-form-group" style={{ marginBottom: '12px' }}>
                <label className="sd01-form-label">Tipo de Vehículo *</label>
                <select className="sd01-form-select" value={nuevaPatente.tipo_vehiculo} onChange={(e) => setNuevaPatente({ ...nuevaPatente, tipo_vehiculo: e.target.value })}>
                  {TIPOS_VEHICULOS.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
              <div className="sd01-form-group" style={{ marginBottom: '12px' }}>
                <label className="sd01-form-label">Cantidad de Sellos</label>
                <input type="number" className="sd01-form-input" value={nuevaPatente.cantidad_sellos} onChange={(e) => setNuevaPatente({ ...nuevaPatente, cantidad_sellos: Number(e.target.value) })} min="0" />
              </div>
            </div>
            <div className="sd01-modal-footer">
              <button className="sd01-btn-cancel" onClick={() => setShowModalPatente(false)}>Cancelar</button>
              <button className="sd01-btn-save" onClick={guardarNuevaPatente}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD01CrearTransporte;
