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

  // Tabla 1: Documentación (ancho 55%, columnas 25% y 30%, separación 40px)
  const tablaDocumentacion = `
    <table style="width:calc(55% - 0px); border-collapse:collapse; margin-bottom:40px; margin-left:0px; margin-right:0px; table-layout:auto; font-family:Arial, sans-serif; font-size:12px; text-align:left;">
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:6px 8px; font-weight:bold; white-space:nowrap; width:25%;">FECHA DOCUMENTACIÓN</td>
        <td style="border:1px solid #000; padding:6px 8px; white-space:nowrap; width:30%;">${fechaDocumentacion}</td>
      </tr>
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:6px 8px; font-weight:bold; white-space:nowrap; width:25%;">ADMINISTRATIVO</td>
        <td style="border:1px solid #000; padding:6px 8px; white-space:nowrap; width:30%;">${administrativo}</td>
      </tr>
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:6px 8px; font-weight:bold; white-space:nowrap; width:25%;">DESPACHO</td>
        <td style="border:1px solid #000; padding:6px 8px; white-space:nowrap; width:30%;">DESP05</td>
      </tr>
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:6px 8px; font-weight:bold; white-space:nowrap; width:25%;">N° DOCUMENTACIÓN</td>
        <td style="border:1px solid #000; padding:6px 8px; white-space:nowrap; width:30%; font-weight:bold; font-size:14px;">${datos.numeroTransporte}</td>
      </tr>
    </table>
  `;

  // Tabla 2: Detalle de locales (ancho 100%, columnas 30%, 30%, 20%, 16%, separación 100px)
  let filasLocales = '';
  datos.locales.forEach((local) => {
    filasLocales += `
      <tr>
        <td style="border:1px solid #000; padding:5px; text-align:center; white-space:nowrap; width:30%;">${local.codigo}-${local.nombre}</td>
        <td style="border:1px solid #000; padding:5px; text-align:center; white-space:nowrap; width:30%;">${local.actas}</td>
        <td style="border:1px solid #000; padding:5px; text-align:center; white-space:nowrap; width:20%;">${formatearFechaLarga(local.fechaEntrega)}</td>
        <td style="border:1px solid #000; padding:5px; text-align:center; white-space:nowrap; width:16%;">${local.selloTrasero}</td>
      </tr>
    `;
  });

  const tablaLocales = `
    <table style="width:100%; border-collapse:collapse; margin-bottom:100px; margin-left:0px; margin-right:0px; table-layout:auto; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
      <tr>
        <td colspan="4" bgcolor="#d9e2f3" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">DETALLE DE LOCALES</td>
      </tr>
      <tr bgcolor="#d9e2f3">
        <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap; width:30%;">LOCAL</td>
        <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap; width:30%;">N° DE ACTAS</td>
        <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap; width:20%;">FECHA ENTREGA</td>
        <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap; width:16%;">SELLO TRASERO</td>
      </tr>
      ${filasLocales}
    </table>
  `;

  // Tabla 3: Conductor y vehículo (ancho 55%, columnas 25% y 30%, separación 40px)
  const tablaConductor = `
    <table style="width:calc(55% - 0px); border-collapse:collapse; margin-top:40px; margin-left:0px; margin-right:0px; table-layout:auto; font-family:Arial, sans-serif; font-size:12px; text-align:left;">
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:6px 8px; font-weight:bold; white-space:nowrap; width:25%;">CONDUCTOR</td>
        <td style="border:1px solid #000; padding:6px 8px; white-space:nowrap; width:30%;">${conductor}</td>
      </tr>
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:6px 8px; font-weight:bold; white-space:nowrap; width:25%;">PATENTE</td>
        <td style="border:1px solid #000; padding:6px 8px; white-space:nowrap; width:30%;">${patenteCompleta}</td>
      </tr>
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:6px 8px; font-weight:bold; white-space:nowrap; width:25%;">RUT</td>
        <td style="border:1px solid #000; padding:6px 8px; white-space:nowrap; width:30%;">${rutConductor}</td>
      </tr>
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:6px 8px; font-weight:bold; white-space:nowrap; width:25%;">SELLO LATERAL</td>
        <td style="border:1px solid #000; padding:6px 8px; white-space:nowrap; width:30%;">${datos.selloLateral}</td>
      </tr>
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:6px 8px; font-weight:bold; white-space:nowrap; width:25%;">SELLO ADICIONAL</td>
        <td style="border:1px solid #000; padding:6px 8px; white-space:nowrap; width:30%;">${datos.selloAdicional}</td>
      </tr>
      <tr>
        <td bgcolor="#e0e0e0" style="border:1px solid #000; padding:6px 8px; font-weight:bold; white-space:nowrap; width:25%;">FECHA PROGRAMACIÓN</td>
        <td style="border:1px solid #000; padding:6px 8px; white-space:nowrap; width:30%;">${formatearFechaLarga(datos.fechaProgramacion)}</td>
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
        <div style="max-width:750px; margin:0 auto; background:#fff; padding:15px; border:2px solid #000;">

          <!-- ENCABEZADO CON LOGO -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #000; padding-bottom:5px;">
            <img src="${logoBase64}" alt="Logo FASHIONSPARK" style="height:40px; width:auto;" />
            <span style="font-size:20px; font-weight:bold; font-family:'Comic Sans MS', cursive;">Resumen</span>
          </div>

          ${tablaDocumentacion}
          ${tablaLocales}
          ${tablaConductor}

        </div>
      </body>
    </html>
  `;

  return html;
}
