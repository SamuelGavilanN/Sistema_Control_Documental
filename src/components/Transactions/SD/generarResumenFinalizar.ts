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

export function generarResumenFinalizarHTML(datos: DatosResumen): string {
  const fechaDocumentacion = formatearFechaActual();
  const patenteCompleta = [datos.patentePrincipal, datos.patenteAdicional]
    .filter(Boolean)
    .join(' / ');

  // Primera tabla: información administrativa y del local
  let filasLocales = '';
  datos.locales.forEach((local) => {
    filasLocales += `
      <tr>
        <td style="border:1px solid #000; padding:4px; text-align:center;">${local.codigo}-${local.nombre}</td>
        <td style="border:1px solid #000; padding:4px; text-align:center;">${local.actas}</td>
        <td style="border:1px solid #000; padding:4px; text-align:center;">${local.fechaEntrega}</td>
        <td style="border:1px solid #000; padding:4px; text-align:center;">${local.selloTrasero}</td>
      </tr>
    `;
  });

  // Segunda tabla: datos del conductor y vehículo
  const tablaConductor = `
    <table style="width:100%; border-collapse:collapse; margin-top:10px; font-family:Arial, sans-serif; font-size:12px;">
      <tr>
        <td style="border:1px solid #000; padding:5px; background:#f2f2f2; font-weight:bold; text-align:center;">CONDUCTOR</td>
        <td style="border:1px solid #000; padding:5px; text-align:center;">${datos.conductor}</td>
        <td style="border:1px solid #000; padding:5px; background:#f2f2f2; font-weight:bold; text-align:center;">PATENTE</td>
        <td style="border:1px solid #000; padding:5px; text-align:center;">${patenteCompleta}</td>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:5px; background:#f2f2f2; font-weight:bold; text-align:center;">RUT</td>
        <td style="border:1px solid #000; padding:5px; text-align:center;">${datos.rutConductor}</td>
        <td style="border:1px solid #000; padding:5px; background:#f2f2f2; font-weight:bold; text-align:center;">SELLO LATERAL</td>
        <td style="border:1px solid #000; padding:5px; text-align:center;">${datos.selloLateral}</td>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:5px; background:#f2f2f2; font-weight:bold; text-align:center;">SELLO ADICIONAL</td>
        <td style="border:1px solid #000; padding:5px; text-align:center;">${datos.selloAdicional}</td>
        <td style="border:1px solid #000; padding:5px; background:#f2f2f2; font-weight:bold; text-align:center;">FECHA PROGRAMACIÓN</td>
        <td style="border:1px solid #000; padding:5px; text-align:center;">${formatearFechaLarga(datos.fechaProgramacion)}</td>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:5px; background:#f2f2f2; font-weight:bold; text-align:center;">NUMERO DE TRANSPORTE</td>
        <td colspan="3" style="border:1px solid #000; padding:5px; text-align:center; font-weight:bold; font-size:14px;">${datos.numeroTransporte}</td>
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
            body { margin: 0; padding: 20px; }
          }
        </style>
      </head>
      <body style="font-family:Arial, sans-serif; font-size:12px; color:#000;">
        <div style="max-width:750px; margin:0 auto; border:2px solid #000; padding:15px; background:#fff;">
          <h2 style="text-align:center; margin:0 0 10px 0; font-size:16px;">RESUMEN DE DESPACHO</h2>
          <table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif; font-size:12px;">
            <tr>
              <td style="border:1px solid #000; padding:5px; background:#f2f2f2; font-weight:bold; text-align:center;">FECHA DOCUMENTACIÓN</td>
              <td style="border:1px solid #000; padding:5px; text-align:center;">${fechaDocumentacion}</td>
              <td style="border:1px solid #000; padding:5px; background:#f2f2f2; font-weight:bold; text-align:center;">ADMINISTRATIVO</td>
              <td style="border:1px solid #000; padding:5px; text-align:center;">${datos.administrativo}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000; padding:5px; background:#f2f2f2; font-weight:bold; text-align:center;">DESPACHO</td>
              <td style="border:1px solid #000; padding:5px; text-align:center;">DESP05</td>
              <td style="border:1px solid #000; padding:5px; background:#f2f2f2; font-weight:bold; text-align:center;">N° DOCUMENTACIÓN</td>
              <td style="border:1px solid #000; padding:5px; text-align:center;">${datos.numeroTransporte}</td>
            </tr>
            <tr>
              <td colspan="4" style="border:1px solid #000; padding:5px; background:#f2f2f2; font-weight:bold; text-align:center;">DETALLE DE LOCALES</td>
            </tr>
            <tr>
              <td style="border:1px solid #000; padding:4px; background:#d9e2f3; font-weight:bold; text-align:center;">LOCAL</td>
              <td style="border:1px solid #000; padding:4px; background:#d9e2f3; font-weight:bold; text-align:center;">N° DE ACTAS</td>
              <td style="border:1px solid #000; padding:4px; background:#d9e2f3; font-weight:bold; text-align:center;">FECHA ENTREGA</td>
              <td style="border:1px solid #000; padding:4px; background:#d9e2f3; font-weight:bold; text-align:center;">SELLO TRASERO</td>
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
