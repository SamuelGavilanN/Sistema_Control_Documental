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

  // Refs para los selects de color
  const colorSelectRefs = useRef<(HTMLSelectElement | null)[]>([]);

  // Estados para controlar el guardado parcial por solicitud
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

  const validarSolicitud = (s: Solicitud, index: number, esContinuacion: boolean): string | null => {
    if (!esContinuacion) {
      if (!s.color) return 'Selecciona un color';
      if (!s.codigo_local) return 'Ingresa código de local';
      if (!s.nombre_local) return 'Local no encontrado';
      if (!s.numero_solicitud.trim()) return 'Ingresa número de solicitud';
      if (!s.numero_guia.trim()) return 'Ingresa número de guía';
    }
    if (s.cantidad_bultos <= 0) return 'Cantidad de bultos debe ser mayor a 0';
    if (s.total_bultos <= 0) return 'Total de bultos debe ser mayor a 0';
    if (s.cantidad_bultos > s.total_bultos) return 'Cantidad de bultos no puede exceder el total';
    return null;
  };

  // Guardar un pallet individual
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

      // Si estamos en modo guardado parcial, continuar con la solicitud actual
      if (guardadoParcial) {
        const solicitud = solicitudes[solicitudActualIndex];
        const infoColor = getInfoColor(solicitud.color);
        const cantidadAhora = solicitud.cantidad_bultos;
        
        // Validar solo la cantidad
        if (cantidadAhora <= 0) {
          setMensaje('Error: Cantidad de bultos debe ser mayor a 0');
          setGuardando(false);
          return;
        }

        const nuevoTotalGuardado = bultosGuardados + cantidadAhora;
        
        if (nuevoTotalGuardado > solicitud.total_bultos) {
          setMensaje(`Error: La suma (${nuevoTotalGuardado}) excede el total de bultos (${solicitud.total_bultos})`);
          setGuardando(false);
          return;
        }

        // Guardar este pallet
        const nuevoPalletContador = palletContador + 1;
        await guardarUnPallet(solicitud, infoColor, palletBaseActual, nuevoPalletContador, cantidadAhora, user.id);

        const faltante = solicitud.total_bultos - nuevoTotalGuardado;

        if (faltante <= 0) {
          // COMPLETADO: Todos los pallets de esta solicitud guardados
          setMensaje(`Pallet ${palletBaseActual}P${String(nuevoPalletContador).padStart(2, '0')} guardado. ¡Solicitud ${solicitud.numero_solicitud} completada!`);
          
          // Limpiar estado parcial
          setGuardadoParcial(false);
          setPalletBaseActual('');
          setBultosGuardados(0);
          setPalletContador(1);

          // Pasar a la siguiente solicitud si hay más
          const siguienteIndex = solicitudActualIndex + 1;
          if (siguienteIndex < solicitudes.length) {
            setSolicitudActualIndex(siguienteIndex);
            setGuardando(false);
            // Enfocar el campo de cantidad de la siguiente solicitud
            setTimeout(() => {
              const inputs = document.querySelectorAll('.rd01-input-cantidad');
              if (inputs[siguienteIndex]) {
                (inputs[siguienteIndex] as HTMLInputElement).focus();
              }
            }, 200);
            await cargarRegistros();
            return;
          } else {
            // Todas las solicitudes completadas, cerrar modal
            setTimeout(() => {
              setMensaje('');
              setShowCrearModal(false);
              setSolicitudes([{ ...ESTADO_INICIAL_SOLICITUD }]);
              setSolicitudActualIndex(0);
            }, 2000);
            setGuardando(false);
            await cargarRegistros();
            return;
          }
        } else {
          // FALTANTE: Actualizar cantidad de bultos al faltante
          setMensaje(`Pallet ${palletBaseActual}P${String(nuevoPalletContador).padStart(2, '0')} guardado. Faltan ${faltante} bultos. Ingresa la cantidad para el siguiente pallet.`);
          setBultosGuardados(nuevoTotalGuardado);
          setPalletContador(nuevoPalletContador);

          // Actualizar la cantidad de bultos en la solicitud actual al faltante
          const nuevasSolicitudes = [...solicitudes];
          nuevasSolicitudes[solicitudActualIndex] = {
            ...nuevasSolicitudes[solicitudActualIndex],
            cantidad_bultos: faltante,
          };
          setSolicitudes(nuevasSolicitudes);

          // Enfocar el campo de cantidad
          setTimeout(() => {
            const inputs = document.querySelectorAll('.rd01-input-cantidad');
            if (inputs[solicitudActualIndex]) {
              (inputs[solicitudActualIndex] as HTMLInputElement).focus();
              (inputs[solicitudActualIndex] as HTMLInputElement).select();
            }
          }, 200);
        }

        setGuardando(false);
        await cargarRegistros();
        return;
      }

      // MODO NORMAL: Primera vez que se guarda
      // Validar la primera solicitud
      const primerError = validarSolicitud(solicitudes[0], 0, false);
      if (primerError) {
        setMensaje('Error: ' + primerError);
        setGuardando(false);
        return;
      }

      const solicitud = solicitudes[0];
      const infoColor = getInfoColor(solicitud.color);
      const bultosPorPallet = solicitud.cantidad_bultos;
      const totalBultos = solicitud.total_bultos;
      const cantidadPallets = Math.ceil(totalBultos / bultosPorPallet);

      // Generar pallet base
      const palletBase = await generarNumeroPallet();

      if (cantidadPallets === 1) {
        // Solo un pallet: guardar directamente
        await guardarUnPallet(solicitud, infoColor, palletBase, 1, bultosPorPallet, user.id);
        setMensaje(`Pallet ${palletBase}P01 guardado correctamente.`);

        // Pasar a la siguiente solicitud si hay más
        if (solicitudes.length > 1) {
          setTimeout(async () => {
            setMensaje('');
            setSolicitudActualIndex(1);
            setGuardadoParcial(false);
            setPalletBaseActual('');
            setBultosGuardados(0);
            setPalletContador(1);
            setGuardando(false);
            await cargarRegistros();
            setTimeout(() => {
              const inputs = document.querySelectorAll('.rd01-input-cantidad');
              if (inputs[1]) {
                (inputs[1] as HTMLInputElement).focus();
              }
            }, 200);
          }, 1500);
          return;
        } else {
          // Solo una solicitud, cerrar modal
          setTimeout(() => {
            setMensaje('');
            setShowCrearModal(false);
            setSolicitudes([{ ...ESTADO_INICIAL_SOLICITUD }]);
          }, 1500);
          setGuardando(false);
          await cargarRegistros();
          return;
        }
      } else {
        // Múltiples pallets: guardar el primero y continuar
        await guardarUnPallet(solicitud, infoColor, palletBase, 1, bultosPorPallet, user.id);
        
        const bultosGuardadosAhora = bultosPorPallet;
        const faltante = totalBultos - bultosGuardadosAhora;

        setMensaje(`Pallet ${palletBase}P01 guardado. Faltan ${faltante} bultos. Ingresa la cantidad para el siguiente pallet.`);

        // Activar modo guardado parcial
        setGuardadoParcial(true);
        setSolicitudActualIndex(0);
        setPalletBaseActual(palletBase);
        setBultosGuardados(bultosGuardadosAhora);
        setPalletContador(1);

        // Actualizar la cantidad de bultos al faltante
        const nuevasSolicitudes = [...solicitudes];
        nuevasSolicitudes[0] = {
          ...nuevasSolicitudes[0],
          cantidad_bultos: faltante,
        };
        setSolicitudes(nuevasSolicitudes);

        // Enfocar el campo de cantidad
        setTimeout(() => {
          const inputs = document.querySelectorAll('.rd01-input-cantidad');
          if (inputs[0]) {
            (inputs[0] as HTMLInputElement).focus();
            (inputs[0] as HTMLInputElement).select();
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
    const { data: relacionados } = await supabase
      .from('rd01_devoluciones')
      .select('id')
      .eq('numero_solicitud', registro.numero_solicitud);

    if (relacionados) {
      for (const r of relacionados) {
        await supabase
          .from('rd01_devoluciones')
          .update({
            estado: 'Cancelado',
            observacion: observacion || 'Cancelado por usuario',
            modificado_por: user?.id,
            modificado_en: new Date().toISOString(),
          })
          .eq('id', r.id);
      }
    }
    setShowDetalleModal(false);
    cargarRegistros();
  };

  const verDetalle = (registro: RD01Registro) => {
    setRegistroDetalle(registro);
    setObservacion('');
    setShowDetalleModal(true);
  };

  const getRegistrosAgrupados = () => {
    const grupos: Record<string, any> = {};

    registros.forEach(r => {
      const key = r.numero_solicitud;
      if (!grupos[key]) {
        grupos[key] = {
          solicitud: r.numero_solicitud,
          color: r.color,
          color_hex: r.color_hex,
          codigo_local: r.codigo_local,
          nombre_local: r.nombre_local,
          guia: r.numero_guia,
          tipo_devolucion: r.tipo_devolucion,
          almacen_destino: r.almacen_destino,
          estado: r.estado,
          creado_por: r.creado_por,
          creado_en: r.creado_en,
          modificado_por: r.modificado_por,
          modificado_en: r.modificado_en,
          observacion: r.observacion,
          pallets: [],
          cantidadBultos: 0,
          totalBultos: r.total_bultos,
        };
      }
      grupos[key].pallets.push(r.id_pallet);
      grupos[key].cantidadBultos += r.cantidad_bultos;
    });

    return Object.values(grupos);
  };

  // Abrir modal de creación
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

      {/* TABLA PRINCIPAL */}
      <div className="ed03-tabla-container" style={{ overflowX: 'auto' }}>
        <table className="ed03-tabla" style={{ minWidth: '2000px' }}>
          <thead>
            <tr>
              <th style={{ minWidth: '170px' }}>ID Pallet</th>
              <th style={{ minWidth: '100px' }}>Color</th>
              <th style={{ minWidth: '85px' }}>Cod Local</th>
              <th style={{ minWidth: '150px' }}>Local</th>
              <th style={{ minWidth: '110px' }}>N° Solicitud</th>
              <th style={{ minWidth: '100px' }}>N° Guía</th>
              <th style={{ minWidth: '90px' }}>Cant. Bultos</th>
              <th style={{ minWidth: '90px' }}>Total Bultos</th>
              <th style={{ minWidth: '85px' }}>Cant. Pallet</th>
              <th style={{ minWidth: '85px' }}>Total Pallet</th>
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
              <tr><td colSpan={18} style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr>
            ) : getRegistrosAgrupados().length === 0 ? (
              <tr><td colSpan={18} style={{ textAlign: 'center', padding: '40px' }}>Sin registros</td></tr>
            ) : (
              getRegistrosAgrupados().map((grupo: any, i: number) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {grupo.pallets.map((p: string, idx: number) => (
                        <span key={idx} style={{ fontFamily: 'Courier New, monospace', fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="rd01-color-badge" style={{ background: grupo.color_hex || '#ccc' }} />
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>{grupo.color}</span>
                    </div>
                  </td>
                  <td>{grupo.codigo_local}</td>
                  <td style={{ whiteSpace: 'normal', wordBreak: 'normal', minWidth: '150px' }}>{grupo.nombre_local}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{grupo.solicitud}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{grupo.guia}</td>
                  <td style={{ textAlign: 'center' }}>{grupo.cantidadBultos}</td>
                  <td style={{ textAlign: 'center' }}>{grupo.totalBultos}</td>
                  <td style={{ textAlign: 'center' }}>{grupo.pallets.length}</td>
                  <td style={{ textAlign: 'center' }}>{grupo.pallets.length}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="rd01-tipo-badge" style={{ 
                      background: (grupo.color_hex || '#ccc') + '20', 
                      color: grupo.color_hex || '#333', 
                      border: `1px solid ${(grupo.color_hex || '#ccc')}40`,
                      fontSize: '11px'
                    }}>
                      {grupo.tipo_devolucion}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{grupo.almacen_destino}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{nombresUsuarios[grupo.creado_por] || grupo.creado_por}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(grupo.creado_en).toLocaleDateString('es-CL')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{grupo.modificado_por ? (nombresUsuarios[grupo.modificado_por] || grupo.modificado_por) : '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{grupo.modificado_en ? new Date(grupo.modificado_en).toLocaleDateString('es-CL') : '-'}</td>
                  <td style={{ textAlign: 'center' }}>{grupo.observacion ? 'Si' : 'No'}</td>
                  <td>
                    <div className="rd01-acciones" style={{ whiteSpace: 'nowrap' }}>
                      <button className="rd01-btn-detalle" onClick={() => {
                        const reg = registros.find(r => r.numero_solicitud === grupo.solicitud);
                        if (reg) verDetalle(reg);
                      }}>Detalle</button>
                      {grupo.estado !== 'Cancelado' && (
                        <button className="rd01-btn-cancelar" onClick={() => {
                          const reg = registros.find(r => r.numero_solicitud === grupo.solicitud);
                          if (reg) handleCancelar(reg);
                        }}>Cancelar</button>
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
              <h2>Nuevo Ingreso Devolución {guardadoParcial && `- Continuando ${palletBaseActual}`}</h2>
              <button className="ed01-modal-close" onClick={() => {
                if (guardadoParcial && !confirm('¿Salir sin completar todos los pallets?')) return;
                setShowCrearModal(false);
                setGuardadoParcial(false);
              }} disabled={guardando}>×</button>
            </div>
            
            <div className="ed01-modal-body">
              {guardadoParcial && (
                <div style={{
                  background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px',
                  padding: '12px 16px', marginBottom: '12px', fontSize: '13px', color: '#92400e'
                }}>
                  <strong>Continuando solicitud {solicitudes[solicitudActualIndex]?.numero_solicitud}:</strong>{' '}
                  Guardados {bultosGuardados} de {solicitudes[solicitudActualIndex]?.total_bultos} bultos.{' '}
                  Faltan {solicitudes[solicitudActualIndex]?.total_bultos - bultosGuardados} bultos.
                </div>
              )}

              <div className="rd01-pallet-info">
                <span>ID Pallet se genera automáticamente. Si hay múltiples pallets, se irán guardando uno por uno hasta completar el total.</span>
              </div>

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
                      <th style={{ minWidth: '80px' }}>Pallets</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes.map((sol, index) => {
                      const palletsNecesarios = sol.cantidad_bultos > 0 && sol.total_bultos > 0
                        ? Math.ceil(sol.total_bultos / sol.cantidad_bultos)
                        : 0;
                      
                      const isDisabled = guardadoParcial && index !== solicitudActualIndex;
                      
                      return (
                        <tr key={index} style={{ opacity: isDisabled ? 0.5 : 1 }}>
                          <td>
                            <select
                              ref={(el) => { colorSelectRefs.current[index] = el; }}
                              value={sol.color}
                              onChange={e => handleSolicitudChange(index, 'color', e.target.value)}
                              disabled={isDisabled || guardadoParcial}
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: isDisabled ? '#f1f5f9' : 'white' }}
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
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: isDisabled ? '#f1f5f9' : 'white' }}
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
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: isDisabled ? '#f1f5f9' : 'white' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={sol.numero_guia}
                              onChange={e => handleSolicitudChange(index, 'numero_guia', e.target.value)}
                              placeholder="264"
                              disabled={isDisabled || guardadoParcial}
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: isDisabled ? '#f1f5f9' : 'white' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="rd01-input-cantidad"
                              value={sol.cantidad_bultos || ''}
                              onChange={e => handleSolicitudChange(index, 'cantidad_bultos', parseInt(e.target.value) || 0)}
                              min="0"
                              placeholder="0"
                              disabled={isDisabled}
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: isDisabled ? '#f1f5f9' : (guardadoParcial ? '#fef3c7' : 'white') }}
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
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: isDisabled ? '#f1f5f9' : 'white' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              background: '#eef2ff',
                              borderRadius: '6px',
                              fontWeight: 600,
                              color: '#1d4ed8',
                              fontSize: '14px',
                            }}>
                              {palletsNecesarios || '-'}
                            </span>
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
                  marginTop: '12px', padding: '10px', borderRadius: '8px', fontSize: '13px',
                  background: mensaje.includes('Error') ? '#fef2f2' : (mensaje.includes('completada') ? '#dcfce7' : '#eff6ff'),
                  color: mensaje.includes('Error') ? '#dc2626' : (mensaje.includes('completada') ? '#15803d' : '#1d4ed8'),
                  border: mensaje.includes('Error') ? '1px solid #fecaca' : (mensaje.includes('completada') ? '1px solid #bbf7d0' : '1px solid #bfdbfe'),
                }}>
                  {mensaje}
                </div>
              )}
            </div>

            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => {
                if (guardadoParcial && !confirm('¿Salir sin completar todos los pallets?')) return;
                setShowCrearModal(false);
                setGuardadoParcial(false);
              }} disabled={guardando}>
                Cancelar
              </button>
              <button className="ed01-btn-save" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : (guardadoParcial ? `Guardar Pallet ${palletBaseActual}P${String(palletContador + 1).padStart(2, '0')}` : 'Registrar Ingreso')}
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
