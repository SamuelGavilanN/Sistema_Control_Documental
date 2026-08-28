// src/components/Transactions/SD/generarResumenFinalizar.ts

interface LocalResumen {
  codigo: string;
  nombre: string;
  actas: string;
  fechaEntrega: string;
  selloTrasero: string;
}

interface DatosResumen {
  numeroTransporte: string;
  fechaProgramacion: string;
  administrativo: string;
  conductor: string;
  rutConductor: string;
  patentePrincipal: string;
  patenteAdicional?: string;
  selloLateral: string;
  selloAdicional: string;
  locales: LocalResumen[];
}

function formatearFechaActual(): string {
  const ahora = new Date();
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dia = dias[ahora.getDay()];
  const dd = String(ahora.getDate()).padStart(2, '0');
  const mm = String(ahora.getMonth() + 1).padStart(2, '0');
  const yyyy = ahora.getFullYear();
  return `${dia} ${dd}.${mm}.${yyyy}`;
}

function formatearFechaLarga(fecha: string): string {
  if (!fecha) return '';
  const d = new Date(fecha + 'T00:00:00');
  if (isNaN(d.getTime())) return fecha;
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return `${dias[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

function escaparHTML(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generarResumenFinalizarHTML(datos: DatosResumen, logoBase64: string): string {
  const fechaDocumentacion = formatearFechaActual();
  const patenteCompleta = [datos.patentePrincipal, datos.patenteAdicional]
    .filter(Boolean)
    .join(' / ');
  const administrativo = escaparHTML(datos.administrativo);
  const conductor = escaparHTML(datos.conductor);
  const rutConductor = escaparHTML(datos.rutConductor);

  // Filas de locales (tabla separada)
  let filasLocales = '';
  datos.locales.forEach((local) => {
    filasLocales += `
      <tr>
        <td style="border:1px solid #000; padding:5px; text-align:center; white-space:nowrap;">${local.codigo}-${local.nombre}</td>
        <td style="border:1px solid #000; padding:5px; text-align:center; white-space:nowrap;">${local.actas}</td>
        <td style="border:1px solid #000; padding:5px; text-align:center; white-space:nowrap;">${formatearFechaLarga(local.fechaEntrega)}</td>
        <td style="border:1px solid #000; padding:5px; text-align:center; white-space:nowrap;">${local.selloTrasero}</td>
      </tr>
    `;
  });

  const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <title>Resumen Final - ${datos.numeroTransporte}</title>
        <style>
          @media print {
            body { margin: 0; padding: 15px; }
          }
        </style>
      </head>
      <body style="font-family:Arial, sans-serif; font-size:12px; color:#000; margin:0; padding:0;">
        <div style="max-width:750px; margin:0 auto; background:#fff;">

          <!-- ENCABEZADO CON LOGO (similar a ImprimirModal) -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #000; padding-bottom:5px;">
            <img src="${logoBase64}" alt="Logo FASHIONSPARK" style="height:40px; width:auto;" />
            <span style="font-size:20px; font-weight:bold; font-family:'Comic Sans MS', cursive;">Resumen</span>
          </div>

          <!-- TABLA 1: FECHA DOCUMENTACIÓN Y ADMINISTRATIVO -->
          <table style="width:100%; border-collapse:collapse; margin-bottom:15px; table-layout:auto; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
            <tr>
              <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">FECHA DOCUMENTACIÓN</td>
              <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${fechaDocumentacion}</td>
              <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">ADMINISTRATIVO</td>
              <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${administrativo}</td>
            </tr>
            <tr>
              <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">DESPACHO</td>
              <td style="border:1px solid #000; padding:5px; white-space:nowrap;">DESP05</td>
              <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">N° DOCUMENTACIÓN</td>
              <td style="border:1px solid #000; padding:5px; white-space:nowrap; font-weight:bold; font-size:14px;">${datos.numeroTransporte}</td>
            </tr>
          </table>

          <!-- TABLA 2: DETALLE DE LOCALES -->
          <table style="width:100%; border-collapse:collapse; margin-bottom:15px; table-layout:auto; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
            <tr>
              <td colspan="4" bgcolor="#d9e2f3" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">DETALLE DE LOCALES</td>
            </tr>
            <tr bgcolor="#d9e2f3">
              <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">LOCAL</td>
              <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">N° DE ACTAS</td>
              <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">FECHA ENTREGA</td>
              <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">SELLO TRASERO</td>
            </tr>
            ${filasLocales}
          </table>

          <!-- TABLA 3: CONDUCTOR Y VEHÍCULO (bloques separados) -->
          <table style="width:100%; border-collapse:collapse; margin-bottom:15px; table-layout:auto; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
            <tr>
              <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">CONDUCTOR</td>
              <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${conductor}</td>
              <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">PATENTE</td>
              <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${patenteCompleta}</td>
            </tr>
            <tr>
              <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">RUT</td>
              <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${rutConductor}</td>
              <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">SELLO LATERAL</td>
              <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${datos.selloLateral}</td>
            </tr>
            <tr>
              <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">SELLO ADICIONAL</td>
              <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${datos.selloAdicional}</td>
              <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">FECHA PROGRAMACIÓN</td>
              <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${formatearFechaLarga(datos.fechaProgramacion)}</td>
            </tr>
            <tr>
              <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">NUMERO DE TRANSPORTE</td>
              <td colspan="3" style="border:1px solid #000; padding:5px; white-space:nowrap; font-weight:bold; font-size:16px;">${datos.numeroTransporte}</td>
            </tr>
          </table>

        </div>
      </body>
    </html>
  `;

  return html;
}
