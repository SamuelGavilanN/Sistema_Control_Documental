// src/components/Transactions/SD/SD01IniciarTransporte.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import { locales as localesMaestros } from '../../../data/locales';
import ImprimirModal from './ImprimirModal';
import ImprimirSeleccionModal from './ImprimirSeleccionModal';
import { copiarCuadroDespacho } from './generarCuadroDespacho';
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

interface LocalImprimir {
  codigoLocal: string;
  nombreLocal: string;
  fechaEntrega: string;
  horaEntrega: string;
  selloTrasero: string;
  carga: Array<{
    origenCarga: string;
    tipoDocumento: string;
    numeroDocumento: string;
    cantidadBultos: number;
    observacion: string;
  }>;
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

// Modal de bultos con guardado inmediato en Supabase
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
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const origenRef = useRef<HTMLInputElement>(null);
  const tipoDocRef = useRef<HTMLInputElement>(null);
  const numeroDocRef = useRef<HTMLInputElement>(null);
  const cantidadRef = useRef<HTMLInputElement>(null);
  const observacionRef = useRef<HTMLInputElement>(null);
  const agregarBtnRef = useRef<HTMLButtonElement>(null);

  const tipoNoAplica = nuevoBulto.origenCarga
    ? tiposDocumentoPorOrigen[nuevoBulto.origenCarga]?.length === 0
    : false;

