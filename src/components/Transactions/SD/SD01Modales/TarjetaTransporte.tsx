// src/components/Transactions/SD/SD01Modales/TarjetaTransporte.tsx

import React, { useState } from 'react';

interface Conductor {
  id: string; nombre: string; apellido: string; nombre_completo?: string;
  numero_documento: string; telefono: string; empresa: string;
}

interface Patente {
  id: string; numero_patente: string; tipo_vehiculo: string; cantidad_sellos: number;
}

interface TarjetaTransporteProps {
  idDocumento: string;
  conductor: string;
  patentePrincipal: string;
  patenteAdicional: string;
  fechaProgramacion: string;
  administrativo: string;
  conductores: Conductor[];
  patentes: Patente[];
}

const TarjetaTransporte: React.FC<TarjetaTransporteProps> = ({
  idDocumento, conductor, patentePrincipal, patenteAdicional,
  fechaProgramacion, administrativo, conductores, patentes,
}) => {
  const [expandida, setExpandida] = useState(true);
  const conductorData = conductores.find(c => c.nombre_completo === conductor);
  const patentePData = patentes.find(p => p.numero_patente === patentePrincipal);
  const patenteSData = patentes.find(p => p.numero_patente === patenteAdicional);

  return (
    <div className="tarjeta-transporte">
      <div className="tarjeta-header" onClick={() => setExpandida(!expandida)}>
        <span className="tarjeta-id">📋 {idDocumento || "Pendiente"}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`tarjeta-arrow ${expandida ? "rotated" : ""}`}><path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      {expandida && (
        <div className="tarjeta-body">
          <div className="tarjeta-seccion">
            <div className="tarjeta-dato"><span className="tarjeta-label">Administrativo</span><span className="tarjeta-value">{administrativo || "-"}</span></div>
          </div>
          <div className="tarjeta-seccion">
            <div className="tarjeta-dato"><span className="tarjeta-label">Conductor</span><span className="tarjeta-value">{conductor || "-"}</span></div>
            <div className="tarjeta-dato"><span className="tarjeta-label">Rut</span><span className="tarjeta-value">{conductorData?.numero_documento || "-"}</span></div>
            <div className="tarjeta-dato"><span className="tarjeta-label">Empresa</span><span className="tarjeta-value">{conductorData?.empresa || "-"}</span></div>
            <div className="tarjeta-dato"><span className="tarjeta-label">Teléfono</span><span className="tarjeta-value">{conductorData?.telefono || "-"}</span></div>
          </div>
          <div className="tarjeta-seccion">
            <div className="tarjeta-dato"><span className="tarjeta-label">Patente Principal</span><span className="tarjeta-value">{patentePrincipal || "-"}</span></div>
            <div className="tarjeta-dato"><span className="tarjeta-label">Tipo Vehículo</span><span className="tarjeta-value">{patentePData?.tipo_vehiculo || "-"}</span></div>
            <div className="tarjeta-dato"><span className="tarjeta-label">Cant. Sellos</span><span className="tarjeta-value">{patentePData?.cantidad_sellos || "-"}</span></div>
          </div>
          {patenteAdicional && (
            <div className="tarjeta-seccion">
              <div className="tarjeta-dato"><span className="tarjeta-label">Patente Adicional</span><span className="tarjeta-value">{patenteAdicional}</span></div>
              <div className="tarjeta-dato"><span className="tarjeta-label">Tipo Vehículo</span><span className="tarjeta-value">{patenteSData?.tipo_vehiculo || "-"}</span></div>
              <div className="tarjeta-dato"><span className="tarjeta-label">Cant. Sellos</span><span className="tarjeta-value">{patenteSData?.cantidad_sellos || "-"}</span></div>
            </div>
          )}
          <div className="tarjeta-seccion">
            <div className="tarjeta-dato"><span className="tarjeta-label">Fecha Programación</span><span className="tarjeta-value">{fechaProgramacion ? new Date(fechaProgramacion + "T00:00:00").toLocaleDateString("es-CL") : "-"}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TarjetaTransporte;