// src/components/Transactions/RD/RD01View.tsx

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import { locales, cargarLocales } from '../../../data/locales';
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

interface RD01Registro {
  id: string;
  id_pallet: string;
  color: string;
  color_hex: string;
  codigo_local: string;
  nombre_local: string;
  numero_solicitud: string;
  numero_guia: string;
  cantidad_bultos: number;
  total_bultos: number;
  tipo_devolucion: string;
  almacen_destino: string;
  estado: string;
  diferencia: number | null;
  creado_por: string;
  creado_en: string;
  modificado_por: string | null;
  modificado_en: string | null;
  observacion: string | null;
}

const ESTADO_INICIAL_SOLICITUD: Solicitud = {
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
  const [registros, setRegistros] = useState<RD01Registro[]>([]);
  const [coloresTipos, setColoresTipos] = useState<ColorTipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [registroDetalle, setRegistroDetalle] = useState<RD01Registro | null>(null);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([{ ...ESTADO_INICIAL_SOLICITUD }]);
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [observacion, setObservacion] = useState('');
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});

  const colorSelectRefs = useRef<(HTMLSelectElement | null)[]>([]);
  const cantidadInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [guardadoParcial, setGuardadoParcial] = useState(false);
  const [solicitudActualIndex, setSolicitudActualIndex] = useState(0);
  const [palletBaseActual, setPalletBaseActual] = useState('');
  const [bultosGuardados, setBultosGuardados] = useState(0);
  const [palletContador, setPalletContador] = useState(1);

  useEffect(() => {
    cargarLocales();
    cargarColoresTipos();
    cargarUsuarios();
    cargarRegistros();
  }, []);

  useEffect(() => {
    const intervalo = setInterval(cargarRegistros, 10000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarUsuarios = async () => {
    try {
      const resp = await fetch(`${API_URL}/usuarios?select=id,nombre,apellido`, { headers: HEADERS });
      const data = await resp.json();
      if (data) {
        const m: Record<string, string> = {};
        data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido}`; });
        setNombresUsuarios(m);
      }
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
    setTimeout(() => {
      const nuevoIndex = solicitudes.length;
      if (colorSelectRefs.current[nuevoIndex]) colorSelectRefs.current[nuevoIndex]?.focus();
    }, 100);
  };

  const eliminarSolicitud = (index: number) => {
    if (solicitudes.length === 1) return;
    setSolicitudes(solicitudes.filter((_, i) => i !== index));
  };

  const generarNumeroPallet = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('generar_numero_devolucion');
      if (!error && data) return data as string;
    } catch (e) {}
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const fechaFormateada = `${dd}${mm}${yyyy}`;
    const resp = await fetch(`${API_URL}/rd01_devoluciones?select=id&order=creado_en.desc&limit=1`, { headers: HEADERS });
    const data = await resp.json();
    const correlativo = (data?.length || 0) + 1;
    return `DEV${fechaFormateada}${String(correlativo).padStart(6, '0')}`;
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

  // GUARDAR UN PALLET - Simple y directo
  const guardarPallet = async (
    solicitud: Solicitud,
    infoColor: any,
    palletBase: string,
    numPallet: number,
    cantidad: number,
    userId: string,
    cantidadesPrevias: number
  ) => {
    const idPallet = `${palletBase}P${String(numPallet).padStart(2, '0')}`;
    
    // Calcular diferencia simple
    const sumaTotal = cantidadesPrevias + cantidad;
    const diferenciaTotal = solicitud.total_bultos - sumaTotal;
    
    // Determinar estado
    const estado = diferenciaTotal === 0 ? 'Finalizado' : 'Con Diferencias';
    const diferencia = diferenciaTotal === 0 ? null : diferenciaTotal;

    const resp = await fetch(`${API_URL}/rd01_devoluciones`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_pallet: idPallet,
        color: solicitud.color,
        color_hex: infoColor.color_hex,
        codigo_local: solicitud.codigo_local,
        nombre_local: solicitud.nombre_local,
        numero_solicitud: solicitud.numero_solicitud,
        numero_guia: solicitud.numero_guia,
        cantidad_bultos: cantidad,
        total_bultos: solicitud.total_bultos,
        tipo_devolucion: infoColor.tipo_devolucion,
        almacen_destino: infoColor.almacen_destino,
        estado: estado,
        diferencia: diferencia,
        creado_por: userId,
        creado_en: new Date().toISOString(),
      }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message || 'Error al guardar');
    }

    return { idPallet, estado, diferencia: diferenciaTotal };
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje('');

    try {
      const user = auth.getUsuario();
      if (!user) { setMensaje('Error: Usuario no autenticado'); setGuardando(false); return; }

      // ===== MODO PARCIAL =====
      if (guardadoParcial) {
        const sol = solicitudes[solicitudActualIndex];
        const infoColor = getInfoColor(sol.color);
        const cant = sol.cantidad_bultos;
        
        if (cant <= 0) { setMensaje('Error: Ingresa cantidad'); setGuardando(false); return; }

        const nuevoPalletNum = palletContador + 1;
        const { idPallet, estado, diferencia } = await guardarPallet(
          sol, infoColor, palletBaseActual, nuevoPalletNum, cant, user.id, bultosGuardados
        );

        const nuevoTotal = bultosGuardados + cant;
        const faltante = sol.total_bultos - nuevoTotal;

        if (faltante <= 0) {
          // COMPLETADO
          if (estado === 'Con Diferencias') {
            setMensaje(`⚠️ Solicitud ${sol.numero_solicitud} - Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia} bultos.`);
          } else {
            setMensaje(`✅ Solicitud ${sol.numero_solicitud} completada! ${sol.total_bultos} bultos.`);
          }
          setGuardadoParcial(false);
          setPalletBaseActual('');
          setBultosGuardados(0);
          setPalletContador(1);
          
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
          // FALTANTE
          setBultosGuardados(nuevoTotal);
          setPalletContador(nuevoPalletNum);
          const nuevas = [...solicitudes];
          nuevas[solicitudActualIndex] = { ...nuevas[solicitudActualIndex], cantidad_bultos: 0 };
          setSolicitudes(nuevas);
          setMensaje(`Pallet P${String(nuevoPalletNum).padStart(2, '0')} (${cant} bultos). Faltan ${faltante}.`);
          setTimeout(() => cantidadInputRefs.current[solicitudActualIndex]?.focus(), 200);
        }
        setGuardando(false);
        await cargarRegistros();
        return;
      }

      // ===== MODO NORMAL =====
      const err = validarSolicitudInicial(solicitudes[0]);
      if (err) { setMensaje('Error: ' + err); setGuardando(false); return; }

      const sol = solicitudes[0];
      const infoColor = getInfoColor(sol.color);
      const palletBase = await generarNumeroPallet();

      const { idPallet, estado, diferencia } = await guardarPallet(
        sol, infoColor, palletBase, 1, sol.cantidad_bultos, user.id, 0
      );

      if (estado === 'Con Diferencias') {
        setMensaje(`⚠️ Pallet guardado. Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia} bultos.`);
      } else if (sol.cantidad_bultos < sol.total_bultos) {
        // Múltiples pallets
        setGuardadoParcial(true);
        setSolicitudActualIndex(0);
        setPalletBaseActual(palletBase);
        setBultosGuardados(sol.cantidad_bultos);
        setPalletContador(1);
        const nuevas = [...solicitudes];
        nuevas[0] = { ...nuevas[0], cantidad_bultos: 0 };
        setSolicitudes(nuevas);
        setMensaje(`Pallet P01 (${sol.cantidad_bultos} bultos). Faltan ${sol.total_bultos - sol.cantidad_bultos}.`);
        setTimeout(() => cantidadInputRefs.current[0]?.focus(), 200);
      } else {
        setMensaje(`✅ Pallet ${idPallet} guardado.`);
      }

      // Si es un solo pallet y no hay más solicitudes, cerrar
      if ((sol.cantidad_bultos >= sol.total_bultos || estado === 'Con Diferencias') && solicitudes.length === 1) {
        setTimeout(() => { setShowCrearModal(false); setSolicitudes([{ ...ESTADO_INICIAL_SOLICITUD }]); setMensaje(''); }, 2000);
      } else if ((sol.cantidad_bultos >= sol.total_bultos || estado === 'Con Diferencias') && solicitudes.length > 1) {
        setTimeout(() => {
          setMensaje('');
          setSolicitudActualIndex(1);
          setGuardadoParcial(false);
          cargarRegistros();
          setTimeout(() => cantidadInputRefs.current[1]?.focus(), 200);
        }, 1500);
      }

      setGuardando(false);
      await cargarRegistros();
    } catch (error: any) {
      setMensaje('Error: ' + (error.message || 'Error desconocido'));
      setGuardando(false);
    }
  };

  const handleCancelar = async (registro: RD01Registro) => {
    if (!confirm('¿Cancelar este registro?')) return;
    const user = auth.getUsuario();
    await fetch(`${API_URL}/rd01_devoluciones?id=eq.${registro.id}`, {
      method: 'PATCH',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado: 'Cancelado',
        observacion: observacion || 'Cancelado por usuario',
        modificado_por: user?.id,
        modificado_en: new Date().toISOString(),
      }),
    });
    setShowDetalleModal(false);
    cargarRegistros();
  };

  const verDetalle = (registro: RD01Registro) => {
    setRegistroDetalle(registro);
    setObservacion('');
    setShowDetalleModal(true);
  };

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
    setGuardadoParcial(false);
    setSolicitudActualIndex(0);
    setPalletBaseActual('');
    setBultosGuardados(0);
    setPalletContador(1);
    setMensaje('');
    setShowCrearModal(true);
    setTimeout(() => colorSelectRefs.current[0]?.focus(), 200);
  };

  const registrosTabla = getRegistrosParaTabla();

  return (
    <div className="rd01-view">
      <div className="rd01-header">
        <h2>Recepción Devolución - Ingreso</h2>
        <button className="rd01-btn-nueva" onClick={abrirModalCrear}>+ Nuevo Ingreso</button>
      </div>

      <div className="ed03-tabla-container" style={{ overflowX: 'auto' }}>
        <table className="ed03-tabla" style={{ minWidth: '2100px' }}>
          <thead>
            <tr>
              <th>ID Pallet</th><th>Pallet</th><th>Color</th><th>Cod Local</th><th>Local</th>
              <th>N° Solicitud</th><th>N° Guía</th><th>Cant. Bultos</th><th>Total Bultos</th>
              <th>Diferencia</th><th>Estado</th><th>Tipo Devolución</th><th>Almacén Destino</th>
              <th>Creado Por</th><th>Creado En</th><th>Modificado Por</th><th>Modificado En</th>
              <th>Obs.</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? <tr><td colSpan={19} style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr> :
             registrosTabla.length === 0 ? <tr><td colSpan={19} style={{ textAlign: 'center', padding: '40px' }}>Sin registros</td></tr> :
             registrosTabla.map((reg: any) => (
              <tr key={reg.id} style={{ background: reg.estado === 'Con Diferencias' ? '#fff5f5' : 'transparent' }}>
                <td style={{ fontFamily: 'Courier New, monospace', fontSize: '12px', color: '#1d4ed8', fontWeight: 600 }}>{reg.id_pallet}</td>
                <td style={{ textAlign: 'center' }}><span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: '#eef2ff', color: '#1d4ed8' }}>{reg.pallet_actual} de {reg.total_pallets_solicitud}</span></td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div className="rd01-color-badge" style={{ background: reg.color_hex || '#ccc' }} /><span>{reg.color}</span></div></td>
                <td>{reg.codigo_local}</td>
                <td style={{ whiteSpace: 'normal', minWidth: '150px' }}>{reg.nombre_local}</td>
                <td>{reg.numero_solicitud}</td><td>{reg.numero_guia}</td>
                <td style={{ textAlign: 'center' }}>{reg.cantidad_bultos}</td>
                <td style={{ textAlign: 'center' }}>{reg.total_bultos}</td>
                <td style={{ textAlign: 'center' }}>
                  {reg.diferencia !== null && reg.diferencia !== 0 ? (
                    <span style={{ fontWeight: 700, color: reg.diferencia > 0 ? '#15803d' : '#dc2626' }}>{reg.diferencia > 0 ? '+' : ''}{reg.diferencia}</span>
                  ) : '-'}
                </td>
                <td><span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: reg.estado === 'Finalizado' ? '#dcfce7' : reg.estado === 'Con Diferencias' ? '#fef2f2' : '#f1f5f9', color: reg.estado === 'Finalizado' ? '#15803d' : reg.estado === 'Con Diferencias' ? '#dc2626' : '#64748b' }}>{reg.estado}</span></td>
                <td>{reg.tipo_devolucion}</td><td>{reg.almacen_destino}</td>
                <td>{nombresUsuarios[reg.creado_por] || reg.creado_por}</td>
                <td>{new Date(reg.creado_en).toLocaleDateString('es-CL')}</td>
                <td>{reg.modificado_por ? (nombresUsuarios[reg.modificado_por] || reg.modificado_por) : '-'}</td>
                <td>{reg.modificado_en ? new Date(reg.modificado_en).toLocaleDateString('es-CL') : '-'}</td>
                <td>{reg.observacion ? 'Si' : 'No'}</td>
                <td>
                  <button className="rd01-btn-detalle" onClick={() => verDetalle(reg)}>Detalle</button>
                  {reg.estado !== 'Cancelado' && <button className="rd01-btn-cancelar" onClick={() => handleCancelar(reg)}>Cancelar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCrearModal && (
        <div className="ed01-modal-overlay" onClick={() => !guardando && setShowCrearModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '1200px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header">
              <h2>{guardadoParcial ? `Continuando - P${String(palletContador + 1).padStart(2, '0')}` : 'Nuevo Ingreso'}</h2>
              <button className="ed01-modal-close" onClick={() => { setShowCrearModal(false); setGuardadoParcial(false); cargarRegistros(); }}>×</button>
            </div>
            <div className="ed01-modal-body">
              {guardadoParcial && (
                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>
                  Guardado: {bultosGuardados} de {solicitudes[solicitudActualIndex]?.total_bultos}. Faltan: {solicitudes[solicitudActualIndex]?.total_bultos - bultosGuardados}
                </div>
              )}
              <div className="ed03-tabla-container" style={{ maxHeight: '400px', overflowX: 'auto' }}>
                <table className="ed03-tabla" style={{ minWidth: '950px' }}>
                  <thead><tr><th>Color</th><th>Cod Local</th><th>Local</th><th>N° Solicitud</th><th>N° Guía</th><th>Cant. Bultos</th><th>Total Bultos</th><th>Progreso</th><th></th></tr></thead>
                  <tbody>
                    {solicitudes.map((sol, i) => {
                      const isDisabled = guardadoParcial && i !== solicitudActualIndex;
                      return (
                        <tr key={i} style={{ opacity: isDisabled ? 0.4 : 1 }}>
                          <td><select ref={el => colorSelectRefs.current[i] = el} value={sol.color} onChange={e => handleSolicitudChange(i, 'color', e.target.value)} disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px' }}><option value="">Seleccionar...</option>{coloresTipos.map(c => <option key={c.id} value={c.color}>{c.color}</option>)}</select></td>
                          <td><input value={sol.codigo_local} onChange={e => handleCodigoLocalChange(i, e.target.value)} placeholder="D001" maxLength={4} disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></td>
                          <td><input value={sol.nombre_local} disabled placeholder="Auto" style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafd' }} /></td>
                          <td><input value={sol.numero_solicitud} onChange={e => handleSolicitudChange(i, 'numero_solicitud', e.target.value)} placeholder="2060563" disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></td>
                          <td><input value={sol.numero_guia} onChange={e => handleSolicitudChange(i, 'numero_guia', e.target.value)} placeholder="264" disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></td>
                          <td><input type="number" ref={el => cantidadInputRefs.current[i] = el} value={sol.cantidad_bultos || ''} onChange={e => handleSolicitudChange(i, 'cantidad_bultos', parseInt(e.target.value) || 0)} placeholder="0" disabled={isDisabled} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></td>
                          <td><input type="number" value={sol.total_bultos || ''} onChange={e => handleSolicitudChange(i, 'total_bultos', parseInt(e.target.value) || 0)} placeholder="0" disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></td>
                          <td style={{ textAlign: 'center' }}>{guardadoParcial && i === solicitudActualIndex ? `${bultosGuardados}/${sol.total_bultos}` : ''}</td>
                          <td>{solicitudes.length > 1 && !guardadoParcial && <button onClick={() => eliminarSolicitud(i)} style={{ width: '28px', height: '28px', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}>×</button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!guardadoParcial && <button className="rd01-btn-agregar-solicitud" onClick={agregarSolicitud}>+ Agregar fila</button>}
              {mensaje && <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', fontSize: '13px', background: mensaje.includes('✅') ? '#dcfce7' : mensaje.includes('⚠️') ? '#fef3c7' : mensaje.includes('Error') ? '#fef2f2' : '#eff6ff', color: mensaje.includes('✅') ? '#15803d' : mensaje.includes('⚠️') ? '#92400e' : '#1e40af' }}>{mensaje}</div>}
            </div>
            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => { setShowCrearModal(false); setGuardadoParcial(false); cargarRegistros(); }}>Cancelar</button>
              <button className="ed01-btn-save" onClick={handleGuardar} disabled={guardando}>{guardando ? 'Guardando...' : guardadoParcial ? `Guardar P${String(palletContador + 1).padStart(2, '0')}` : 'Iniciar Registro'}</button>
            </div>
          </div>
        </div>
      )}

      {showDetalleModal && registroDetalle && (
        <div className="ed01-modal-overlay" onClick={() => setShowDetalleModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header"><h2>Detalle</h2><button className="ed01-modal-close" onClick={() => setShowDetalleModal(false)}>×</button></div>
            <div className="ed01-modal-body">
              <p><strong>ID:</strong> {registroDetalle.id_pallet}</p>
              <p><strong>Color:</strong> {registroDetalle.color} | <strong>Local:</strong> {registroDetalle.codigo_local} - {registroDetalle.nombre_local}</p>
              <p><strong>Solicitud:</strong> {registroDetalle.numero_solicitud} | <strong>Guía:</strong> {registroDetalle.numero_guia}</p>
              <p><strong>Cantidad:</strong> {registroDetalle.cantidad_bultos} | <strong>Total:</strong> {registroDetalle.total_bultos}</p>
              {registroDetalle.diferencia && <p><strong>Diferencia:</strong> {registroDetalle.diferencia}</p>}
              <p><strong>Estado:</strong> {registroDetalle.estado}</p>
              <RDDetallePallets numeroSolicitud={registroDetalle.numero_solicitud} />
              {registroDetalle.estado !== 'Cancelado' && (
                <div style={{ marginTop: '16px' }}><label>Observación</label><textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={2} style={{ width: '100%' }} /></div>
              )}
            </div>
            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => setShowDetalleModal(false)}>Cerrar</button>
              {registroDetalle.estado !== 'Cancelado' && <button className="ed01-btn-save" style={{ background: '#dc2626' }} onClick={() => handleCancelar(registroDetalle)}>Cancelar</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RDDetallePallets: React.FC<{ numeroSolicitud: string }> = ({ numeroSolicitud }) => {
  const [pallets, setPallets] = useState<string[]>([]);
  useEffect(() => {
    fetch(`${API_URL}/rd01_devoluciones?select=id_pallet&numero_solicitud=eq.${numeroSolicitud}&order=id_pallet`, { headers: HEADERS })
      .then(r => r.json()).then(d => { if (d) setPallets(d.map((x: any) => x.id_pallet)); });
  }, [numeroSolicitud]);
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{pallets.map((p, i) => <div key={i} className="rd01-pallet-mini">{p}</div>)}</div>;
};

export default RD01View;
