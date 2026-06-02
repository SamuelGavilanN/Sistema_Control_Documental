// src/components/Transactions/RD/RD01View.tsx

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import { locales, cargarLocales } from '../../../data/locales';
import './RD01.css';

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

  // Estados para guardado parcial
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
    const { data } = await supabase.from('usuarios').select('id, nombre, apellido');
    if (data) {
      const m: Record<string, string> = {};
      data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido}`; });
      setNombresUsuarios(m);
    }
  };

  const cargarColoresTipos = async () => {
    const { data } = await supabase.from('rd_colores_tipos').select('*').eq('activo', true).order('color');
    if (data) setColoresTipos(data);
  };

  const cargarRegistros = async () => {
    const { data } = await supabase
      .from('rd01_devoluciones')
      .select('*')
      .order('creado_en', { ascending: false });
    if (data) setRegistros(data);
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
      if (colorSelectRefs.current[nuevoIndex]) {
        colorSelectRefs.current[nuevoIndex]?.focus();
      }
    }, 100);
  };

  const eliminarSolicitud = (index: number) => {
    if (solicitudes.length === 1) return;
    setSolicitudes(solicitudes.filter((_, i) => i !== index));
  };

  const generarNumeroPallet = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generar_numero_devolucion');
    
    if (error) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const fechaFormateada = `${dd}${mm}${yyyy}`;
      const { count } = await supabase
        .from('rd01_devoluciones')
        .select('*', { count: 'exact', head: true });
      const correlativo = (count || 0) + 1;
      return `DEV${fechaFormateada}${String(correlativo).padStart(6, '0')}`;
    }
    
    return data as string;
  };

  const validarSolicitudInicial = (s: Solicitud): string | null => {
    if (!s.color) return 'Selecciona un color';
    if (!s.codigo_local) return 'Ingresa código de local';
    if (!s.nombre_local) return 'Local no encontrado';
    if (!s.numero_solicitud.trim()) return 'Ingresa número de solicitud';
    if (!s.numero_guia.trim()) return 'Ingresa número de guía';
    if (s.cantidad_bultos <= 0) return 'Cantidad de bultos debe ser mayor a 0';
    if (s.total_bultos <= 0) return 'Total de bultos debe ser mayor a 0';
    if (s.cantidad_bultos > s.total_bultos) return 'Cantidad de bultos no puede exceder el total';
    return null;
  };

  const guardarUnPallet = async (
    solicitud: Solicitud,
    infoColor: any,
    palletBase: string,
    numeroPallet: number,
    cantidad: number,
    userId: string
  ) => {
    const idPalletFinal = `${palletBase}P${String(numeroPallet).padStart(2, '0')}`;
    
    const { error } = await supabase
      .from('rd01_devoluciones')
      .insert([{
        id_pallet: idPalletFinal,
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
        estado: 'Finalizado',
        creado_por: userId,
        creado_en: new Date().toISOString(),
      }]);

    if (error) {
      throw new Error(`Error al guardar pallet ${idPalletFinal}: ${error.message}`);
    }

    return idPalletFinal;
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje('');

    try {
      const user = auth.getUsuario();
      if (!user) {
        setMensaje('Error: Usuario no autenticado');
        setGuardando(false);
        return;
      }

      // MODO PARCIAL: Continuar guardando pallets de la solicitud actual
      if (guardadoParcial) {
        const solicitud = solicitudes[solicitudActualIndex];
        const infoColor = getInfoColor(solicitud.color);
        const cantidadAhora = solicitud.cantidad_bultos;
        
        if (cantidadAhora <= 0) {
          setMensaje('Error: Ingresa la cantidad de bultos para este pallet');
          setGuardando(false);
          return;
        }

        const nuevoTotalGuardado = bultosGuardados + cantidadAhora;
        
        if (nuevoTotalGuardado > solicitud.total_bultos) {
          setMensaje(`Error: La suma (${nuevoTotalGuardado}) excede el total de bultos (${solicitud.total_bultos}). Máximo permitido: ${solicitud.total_bultos - bultosGuardados}`);
          setGuardando(false);
          return;
        }

        const nuevoPalletContador = palletContador + 1;
        await guardarUnPallet(solicitud, infoColor, palletBaseActual, nuevoPalletContador, cantidadAhora, user.id);

        const faltante = solicitud.total_bultos - nuevoTotalGuardado;

        if (faltante <= 0) {
          // COMPLETADO
          setMensaje(`¡Solicitud ${solicitud.numero_solicitud} completada! Total: ${solicitud.total_bultos} bultos en ${nuevoPalletContador} pallets.`);
          
          setGuardadoParcial(false);
          setPalletBaseActual('');
          setBultosGuardados(0);
          setPalletContador(1);

          const siguienteIndex = solicitudActualIndex + 1;
          if (siguienteIndex < solicitudes.length) {
            // Hay más solicitudes, pasar a la siguiente
            setSolicitudActualIndex(siguienteIndex);
            setGuardando(false);
            await cargarRegistros();
            setTimeout(() => {
              if (cantidadInputRefs.current[siguienteIndex]) {
                cantidadInputRefs.current[siguienteIndex]?.focus();
              }
            }, 300);
            return;
          } else {
            // Todas completadas
            setTimeout(() => {
              setShowCrearModal(false);
              setSolicitudes([{ ...ESTADO_INICIAL_SOLICITUD }]);
              setSolicitudActualIndex(0);
              setMensaje('');
            }, 2000);
            setGuardando(false);
            await cargarRegistros();
            return;
          }
        } else {
          // FALTANTE: Actualizar para siguiente pallet
          setBultosGuardados(nuevoTotalGuardado);
          setPalletContador(nuevoPalletContador);
          
          // Limpiar solo la cantidad de bultos, NO auto-completar
          const nuevasSolicitudes = [...solicitudes];
          nuevasSolicitudes[solicitudActualIndex] = {
            ...nuevasSolicitudes[solicitudActualIndex],
            cantidad_bultos: 0,
          };
          setSolicitudes(nuevasSolicitudes);

          setMensaje(`Pallet P${String(nuevoPalletContador).padStart(2, '0')} guardado (${cantidadAhora} bultos). Faltan ${faltante} bultos. Ingresa la cantidad para P${String(nuevoPalletContador + 1).padStart(2, '0')}.`);

          setTimeout(() => {
            if (cantidadInputRefs.current[solicitudActualIndex]) {
              cantidadInputRefs.current[solicitudActualIndex]?.focus();
            }
          }, 200);
        }

        setGuardando(false);
        await cargarRegistros();
        return;
      }

      // MODO NORMAL: Primer guardado
      const error = validarSolicitudInicial(solicitudes[0]);
      if (error) {
        setMensaje('Error: ' + error);
        setGuardando(false);
        return;
      }

      const solicitud = solicitudes[0];
      const infoColor = getInfoColor(solicitud.color);
      const bultosPorPallet = solicitud.cantidad_bultos;
      const totalBultos = solicitud.total_bultos;

      // Generar pallet base
      const palletBase = await generarNumeroPallet();

      if (bultosPorPallet >= totalBultos) {
        // Un solo pallet
        await guardarUnPallet(solicitud, infoColor, palletBase, 1, bultosPorPallet, user.id);
        setMensaje(`Pallet ${palletBase}P01 guardado correctamente.`);

        if (solicitudes.length > 1) {
          // Pasar a siguiente solicitud
          setTimeout(() => {
            setMensaje('');
            setSolicitudActualIndex(1);
            setGuardadoParcial(false);
            setGuardando(false);
            cargarRegistros();
            setTimeout(() => {
              if (cantidadInputRefs.current[1]) {
                cantidadInputRefs.current[1]?.focus();
              }
            }, 200);
          }, 1000);
          return;
        } else {
          setTimeout(() => {
            setShowCrearModal(false);
            setSolicitudes([{ ...ESTADO_INICIAL_SOLICITUD }]);
            setMensaje('');
          }, 1500);
          setGuardando(false);
          await cargarRegistros();
          return;
        }
      } else {
        // Múltiples pallets: guardar P01
        await guardarUnPallet(solicitud, infoColor, palletBase, 1, bultosPorPallet, user.id);
        
        const faltante = totalBultos - bultosPorPallet;

        setGuardadoParcial(true);
        setSolicitudActualIndex(0);
        setPalletBaseActual(palletBase);
        setBultosGuardados(bultosPorPallet);
        setPalletContador(1);

        // Limpiar cantidad, NO auto-completar
        const nuevasSolicitudes = [...solicitudes];
        nuevasSolicitudes[0] = {
          ...nuevasSolicitudes[0],
          cantidad_bultos: 0,
        };
        setSolicitudes(nuevasSolicitudes);

        setMensaje(`Pallet P01 guardado (${bultosPorPallet} bultos). Faltan ${faltante} bultos. Ingresa la cantidad para P02.`);

        setTimeout(() => {
          if (cantidadInputRefs.current[0]) {
            cantidadInputRefs.current[0]?.focus();
          }
        }, 200);
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
    await supabase
      .from('rd01_devoluciones')
      .update({
        estado: 'Cancelado',
        observacion: observacion || 'Cancelado por usuario',
        modificado_por: user?.id,
        modificado_en: new Date().toISOString(),
      })
      .eq('id', registro.id);
    setShowDetalleModal(false);
    cargarRegistros();
  };

  const verDetalle = (registro: RD01Registro) => {
    setRegistroDetalle(registro);
    setObservacion('');
    setShowDetalleModal(true);
  };

  // Mostrar TODOS los registros sin agrupar (cada pallet es una fila)
  const getRegistrosParaTabla = () => {
    // Agrupar solo para contar pallets por solicitud
    const conteo: Record<string, { total: number; pallets: string[] }> = {};
    registros.forEach(r => {
      if (!conteo[r.numero_solicitud]) {
        conteo[r.numero_solicitud] = { total: 0, pallets: [] };
      }
      conteo[r.numero_solicitud].total++;
      conteo[r.numero_solicitud].pallets.push(r.id_pallet);
    });

    // Devolver registros con info de conteo
    return registros.map(r => {
      const info = conteo[r.numero_solicitud];
      const palletsOrdenados = info.pallets.sort();
      const miPosicion = palletsOrdenados.indexOf(r.id_pallet) + 1;
      return {
        ...r,
        pallet_actual: miPosicion,
        total_pallets_solicitud: info.total,
      };
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
    setTimeout(() => {
      if (colorSelectRefs.current[0]) {
        colorSelectRefs.current[0]?.focus();
      }
    }, 200);
  };

  const registrosTabla = getRegistrosParaTabla();

  return (
    <div className="rd01-view">
      <div className="rd01-header">
        <h2>Recepción Devolución - Ingreso</h2>
        <button className="rd01-btn-nueva" onClick={abrirModalCrear}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Nuevo Ingreso
        </button>
      </div>

      {/* TABLA PRINCIPAL - Cada pallet es una fila independiente */}
      <div className="ed03-tabla-container" style={{ overflowX: 'auto' }}>
        <table className="ed03-tabla" style={{ minWidth: '2000px' }}>
          <thead>
            <tr>
              <th style={{ minWidth: '190px' }}>ID Pallet</th>
              <th style={{ minWidth: '80px' }}>Pallet</th>
              <th style={{ minWidth: '100px' }}>Color</th>
              <th style={{ minWidth: '85px' }}>Cod Local</th>
              <th style={{ minWidth: '150px' }}>Local</th>
              <th style={{ minWidth: '110px' }}>N° Solicitud</th>
              <th style={{ minWidth: '100px' }}>N° Guía</th>
              <th style={{ minWidth: '90px' }}>Cant. Bultos</th>
              <th style={{ minWidth: '90px' }}>Total Bultos</th>
              <th style={{ minWidth: '200px' }}>Tipo Devolución</th>
              <th style={{ minWidth: '130px' }}>Almacén Destino</th>
              <th style={{ minWidth: '130px' }}>Creado Por</th>
              <th style={{ minWidth: '110px' }}>Creado En</th>
              <th style={{ minWidth: '130px' }}>Modificado Por</th>
              <th style={{ minWidth: '110px' }}>Modificado En</th>
              <th style={{ minWidth: '90px' }}>Observación</th>
              <th style={{ minWidth: '140px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={17} style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr>
            ) : registrosTabla.length === 0 ? (
              <tr><td colSpan={17} style={{ textAlign: 'center', padding: '40px' }}>Sin registros</td></tr>
            ) : (
              registrosTabla.map((reg: any, i: number) => (
                <tr key={reg.id}>
                  <td style={{ fontFamily: 'Courier New, monospace', fontSize: '12px', color: '#1d4ed8', fontWeight: 600 }}>
                    {reg.id_pallet}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                      background: '#eef2ff', color: '#1d4ed8',
                    }}>
                      {reg.pallet_actual} de {reg.total_pallets_solicitud}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="rd01-color-badge" style={{ background: reg.color_hex || '#ccc' }} />
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>{reg.color}</span>
                    </div>
                  </td>
                  <td>{reg.codigo_local}</td>
                  <td style={{ whiteSpace: 'normal', wordBreak: 'normal', minWidth: '150px' }}>{reg.nombre_local}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{reg.numero_solicitud}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{reg.numero_guia}</td>
                  <td style={{ textAlign: 'center' }}>{reg.cantidad_bultos}</td>
                  <td style={{ textAlign: 'center' }}>{reg.total_bultos}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="rd01-tipo-badge" style={{ 
                      background: (reg.color_hex || '#ccc') + '20', 
                      color: reg.color_hex || '#333', 
                      border: `1px solid ${(reg.color_hex || '#ccc')}40`,
                      fontSize: '11px'
                    }}>
                      {reg.tipo_devolucion}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{reg.almacen_destino}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{nombresUsuarios[reg.creado_por] || reg.creado_por}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(reg.creado_en).toLocaleDateString('es-CL')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{reg.modificado_por ? (nombresUsuarios[reg.modificado_por] || reg.modificado_por) : '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{reg.modificado_en ? new Date(reg.modificado_en).toLocaleDateString('es-CL') : '-'}</td>
                  <td style={{ textAlign: 'center' }}>{reg.observacion ? 'Si' : 'No'}</td>
                  <td>
                    <div className="rd01-acciones" style={{ whiteSpace: 'nowrap' }}>
                      <button className="rd01-btn-detalle" onClick={() => verDetalle(reg)}>Detalle</button>
                      {reg.estado !== 'Cancelado' && (
                        <button className="rd01-btn-cancelar" onClick={() => handleCancelar(reg)}>Cancelar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR */}
      {showCrearModal && (
        <div className="ed01-modal-overlay" onClick={() => !guardando && setShowCrearModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '1200px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header">
              <h2>
                {guardadoParcial 
                  ? `Continuando: ${solicitudes[solicitudActualIndex]?.numero_solicitud} - Pallet P${String(palletContador + 1).padStart(2, '0')}`
                  : 'Nuevo Ingreso Devolución'}
              </h2>
              <button className="ed01-modal-close" onClick={() => {
                if (guardadoParcial && !confirm('¿Salir sin completar todos los pallets?')) return;
                setShowCrearModal(false);
                setGuardadoParcial(false);
              }} disabled={guardando}>×</button>
            </div>
            
            <div className="ed01-modal-body">
              {guardadoParcial && (
                <div style={{
                  background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px',
                  padding: '12px 16px', marginBottom: '12px', fontSize: '13px', color: '#1e40af'
                }}>
                  <strong>{solicitudes[solicitudActualIndex]?.numero_solicitud}:</strong>{' '}
                  Guardado: {bultosGuardados} de {solicitudes[solicitudActualIndex]?.total_bultos} bultos.{' '}
                  <strong>Faltan: {solicitudes[solicitudActualIndex]?.total_bultos - bultosGuardados} bultos.</strong>
                  {' '}Ingresa la cantidad para el siguiente pallet.
                </div>
              )}

              {!guardadoParcial && (
                <div className="rd01-pallet-info">
                  <span>Completa los datos. Si la cantidad de bultos es menor al total, se irán generando pallets adicionales.</span>
                </div>
              )}

              <div className="ed03-tabla-container" style={{ maxHeight: '400px', marginBottom: '12px', overflowX: 'auto' }}>
                <table className="ed03-tabla" style={{ minWidth: '950px' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '150px' }}>Color *</th>
                      <th style={{ minWidth: '100px' }}>Cod Local *</th>
                      <th style={{ minWidth: '160px' }}>Local</th>
                      <th style={{ minWidth: '130px' }}>N° Solicitud *</th>
                      <th style={{ minWidth: '120px' }}>N° Guía *</th>
                      <th style={{ minWidth: '110px' }}>Cant. Bultos *</th>
                      <th style={{ minWidth: '110px' }}>Total Bultos *</th>
                      <th style={{ minWidth: '80px' }}>Progreso</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes.map((sol, index) => {
                      const isDisabled = guardadoParcial && index !== solicitudActualIndex;
                      const isActual = guardadoParcial && index === solicitudActualIndex;
                      
                      // Calcular progreso para esta solicitud
                      let progreso = '';
                      if (index === solicitudActualIndex && guardadoParcial) {
                        progreso = `${bultosGuardados}/${sol.total_bultos}`;
                      } else if (sol.cantidad_bultos > 0 && sol.total_bultos > 0) {
                        if (sol.cantidad_bultos >= sol.total_bultos) {
                          progreso = '1 pallet';
                        } else {
                          const estimados = Math.ceil(sol.total_bultos / sol.cantidad_bultos);
                          progreso = `~${estimados} pallets`;
                        }
                      }
                      
                      return (
                        <tr key={index} style={{ opacity: isDisabled ? 0.4 : 1, background: isActual ? '#fef9e7' : 'transparent' }}>
                          <td>
                            <select
                              ref={(el) => { colorSelectRefs.current[index] = el; }}
                              value={sol.color}
                              onChange={e => handleSolicitudChange(index, 'color', e.target.value)}
                              disabled={isDisabled || guardadoParcial}
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }}
                            >
                              <option value="">Seleccionar...</option>
                              {coloresTipos.map(c => (
                                <option key={c.id} value={c.color}>{c.color}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              value={sol.codigo_local}
                              onChange={e => handleCodigoLocalChange(index, e.target.value)}
                              placeholder="D001"
                              maxLength={4}
                              disabled={isDisabled || guardadoParcial}
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={sol.nombre_local}
                              disabled
                              placeholder="Auto"
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafd', color: '#64748b' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={sol.numero_solicitud}
                              onChange={e => handleSolicitudChange(index, 'numero_solicitud', e.target.value)}
                              placeholder="2060563"
                              disabled={isDisabled || guardadoParcial}
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={sol.numero_guia}
                              onChange={e => handleSolicitudChange(index, 'numero_guia', e.target.value)}
                              placeholder="264"
                              disabled={isDisabled || guardadoParcial}
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              ref={(el) => { cantidadInputRefs.current[index] = el; }}
                              className="rd01-input-cantidad"
                              value={sol.cantidad_bultos || ''}
                              onChange={e => handleSolicitudChange(index, 'cantidad_bultos', parseInt(e.target.value) || 0)}
                              min="0"
                              placeholder={isActual ? `Máx: ${sol.total_bultos - bultosGuardados}` : '0'}
                              disabled={isDisabled}
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: `1px solid ${isActual ? '#f59e0b' : '#e2e8f0'}`, borderRadius: '6px', background: isDisabled ? '#f1f5f9' : (isActual ? '#fffdf5' : 'white') }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={sol.total_bultos || ''}
                              onChange={e => handleSolicitudChange(index, 'total_bultos', parseInt(e.target.value) || 0)}
                              min="0"
                              placeholder="0"
                              disabled={isDisabled || guardadoParcial}
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {progreso && (
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                background: isActual ? '#fef3c7' : '#eef2ff',
                                borderRadius: '6px',
                                fontWeight: 600,
                                color: isActual ? '#92400e' : '#1d4ed8',
                                fontSize: '13px',
                              }}>
                                {progreso}
                              </span>
                            )}
                          </td>
                          <td>
                            {solicitudes.length > 1 && !guardadoParcial && (
                              <button
                                onClick={() => eliminarSolicitud(index)}
                                style={{
                                  width: '28px', height: '28px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px',
                                  color: '#ef4444', fontSize: '18px', cursor: 'pointer'
                                }}
                                title="Eliminar fila"
                              >×</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!guardadoParcial && (
                <button className="rd01-btn-agregar-solicitud" onClick={agregarSolicitud}>
                  + Agregar fila
                </button>
              )}

              {mensaje && (
                <div style={{
                  marginTop: '12px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px',
                  background: mensaje.includes('Error') ? '#fef2f2' : (mensaje.includes('completada') ? '#dcfce7' : '#eff6ff'),
                  color: mensaje.includes('Error') ? '#dc2626' : (mensaje.includes('completada') ? '#15803d' : '#1e40af'),
                  border: `1px solid ${mensaje.includes('Error') ? '#fecaca' : (mensaje.includes('completada') ? '#bbf7d0' : '#bfdbfe')}`,
                  fontWeight: 500,
                }}>
                  {mensaje}
                </div>
              )}
            </div>

            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => {
                if (guardadoParcial && !confirm('¿Salir sin completar todos los pallets? Los pallets ya guardados se conservan.')) return;
                setShowCrearModal(false);
                setGuardadoParcial(false);
                cargarRegistros();
              }} disabled={guardando}>
                {guardadoParcial ? 'Salir (guardado parcial)' : 'Cancelar'}
              </button>
              <button className="ed01-btn-save" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : (guardadoParcial ? `Guardar P${String(palletContador + 1).padStart(2, '0')}` : 'Iniciar Registro')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {showDetalleModal && registroDetalle && (
        <div className="ed01-modal-overlay" onClick={() => setShowDetalleModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header">
              <h2>Detalle Devolución</h2>
              <button className="ed01-modal-close" onClick={() => setShowDetalleModal(false)}>×</button>
            </div>
            <div className="ed01-modal-body">
              <div className="rd01-detalle-info">
                <div className="rd01-detalle-row"><div><strong>ID Pallet:</strong> {registroDetalle.id_pallet}</div></div>
                <div className="rd01-detalle-row">
                  <div><strong>Color:</strong> {registroDetalle.color}</div>
                  <div><strong>Local:</strong> {registroDetalle.codigo_local} - {registroDetalle.nombre_local}</div>
                </div>
                <div className="rd01-detalle-row">
                  <div><strong>Solicitud:</strong> {registroDetalle.numero_solicitud}</div>
                  <div><strong>Guía:</strong> {registroDetalle.numero_guia}</div>
                </div>
                <div className="rd01-detalle-row">
                  <div><strong>Cant. Bultos:</strong> {registroDetalle.cantidad_bultos}</div>
                  <div><strong>Total Bultos:</strong> {registroDetalle.total_bultos}</div>
                </div>
                <div className="rd01-detalle-row">
                  <div><strong>Tipo:</strong> {registroDetalle.tipo_devolucion}</div>
                  <div><strong>Almacén:</strong> {registroDetalle.almacen_destino}</div>
                </div>
                <div className="rd01-detalle-row">
                  <div><strong>Estado:</strong> {registroDetalle.estado}</div>
                  <div><strong>Creado:</strong> {new Date(registroDetalle.creado_en).toLocaleString('es-CL')}</div>
                </div>
              </div>

              <div className="rd01-detalle-pallets">
                <h4>Pallets de esta Solicitud</h4>
                <RDDetallePallets numeroSolicitud={registroDetalle.numero_solicitud} />
              </div>

              {registroDetalle.estado !== 'Cancelado' && (
                <div className="ed01-field" style={{ marginTop: '16px' }}>
                  <label>Observación (para cancelar)</label>
                  <textarea
                    value={observacion}
                    onChange={e => setObservacion(e.target.value)}
                    rows={2}
                    placeholder="Motivo de cancelación..."
                  />
                </div>
              )}
            </div>
            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => setShowDetalleModal(false)}>Cerrar</button>
              {registroDetalle.estado !== 'Cancelado' && (
                <button className="ed01-btn-save" style={{ background: '#dc2626' }} onClick={() => handleCancelar(registroDetalle)}>
                  Cancelar Devolución
                </button>
              )}
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
    const cargar = async () => {
      const { data } = await supabase
        .from('rd01_devoluciones')
        .select('id_pallet')
        .eq('numero_solicitud', numeroSolicitud)
        .order('id_pallet');
      if (data) setPallets(data.map(r => r.id_pallet));
    };
    cargar();
  }, [numeroSolicitud]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {pallets.map((p, i) => (
        <div key={i} className="rd01-pallet-mini">{p}</div>
      ))}
    </div>
  );
};

export default RD01View;
