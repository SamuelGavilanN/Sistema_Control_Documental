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
  cantidadPallet?: number;
  fechaEntrega?: string; // Agregado
  horaEntrega?: string;  // Agregado
  actas?: string;        // Agregado
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
  if (o.startsWith('CD') || o.startsWith('OUT') || o.startsWith('AGV')) return true;
  if (/^C\d+/.test(o)) return true;
  return false;
}

export function generarCuadroHTML(datos: TransporteData): string {
  const saludo = obtenerSaludo();
  const chofer = escaparHTML(datos.chofer);
  const rut = escaparHTML(datos.rutChofer);
  const celular = escaparHTML(datos.celularChofer);
  const patente = escaparHTML(
    datos.patentePrincipal + (datos.patenteAdicional ? ' / ' + datos.patenteAdicional : '')
  );
  const transportista = escaparHTML(datos.transportista);
  const selloLateral = escaparHTML(datos.selloLateral);
  const selloAdicional = escaparHTML(datos.selloAdicional);
  const administrativo = escaparHTML(datos.administrativo);

  let htmlLocales = '';

  for (const local of datos.locales) {
    // Cada local usa SUS PROPIOS datos
    const codigo = escaparHTML(local.codigo);
    const nombre = escaparHTML(local.nombre);
    const selloTraseroLocal = escaparHTML(local.selloTrasero || '');
    const cantidadPallet = local.cantidadPallet || 0;
    const fechaLocal = formatearFechaLarga(local.fechaEntrega || '');
    const horaLocal = formatearHora(local.horaEntrega || '');
    const actasLocal = escaparHTML(local.actas || '');

    const centros = local.bultos.filter(b => esCentroDistribucion(b.origenCarga));
    const segmentos = local.bultos.filter(b => !esCentroDistribucion(b.origenCarga));

    const totalCentros = centros.reduce((s, b) => s + b.cantidad, 0);
    const totalSegmentos = segmentos.reduce((s, b) => s + b.cantidad, 0);
    const totalGeneral = totalCentros + totalSegmentos;

    // Encabezado de pallets por local (solo si es mayor a 0)
    if (cantidadPallet > 0) {
      htmlLocales += `
        <p style="margin:0 0 5px 0 !important; font-weight:bold !important; font-size:20px !important; color:#ff0000 !important; white-space:nowrap !important;">
          ${cantidadPallet} PALLET${cantidadPallet !== 1 ? 'S' : ''}
        </p>
      `;
    }

    // ===== TABLA ÚNICA DEL LOCAL (con sus propios datos) =====
    htmlLocales += `
      <table style="width:100%; border-collapse:collapse; margin-bottom:60px; font-family:Arial, sans-serif; font-size:12px; text-align:center; table-layout:auto;">

        <!-- Campos largos -->
        <tr>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Nombre Local</td>
          <td colspan="5" style="border:1px solid #000; padding:5px; white-space:nowrap;"><strong>${codigo}-${nombre}</strong></td>
        </tr>
        <tr>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Actas Entrega</td>
          <td colspan="5" style="border:1px solid #000; padding:5px; white-space:nowrap;">${actasLocal}</td>
        </tr>
        <tr>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Administrativo</td>
          <td colspan="5" style="border:1px solid #000; padding:5px; white-space:nowrap;">${administrativo}</td>
        </tr>

        <!-- Separación -->
        <tr><td colspan="6" style="border:1px solid #000; padding:3px; background:#fff; white-space:nowrap;"></td></tr>

        <!-- Campos en pares (usando datos DEL LOCAL) -->
        <tr>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Fecha Entrega</td>
          <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${fechaLocal}</td>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Hora Entrega</td>
          <td colspan="3" style="border:1px solid #000; padding:5px; white-space:nowrap;">${horaLocal}</td>
        </tr>
        <tr>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Conductor</td>
          <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${chofer}</td>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Patente</td>
          <td colspan="3" style="border:1px solid #000; padding:5px; white-space:nowrap;">${patente}</td>
        </tr>
        <tr>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Rut</td>
          <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${rut}</td>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Sello Trasero</td>
          <td colspan="3" style="border:1px solid #000; padding:5px; white-space:nowrap;">${selloTraseroLocal}</td>
        </tr>
        <tr>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Empresa</td>
          <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${transportista}</td>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Sello Lateral</td>
          <td colspan="3" style="border:1px solid #000; padding:5px; white-space:nowrap;">${selloLateral}</td>
        </tr>
        <tr>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Teléfono</td>
          <td style="border:1px solid #000; padding:5px; white-space:nowrap;">${celular}</td>
          <td bgcolor="#ff7c7c" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Sello Adicional</td>
          <td colspan="3" style="border:1px solid #000; padding:5px; white-space:nowrap;">${selloAdicional}</td>
        </tr>

        <!-- Separación -->
        <tr><td colspan="6" style="border:1px solid #000; padding:3px; background:#fff; white-space:nowrap;"></td></tr>

        <!-- CENTROS DE DISTRIBUCIÓN -->
        ${
          centros.length > 0
            ? `
              <tr>
                <td colspan="6" bgcolor="#8ab3ff" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Centro de Distribución</td>
              </tr>
              <tr bgcolor="#8ab3ff">
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
              <tr bgcolor="#fff665" style="font-weight:bold;">
                <td colspan="3" style="border:1px solid #000; padding:4px; text-align:center; white-space:nowrap;">Total de Bultos Origen Centro de Distribución</td>
                <td style="border:1px solid #000; padding:4px; text-align:center; white-space:nowrap;">${totalCentros}</td>
                <td colspan="2" style="border:1px solid #000; padding:4px;"></td>
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
                <td colspan="6" bgcolor="#8ab3ff" style="border:1px solid #000; padding:5px; font-weight:bold; white-space:nowrap;">Segmentos Adicionales</td>
              </tr>
              <tr bgcolor="#8ab3ff">
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
              <tr bgcolor="#fff665" style="font-weight:bold;">
                <td colspan="3" style="border:1px solid #000; padding:4px; text-align:center; white-space:nowrap;">Total de bultos Segmentos Adicionales</td>
                <td style="border:1px solid #000; padding:4px; text-align:center; white-space:nowrap;">${totalSegmentos}</td>
                <td colspan="2" style="border:1px solid #000; padding:4px;"></td>
              </tr>
            `
            : ''
        }

        <!-- TOTAL GENERAL -->
        <tr bgcolor="#fff665" style="font-weight:bold;">
          <td colspan="3" style="border:1px solid #000; padding:5px; text-align:center; white-space:nowrap;">Total de Bultos Despachados</td>
          <td style="border:1px solid #000; padding:5px; text-align:center; white-space:nowrap;">${totalGeneral}</td>
          <td colspan="2" style="border:1px solid #000; padding:5px; white-space:nowrap;"></td>
        </tr>
      </table>
    `;
  }

  // Contenedor principal
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
              <p style="margin:0 0 20px 0; white-space:nowrap;"><strong>${saludo} estimados (as). Se detalla planilla de despacho.</strong></p>
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
