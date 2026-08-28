// src/components/Transactions/SD/ImprimirModal.tsx

import React, { useRef, useEffect, useState } from "react";
import { conductores } from "../../../data/conductores";
import logoPath from "../../../assets/fashions-park-logo2.png";
import "./ImprimirModal.css";

interface LocalImprimir {
  codigoLocal: string;
  nombreLocal: string;
  fechaEntrega: string;
  horaEntrega: string;
  selloTrasero: string;
  carga: Array<{
    origenCarga: string;
    tipoDocumento: string;
    numeroDocumento: string;
    cantidadBultos: number;
    observacion: string;
  }>;
}

interface ImprimirModalProps {
  isOpen: boolean;
  locales: LocalImprimir[];
  conductor: string;
  rutConductor?: string;
  patentePrincipal: string;
  patenteAdicional?: string;
  selloLateral: string;
  selloAdicional: string;
  nombreAdministrativo: string;
  onClose: () => void;
  copias?: string[];
}

const formatearFecha = (fecha: string): string => {
  if (!fecha) return "";
  const d = new Date(fecha + "T00:00:00");
  if (isNaN(d.getTime())) return fecha;
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return `${dias[d.getDay()]}, ${d.getDate().toString().padStart(2, "0")}.${(
    d.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}.${d.getFullYear()}`;
};

const limpiarValor = (val: string): string => {
  if (!val || val === "No aplica" || val === "no aplica" || val === "NO APLICA")
    return "";
  return val;
};

const esCentroDistribucion = (origen: string): boolean => {
  const o = origen.toUpperCase().trim();
  if (o.startsWith("CD") || o.startsWith("OUT") || o.startsWith("AGV")) return true;
  // Reconocer orígenes tipo C144, C12, etc.
  if (/^C\d+/.test(o)) return true;
  return false;
};

