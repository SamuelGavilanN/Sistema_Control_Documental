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

  // Filas de locales
  let filasLocales = '';
  datos.locales.forEach((local) => {
    filasLocales += `
      <tr>
        <td class="celda-dato" style="text-align:center;">${local.codigo}-${local.nombre}</td>
        <td class="celda-dato" style="text-align:center;">${local.actas}</td>
        <td class="celda-dato" style="text-align:center;">${formatearFechaLarga(local.fechaEntrega)}</td>
        <td class="celda-dato" style="text-align:center;">${local.selloTrasero}</td>
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
            body { margin: 0; }
          }
          .carta {
            width: 21.59cm;
            min-height: 27.94cm;
            margin: 0 auto;
            background: #fff;
            padding: 1cm;
            border: 2px solid #000;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
            font-size: 10px; /* Reducido de 12px a 10px */
            color: #000;
          }
          .tabla-unica {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .tabla-unica td {
            padding: 6px 8px; /* Padding intacto */
          }
          .celda-etiqueta {
            border: 1px solid #000;
            background: #e0e0e0;
            font-weight: bold;
          }
          .celda-dato {
            border: 1px solid #000;
          }
          .celda-encabezado {
            border: 1px solid #000;
            background: #d9e2f3;
            font-weight: bold;
            text-align: center;
          }
          .celda-vacia {
            border: none;
            background: transparent;
          }
          .fila-separacion td {
            border: none;
            background: transparent;
          }
        </style>
      </head>
      <body style="margin:0; padding:0;">
        <div class="carta">
          <!-- Encabezado con logo y título (fuente reducida de 20px a 16px) -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #000; padding-bottom:5px;">
            <img src="${logoBase64}" alt="Logo FASHIONSPARK" style="height:40px; width:auto;" />
            <span style="font-size:16px; font-weight:bold; font-family:'Comic Sans MS', cursive;">Resumen</span>
          </div>

          <!-- Tabla única -->
          <table class="tabla-unica">
            <colgroup>
              <col style="width:30%;">
              <col style="width:30%;">
              <col style="width:30%;">
              <col style="width:25%;">
            </colgroup>

            <!-- Separación 1 (21px) -->
            <tr class="fila-separacion" style="height:21px;"><td colspan="4"></td></tr>

            <!-- Documentación (sin fila DESPACHO) -->
            <tr>
              <td class="celda-etiqueta">FECHA DOCUMENTACIÓN</td>
              <td class="celda-dato">${fechaDocumentacion}</td>
              <td class="celda-vacia"></td>
              <td class="celda-vacia"></td>
            </tr>
            <tr>
              <td class="celda-etiqueta">ADMINISTRATIVO</td>
              <td class="celda-dato">${administrativo}</td>
              <td class="celda-vacia"></td>
              <td class="celda-vacia"></td>
            </tr>
            <tr>
              <td class="celda-etiqueta">N° DOCUMENTACIÓN</td>
              <td class="celda-dato" style="font-weight:bold;">${datos.numeroTransporte}</td>
              <td class="celda-vacia"></td>
              <td class="celda-vacia"></td>
            </tr>

            <!-- Separación 2 (40px) -->
            <tr class="fila-separacion" style="height:40px;"><td colspan="4"></td></tr>

            <!-- Detalle de Locales -->
            <tr>
              <td colspan="4" class="celda-encabezado">DETALLE DE LOCALES</td>
            </tr>
            <tr>
              <td class="celda-encabezado">LOCAL</td>
              <td class="celda-encabezado">N° DE ACTAS</td>
              <td class="celda-encabezado">FECHA ENTREGA</td>
              <td class="celda-encabezado">SELLO TRASERO</td>
            </tr>
            ${filasLocales}

            <!-- Separación 3 (75px) -->
            <tr class="fila-separacion" style="height:75px;"><td colspan="4"></td></tr>

            <!-- Conductor y vehículo -->
            <tr>
              <td class="celda-etiqueta">CONDUCTOR</td>
              <td class="celda-dato">${conductor}</td>
              <td class="celda-vacia"></td>
              <td class="celda-vacia"></td>
            </tr>
            <tr>
              <td class="celda-etiqueta">PATENTE</td>
              <td class="celda-dato">${patenteCompleta}</td>
              <td class="celda-vacia"></td>
              <td class="celda-vacia"></td>
            </tr>
            <tr>
              <td class="celda-etiqueta">RUT</td>
              <td class="celda-dato">${rutConductor}</td>
              <td class="celda-vacia"></td>
              <td class="celda-vacia"></td>
            </tr>
            <tr>
              <td class="celda-etiqueta">SELLO LATERAL</td>
              <td class="celda-dato">${datos.selloLateral}</td>
              <td class="celda-vacia"></td>
              <td class="celda-vacia"></td>
            </tr>
            <tr>
              <td class="celda-etiqueta">SELLO ADICIONAL</td>
              <td class="celda-dato">${datos.selloAdicional}</td>
              <td class="celda-vacia"></td>
              <td class="celda-vacia"></td>
            </tr>
            <tr>
              <td class="celda-etiqueta">FECHA PROGRAMACIÓN</td>
              <td class="celda-dato">${formatearFechaLarga(datos.fechaProgramacion)}</td>
              <td class="celda-vacia"></td>
              <td class="celda-vacia"></td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `;

  return html;
}
