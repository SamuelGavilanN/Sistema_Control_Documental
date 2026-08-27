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

    // ---------- Tabla de transporte (4 columnas, etiquetas rosadas) ----------
    let tablaTransporte = `
      <table style="width:100%; border-collapse:collapse; margin-bottom:0; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
        <tr>
          <td colspan="2" bgcolor="#FFC0CB" style="border:1px solid #000; padding:4px; font-weight:bold;">Nombre Local</td>
          <td colspan="2" style="border:1px solid #000; padding:4px;">${codigo}-${nombre}</td>
        </tr>
        <tr>
          <td colspan="2" bgcolor="#FFC0CB" style="border:1px solid #000; padding:4px; font-weight:bold;">Actas Entrega</td>
          <td colspan="2" style="border:1px solid #000; padding:4px;">${actas}</td>
        </tr>
        <tr>
          <td bgcolor="#FFC0CB" style="border:1px solid #000; padding:4px; font-weight:bold;">Fecha Entrega</td>
          <td style="border:1px solid #000; padding:4px;">${fecha}</td>
          <td bgcolor="#FFC0CB" style="border:1px solid #000; padding:4px; font-weight:bold;">Hora Entrega</td>
          <td style="border:1px solid #000; padding:4px;">${hora}</td>
        </tr>
        <tr>
          <td bgcolor="#FFC0CB" style="border:1px solid #000; padding:4px; font-weight:bold;">Conductor</td>
          <td style="border:1px solid #000; padding:4px;">${chofer}</td>
          <td bgcolor="#FFC0CB" style="border:1px solid #000; padding:4px; font-weight:bold;">Patente</td>
          <td style="border:1px solid #000; padding:4px;">${patente}</td>
        </tr>
        <tr>
          <td bgcolor="#FFC0CB" style="border:1px solid #000; padding:4px; font-weight:bold;">Rut</td>
          <td style="border:1px solid #000; padding:4px;">${rut}</td>
          <td bgcolor="#FFC0CB" style="border:1px solid #000; padding:4px; font-weight:bold;">Sello Trasero</td>
          <td style="border:1px solid #000; padding:4px;">${selloTrasero}</td>
        </tr>
        <tr>
          <td bgcolor="#FFC0CB" style="border:1px solid #000; padding:4px; font-weight:bold;">Empresa</td>
          <td style="border:1px solid #000; padding:4px;">${transportista}</td>
          <td bgcolor="#FFC0CB" style="border:1px solid #000; padding:4px; font-weight:bold;">Sello Lateral</td>
          <td style="border:1px solid #000; padding:4px;">${selloLateral}</td>
        </tr>
        <tr>
          <td bgcolor="#FFC0CB" style="border:1px solid #000; padding:4px; font-weight:bold;">Telefono</td>
          <td style="border:1px solid #000; padding:4px;">${celular}</td>
          <td bgcolor="#FFC0CB" style="border:1px solid #000; padding:4px; font-weight:bold;">Sello Adicional</td>
          <td style="border:1px solid #000; padding:4px;">${selloAdicional}</td>
        </tr>
      </table>
    `;

    // ---------- Subtabla de Centros de Distribución (5 columnas) ----------
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
        </tr>`;
      }
      tablaCentros = `
        <table style="width:100%; border-collapse:collapse; margin-top:5px; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
          <tr bgcolor="#D9E2F3">
            <th style="border:1px solid #000; padding:3px;">Centro de Distribución</th>
            <th style="border:1px solid #000; padding:3px;">Tipo de Documento</th>
            <th style="border:1px solid #000; padding:3px;">Numero de Documento</th>
            <th style="border:1px solid #000; padding:3px;">Cantidad Bultos</th>
            <th style="border:1px solid #000; padding:3px;">Observación</th>
          </tr>
          ${filas}
          <tr bgcolor="#FFFF00" style="font-weight:bold;">
            <td colspan="3" style="border:1px solid #000; padding:3px; text-align:center;">Total de Bultos Origen Centro de Distribución</td>
            <td style="border:1px solid #000; padding:3px; text-align:center;">${totalCentros}</td>
            <td style="border:1px solid #000; padding:3px;"></td>
          </tr>
        </table>
      `;
    }

    // ---------- Subtabla de Segmentos Adicionales (5 columnas) ----------
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
        </tr>`;
      }
      tablaSegmentos = `
        <table style="width:100%; border-collapse:collapse; margin-top:5px; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
          <tr bgcolor="#D9E2F3">
            <th style="border:1px solid #000; padding:3px;">Segmentos Adicionales</th>
            <th style="border:1px solid #000; padding:3px;">Tipo de Documento</th>
            <th style="border:1px solid #000; padding:3px;">Numero de Documento</th>
            <th style="border:1px solid #000; padding:3px;">Cantidad Bultos</th>
            <th style="border:1px solid #000; padding:3px;">Observación</th>
          </tr>
          ${filas}
          <tr bgcolor="#FFFF00" style="font-weight:bold;">
            <td colspan="3" style="border:1px solid #000; padding:3px; text-align:center;">Total de bultos Segmentos Adicionales</td>
            <td style="border:1px solid #000; padding:3px; text-align:center;">${totalSegmentos}</td>
            <td style="border:1px solid #000; padding:3px;"></td>
          </tr>
        </table>
      `;
    }

    // ---------- Tabla de Total General ----------
    let tablaTotal = '';
    if (totalGeneral > 0) {
      tablaTotal = `
        <table style="width:100%; border-collapse:collapse; margin-top:5px; font-family:Arial, sans-serif; font-size:12px; text-align:center;">
          <tr bgcolor="#FFFF00" style="font-weight:bold;">
            <td colspan="3" style="border:1px solid #000; padding:3px; text-align:center;">Total de Bultos Despachados</td>
            <td style="border:1px solid #000; padding:3px; text-align:center;">${totalGeneral}</td>
            <td style="border:1px solid #000; padding:3px;"></td>
          </tr>
        </table>
      `;
    }

    // Unir todas las tablas en un bloque
    htmlLocales += `
      <div style="margin-bottom:20px;">
        ${tablaTransporte}
        ${tablaCentros}
        ${tablaSegmentos}
        ${tablaTotal}
      </div>
    `;
  }

  // HTML final del correo
  const html = `
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; font-size: 12px; color:#000; margin:0; padding:0; text-align:center;">
        <div style="max-width: 800px; margin: 0 auto; border: 2px solid #000; padding: 15px; background: #fff; text-align: center;">
          <p style="margin:0 0 10px 0;">${saludo} estimados (as). Se detalla planilla de despacho.</p>
          <p style="margin:0 0 10px 0; font-weight:bold; font-size:14px;">1 PALLET</p>
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
