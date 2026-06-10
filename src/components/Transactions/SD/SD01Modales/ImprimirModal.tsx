// src/components/Transactions/SD/SD01Modales/ImprimirModal.tsx

import React, { useState, useEffect } from 'react';

interface SD01Row {
  id: number;
  codigoLocal: string;
  nombreLocal: string;
  fechaEntrega: string;
  horaEntrega: string;
  selloTrasero: string;
  cantidadPallet: number;
  totalCarga: number;
  carga?: Array<{ id: number; origenCarga: string; tipoDocumento: string; numeroDocumento: string; cantidadBultos: number; observacion: string }>;
}

interface ImprimirModalProps {
  isOpen: boolean;
  rows: SD01Row[];
  conductor: string;
  patentePrincipal: string;
  patenteAdicional?: string;
  selloLateral: string;
  selloAdicional: string;
  nombreAdministrativo: string;
  onClose: () => void;
  copias?: string[];
  conductores: any[];
  patentes: any[];
}

const formatearFecha = (fecha: string): string => {
  if (!fecha) return "";
  const d = new Date(fecha + "T00:00:00");
  if (isNaN(d.getTime())) return fecha;
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return `${dias[d.getDay()]}, ${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}`;
};

const limpiarValor = (val: string): string => {
  if (!val || val === "No aplica" || val === "no aplica" || val === "NO APLICA") return "";
  return val;
};