const generarHTML = (
  locales: LocalImprimir[],
  conductor: string,
  rutConductor: string,
  patentePrincipal: string,
  patenteAdicional: string | undefined,
  selloLateral: string,
  selloAdicional: string,
  logoBase64: string,
  copias: string[]
): string => {
  const patenteCompleta = [patentePrincipal, patenteAdicional]
    .filter(Boolean)
    .join(" / ");

  const separarCarga = (carga: any[] = []) => {
    const centros = carga.filter((c: any) => esCentroDistribucion(c.origenCarga));
    const segmentos = carga.filter((c: any) => !esCentroDistribucion(c.origenCarga));
    return { centros, segmentos };
  };

  const copiasUsar =
    copias.length > 0 ? copias : ["Local", "Guardia", "Conductor", "Original"];
  let paginas = "";

  copiasUsar.forEach((copia) => {
    locales.forEach((row) => {
      const { centros, segmentos } = separarCarga(row.carga);
      const totalCentros = centros.reduce(
        (s: number, c: any) => s + (c.cantidadBultos || 0),
        0
      );
      const totalSegmentos = segmentos.reduce(
        (s: number, c: any) => s + (c.cantidadBultos || 0),
        0
      );
      const totalGeneral = totalCentros + totalSegmentos;
      const mostrarCentros = centros.length > 0;
      const mostrarSegmentos = segmentos.length > 0;

      let centrosHTML = "";
      if (mostrarCentros) {
        centrosHTML = `
    <div class="centros-table-container">
     <table class="centros-table">
      <tr><th>Centro de Distribución</th><th>Tipo de Documento</th><th>Número de Documento</th><th>Cantidad de Bultos</th><th>Observación</th></tr>
      ${centros
        .map((c) => {
          const tipoDoc = limpiarValor(c.tipoDocumento);
          const numDoc = limpiarValor(c.numeroDocumento);
          return `<tr><td>${c.origenCarga}</td><td class="${
            tipoDoc ? "" : "celda-vacia"
          }">${tipoDoc}</td><td class="${
            numDoc ? "" : "celda-vacia"
          }">${numDoc}</td><td>${c.cantidadBultos}</td><td>${
            c.observacion || ""
          }</td></tr>`;
        })
        .join("")}
     </table>
    </div>
    <div class="total-centros-container">
     <table class="total-centros-table"><tr><td>Total de Bultos Centros de Distribución</td><td>${totalCentros}</td></tr></table>
    </div>`;
      }

      let segmentosHTML = "";
      if (mostrarSegmentos) {
        segmentosHTML = `
    <div class="otros-segmentos-table-container">
     <table class="otros-segmentos-table">
      <tr><th>Segmentos Adicionales</th><th>Tipo de Documento</th><th>Número de Documento</th><th>Cantidad Bultos</th><th>Observación</th></tr>
      ${segmentos
        .map((c) => {
          const tipoDoc = limpiarValor(c.tipoDocumento);
          const numDoc = limpiarValor(c.numeroDocumento);
          return `<tr><td>${c.origenCarga}</td><td class="${
            tipoDoc ? "" : "celda-vacia"
          }">${tipoDoc}</td><td class="${
            numDoc ? "" : "celda-vacia"
          }">${numDoc}</td><td>${c.cantidadBultos}</td><td>${
            c.observacion || ""
          }</td></tr>`;
        })
        .join("")}
     </table>
    </div>
    <div class="total-otros-segmentos-container">
     <table class="total-otros-segmentos-table"><tr><td>Total de bultos Segmentos Adicionales:</td><td>${totalSegmentos}</td></tr></table>
    </div>`;
      }

      let totalGeneralHTML = "";
      if (mostrarCentros || mostrarSegmentos) {
        totalGeneralHTML = `
    <div class="total-carga-container">
     <table class="total-carga-table"><tr><td>Total de Bultos Despachados:</td><td>${totalGeneral}</td></tr></table>
    </div>`;
      }

      paginas += `
<div class="paper">
 <img src="${logoBase64}" class="logo-header" alt="Logo" />
 <div class="local-text-header">${copia}</div>
 <div class="main-container">
  <div class="date-table-container">
   <table class="date-table"><tr>
    <td>Fecha Entrega</td><td>${formatearFecha(row.fechaEntrega)}</td>
    <td>Hora Entrega</td><td>${row.horaEntrega || "__:__"} Hrs</td>
   </tr></table>
  </div>
  <div class="local-table-container">
   <table class="local-table"><tr><td>Local</td><td>${row.codigoLocal}-${
        row.nombreLocal
      }</td></tr></table>
  </div>
  ${centrosHTML}
  ${segmentosHTML}
  ${totalGeneralHTML}
  <div class="tablas-inferiores-container">
   <div class="columna-izquierda">
    <div class="firma-tienda-container"><table class="firma-tienda-table"><tr><td>Nombre y Firma Jefe de Tienda</td></tr></table></div>
    <div class="tabla-transporte-container">
     <table class="tabla-transporte-table">
      <tr><td>Conductor</td><td>${conductor}</td></tr>
      <tr><td>Rut</td><td>${rutConductor || ""}</td></tr>
      <tr><td>Patente</td><td>${patenteCompleta}</td></tr>
     </table>
    </div>
   </div>
   <div class="columna-derecha">
    <div class="firma-conductor-container"><table class="firma-conductor-table"><tr><td>Nombre y Firma Conductor</td></tr></table></div>
    <div class="tabla-sellos-container">
     <table class="tabla-sellos-table">
      <tr><td>Sello Trasero</td><td>${row.selloTrasero}</td></tr>
      <tr><td>Sello Lateral</td><td>${selloLateral}</td></tr>
      <tr><td>Sello Adicional</td><td>${selloAdicional}</td></tr>
     </table>
    </div>
   </div>
  </div>
 </div>
</div>`;
    });
  });

  const css = `
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:#e5e7eb;padding:20px}
.paper{width:21.59cm;min-height:27.94cm;background:white;box-shadow:0 10px 25px rgba(0,0,0,0.1);padding:1cm 0.5cm 0.2cm 0.5cm;position:relative;margin:0 auto 20px;page-break-after:always;page-break-inside:avoid}
.paper:last-child{page-break-after:auto}
.logo-header{position:absolute;top:0.15cm;left:0.5cm;height:0.9cm;width:auto;z-index:10}
.local-text-header{position:absolute;top:calc(0.2cm + 2px);right:0.5cm;font-family:'Comic Sans MS',cursive;font-size:26px;color:#000;text-align:right;z-index:10}
.main-container{width:100%;min-height:calc(27.94cm - 1cm - 0.2cm - 1.35cm);border:2px solid #000;background:#fff;padding:0.8rem;margin-top:0.15cm;display:flex;flex-direction:column}
.date-table-container{margin-left:0.03cm;margin-top:0.03cm;width:100%}
.date-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}
.date-table td{border:3px double #000;padding:2px 4px;font-size:16px;font-weight:bold;text-align:center}
.date-table td:nth-child(1){width:4cm;background:rgb(217,217,217)}
.date-table td:nth-child(2){width:auto;background:transparent}
.date-table td:nth-child(3){width:4cm;background:rgb(217,217,217)}
.date-table td:nth-child(4){width:auto;background:transparent}
.local-table-container{margin-left:0.03cm;margin-top:0.2cm;width:100%}
.local-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}
.local-table td{border:3px double #000;padding:2px 8px;font-size:22px;font-weight:bold;text-align:center}
.local-table td:nth-child(1){width:4cm;background:rgb(217,217,217)}
.local-table td:nth-child(2){width:auto;background:transparent}
.centros-table-container{margin-left:0.03cm;margin-top:0.2cm;width:100%}
.centros-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}
.centros-table td,.centros-table th{border:2px double #000;padding:2px 6px;text-align:center}
.centros-table th{font-size:13px;font-weight:bold;background:rgb(217,217,217)}
.centros-table td{font-size:13px}
.centros-table th:nth-child(1),.centros-table td:nth-child(1){width:6cm}
.centros-table th:nth-child(2),.centros-table td:nth-child(2){width:2.5cm}
.centros-table th:nth-child(3),.centros-table td:nth-child(3){width:2.5cm}
.centros-table th:nth-child(4),.centros-table td:nth-child(4){width:2.5cm}
.centros-table th:nth-child(5),.centros-table td:nth-child(5){width:auto}
.celda-vacia{background:rgb(217,217,217)}
.total-centros-container{margin-left:0.03cm;margin-top:0.1cm;width:13.5cm}
.total-centros-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}
.total-centros-table td{border:2px double #000;padding:2px 6px;font-size:13px;font-weight:bold;background:rgb(217,217,217);text-align:center}
.total-centros-table td:nth-child(1){width:11cm}
.total-centros-table td:nth-child(2){width:2.5cm}
.otros-segmentos-table-container{margin-left:0.03cm;margin-top:1.5cm;width:100%}
.otros-segmentos-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}
.otros-segmentos-table td,.otros-segmentos-table th{border:2px double #000;padding:2px 6px;text-align:center}
.otros-segmentos-table th{font-size:13px;font-weight:bold;background:rgb(217,217,217)}
.otros-segmentos-table td{font-size:13px}
.otros-segmentos-table th:nth-child(1),.otros-segmentos-table td:nth-child(1){width:6cm}
.otros-segmentos-table th:nth-child(2),.otros-segmentos-table td:nth-child(2){width:2.5cm}
.otros-segmentos-table th:nth-child(3),.otros-segmentos-table td:nth-child(3){width:2.5cm}
.otros-segmentos-table th:nth-child(4),.otros-segmentos-table td:nth-child(4){width:2.5cm}
.otros-segmentos-table th:nth-child(5),.otros-segmentos-table td:nth-child(5){width:auto}
.total-otros-segmentos-container{margin-left:0.03cm;margin-top:0.1cm;width:13.5cm}
.total-otros-segmentos-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}
.total-otros-segmentos-table td{border:2px double #000;padding:2px 6px;font-size:13px;font-weight:bold;background:rgb(217,217,217);text-align:center}
.total-otros-segmentos-table td:nth-child(1){width:11cm}
.total-otros-segmentos-table td:nth-child(2){width:2.5cm}
.total-carga-container{margin-left:0.03cm;margin-top:0.1cm;width:13.5cm}
.total-carga-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}
.total-carga-table td{border:2px double #000;padding:2px 6px;font-size:14px;font-weight:bold;background:rgb(217,217,217);text-align:center}
.total-carga-table td:nth-child(1){width:11cm}
.total-carga-table td:nth-child(2){width:2.5cm}
.tablas-inferiores-container{display:flex;justify-content:space-between;margin-top:auto;padding-top:0.2cm;width:100%}
.columna-izquierda,.columna-derecha{width:8.5cm;display:flex;flex-direction:column}
.firma-tienda-container,.firma-conductor-container{width:8.5cm;margin-bottom:1cm}
.firma-tienda-table,.firma-conductor-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}
.firma-tienda-table td,.firma-conductor-table td{border-top:2px double #000;border-left:none;border-right:none;border-bottom:none;padding:4px;font-size:12px;text-align:center}
.tabla-transporte-container,.tabla-sellos-container{width:8.5cm}
.tabla-transporte-table,.tabla-sellos-table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace}
.tabla-transporte-table td,.tabla-sellos-table td{border:2px double #000;padding:2px 4px;font-size:12px;text-align:center}
.tabla-transporte-table td:nth-child(1),.tabla-sellos-table td:nth-child(1){width:4cm;font-weight:bold;background:rgb(217,217,217)}
.tabla-transporte-table td:nth-child(2),.tabla-sellos-table td:nth-child(2){width:4.5cm;background:transparent}
@media print{html,body{width:100%;height:100%;margin:0;padding:0;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}.paper{box-shadow:none;margin:0;width:21.59cm;min-height:27.94cm;padding:1cm 0.5cm 0.2cm 0.5cm;page-break-after:always;page-break-inside:avoid;overflow:hidden}.paper:last-child{page-break-after:auto}.main-container{border:2px solid black;min-height:calc(27.94cm - 1cm - 0.2cm - 1.35cm);overflow:hidden}.logo-header{position:absolute;top:0.15cm;left:0.5cm;height:0.9cm;width:auto}}
`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>FASHIONSPARK - Despacho</title><style>${css}</style></head><body>${paginas}</body></html>`;
};

const ImprimirModal: React.FC<ImprimirModalProps> = ({
  isOpen,
  locales,
  conductor,
  rutConductor,
  patentePrincipal,
  patenteAdicional,
  selloLateral,
  selloAdicional,
  nombreAdministrativo,
  onClose,
  copias = [],
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [logoBase64, setLogoBase64] = useState("");

  useEffect(() => {
    if (isOpen && !logoBase64) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        setLogoBase64(canvas.toDataURL("image/png"));
      };
      img.src = logoPath;
    }
  }, [isOpen, logoBase64]);

  const copiasUsar =
    copias.length > 0 ? copias : ["Local", "Guardia", "Conductor", "Original"];

  const htmlString = logoBase64
    ? generarHTML(
        locales,
        conductor,
        rutConductor || "",
        patentePrincipal,
        patenteAdicional,
        selloLateral,
        selloAdicional,
        logoBase64,
        copiasUsar
      )
    : "";

  const handlePrint = () => {
    const html = generarHTML(
      locales,
      conductor,
      rutConductor || "",
      patentePrincipal,
      patenteAdicional,
      selloLateral,
      selloAdicional,
      logoBase64,
      copiasUsar
    );
    const ventana = window.open("", "_blank", "width=900,height=700");
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
      ventana.focus();
      setTimeout(() => ventana.print(), 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="imprimir-modal-overlay" onClick={onClose}>
      <div className="imprimir-modal" onClick={(e) => e.stopPropagation()}>
        <div className="imprimir-modal-header">
          <h2>Vista Previa de Impresión</h2>
          <div className="imprimir-modal-actions">
            <button className="imprimir-btn-imprimir" onClick={handlePrint}>
              Imprimir Ahora
            </button>
            <button className="imprimir-btn-cerrar" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="imprimir-contenido">
          {htmlString ? (
            <iframe
              ref={iframeRef}
              srcDoc={htmlString}
              style={{
                width: "100%",
                height: "65vh",
                border: "none",
                background: "#e5e7eb",
              }}
              title="Vista previa"
            />
          ) : (
            <p
              style={{ textAlign: "center", padding: "40px", color: "#64748b" }}
            >
              Cargando vista previa...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImprimirModal;
