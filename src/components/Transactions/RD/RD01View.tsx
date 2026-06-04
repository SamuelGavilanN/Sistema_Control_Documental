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
  const [guardando, setGuardando] = useState(false);
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});

  // Control de fraccionamiento
  const [ordenPendiente, setOrdenPendiente] = useState(false);
  const [datosOrdenPendiente, setDatosOrdenPendiente] = useState<any>(null);
  const [bultosRegistrados, setBultosRegistrados] = useState(0);

  const colorSelectRef = useRef<HTMLSelectElement | null>(null);
  const cantidadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { cargarLocales(); cargarColores(); cargarUsuarios(); cargarOrdenes(); }, []);
  useEffect(() => { const intervalo = setInterval(cargarOrdenes, 10000); return () => clearInterval(intervalo); }, []);

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

  const cargarOrdenes = async () => {
    try {
      const resp = await fetch(`${API_URL}/rd01_ordenes?select=*&order=creado_en.desc`, { headers: HEADERS });
      const data = await resp.json();
      if (data) setOrdenes(data);
    } catch (e) {}
    setCargando(false);
  };

  const getInfoColor = (colorNombre: string) => {
    return coloresTipos.find(c => c.color === colorNombre) || { color_hex: '#ccc', tipo_devolucion: '', almacen_destino: '' };
  };

  const handleCodigoLocalChange = (codigo: string) => {
    const nuevo = { ...form, codigo_local: codigo.toUpperCase() };
    const local = locales.find(l => l.codigo_local.toUpperCase() === codigo.toUpperCase());
    nuevo.nombre_local = local?.nombre_local || '';
    setForm(nuevo);
  };

  const validarForm = (): string | null => {
    if (!form.color) return 'Selecciona un color';
    if (!form.codigo_local) return 'Ingresa código de local';
    if (!form.nombre_local) return 'Local no encontrado';
    if (!form.numero_solicitud.trim()) return 'Ingresa número de solicitud';
    if (!form.numero_guia.trim()) return 'Ingresa número de guía';
    if (form.cantidad_bultos <= 0) return 'Cantidad debe ser mayor a 0';
    if (form.total_bultos <= 0) return 'Total debe ser mayor a 0';
    return null;
  };

  const handleGuardar = async () => {
    const error = validarForm();
    if (error) { setMensaje('Error: ' + error); setTimeout(() => setMensaje(''), 3000); return; }

    setGuardando(true); setMensaje('');
    try {
      const user = auth.getUsuario();
      if (!user) { setMensaje('Error: Usuario no autenticado'); setGuardando(false); return; }

      const infoColor = getInfoColor(form.color);
      const nuevaCantidad = (ordenPendiente ? bultosRegistrados : 0) + form.cantidad_bultos;
      const diferenciaTotal = nuevaCantidad - form.total_bultos;

      let estado = 'Finalizado';
      let diferencia: number | null = null;
      if (diferenciaTotal < 0) { estado = 'Pendiente'; diferencia = diferenciaTotal; }
      else if (diferenciaTotal > 0) { estado = 'Con Diferencias'; diferencia = diferenciaTotal; }

      // Guardar orden
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

      // Actualizar todas las órdenes de esta solicitud
      await actualizarEstadoSolicitud(form.numero_solicitud, form.total_bultos);

      const faltante = form.total_bultos - nuevaCantidad;

      if (faltante > 0) {
        // Queda pendiente - mantener modal abierto, limpiar solo cantidad
        setMensaje('✅ Registro guardado. Faltan ' + faltante + ' bultos para completar la solicitud ' + form.numero_solicitud + '.');
        setOrdenPendiente(true);
        setDatosOrdenPendiente({ ...form, cantidad_bultos: 0 });
        setBultosRegistrados(nuevaCantidad);
        setForm({ ...form, cantidad_bultos: 0 });
        setTimeout(() => cantidadInputRef.current?.focus(), 200);
      } else {
        // Completado
        if (diferenciaTotal !== 0) {
          setMensaje('⚠️ Solicitud ' + form.numero_solicitud + ' registrada con diferencias (' + (diferenciaTotal > 0 ? '+' : '') + diferenciaTotal + ').');
        } else {
          setMensaje('✅ Solicitud ' + form.numero_solicitud + ' registrada correctamente.');
        }
        setTimeout(() => {
          setShowCrearModal(false);
          setForm({ ...ESTADO_INICIAL });
          setOrdenPendiente(false);
          setDatosOrdenPendiente(null);
          setBultosRegistrados(0);
          setMensaje('');
        }, 2000);
      }

      cargarOrdenes();
    } catch (error: any) {
      setMensaje('Error: ' + (error.message || 'Error desconocido'));
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
    cargarOrdenes();
  };

  const verDetalle = (orden: any) => { setOrdenDetalle(orden); setShowDetalleModal(true); };

  const abrirModalCrear = () => {
    setForm({ ...ESTADO_INICIAL });
    setOrdenPendiente(false);
    setDatosOrdenPendiente(null);
    setBultosRegistrados(0);
    setMensaje('');
    setShowCrearModal(true);
    setTimeout(() => colorSelectRef.current?.focus(), 200);
  };

  const handleCloseModal = () => {
    if (ordenPendiente && !confirm('¿Salir sin completar la solicitud? La orden quedará Pendiente.')) return;
    setShowCrearModal(false);
    setOrdenPendiente(false);
    cargarOrdenes();
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
        colorSelectRef={colorSelectRef}
        cantidadInputRef={cantidadInputRef}
        onFormChange={(campo, valor) => setForm({ ...form, [campo]: valor })}
        onCodigoLocalChange={handleCodigoLocalChange}
        onGuardar={handleGuardar}
        onClose={handleCloseModal}
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
