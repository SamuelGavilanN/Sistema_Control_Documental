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
  const totalPallets = datos.totalPallets || 0;

  let htmlLocales = '';

  for (const local of datos.locales) {
    const codigo = escaparHTML(local.codigo);
    const nombre = escaparHTML(local.nombre);
    const selloTrasero = escaparHTML(local.selloTrasero || selloTraseroGlobal);

    const centros = local.bultos.filter(b => esCentroDistribucion(b.origenCarga));
    const segmentos = local.bultos.filter(b => !esCentroDistribucion(b.origenCarga));

    const totalCentros = centros.reduce((s, b) => s + b.cantidad, 0);
    const totalSegmentos = segmentos.reduce((s, b) => s + b.cantidad, 0);
    const totalGeneral = totalCentros + totalSegmentos;

    // ---------- Tabla principal del local (7 columnas) ----------
    htmlLocales += `
      <table style="width:100%; border-collapse:collapse; margin-bottom:40px; font-family:Arial, sans-serif; font-size:12px; text-align:center; table-layout:fixed;">
        <colgroup>
          <col style="width:10%;">
          <col style="width:15%;">
          <col style="width:15%;">
          <col style="width:15%;">
          <col style="width:10%;">
          <col style="width:15%;">
          <col style="width:20%;">
        </colgroup>
        <tr>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Nombre Local</td>
          <td colspan="6" style="border:1px solid #000; padding:5px;"><strong>${codigo}-${nombre}</strong></td>
        </tr>
        <tr>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Actas Entrega</td>
          <td colspan="6" style="border:1px solid #000; padding:5px;">${actas}</td>
        </tr>
        <tr>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Administrativo</td>
          <td colspan="6" style="border:1px solid #000; padding:5px;">${administrativo}</td>
        </tr>
        <tr>
          <td colspan="7" style="border:1px solid #000; padding:3px; background:#fff;"></td>
        </tr>
        <tr>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Fecha Entrega</td>
          <td colspan="2" style="border:1px solid #000; padding:5px;">${fecha}</td>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Hora Entrega</td>
          <td colspan="3" style="border:1px solid #000; padding:5px;">${hora}</td>
        </tr>
        <tr>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Conductor</td>
          <td colspan="2" style="border:1px solid #000; padding:5px;">${chofer}</td>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Patente</td>
          <td colspan="3" style="border:1px solid #000; padding:5px;">${patente}</td>
        </tr>
        <tr>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Rut</td>
          <td colspan="2" style="border:1px solid #000; padding:5px;">${rut}</td>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Sello Trasero</td>
          <td colspan="3" style="border:1px solid #000; padding:5px;">${selloTrasero}</td>
        </tr>
        <tr>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Empresa</td>
          <td colspan="2" style="border:1px solid #000; padding:5px;">${transportista}</td>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Sello Lateral</td>
          <td colspan="3" style="border:1px solid #000; padding:5px;">${selloLateral}</td>
        </tr>
        <tr>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Telefono</td>
          <td colspan="2" style="border:1px solid #000; padding:5px;">${celular}</td>
          <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Sello Adicional</td>
          <td colspan="3" style="border:1px solid #000; padding:5px;">${selloAdicional}</td>
        </tr>
        <tr>
          <td colspan="7" style="border:1px solid #000; padding:3px; background:#fff;"></td>
        </tr>

        ${
          centros.length > 0
            ? `
              <tr>
                <td colspan="7" bgcolor="#B4C6E7" style="border:1px solid #000; padding:5px; font-weight:bold;">Centro de Distribución</td>
              </tr>
              <tr bgcolor="#B4C6E7">
                <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">Centro de Distribución</td>
                <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">Tipo Doc</td>
                <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">N° Doc</td>
                <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">Cant. Bultos</td>
                <td colspan="3" style="border:1px solid #000; padding:4px; font-weight:bold;">Observación</td>
              </tr>
              ${centros
                .map((b) => {
                  const tipoDoc = esNoAplica(b.tipoDocumento) ? '' : b.tipoDocumento;
                  const numDoc = esNoAplica(b.numeroDocumento) ? '' : b.numeroDocumento;
                  return `<tr>
                    <td colspan="1" style="border:1px solid #000; padding:3px;">${escaparHTML(b.origenCarga)}</td>
                    <td colspan="1" style="border:1px solid #000; padding:3px;">${escaparHTML(tipoDoc)}</td>
                    <td colspan="1" style="border:1px solid #000; padding:3px;">${escaparHTML(numDoc)}</td>
                    <td colspan="1" style="border:1px solid #000; padding:3px;">${b.cantidad}</td>
                    <td colspan="3" style="border:1px solid #000; padding:3px;">${escaparHTML(b.observacion || '')}</td>
                  </tr>`;
                })
                .join('')}
              <tr bgcolor="#FFFF00" style="font-weight:bold;">
                <td colspan="3" style="border:1px solid #000; padding:4px; text-align:center;">Total de Bultos Origen Centro de Distribución</td>
                <td colspan="1" style="border:1px solid #000; padding:4px; text-align:center;">${totalCentros}</td>
                <td colspan="3" style="border:1px solid #000; padding:4px;"></td>
              </tr>
            `
            : ''
        }

        <tr>
          <td colspan="7" style="border:1px solid #000; padding:3px; background:#fff;"></td>
        </tr>

        ${
          segmentos.length > 0
            ? `
              <tr>
                <td colspan="7" bgcolor="#B4C6E7" style="border:1px solid #000; padding:5px; font-weight:bold;">Segmentos Adicionales</td>
              </tr>
              <tr bgcolor="#B4C6E7">
                <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">Segmento</td>
                <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">Tipo Doc</td>
                <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">N° Doc</td>
                <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">Cant. Bultos</td>
                <td colspan="3" style="border:1px solid #000; padding:4px; font-weight:bold;">Observación</td>
              </tr>
              ${segmentos
                .map((b) => {
                  const tipoDoc = esNoAplica(b.tipoDocumento) ? '' : b.tipoDocumento;
                  const numDoc = esNoAplica(b.numeroDocumento) ? '' : b.numeroDocumento;
                  return `<tr>
                    <td colspan="1" style="border:1px solid #000; padding:3px;">${escaparHTML(b.origenCarga)}</td>
                    <td colspan="1" style="border:1px solid #000; padding:3px;">${escaparHTML(tipoDoc)}</td>
                    <td colspan="1" style="border:1px solid #000; padding:3px;">${escaparHTML(numDoc)}</td>
                    <td colspan="1" style="border:1px solid #000; padding:3px;">${b.cantidad}</td>
                    <td colspan="3" style="border:1px solid #000; padding:3px;">${escaparHTML(b.observacion || '')}</td>
                  </tr>`;
                })
                .join('')}
              <tr bgcolor="#FFFF00" style="font-weight:bold;">
                <td colspan="3" style="border:1px solid #000; padding:4px; text-align:center;">Total de bultos Segmentos Adicionales</td>
                <td colspan="1" style="border:1px solid #000; padding:4px; text-align:center;">${totalSegmentos}</td>
                <td colspan="3" style="border:1px solid #000; padding:4px;"></td>
              </tr>
            `
            : ''
        }

        <tr bgcolor="#FFFF00" style="font-weight:bold;">
          <td colspan="3" style="border:1px solid #000; padding:5px; text-align:center;">Total de Bultos Despachados</td>
          <td colspan="1" style="border:1px solid #000; padding:5px; text-align:center;">${totalGeneral}</td>
          <td colspan="3" style="border:1px solid #000; padding:5px;"></td>
        </tr>
      </table>
    `;
  }

  // HTML final con contenedor principal y saludo arriba (una sola vez)
  const html = `
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; font-size: 12px; color:#000; margin:0; padding:0;">
        <div style="max-width: 800px; margin: 0 auto; border: 2px solid #000; padding: 15px; background: #fff; text-align: center;">
          <p style="margin:0 0 10px 0;">${saludo} estimados (as). Se detalla planilla de despacho.</p>
          ${
            totalPallets > 0
              ? `<p style="margin:0 0 10px 0; font-weight:bold; font-size:14px;">${totalPallets} PALLET${totalPallets > 1 ? 'S' : ''}</p>`
              : ''
          }
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
