// src/components/Transactions/SD/SD01Modales/DCModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import AutocompleteInput from './AutocompleteInput';

interface DCDocumento {
  id: number;
  origenCarga: string;
  tipoDocumento: string;
  numeroDocumento: string;
  cantidadBultos: number;
  observacion: string;
}

interface LocalInfo {
  codigo: string;
  nombre: string;
}

interface DCModalProps {
  isOpen: boolean;
  onClose: () => void;
  localActual: LocalInfo;
  todosLosLocales: LocalInfo[];
  onSave: (documentos: DCDocumento[], localCodigo: string) => void;
  cargaInicial?: Record<string, DCDocumento[]>;
}

const origenesCarga = ["CD01 Fashions-Park", "CD16 Bodegas San Francisco", "CD12 Bodegas Lampa", "CD30 Bodegas Renca", "C144 Bodega Holly Concept", "SG01 Internet", "SG02 Insumos", "SG03 Traspasos", "SG04 Valija", "SG05 Bultos Regularizar Stock", "SG06 Bultos Quedados en Camion"];

const tiposDocumentoPorOrigen: Record<string, string[]> = {
  "CD01 Fashions-Park": ["Sap", "Vtradex"],
  "CD16 Bodegas San Francisco": ["Sap", "Vtradex"],
  "CD12 Bodegas Lampa": ["Sap", "Vtradex"],
  "CD30 Bodegas Renca": ["Sap", "Vtradex"],
  "C144 Bodega Holly Concept": ["Sap", "Vtradex"],
  "SG05 Bultos Regularizar Stock": ["Sap", "Vtradex"],
  "SG06 Bultos Quedados en Camion": ["Sap", "Vtradex"],
};

