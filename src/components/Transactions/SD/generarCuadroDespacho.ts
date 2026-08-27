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
  const selloTrasero = escaparHTML(datos.selloTrasero);
  const selloLateral = escaparHTML(datos.selloLateral);
  const selloAdicional = escaparHTML(datos.selloAdicional);
  const fiscal = escaparHTML(datos.fiscal);
  const administrativo = escaparHTML(datos.administrativo);
  const destino = escaparHTML(datos.destino);
  const actas = escaparHTML(datos.actasInformadas);

  let html = `
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; font-size: 12px; color:#000;">
        <p>${saludo} estimados (as). Se detalla planilla de despacho.</p>
        <h2 style="text-align:center; background:#ffff00; padding:5px; margin:0;">PLANILLA DE DESPACHO</h2>
        <table border="1" cellpadding="4" style="border-collapse:collapse; width:100%; margin-top:5px;">
          <tr><td colspan="4" style="background:#f2f2f2; text-align:center; font-weight:bold;">DETALLE DE TRANSPORTE</td></tr>
          <tr><td><strong>DESTINO</strong></td><td colspan="3">${destino}</td></tr>
          <tr><td><strong>ACTAS INFORMADAS</strong></td><td colspan="3">${actas}</td></tr>
          <tr><td><strong>FECHA ENTREGA</strong></td><td>${fecha}</td><td><strong>HORA ENTREGA</strong></td><td>${hora}</td></tr>
          <tr><td><strong>CHOFER</strong></td><td>${chofer}</td><td><strong>RUT</strong></td><td>${rut}</td></tr>
          <tr><td><strong>N° CELULAR</strong></td><td>${celular}</td><td><strong>N° PATENTE</strong></td><td>${patente}</td></tr>
          <tr><td><strong>TRANSPORTE</strong></td><td>${transportista}</td><td></td><td></td></tr>
          <tr><td><strong>N° DE SELLO TRASERO</strong></td><td>${selloTrasero}</td><td><strong>N° DE SELLO LATERAL</strong></td><td>${selloLateral}</td></tr>
          <tr><td><strong>N° DE SELLO ADICIONAL</strong></td><td>${selloAdicional}</td><td></td><td></td></tr>
          <tr><td><strong>FISCAL</strong></td><td>${fiscal}</td><td></td><td></td></tr>
          <tr><td><strong>ADMINISTRATIVO</strong></td><td>${administrativo}</td><td></td><td></td></tr>
        </table>
  `;

  for (const local of datos.locales) {
    const codigo = escaparHTML(local.codigo);
    const nombre = escaparHTML(local.nombre);

    let filasBultos = '';
    if (local.bultos.length === 0) {
      filasBultos = '<tr><td colspan="5" style="text-align:center;">Sin bultos registrados</td></tr>';
    } else {
      for (const bulto of local.bultos) {
        const detalle = escaparHTML(bulto.origenCarga);
        const actaVtradex = bulto.tipoDocumento === 'Vtradex' ? escaparHTML(bulto.numeroDocumento) : '';
        const actaSap = bulto.tipoDocumento === 'Sap' ? escaparHTML(bulto.numeroDocumento) : '';
        const cantidad = bulto.cantidad.toString();
        const obs = escaparHTML(bulto.observacion || '');
        filasBultos += `<tr>
          <td>${detalle}</td>
          <td>${actaVtradex}</td>
          <td>${actaSap}</td>
          <td>${cantidad}</td>
          <td>${obs}</td>
        </tr>`;
      }
    }

    html += `
      <br>
      <table border="1" cellpadding="4" style="border-collapse:collapse; width:100%;">
        <tr><td colspan="5" style="background:#f2f2f2; text-align:center; font-weight:bold;">DETALLE DE CARGA - ${codigo} ${nombre}</td></tr>
        <tr style="background:#e0e0e0;">
          <th>DETALLE</th>
          <th>ACTA VTRADEX</th>
          <th>ACTA SAP</th>
          <th>CANTIDAD</th>
          <th>OBSERVACIÓN</th>
        </tr>
        ${filasBultos}
      </table>
    `;
  }

  html += `
      </body>
    </html>
  `;

  return html;
}

export async function copiarCuadroDespacho(datos: TransporteData): Promise<boolean> {
  const html = generarCuadroHTML(datos);
  try {
    if (navigator.clipboard && navigator.clipboard.write) {
      // CORRECCIÓN: envolver los Blobs en Promise.resolve()
      const clipboardItem = new ClipboardItem({
        'text/html': Promise.resolve(new Blob([html], { type: 'text/html' })),
        'text/plain': Promise.resolve(new Blob([html], { type: 'text/plain' })),
      });
      await navigator.clipboard.write([clipboardItem]);
      return true;
    }
    // Fallback para navegadores antiguos
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
