// src/components/Transactions/SD/SD01CrearTransporte.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface SD01CrearTransporteProps {
  onClose: () => void;
  onTransporteCreado: () => void;
}

const SD01CrearTransporte: React.FC<SD01CrearTransporteProps> = ({ onClose, onTransporteCreado }) => {
  const usuario: any = auth.getUsuario();
  const [fechaProgramacion, setFechaProgramacion]: any = useState(new Date().toISOString().split('T')[0]);
  const [conductorId, setConductorId]: any = useState('');
  const [conductorTexto, setConductorTexto]: any = useState('');
  const [patenteId, setPatenteId]: any = useState('');
  const [patenteTexto, setPatenteTexto]: any = useState('');
  const [locales, setLocales]: any = useState([{ codigo_local: '', nombre_local: '', fecha_entrega: '', hora_entrega: '' }]);
  const [guardando, setGuardando]: any = useState(false);
  const [mensaje, setMensaje]: any = useState({ tipo: '', texto: '' });

  const [conductores, setConductores]: any = useState([]);
  const [patentes, setPatentes]: any = useState([]);
  const [todosLocales, setTodosLocales]: any = useState([]);

  const [mostrarSugerenciasConductor, setMostrarSugerenciasConductor]: any = useState(false);
  const [sugerenciasConductor, setSugerenciasConductor]: any = useState([]);
  const [indiceSeleccionadoConductor, setIndiceSeleccionadoConductor]: any = useState(-1);

  const [mostrarSugerenciasPatente, setMostrarSugerenciasPatente]: any = useState(false);
  const [sugerenciasPatente, setSugerenciasPatente]: any = useState([]);
  const [indiceSeleccionadoPatente, setIndiceSeleccionadoPatente]: any = useState(-1);

  const inputConductorRef: any = useRef(null);
  const inputPatenteRef: any = useRef(null);

  useEffect(() => {
    cargarConductores();
    cargarPatentes();
    cargarLocales();
  }, []);

  const cargarConductores = async () => {
    try {
      const resp = await fetch(API_URL + '/sd01_conductores?select=*&activo=eq.true&order=nombre.asc', { headers: HEADERS });
      const data = await resp.json();
      if (data) setConductores(data);
    } catch (e) {}
  };

  const cargarPatentes = async () => {
    try {
      const resp = await fetch(API_URL + '/sd01_patentes?select=*&activo=eq.true&order=numero_patente.asc', { headers: HEADERS });
      const data = await resp.json();
      if (data) setPatentes(data);
    } catch (e) {}
  };

  const cargarLocales = async () => {
    try {
      const resp = await fetch(API_URL + '/locales?select=*&activo=eq.true&order=codigo_local.asc', { headers: HEADERS });
      const data = await resp.json();
      if (data) setTodosLocales(data);
    } catch (e) {}
  };

  const filterStartsWith = (list: any[], field: string, search: string) => {
    if (!search) return [];
    return list.filter((item: any) => String(item[field] || '').toLowerCase().startsWith(search.toLowerCase()));
  };

  const handleBuscarConductor = (valor: string) => {
    setConductorTexto(valor);
    setConductorId('');
    const sugerencias = filterStartsWith(conductores, 'nombre', valor);
    if (valor.trim() === '') {
      setSugerenciasConductor([]);
      setMostrarSugerenciasConductor(false);
    } else {
      setSugerenciasConductor(sugerencias);
      setMostrarSugerenciasConductor(sugerencias.length > 0);
    }
    setIndiceSeleccionadoConductor(-1);
  };

  const handleSeleccionarConductor = (conductor: any) => {
    setConductorId(conductor.id);
    setConductorTexto(conductor.nombre + ' ' + conductor.apellido);
    setMostrarSugerenciasConductor(false);
    setSugerenciasConductor([]);
    setIndiceSeleccionadoConductor(-1);
  };

  const handleKeyDownConductor = (e: any) => {
    if (!mostrarSugerenciasConductor || sugerenciasConductor.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceSeleccionadoConductor((prev: number) => 
        prev < sugerenciasConductor.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceSeleccionadoConductor((prev: number) => 
        prev > 0 ? prev - 1 : sugerenciasConductor.length - 1
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (indiceSeleccionadoConductor >= 0) {
        handleSeleccionarConductor(sugerenciasConductor[indiceSeleccionadoConductor]);
      } else if (sugerenciasConductor.length === 1) {
        handleSeleccionarConductor(sugerenciasConductor[0]);
      }
    } else if (e.key === 'Escape') {
      setMostrarSugerenciasConductor(false);
    }
  };

  const handleBuscarPatente = (valor: string) => {
    setPatenteTexto(valor.toUpperCase());
    setPatenteId('');
    const sugerencias = filterStartsWith(patentes, 'numero_patente', valor);
    if (valor.trim() === '') {
      setSugerenciasPatente([]);
      setMostrarSugerenciasPatente(false);
    } else {
      setSugerenciasPatente(sugerencias);
      setMostrarSugerenciasPatente(sugerencias.length > 0);
    }
    setIndiceSeleccionadoPatente(-1);
  };

  const handleSeleccionarPatente = (patente: any) => {
    setPatenteId(patente.id);
    setPatenteTexto(patente.numero_patente);
    setMostrarSugerenciasPatente(false);
    setSugerenciasPatente([]);
    setIndiceSeleccionadoPatente(-1);
  };

  const handleKeyDownPatente = (e: any) => {
    if (!mostrarSugerenciasPatente || sugerenciasPatente.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceSeleccionadoPatente((prev: number) => 
        prev < sugerenciasPatente.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceSeleccionadoPatente((prev: number) => 
        prev > 0 ? prev - 1 : sugerenciasPatente.length - 1
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (indiceSeleccionadoPatente >= 0) {
        handleSeleccionarPatente(sugerenciasPatente[indiceSeleccionadoPatente]);
      } else if (sugerenciasPatente.length === 1) {
        handleSeleccionarPatente(sugerenciasPatente[0]);
      }
    } else if (e.key === 'Escape') {
      setMostrarSugerenciasPatente(false);
    }
  };

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
    setLocales([...locales, { codigo_local: '', nombre_local: '', fecha_entrega: '', hora_entrega: '' }]);
  };

  const eliminarLocal = (index: number) => {
    if (locales.length === 1) {
      setMensaje({ tipo: 'warning', texto: 'Debe tener al menos un local' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
      return;
    }
    const nuevosLocales = locales.filter((_: any, i: number) => i !== index);
    setLocales(nuevosLocales);
  };

  const generarIdDocumento = () => {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = ahora.getFullYear();
    const random = String(Math.floor(Math.random() * 90000) + 10000);
    return 'SD' + dia + mes + anio + random;
  };

  const validarFormulario = () => {
    if (!fechaProgramacion) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar una fecha de programación' });
      return false;
    }
    if (!conductorId) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar un conductor' });
      return false;
    }
    if (!patenteId) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar una patente' });
      return false;
    }
    for (let i = 0; i < locales.length; i++) {
      if (!locales[i].codigo_local) {
        setMensaje({ tipo: 'error', texto: 'El local ' + (i + 1) + ' debe tener un código' });
        return false;
      }
      if (!locales[i].fecha_entrega) {
        setMensaje({ tipo: 'error', texto: 'El local ' + (i + 1) + ' debe tener fecha de entrega' });
        return false;
      }
    }
    return true;
  };

  const handleGuardar = async (estado: string) => {
    if (!validarFormulario()) {
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
      return;
    }

    setGuardando(true);
    try {
      const idDocumento = generarIdDocumento();
      
      const respTransporte = await fetch(API_URL + '/sd01_documentos', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id_documento: idDocumento,
          conductor_id: conductorId,
          patente_principal_id: patenteId,
          fecha_programacion: fechaProgramacion,
          estado: estado,
          creado_por: usuario?.id,
          modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
          creado_por_nombre: usuario?.nombre + ' ' + usuario?.apellido
        })
      });
      
      const transporteCreado = await respTransporte.json();
      const transporte = Array.isArray(transporteCreado) ? transporteCreado[0] : transporteCreado;

      for (const local of locales) {
        await fetch(API_URL + '/sd01_documento_locales', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify({
            documento_id: idDocumento,
            codigo_local: local.codigo_local,
            nombre_local: local.nombre_local,
            fecha_entrega: local.fecha_entrega,
            hora_entrega: local.hora_entrega || null
          })
        });
      }

      onTransporteCreado();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: 'Error al crear el transporte' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    }
    setGuardando(false);
  };

  return (
    <div className="ed01-modal-overlay" onClick={onClose}>
      <div className="ed01-modal" style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e: any) => e.stopPropagation()}>
        <div className="ed01-modal-header">
          <h2>Crear Nuevo Transporte</h2>
          <button className="ed01-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ed01-modal-body">
          {mensaje.texto && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: 500,
              background: mensaje.tipo === 'error' ? '#fef2f2' : '#fef3c7',
              color: mensaje.tipo === 'error' ? '#dc2626' : '#92400e',
              border: mensaje.tipo === 'error' ? '1px solid #fca5a5' : '1px solid #fcd34d'
            }}>
              {mensaje.texto}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Fecha Programación *
              </label>
              <input
                type="date"
                value={fechaProgramacion}
                onChange={(e: any) => setFechaProgramacion(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#1e293b',
                  background: 'white'
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Conductor *
              </label>
              <input
                ref={inputConductorRef}
                type="text"
                value={conductorTexto}
                onChange={(e: any) => handleBuscarConductor(e.target.value)}
                onKeyDown={handleKeyDownConductor}
                onFocus={() => {
                  if (sugerenciasConductor.length > 0) setMostrarSugerenciasConductor(true);
                }}
                placeholder="Buscar conductor..."
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#1e293b',
                  background: 'white'
                }}
              />
              {conductorId && (
                <span style={{
                  position: 'absolute',
                  right: '10px',
                  top: '38px',
                  color: '#15803d',
                  fontSize: '16px'
                }}>✓</span>
              )}
              {mostrarSugerenciasConductor && sugerenciasConductor.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  background: 'white',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  marginTop: '2px'
                }}>
                  {sugerenciasConductor.map((conductor: any, index: number) => (
                    <div
                      key={conductor.id}
                      onClick={() => handleSeleccionarConductor(conductor)}
                      onMouseEnter={() => setIndiceSeleccionadoConductor(index)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: index === indiceSeleccionadoConductor ? 'white' : '#1e293b',
                        background: index === indiceSeleccionadoConductor ? '#1d4ed8' : 'white',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      {conductor.nombre} {conductor.apellido}
                      {conductor.empresa && <span style={{ color: index === indiceSeleccionadoConductor ? '#dbeafe' : '#94a3b8', fontSize: '11px', marginLeft: '8px' }}>({conductor.empresa})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Patente *
              </label>
              <input
                ref={inputPatenteRef}
                type="text"
                value={patenteTexto}
                onChange={(e: any) => handleBuscarPatente(e.target.value)}
                onKeyDown={handleKeyDownPatente}
                onFocus={() => {
                  if (sugerenciasPatente.length > 0) setMostrarSugerenciasPatente(true);
                }}
                placeholder="Buscar patente..."
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#1e293b',
                  background: 'white',
                  textTransform: 'uppercase'
                }}
              />
              {patenteId && (
                <span style={{
                  position: 'absolute',
                  right: '10px',
                  top: '38px',
                  color: '#15803d',
                  fontSize: '16px'
                }}>✓</span>
              )}
              {mostrarSugerenciasPatente && sugerenciasPatente.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  background: 'white',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  marginTop: '2px'
                }}>
                  {sugerenciasPatente.map((patente: any, index: number) => (
                    <div
                      key={patente.id}
                      onClick={() => handleSeleccionarPatente(patente)}
                      onMouseEnter={() => setIndiceSeleccionadoPatente(index)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: index === indiceSeleccionadoPatente ? 'white' : '#1e293b',
                        background: index === indiceSeleccionadoPatente ? '#1d4ed8' : 'white',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      {patente.numero_patente}
                      <span style={{ color: index === indiceSeleccionadoPatente ? '#dbeafe' : '#94a3b8', fontSize: '11px', marginLeft: '8px' }}>
                        ({patente.tipo_vehiculo || 'Otro'})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: 0 }}>Locales de Entrega</h3>
              <button
                onClick={agregarLocal}
                style={{
                  padding: '6px 14px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Agregar Local
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {locales.map((local: any, index: number) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.5fr 1fr 1fr auto',
                    gap: '12px',
                    alignItems: 'end',
                    padding: '16px',
                    background: '#f8fafd',
                    borderRadius: '8px',
                    border: '1px solid #eef0f5'
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                      Código Local *
                    </label>
                    <input
                      type="text"
                      value={local.codigo_local}
                      onChange={(e: any) => handleCodigoLocalChange(index, e.target.value)}
                      placeholder="Ej: D001"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#1e293b',
                        background: 'white',
                        textTransform: 'uppercase'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                      Nombre Local
                    </label>
                    <input
                      type="text"
                      value={local.nombre_local}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#64748b',
                        background: '#f1f5f9'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                      Fecha Entrega *
                    </label>
                    <input
                      type="date"
                      value={local.fecha_entrega}
                      onChange={(e: any) => handleLocalChange(index, 'fecha_entrega', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#1e293b',
                        background: 'white'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                      Hora Entrega
                    </label>
                    <input
                      type="time"
                      value={local.hora_entrega}
                      onChange={(e: any) => handleLocalChange(index, 'hora_entrega', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#1e293b',
                        background: 'white'
                      }}
                    />
                  </div>
                  <div>
                    <button
                      onClick={() => eliminarLocal(index)}
                      style={{
                        padding: '8px 10px',
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '36px'
                      }}
                      title="Eliminar local"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="ed01-modal-footer">
          <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
            <button
              className="ed01-btn-save"
              onClick={() => handleGuardar('Borrador')}
              disabled={guardando}
              style={{ background: '#64748b' }}
            >
              {guardando ? 'Guardando...' : 'Guardar Borrador'}
            </button>
            <button
              className="ed01-btn-save"
              onClick={() => handleGuardar('Pendiente')}
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : 'Crear Transporte'}
            </button>
          </div>
          <button className="ed01-btn-cancel" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default SD01CrearTransporte;
