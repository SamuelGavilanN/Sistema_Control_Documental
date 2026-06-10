// src/components/Transactions/SD/SD01Modales/ConductorSection.tsx

import React, { useState, useRef, useEffect } from 'react';

interface Conductor {
  id: string; nombre: string; apellido: string; nombre_completo?: string;
  numero_documento: string; telefono: string; empresa: string;
}

interface ConductorSectionProps {
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onTab?: () => void;
  conductores: Conductor[];
  setConductores: (c: Conductor[]) => void;
}

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS = { 'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G' };

const empresas = ["Transportes Pérez", "Logística MG", "Transportes CR", "Logística del Sur", "Transportes Norte", "Distribuidora Central", "Transportes Andes", "Logística Express"];

const ConductorSection: React.FC<ConductorSectionProps> = ({ value, onChange, inputRef, onKeyDown, onTab, conductores, setConductores }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [nuevoConductor, setNuevoConductor] = useState<Partial<Conductor>>({});
  const [suggestions, setSuggestions] = useState<Conductor[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [guardando, setGuardando] = useState(false);
  const internalRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const actualRef = inputRef || internalRef;
  const conductorSeleccionado = conductores.find(c => c.nombre_completo === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getBestMatch = (input: string): Conductor | null => {
    if (!input) return null;
    const lowerInput = input.toLowerCase();
    return conductores.find(c => c.nombre_completo?.toLowerCase().startsWith(lowerInput)) || null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    const filtered = conductores.filter(c => c.nombre_completo?.toLowerCase().includes(newValue.toLowerCase()));
    setSuggestions(filtered);
    setIsOpen(filtered.length > 0 && newValue.length > 0);
    setHighlightIndex(-1);
  };

  const handleSelect = (conductor: Conductor) => { onChange(conductor.nombre_completo || ""); setIsOpen(false); actualRef.current?.focus(); };
  const handleAddNew = () => { setIsOpen(false); setShowAddForm(true); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (isOpen && highlightIndex >= 0) { e.preventDefault(); handleSelect(suggestions[highlightIndex]); }
      else { const bestMatch = getBestMatch(value); if (bestMatch) { e.preventDefault(); onChange(bestMatch.nombre_completo || ""); setIsOpen(false); } }
    } else if (e.key === "Tab") {
      const bestMatch = getBestMatch(value);
      if (bestMatch && value !== bestMatch.nombre_completo) { e.preventDefault(); onChange(bestMatch.nombre_completo || ""); setIsOpen(false); return; }
      setIsOpen(false); if (onTab) { e.preventDefault(); onTab(); }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && value) { const filtered = conductores.filter(c => c.nombre_completo?.toLowerCase().includes(value.toLowerCase())); setSuggestions(filtered); setIsOpen(true); setHighlightIndex(0); }
      else { setHighlightIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev); }
    } else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIndex(prev => prev > 0 ? prev - 1 : prev); }
    else if (e.key === "Escape") { setIsOpen(false); }
  };

  const handleAddConductor = async () => {
    try {
      setGuardando(true);
      if (nuevoConductor.nombre) {
        const resp = await fetch(`${API_URL}/sd01_conductores`, {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: nuevoConductor.nombre,
            apellido: nuevoConductor.apellido || "",
            numero_documento: nuevoConductor.numero_documento || "",
            telefono: nuevoConductor.telefono || "",
            empresa: nuevoConductor.empresa || "",
            activo: true,
          }),
        });
        const creado = await resp.json();
        const nuevo = { ...creado, nombre_completo: `${creado.nombre} ${creado.apellido}` };
        setConductores([...conductores, nuevo]);
        onChange(nuevo.nombre_completo || nuevo.nombre);
      }
      setShowAddForm(false); setNuevoConductor({});
      actualRef.current?.focus();
    } catch (error: any) { alert("Error al guardar conductor: " + error.message); }
    finally { setGuardando(false); }
  };

  return (
    <div className="compact-section">
      <div className="compact-header" onClick={() => setShowDetails(!showDetails)}>
        <span className="compact-title">Conductor</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`arrow ${showDetails ? "rotated" : ""}`}><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      <div className="compact-content">
        <div className="autocomplete-wrapper" ref={wrapperRef}>
          <input ref={actualRef} type="text" className="compact-input" value={value} onChange={handleInputChange} onFocus={() => { if (value) { const filtered = conductores.filter(c => c.nombre_completo?.toLowerCase().includes(value.toLowerCase())); setSuggestions(filtered); setIsOpen(filtered.length > 0); } }} onKeyDown={handleKeyDown} placeholder="Buscar o escribir..." />
          {isOpen && suggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {suggestions.map((conductor, index) => (
                <div key={conductor.id} className={`autocomplete-item ${index === highlightIndex ? "highlighted" : ""}`} onClick={() => handleSelect(conductor)}>{conductor.nombre_completo}</div>
              ))}
              <div className="autocomplete-item add-new" onClick={handleAddNew}>+ Agregar nuevo conductor</div>
            </div>
          )}
        </div>
        {showAddForm && (
          <div className="mini-form">
            <h4>Registrar Nuevo Conductor</h4>
            <input placeholder="Nombre" value={nuevoConductor.nombre || ""} onChange={e => setNuevoConductor({ ...nuevoConductor, nombre: e.target.value })} autoFocus />
            <input placeholder="Apellido" value={nuevoConductor.apellido || ""} onChange={e => setNuevoConductor({ ...nuevoConductor, apellido: e.target.value })} />
            <input placeholder="Rut (ej: 12.345.678-9)" value={nuevoConductor.numero_documento || ""} onChange={e => setNuevoConductor({ ...nuevoConductor, numero_documento: e.target.value })} />
            <input placeholder="Empresa" value={nuevoConductor.empresa || ""} onChange={e => setNuevoConductor({ ...nuevoConductor, empresa: e.target.value })} list="empresas-list" />
            <datalist id="empresas-list">{empresas.map(emp => <option key={emp} value={emp} />)}</datalist>
            <input placeholder="Teléfono" value={nuevoConductor.telefono || ""} onChange={e => setNuevoConductor({ ...nuevoConductor, telefono: e.target.value })} />
            <div className="mini-form-actions">
              <button className="btn-save" onClick={handleAddConductor} disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</button>
              <button className="btn-cancel" onClick={() => { setShowAddForm(false); setNuevoConductor({}); }}>Cancelar</button>
            </div>
          </div>
        )}
        {showDetails && conductorSeleccionado && (
          <div className="compact-details">
            <div className="detail-row"><span className="detail-label">Rut:</span><span className="detail-value">{conductorSeleccionado.numero_documento}</span></div>
            <div className="detail-row"><span className="detail-label">Empresa:</span><span className="detail-value">{conductorSeleccionado.empresa}</span></div>
            <div className="detail-row"><span className="detail-label">Teléfono:</span><span className="detail-value">{conductorSeleccionado.telefono}</span></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConductorSection;