// src/components/Transactions/RD/RD01View.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import { locales, cargarLocales } from '../../../data/locales';
import RD01Tabla from './RD01Tabla';
import RD01ModalCrear from './RD01ModalCrear';
import RD01ModalDetalle from './RD01ModalDetalle';
import './RD01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const POLLING_INTERVAL = 5000;

interface ColorTipo {
  id: string;
  color: string;
  color_hex: string;
  tipo_devolucion: string;
  almacen_destino: string;
}

const ESTADO_INICIAL = {
  color: '',
  codigo_local: '',
  nombre_local: '',
  numero_solicitud: '',
  numero_guia: '',
  cantidad_bultos: 0,
  total_bultos: 0,
};

const RD01View: React.FC = () => {
  const usuario = auth.getUsuario();
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [coloresTipos, setColoresTipos] = useState<ColorTipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState<any>(null);
  const [form, setForm] = useState({ ...ESTADO_INICIAL });
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'error' | 'success' | 'warning' | 'info'>('info');
  const [guardando, setGuardando] = useState(false);
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});

  const [ordenPendiente, setOrdenPendiente] = useState(false);
  const [bultosRegistrados, setBultosRegistrados] = useState(0);

  const colorSelectRef = useRef<HTMLSelectElement | null>(null);
  const cantidadInputRef = useRef<HTMLInputElement | null>(null);
  const solicitudInputRef = useRef<HTMLInputElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { cargarLocales(); cargarColores(); cargarUsuarios(); cargarOrdenes(); iniciarPolling(); return () => detenerPolling(); }, []);

  const iniciarPolling = () => {
    detenerPolling();
    pollingRef.current = setInterval(() => { cargarOrdenes(false); }, POLLING_INTERVAL);
  };

  const detenerPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const cargarUsuarios = async () => {
    try {
      const resp = await fetch(`${API_URL}/usuarios?select=id,nombre,apellido`, { headers: HEADERS });
      const data = await resp.json();
      if (data) { const m: Record<string, string> = {}; data.forEach((u: any) => { m[u.id] = u.nombre + ' ' + u.apellido; }); setNombresUsuarios(m); }
    } catch (e) {}
  };

  const cargarColores = async () => {
    try {
      const resp = await fetch(`${API_URL}/rd_colores_tipos?select=*&activo=eq.true&order=color`, { headers: HEADERS });
      const data = await resp.json();
      if (data) setColoresTipos(data);
    } catch (e) {}
  };

  const cargarOrdenes = async (mostrarCargando: boolean = true) => {
    if (mostrarCargando) setCargando(true);
    try {
      const resp = await fetch(`${API_URL}/rd01_ordenes?select=*&order=creado_en.desc`, { headers: HEADERS });
      const data = await resp.json();
      if (data) setOrdenes(data);
    } catch (e) {}
    if (mostrarCargando) setCargando(false);
  };

  const getInfoColor = (colorNombre: string) => {
    return coloresTipos.find(c => c.color === colorNombre) || { color_hex: '#ccc', tipo_devolucion: '', almacen_destino: '' };
  };

  const verificarSolicitud = async (numeroSolicitud: string): Promise<{
    existe: boolean;
    completada: boolean;
    bultosRegistrados: number;
    totalBultos: number;
    datosPrevios: any;
  }> => {
    const resp = await fetch(
      `${API_URL}/rd01_ordenes?select=*&numero_solicitud=eq.${numeroSolicitud}&estado=neq.Cancelado&order=creado_en.asc`,
      { headers: HEADERS }
    );
    const ordenesSolicitud = await resp.json();

    if (!ordenesSolicitud || ordenesSolicitud.length === 0) {
      return { existe: false, completada: false, bultosRegistrados: 0, totalBultos: 0, datosPrevios: null };
    }

    const sumaBultos = ordenesSolicitud.reduce((s: number, o: any) => s + (o.cantidad_bultos || 0), 0);
    const totalBultos = ordenesSolicitud[0].total_bultos;
    const datosPrevios = ordenesSolicitud[0];

    return {
      existe: true,
      completada: sumaBultos >= totalBultos,
      bultosRegistrados: sumaBultos,
      totalBultos: totalBultos,
      datosPrevios: datosPrevios,
    };
  };

  const handleCodigoLocalChange = (codigo: string) => {
    const nuevo = { ...form, codigo_local: codigo.toUpperCase() };
    const local = locales.find(l => l.codigo_local.toUpperCase() === codigo.toUpperCase());
    nuevo.nombre_local = local?.nombre_local || '';
    setForm(nuevo);
  };

  const handleSolicitudChange = async (valor: string) => {
    const nuevoForm = { ...form, numero_solicitud: valor };
    setForm(nuevoForm);

    if (valor.trim().length > 2) {
      const verificacion = await verificarSolicitud(valor.trim());

      if (verificacion.existe) {
        if (verificacion.completada) {
          setMensaje('⚠️ La solicitud ' + valor + ' ya está completa. No se puede ingresar nuevamente.');
          setTipoMensaje('warning');
        } else {
          const datos = verificacion.datosPrevios;
          setForm({
            ...form,
            numero_solicitud: valor,
            color: datos.color,
            codigo_local: datos.codigo_local,
            nombre_local: datos.nombre_local,
            numero_guia: datos.numero_guia,
            total_bultos: datos.total_bultos,
            cantidad_bultos: 0,
          });
          setOrdenPendiente(true);
          setBultosRegistrados(verificacion.bultosRegistrados);
          setMensaje('📋 Solicitud existente encontrada. Faltan ' + (verificacion.totalBultos - verificacion.bultosRegistrados) + ' bultos. Complete la cantidad.');
          setTipoMensaje('info');
        }
      } else {
        setMensaje('');
        setOrdenPendiente(false);
        setBultosRegistrados(0);
      }
    }
  };

  const validarForm = (): string | null => {
    if (!form.color) return 'Selecciona un color';
    if (!form.codigo_local) return 'Ingresa código de local';
    if (!form.nombre_local) return 'Local no encontrado';
    if (!form.numero_solicitud.trim()) return 'Ingresa número de solicitud';
    if (!form.numero_guia.trim()) return 'Ingresa número de guía';
    if (form.cantidad_bultos <= 0) return 'Cantidad debe ser mayor a 0';
    if (form.total_bultos <= 0) return 'Total debe ser mayor a 0';

    const nuevaCantidad = bultosRegistrados + form.cantidad_bultos;
    if (nuevaCantidad > form.total_bultos) {
      return 'La cantidad (' + nuevaCantidad + ') excede el total (' + form.total_bultos + '). Máximo permitido: ' + (form.total_bultos - bultosRegistrados);
    }
    return null;
  };

  const handleGuardar = async () => {
    if (!ordenPendiente) {
      const verificacion = await verificarSolicitud(form.numero_solicitud.trim());
      if (verificacion.completada) {
        setMensaje('⚠️ La solicitud ' + form.numero_solicitud + ' ya fue completada por otro usuario.');
        setTipoMensaje('warning');
        return;
      }
    }

    const error = validarForm();
    if (error) { setMensaje('Error: ' + error); setTipoMensaje('error'); return; }

    setGuardando(true); setMensaje('');
    try {
      const user = auth.getUsuario();
      if (!user) { setMensaje('Error: Usuario no autenticado'); setTipoMensaje('error'); setGuardando(false); return; }

      const infoColor = getInfoColor(form.color);
      const nuevaCantidad = bultosRegistrados + form.cantidad_bultos;
      const diferenciaTotal = nuevaCantidad - form.total_bultos;

      let estado = 'Finalizado';
      let diferencia: number | null = null;
      if (diferenciaTotal < 0) { estado = 'Pendiente'; diferencia = diferenciaTotal; }
      else if (diferenciaTotal > 0) { estado = 'Con Diferencias'; diferencia = diferenciaTotal; }

      await fetch(`${API_URL}/rd01_ordenes`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          color: form.color,
          color_hex: infoColor.color_hex,
          codigo_local: form.codigo_local,
          nombre_local: form.nombre_local,
          numero_solicitud: form.numero_solicitud,
          numero_guia: form.numero_guia,
          cantidad_bultos: form.cantidad_bultos,
          total_bultos: form.total_bultos,
          tipo_devolucion: infoColor.tipo_devolucion,
          almacen_destino: infoColor.almacen_destino,
          estado: estado,
          diferencia: diferencia,
          creado_por: user.id,
          creado_en: new Date().toISOString(),
        }),
      });

      await actualizarEstadoSolicitud(form.numero_solicitud, form.total_bultos);

      const faltante = form.total_bultos - nuevaCantidad;

      if (faltante > 0) {
        // NO CERRAR MODAL - Solo limpiar cantidad
        setMensaje('✅ Registro guardado. Faltan ' + faltante + ' bultos para completar la solicitud ' + form.numero_solicitud + '.');
        setTipoMensaje('success');
        setOrdenPendiente(true);
        setBultosRegistrados(nuevaCantidad);
        setForm({ ...form, cantidad_bultos: 0 });
        setTimeout(() => cantidadInputRef.current?.focus(), 200);
      } else {
        // COMPLETADO - NO CERRAR MODAL, solo limpiar para nueva orden
        if (diferenciaTotal !== 0) {
          setMensaje('⚠️ Solicitud ' + form.numero_solicitud + ' completada con diferencias (' + (diferenciaTotal > 0 ? '+' : '') + diferenciaTotal + '). Puede registrar una nueva orden.');
          setTipoMensaje('warning');
        } else {
          setMensaje('✅ Solicitud ' + form.numero_solicitud + ' registrada correctamente. Puede registrar una nueva orden.');
          setTipoMensaje('success');
        }
        // Limpiar formulario para nueva orden
        setForm({ ...ESTADO_INICIAL });
        setOrdenPendiente(false);
        setBultosRegistrados(0);
        setTimeout(() => solicitudInputRef.current?.focus(), 300);
      }

      cargarOrdenes(false);
    } catch (error: any) {
      setMensaje('Error: ' + (error.message || 'Error desconocido'));
      setTipoMensaje('error');
    } finally {
      setGuardando(false);
    }
  };

  const actualizarEstadoSolicitud = async (numeroSolicitud: string, totalBultos: number) => {
    const resp = await fetch(
      `${API_URL}/rd01_ordenes?select=id,cantidad_bultos&numero_solicitud=eq.${numeroSolicitud}`,
      { headers: HEADERS }
    );
    const ordenes = await resp.json();
    if (!ordenes || ordenes.length === 0) return;

    const sumaTotal = ordenes.reduce((s: number, o: any) => s + (o.cantidad_bultos || 0), 0);
    const dif = sumaTotal - totalBultos;
    let estado = 'Finalizado'; let diferencia: number | null = null;
    if (dif < 0) { estado = 'Pendiente'; diferencia = dif; }
    else if (dif > 0) { estado = 'Con Diferencias'; diferencia = dif; }

    for (const o of ordenes) {
      await fetch(`${API_URL}/rd01_ordenes?id=eq.${o.id}`, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, diferencia }),
      });
    }
  };

  const handleCancelar = async (orden: any, obs?: string) => {
    if (!confirm('¿Cancelar esta orden?')) return;
    const user = auth.getUsuario();
    await fetch(`${API_URL}/rd01_ordenes?id=eq.${orden.id}`, {
      method: 'PATCH',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'Cancelado', observacion: obs || 'Cancelado por usuario', modificado_por: user?.id, modificado_en: new Date().toISOString() }),
    });
    setShowDetalleModal(false);
    cargarOrdenes(false);
  };

  const verDetalle = (orden: any) => { setOrdenDetalle(orden); setShowDetalleModal(true); };

  const abrirModalCrear = () => {
    setForm({ ...ESTADO_INICIAL });
    setOrdenPendiente(false);
    setBultosRegistrados(0);
    setMensaje('');
    setTipoMensaje('info');
    setShowCrearModal(true);
    setTimeout(() => solicitudInputRef.current?.focus(), 200);
  };

  const handleCloseModal = () => {
    if (ordenPendiente && !confirm('¿Salir sin completar la solicitud? La orden quedará Pendiente.')) return;
    setShowCrearModal(false);
    setOrdenPendiente(false);
    cargarOrdenes(false);
  };

  const getMensajeStyle = () => {
    switch (tipoMensaje) {
      case 'error': return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
      case 'success': return { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' };
      case 'warning': return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
      case 'info': return { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };
    }
  };

  return (
    <div className="rd01-view">
      <div className="rd01-header">
        <h2>Recepción Devolución - Ingreso</h2>
        <button className="rd01-btn-nueva" onClick={abrirModalCrear}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Nueva Orden
        </button>
      </div>

      <RD01Tabla
        ordenes={ordenes}
        cargando={cargando}
        nombresUsuarios={nombresUsuarios}
        onVerDetalle={verDetalle}
        onCancelar={(orden) => handleCancelar(orden)}
      />

      <RD01ModalCrear
        isOpen={showCrearModal}
        guardando={guardando}
        ordenPendiente={ordenPendiente}
        form={form}
        bultosRegistrados={bultosRegistrados}
        coloresTipos={coloresTipos}
        mensaje={mensaje}
        tipoMensaje={tipoMensaje}
        colorSelectRef={colorSelectRef}
        cantidadInputRef={cantidadInputRef}
        solicitudInputRef={solicitudInputRef}
        onFormChange={(campo, valor) => setForm({ ...form, [campo]: valor })}
        onCodigoLocalChange={handleCodigoLocalChange}
        onSolicitudChange={handleSolicitudChange}
        onGuardar={handleGuardar}
        onClose={handleCloseModal}
        getMensajeStyle={getMensajeStyle}
      />

      <RD01ModalDetalle
        isOpen={showDetalleModal}
        orden={ordenDetalle}
        onClose={() => setShowDetalleModal(false)}
        onCancelar={handleCancelar}
      />
    </div>
  );
};

export default RD01View;
