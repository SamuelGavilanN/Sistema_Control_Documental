// src/components/Transactions/SD/generarCuadroDespacho.ts

interface BultoData {
  origenCarga: string;
  tipoDocumento: string;
  numeroDocumento: string;
  cantidad: number;
  observacion: string;
}

interface LocalData {
  codigo: string;
  nombre: string;
  selloTrasero: string;
  cantidadPallet?: number;   // NUEVO
  bultos: BultoData[];
}

interface TransporteData {
  idDocumento: string;
  destino: string;
  fechaEntrega: string;
  horaEntrega: string;
  chofer: string;
  rutChofer: string;
  celularChofer: string;
  patentePrincipal: string;
  patenteAdicional?: string;
  transportista: string;
  selloTrasero: string;
  selloLateral: string;
  selloAdicional: string;
  administrativo: string;
  actasInformadas: string;
  totalPallets?: number;
  locales: LocalData[];
}

function obtenerSaludo(): string {
  const hora = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());
  const horaNum = parseInt(hora, 10);
  if (horaNum < 12) return 'Buenos días';
  if (horaNum < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatearFechaLarga(fecha: string): string {
  if (!fecha) return '';
  const d = new Date(fecha + 'T00:00:00');
  if (isNaN(d.getTime())) return fecha;
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return `${dias[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

function formatearHora(hora: string): string {
  if (!hora) return '';
  return hora.endsWith('Hrs') ? hora : `${hora} Hrs`;
}

function escaparHTML(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function esNoAplica(valor: string): boolean {
  const v = valor.trim().toLowerCase();
  return v === '' || v === 'no aplica' || v === 'n/a';
}

function esCentroDistribucion(origen: string): boolean {
  const o = origen.toUpperCase().trim();
  return o.startsWith('CD') || o.startsWith('OUT') || o.startsWith('AGV');
}

export function generarCuadroHTML(datos: TransporteData): string {
  const saludo = obtenerSaludo();
  const fechaLarga = formatearFechaLarga(datos.fechaEntrega);
  const horaConHrs = formatearHora(datos.horaEntrega);
  const chofer = escaparHTML(datos.chofer);
  const rut = escaparHTML(datos.rutChofer);
  const celular = escaparHTML(datos.celularChofer);
  const patente = escaparHTML(
    datos.patentePrincipal + (datos.patenteAdicional ? ' / ' + datos.patenteAdicional : '')
  );
  const transportista = escaparHTML(datos.transportista);
  const selloTraseroGlobal = escaparHTML(datos.selloTrasero);
  const selloLateral = escaparHTML(datos.selloLateral);
  const selloAdicional = escaparHTML(datos.selloAdicional);
  const actas = escaparHTML(datos.actasInformadas);
  const administrativo = escaparHTML(datos.administrativo);
  const totalPallets = datos.totalPallets || 0;

  let htmlLocales = '';

  for (const local of datos.locales) {
    const codigo = escaparHTML(local.codigo);
    const nombre = escaparHTML(local.nombre);
    const selloTrasero = escaparHTML(local.selloTrasero || selloTraseroGlobal);
    const cantidadPallet = local.cantidadPallet || 0;

    const centros = local.bultos.filter(b => esCentroDistribucion(b.origenCarga));
    const segmentos = local.bultos.filter(b => !esCentroDistribucion(b.origenCarga));

    const totalCentros = centros.reduce((s, b) => s + b.cantidad, 0);
    const totalSegmentos = segmentos.reduce((s, b) => s + b.cantidad, 0);
    const totalGeneral = totalCentros + totalSegmentos;

    // ===== TABLA ÚNICA CON table-layout: auto =====
    // Separación entre locales: 60px
    htmlLocales += `
      <table style="width:100%; border-collapse:collapse; margin-bottom:60px; font-family:Arial, sans-serif; font-size:12px; text-align:center; table-layout:auto;">

        <!-- Campos largos: etiqueta y valor, todo con white-space:nowrap -->
        <tr>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Nombre Local</td>
          <td colspan="5" style="border:1px solid #000; padding:5px; white-space:nowrap;"><strong>${codigo}-${nombre}</strong></td>
        </tr>
        <tr>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Actas Entrega</td>
          <td colspan="5" style="border:1px solid #000; padding:5px; white-space:nowrap;">${actas}</td>
        </tr>
        <tr>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Administrativo</td>
          <td colspan="5" style="border:1px solid #000; padding:5px; white-space:nowrap;">${administrativo}</td>
        </tr>
        <tr>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Cantidad Pallet</td>
          <td colspan="5" style="border:1px solid #000; padding:5px; white-space:nowrap;">${cantidadPallet}</td>
        </tr>

        <!-- Separación -->
        <tr><td colspan="6" style="border:1px solid #000; padding:3px; background:#fff; white-space:nowrap;"></td></tr>

        <!-- Campos en pares -->
        <tr>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Fecha Entrega</td>
          <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${fechaLarga}</td>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Hora Entrega</td>
          <td colspan="3" style="border:1px solid #000; padding:5px; white-space:nowrap;">${horaConHrs}</td>
        </tr>
        <tr>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Conductor</td>
          <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${chofer}</td>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Patente</td>
          <td colspan="3" style="border:1px solid #000; padding:5px; white-space:nowrap;">${patente}</td>
        </tr>
        <tr>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Rut</td>
          <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${rut}</td>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Sello Trasero</td>
          <td colspan="3" style="border:1px solid #000; padding:5px; white-space:nowrap;">${selloTrasero}</td>
        </tr>
        <tr>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Empresa</td>
          <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${transportista}</td>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Sello Lateral</td>
          <td colspan="3" style="border:1px solid #000; padding:5px; white-space:nowrap;">${selloLateral}</td>
        </tr>
        <tr>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Teléfono</td>
          <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${celular}</td>
          <td bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Sello Adicional</td>
          <td colspan="3" style="border:1px solid #000; padding:5px; white-space:nowrap;">${selloAdicional}</td>
        </tr>

        <!-- Separación -->
        <tr><td colspan="6" style="border:1px solid #000; padding:3px; background:#fff; white-space:nowrap;"></td></tr>

        <!-- CENTROS DE DISTRIBUCIÓN -->
        ${
          centros.length > 0
            ? `
              <tr>
                <td colspan="6" bgcolor="#B4C6E7" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Centro de Distribución</td>
              </tr>
              <tr bgcolor="#B4C6E7">
                <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">Centro de Distribución</td>
                <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">Tipo Doc</td>
                <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">N° Doc</td>
                <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">Cant. Bultos</td>
                <td colspan="2" style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">Observación</td>
              </tr>
              ${centros
                .map((b) => {
                  const tipoDoc = esNoAplica(b.tipoDocumento) ? '' : b.tipoDocumento;
                  const numDoc = esNoAplica(b.numeroDocumento) ? '' : b.numeroDocumento;
                  return `<tr>
                    <td style="border:1px solid #000; padding:3px; white-space:nowrap; text-align:left;">${escaparHTML(b.origenCarga)}</td>
                    <td style="border:1px solid #000; padding:3px; white-space:nowrap;">${escaparHTML(tipoDoc)}</td>
                    <td style="border:1px solid #000; padding:3px; white-space:nowrap;">${escaparHTML(numDoc)}</td>
                    <td style="border:1px solid #000; padding:3px; white-space:nowrap;">${b.cantidad}</td>
                    <td colspan="2" style="border:1px solid #000; padding:3px; white-space:nowrap;">${escaparHTML(b.observacion || '')}</td>
                  </tr>`;
                })
                .join('')}
              <tr bgcolor="#FFFF00" style="font-weight:bold;">
                <td colspan="3" style="border:1px solid #000; padding:4px; text-align:center; white-space:nowrap;">Total de Bultos Origen Centro de Distribución</td>
                <td style="border:1px solid #000; padding:4px; text-align:center; white-space:nowrap;">${totalCentros}</td>
                <td colspan="2" style="border:1px solid #000; padding:4px; white-space:nowrap;"></td>
              </tr>
            `
            : ''
        }

        <!-- Separación -->
        <tr><td colspan="6" style="border:1px solid #000; padding:3px; background:#fff; white-space:nowrap;"></td></tr>

        <!-- SEGMENTOS ADICIONALES -->
        ${
          segmentos.length > 0
            ? `
              <tr>
                <td colspan="6" bgcolor="#B4C6E7" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Segmentos Adicionales</td>
              </tr>
              <tr bgcolor="#B4C6E7">
                <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">Segmento</td>
                <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">Tipo Doc</td>
                <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">N° Doc</td>
                <td style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">Cant. Bultos</td>
                <td colspan="2" style="border:1px solid #000; padding:4px; font-weight:bold; white-space:nowrap;">Observación</td>
              </tr>
              ${segmentos
                .map((b) => {
                  const tipoDoc = esNoAplica(b.tipoDocumento) ? '' : b.tipoDocumento;
                  const numDoc = esNoAplica(b.numeroDocumento) ? '' : b.numeroDocumento;
                  return `<tr>
                    <td style="border:1px solid #000; padding:3px; white-space:nowrap; text-align:left;">${escaparHTML(b.origenCarga)}</td>
                    <td style="border:1px solid #000; padding:3px; white-space:nowrap;">${escaparHTML(tipoDoc)}</td>
                    <td style="border:1px solid #000; padding:3px; white-space:nowrap;">${escaparHTML(numDoc)}</td>
                    <td style="border:1px solid #000; padding:3px; white-space:nowrap;">${b.cantidad}</td>
                    <td colspan="2" style="border:1px solid #000; padding:3px; white-space:nowrap;">${escaparHTML(b.observacion || '')}</td>
                  </tr>`;
                })
                .join('')}
              <tr bgcolor="#FFFF00" style="font-weight:bold;">
                <td colspan="3" style="border:1px solid #000; padding:4px; text-align:center; white-space:nowrap;">Total de bultos Segmentos Adicionales</td>
                <td style="border:1px solid #000; padding:4px; text-align:center; white-space:nowrap;">${totalSegmentos}</td>
                <td colspan="2" style="border:1px solid #000; padding:4px; white-space:nowrap;"></td>
              </tr>
            `
            : ''
        }

        <!-- TOTAL GENERAL -->
        <tr bgcolor="#FFFF00" style="font-weight:bold;">
          <td colspan="3" style="border:1px solid #000; padding:5px; text-align:center; white-space:nowrap;">Total de Bultos Despachados</td>
          <td style="border:1px solid #000; padding:5px; text-align:center; white-space:nowrap;">${totalGeneral}</td>
          <td colspan="2" style="border:1px solid #000; padding:5px; white-space:nowrap;"></td>
        </tr>
      </table>
    `;
  }

  // Contenedor principal como tabla para compatibilidad con Outlook
  const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @media screen and (max-width: 600px) {
            body { font-size: 8px !important; }
            table { font-size: 8px !important; }
            td, th { padding: 1px !important; }
            .contenedor { padding: 3px !important; }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; font-family:Arial, sans-serif; font-size:12px; color:#000;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:750px; margin:0 auto; background:#fff; border:2px solid #000;">
          <tr>
            <td style="padding:15px; text-align:center;">
              <p style="margin:0 0 10px 0; white-space:nowrap;"><strong>${saludo} estimados (as). Se detalla planilla de despacho.</strong></p>
              ${
                totalPallets > 0
                  ? `<p style="margin:0 0 10px 0; font-weight:bold; font-size:14px; white-space:nowrap;">${totalPallets} PALLET${totalPallets > 1 ? 'S' : ''}</p>`
                  : ''
              }
              ${htmlLocales}
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return html;
}

export async function copiarCuadroDespacho(datos: TransporteData): Promise<boolean> {
  const html = generarCuadroHTML(datos);
  try {
    if (navigator.clipboard && navigator.clipboard.write) {
      const clipboardItem = new ClipboardItem({
        'text/html': Promise.resolve(new Blob([html], { type: 'text/html' })),
        'text/plain': Promise.resolve(new Blob([html], { type: 'text/plain' })),
      });
      await navigator.clipboard.write([clipboardItem]);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = html;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch (error) {
    console.error('Error al copiar HTML:', error);
    return false;
  }
}
