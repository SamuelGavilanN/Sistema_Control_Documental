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

export function generarResumenFinalizarHTML(datos: DatosResumen): string {
  const fechaDocumentacion = formatearFechaActual();
  const patenteCompleta = [datos.patentePrincipal, datos.patenteAdicional]
    .filter(Boolean)
    .join(' / ');
  const administrativo = escaparHTML(datos.administrativo);
  const conductor = escaparHTML(datos.conductor);
  const rutConductor = escaparHTML(datos.rutConductor);

  let paginas = '';

  // Generar una página por cada local
  datos.locales.forEach((local) => {
    const localNombre = escaparHTML(`${local.codigo}-${local.nombre}`);
    const actas = escaparHTML(local.actas);
    const fechaEntrega = formatearFechaLarga(local.fechaEntrega);
    const selloTrasero = escaparHTML(local.selloTrasero);

    paginas += `
      <div style="max-width:750px; margin:0 auto 30px auto; border:2px solid #000; padding:15px; background:#fff; text-align:center; page-break-after:always;">

        <!-- TABLA 1: DOCUMENTACIÓN ADMINISTRATIVA -->
        <table style="width:100%; border-collapse:collapse; table-layout:auto; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
          <tr>
            <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">FECHA DOCUMENTACIÓN</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${fechaDocumentacion}</td>
            <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">ADMINISTRATIVO</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${administrativo}</td>
          </tr>
          <tr>
            <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">DESPACHO</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap;">DESP05</td>
            <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">N° DOCUMENTACIÓN</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap; font-weight:bold; font-size:14px;">${datos.numeroTransporte}</td>
          </tr>
        </table>

        <!-- TABLA 2: DETALLE DEL LOCAL -->
        <table style="width:100%; border-collapse:collapse; margin-top:10px; table-layout:auto; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
          <tr>
            <td colspan="4" bgcolor="#B4C6E7" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">DETALLE DEL LOCAL</td>
          </tr>
          <tr bgcolor="#B4C6E7">
            <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">LOCAL</td>
            <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">N° DE ACTAS</td>
            <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">FECHA ENTREGA</td>
            <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">SELLO TRASERO</td>
          </tr>
          <tr>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap; font-weight:bold;">${localNombre}</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${actas}</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${fechaEntrega}</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${selloTrasero}</td>
          </tr>
        </table>

        <!-- TABLA 3: CONDUCTOR Y VEHÍCULO -->
        <table style="width:100%; border-collapse:collapse; margin-top:10px; table-layout:auto; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
          <tr>
            <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">CONDUCTOR</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${conductor}</td>
            <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">PATENTE</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${patenteCompleta}</td>
          </tr>
          <tr>
            <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">RUT</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${rutConductor}</td>
            <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">SELLO LATERAL</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${datos.selloLateral}</td>
          </tr>
          <tr>
            <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">SELLO ADICIONAL</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${datos.selloAdicional}</td>
            <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">FECHA PROGRAMACIÓN</td>
            <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${formatearFechaLarga(datos.fechaProgramacion)}</td>
          </tr>
          <tr>
            <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">NUMERO DE TRANSPORTE</td>
            <td colspan="3" style="border:1px solid #000; padding:5px; white-space:nowrap; font-weight:bold; font-size:16px;">${datos.numeroTransporte}</td>
          </tr>
        </table>

      </div>
    `;
  });

  const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <title>Resumen Final - ${datos.numeroTransporte}</title>
        <style>
          @media print {
            body { margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body style="font-family:Arial, sans-serif; font-size:12px; color:#000; margin:0; padding:0;">
        ${paginas}
      </body>
    </html>
  `;

  return html;
}