  useEffect(() => {
    setBultos(bultosPorLocal[localActual.id] || []);
    setNuevoBulto({ origenCarga: "", tipoDocumento: "", numeroDocumento: "", cantidad: 0, observacion: "" });
    setEditandoId(null);
    setTiposDisponibles([]);
    setErrorMsg('');
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
    setErrorMsg('');
    setTimeout(() => origenRef.current?.focus(), 50);
  };

  const agregarOActualizarBulto = async () => {
    if (!nuevoBulto.origenCarga || !nuevoBulto.cantidad) return;

    setGuardando(true);
    setErrorMsg('');
    try {
      const data = {
        local_id: localActual.id,
        documento_id: documentoId,
        origen_carga: nuevoBulto.origenCarga,
        tipo_documento: nuevoBulto.tipoDocumento || '',
        numero_documento: nuevoBulto.numeroDocumento || '',
        cantidad: nuevoBulto.cantidad,
        observacion: nuevoBulto.observacion || '',
        creado_por: usuario?.id,
        creado_en: new Date().toISOString()
      };

      if (editandoId) {
        const resp = await fetch(API_URL + '/sd01_bultos?id=eq.' + editandoId, {
          method: 'PATCH',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!resp.ok) throw new Error(await resp.text());
        const nuevos = bultos.map((b) =>
          b.id === editandoId ? { ...b, ...nuevoBulto, id: editandoId } : b
        );
        setBultos(nuevos);
        onBultosChange(localActual.id, nuevos);
        setEditandoId(null);
      } else {
        const resp = await fetch(API_URL + '/sd01_bultos', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(data)
        });
        if (!resp.ok) throw new Error(await resp.text());
        const result = await resp.json();
        const creado = result[0];
        const nuevo: Bulto = {
          id: creado.id,
          origenCarga: creado.origen_carga,
          tipoDocumento: creado.tipo_documento || '',
          numeroDocumento: creado.numero_documento || '',
          cantidad: creado.cantidad,
          observacion: creado.observacion || ''
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
    } catch (e: any) {
      setErrorMsg('Error al guardar bulto: ' + (e.message || 'Desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarBulto = async (id: string) => {
    if (!window.confirm('¿Eliminar este bulto?')) return;
    try {
      await fetch(API_URL + '/sd01_bultos?id=eq.' + id, { method: 'DELETE', headers: HEADERS });
      const nuevos = bultos.filter((b) => b.id !== id);
      setBultos(nuevos);
      onBultosChange(localActual.id, nuevos);
      if (editandoId === id) {
        setEditandoId(null);
        setNuevoBulto({ origenCarga: "", tipoDocumento: "", numeroDocumento: "", cantidad: 0, observacion: "" });
      }
    } catch (e: any) {
      setErrorMsg('Error al eliminar bulto: ' + (e.message || 'Desconocido'));
    }
  };

  const totalBultos = bultos.reduce((sum, b) => sum + b.cantidad, 0);

  return (
    <div className="sd01-modal-overlay">
      <div className="sd01-modal sd01-modal-bultos" onClick={(e) => e.stopPropagation()}>
        <div className="sd01-modal-header">
          <h2>Bultos por Local</h2>
          <button className="sd01-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="sd01-modal-body">
          {errorMsg && (
            <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px', fontSize: '13px', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}
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
                  onEnter={() => { if (tipoNoAplica) cantidadRef.current?.focus(); else numeroDocRef.current?.focus(); }}
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
              <button ref={agregarBtnRef} className="dc-btn-add" onClick={agregarOActualizarBulto} disabled={guardando}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                {guardando ? 'Guardando...' : editandoId !== null ? "Actualizar" : "Agregar"}
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
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 1.5L12.5 3.5L4.5 11.5L1.5 12.5L2.5 9.5L10.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M9 3L11 5" stroke="currentColor" strokeWidth="1.5" /></svg>
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

  const [bultosPorLocal, setBultosPorLocal] = useState<Record<string, Bulto[]>>({});
  const [selloLateralGlobal, setSelloLateralGlobal] = useState(transporte.sello_lateral || '');
  const [selloAdicionalGlobal, setSelloAdicionalGlobal] = useState(transporte.sello_adicional || '');

  const [mostrarImprimirModal, setMostrarImprimirModal] = useState(false);
  const [localesImprimir, setLocalesImprimir] = useState<LocalImprimir[]>([]);
  const [copiasImprimir, setCopiasImprimir] = useState<string[]>([]);
  const [mostrarSeleccionCopias, setMostrarSeleccionCopias] = useState(false);

  useEffect(() => {
    if (transporte) {
      cargarDetalles();
      cargarLocales();
      setSelloLateralGlobal(transporte.sello_lateral || '');
      setSelloAdicionalGlobal(transporte.sello_adicional || '');
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
      const resp = await fetch(
        API_URL + '/sd01_documento_locales?select=*&documento_id=eq.' + transporte.id_documento,
        { headers: HEADERS }
      );
      const data = await resp.json();

      if (Array.isArray(data)) {
        const localesMapeados = data.map((local: any) => ({
          ...local,
          sello_trasero: local.sello_trasero || '',
          cantidad_pallet: local.cantidad_pallet || null,
          seleccionado: false,
        }));
        setLocales(localesMapeados);

        const respBultos = await fetch(
          API_URL + '/sd01_bultos?select=*&documento_id=eq.' + transporte.id_documento,
          { headers: HEADERS }
        );
        const bultosData = await respBultos.json();
        if (Array.isArray(bultosData)) {
          const map: Record<string, Bulto[]> = {};
          bultosData.forEach((b: any) => {
            if (!map[b.local_id]) map[b.local_id] = [];
            map[b.local_id].push({
              id: b.id,
              origenCarga: b.origen_carga,
              tipoDocumento: b.tipo_documento || '',
              numeroDocumento: b.numero_documento || '',
              cantidad: b.cantidad,
              observacion: b.observacion || ''
            });
          });
          setBultosPorLocal(map);
        }
      }
    } catch (e) {
      console.error('Error cargando locales:', e);
    }
    setCargando(false);
  };

  const guardarSellosGlobales = async () => {
    try {
      await fetch(API_URL + '/sd01_documentos?id=eq.' + transporte.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sello_lateral: selloLateralGlobal || null,
          sello_adicional: selloAdicionalGlobal || null,
          modificado_por: usuario?.nombre + ' ' + usuario?.apellido,
          modificado_en: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error('Error guardando sellos globales:', e);
    }
  };

  const handleLocalChange = (index: number, field: string, value: any) => {
    const nuevos = [...locales];
    nuevos[index][field] = value;
    setLocales(nuevos);
  };

  const guardarCambiosLocal = async (index: number) => {
    const local = locales[index];
    try {
      const resp = await fetch(
        API_URL + '/sd01_documento_locales?id=eq.' + local.id,
        {
          method: 'PATCH',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sello_trasero: local.sello_trasero || null,
            cantidad_pallet: local.cantidad_pallet || null,
          })
        }
      );
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Error guardando local:', errorText);
        alert('Error al guardar local: ' + errorText);
      }
    } catch (e) {
      console.error('Error guardando local:', e);
      alert('Error de red al guardar local');
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

  const totalBultosGlobal = Object.values(bultosPorLocal).reduce((sum, bultos) => 
    sum + bultos.reduce((s, b) => s + b.cantidad, 0), 0
  );

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

  // ---------- FUNCIONES DE CORREO ----------
  const copiarCorreos = () => {
    const correos = locales.map((l: any) => {
      const localMaestro = localesMaestros.find((lm: any) => lm.codigo_local === l.codigo_local);
      return localMaestro?.correo;
    }).filter(Boolean).join(';');
    if (!correos) {
      alert('No hay correos configurados para los locales');
      return;
    }
    navigator.clipboard.writeText(correos).then(() => {
      alert('Correos copiados al portapapeles');
    }).catch((err) => {
      console.error('Error al copiar correos:', err);
      alert('Error al copiar correos');
    });
  };

  const copiarAsuntoDetalle = () => {
    const nombresLocales = locales.map((l: any) => {
      const localMaestro = localesMaestros.find((lm: any) => lm.codigo_local === l.codigo_local);
      return localMaestro?.nombre_local || l.nombre_local;
    }).filter(Boolean);
    const nombresUnicos = [...new Set(nombresLocales)].join(', ');

    const actasSet = new Set<string>();
    Object.values(bultosPorLocal).forEach((bultos) => {
      bultos.forEach((b) => {
        if (b.numeroDocumento) actasSet.add(b.numeroDocumento);
      });
    });
    const actasUnicas = [...actasSet].join(', ');

    const texto = `DETALLE DE DESPACHO: ${nombresUnicos} /// N° DE ACTA: ${actasUnicas}`;

    navigator.clipboard.writeText(texto).then(() => {
      alert('Detalle copiado al portapapeles');
    }).catch((err) => {
      console.error('Error al copiar detalle:', err);
      alert('Error al copiar detalle');
    });
  };

  const copiarCuadro = async () => {
    const destino = [...new Set(
      locales.map((l: any) => {
        const localMaestro = localesMaestros.find((lm: any) => lm.codigo_local === l.codigo_local);
        return localMaestro?.nombre_local || l.nombre_local;
      }).filter(Boolean)
    )].join(', ');

    const actasSet = new Set<string>();
    Object.values(bultosPorLocal).forEach((bultos) => {
      bultos.forEach((b) => {
        if (b.numeroDocumento) actasSet.add(b.numeroDocumento);
      });
    });
    const actas = [...actasSet].join(' - ');

    const localesCuadro = locales.map((local: any) => {
      const bultosLocal = bultosPorLocal[local.id] || [];
      return {
        codigo: local.codigo_local,
        nombre: local.nombre_local || '',
        selloTrasero: local.sello_trasero || '',
        cantidadPallet: local.cantidad_pallet || 0,  // NUEVO
        bultos: bultosLocal.map((b: any) => ({
          origenCarga: b.origenCarga,
          tipoDocumento: b.tipoDocumento,
          numeroDocumento: b.numeroDocumento,
          cantidad: b.cantidad,
          observacion: b.observacion,
        })),
      };
    });

    const horaEntrega = transporte.hora_entrega || locales[0]?.hora_entrega || '';
    const administrativo = transporte.administrativo || `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim();
    const totalPallets = locales.reduce((sum, l) => sum + (Number(l.cantidad_pallet) || 0), 0);

    const datos = {
      idDocumento: transporte.id_documento,
      destino,
      fechaEntrega: transporte.fecha_programacion ? formatearFecha(transporte.fecha_programacion) : '',
      horaEntrega,
      chofer: detallesConductor ? `${detallesConductor.nombre} ${detallesConductor.apellido}` : '',
      rutChofer: detallesConductor?.numero_documento || '',
      celularChofer: detallesConductor?.telefono || '',
      patentePrincipal: detallesPatentePrincipal?.numero_patente || '',
      patenteAdicional: detallesPatenteAdicional?.numero_patente || undefined,
      transportista: detallesConductor?.empresa || '',
      selloTrasero: locales[0]?.sello_trasero || '',
      selloLateral: selloLateralGlobal,
      selloAdicional: selloAdicionalGlobal,
      administrativo,
      actasInformadas: actas,
      totalPallets,
      locales: localesCuadro,
    };

    const exito = await copiarCuadroDespacho(datos);
    if (exito) {
      alert('Cuadro copiado al portapapeles. Puedes pegarlo en Outlook.');
    } else {
      alert('Error al copiar el cuadro');
    }
  };

  // ---------- IMPRESIÓN ----------
  const prepararImpresion = (localesAImprimir: any[], copias: string[]) => {
    const localesParaImprimir = localesAImprimir.map((local: any) => {
      const bultos = bultosPorLocal[local.id] || [];
      return {
        codigoLocal: local.codigo_local,
        nombreLocal: local.nombre_local || '',
        fechaEntrega: local.fecha_entrega,
        horaEntrega: local.hora_entrega || '',
        selloTrasero: local.sello_trasero || '',
        carga: bultos.map((b: any) => ({
          origenCarga: b.origenCarga,
          tipoDocumento: b.tipoDocumento,
          numeroDocumento: b.numeroDocumento,
          cantidadBultos: b.cantidad,
          observacion: b.observacion
        }))
      };
    });

    setLocalesImprimir(localesParaImprimir);
    setCopiasImprimir(copias);
    setMostrarImprimirModal(true);
  };

  const imprimirTodos = () => {
    prepararImpresion(locales, ["Local", "Guardia", "Conductor", "Original"]);
  };

  const imprimirSeleccionados = () => {
    if (!locales.some((l: any) => l.seleccionado)) {
      alert('Seleccione al menos un local para imprimir');
      return;
    }
    setMostrarSeleccionCopias(true);
  };

  const confirmarImprimirSeleccionados = (copias: string[]) => {
    const localesSeleccionados = locales.filter((l: any) => l.seleccionado);
    setMostrarSeleccionCopias(false);
    prepararImpresion(localesSeleccionados, copias);
  };

  const finalizarTransporte = async () => {
    if (!window.confirm('¿Está seguro de finalizar el transporte ' + transporte.id_documento + '?')) return;

    try {
      await guardarSellosGlobales();

      for (const local of locales) {
        const resp = await fetch(
          API_URL + '/sd01_documento_locales?id=eq.' + local.id,
          {
            method: 'PATCH',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sello_trasero: local.sello_trasero || null,
              cantidad_pallet: local.cantidad_pallet || null,
            })
          }
        );
        if (!resp.ok) {
          const errorText = await resp.text();
          console.error('Error guardando local al finalizar:', errorText);
        }
      }

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

      alert('Transporte finalizado exitosamente. Sellos y pallets guardados.');
      onActualizar();
      onClose();
    } catch (e) {
      console.error('Error finalizando transporte:', e);
      alert('Error al finalizar transporte');
    }
  };

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
          <button className="sd01-btn" onClick={imprimirTodos}>Todos los locales</button>
          <button className="sd01-btn" onClick={imprimirSeleccionados}>Locales Seleccionados</button>
        </div>

        <div className="sd01-separator"></div>

        <div className="sd01-action-group">
          <span className="sd01-action-label">Envío Correo</span>
          <button className="sd01-btn" onClick={copiarCorreos}>Seleccionar Correos</button>
          <button className="sd01-btn" onClick={copiarAsuntoDetalle}>Asunto y Detalle</button>
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

        {/* Sección Datos Destino con sellos globales y TABLA DE LOCALES */}
        <div style={{ marginTop: '8px' }}>
          <div className="sd01-ver-locales-title" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span>Datos Destino</span>
            <span className="sd01-ver-locales-count">{locales.length} locales</span>
            <span className="sd01-ver-locales-count">Total Bultos: {totalBultosGlobal}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Sello Lateral</label>
              <input
                type="text"
                className="sd01-form-input"
                style={{ width: '80px', padding: '4px 8px', fontSize: '13px' }}
                value={selloLateralGlobal}
                onChange={(e) => setSelloLateralGlobal(e.target.value)}
                onBlur={guardarSellosGlobales}
                placeholder="Sello"
                disabled={!selloLateralHabilitado}
                title={!selloLateralHabilitado ? 'Requiere 2 sellos en patente principal o 1 en adicional' : ''}
              />
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Sello Adicional</label>
              <input
                type="text"
                className="sd01-form-input"
                style={{ width: '80px', padding: '4px 8px', fontSize: '13px' }}
                value={selloAdicionalGlobal}
                onChange={(e) => setSelloAdicionalGlobal(e.target.value)}
                onBlur={guardarSellosGlobales}
                placeholder="Sello"
                disabled={!selloAdicionalHabilitado}
                title={!selloAdicionalHabilitado ? 'Requiere al menos 1 sello en patente adicional' : ''}
              />
            </div>
          </div>

          <div className="sd01-table-scroll" style={{ marginTop: '10px' }}>
            <table className="sd01-table" style={{ minWidth: '900px' }}>
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

      {/* Modales */}
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

      {mostrarImprimirModal && (
        <ImprimirModal
          isOpen={mostrarImprimirModal}
          locales={localesImprimir}
          conductor={detallesConductor ? `${detallesConductor.nombre} ${detallesConductor.apellido}` : ''}
          rutConductor={detallesConductor?.numero_documento || ''}
          patentePrincipal={detallesPatentePrincipal?.numero_patente || ''}
          patenteAdicional={detallesPatenteAdicional?.numero_patente || undefined}
          selloLateral={selloLateralGlobal}
          selloAdicional={selloAdicionalGlobal}
          nombreAdministrativo={transporte.administrativo || ''}
          copias={copiasImprimir}
          onClose={() => setMostrarImprimirModal(false)}
        />
      )}

      {mostrarSeleccionCopias && (
        <ImprimirSeleccionModal
          isOpen={mostrarSeleccionCopias}
          onClose={() => setMostrarSeleccionCopias(false)}
          onImprimir={confirmarImprimirSeleccionados}
          localesSeleccionados={locales.filter((l: any) => l.seleccionado).length}
        />
      )}
    </div>
  );
};

export default SD01IniciarTransporte;
