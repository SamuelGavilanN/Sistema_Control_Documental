// src/components/Transactions/SD/SD01IniciarTransporte.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import './SD01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface SD01IniciarTransporteProps {
  transporte: any;
  onClose: () => void;
  onActualizar: () => void;
  usuario: any;
}

// Orígenes de carga y tipos de documento
const origenesCarga = [
  "CD01 Fashions-Park",
  "CD16 Bodegas San Francisco",
  "OUT1 Outlet San Francisco",
  "OUT2 Outlet Lampa",
  "OUT3 Redestinacion",
  "CD12 Bodega Lampa",
  "CD31 Bodega AGV",
  "C144 Bodega Holly Concept",
  "SG01 Internet",
  "SG02 Insumos",
  "SG03 Traspasos",
  "SG04 Valija",
  "SG05 Bultos Regularizar Stock",
  "SG06 Bultos Quedados en Camion",
];

const tiposDocumentoPorOrigen: Record<string, string[]> = {
  "CD01 Fashions-Park": ["Sap", "Vtradex"],
  "CD16 Bodegas San Francisco": ["Sap", "Vtradex"],
  "OUT1 Outlet San Francisco": ["Sap", "Vtradex"],
  "OUT2 Outlet Lampa": ["Sap", "Vtradex"],
  "OUT3 Redestinacion": ["Sap", "Vtradex"],
  "CD12 Bodega Lampa": ["Sap", "Vtradex"],
  "CD31 Bodega AGV": ["Sap", "Vtradex"],
  "C144 Bodega Holly Concept": ["Sap", "Vtradex"],
  "SG01 Internet": [],
  "SG02 Insumos": [],
  "SG03 Traspasos": [],
  "SG04 Valija": [],
  "SG05 Bultos Regularizar Stock": ["Sap", "Vtradex"],
  "SG06 Bultos Quedados en Camion": ["Sap", "Vtradex"],
};

interface Bulto {
  id: string;
  origenCarga: string;
  tipoDocumento: string;
  numeroDocumento: string;
  cantidad: number;
  observacion: string;
}

// Autocomplete component
interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  disabled?: boolean;
  onEnter?: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  suggestions,
  placeholder,
  disabled = false,
  onEnter,
  inputRef,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const internalRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const actualRef = inputRef || internalRef;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getBestMatch = (input: string): string | null => {
    if (!input) return null;
    const lowerInput = input.toLowerCase();
    return suggestions.find((s) => s.toLowerCase().startsWith(lowerInput)) || null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    const filtered = suggestions.filter((s) => s.toLowerCase().includes(newValue.toLowerCase()));
    setFilteredSuggestions(filtered);
    setIsOpen(filtered.length > 0 && newValue.length > 0);
    setHighlightIndex(-1);
  };

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    actualRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (isOpen && highlightIndex >= 0) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightIndex]);
      } else {
        const bestMatch = getBestMatch(value);
        if (bestMatch) {
          e.preventDefault();
          onChange(bestMatch);
          setIsOpen(false);
        }
        if (onEnter) onEnter();
      }
    } else if (e.key === "Tab") {
      const bestMatch = getBestMatch(value);
      if (bestMatch) onChange(bestMatch);
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && value) {
        const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()));
        setFilteredSuggestions(filtered);
        setIsOpen(true);
        setHighlightIndex(0);
      } else {
        setHighlightIndex((prev) => prev < filteredSuggestions.length - 1 ? prev + 1 : prev);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => prev > 0 ? prev - 1 : prev);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        ref={actualRef}
        type="text"
        className="dc-input"
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (value) {
            const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()));
            setFilteredSuggestions(filtered);
            setIsOpen(filtered.length > 0);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`autocomplete-item ${index === highlightIndex ? "highlighted" : ""}`}
              onClick={() => handleSelect(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Modal de bultos con navegación por botones entre locales
const BultosModal = ({
  localInicial,
  locales,
  bultosPorLocal,
  onBultosChange,
  onClose,
  usuario,
  documentoId
}: any) => {
  const [localActual, setLocalActual] = useState(localInicial);
  const [bultos, setBultos] = useState<Bulto[]>(bultosPorLocal[localInicial.id] || []);
  const [nuevoBulto, setNuevoBulto] = useState<Partial<Bulto>>({
    origenCarga: "",
    tipoDocumento: "",
    numeroDocumento: "",
    cantidad: 0,
    observacion: ""
  });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tiposDisponibles, setTiposDisponibles] = useState<string[]>([]);

  const origenRef = useRef<HTMLInputElement>(null);
  const tipoDocRef = useRef<HTMLInputElement>(null);
  const numeroDocRef = useRef<HTMLInputElement>(null);
  const cantidadRef = useRef<HTMLInputElement>(null);
  const observacionRef = useRef<HTMLInputElement>(null);
  const agregarBtnRef = useRef<HTMLButtonElement>(null);

  const tipoNoAplica = nuevoBulto.origenCarga
    ? tiposDocumentoPorOrigen[nuevoBulto.origenCarga]?.length === 0
    : false;

  // Al cambiar de local, actualizar bultos y limpiar formulario
  useEffect(() => {
    setBultos(bultosPorLocal[localActual.id] || []);
    setNuevoBulto({ origenCarga: "", tipoDocumento: "", numeroDocumento: "", cantidad: 0, observacion: "" });
    setEditandoId(null);
    setTiposDisponibles([]);
    setTimeout(() => origenRef.current?.focus(), 100);
  }, [localActual.id]);

  const handleOrigenChange = (origen: string) => {
    const tipos = tiposDocumentoPorOrigen[origen] || [];
    setNuevoBulto({
      ...nuevoBulto,
      origenCarga: origen,
      tipoDocumento: tipos.length === 0 ? "No aplica" : "",
      numeroDocumento: tipos.length === 0 ? "" : nuevoBulto.numeroDocumento,
    });
    setTiposDisponibles(tipos);
  };

  const handleEditar = (bulto: Bulto) => {
    setNuevoBulto({
      origenCarga: bulto.origenCarga,
      tipoDocumento: bulto.tipoDocumento,
      numeroDocumento: bulto.numeroDocumento,
      cantidad: bulto.cantidad,
      observacion: bulto.observacion
    });
    setTiposDisponibles(tiposDocumentoPorOrigen[bulto.origenCarga] || []);
    setEditandoId(bulto.id);
    setTimeout(() => origenRef.current?.focus(), 50);
  };

  const handleCancelarEdicion = () => {
    setNuevoBulto({
      origenCarga: "",
      tipoDocumento: "",
      numeroDocumento: "",
      cantidad: 0,
      observacion: ""
    });
    setTiposDisponibles([]);
    setEditandoId(null);
    setTimeout(() => origenRef.current?.focus(), 50);
  };

  const agregarOActualizarBulto = () => {
    if (!nuevoBulto.origenCarga || !nuevoBulto.cantidad) return;

    if (editandoId) {
      const nuevos = bultos.map((b) =>
        b.id === editandoId ? { ...b, ...nuevoBulto, id: editandoId } : b
      );
      setBultos(nuevos);
      onBultosChange(localActual.id, nuevos);
      setEditandoId(null);
    } else {
      const nuevo: Bulto = {
        id: Date.now().toString(),
        origenCarga: nuevoBulto.origenCarga || "",
        tipoDocumento: nuevoBulto.tipoDocumento || "",
        numeroDocumento: nuevoBulto.numeroDocumento || "",
        cantidad: nuevoBulto.cantidad || 0,
        observacion: nuevoBulto.observacion || ""
      };
      const nuevos = [...bultos, nuevo];
      setBultos(nuevos);
      onBultosChange(localActual.id, nuevos);
    }

    setNuevoBulto({
      origenCarga: "",
      tipoDocumento: "",
      numeroDocumento: "",
      cantidad: 0,
      observacion: ""
    });
    setTiposDisponibles([]);
    setTimeout(() => origenRef.current?.focus(), 50);
  };

  const eliminarBulto = (id: string) => {
    const nuevos = bultos.filter((b) => b.id !== id);
    setBultos(nuevos);
    onBultosChange(localActual.id, nuevos);
    if (editandoId === id) {
      setEditandoId(null);
      setNuevoBulto({ origenCarga: "", tipoDocumento: "", numeroDocumento: "", cantidad: 0, observacion: "" });
    }
  };

  const totalBultos = bultos.reduce((sum, b) => sum + b.cantidad, 0);

  return (
    <div className="sd01-modal-overlay">
      {/* Sin onClick en overlay para no cerrar accidentalmente */}
      <div className="sd01-modal sd01-modal-bultos" onClick={(e) => e.stopPropagation()}>
        <div className="sd01-modal-header">
          <h2>Bultos por Local</h2>
          <button className="sd01-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="sd01-modal-body">
          {/* Selector de locales con botones */}
          <div className="dc-local-nav" style={{ marginBottom: '16px' }}>
            {locales.map((local: any) => (
              <button
                key={local.id}
                className={`local-nav-btn ${localActual.id === local.id ? "active" : ""}`}
                onClick={() => setLocalActual(local)}
              >
                {local.codigo_local} - {local.nombre_local || ''}
              </button>
            ))}
          </div>

          <div className="dc-form-section">
            <h3>{editandoId !== null ? "Editar Bulto" : "Agregar Bulto"} - Local {localActual.codigo_local}</h3>
            <div className="dc-form-grid">
              <div className="dc-form-field">
                <label>Origen de Carga</label>
                <AutocompleteInput
                  value={nuevoBulto.origenCarga || ""}
                  onChange={handleOrigenChange}
                  suggestions={origenesCarga}
                  placeholder="Buscar o escribir..."
                  onEnter={() => tipoDocRef.current?.focus()}
                  inputRef={origenRef}
                />
              </div>
              <div className="dc-form-field">
                <label>Tipo de Documento</label>
                <AutocompleteInput
                  value={nuevoBulto.tipoDocumento || ""}
                  onChange={(val) => setNuevoBulto({ ...nuevoBulto, tipoDocumento: val })}
                  suggestions={tiposDisponibles}
                  placeholder={tipoNoAplica ? "No aplica" : "Buscar o escribir..."}
                  disabled={tipoNoAplica}
                  onEnter={() => {
                    if (tipoNoAplica) cantidadRef.current?.focus();
                    else numeroDocRef.current?.focus();
                  }}
                  inputRef={tipoDocRef}
                />
              </div>
              <div className="dc-form-field">
                <label>Número Documento</label>
                <input
                  ref={numeroDocRef}
                  type="text"
                  className={`dc-input ${tipoNoAplica ? "disabled" : ""}`}
                  value={nuevoBulto.numeroDocumento || ""}
                  onChange={(e) => setNuevoBulto({ ...nuevoBulto, numeroDocumento: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); cantidadRef.current?.focus(); } }}
                  placeholder={tipoNoAplica ? "No aplica" : "Ej: 22687"}
                  disabled={tipoNoAplica}
                />
              </div>
              <div className="dc-form-field">
                <label>Cantidad Bultos</label>
                <input
                  ref={cantidadRef}
                  type="number"
                  className="dc-input"
                  value={nuevoBulto.cantidad || ""}
                  onChange={(e) => setNuevoBulto({ ...nuevoBulto, cantidad: parseInt(e.target.value) || 0 })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); observacionRef.current?.focus(); } }}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="dc-form-field">
                <label>Observación</label>
                <input
                  ref={observacionRef}
                  type="text"
                  className="dc-input"
                  value={nuevoBulto.observacion || ""}
                  onChange={(e) => setNuevoBulto({ ...nuevoBulto, observacion: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarBtnRef.current?.focus(); } }}
                  placeholder="Observación opcional"
                />
              </div>
            </div>
            <div className="dc-form-actions">
              <button ref={agregarBtnRef} className="dc-btn-add" onClick={agregarOActualizarBulto}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {editandoId !== null ? "Actualizar" : "Agregar"}
              </button>
              {editandoId !== null && (
                <button className="dc-btn-cancel-edit" onClick={handleCancelarEdicion}>Cancelar</button>
              )}
            </div>
          </div>

          <div className="dc-table-container" style={{ marginTop: '20px' }}>
            <table className="dc-table">
              <thead>
                <tr>
                  <th>Origen</th>
                  <th>Tipo Doc.</th>
                  <th>N° Doc.</th>
                  <th>Cantidad</th>
                  <th>Observación</th>
                  <th style={{ width: '80px' }}></th>
                </tr>
              </thead>
              <tbody>
                {bultos.length === 0 ? (
                  <tr><td colSpan={6} className="dc-empty-table">No hay bultos registrados en este local.</td></tr>
                ) : (
                  bultos.map((bulto) => (
                    <tr key={bulto.id} className={editandoId === bulto.id ? "fila-editando" : ""}>
                      <td>{bulto.origenCarga}</td>
                      <td>{bulto.tipoDocumento || "-"}</td>
                      <td>{bulto.numeroDocumento || "-"}</td>
                      <td>{bulto.cantidad}</td>
                      <td>{bulto.observacion || "-"}</td>
                      <td>
                        <div className="dc-acciones">
                          <button className="dc-row-edit" onClick={() => handleEditar(bulto)} title="Editar">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M10.5 1.5L12.5 3.5L4.5 11.5L1.5 12.5L2.5 9.5L10.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                              <path d="M9 3L11 5" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                          </button>
                          <button className="dc-row-delete" onClick={() => eliminarBulto(bulto.id)} title="Eliminar">×</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="dc-modal-footer">
            <div className="dc-total">
              <span>Total Bultos ({localActual.codigo_local}):</span>
              <strong>{totalBultos}</strong>
            </div>
            <button className="dc-btn-save" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal
const SD01IniciarTransporte: React.FC<SD01IniciarTransporteProps> = ({ transporte, onClose, onActualizar, usuario }) => {
  const [locales, setLocales] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarInfo, setMostrarInfo] = useState(true);
  const [localActual, setLocalActual] = useState<any>(null);
  const [mostrarModalBultos, setMostrarModalBultos] = useState(false);
  const [detallesConductor, setDetallesConductor] = useState<any>(null);
  const [detallesPatentePrincipal, setDetallesPatentePrincipal] = useState<any>(null);
  const [detallesPatenteAdicional, setDetallesPatenteAdicional] = useState<any>(null);

  // Bultos por local (memoria)
  const [bultosPorLocal, setBultosPorLocal] = useState<Record<string, Bulto[]>>({});

  // Barra de acciones
  const [modalCorreo, setModalCorreo] = useState(false);
  const [correosSeleccionados, setCorreosSeleccionados] = useState<string[]>([]);
  const [asunto, setAsunto] = useState('');
  const [detalleCorreo, setDetalleCorreo] = useState('');

  useEffect(() => {
    if (transporte) {
      cargarDetalles();
      cargarLocales();
    }
  }, [transporte]);

  const cargarDetalles = async () => {
    try {
      if (transporte.conductor_id) {
        const resp = await fetch(API_URL + '/conductores?select=*&id=eq.' + transporte.conductor_id, { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) setDetallesConductor(data[0]);
      }
      if (transporte.patente_principal_id) {
        const resp = await fetch(API_URL + '/patentes?select=*&id=eq.' + transporte.patente_principal_id, { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) setDetallesPatentePrincipal(data[0]);
      }
      if (transporte.patente_adicional_id) {
        const resp = await fetch(API_URL + '/patentes?select=*&id=eq.' + transporte.patente_adicional_id, { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) setDetallesPatenteAdicional(data[0]);
      }
    } catch (e) {
      console.error('Error cargando detalles:', e);
    }
  };

  const cargarLocales = async () => {
    try {
      const resp = await fetch(API_URL + '/sd01_documento_locales?select=*&documento_id=eq.' + transporte.id_documento, { headers: HEADERS });
      const data = await resp.json();
      if (data) setLocales(data);
    } catch (e) {
      console.error('Error cargando locales:', e);
    }
    setCargando(false);
  };

  const handleLocalChange = (index: number, field: string, value: any) => {
    const nuevos = [...locales];
    nuevos[index][field] = value;
    setLocales(nuevos);
  };

  const guardarCambiosLocal = async (index: number) => {
    const local = locales[index];
    try {
      await fetch(API_URL + '/sd01_documento_locales?id=eq.' + local.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sello_trasero: local.sello_trasero || null,
          sello_lateral: local.sello_lateral || null,
          sello_adicional: local.sello_adicional || null,
          cantidad_pallet: local.cantidad_pallet || null,
          modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
          modificado_en: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error('Error guardando local:', e);
    }
  };

  const handleIngresarBultos = (local: any) => {
    setLocalActual(local);
    setMostrarModalBultos(true);
  };

  const handleBultosChange = (localId: string, nuevosBultos: Bulto[]) => {
    setBultosPorLocal((prev) => ({
      ...prev,
      [localId]: nuevosBultos
    }));
  };

  const handleBultosGuardados = () => {
    setMostrarModalBultos(false);
    onActualizar();
  };

  const formatearFecha = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  const formatearRut = (rut: string) => {
    if (!rut) return '-';
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');
    if (rutLimpio.length < 2) return rut;
    const dv = rutLimpio.slice(-1);
    const numero = rutLimpio.slice(0, -1);
    const numeroFormateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return numeroFormateado + '-' + dv;
  };

  // Imprimir
  const imprimirLocales = (seleccionados: boolean) => {
    if (seleccionados && !locales.some((l: any) => l.seleccionado)) {
      alert('Seleccione al menos un local para imprimir');
      return;
    }
    const localesAImprimir = seleccionados ? locales.filter((l: any) => l.seleccionado) : locales;
    window.print();
  };

  // Copiar cuadro
  const copiarCuadro = () => {
    const lineas = locales.map((l: any) => {
      const bultos = bultosPorLocal[l.id] || [];
      const totalBultos = bultos.reduce((s: number, b: any) => s + b.cantidad, 0);
      return `${l.codigo_local} - ${l.nombre_local || ''} | Sellos: ${l.sello_trasero || '-'}/${l.sello_lateral || '-'}/${l.sello_adicional || '-'} | Bultos: ${totalBultos}`;
    });
    const texto = `Transporte ${transporte.id_documento}\n${lineas.join('\n')}`;
    navigator.clipboard.writeText(texto).then(() => alert('Cuadro copiado al portapapeles'));
  };

  // Correo
  const abrirModalCorreo = () => {
    setCorreosSeleccionados(locales.map((l: any) => l.correo).filter(Boolean));
    setAsunto('');
    setDetalleCorreo('');
    setModalCorreo(true);
  };

  const enviarCorreo = async () => {
    if (!asunto || !detalleCorreo) {
      alert('Complete asunto y detalle');
      return;
    }
    alert('Correo enviado a: ' + correosSeleccionados.join(', '));
    setModalCorreo(false);
  };

  // Finalizar transporte
  const finalizarTransporte = async () => {
    if (!window.confirm('¿Está seguro de finalizar el transporte ' + transporte.id_documento + '?')) return;

    try {
      // Guardar todos los bultos en Supabase
      for (const local of locales) {
        const bultosLocal = bultosPorLocal[local.id] || [];
        for (const bulto of bultosLocal) {
          await fetch(API_URL + '/sd01_bultos', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              local_id: local.id,
              documento_id: transporte.id_documento,
              origen_carga: bulto.origenCarga,
              tipo_documento: bulto.tipoDocumento || '',
              numero_documento: bulto.numeroDocumento || '',
              cantidad: bulto.cantidad,
              observacion: bulto.observacion || '',
              creado_por: usuario?.id,
              creado_en: new Date().toISOString()
            })
          });
        }
      }

      // Cambiar estado a Finalizado
      const now = new Date().toISOString();
      await fetch(API_URL + '/sd01_documentos?id=eq.' + transporte.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'Finalizado',
          finalizado_en: now,
          modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
          modificado_en: now
        })
      });

      alert('Transporte finalizado exitosamente. Bultos guardados.');
      onActualizar();
      onClose();
    } catch (e) {
      console.error('Error finalizando transporte:', e);
      alert('Error al finalizar transporte o guardar bultos');
    }
  };

  // Habilitación de sellos según patentes
  const selloLateralHabilitado = (detallesPatentePrincipal?.cantidad_sellos || 0) >= 2 || (detallesPatenteAdicional?.cantidad_sellos || 0) >= 1;
  const selloAdicionalHabilitado = (detallesPatenteAdicional?.cantidad_sellos || 0) >= 1;

  if (cargando) {
    return (
      <div className="sd01-container" style={{ padding: '40px', textAlign: 'center' }}>
        Cargando datos...
      </div>
    );
  }

  return (
    <div className="sd01-container">
      {/* Barra de acciones horizontal */}
      <div className="sd01-action-bar">
        <button className="sd01-btn sd01-btn-cancel" onClick={onClose}>
          ← Volver a la lista
        </button>

        <div className="sd01-separator"></div>

        <div className="sd01-action-group">
          <span className="sd01-action-label">Imprimir</span>
          <button className="sd01-btn" onClick={() => imprimirLocales(false)}>Todos los locales</button>
          <button className="sd01-btn" onClick={() => imprimirLocales(true)}>Locales Seleccionados</button>
        </div>

        <div className="sd01-separator"></div>

        <div className="sd01-action-group">
          <span className="sd01-action-label">Envío Correo</span>
          <button className="sd01-btn" onClick={abrirModalCorreo}>Seleccionar Correos</button>
          <button className="sd01-btn" onClick={() => setModalCorreo(true)}>Asunto y Detalle</button>
          <button className="sd01-btn" onClick={copiarCuadro}>Copiar Cuadro</button>
        </div>

        <div className="sd01-separator"></div>

        <button className="sd01-btn sd01-btn-success" onClick={finalizarTransporte} style={{ background: '#16a34a', color: 'white' }}>
          Finalizar Transporte
        </button>
      </div>

      {/* Contenido principal */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button
            onClick={() => setMostrarInfo(!mostrarInfo)}
            style={{
              background: 'var(--btn-bg)',
              border: '1px solid var(--btn-border)',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              color: 'var(--text-muted)'
            }}
          >
            {mostrarInfo ? 'Ocultar datos del transporte' : 'Mostrar datos del transporte'}
          </button>
        </div>

        {mostrarInfo && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="sd01-ver-card">
              <div className="sd01-ver-card-title">Programación</div>
              <div className="sd01-ver-field">
                <span className="sd01-ver-field-label">Fecha Programación</span>
                <span className="sd01-ver-field-value">{formatearFecha(transporte.fecha_programacion)}</span>
              </div>
              {transporte.fecha_inicio && (
                <div className="sd01-ver-field">
                  <span className="sd01-ver-field-label">Hora Inicio</span>
                  <span className="sd01-ver-field-value">
                    {new Date(transporte.fecha_inicio).toLocaleString('es-CL')}
                  </span>
                </div>
              )}
            </div>

            <div className="sd01-ver-card">
              <div className="sd01-ver-card-title">Conductor</div>
              <div className="sd01-ver-field">
                <span className="sd01-ver-field-label">Nombre</span>
                <span className="sd01-ver-field-value">
                  {detallesConductor ? detallesConductor.nombre + ' ' + detallesConductor.apellido : '-'}
                </span>
              </div>
              {detallesConductor && (
                <>
                  <div className="sd01-ver-field">
                    <span className="sd01-ver-field-label">RUT</span>
                    <span className="sd01-ver-field-value">{formatearRut(detallesConductor.numero_documento)}</span>
                  </div>
                  <div className="sd01-ver-field">
                    <span className="sd01-ver-field-label">Teléfono</span>
                    <span className="sd01-ver-field-value">{detallesConductor.telefono || '-'}</span>
                  </div>
                  <div className="sd01-ver-field">
                    <span className="sd01-ver-field-label">Transportista</span>
                    <span className="sd01-ver-field-value">{detallesConductor.empresa || '-'}</span>
                  </div>
                </>
              )}
            </div>

            <div className="sd01-ver-card">
              <div className="sd01-ver-card-title">Patente Principal</div>
              <div className="sd01-ver-field">
                <span className="sd01-ver-field-label">Patente</span>
                <span className="sd01-ver-field-value-large">
                  {detallesPatentePrincipal ? detallesPatentePrincipal.numero_patente : '-'}
                </span>
              </div>
              {detallesPatentePrincipal && (
                <div className="sd01-ver-field">
                  <span className="sd01-ver-field-label">Tipo de Vehículo</span>
                  <span className="sd01-ver-field-value">{detallesPatentePrincipal.tipo_vehiculo || 'Otro'}</span>
                </div>
              )}
              {detallesPatentePrincipal && (
                <div className="sd01-ver-field">
                  <span className="sd01-ver-field-label">Cant. Sellos</span>
                  <span className="sd01-ver-field-value">{detallesPatentePrincipal.cantidad_sellos || 0}</span>
                </div>
              )}
            </div>

            <div className="sd01-ver-card">
              <div className="sd01-ver-card-title">Patente Adicional</div>
              {detallesPatenteAdicional ? (
                <>
                  <div className="sd01-ver-field">
                    <span className="sd01-ver-field-label">Patente</span>
                    <span className="sd01-ver-field-value-large">{detallesPatenteAdicional.numero_patente}</span>
                  </div>
                  <div className="sd01-ver-field">
                    <span className="sd01-ver-field-label">Tipo de Vehículo</span>
                    <span className="sd01-ver-field-value">{detallesPatenteAdicional.tipo_vehiculo || 'Otro'}</span>
                  </div>
                  <div className="sd01-ver-field">
                    <span className="sd01-ver-field-label">Cant. Sellos</span>
                    <span className="sd01-ver-field-value">{detallesPatenteAdicional.cantidad_sellos || 0}</span>
                  </div>
                </>
              ) : (
                <div className="sd01-ver-field">
                  <span className="sd01-ver-field-value" style={{ color: 'var(--text-muted)' }}>No asignada</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: '8px' }}>
          <div className="sd01-ver-locales-title">
            Datos Destino
            <span className="sd01-ver-locales-count">{locales.length} locales</span>
          </div>
          <div className="sd01-table-scroll">
            <table className="sd01-table" style={{ minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>
                    <input type="checkbox" onChange={(e) => {
                      const checked = e.target.checked;
                      setLocales(locales.map((l: any) => ({ ...l, seleccionado: checked })));
                    }} />
                  </th>
                  <th>Código</th>
                  <th>Nombre Local</th>
                  <th>Fecha Entrega</th>
                  <th>Hora Entrega</th>
                  <th>Sello Trasero</th>
                  <th>Sello Lateral</th>
                  <th>Sello Adicional</th>
                  <th>Cantidad Pallet</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {locales.map((local, index) => (
                  <tr key={local.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!local.seleccionado}
                        onChange={(e) => {
                          const nuevos = [...locales];
                          nuevos[index].seleccionado = e.target.checked;
                          setLocales(nuevos);
                        }}
                      />
                    </td>
                    <td><strong>{local.codigo_local}</strong></td>
                    <td>{local.nombre_local || '-'}</td>
                    <td>{formatearFecha(local.fecha_entrega)}</td>
                    <td>{local.hora_entrega || '-'}</td>
                    <td>
                      <input
                        type="text"
                        className="sd01-form-input"
                        style={{ width: '80px', padding: '4px 8px', fontSize: '13px' }}
                        value={local.sello_trasero || ''}
                        onChange={(e) => handleLocalChange(index, 'sello_trasero', e.target.value)}
                        onBlur={() => guardarCambiosLocal(index)}
                        placeholder="Sello"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="sd01-form-input"
                        style={{ width: '80px', padding: '4px 8px', fontSize: '13px' }}
                        value={local.sello_lateral || ''}
                        onChange={(e) => handleLocalChange(index, 'sello_lateral', e.target.value)}
                        onBlur={() => guardarCambiosLocal(index)}
                        placeholder="Sello"
                        disabled={!selloLateralHabilitado}
                        title={!selloLateralHabilitado ? 'Requiere 2 sellos en patente principal o 1 en adicional' : ''}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="sd01-form-input"
                        style={{ width: '80px', padding: '4px 8px', fontSize: '13px' }}
                        value={local.sello_adicional || ''}
                        onChange={(e) => handleLocalChange(index, 'sello_adicional', e.target.value)}
                        onBlur={() => guardarCambiosLocal(index)}
                        placeholder="Sello"
                        disabled={!selloAdicionalHabilitado}
                        title={!selloAdicionalHabilitado ? 'Requiere al menos 1 sello en patente adicional' : ''}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="sd01-form-input"
                        style={{ width: '80px', padding: '4px 8px', fontSize: '13px' }}
                        value={local.cantidad_pallet || ''}
                        onChange={(e) => handleLocalChange(index, 'cantidad_pallet', e.target.value ? Number(e.target.value) : null)}
                        onBlur={() => guardarCambiosLocal(index)}
                        placeholder="0"
                        min="0"
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="sd01-btn sd01-btn-primary"
                        style={{ padding: '2px 8px', fontSize: '12px', whiteSpace: 'nowrap' }}
                        onClick={() => handleIngresarBultos(local)}
                      >
                        + Bultos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Bultos */}
      {mostrarModalBultos && localActual && (
        <BultosModal
          localInicial={localActual}
          locales={locales}
          bultosPorLocal={bultosPorLocal}
          onBultosChange={handleBultosChange}
          onClose={() => setMostrarModalBultos(false)}
          usuario={usuario}
          documentoId={transporte.id_documento}
        />
      )}

      {/* Modal Correo */}
      {modalCorreo && (
        <div className="sd01-modal-overlay" onClick={() => setModalCorreo(false)}>
          <div className="sd01-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sd01-modal-header">
              <h2>Enviar Correo</h2>
              <button className="sd01-modal-close" onClick={() => setModalCorreo(false)}>×</button>
            </div>
            <div className="sd01-modal-body">
              <div className="sd01-form-group">
                <label className="sd01-form-label">Correos Destinatarios</label>
                <select multiple className="sd01-form-select" value={correosSeleccionados} onChange={(e) => setCorreosSeleccionados(Array.from(e.target.selectedOptions, option => option.value))}>
                  {locales.filter((l: any) => l.correo).map((l: any) => (
                    <option key={l.id} value={l.correo}>{l.codigo_local} - {l.correo}</option>
                  ))}
                </select>
              </div>
              <div className="sd01-form-group">
                <label className="sd01-form-label">Asunto</label>
                <input type="text" className="sd01-form-input" value={asunto} onChange={(e) => setAsunto(e.target.value)} />
              </div>
              <div className="sd01-form-group">
                <label className="sd01-form-label">Detalle</label>
                <textarea className="sd01-form-input" rows={4} value={detalleCorreo} onChange={(e) => setDetalleCorreo(e.target.value)} />
              </div>
            </div>
            <div className="sd01-modal-footer">
              <button className="sd01-btn-cancel" onClick={() => setModalCorreo(false)}>Cancelar</button>
              <button className="sd01-btn-save" onClick={enviarCorreo}>Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD01IniciarTransporte;
