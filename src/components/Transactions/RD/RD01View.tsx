// src/components/Transactions/RD/RD01View.tsx

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
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

interface Solicitud {
  color: string;
  codigo_local: string;
  nombre_local: string;
  numero_solicitud: string;
  numero_guia: string;
  cantidad_bultos: number;
  total_bultos: number;
}

const ESTADO_INICIAL_SOLICITUD: Solicitud = {
  color: '', codigo_local: '', nombre_local: '',
  numero_solicitud: '', numero_guia: '',
  cantidad_bultos: 0, total_bultos: 0,
};

const RD01View: React.FC = () => {
  const usuario = auth.getUsuario();
  const [registros, setRegistros] = useState<any[]>([]);
  const [coloresTipos, setColoresTipos] = useState<ColorTipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [registroDetalle, setRegistroDetalle] = useState<any>(null);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([{ ...ESTADO_INICIAL_SOLICITUD }]);
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});

  const colorSelectRefs = useRef<(HTMLSelectElement | null)[]>([]);
  const cantidadInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [guardadoParcial, setGuardadoParcial] = useState(false);
  const [solicitudActualIndex, setSolicitudActualIndex] = useState(0);
  const [palletBaseActual, setPalletBaseActual] = useState('');
  const [bultosGuardados, setBultosGuardados] = useState(0);
  const [palletContador, setPalletContador] = useState(1);

  useEffect(() => { cargarLocales(); cargarColoresTipos(); cargarUsuarios(); cargarRegistros(); }, []);
  useEffect(() => { const intervalo = setInterval(cargarRegistros, 10000); return () => clearInterval(intervalo); }, []);

  const cargarUsuarios = async () => {
    try {
      const resp = await fetch(`${API_URL}/usuarios?select=id,nombre,apellido`, { headers: HEADERS });
      const data = await resp.json();
      if (data) { const m: Record<string, string> = {}; data.forEach((u: any) => { m[u.id] = u.nombre + ' ' + u.apellido; }); setNombresUsuarios(m); }
    } catch (e) {}
  };

  const cargarColoresTipos = async () => {
    try {
      const resp = await fetch(`${API_URL}/rd_colores_tipos?select=*&activo=eq.true&order=color`, { headers: HEADERS });
      const data = await resp.json();
      if (data) setColoresTipos(data);
    } catch (e) {}
  };

  const cargarRegistros = async () => {
    try {
      const resp = await fetch(`${API_URL}/rd01_devoluciones?select=*&order=creado_en.desc`, { headers: HEADERS });
      const data = await resp.json();
      if (data) setRegistros(data);
    } catch (e) {}
    setCargando(false);
  };

  const getInfoColor = (colorNombre: string) => {
    return coloresTipos.find(c => c.color === colorNombre) || { color_hex: '#ccc', tipo_devolucion: '', almacen_destino: '' };
  };

  const handleCodigoLocalChange = (index: number, codigo: string) => {
    const nuevas = [...solicitudes];
    nuevas[index].codigo_local = codigo.toUpperCase();
    const local = locales.find(l => l.codigo_local.toUpperCase() === codigo.toUpperCase());
    nuevas[index].nombre_local = local?.nombre_local || '';
    setSolicitudes(nuevas);
  };

  const handleSolicitudChange = (index: number, campo: keyof Solicitud, valor: any) => {
    const nuevas = [...solicitudes];
    (nuevas[index] as any)[campo] = valor;
    setSolicitudes(nuevas);
  };

  const agregarSolicitud = () => {
    setSolicitudes([...solicitudes, { ...ESTADO_INICIAL_SOLICITUD }]);
    setTimeout(() => { const idx = solicitudes.length; if (colorSelectRefs.current[idx]) colorSelectRefs.current[idx]?.focus(); }, 100);
  };

  const eliminarSolicitud = (index: number) => {
    if (solicitudes.length === 1) return;
    setSolicitudes(solicitudes.filter((_, i) => i !== index));
  };

  const generarNumeroPallet = async (): Promise<string> => {
    try { const { data, error } = await supabase.rpc('generar_numero_devolucion'); if (!error && data) return data as string; } catch (e) {}
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const fecha = dd + mm + yyyy;
    const resp = await fetch(`${API_URL}/rd01_devoluciones?select=id&order=creado_en.desc&limit=1`, { headers: HEADERS });
    const data = await resp.json();
    return 'DEV' + fecha + String((data?.length || 0) + 1).padStart(6, '0');
  };

  const validarSolicitudInicial = (s: Solicitud): string | null => {
    if (!s.color) return 'Selecciona un color';
    if (!s.codigo_local) return 'Ingresa código de local';
    if (!s.nombre_local) return 'Local no encontrado';
    if (!s.numero_solicitud.trim()) return 'Ingresa número de solicitud';
    if (!s.numero_guia.trim()) return 'Ingresa número de guía';
    if (s.cantidad_bultos <= 0) return 'Cantidad de bultos debe ser mayor a 0';
    if (s.total_bultos <= 0) return 'Total de bultos debe ser mayor a 0';
    return null;
  };

  // Guardar un registro SIN sufijo P01, P02 - mismo ID para todo el contenedor
  const guardarRegistro = async (sol: Solicitud, infoColor: any, idPallet: string, cantidad: number, userId: string) => {
    const sumaTotal = cantidad; // Se calculará después con actualizarEstadoSolicitud
    const dif = sumaTotal - sol.total_bultos;
    let estado = 'Finalizado'; let diferencia: number | null = null;
    if (dif < 0) { estado = 'Pendiente'; diferencia = dif; }
    else if (dif > 0) { estado = 'Con Diferencias'; diferencia = dif; }

    const resp = await fetch(`${API_URL}/rd01_devoluciones`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_pallet: idPallet,
        color: sol.color,
        color_hex: infoColor.color_hex,
        codigo_local: sol.codigo_local,
        nombre_local: sol.nombre_local,
        numero_solicitud: sol.numero_solicitud,
        numero_guia: sol.numero_guia,
        cantidad_bultos: cantidad,
        total_bultos: sol.total_bultos,
        tipo_devolucion: infoColor.tipo_devolucion,
        almacen_destino: infoColor.almacen_destino,
        estado: estado,
        diferencia: diferencia,
        creado_por: userId,
        creado_en: new Date().toISOString(),
      }),
    });
    if (!resp.ok) { const err = await resp.json(); throw new Error(err.message || 'Error al guardar'); }
  };

  const actualizarEstadoSolicitud = async (numeroSolicitud: string, totalBultos: number) => {
    const resp = await fetch(
      `${API_URL}/rd01_devoluciones?select=id,cantidad_bultos&numero_solicitud=eq.${numeroSolicitud}`,
      { headers: HEADERS }
    );
    const pallets = await resp.json();
    if (!pallets || pallets.length === 0) return;
    
    const sumaTotal = pallets.reduce((s: number, p: any) => s + (p.cantidad_bultos || 0), 0);
    const dif = sumaTotal - totalBultos;
    let estado = 'Finalizado'; let diferencia: number | null = null;
    if (dif < 0) { estado = 'Pendiente'; diferencia = dif; }
    else if (dif > 0) { estado = 'Con Diferencias'; diferencia = dif; }
    
    for (const p of pallets) {
      await fetch(`${API_URL}/rd01_devoluciones?id=eq.${p.id}`, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, diferencia }),
      });
    }
  };

  const handleGuardar = async () => {
    setGuardando(true); setMensaje('');
    try {
      const user = auth.getUsuario();
      if (!user) { setMensaje('Error: Usuario no autenticado'); setGuardando(false); return; }

      // MODO PARCIAL: Continuar con la solicitud actual
      if (guardadoParcial) {
        const sol = solicitudes[solicitudActualIndex];
        const infoColor = getInfoColor(sol.color);
        const cant = sol.cantidad_bultos;
        if (cant <= 0) { setMensaje('Error: Ingresa la cantidad'); setGuardando(false); return; }

        await guardarRegistro(sol, infoColor, palletBaseActual, cant, user.id);

        const nuevoTotal = bultosGuardados + cant;
        const faltante = sol.total_bultos - nuevoTotal;

        if (faltante <= 0) {
          await actualizarEstadoSolicitud(sol.numero_solicitud, sol.total_bultos);
          setMensaje('✅ Solicitud ' + sol.numero_solicitud + ' completada!');
          setGuardadoParcial(false); setPalletBaseActual(''); setBultosGuardados(0); setPalletContador(1);
          
          const sig = solicitudActualIndex + 1;
          if (sig < solicitudes.length) {
            setSolicitudActualIndex(sig);
            setGuardando(false);
            await cargarRegistros();
            setTimeout(() => cantidadInputRefs.current[sig]?.focus(), 300);
            return;
          } else {
            setTimeout(() => { setShowCrearModal(false); setSolicitudes([{ ...ESTADO_INICIAL_SOLICITUD }]); setSolicitudActualIndex(0); setMensaje(''); }, 2500);
            setGuardando(false);
            await cargarRegistros();
            return;
          }
        } else {
          setBultosGuardados(nuevoTotal);
          setPalletContador(palletContador + 1);
          const nuevas = [...solicitudes];
          nuevas[solicitudActualIndex] = { ...nuevas[solicitudActualIndex], cantidad_bultos: 0 };
          setSolicitudes(nuevas);
          setMensaje('Pallet guardado (' + cant + ' bultos). Faltan ' + faltante + ' bultos.');
          setTimeout(() => cantidadInputRefs.current[solicitudActualIndex]?.focus(), 200);
        }
        setGuardando(false);
        await cargarRegistros();
        return;
      }

      // MODO NORMAL: Validar todas las filas
      for (let i = 0; i < solicitudes.length; i++) {
        const err = validarSolicitudInicial(solicitudes[i]);
        if (err) { setMensaje('Error en fila #' + (i + 1) + ': ' + err); setGuardando(false); return; }
      }

      // Generar UN SOLO ID Pallet para todo el contenedor
      const idPallet = await generarNumeroPallet();

      // Guardar cada solicitud con el MISMO idPallet
      for (let i = 0; i < solicitudes.length; i++) {
        const sol = solicitudes[i];
        const infoColor = getInfoColor(sol.color);
        const bultos = sol.cantidad_bultos;
        const total = sol.total_bultos;

        if (bultos >= total) {
          // Un solo registro para esta solicitud
          await guardarRegistro(sol, infoColor, idPallet, bultos, user.id);
        } else {
          // Múltiples registros para esta solicitud (mismo ID pallet)
          const palletBase = idPallet;
          let bultosAcumulados = 0;
          
          while (bultosAcumulados < total) {
            const cantidadEste = Math.min(bultos, total - bultosAcumulados);
            await guardarRegistro(sol, infoColor, palletBase, cantidadEste, user.id);
            bultosAcumulados += cantidadEste;
          }
        }
        // Actualizar estado después de guardar todos los registros de esta solicitud
        await actualizarEstadoSolicitud(sol.numero_solicitud, total);
      }

      setMensaje('✅ ' + solicitudes.length + ' solicitud(es) procesada(s) en pallet ' + idPallet + '.');
      setTimeout(() => { setShowCrearModal(false); setSolicitudes([{ ...ESTADO_INICIAL_SOLICITUD }]); setSolicitudActualIndex(0); setMensaje(''); }, 2500);
      setGuardando(false);
      await cargarRegistros();
    } catch (error: any) {
      setMensaje('Error: ' + (error.message || 'Error desconocido'));
      setGuardando(false);
    }
  };

  const handleCancelar = async (registro: any, obs?: string) => {
    if (!confirm('¿Cancelar este registro?')) return;
    const user = auth.getUsuario();
    await fetch(`${API_URL}/rd01_devoluciones?id=eq.${registro.id}`, {
      method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'Cancelado', observacion: obs || 'Cancelado por usuario', modificado_por: user?.id, modificado_en: new Date().toISOString() }),
    });
    setShowDetalleModal(false); cargarRegistros();
  };

  const verDetalle = (registro: any) => { setRegistroDetalle(registro); setShowDetalleModal(true); };

  const getRegistrosParaTabla = () => {
    const conteo: Record<string, { total: number; pallets: string[] }> = {};
    registros.forEach(r => {
      if (!conteo[r.numero_solicitud]) conteo[r.numero_solicitud] = { total: 0, pallets: [] };
      conteo[r.numero_solicitud].total++;
      conteo[r.numero_solicitud].pallets.push(r.id_pallet);
    });
    return registros.map(r => {
      const info = conteo[r.numero_solicitud];
      const ordenados = info.pallets.sort();
      const pos = ordenados.indexOf(r.id_pallet) + 1;
      return { ...r, pallet_actual: pos, total_pallets_solicitud: info.total };
    });
  };

  const abrirModalCrear = () => {
    setSolicitudes([{ ...ESTADO_INICIAL_SOLICITUD }]);
    setGuardadoParcial(false); setSolicitudActualIndex(0);
    setPalletBaseActual(''); setBultosGuardados(0); setPalletContador(1);
    setMensaje(''); setShowCrearModal(true);
    setTimeout(() => colorSelectRefs.current[0]?.focus(), 200);
  };

  const handleCloseModal = () => {
    if (guardadoParcial && !confirm('¿Salir sin completar todos los pallets?')) return;
    setShowCrearModal(false); setGuardadoParcial(false); cargarRegistros();
  };

  return (
    <div className="rd01-view">
      <div className="rd01-header">
        <h2>Recepción Devolución - Ingreso</h2>
        <button className="rd01-btn-nueva" onClick={abrirModalCrear}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Nuevo Ingreso
        </button>
      </div>

      <RD01Tabla
        registros={getRegistrosParaTabla()}
        cargando={cargando}
        nombresUsuarios={nombresUsuarios}
        onVerDetalle={verDetalle}
        onCancelar={(reg) => handleCancelar(reg)}
      />

      <RD01ModalCrear
        isOpen={showCrearModal}
        guardando={guardando}
        guardadoParcial={guardadoParcial}
        solicitudes={solicitudes}
        solicitudActualIndex={solicitudActualIndex}
        palletContador={palletContador}
        bultosGuardados={bultosGuardados}
        coloresTipos={coloresTipos}
        mensaje={mensaje}
        colorSelectRefs={colorSelectRefs}
        cantidadInputRefs={cantidadInputRefs}
        onSolicitudChange={handleSolicitudChange}
        onCodigoLocalChange={handleCodigoLocalChange}
        onAgregarSolicitud={agregarSolicitud}
        onEliminarSolicitud={eliminarSolicitud}
        onGuardar={handleGuardar}
        onClose={handleCloseModal}
      />

      <RD01ModalDetalle
        isOpen={showDetalleModal}
        registro={registroDetalle}
        onClose={() => setShowDetalleModal(false)}
        onCancelar={handleCancelar}
      />
    </div>
  );
};

export default RD01View;
