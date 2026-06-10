// src/components/Transactions/SD/SD01Modales/NuevaDocumentacionModal.tsx

import React, { useState, useEffect } from 'react';
import ConductorSection from './ConductorSection';
import PatenteSection from './PatenteSection';

interface Conductor {
  id: string; nombre: string; apellido: string; nombre_completo?: string;
  numero_documento: string; telefono: string; empresa: string;
}

interface Patente {
  id: string; numero_patente: string; tipo_vehiculo: string; cantidad_sellos: number;
}

interface NuevaDocumentacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCrear: (datos: { conductor: string; patentePrincipal: string; patenteAdicional: string; fechaProgramacion: string }) => void;
  valoresIniciales?: { conductor?: string; patentePrincipal?: string; patenteAdicional?: string; fechaProgramacion?: string };
  conductores: Conductor[];
  setConductores: (c: Conductor[]) => void;
  patentes: Patente[];
  setPatentes: (p: Patente[]) => void;
}

const NuevaDocumentacionModal: React.FC<NuevaDocumentacionModalProps> = ({
  isOpen, onClose, onCrear, valoresIniciales = {},
  conductores, setConductores, patentes, setPatentes,
}) => {
  const [conductor, setConductor] = useState(valoresIniciales.conductor || "");
  const [patentePrincipal, setPatentePrincipal] = useState(valoresIniciales.patentePrincipal || "");
  const [patenteAdicional, setPatenteAdicional] = useState(valoresIniciales.patenteAdicional || "");
  const [fechaProgramacion, setFechaProgramacion] = useState(valoresIniciales.fechaProgramacion || "");

  useEffect(() => {
    if (isOpen) {
      setConductor(valoresIniciales.conductor || "");
      setPatentePrincipal(valoresIniciales.patentePrincipal || "");
      setPatenteAdicional(valoresIniciales.patenteAdicional || "");
      setFechaProgramacion(valoresIniciales.fechaProgramacion || "");
    }
  }, [isOpen, valoresIniciales]);

  const handleCrear = () => {
    if (!conductor) { alert("Debe seleccionar un conductor"); return; }
    onCrear({ conductor, patentePrincipal, patenteAdicional, fechaProgramacion });
  };

  const esEdicion = Object.keys(valoresIniciales).length > 0 && !!valoresIniciales.conductor;

  if (!isOpen) return null;

  return (
    <div className="nueva-doc-overlay" onClick={onClose}>
      <div className="nueva-doc-modal" onClick={e => e.stopPropagation()}>
        <div className="nueva-doc-header">
          <h2>{esEdicion ? "Editar Transporte" : "Nueva Documentación"}</h2>
          <button className="nueva-doc-close" onClick={onClose}>×</button>
        </div>
        <div className="nueva-doc-body">
          <ConductorSection value={conductor} onChange={setConductor} conductores={conductores} setConductores={setConductores} />
          <PatenteSection titulo="Patente Principal" value={patentePrincipal} onChange={setPatentePrincipal} patentes={patentes} setPatentes={setPatentes} />
          <PatenteSection titulo="Patente Adicional" value={patenteAdicional} onChange={setPatenteAdicional} patentes={patentes} setPatentes={setPatentes} />
          <div className="static-field-section">
            <div className="static-field-header"><span className="static-field-title">Fecha de Programación</span></div>
            <div className="static-field-content">
              <input type="date" className="static-field-input" value={fechaProgramacion} onChange={e => setFechaProgramacion(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="nueva-doc-footer">
          <button className="nueva-doc-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="nueva-doc-btn-create" onClick={handleCrear}>{esEdicion ? "Actualizar" : "Crear Documento"}</button>
        </div>
      </div>
    </div>
  );
};

export default NuevaDocumentacionModal;