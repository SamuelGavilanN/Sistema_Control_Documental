// src/components/Transactions/SD/TarjetaTransporte.tsx

import React, { useState } from "react";
import "./TarjetaTransporte.css";

interface TarjetaTransporteProps {
  idDocumento: string;
  conductor: string;
  patentePrincipal: string;
  patenteAdicional: string;
  fechaProgramacion: string;
  administrativo: string;
  estado?: string;
}

const TarjetaTransporte: React.FC<TarjetaTransporteProps> = ({
  idDocumento,
  conductor,
  patentePrincipal,
  patenteAdicional,
  fechaProgramacion,
  administrativo,
  estado = "borrador",
}) => {
  const [expandida, setExpandida] = useState(true);

  return (
    <div className="tarjeta-transporte">
      <div className="tarjeta-header" onClick={() => setExpandida(!expandida)}>
        <div className="tarjeta-header-left">
          <span className="tarjeta-id">📋 {idDocumento || "Pendiente"}</span>
          <span className="tarjeta-estado">
            <span
              style={{
                background:
                  estado === "borrador"
                    ? "#fef3c7"
                    : estado === "en_proceso"
                    ? "#dbeafe"
                    : estado === "finalizado"
                    ? "#dcfce7"
                    : "#fef2f2",
                color:
                  estado === "borrador"
                    ? "#b45309"
                    : estado === "en_proceso"
                    ? "#1d4ed8"
                    : estado === "finalizado"
                    ? "#15803d"
                    : "#dc2626",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              {estado === "borrador"
                ? "Borrador"
                : estado === "en_proceso"
                ? "En Proceso"
                : estado === "finalizado"
                ? "Finalizado"
                : "Anulado"}
            </span>
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={`tarjeta-arrow ${expandida ? "rotated" : ""}`}
        >
          <path
            d="M3 5L7 9L11 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {expandida && (
        <div className="tarjeta-body">
          <div className="tarjeta-seccion">
            <div className="tarjeta-dato">
              <span className="tarjeta-label">Administrativo</span>
              <span className="tarjeta-value">{administrativo || "-"}</span>
            </div>
          </div>

          <div className="tarjeta-seccion">
            <div className="tarjeta-dato">
              <span className="tarjeta-label">Conductor</span>
              <span className="tarjeta-value">{conductor || "-"}</span>
            </div>
          </div>

          <div className="tarjeta-seccion">
            <div className="tarjeta-dato">
              <span className="tarjeta-label">Patente Principal</span>
              <span className="tarjeta-value">{patentePrincipal || "-"}</span>
            </div>
            {patenteAdicional && (
              <div className="tarjeta-dato">
                <span className="tarjeta-label">Patente Adicional</span>
                <span className="tarjeta-value">{patenteAdicional}</span>
              </div>
            )}
          </div>

          <div className="tarjeta-seccion">
            <div className="tarjeta-dato">
              <span className="tarjeta-label">Fecha Programación</span>
              <span className="tarjeta-value">
                {fechaProgramacion
                  ? new Date(
                      fechaProgramacion + "T00:00:00"
                    ).toLocaleDateString("es-CL")
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TarjetaTransporte;