const ImprimirModal: React.FC<ImprimirModalProps> = ({ isOpen, rows, conductor, patentePrincipal, patenteAdicional, selloLateral, selloAdicional, onClose, copias = [], conductores, patentes }) => {
  const [logoBase64, setLogoBase64] = useState("");

  const generarHTML = (): string => {
    const localesFiltrados = rows.filter(r => r.codigoLocal);
    const patenteCompleta = [patentePrincipal, patenteAdicional].filter(Boolean).join(" / ");
    const conductorData = conductores.find(c => c.nombre_completo === conductor);
    const rutConductor = conductorData?.numero_documento || "";

    const separarCarga = (carga: any[] = []) => {
      const centros = carga.filter((c: any) => c.origenCarga?.toUpperCase().startsWith("CD"));
      const segmentos = carga.filter((c: any) => !c.origenCarga?.toUpperCase().startsWith("CD"));
      return { centros, segmentos };
    };

    let paginas = "";
    const copiasUsar = copias.length ? copias : ["Local", "Guardia", "Conductor", "Original"];

    copiasUsar.forEach(copia => {
      localesFiltrados.forEach(row => {
        const { centros, segmentos } = separarCarga(row.carga);
        const totalCentros = centros.reduce((s: number, c: any) => s + (c.cantidadBultos || 0), 0);
        const totalSegmentos = segmentos.reduce((s: number, c: any) => s + (c.cantidadBultos || 0), 0);
        const totalGeneral = totalCentros + totalSegmentos;

        paginas += `<div class="paper"><div class="local-text-header">${copia}</div>
          <div class="main-container">
            <div class="date-table-container"><table class="date-table"><tr><td>Fecha Entrega</td><td>${formatearFecha(row.fechaEntrega)}</td><td>Hora Entrega</td><td>${row.horaEntrega || "__:__"} Hrs</td></tr></table></div>
            <div class="local-table-container"><table class="local-table"><tr><td>Local</td><td>${row.codigoLocal}-${row.nombreLocal}</td></tr></table></div>
            ${centros.length > 0 ? `<div class="centros-table-container"><table class="centros-table"><tr><th>Centro de Distribucion</th><th>Tipo de Documento</th><th>Numero de Documento</th><th>Cantidad de Bultos</th><th>Observacion</th></tr>${centros.map((c: any) => `<tr><td>${c.origenCarga}</td><td class="${limpiarValor(c.tipoDocumento) ? "" : "celda-vacia"}">${limpiarValor(c.tipoDocumento)}</td><td class="${limpiarValor(c.numeroDocumento) ? "" : "celda-vacia"}">${limpiarValor(c.numeroDocumento)}</td><td>${c.cantidadBultos}</td><td>${c.observacion || ""}</td></tr>`).join("")}</table></div><div class="total-centros-container"><table class="total-centros-table"><tr><td>Total de Bultos Centros de Distribucion</td><td>${totalCentros}</td></tr></table></div>` : ""}
            ${segmentos.length > 0 ? `<div class="otros-segmentos-table-container"><table class="otros-segmentos-table"><tr><th>Segmentos Adicionales</th><th>Tipo de Documento</th><th>Numero de Documento</th><th>Cantidad Bultos</th><th>Observación</th></tr>${segmentos.map((c: any) => `<tr><td>${c.origenCarga}</td><td class="${limpiarValor(c.tipoDocumento) ? "" : "celda-vacia"}">${limpiarValor(c.tipoDocumento)}</td><td class="${limpiarValor(c.numeroDocumento) ? "" : "celda-vacia"}">${limpiarValor(c.numeroDocumento)}</td><td>${c.cantidadBultos}</td><td>${c.observacion || ""}</td></tr>`).join("")}</table></div><div class="total-otros-segmentos-container"><table class="total-otros-segmentos-table"><tr><td>Total de bultos Segmentos Adicionales:</td><td>${totalSegmentos}</td></tr></table></div>` : ""}
            <div class="total-carga-container"><table class="total-carga-table"><tr><td>Total de Bultos Despachados:</td><td>${totalGeneral}</td></tr></table></div>
            <div class="tablas-inferiores-container">
              <div class="columna-izquierda">
                <div class="firma-tienda-container"><table class="firma-tienda-table"><tr><td>Nombre y Firma Jefe de Tienda</td></tr></table></div>
                <div class="tabla-transporte-container"><table class="tabla-transporte-table"><tr><td>Conductor</td><td>${conductor}</td></tr><tr><td>Rut</td><td>${rutConductor}</td></tr><tr><td>Patente</td><td>${patenteCompleta}</td></tr></table></div>
              </div>
              <div class="columna-derecha">
                <div class="firma-conductor-container"><table class="firma-conductor-table"><tr><td>Nombre y Firma Conductor</td></tr></table></div>
                <div class="tabla-sellos-container"><table class="tabla-sellos-table"><tr><td>Sello Trasero</td><td>${row.selloTrasero}</td></tr><tr><td>Sello Lateral</td><td>${selloLateral}</td></tr><tr><td>Sello Adicional</td><td>${selloAdicional}</td></tr></table></div>
              </div>
            </div>
          </div></div>`;
      });
    });

    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>FASHIONSPARK - Despacho</title><style>${cssEstilosImpresion}</style></head><body>${paginas}</body></html>`;
  };

  const handlePrint = () => {
    const ventana = window.open("", "_blank", "width=900,height=700");
    if (ventana) {
      ventana.document.write(generarHTML());
      ventana.document.close();
      ventana.focus();
      setTimeout(() => ventana.print(), 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="imprimir-modal-overlay" onClick={onClose}>
      <div className="imprimir-modal" onClick={e => e.stopPropagation()}>
        <div className="imprimir-modal-header">
          <h2>Vista Previa de Impresión</h2>
          <div className="imprimir-modal-actions">
            <button className="imprimir-btn-imprimir" onClick={handlePrint}>Imprimir Ahora</button>
            <button className="imprimir-btn-cerrar" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="imprimir-contenido">
          <iframe srcDoc={generarHTML()} style={{ width: "100%", height: "65vh", border: "none", background: "#e5e7eb" }} title="Vista previa" />
        </div>
      </div>
    </div>
  );
};

const cssEstilosImpresion = `*{margin:0;padding:0;box-sizing:border-box}body{background:#e5e7eb;padding:20px}.paper{width:21.59cm;min-height:27.94cm;background:white;box-shadow:0 10px 25px rgba(0,0,0,0.1);padding:1cm 0.5cm 0.2cm 0.5cm;position:relative;margin:0 auto 20px;page-break-after:always}.paper:last-child{page-break-after:auto}.local-text-header{position:absolute;top:0.2cm;right:0.5cm;font-family:'Comic Sans MS',cursive;font-size:26px;color:#000;z-index:10}.main-container{width:100%;min-height:calc(27.94cm - 1.2cm);border:2px solid #000;background:#fff;padding:0.8rem;margin-top:0.15cm;display:flex;flex-direction:column}.date-table-container,.local-table-container{margin-left:0.03cm;margin-top:0.03cm;width:100%}.date-table,.local-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}.date-table td,.local-table td{border:3px double #000;padding:2px 4px;font-size:16px;font-weight:bold;text-align:center}.date-table td:nth-child(1),.local-table td:nth-child(1){width:4cm;background:rgb(217,217,217)}.centros-table-container,.otros-segmentos-table-container{margin-left:0.03cm;margin-top:0.2cm;width:100%}.centros-table,.otros-segmentos-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}.centros-table td,.centros-table th,.otros-segmentos-table td,.otros-segmentos-table th{border:2px double #000;padding:2px 6px;text-align:center;font-size:13px}.centros-table th,.otros-segmentos-table th{font-weight:bold;background:rgb(217,217,217)}.celda-vacia{background:rgb(217,217,217)}.total-centros-container,.total-otros-segmentos-container,.total-carga-container{margin-left:0.03cm;margin-top:0.1cm;width:13.5cm}.total-centros-table,.total-otros-segmentos-table,.total-carga-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}.total-centros-table td,.total-otros-segmentos-table td,.total-carga-table td{border:2px double #000;padding:2px 6px;font-size:13px;font-weight:bold;background:rgb(217,217,217);text-align:center}.total-centros-table td:nth-child(1),.total-otros-segmentos-table td:nth-child(1),.total-carga-table td:nth-child(1){width:11cm}.total-centros-table td:nth-child(2),.total-otros-segmentos-table td:nth-child(2),.total-carga-table td:nth-child(2){width:2.5cm}.tablas-inferiores-container{display:flex;justify-content:space-between;margin-top:auto;padding-top:0.2cm;width:100%}.columna-izquierda,.columna-derecha{width:8.5cm;display:flex;flex-direction:column}.firma-tienda-container,.firma-conductor-container{width:8.5cm;margin-bottom:1cm}.firma-tienda-table,.firma-conductor-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}.firma-tienda-table td,.firma-conductor-table td{border-top:2px double #000;padding:4px;font-size:12px;text-align:center}.tabla-transporte-container,.tabla-sellos-container{width:8.5cm}.tabla-transporte-table,.tabla-sellos-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}.tabla-transporte-table td,.tabla-sellos-table td{border:2px double #000;padding:2px 4px;font-size:12px;text-align:center}.tabla-transporte-table td:nth-child(1),.tabla-sellos-table td:nth-child(1){width:4cm;font-weight:bold;background:rgb(217,217,217)}@media print{html,body{width:100%;height:100%;margin:0;padding:0;background:white}.paper{box-shadow:none;margin:0;width:21.59cm;min-height:27.94cm;padding:1cm 0.5cm 0.2cm 0.5cm;page-break-after:always}.paper:last-child{page-break-after:auto}}`;

export default ImprimirModal;