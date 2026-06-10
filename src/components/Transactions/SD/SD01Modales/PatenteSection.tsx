// src/components/Transactions/SD/SD01Modales/PatenteSection.tsx

import React, { useState, useRef, useEffect } from 'react';

interface Patente {
  id: string; numero_patente: string; tipo_vehiculo: string; cantidad_sellos: number;
}

interface PatenteSectionProps {
  titulo: string;
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onTab?: () => void;
  patentes: Patente[];
  setPatentes: (p: Patente[]) => void;
}

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS = { 'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G' };

const tiposVehiculo = ["Furgon", "Camion", "Tracto", "Rampla", "Otro"];

const PatenteSection: React.FC<PatenteSectionProps> = ({ titulo, value, onChange, inputRef, onKeyDown, onTab, patentes, setPatentes }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [nuevaPatente, setNuevaPatente] = useState<Partial<Patente>>({});
  const [suggestions, setSuggestions] = useState<Patente[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [guardando, setGuardando] = useState(false);
  const internalRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const actualRef = inputRef || internalRef;
  const patenteSeleccionada = patentes.find(p => p.numero_patente === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getBestMatch = (input: string): Patente | null => {
    if (!input) return null;
    const upperInput = input.toUpperCase();
    return patentes.find(p => p.numero_patente.toUpperCase().startsWith(upperInput)) || null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    const filtered = patentes.filter(p => p.numero_patente.toUpperCase().includes(newValue.toUpperCase()));
    setSuggestions(filtered);
    setIsOpen(filtered.length > 0 && newValue.length > 0);
    setHighlightIndex(-1);
  };

  const handleSelect = (patente: Patente) => { onChange(patente.numero_patente); setIsOpen(false); actualRef.current?.focus(); };
  const handleAddNew = () => { setIsOpen(false); setShowAddForm(true); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (isOpen && highlightIndex >= 0) { e.preventDefault(); handleSelect(suggestions[highlightIndex]); }
      else { const bestMatch = getBestMatch(value); if (bestMatch) { e.preventDefault(); onChange(bestMatch.numero_patente); setIsOpen(false); } }
    } else if (e.key === "Tab") {
      const bestMatch = getBestMatch(value);
      if (bestMatch && value !== bestMatch.numero_patente) { e.preventDefault(); onChange(bestMatch.numero_patente); setIsOpen(false); return; }
      setIsOpen(false); if (onTab) { e.preventDefault(); onTab(); }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && value) { const filtered = patentes.filter(p => p.numero_patente.toUpperCase().includes(value.toUpperCase())); setSuggestions(filtered); setIsOpen(true); setHighlightIndex(0); }
      else { setHighlightIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev); }
    } else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIndex(prev => prev > 0 ? prev - 1 : prev); }
    else if (e.key === "Escape") { setIsOpen(false); }
  };

  const handleAddPatente = async () => {
    try {
      setGuardando(true);
      if (nuevaPatente.numero_patente) {
        const resp = await fetch(`${API_URL}/sd01_patentes`, {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero_patente: nuevaPatente.numero_patente.toUpperCase(),
            tipo_vehiculo: nuevaPatente.tipo_vehiculo || "Otro",
            cantidad_sellos: nuevaPatente.cantidad_sellos || 1,
            activo: true,
          }),
        });
        const creada = await resp.json();
        setPatentes([...patentes, creada]);
        onChange(creada.numero_patente);
      }
      setShowAddForm(false); setNuevaPatente({});
      actualRef.current?.focus();
    } catch (error: any) { alert("Error al guardar patente: " + error.message); }
    finally { setGuardando(false); }
  };

  return (
    <div className="compact-section">
      <div className="compact-header" onClick={() => setShowDetails(!showDetails)}>
        <span className="compact-title">{titulo}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`arrow ${showDetails ? "rotated" : ""}`}><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      <div className="compact-content">
        <div className="autocomplete-wrapper" ref={wrapperRef}>
          <input ref={actualRef} type="text" className="compact-input" value={value} onChange={handleInputChange} onFocus={() => { if (value) { const filtered = patentes.filter(p => p.numero_patente.toUpperCase().includes(value.toUpperCase())); setSuggestions(filtered); setIsOpen(filtered.length > 0); } }} onKeyDown={handleKeyDown} placeholder="Buscar o escribir patente..." />
          {isOpen && suggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {suggestions.map((patente, index) => (
                <div key={patente.id} className={`autocomplete-item ${index === highlightIndex ? "highlighted" : ""}`} onClick={() => handleSelect(patente)}>{patente.numero_patente}</div>
              ))}
              <div className="autocomplete-item add-new" onClick={handleAddNew}>+ Agregar nueva patente</div>
            </div>
          )}
        </div>
        {showAddForm && (
          <div className="mini-form">
            <h4>Registrar Nueva Patente</h4>
            <input placeholder="Patente (ej: ABCD12)" value={nuevaPatente.numero_patente || ""} onChange={e => setNuevaPatente({ ...nuevaPatente, numero_patente: e.target.value })} autoFocus />
            <select value={nuevaPatente.tipo_vehiculo || ""} onChange={e => setNuevaPatente({ ...nuevaPatente, tipo_vehiculo: e.target.value })}>
              <option value="">Tipo de Vehículo</option>
              {tiposVehiculo.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
            <input type="number" placeholder="Cantidad Sellos" value={nuevaPatente.cantidad_sellos || ""} onChange={e => setNuevaPatente({ ...nuevaPatente, cantidad_sellos: parseInt(e.target.value) })} />
            <div className="mini-form-actions">
              <button className="btn-save" onClick={handleAddPatente} disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</button>
              <button className="btn-cancel" onClick={() => { setShowAddForm(false); setNuevaPatente({}); }}>Cancelar</button>
            </div>
          </div>
        )}
        {showDetails && patenteSeleccionada && (
          <div className="compact-details">
            <div className="detail-row"><span className="detail-label">Tipo de Vehículo:</span><span className="detail-value">{patenteSeleccionada.tipo_vehiculo}</span></div>
            <div className="detail-row"><span className="detail-label">Cantidad Sellos:</span><span className="detail-value">{patenteSeleccionada.cantidad_sellos}</span></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatenteSection;