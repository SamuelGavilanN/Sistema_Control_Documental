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

  // Tabla 1: Documentación (2 columnas)
  const tablaDocumentacion = `
    <table style="width:100%; border-collapse:collapse; margin-bottom:15px; table-layout:auto; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap; width:25%;">FECHA DOCUMENTACIÓN</td>
        <td style="border:1px solid #000; padding:5px; white-space:nowrap; width:25%;">${fechaDocumentacion}</td>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap; width:25%;">ADMINISTRATIVO</td>
        <td style="border:1px solid #000; padding:5px; white-space:nowrap; width:25%;">${administrativo}</td>
      </tr>
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap; width:25%;">DESPACHO</td>
        <td style="border:1px solid #000; padding:5px; white-space:nowrap; width:25%;">DESP05</td>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap; width:25%;">N° DOCUMENTACIÓN</td>
        <td style="border:1px solid #000; padding:5px; white-space:nowrap; width:25%; font-weight:bold; font-size:14px;">${datos.numeroTransporte}</td>
      </tr>
    </table>
  `;

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

  // Tabla 2: Conductor y vehículo (2 columnas, sin NUMERO DE TRANSPORTE)
  const tablaConductor = `
    <table style="width:100%; border-collapse:collapse; margin-bottom:15px; table-layout:auto; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap; width:25%;">CONDUCTOR</td>
        <td style="border:1px solid #000; padding:5px; white-space:nowrap; width:25%;">${conductor}</td>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap; width:25%;">PATENTE</td>
        <td style="border:1px solid #000; padding:5px; white-space:nowrap; width:25%;">${patenteCompleta}</td>
      </tr>
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap; width:25%;">RUT</td>
        <td style="border:1px solid #000; padding:5px; white-space:nowrap; width:25%;">${rutConductor}</td>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap; width:25%;">SELLO LATERAL</td>
        <td style="border:1px solid #000; padding:5px; white-space:nowrap; width:25%;">${datos.selloLateral}</td>
      </tr>
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap; width:25%;">SELLO ADICIONAL</td>
        <td style="border:1px solid #000; padding:5px; white-space:nowrap; width:25%;">${datos.selloAdicional}</td>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap; width:25%;">FECHA PROGRAMACIÓN</td>
        <td style="border:1px solid #000; padding:5px; white-space:nowrap; width:25%;">${formatearFechaLarga(datos.fechaProgramacion)}</td>
      </tr>
    </table>
  `;

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

          <!-- ENCABEZADO CON LOGO -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #000; padding-bottom:5px;">
            <img src="${logoBase64}" alt="Logo FASHIONSPARK" style="height:40px; width:auto;" />
            <span style="font-size:20px; font-weight:bold; font-family:'Comic Sans MS', cursive;">Resumen</span>
          </div>

          ${tablaDocumentacion}

          <!-- TABLA DETALLE DE LOCALES -->
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

          ${tablaConductor}

        </div>
      </body>
    </html>
  `;

  return html;
}
