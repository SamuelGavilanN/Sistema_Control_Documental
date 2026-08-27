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
  const fecha = escaparHTML(datos.fechaEntrega);
  const hora = escaparHTML(datos.horaEntrega);
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

  // Construir el HTML para cada local
  let htmlLocales = '';

  for (const local of datos.locales) {
    const codigo = escaparHTML(local.codigo);
    const nombre = escaparHTML(local.nombre);
    const selloTrasero = escaparHTML(local.selloTrasero || selloTraseroGlobal);

    // Separar bultos en Centros (CD) y Segmentos (SG/OUT)
    const centros = local.bultos.filter(b => b.origenCarga.toUpperCase().startsWith('CD'));
    const segmentos = local.bultos.filter(b => !b.origenCarga.toUpperCase().startsWith('CD'));

    const totalCentros = centros.reduce((s, b) => s + b.cantidad, 0);
    const totalSegmentos = segmentos.reduce((s, b) => s + b.cantidad, 0);
    const totalGeneral = totalCentros + totalSegmentos;

    // Tabla de centros
    let tablaCentros = '';
    if (centros.length > 0) {
      let filas = '';
      for (const b of centros) {
        filas += `<tr>
          <td style="border:1px solid #000; padding:3px;">${escaparHTML(b.origenCarga)}</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${escaparHTML(b.tipoDocumento || '')}</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${escaparHTML(b.numeroDocumento || '')}</td>
          <td style="border:1px solid #000; padding:3px; text-align:right;">${b.cantidad}</td>
          <td style="border:1px solid #000; padding:3px;">${escaparHTML(b.observacion || '')}</td>
        </tr>`;
      }
      tablaCentros = `
        <tr><td colspan="5" style="background:#f2f2f2; border:1px solid #000; padding:4px; font-weight:bold; text-align:center;">DETALLE DE CARGA (Centros de Distribución)</td></tr>
        <tr style="background:#d9e2f3;">
          <th style="border:1px solid #000; padding:3px; text-align:left;">Centro de Distribución</th>
          <th style="border:1px solid #000; padding:3px; text-align:center;">Tipo Doc</th>
          <th style="border:1px solid #000; padding:3px; text-align:center;">N° Doc</th>
          <th style="border:1px solid #000; padding:3px; text-align:right;">Cant.</th>
          <th style="border:1px solid #000; padding:3px;">Observación</th>
        </tr>
        ${filas}
        <tr style="background:#f2f2f2; font-weight:bold;">
          <td colspan="3" style="border:1px solid #000; padding:3px;">Total de Bultos Origen Centro de Distribución</td>
          <td style="border:1px solid #000; padding:3px; text-align:right;">${totalCentros}</td>
          <td style="border:1px solid #000; padding:3px;"></td>
        </tr>`;
    }

    // Tabla de segmentos
    let tablaSegmentos = '';
    if (segmentos.length > 0) {
      let filas = '';
      for (const b of segmentos) {
        filas += `<tr>
          <td style="border:1px solid #000; padding:3px;">${escaparHTML(b.origenCarga)}</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${escaparHTML(b.tipoDocumento || '')}</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${escaparHTML(b.numeroDocumento || '')}</td>
          <td style="border:1px solid #000; padding:3px; text-align:right;">${b.cantidad}</td>
          <td style="border:1px solid #000; padding:3px;">${escaparHTML(b.observacion || '')}</td>
        </tr>`;
      }
      tablaSegmentos = `
        <tr><td colspan="5" style="background:#f2f2f2; border:1px solid #000; padding:4px; font-weight:bold; text-align:center;">SEGMENTOS ADICIONALES</td></tr>
        <tr style="background:#d9e2f3;">
          <th style="border:1px solid #000; padding:3px; text-align:left;">Segmento</th>
          <th style="border:1px solid #000; padding:3px; text-align:center;">Tipo Doc</th>
          <th style="border:1px solid #000; padding:3px; text-align:center;">N° Doc</th>
          <th style="border:1px solid #000; padding:3px; text-align:right;">Cant.</th>
          <th style="border:1px solid #000; padding:3px;">Observación</th>
        </tr>
        ${filas}
        <tr style="background:#f2f2f2; font-weight:bold;">
          <td colspan="3" style="border:1px solid #000; padding:3px;">Total de bultos Segmentos Adicionales</td>
          <td style="border:1px solid #000; padding:3px; text-align:right;">${totalSegmentos}</td>
          <td style="border:1px solid #000; padding:3px;"></td>
        </tr>`;
    }

    // Total general
    let totalGeneralHTML = '';
    if (totalGeneral > 0) {
      totalGeneralHTML = `
        <tr style="background:#ffff00; font-weight:bold;">
          <td colspan="3" style="border:1px solid #000; padding:3px;">Total de Bultos Despachados</td>
          <td style="border:1px solid #000; padding:3px; text-align:right;">${totalGeneral}</td>
          <td style="border:1px solid #000; padding:3px;"></td>
        </tr>`;
    }

    // Construcción de la tabla principal del local
    htmlLocales += `
      <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
        <!-- Título -->
        <tr><td colspan="4" style="background:#ffff00; border:2px solid #000; padding:6px; text-align:center; font-weight:bold; font-size:14px;">PLANILLA DE DESPACHO - ${codigo} ${nombre}</td></tr>
        
        <!-- Datos del transporte -->
        <tr><td colspan="4" style="background:#f2f2f2; border:1px solid #000; padding:4px; font-weight:bold; text-align:center;">DETALLE DE TRANSPORTE</td></tr>
        <tr>
          <td style="border:1px solid #000; padding:4px; width:20%;"><strong>Nombre Local</strong></td>
          <td style="border:1px solid #000; padding:4px; width:30%;">${codigo}-${nombre}</td>
          <td style="border:1px solid #000; padding:4px; width:20%;"><strong>Actas Entrega</strong></td>
          <td style="border:1px solid #000; padding:4px; width:30%;" colspan="1">${actas}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:4px;"><strong>Fecha Entrega</strong></td>
          <td style="border:1px solid #000; padding:4px;">${fecha}</td>
          <td style="border:1px solid #000; padding:4px;"><strong>Hora Entrega</strong></td>
          <td style="border:1px solid #000; padding:4px;">${hora}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:4px;"><strong>Conductor</strong></td>
          <td style="border:1px solid #000; padding:4px;">${chofer}</td>
          <td style="border:1px solid #000; padding:4px;"><strong>Rut</strong></td>
          <td style="border:1px solid #000; padding:4px;" colspan="1">${rut}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:4px;"><strong>Empresa</strong></td>
          <td style="border:1px solid #000; padding:4px;">${transportista}</td>
          <td style="border:1px solid #000; padding:4px;"><strong>Teléfono</strong></td>
          <td style="border:1px solid #000; padding:4px;" colspan="1">${celular}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:4px;"><strong>Patente</strong></td>
          <td style="border:1px solid #000; padding:4px;">${patente}</td>
          <td style="border:1px solid #000; padding:4px;"><strong>Administrativo</strong></td>
          <td style="border:1px solid #000; padding:4px;" colspan="1">${administrativo}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:4px;"><strong>Sello Trasero</strong></td>
          <td style="border:1px solid #000; padding:4px;">${selloTrasero}</td>
          <td style="border:1px solid #000; padding:4px;"><strong>Sello Lateral</strong></td>
          <td style="border:1px solid #000; padding:4px;" colspan="1">${selloLateral}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:4px;"><strong>Sello Adicional</strong></td>
          <td style="border:1px solid #000; padding:4px;" colspan="3">${selloAdicional}</td>
        </tr>

        ${tablaCentros}
        ${tablaSegmentos}
        ${totalGeneralHTML}
      </table>
    `;
  }

  // HTML final del correo
  const html = `
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; font-size: 12px; color:#000; margin:0; padding:0;">
        <div style="max-width: 800px; margin: 0 auto; padding: 10px;">
          <p style="margin:0 0 10px 0;">${saludo} estimados (as). Se detalla planilla de despacho.</p>
          <p style="margin:0 0 10px 0; font-weight:bold;">1 PALLET</p>
          ${htmlLocales}
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
