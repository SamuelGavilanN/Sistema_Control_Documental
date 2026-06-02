// src/components/Transactions/RD/RD01View.tsx

import React, { useState, useEffect } from 'react';
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

  const validarSolicitud = (s: Solicitud): string | null => {
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

  const handleGuardar = async () => {
    for (let i = 0; i < solicitudes.length; i++) {
      const error = validarSolicitud(solicitudes[i]);
      if (error) {
        setMensaje('Error: ' + error);
        setTimeout(() => setMensaje(''), 4000);
        return;
      }
    }

    setGuardando(true);
    setMensaje('');

    try {
      const user = auth.getUsuario();
      if (!user) {
        setMensaje('Error: Usuario no autenticado');
        setGuardando(false);
        return;
      }

      for (let i = 0; i < solicitudes.length; i++) {
        const solicitud = solicitudes[i];
        const infoColor = getInfoColor(solicitud.color);
        const bultosPorPallet = solicitud.cantidad_bultos;
        const totalBultos = solicitud.total_bultos;
        const cantidadPallets = Math.ceil(totalBultos / bultosPorPallet);

        const palletBase = await generarNumeroPallet();

        for (let p = 0; p < cantidadPallets; p++) {
          const idPalletFinal = `${palletBase}P${String(p + 1).padStart(2, '0')}`;
          
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
              cantidad_bultos: bultosPorPallet,
              total_bultos: totalBultos,
              tipo_devolucion: infoColor.tipo_devolucion,
              almacen_destino: infoColor.almacen_destino,
              estado: 'Finalizado',
              creado_por: user.id,
              creado_en: new Date().toISOString(),
            }]);

          if (error) {
            throw new Error(`Error al guardar: ${error.message}`);
          }
        }
      }

      setMensaje('Devoluciones registradas correctamente');
      setTimeout(() => {
        setMensaje('');
        setShowCrearModal(false);
        setSolicitudes([{ ...ESTADO_INICIAL_SOLICITUD }]);
      }, 1500);
      
      cargarRegistros();
    } catch (error: any) {
      setMensaje('Error: ' + (error.message || 'Error desconocido'));
    } finally {
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

  return (
    <div className="rd01-view">
      <div className="rd01-header">
        <h2>Recepción Devolución - Ingreso</h2>
        <button className="rd01-btn-nueva" onClick={() => {
          setSolicitudes([{ ...ESTADO_INICIAL_SOLICITUD }]);
          setShowCrearModal(true);
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Nuevo Ingreso
        </button>
      </div>

      {/* TABLA PRINCIPAL - Textos sin whiteSpace nowrap en Local para que no se corten */}
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
                  {/* CORREGIDO: sin whiteSpace nowrap, con wordBreak normal para que no corte */}
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

      {/* MODAL CREAR - Más ancho (1200px) */}
      {showCrearModal && (
        <div className="ed01-modal-overlay" onClick={() => !guardando && setShowCrearModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '1200px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header">
              <h2>Nuevo Ingreso Devolución</h2>
              <button className="ed01-modal-close" onClick={() => setShowCrearModal(false)} disabled={guardando}>×</button>
            </div>
            
            <div className="ed01-modal-body">
              <div className="rd01-pallet-info">
                <span>ID Pallet se genera automáticamente. Si cantidad bultos &lt; total bultos, se generan múltiples pallets.</span>
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
                      
                      return (
                        <tr key={index}>
                          <td>
                            <select
                              value={sol.color}
                              onChange={e => handleSolicitudChange(index, 'color', e.target.value)}
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white' }}
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
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
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
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={sol.numero_guia}
                              onChange={e => handleSolicitudChange(index, 'numero_guia', e.target.value)}
                              placeholder="264"
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={sol.cantidad_bultos || ''}
                              onChange={e => handleSolicitudChange(index, 'cantidad_bultos', parseInt(e.target.value) || 0)}
                              min="0"
                              placeholder="0"
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={sol.total_bultos || ''}
                              onChange={e => handleSolicitudChange(index, 'total_bultos', parseInt(e.target.value) || 0)}
                              min="0"
                              placeholder="0"
                              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
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
                            {solicitudes.length > 1 && (
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

              <button className="rd01-btn-agregar-solicitud" onClick={agregarSolicitud}>
                + Agregar fila
              </button>

              {mensaje && (
                <div style={{
                  marginTop: '12px', padding: '10px', borderRadius: '8px', fontSize: '13px',
                  background: mensaje.includes('Error') ? '#fef2f2' : '#dcfce7',
                  color: mensaje.includes('Error') ? '#dc2626' : '#15803d',
                }}>
                  {mensaje}
                </div>
              )}
            </div>

            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => setShowCrearModal(false)} disabled={guardando}>
                Cancelar
              </button>
              <button className="ed01-btn-save" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Registrar Ingreso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
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
