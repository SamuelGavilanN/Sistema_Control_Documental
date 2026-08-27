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

  let htmlLocales = '';

  for (const local of datos.locales) {
    const codigo = escaparHTML(local.codigo);
    const nombre = escaparHTML(local.nombre);
    const selloTrasero = escaparHTML(local.selloTrasero || selloTraseroGlobal);

    const centros = local.bultos.filter(b => b.origenCarga.toUpperCase().startsWith('CD'));
    const segmentos = local.bultos.filter(b => !b.origenCarga.toUpperCase().startsWith('CD'));

    const totalCentros = centros.reduce((s, b) => s + b.cantidad, 0);
    const totalSegmentos = segmentos.reduce((s, b) => s + b.cantidad, 0);
    const totalGeneral = totalCentros + totalSegmentos;

    // ---------- Tabla de Centros de Distribución ----------
    let tablaCentros = '';
    if (centros.length > 0) {
      let filas = '';
      for (const b of centros) {
        const tipoDoc = esNoAplica(b.tipoDocumento) ? '' : b.tipoDocumento;
        const numDoc = esNoAplica(b.numeroDocumento) ? '' : b.numeroDocumento;
        filas += `<tr>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${escaparHTML(b.origenCarga)}</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${escaparHTML(tipoDoc)}</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${escaparHTML(numDoc)}</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${b.cantidad}</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${escaparHTML(b.observacion || '')}</td>
          <td style="border:1px solid #000; padding:3px;"></td>
        </tr>`;
      }
      tablaCentros = `
        <tr><td colspan="6" bgcolor="#F2F2F2" style="border:1px solid #000; padding:4px; font-weight:bold; text-align:center;">DETALLE DE CARGA (Centros de Distribución)</td></tr>
        <tr bgcolor="#D9E2F3">
          <th style="border:1px solid #000; padding:3px; text-align:center;">Centro de Distribución</th>
          <th style="border:1px solid #000; padding:3px; text-align:center;">Tipo Doc</th>
          <th style="border:1px solid #000; padding:3px; text-align:center;">N° Doc</th>
          <th style="border:1px solid #000; padding:3px; text-align:center;">Cant.</th>
          <th style="border:1px solid #000; padding:3px; text-align:center;">Observación</th>
          <th style="border:1px solid #000; padding:3px;"></th>
        </tr>
        ${filas}
        <tr bgcolor="#F2F2F2" style="font-weight:bold;">
          <td colspan="3" style="border:1px solid #000; padding:3px; text-align:center;">Total de Bultos Origen Centro de Distribución</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${totalCentros}</td>
          <td style="border:1px solid #000; padding:3px;"></td>
          <td style="border:1px solid #000; padding:3px;"></td>
        </tr>`;
    }

    // ---------- Tabla de Segmentos Adicionales ----------
    let tablaSegmentos = '';
    if (segmentos.length > 0) {
      let filas = '';
      for (const b of segmentos) {
        const tipoDoc = esNoAplica(b.tipoDocumento) ? '' : b.tipoDocumento;
        const numDoc = esNoAplica(b.numeroDocumento) ? '' : b.numeroDocumento;
        filas += `<tr>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${escaparHTML(b.origenCarga)}</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${escaparHTML(tipoDoc)}</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${escaparHTML(numDoc)}</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${b.cantidad}</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${escaparHTML(b.observacion || '')}</td>
          <td style="border:1px solid #000; padding:3px;"></td>
        </tr>`;
      }
      tablaSegmentos = `
        <tr><td colspan="6" bgcolor="#F2F2F2" style="border:1px solid #000; padding:4px; font-weight:bold; text-align:center;">SEGMENTOS ADICIONALES</td></tr>
        <tr bgcolor="#D9E2F3">
          <th style="border:1px solid #000; padding:3px; text-align:center;">Segmento</th>
          <th style="border:1px solid #000; padding:3px; text-align:center;">Tipo Doc</th>
          <th style="border:1px solid #000; padding:3px; text-align:center;">N° Doc</th>
          <th style="border:1px solid #000; padding:3px; text-align:center;">Cant.</th>
          <th style="border:1px solid #000; padding:3px; text-align:center;">Observación</th>
          <th style="border:1px solid #000; padding:3px;"></th>
        </tr>
        ${filas}
        <tr bgcolor="#F2F2F2" style="font-weight:bold;">
          <td colspan="3" style="border:1px solid #000; padding:3px; text-align:center;">Total de bultos Segmentos Adicionales</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${totalSegmentos}</td>
          <td style="border:1px solid #000; padding:3px;"></td>
          <td style="border:1px solid #000; padding:3px;"></td>
        </tr>`;
    }

    // ---------- Total General ----------
    let totalGeneralHTML = '';
    if (totalGeneral > 0) {
      totalGeneralHTML = `
        <tr bgcolor="#FFFF00" style="font-weight:bold;">
          <td colspan="3" style="border:1px solid #000; padding:3px; text-align:center;">Total de Bultos Despachados</td>
          <td style="border:1px solid #000; padding:3px; text-align:center;">${totalGeneral}</td>
          <td style="border:1px solid #000; padding:3px;"></td>
          <td style="border:1px solid #000; padding:3px;"></td>
        </tr>`;
    }

    // ---------- Tabla principal del local (con 6 columnas) ----------
    htmlLocales += `
      <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
        <tr><td colspan="6" bgcolor="#FFFF00" style="border:2px solid #000; padding:6px; text-align:center; font-weight:bold; font-size:14px;">PLANILLA DE DESPACHO - ${codigo} ${nombre}</td></tr>

        <tr><td colspan="6" bgcolor="#F2F2F2" style="border:1px solid #000; padding:4px; font-weight:bold; text-align:center;">DETALLE DE TRANSPORTE</td></tr>

        <tr>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Nombre Local</strong></td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;">${codigo}-${nombre}</td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Actas Entrega</strong></td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;">${actas}</td>
        </tr>
        <tr>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Fecha Entrega</strong></td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;">${fecha}</td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Hora Entrega</strong></td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;">${hora}</td>
        </tr>
        <tr>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Conductor</strong></td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;">${chofer}</td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Rut</strong></td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;">${rut}</td>
        </tr>
        <tr>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Empresa</strong></td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;">${transportista}</td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Teléfono</strong></td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;">${celular}</td>
        </tr>
        <tr>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Patente</strong></td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;">${patente}</td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Sello Trasero</strong></td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;">${selloTrasero}</td>
        </tr>
        <tr>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Sello Lateral</strong></td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;">${selloLateral}</td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Sello Adicional</strong></td>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;">${selloAdicional}</td>
        </tr>
        <tr>
          <td colspan="2" style="border:1px solid #000; padding:4px; text-align:center;"><strong>Administrativo</strong></td>
          <td colspan="4" style="border:1px solid #000; padding:4px; text-align:center;">${administrativo}</td>
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
      <body style="font-family: Arial, sans-serif; font-size: 12px; color:#000; margin:0; padding:0; text-align:center;">
        <div style="max-width: 800px; margin: 0 auto; border: 2px solid #000; padding: 15px; background: #fff; text-align: center;">
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
