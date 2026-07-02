// src/components/Transactions/SD/SD01CrearTransporte.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import './SD01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface SD01CrearTransporteProps {
  onClose: () => void;
  onTransporteCreado: () => void;
  transporteEditar?: any;
}

const SD01CrearTransporte: React.FC<SD01CrearTransporteProps> = ({ onClose, onTransporteCreado, transporteEditar }) => {
  const usuario: any = auth.getUsuario();
  const esEdicion = !!transporteEditar;
  
  const [fechaProgramacion, setFechaProgramacion]: any = useState('');
  const [conductorId, setConductorId]: any = useState('');
  const [conductorTexto, setConductorTexto]: any = useState('');
  const [patenteId, setPatenteId]: any = useState('');
  const [patenteTexto, setPatenteTexto]: any = useState('');
  const [locales, setLocales]: any = useState([{ codigo_local: '', nombre_local: '', fecha_entrega: '', hora_entrega: '', cantidad_solicitada: '' }]);
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
  const sugerenciasConductorRef: any = useRef(null);

  useEffect(() => {
    cargarConductores();
    cargarPatentes();
    cargarLocales();
    
    if (esEdicion && transporteEditar) {
      cargarDatosEdicion();
    }
  }, []);

  const cargarDatosEdicion = async () => {
    setFechaProgramacion(transporteEditar.fecha_programacion || '');
    
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
          setPatenteId(data[0].id);
          setPatenteTexto(data[0].numero_patente);
        }
      } catch (e) {}
    }
    
    try {
      const resp = await fetch(API_URL + '/sd01_documento_locales?select=*&documento_id=eq.' + transporteEditar.id_documento, { headers: HEADERS });
      const data = await resp.json();
      if (data && data.length > 0) {
        const localesData = data.map((l: any) => ({
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
      if (data) {
        setConductores(data);
      }
    } catch (e) {
      console.error('Error cargando conductores:', e);
    }
  };

  const cargarPatentes = async () => {
    try {
      const resp = await fetch(API_URL + '/patentes?select=*&activo=eq.true&order=numero_patente.asc', { headers: HEADERS });
      const data = await resp.json();
      if (data) {
        setPatentes(data);
      }
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
    if (inputConductorRef.current) {
      inputConductorRef.current.focus();
    }
  };

  const handleKeyDownConductor = (e: any) => {
    if (!mostrarSugerenciasConductor || sugerenciasConductor.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      return;
    }
    
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
      if (indiceSeleccionadoConductor >= 0 && indiceSeleccionadoConductor < sugerenciasConductor.length) {
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
    
    if (valor.trim() === '') {
      setSugerenciasPatente([]);
      setMostrarSugerenciasPatente(false);
      setIndiceSeleccionadoPatente(-1);
      return;
    }
    
    const busqueda = valor.toUpperCase();
    const sugerencias = patentes.filter((p: any) => {
      const numeroPatente = String(p.numero_patente || '').toUpperCase();
      return numeroPatente.startsWith(busqueda);
    });
    
    setSugerenciasPatente(sugerencias);
    setMostrarSugerenciasPatente(sugerencias.length > 0);
    setIndiceSeleccionadoPatente(-1);
  };

  const handleSeleccionarPatente = (patente: any) => {
    setPatenteId(patente.id);
    setPatenteTexto(patente.numero_patente);
    setMostrarSugerenciasPatente(false);
    setSugerenciasPatente([]);
    setIndiceSeleccionadoPatente(-1);
    if (inputPatenteRef.current) {
      inputPatenteRef.current.focus();
    }
  };

  const handleKeyDownPatente = (e: any) => {
    if (!mostrarSugerenciasPatente || sugerenciasPatente.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      return;
    }
    
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
      if (indiceSeleccionadoPatente >= 0 && indiceSeleccionadoPatente < sugerenciasPatente.length) {
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
    setLocales([...locales, { codigo_local: '', nombre_local: '', fecha_entrega: '', hora_entrega: '', cantidad_solicitada: '' }]);
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
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar un conductor de la lista' });
      return false;
    }
    if (!patenteId) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar una patente de la lista' });
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

  const handleGuardar = async () => {
    if (!validarFormulario()) {
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
      return;
    }

    setGuardando(true);
    try {
      if (esEdicion) {
        await fetch(API_URL + '/sd01_documentos?id=eq.' + transporteEditar.id, {
          method: 'PATCH',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conductor_id: conductorId,
            patente_principal_id: patenteId,
            fecha_programacion: fechaProgramacion,
            modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
            modificado_en: new Date().toISOString()
          })
        });

        await fetch(API_URL + '/sd01_documento_locales?documento_id=eq.' + transporteEditar.id_documento, {
          method: 'DELETE',
          headers: HEADERS
        });

        for (const local of locales) {
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
      } else {
        const idDocumento = generarIdDocumento();
        
        const transporteData = {
          id_documento: idDocumento,
          conductor_id: conductorId,
          patente_principal_id: patenteId,
          fecha_programacion: fechaProgramacion,
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="sd01-form-group">
              <label className="sd01-form-label">Fecha Programación *</label>
              <input
                type="date"
                className="sd01-form-input"
                value={fechaProgramacion}
                onChange={(e: any) => setFechaProgramacion(e.target.value)}
              />
            </div>

            <div className="sd01-form-group">
              <label className="sd01-form-label">Conductor *</label>
              <div className="sd01-autocomplete-wrapper">
                <input
                  ref={inputConductorRef}
                  type="text"
                  className="sd01-autocomplete-input"
                  value={conductorTexto}
                  onChange={(e: any) => handleBuscarConductor(e.target.value)}
                  onKeyDown={handleKeyDownConductor}
                  onFocus={() => {
                    if (conductorTexto.trim() && sugerenciasConductor.length > 0) {
                      setMostrarSugerenciasConductor(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setMostrarSugerenciasConductor(false), 200);
                  }}
                  placeholder="Buscar por nombre o apellido..."
                  autoComplete="off"
                />
                {conductorId && <span className="sd01-autocomplete-check">✓</span>}
                {mostrarSugerenciasConductor && sugerenciasConductor.length > 0 && (
                  <div className="sd01-autocomplete-dropdown" ref={sugerenciasConductorRef}>
                    {sugerenciasConductor.map((conductor: any, index: number) => (
                      <div
                        key={conductor.id}
                        className={'sd01-autocomplete-item ' + (index === indiceSeleccionadoConductor ? 'sd01-autocomplete-item-highlighted' : '')}
                        onClick={() => handleSeleccionarConductor(conductor)}
                        onMouseEnter={() => setIndiceSeleccionadoConductor(index)}
                      >
                        <strong>{conductor.nombre} {conductor.apellido}</strong>
                        {conductor.empresa && (
                          <span style={{ fontSize: '11px', marginLeft: '8px', opacity: 0.7 }}>
                            - {conductor.empresa}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sd01-form-group">
              <label className="sd01-form-label">Patente *</label>
              <div className="sd01-autocomplete-wrapper">
                <input
                  ref={inputPatenteRef}
                  type="text"
                  className="sd01-autocomplete-input"
                  value={patenteTexto}
                  onChange={(e: any) => handleBuscarPatente(e.target.value)}
                  onKeyDown={handleKeyDownPatente}
                  onFocus={() => {
                    if (patenteTexto.trim() && sugerenciasPatente.length > 0) {
                      setMostrarSugerenciasPatente(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setMostrarSugerenciasPatente(false), 200);
                  }}
                  placeholder="Buscar patente..."
                  autoComplete="off"
                  style={{ textTransform: 'uppercase' }}
                />
                {patenteId && <span className="sd01-autocomplete-check">✓</span>}
                {mostrarSugerenciasPatente && sugerenciasPatente.length > 0 && (
                  <div className="sd01-autocomplete-dropdown">
                    {sugerenciasPatente.map((patente: any, index: number) => (
                      <div
                        key={patente.id}
                        className={'sd01-autocomplete-item ' + (index === indiceSeleccionadoPatente ? 'sd01-autocomplete-item-highlighted' : '')}
                        onClick={() => handleSeleccionarPatente(patente)}
                        onMouseEnter={() => setIndiceSeleccionadoPatente(index)}
                      >
                        <strong>{patente.numero_patente}</strong>
                        <span style={{ fontSize: '11px', marginLeft: '8px', opacity: 0.7 }}>
                          - {patente.tipo_vehiculo || 'Otro'}
                        </span>
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
                    <input
                      type="text"
                      className="sd01-form-input"
                      value={local.codigo_local}
                      onChange={(e: any) => handleCodigoLocalChange(index, e.target.value)}
                      placeholder="Ej: D001"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <div className="sd01-form-group">
                    <label className="sd01-form-label" style={{ fontSize: '12px' }}>Nombre Local</label>
                    <input
                      type="text"
                      className="sd01-form-input"
                      value={local.nombre_local}
                      readOnly
                    />
                  </div>
                  <div className="sd01-form-group">
                    <label className="sd01-form-label" style={{ fontSize: '12px' }}>Fecha Entrega *</label>
                    <input
                      type="date"
                      className="sd01-form-input"
                      value={local.fecha_entrega}
                      onChange={(e: any) => handleLocalChange(index, 'fecha_entrega', e.target.value)}
                    />
                  </div>
                  <div className="sd01-form-group">
                    <label className="sd01-form-label" style={{ fontSize: '12px' }}>Hora Entrega</label>
                    <input
                      type="time"
                      className="sd01-form-input"
                      value={local.hora_entrega}
                      onChange={(e: any) => handleLocalChange(index, 'hora_entrega', e.target.value)}
                    />
                  </div>
                  <div className="sd01-form-group">
                    <label className="sd01-form-label" style={{ fontSize: '12px' }}>Cantidad Solicitada</label>
                    <input
                      type="number"
                      className="sd01-form-input"
                      value={local.cantidad_solicitada}
                      onChange={(e: any) => handleLocalChange(index, 'cantidad_solicitada', e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <button
                    className="sd01-btn-delete-local"
                    onClick={() => eliminarLocal(index)}
                    title="Eliminar local"
                  >
                    ×
                  </button>
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
    </div>
  );
};

export default SD01CrearTransporte;
