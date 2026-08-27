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
  fiscal: string;
  administrativo: string;
  actasInformadas: string;
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

function escaparHTML(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generarCuadroHTML(datos: TransporteData): string {
  const saludo = obtenerSaludo();

  // Datos generales
  const fecha = escaparHTML(datos.fechaEntrega);
  const hora = escaparHTML(datos.horaEntrega);
  const chofer = escaparHTML(datos.chofer);
  const rut = escaparHTML(datos.rutChofer);
  const celular = escaparHTML(datos.celularChofer);
  const patente = escaparHTML(
    datos.patentePrincipal + (datos.patenteAdicional ? ' / ' + datos.patenteAdicional : '')
  );
  const transportista = escaparHTML(datos.transportista);
  const selloTrasero = escaparHTML(datos.selloTrasero);
  const selloLateral = escaparHTML(datos.selloLateral);
  const selloAdicional = escaparHTML(datos.selloAdicional);
  const actas = escaparHTML(datos.actasInformadas);
  const administrativo = escaparHTML(datos.administrativo);

  // Construir HTML para cada local
  let htmlLocal = '';
  for (const local of datos.locales) {
    const codigo = escaparHTML(local.codigo);
    const nombre = escaparHTML(local.nombre);
    const selloLocal = escaparHTML(local.selloTrasero || selloTrasero);

    // Separar bultos en Centros de Distribución (CD) y Segmentos (SG/OUT)
    const centros = local.bultos.filter(b => b.origenCarga.toUpperCase().startsWith('CD'));
    const segmentos = local.bultos.filter(b => !b.origenCarga.toUpperCase().startsWith('CD'));

    const totalCentros = centros.reduce((s, b) => s + b.cantidad, 0);
    const totalSegmentos = segmentos.reduce((s, b) => s + b.cantidad, 0);
    const totalGeneral = totalCentros + totalSegmentos;

    // Tabla de Centros de Distribución
    let tablaCentros = '';
    if (centros.length > 0) {
      let filas = '';
      for (const b of centros) {
        filas += `<tr>
          <td>${escaparHTML(b.origenCarga)}</td>
          <td>${escaparHTML(b.tipoDocumento || '')}</td>
          <td>${escaparHTML(b.numeroDocumento || '')}</td>
          <td style="text-align:right;">${b.cantidad}</td>
          <td>${escaparHTML(b.observacion || '')}</td>
        </tr>`;
      }
      tablaCentros = `
        <table style="width:100%; border-collapse:collapse; margin-top:5px;">
          <tr style="background:#d9e2f3;">
            <th style="border:1px solid #000; padding:4px; text-align:left;">Centro de Distribución</th>
            <th style="border:1px solid #000; padding:4px; text-align:left;">Tipo de Documento</th>
            <th style="border:1px solid #000; padding:4px; text-align:left;">Número de Documento</th>
            <th style="border:1px solid #000; padding:4px; text-align:right;">Cantidad Bultos</th>
            <th style="border:1px solid #000; padding:4px; text-align:left;">Observación</th>
          </tr>
          ${filas}
          <tr style="background:#f2f2f2; font-weight:bold;">
            <td colspan="3" style="border:1px solid #000; padding:4px;">Total de Bultos Origen Centro de Distribución</td>
            <td style="border:1px solid #000; padding:4px; text-align:right;">${totalCentros}</td>
            <td style="border:1px solid #000; padding:4px;"></td>
          </tr>
        </table>`;
    }

    // Tabla de Segmentos Adicionales
    let tablaSegmentos = '';
    if (segmentos.length > 0) {
      let filas = '';
      for (const b of segmentos) {
        filas += `<tr>
          <td>${escaparHTML(b.origenCarga)}</td>
          <td>${escaparHTML(b.tipoDocumento || '')}</td>
          <td>${escaparHTML(b.numeroDocumento || '')}</td>
          <td style="text-align:right;">${b.cantidad}</td>
          <td>${escaparHTML(b.observacion || '')}</td>
        </tr>`;
      }
      tablaSegmentos = `
        <table style="width:100%; border-collapse:collapse; margin-top:10px;">
          <tr style="background:#d9e2f3;">
            <th style="border:1px solid #000; padding:4px; text-align:left;">Segmentos Adicionales</th>
            <th style="border:1px solid #000; padding:4px; text-align:left;">Tipo de Documento</th>
            <th style="border:1px solid #000; padding:4px; text-align:left;">Número de Documento</th>
            <th style="border:1px solid #000; padding:4px; text-align:right;">Cantidad Bultos</th>
            <th style="border:1px solid #000; padding:4px; text-align:left;">Observación</th>
          </tr>
          ${filas}
          <tr style="background:#f2f2f2; font-weight:bold;">
            <td colspan="3" style="border:1px solid #000; padding:4px;">Total de bultos Segmentos Adicionales</td>
            <td style="border:1px solid #000; padding:4px; text-align:right;">${totalSegmentos}</td>
            <td style="border:1px solid #000; padding:4px;"></td>
          </tr>
        </table>`;
    }

    // Tabla de Total General
    let tablaTotal = '';
    if (totalGeneral > 0) {
      tablaTotal = `
        <table style="width:100%; border-collapse:collapse; margin-top:10px;">
          <tr style="background:#ffff00; font-weight:bold;">
            <td colspan="3" style="border:1px solid #000; padding:4px;">Total de Bultos Despachados</td>
            <td style="border:1px solid #000; padding:4px; text-align:right;">${totalGeneral}</td>
            <td style="border:1px solid #000; padding:4px;"></td>
          </tr>
        </table>`;
    }

    htmlLocal += `
      <div style="margin-top:15px; border-top:2px solid #000; padding-top:10px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:4px; width:30%;"><strong>Nombre Local</strong></td>
            <td style="padding:4px; border:1px solid #000;">${codigo}-${nombre}</td>
          </tr>
          <tr>
            <td style="padding:4px;"><strong>Actas Entrega</strong></td>
            <td style="padding:4px; border:1px solid #000;">${actas}</td>
          </tr>
          <tr>
            <td style="padding:4px;"><strong>Fecha Entrega</strong></td>
            <td style="padding:4px; border:1px solid #000;">${fecha}</td>
            <td style="padding:4px;"><strong>Hora Entrega</strong></td>
            <td style="padding:4px; border:1px solid #000;">${hora}</td>
          </tr>
        </table>

        <table style="width:100%; border-collapse:collapse; margin-top:10px;">
          <tr>
            <td style="padding:4px; width:30%;"><strong>Conductor</strong></td>
            <td style="padding:4px; border:1px solid #000;">${chofer}</td>
            <td style="padding:4px; width:15%;"><strong>Patente</strong></td>
            <td style="padding:4px; border:1px solid #000;">${patente}</td>
          </tr>
          <tr>
            <td style="padding:4px;"><strong>Rut</strong></td>
            <td style="padding:4px; border:1px solid #000;">${rut}</td>
            <td style="padding:4px;"><strong>Sello Trasero</strong></td>
            <td style="padding:4px; border:1px solid #000;">${selloLocal}</td>
          </tr>
          <tr>
            <td style="padding:4px;"><strong>Empresa</strong></td>
            <td style="padding:4px; border:1px solid #000;">${transportista}</td>
            <td style="padding:4px;"><strong>Sello Lateral</strong></td>
            <td style="padding:4px; border:1px solid #000;">${selloLateral}</td>
          </tr>
          <tr>
            <td style="padding:4px;"><strong>Teléfono</strong></td>
            <td style="padding:4px; border:1px solid #000;">${celular}</td>
            <td style="padding:4px;"><strong>Sello Adicional</strong></td>
            <td style="padding:4px; border:1px solid #000;">${selloAdicional}</td>
          </tr>
        </table>

        ${tablaCentros}
        ${tablaSegmentos}
        ${tablaTotal}
      </div>
    `;
  }

  // Estructura general del correo
  const html = `
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; font-size: 12px; color:#000; margin:0; padding:0;">
        <div style="max-width: 800px; margin: 0 auto; border: 2px solid #000; padding: 15px; background: #fff;">
          <p style="margin-top:0;">${saludo} estimados (as). Se detalla planilla de despacho.</p>
          <p style="margin:5px 0; font-weight:bold;">1 PALLET</p>
          ${htmlLocal}
        </div>
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