const DCModal: React.FC<DCModalProps> = ({ isOpen, onClose, localActual, todosLosLocales, onSave, cargaInicial = {} }) => {
  const [documentos, setDocumentos] = useState<DCDocumento[]>([]);
  const [localSeleccionado, setLocalSeleccionado] = useState<LocalInfo>(localActual);
  const [cargaPorLocal, setCargaPorLocal] = useState<Record<string, DCDocumento[]>>(cargaInicial);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nuevoDocumento, setNuevoDocumento] = useState<Partial<DCDocumento>>({ origenCarga: "", tipoDocumento: "", numeroDocumento: "", cantidadBultos: 0, observacion: "" });
  const [tiposDocumentoDisponibles, setTiposDocumentoDisponibles] = useState<string[]>([]);
  const origenRef = useRef<HTMLInputElement>(null);
  const tipoDocRef = useRef<HTMLInputElement>(null);
  const numeroDocRef = useRef<HTMLInputElement>(null);
  const cantidadRef = useRef<HTMLInputElement>(null);
  const observacionRef = useRef<HTMLInputElement>(null);
  const agregarBtnRef = useRef<HTMLButtonElement>(null);
  const tipoNoAplica = nuevoDocumento.origenCarga ? (tiposDocumentoPorOrigen[nuevoDocumento.origenCarga]?.length === 0) : false;

  useEffect(() => {
    if (isOpen) {
      setLocalSeleccionado(localActual);
      setCargaPorLocal(cargaInicial);
      setDocumentos(cargaInicial[localActual.codigo] || []);
      setNuevoDocumento({ origenCarga: "", tipoDocumento: "", numeroDocumento: "", cantidadBultos: 0, observacion: "" });
      setTiposDocumentoDisponibles([]);
      setEditandoId(null);
      setTimeout(() => origenRef.current?.focus(), 100);
    }
  }, [isOpen, localActual, cargaInicial]);

  const handleOrigenChange = (origen: string) => {
    const tipos = tiposDocumentoPorOrigen[origen] || [];
    setNuevoDocumento({ ...nuevoDocumento, origenCarga: origen, tipoDocumento: tipos.length === 0 ? "No aplica" : "", numeroDocumento: tipos.length === 0 ? "" : nuevoDocumento.numeroDocumento });
    setTiposDocumentoDisponibles(tipos);
  };

  const handleEditar = (doc: DCDocumento) => {
    setNuevoDocumento({ origenCarga: doc.origenCarga, tipoDocumento: doc.tipoDocumento, numeroDocumento: doc.numeroDocumento, cantidadBultos: doc.cantidadBultos, observacion: doc.observacion });
    setTiposDocumentoDisponibles(tiposDocumentoPorOrigen[doc.origenCarga] || []);
    setEditandoId(doc.id);
    setTimeout(() => origenRef.current?.focus(), 50);
  };

  const handleCancelarEdicion = () => {
    setNuevoDocumento({ origenCarga: "", tipoDocumento: "", numeroDocumento: "", cantidadBultos: 0, observacion: "" });
    setTiposDocumentoDisponibles([]);
    setEditandoId(null);
    setTimeout(() => origenRef.current?.focus(), 50);
  };

  const agregarOActualizarDocumento = () => {
    if (!nuevoDocumento.origenCarga || !nuevoDocumento.cantidadBultos) return;
    if (editandoId !== null) {
      const nuevosDocs = documentos.map(doc => doc.id === editandoId ? { ...doc, ...nuevoDocumento, id: editandoId } : doc);
      setDocumentos(nuevosDocs);
      setCargaPorLocal({ ...cargaPorLocal, [localSeleccionado.codigo]: nuevosDocs });
      setEditandoId(null);
    } else {
      const nuevoId = Date.now();
      const documento: DCDocumento = { id: nuevoId, origenCarga: nuevoDocumento.origenCarga || "", tipoDocumento: nuevoDocumento.tipoDocumento || "", numeroDocumento: nuevoDocumento.numeroDocumento || "", cantidadBultos: nuevoDocumento.cantidadBultos || 0, observacion: nuevoDocumento.observacion || "" };
      const nuevosDocs = [...documentos, documento];
      setDocumentos(nuevosDocs);
      setCargaPorLocal({ ...cargaPorLocal, [localSeleccionado.codigo]: nuevosDocs });
    }
    setNuevoDocumento({ origenCarga: "", tipoDocumento: "", numeroDocumento: "", cantidadBultos: 0, observacion: "" });
    setTiposDocumentoDisponibles([]);
    setTimeout(() => origenRef.current?.focus(), 50);
  };

  const eliminarDocumento = (id: number) => {
    const nuevosDocs = documentos.filter(d => d.id !== id);
    setDocumentos(nuevosDocs);
    setCargaPorLocal({ ...cargaPorLocal, [localSeleccionado.codigo]: nuevosDocs });
    if (editandoId === id) { setEditandoId(null); setNuevoDocumento({ origenCarga: "", tipoDocumento: "", numeroDocumento: "", cantidadBultos: 0, observacion: "" }); }
  };

  const totalBultos = documentos.reduce((sum, doc) => sum + doc.cantidadBultos, 0);

  const handleGuardar = () => {
    Object.entries({ ...cargaPorLocal, [localSeleccionado.codigo]: documentos }).forEach(([codigo, docs]) => {
      if (docs && docs.length > 0) onSave(docs, codigo);
    });
    onClose();
  };

  const cambiarLocal = (local: LocalInfo) => {
    const nuevaCarga = { ...cargaPorLocal, [localSeleccionado.codigo]: documentos };
    setCargaPorLocal(nuevaCarga);
    setLocalSeleccionado(local);
    setDocumentos(nuevaCarga[local.codigo] || []);
    setNuevoDocumento({ origenCarga: "", tipoDocumento: "", numeroDocumento: "", cantidadBultos: 0, observacion: "" });
    setEditandoId(null);
    setTiposDocumentoDisponibles([]);
    setTimeout(() => origenRef.current?.focus(), 50);
  };

  if (!isOpen) return null;

  return (
    <div className="dc-modal-overlay" onClick={onClose}>
      <div className="dc-modal-container" onClick={e => e.stopPropagation()}>
        <div className="dc-modal-header"><h2>Navegador Locales Registrados</h2><button className="dc-modal-close" onClick={onClose}>×</button></div>
        <div className="dc-local-nav">
          {todosLosLocales.filter(l => l.codigo).map(local => (
            <button key={local.codigo} className={`local-nav-btn ${localSeleccionado.codigo === local.codigo ? "active" : ""}`} onClick={() => cambiarLocal(local)}>{local.codigo} - {local.nombre}</button>
          ))}
        </div>
        <div className="dc-current-local"><span className="local-badge">{localSeleccionado.codigo} - {localSeleccionado.nombre}</span></div>
        <div className="dc-form-section">
          <h3>{editandoId !== null ? "Editar Documento" : "Agregar Documento"}</h3>
          <div className="dc-form-row">
            <div className="dc-form-field"><label>Selecciona Origen de carga</label><AutocompleteInput value={nuevoDocumento.origenCarga || ""} onChange={handleOrigenChange} suggestions={origenesCarga} placeholder="Buscar o escribir..." onEnter={() => tipoDocRef.current?.focus()} inputRef={origenRef} /></div>
            <div className="dc-form-field"><label>Tipo de documento</label><AutocompleteInput value={nuevoDocumento.tipoDocumento || ""} onChange={(val) => setNuevoDocumento({ ...nuevoDocumento, tipoDocumento: val })} suggestions={tiposDocumentoDisponibles} placeholder={tipoNoAplica ? "No aplica" : "Buscar o escribir..."} disabled={tipoNoAplica} onEnter={() => { if (tipoNoAplica) cantidadRef.current?.focus(); else numeroDocRef.current?.focus(); }} inputRef={tipoDocRef} /></div>
            <div className="dc-form-field"><label>Número documento</label><input ref={numeroDocRef} type="text" className={`dc-input ${tipoNoAplica ? "disabled" : ""}`} value={nuevoDocumento.numeroDocumento || ""} onChange={e => setNuevoDocumento({ ...nuevoDocumento, numeroDocumento: e.target.value })} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); cantidadRef.current?.focus(); } }} placeholder={tipoNoAplica ? "No aplica" : "Ej: 22687"} disabled={tipoNoAplica} /></div>
            <div className="dc-form-field"><label>Cantidad Bultos</label><input ref={cantidadRef} type="number" className="dc-input" value={nuevoDocumento.cantidadBultos || ""} onChange={e => setNuevoDocumento({ ...nuevoDocumento, cantidadBultos: parseInt(e.target.value) || 0 })} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); observacionRef.current?.focus(); } }} placeholder="0" min="0" /></div>
            <div className="dc-form-field dc-form-field-obs"><label>Observación</label><input ref={observacionRef} type="text" className="dc-input" value={nuevoDocumento.observacion || ""} onChange={e => setNuevoDocumento({ ...nuevoDocumento, observacion: e.target.value })} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); agregarBtnRef.current?.focus(); } }} placeholder="Observación opcional" /></div>
            <div className="dc-form-actions">
              <button ref={agregarBtnRef} className="dc-btn-add" onClick={agregarOActualizarDocumento}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>{editandoId !== null ? "Actualizar" : "Agregar"}</button>
              {editandoId !== null && <button className="dc-btn-cancel-edit" onClick={handleCancelarEdicion}>Cancelar</button>}
            </div>
          </div>
        </div>
        <div className="dc-table-container">
          <table className="dc-table">
            <thead><tr><th style={{ width: "40px" }}>ID</th><th>Centros de Distribución</th><th>Tipo Documento</th><th>Número Documento</th><th style={{ width: "100px" }}>Cantidad Bultos</th><th>Observación</th><th style={{ width: "80px" }}></th></tr></thead>
            <tbody>
              {documentos.length === 0 ? (
                <tr><td colSpan={7} className="dc-empty-table">No hay documentos agregados.</td></tr>
              ) : (
                documentos.map((doc, index) => (
                  <tr key={doc.id} className={editandoId === doc.id ? "fila-editando" : ""}>
                    <td>{index + 1}</td><td>{doc.origenCarga}</td><td>{doc.tipoDocumento || "-"}</td><td>{doc.numeroDocumento || "-"}</td><td>{doc.cantidadBultos}</td><td>{doc.observacion || "-"}</td>
                    <td>
                      <div className="dc-acciones">
                        <button className="dc-row-edit" onClick={() => handleEditar(doc)} title="Editar"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 1.5L12.5 3.5L4.5 11.5L1.5 12.5L2.5 9.5L10.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 3L11 5" stroke="currentColor" strokeWidth="1.5"/></svg></button>
                        <button className="dc-row-delete" onClick={() => eliminarDocumento(doc.id)} title="Eliminar">×</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="dc-modal-footer">
          <div className="dc-total"><span>Total General Bultos Despachados:</span><strong>{totalBultos}</strong></div>
          <div className="dc-footer-actions"><button className="dc-btn-cancel" onClick={onClose}>Cancelar</button><button className="dc-btn-save" onClick={handleGuardar}>Guardar y Cerrar</button></div>
        </div>
      </div>
    </div>
  );
};

export default DCModal;