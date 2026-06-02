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
  const [showDiferenciaModal, setShowDiferenciaModal] = useState(false);
  const [registroDetalle, setRegistroDetalle] = useState<RD01Registro | null>(null);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([{ ...ESTADO_INICIAL_SOLICITUD }]);
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [observacion, setObservacion] = useState('');
  const [observacionDiferencia, setObservacionDiferencia] = useState('');
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});

  const colorSelectRefs = useRef<(HTMLSelectElement | null)[]>([]);
  const cantidadInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [guardadoParcial, setGuardadoParcial] = useState(false);
  const [solicitudActualIndex, setSolicitudActualIndex] = useState(0);
  const [palletBaseActual, setPalletBaseActual] = useState('');
  const [bultosGuardados, setBultosGuardados] = useState(0);
  const [palletContador, setPalletContador] = useState(1);

  const [diferenciaPendiente, setDiferenciaPendiente] = useState<{
    cantidad: number;
    total: number;
    diferencia: number;
    solicitud: Solicitud;
    infoColor: any;
    palletBase: string;
    palletContador: number;
  } | null>(null);

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
    return null;
  };

  const guardarUnPallet = async (
    solicitud: Solicitud,
    infoColor: any,
    palletBase: string,
    numeroPallet: number,
    cantidad: number,
    userId: string,
    estado: string = 'Finalizado',
    diferencia: number | null = null
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
        estado: estado,
        diferencia: diferencia,
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

      // ===== MODO PARCIAL: Continuar guardando pallets =====
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
        const faltante = solicitud.total_bultos - nuevoTotalGuardado;
        const esUltimoPallet = faltante <= 0;

        if (esUltimoPallet) {
          if (nuevoTotalGuardado !== solicitud.total_bultos) {
            setDiferenciaPendiente({
              cantidad: cantidadAhora,
              total: solicitud.total_bultos,
              diferencia: solicitud.total_bultos - nuevoTotalGuardado,
              solicitud,
              infoColor,
              palletBase: palletBaseActual,
              palletContador: palletContador + 1,
            });
            setShowDiferenciaModal(true);
            setGuardando(false);
            return;
          }
        }

        const nuevoPalletContador = palletContador + 1;
        await guardarUnPallet(solicitud, infoColor, palletBaseActual, nuevoPalletContador, cantidadAhora, user.id);

                if (esUltimoPallet) {
          // COMPLETADO - Verificar suma total de todos los pallets de esta solicitud
          const query = supabase
            .from('rd01_devoluciones')
            .select('cantidad_bultos')
            .eq('numero_solicitud', solicitud.numero_solicitud);
          
          const resp: any = await query;
          const palletsSolicitud = resp.data as { cantidad_bultos: number }[] | null;

          if (palletsSolicitud) {
            const sumaTotal = palletsSolicitud.reduce((sum: number, p: any) => sum + (p.cantidad_bultos || 0), 0);
            const diferenciaTotal = solicitud.total_bultos - sumaTotal;

            if (diferenciaTotal !== 0) {
              await supabase
                .from('rd01_devoluciones')
                .update({ 
                  estado: 'Con Diferencias', 
                  diferencia: diferenciaTotal 
                })
                .eq('numero_solicitud', solicitud.numero_solicitud);

              setMensaje(`⚠️ Solicitud ${solicitud.numero_solicitud} completada con diferencias! Diferencia total: ${diferenciaTotal > 0 ? '+' : ''}${diferenciaTotal} bultos.`);
            } else {
              setMensaje(`✅ Solicitud ${solicitud.numero_solicitud} completada! Total: ${solicitud.total_bultos} bultos en ${nuevoPalletContador} pallets.`);
            }
          }

          setGuardadoParcial(false);
          setPalletBaseActual('');
          setBultosGuardados(0);
          setPalletContador(1);

          const siguienteIndex = solicitudActualIndex + 1;
          if (siguienteIndex < solicitudes.length) {
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
            setTimeout(() => {
              setShowCrearModal(false);
              setSolicitudes([{ ...ESTADO_INICIAL_SOLICITUD }]);
              setSolicitudActualIndex(0);
              setMensaje('');
            }, 2500);
            setGuardando(false);
            await cargarRegistros();
            return;
          }
        } else {
          setBultosGuardados(nuevoTotalGuardado);
          setPalletContador(nuevoPalletContador);
          
          const nuevasSolicitudes = [...solicitudes];
          nuevasSolicitudes[solicitudActualIndex] = {
            ...nuevasSolicitudes[solicitudActualIndex],
            cantidad_bultos: 0,
          };
          setSolicitudes(nuevasSolicitudes);

          setMensaje(`Pallet P${String(nuevoPalletContador).padStart(2, '0')} guardado (${cantidadAhora} bultos). Faltan ${faltante} bultos.`);

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

      // ===== MODO NORMAL: Primer guardado =====
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

      const palletBase = await generarNumeroPallet();

      if (bultosPorPallet === totalBultos) {
        await guardarUnPallet(solicitud, infoColor, palletBase, 1, bultosPorPallet, user.id);
        setMensaje(`Pallet ${palletBase}P01 guardado correctamente.`);

        if (solicitudes.length > 1) {
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
      } else if (bultosPorPallet > totalBultos) {
        setDiferenciaPendiente({
          cantidad: bultosPorPallet,
          total: totalBultos,
          diferencia: totalBultos - bultosPorPallet,
          solicitud,
          infoColor,
          palletBase,
          palletContador: 1,
        });
        setShowDiferenciaModal(true);
        setGuardando(false);
        return;
      } else {
        await guardarUnPallet(solicitud, infoColor, palletBase, 1, bultosPorPallet, user.id);
        
        const faltante = totalBultos - bultosPorPallet;

        setGuardadoParcial(true);
        setSolicitudActualIndex(0);
        setPalletBaseActual(palletBase);
        setBultosGuardados(bultosPorPallet);
        setPalletContador(1);

        const nuevasSolicitudes = [...solicitudes];
        nuevasSolicitudes[0] = {
          ...nuevasSolicitudes[0],
          cantidad_bultos: 0,
        };
        setSolicitudes(nuevasSolicitudes);

        setMensaje(`Pallet P01 guardado (${bultosPorPallet} bultos). Faltan ${faltante} bultos.`);

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

  const handleGuardarConDiferencia = async () => {
    if (!diferenciaPendiente || !observacionDiferencia.trim()) {
      setMensaje('Debes ingresar una observación para guardar con diferencias');
      return;
    }

    setGuardando(true);
    try {
      const user = auth.getUsuario();
      if (!user) return;

      const { cantidad, solicitud, infoColor, palletBase, palletContador, diferencia } = diferenciaPendiente;

      const idPallet = await guardarUnPallet(
        solicitud,
        infoColor,
        palletBase,
        palletContador,
        cantidad,
        user.id,
        'Con Diferencias',
        diferencia
      );

      await supabase
        .from('rd01_devoluciones')
        .update({ observacion: observacionDiferencia })
        .eq('id_pallet', idPallet);

      await supabase
        .from('rd01_devoluciones')
        .update({ 
          estado: 'Con Diferencias', 
          diferencia: diferencia 
        })
        .eq('numero_solicitud', solicitud.numero_solicitud);

      setMensaje(`Pallet ${idPallet} guardado con diferencias (${diferencia > 0 ? '+' : ''}${diferencia} bultos).`);
      setShowDiferenciaModal(false);
      setDiferenciaPendiente(null);
      setObservacionDiferencia('');
      setGuardadoParcial(false);
      setPalletBaseActual('');
      setBultosGuardados(0);
      setPalletContador(1);

      const siguienteIndex = solicitudActualIndex + 1;
      if (siguienteIndex < solicitudes.length) {
        setSolicitudActualIndex(siguienteIndex);
        setTimeout(() => {
          if (cantidadInputRefs.current[siguienteIndex]) {
            cantidadInputRefs.current[siguienteIndex]?.focus();
          }
        }, 300);
      } else {
        setTimeout(() => {
          setShowCrearModal(false);
          setSolicitudes([{ ...ESTADO_INICIAL_SOLICITUD }]);
          setSolicitudActualIndex(0);
          setMensaje('');
        }, 2000);
      }

      await cargarRegistros();
    } catch (error: any) {
      setMensaje('Error: ' + error.message);
    } finally {
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

  const getRegistrosParaTabla = () => {
    const conteo: Record<string, { total: number; pallets: string[] }> = {};
    registros.forEach(r => {
      if (!conteo[r.numero_solicitud]) {
        conteo[r.numero_solicitud] = { total: 0, pallets: [] };
      }
      conteo[r.numero_solicitud].total++;
      conteo[r.numero_solicitud].pallets.push(r.id_pallet);
    });

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
    setDiferenciaPendiente(null);
    setMensaje('');
    setShowCrearModal(true);
    setTimeout(() => {
      if (colorSelectRefs.current[0]) {
        colorSelectRefs.current[0]?.focus();
      }
    }, 200);
  };

  const registrosTabla = getRegistrosParaTabla();

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' };
      case 'Con Diferencias': return { color: '#dc2626', bg: '#fef2f2' };
      case 'Cancelado': return { color: '#64748b', bg: '#f1f5f9' };
      default: return { color: '#64748b', bg: '#f1f5f9' };
    }
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
        <table className="ed03-tabla" style={{ minWidth: '2100px' }}>
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
              <th style={{ minWidth: '80px' }}>Diferencia</th>
              <th style={{ minWidth: '110px' }}>Estado</th>
              <th style={{ minWidth: '200px' }}>Tipo Devolución</th>
              <th style={{ minWidth: '130px' }}>Almacén Destino</th>
              <th style={{ minWidth: '130px' }}>Creado Por</th>
              <th style={{ minWidth: '110px' }}>Creado En</th>
              <th style={{ minWidth: '130px' }}>Modificado Por</th>
              <th style={{ minWidth: '110px' }}>Modificado En</th>
              <th style={{ minWidth: '90px' }}>Obs.</th>
              <th style={{ minWidth: '140px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={19} style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr>
            ) : registrosTabla.length === 0 ? (
              <tr><td colSpan={19} style={{ textAlign: 'center', padding: '40px' }}>Sin registros</td></tr>
            ) : (
              registrosTabla.map((reg: any, i: number) => {
                const eb = getEstadoBadge(reg.estado);
                return (
                  <tr key={reg.id} style={{ background: reg.estado === 'Con Diferencias' ? '#fff5f5' : 'transparent' }}>
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
                    <td style={{ textAlign: 'center' }}>
                      {reg.diferencia !== null && reg.diferencia !== 0 ? (
                        <span style={{
                          fontWeight: 700,
                          color: reg.diferencia > 0 ? '#15803d' : '#dc2626',
                          fontSize: '13px',
                        }}>
                          {reg.diferencia > 0 ? '+' : ''}{reg.diferencia}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                        background: eb.bg, color: eb.color,
                      }}>
                        {reg.estado}
                      </span>
                    </td>
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
                );
              })
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
                if (guardadoParcial && !confirm('¿Salir sin completar todos los pallets? Los pallets ya guardados se conservan.')) return;
                setShowCrearModal(false);
                setGuardadoParcial(false);
                cargarRegistros();
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
                </div>
              )}

              {!guardadoParcial && (
                <div className="rd01-pallet-info">
                  <span>Completa los datos. Si la cantidad no coincide con el total, se podrá guardar con diferencias.</span>
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
                      
                      let progreso = '';
                      if (index === solicitudActualIndex && guardadoParcial) {
                        progreso = `${bultosGuardados}/${sol.total_bultos}`;
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
                            <input type="text" value={sol.codigo_local} onChange={e => handleCodigoLocalChange(index, e.target.value)} placeholder="D001" maxLength={4} disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }} />
                          </td>
                          <td>
                            <input type="text" value={sol.nombre_local} disabled placeholder="Auto" style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafd', color: '#64748b' }} />
                          </td>
                          <td>
                            <input type="text" value={sol.numero_solicitud} onChange={e => handleSolicitudChange(index, 'numero_solicitud', e.target.value)} placeholder="2060563" disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }} />
                          </td>
                          <td>
                            <input type="text" value={sol.numero_guia} onChange={e => handleSolicitudChange(index, 'numero_guia', e.target.value)} placeholder="264" disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }} />
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
                            <input type="number" value={sol.total_bultos || ''} onChange={e => handleSolicitudChange(index, 'total_bultos', parseInt(e.target.value) || 0)} min="0" placeholder="0" disabled={isDisabled || guardadoParcial} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: (isDisabled || guardadoParcial) ? '#f1f5f9' : 'white' }} />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {progreso && (
                              <span style={{ display: 'inline-block', padding: '4px 10px', background: '#fef3c7', borderRadius: '6px', fontWeight: 600, color: '#92400e', fontSize: '13px' }}>
                                {progreso}
                              </span>
                            )}
                          </td>
                          <td>
                            {solicitudes.length > 1 && !guardadoParcial && (
                              <button onClick={() => eliminarSolicitud(index)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#ef4444', fontSize: '18px', cursor: 'pointer' }} title="Eliminar fila">×</button>
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
                  background: mensaje.includes('Error') ? '#fef2f2' : (mensaje.includes('✅') ? '#dcfce7' : (mensaje.includes('⚠️') ? '#fef3c7' : '#eff6ff')),
                  color: mensaje.includes('Error') ? '#dc2626' : (mensaje.includes('✅') ? '#15803d' : (mensaje.includes('⚠️') ? '#92400e' : '#1e40af')),
                  border: `1px solid ${mensaje.includes('Error') ? '#fecaca' : (mensaje.includes('✅') ? '#bbf7d0' : (mensaje.includes('⚠️') ? '#fde68a' : '#bfdbfe'))}`,
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
                {guardadoParcial ? 'Salir' : 'Cancelar'}
              </button>
              <button className="ed01-btn-save" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : (guardadoParcial ? `Guardar P${String(palletContador + 1).padStart(2, '0')}` : 'Iniciar Registro')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DIFERENCIA */}
      {showDiferenciaModal && diferenciaPendiente && (
        <div className="ed01-modal-overlay" onClick={() => setShowDiferenciaModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header">
              <h2>⚠️ Diferencia Detectada</h2>
              <button className="ed01-modal-close" onClick={() => setShowDiferenciaModal(false)}>×</button>
            </div>
            <div className="ed01-modal-body">
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: '#1e293b', margin: '0 0 8px' }}>
                  <strong>Solicitud:</strong> {diferenciaPendiente.solicitud.numero_solicitud}
                </p>
                <p style={{ fontSize: '14px', color: '#1e293b', margin: '0 0 8px' }}>
                  <strong>Total esperado:</strong> {diferenciaPendiente.total} bultos
                </p>
                <p style={{ fontSize: '14px', color: '#1e293b', margin: '0 0 8px' }}>
                  <strong>Cantidad ingresada:</strong> {diferenciaPendiente.cantidad} bultos
                </p>
                <p style={{ fontSize: '16px', fontWeight: 700, margin: '8px 0 0' }}>
                  <span style={{ color: diferenciaPendiente.diferencia > 0 ? '#15803d' : '#dc2626' }}>
                    Diferencia: {diferenciaPendiente.diferencia > 0 ? '+' : ''}{diferenciaPendiente.diferencia} bultos
                  </span>
                </p>
              </div>

              <div className="ed01-field">
                <label>Observación * (obligatorio para guardar con diferencias)</label>
                <textarea
                  value={observacionDiferencia}
                  onChange={e => setObservacionDiferencia(e.target.value)}
                  rows={3}
                  placeholder="Explica el motivo de la diferencia..."
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              {mensaje && (
                <div style={{ padding: '10px', borderRadius: '8px', fontSize: '13px', background: '#fef2f2', color: '#dc2626', marginTop: '8px' }}>
                  {mensaje}
                </div>
              )}
            </div>
            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => {
                setShowDiferenciaModal(false);
                setDiferenciaPendiente(null);
                setObservacionDiferencia('');
              }}>
                Cancelar
              </button>
              <button className="ed01-btn-save" style={{ background: '#dc2626' }} onClick={handleGuardarConDiferencia} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar con Diferencias'}
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
                {registroDetalle.diferencia !== null && registroDetalle.diferencia !== 0 && (
                  <div className="rd01-detalle-row">
                    <div>
                      <strong>Diferencia:</strong>{' '}
                      <span style={{ color: registroDetalle.diferencia > 0 ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                        {registroDetalle.diferencia > 0 ? '+' : ''}{registroDetalle.diferencia}
                      </span>
                    </div>
                  </div>
                )}
                <div className="rd01-detalle-row">
                  <div><strong>Estado:</strong> {registroDetalle.estado}</div>
                  <div><strong>Tipo:</strong> {registroDetalle.tipo_devolucion}</div>
                </div>
                <div className="rd01-detalle-row">
                  <div><strong>Almacén:</strong> {registroDetalle.almacen_destino}</div>
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
                  <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={2} placeholder="Motivo de cancelación..." />
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
