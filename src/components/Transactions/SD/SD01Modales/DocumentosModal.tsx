// src/components/Transactions/SD/SD01Modales/DocumentosModal.tsx

import React, { useState, useEffect } from 'react';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS = { 'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G' };

interface DocumentosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAbrirDocumento: (idDocumento: string) => void;
}

const DocumentosModal: React.FC<DocumentosModalProps> = ({ isOpen, onClose, onAbrirDocumento }) => {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => { if (isOpen) cargarDocumentos(); }, [isOpen]);

  const cargarDocumentos = async () => {
    try {
      setCargando(true);
      const resp = await fetch(
        `${API_URL}/sd01_documentos?select=*,sd01_conductores(nombre,apellido),sd01_patentes!patente_principal_id(numero_patente),sd01_documento_locales(codigo_local,nombre_local)&order=creado_en.desc`,
        { headers: HEADERS }
      );
      const data = await resp.json();
      const enriquecidos = (data || []).map((doc: any) => ({
        ...doc,
        nombre_conductor: doc.sd01_conductores ? `${doc.sd01_conductores.nombre} ${doc.sd01_conductores.apellido}` : '-',
        patente_principal: doc.sd01_patentes?.numero_patente || '-',
        primer_local: doc.sd01_documento_locales?.[0] ? `${doc.sd01_documento_locales[0].codigo_local} - ${doc.sd01_documento_locales[0].nombre_local}` : '-',
      }));
      setDocumentos(enriquecidos);
    } catch (error) { console.error("Error:", error); }
    finally { setCargando(false); }
  };

  const documentosFiltrados = filtro === "todos" ? documentos : documentos.filter(d => d.estado === filtro);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "borrador": return { color: "#b45309", bg: "#fef3c7", text: "Borrador" };
      case "finalizado": return { color: "#15803d", bg: "#dcfce7", text: "Finalizado" };
      case "anulado": return { color: "#dc2626", bg: "#fef2f2", text: "Anulado" };
      default: return { color: "#64748b", bg: "#f1f5f9", text: estado };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="documentos-modal-overlay" onClick={onClose}>
      <div className="documentos-modal" onClick={e => e.stopPropagation()}>
        <div className="documentos-modal-header"><h2>Archivos SD01</h2><button className="documentos-modal-close" onClick={onClose}>×</button></div>
        <div className="documentos-filtros">
          {["todos", "borrador", "finalizado", "anulado"].map(f => (
            <button key={f} className={`filtro-btn ${filtro === f ? "active" : ""}`} onClick={() => setFiltro(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <div className="documentos-tabla-container">
          {cargando ? (
            <div className="documentos-cargando">Cargando archivos...</div>
          ) : documentosFiltrados.length === 0 ? (
            <div className="documentos-vacio">No hay archivos</div>
          ) : (
            <table className="documentos-tabla">
              <thead><tr><th>ID Documento</th><th>Fecha</th><th>Estado</th><th>Conductor</th><th>Patente</th><th>Primer Local</th><th>Acciones</th></tr></thead>
              <tbody>
                {documentosFiltrados.map(doc => {
                  const badge = getEstadoBadge(doc.estado);
                  return (
                    <tr key={doc.id_documento}>
                      <td className="doc-id">{doc.id_documento}</td>
                      <td>{new Date(doc.creado_en).toLocaleDateString("es-CL")}</td>
                      <td><span style={{ background: badge.bg, color: badge.color, padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>{badge.text}</span></td>
                      <td>{doc.nombre_conductor}</td>
                      <td>{doc.patente_principal}</td>
                      <td>{doc.primer_local}</td>
                      <td><button className="doc-action-btn" onClick={() => onAbrirDocumento(doc.id_documento)}>📝 Abrir</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentosModal;