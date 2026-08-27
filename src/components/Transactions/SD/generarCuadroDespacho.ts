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

  // Verificar si hay al menos un pallet
  const hayPallet = datos.locales.some(local => (local.cantidadPallet || 0) > 0);

  // Construir el contenido interno de la tabla (todas las filas de todos los locales)
  let filasLocales = '';

  for (const local of datos.locales) {
    const codigo = escaparHTML(local.codigo);
    const nombre = escaparHTML(local.nombre);
    const selloTrasero = escaparHTML(local.selloTrasero || selloTraseroGlobal);
    const cantidadPallet = local.cantidadPallet || 0;

    const centros = local.bultos.filter(b => b.origenCarga.toUpperCase().startsWith('CD'));
    const segmentos = local.bultos.filter(b => !b.origenCarga.toUpperCase().startsWith('CD'));

    const totalCentros = centros.reduce((s, b) => s + b.cantidad, 0);
    const totalSegmentos = segmentos.reduce((s, b) => s + b.cantidad, 0);
    const totalGeneral = totalCentros + totalSegmentos;

    // ----- Filas de transporte de este local -----
    filasLocales += `
      <!-- Nombre Local -->
      <tr>
        <td colspan="2" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Nombre Local</td>
        <td colspan="5" style="border:1px solid #000; padding:5px;">${codigo}-${nombre}</td>
      </tr>
      <!-- Actas Entrega -->
      <tr>
        <td colspan="2" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Actas Entrega</td>
        <td colspan="5" style="border:1px solid #000; padding:5px;">${actas}</td>
      </tr>
      <!-- Fecha Entrega / Hora Entrega -->
      <tr>
        <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Fecha Entrega</td>
        <td colspan="2" style="border:1px solid #000; padding:5px;">${fecha}</td>
        <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Hora Entrega</td>
        <td colspan="3" style="border:1px solid #000; padding:5px;">${hora}</td>
      </tr>
      <!-- Conductor / Patente -->
      <tr>
        <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Conductor</td>
        <td colspan="2" style="border:1px solid #000; padding:5px;">${chofer}</td>
        <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Patente</td>
        <td colspan="3" style="border:1px solid #000; padding:5px;">${patente}</td>
      </tr>
      <!-- Rut / Sello Trasero -->
      <tr>
        <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Rut</td>
        <td colspan="2" style="border:1px solid #000; padding:5px;">${rut}</td>
        <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Sello Trasero</td>
        <td colspan="3" style="border:1px solid #000; padding:5px;">${selloTrasero}</td>
      </tr>
      <!-- Empresa / Sello Lateral -->
      <tr>
        <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Empresa</td>
        <td colspan="2" style="border:1px solid #000; padding:5px;">${transportista}</td>
        <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Sello Lateral</td>
        <td colspan="3" style="border:1px solid #000; padding:5px;">${selloLateral}</td>
      </tr>
      <!-- Telefono / Sello Adicional -->
      <tr>
        <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Telefono</td>
        <td colspan="2" style="border:1px solid #000; padding:5px;">${celular}</td>
        <td colspan="1" bgcolor="#F8CBAD" style="border:1px solid #000; padding:5px; font-weight:bold;">Sello Adicional</td>
        <td colspan="3" style="border:1px solid #000; padding:5px;">${selloAdicional}</td>
      </tr>
      <!-- Separación -->
      <tr>
        <td colspan="7" style="border:1px solid #000; padding:3px; background:#fff;"></td>
      </tr>
    `;

    // ----- Subtitulo Centros -----
    if (centros.length > 0) {
      filasLocales += `
        <tr>
          <td colspan="7" bgcolor="#B4C6E7" style="border:1px solid #000; padding:5px; font-weight:bold;">Centro de Distribución</td>
        </tr>
        <tr bgcolor="#B4C6E7">
          <td colspan="2" style="border:1px solid #000; padding:4px; font-weight:bold;">Centro de Distribución</td>
          <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">Tipo de Documento</td>
          <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">Numero de Documento</td>
          <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">Cantidad Bultos</td>
          <td colspan="2" style="border:1px solid #000; padding:4px; font-weight:bold;">Observación</td>
        </tr>
        ${centros.map(b => {
          const tipoDoc = esNoAplica(b.tipoDocumento) ? '' : b.tipoDocumento;
          const numDoc = esNoAplica(b.numeroDocumento) ? '' : b.numeroDocumento;
          return `<tr>
            <td colspan="2" style="border:1px solid #000; padding:3px;">${escaparHTML(b.origenCarga)}</td>
            <td colspan="1" style="border:1px solid #000; padding:3px;">${escaparHTML(tipoDoc)}</td>
            <td colspan="1" style="border:1px solid #000; padding:3px;">${escaparHTML(numDoc)}</td>
            <td colspan="1" style="border:1px solid #000; padding:3px;">${b.cantidad}</td>
            <td colspan="2" style="border:1px solid #000; padding:3px;">${escaparHTML(b.observacion || '')}</td>
          </tr>`;
        }).join('')}
        <tr bgcolor="#FFFF00" style="font-weight:bold;">
          <td colspan="3" style="border:1px solid #000; padding:4px; text-align:center;">Total de Bultos Origen Centro de Distribución</td>
          <td colspan="1" style="border:1px solid #000; padding:4px; text-align:center;">${totalCentros}</td>
          <td colspan="3" style="border:1px solid #000; padding:4px;"></td>
        </tr>
        <tr>
          <td colspan="7" style="border:1px solid #000; padding:3px; background:#fff;"></td>
        </tr>
      `;
    }

    // ----- Subtitulo Segmentos -----
    if (segmentos.length > 0) {
      filasLocales += `
        <tr>
          <td colspan="7" bgcolor="#B4C6E7" style="border:1px solid #000; padding:5px; font-weight:bold;">Segmentos Adicionales</td>
        </tr>
        <tr bgcolor="#B4C6E7">
          <td colspan="2" style="border:1px solid #000; padding:4px; font-weight:bold;">Segmentos Adicionales</td>
          <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">Tipo de Documento</td>
          <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">Numero de Documento</td>
          <td colspan="1" style="border:1px solid #000; padding:4px; font-weight:bold;">Cantidad Bultos</td>
          <td colspan="2" style="border:1px solid #000; padding:4px; font-weight:bold;">Observación</td>
        </tr>
        ${segmentos.map(b => {
          const tipoDoc = esNoAplica(b.tipoDocumento) ? '' : b.tipoDocumento;
          const numDoc = esNoAplica(b.numeroDocumento) ? '' : b.numeroDocumento;
          return `<tr>
            <td colspan="2" style="border:1px solid #000; padding:3px;">${escaparHTML(b.origenCarga)}</td>
            <td colspan="1" style="border:1px solid #000; padding:3px;">${escaparHTML(tipoDoc)}</td>
            <td colspan="1" style="border:1px solid #000; padding:3px;">${escaparHTML(numDoc)}</td>
            <td colspan="1" style="border:1px solid #000; padding:3px;">${b.cantidad}</td>
            <td colspan="2" style="border:1px solid #000; padding:3px;">${escaparHTML(b.observacion || '')}</td>
          </tr>`;
        }).join('')}
        <tr bgcolor="#FFFF00" style="font-weight:bold;">
          <td colspan="3" style="border:1px solid #000; padding:4px; text-align:center;">Total de bultos Segmentos Adicionales</td>
          <td colspan="1" style="border:1px solid #000; padding:4px; text-align:center;">${totalSegmentos}</td>
          <td colspan="3" style="border:1px solid #000; padding:4px;"></td>
        </tr>
        <tr>
          <td colspan="7" style="border:1px solid #000; padding:3px; background:#fff;"></td>
        </tr>
      `;
    }

    // ----- Total General -----
    if (totalGeneral > 0) {
      filasLocales += `
        <tr bgcolor="#FFFF00" style="font-weight:bold;">
          <td colspan="3" style="border:1px solid #000; padding:5px; text-align:center;">Total de Bultos Despachados</td>
          <td colspan="1" style="border:1px solid #000; padding:5px; text-align:center;">${totalGeneral}</td>
          <td colspan="3" style="border:1px solid #000; padding:5px;"></td>
        </tr>
      `;
    }

    // Separación entre locales (si no es el último)
    if (datos.locales.indexOf(local) < datos.locales.length - 1) {
      filasLocales += `
        <tr>
          <td colspan="7" style="border:1px solid #000; padding:8px; background:#fff;"></td>
        </tr>
      `;
    }
  }

  // Construir la tabla única final
  const html = `
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; font-size: 12px; color:#000; margin:0; padding:0;">
        <table style="width:100%; border-collapse:collapse; text-align:center;">
          <!-- Saludo -->
          <tr>
            <td colspan="7" style="border:1px solid #000; padding:6px; text-align:center; font-size:13px;">${saludo} estimados (as). Se detalla planilla de despacho.</td>
          </tr>
          <!-- 1 PALLET (solo si hay pallets) -->
          <tr>
            <td colspan="7" style="border:1px solid #000; padding:6px; text-align:center; font-weight:bold; font-size:14px;">${hayPallet ? '1 PALLET' : ''}</td>
          </tr>
          <!-- Separación -->
          <tr>
            <td colspan="7" style="border:1px solid #000; padding:3px; background:#fff;"></td>
          </tr>
          ${filasLocales}
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
