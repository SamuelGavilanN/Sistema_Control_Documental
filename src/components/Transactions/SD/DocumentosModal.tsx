import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { conductores } from "../../../data/conductores";
import { patentes } from "../../../data/patentes";
import { locales } from "../../../data/locales";
import "./DocumentosModal.css";

interface DocumentosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAbrirDocumento: (idDocumento: string) => void;
}

const DocumentosModal: React.FC<DocumentosModalProps> = ({
  isOpen,
  onClose,
  onAbrirDocumento,
}) => {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    if (isOpen) cargarDocumentos();
  }, [isOpen]);

  const cargarDocumentos = async () => {
    try {
      setCargando(true);

      const { data: cabeceras, error } = await supabase
        .from("sd01_datos_unicos")
        .select("*")
        .order("fecha_hora_creacion", { ascending: false });

      if (error) throw error;

      const enriquecidos = await Promise.all(
        (cabeceras || []).map(async (doc: any) => {
          const conductor = doc.conductor_id
            ? conductores.find((c: any) => c.id === doc.conductor_id)
            : null;

          const patenteP = doc.patente_principal_id
            ? patentes.find((p: any) => p.id === doc.patente_principal_id)
            : null;

          let primerLocal = "-";
          try {
            const { data: localesDoc } = await supabase
              .from("sd01_datos_locales")
              .select("codigo_local")
              .eq("id_documento", doc.id_documento)
              .order("fecha_hora_creacion", { ascending: true })
              .limit(1);

            if (localesDoc && localesDoc.length > 0) {
              const codigo = localesDoc[0].codigo_local;
              const localInfo = locales.find(
                (l: any) => l.codigo_local === codigo
              );
              primerLocal = localInfo
                ? `${codigo} - ${localInfo.nombre_local}`
                : codigo || "-";
            }
          } catch (e) {
            primerLocal = "-";
          }

          let nombreCreador = "-";
          try {
            if (doc.creado_por) {
              const { data: userData } = await supabase
                .from("usuarios")
                .select("nombre, apellido")
                .eq("id", doc.creado_por)
                .single();
              if (userData) {
                nombreCreador = `${userData.nombre || ""} ${
                  userData.apellido || ""
                }`.trim();
              }
            }
          } catch (e) {
            nombreCreador = "-";
          }

          return {
            ...doc,
            nombre_conductor: conductor?.nombre_completo || "-",
            patente_principal: patenteP?.numero_patente || "-",
            primer_local: primerLocal,
            nombre_creador: nombreCreador,
          };
        })
      );

      setDocumentos(enriquecidos);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setCargando(false);
    }
  };

  const documentosFiltrados =
    filtro === "todos"
      ? documentos
      : documentos.filter((d) => d.estado === filtro);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "borrador":
        return { color: "#b45309", bg: "#fef3c7", text: "Borrador" };
      case "finalizado":
        return { color: "#15803d", bg: "#dcfce7", text: "Finalizado" };
      case "anulado":
        return { color: "#dc2626", bg: "#fef2f2", text: "Anulado" };
      default:
        return { color: "#64748b", bg: "#f1f5f9", text: estado };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="documentos-modal-overlay" onClick={onClose}>
      <div className="documentos-modal" onClick={(e) => e.stopPropagation()}>
        <div className="documentos-modal-header">
          <h2>Archivos SD01</h2>
          <button className="documentos-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="documentos-filtros">
          {["todos", "borrador", "finalizado", "anulado"].map((f) => (
            <button
              key={f}
              className={`filtro-btn ${filtro === f ? "active" : ""}`}
              onClick={() => setFiltro(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="documentos-tabla-container">
          {cargando ? (
            <div className="documentos-cargando">Cargando archivos...</div>
          ) : documentosFiltrados.length === 0 ? (
            <div className="documentos-vacio">No hay archivos</div>
          ) : (
            <table className="documentos-tabla">
              <thead>
                <tr>
                  <th>ID Documento</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Conductor</th>
                  <th>Patente</th>
                  <th>Primer Local</th>
                  <th>Creado Por</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentosFiltrados.map((doc) => {
                  const badge = getEstadoBadge(doc.estado);
                  return (
                    <tr key={doc.id_documento}>
                      <td className="doc-id">{doc.id_documento}</td>
                      <td>
                        {new Date(doc.fecha_hora_creacion).toLocaleDateString(
                          "es-CL"
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {badge.text}
                        </span>
                      </td>
                      <td>{doc.nombre_conductor}</td>
                      <td>{doc.patente_principal}</td>
                      <td>{doc.primer_local}</td>
                      <td>{doc.nombre_creador}</td>
                      <td>
                        <button
                          className="doc-action-btn"
                          onClick={() => onAbrirDocumento(doc.id_documento)}
                        >
                          📝 Abrir
                        </button>
                      </td>
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
