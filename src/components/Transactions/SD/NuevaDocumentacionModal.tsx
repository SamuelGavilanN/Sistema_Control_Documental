// src/components/Transactions/SD/NuevaDocumentacionModal.tsx

import React, { useState, useEffect } from "react";
import ConductorSection from "./ConductorSection";
import PatenteSection from "./PatenteSection";
import "./NuevaDocumentacionModal.css";

interface NuevaDocumentacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCrear: (datos: {
    conductor: string;
    conductorId: string;
    patentePrincipal: string;
    patentePrincipalId: string;
    patenteAdicional: string;
    patenteAdicionalId: string;
    fechaProgramacion: string;
  }) => void;
  valoresIniciales?: {
    conductor?: string;
    conductorId?: string;
    patentePrincipal?: string;
    patentePrincipalId?: string;
    patenteAdicional?: string;
    patenteAdicionalId?: string;
    fechaProgramacion?: string;
  };
  modoEdicion?: boolean;
}

const NuevaDocumentacionModal: React.FC<NuevaDocumentacionModalProps> = ({
  isOpen,
  onClose,
  onCrear,
  valoresIniciales = {},
  modoEdicion = false,
}) => {
  const [conductor, setConductor] = useState(valoresIniciales.conductor || "");
  const [conductorId, setConductorId] = useState(valoresIniciales.conductorId || "");
  const [patentePrincipal, setPatentePrincipal] = useState(valoresIniciales.patentePrincipal || "");
  const [patentePrincipalId, setPatentePrincipalId] = useState(valoresIniciales.patentePrincipalId || "");
  const [patenteAdicional, setPatenteAdicional] = useState(valoresIniciales.patenteAdicional || "");
  const [patenteAdicionalId, setPatenteAdicionalId] = useState(valoresIniciales.patenteAdicionalId || "");
  const [fechaProgramacion, setFechaProgramacion] = useState(valoresIniciales.fechaProgramacion || "");

  useEffect(() => {
    if (isOpen) {
      setConductor(valoresIniciales.conductor || "");
      setConductorId(valoresIniciales.conductorId || "");
      setPatentePrincipal(valoresIniciales.patentePrincipal || "");
      setPatentePrincipalId(valoresIniciales.patentePrincipalId || "");
      setPatenteAdicional(valoresIniciales.patenteAdicional || "");
      setPatenteAdicionalId(valoresIniciales.patenteAdicionalId || "");
      setFechaProgramacion(valoresIniciales.fechaProgramacion || "");
    }
  }, [isOpen, valoresIniciales]);

  const handleCrear = () => {
    if (!conductor || !conductorId) {
      alert("Debe seleccionar un conductor válido.");
      return;
    }
    if (!patentePrincipal || !patentePrincipalId) {
      alert("Debe seleccionar una patente principal.");
      return;
    }
    onCrear({
      conductor,
      conductorId,
      patentePrincipal,
      patentePrincipalId,
      patenteAdicional,
      patenteAdicionalId,
      fechaProgramacion,
    });
  };

  const esEdicion = modoEdicion || (Object.keys(valoresIniciales).length > 0 && valoresIniciales.conductor);

  if (!isOpen) return null;

  return (
    <div className="nueva-doc-overlay" onClick={onClose}>
      <div className="nueva-doc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nueva-doc-header">
          <h2>{esEdicion ? "Editar Transporte" : "Nueva Documentación"}</h2>
          <button className="nueva-doc-close" onClick={onClose}>×</button>
        </div>

        <div className="nueva-doc-body">
          <ConductorSection
            value={conductor}
            onChange={setConductor}
            onConductorIdChange={setConductorId}
          />
          <PatenteSection
            titulo="Patente Principal"
            value={patentePrincipal}
            onChange={setPatentePrincipal}
            onPatenteIdChange={setPatentePrincipalId}
          />
          <PatenteSection
            titulo="Patente Adicional"
            value={patenteAdicional}
            onChange={setPatenteAdicional}
            onPatenteIdChange={setPatenteAdicionalId}
          />

          <div className="static-field-section">
            <div className="static-field-header">
              <span className="static-field-title">Fecha de Programación</span>
            </div>
            <div className="static-field-content">
              <input
                type="date"
                className="static-field-input"
                value={fechaProgramacion}
                onChange={(e) => setFechaProgramacion(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="nueva-doc-footer">
          <button className="nueva-doc-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="nueva-doc-btn-create" onClick={handleCrear}>
            {esEdicion ? "Actualizar" : "Crear Documento"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NuevaDocumentacionModal;
