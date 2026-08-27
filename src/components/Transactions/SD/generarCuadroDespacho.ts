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

  // Estilos inline para mantener formato en Outlook
  const styles = `
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 0; }
    .contenedor { max-width: 800px; margin: 0 auto; border: 2px solid #000; padding: 10px; background: #fff; }
    .titulo { background-color: #ffff00; text-align: center; font-weight: bold; padding: 8px; margin: 0; border: 1px solid #000; }
    .seccion { background-color: #f2f2f2; text-align: center; font-weight: bold; padding: 5px; border: 1px solid #000; }
    .tabla { width: 100%; border-collapse: collapse; margin-top: 5px; }
    .tabla th, .tabla td { border: 1px solid #000; padding: 4px; }
    .tabla th { background-color: #e0e0e0; }
    .celda-clara { background-color: #f9f9f9; }
    .destacado { background-color: #fff2cc; }
    .fila-alternada { background-color: #fafafa; }
  `;

  let html = `
    <html>
      <head><meta charset="utf-8"><style>${styles}</style></head>
      <body>
        <p>${saludo} estimados (as). Se detalla planilla de despacho.</p>
        <div class="contenedor">
          <div class="titulo">PLANILLA DE DESPACHO</div>

          <div class="seccion">DETALLE DE TRANSPORTE</div>
          <table class="tabla">
            <tr>
              <td style="width:25%; background:#f2f2f2;"><strong>DESTINO</strong></td>
              <td colspan="3">${destino}</td>
            </tr>
            <tr>
              <td style="background:#f2f2f2;"><strong>ACTAS INFORMADAS</strong></td>
              <td colspan="3">${actas}</td>
            </tr>
            <tr>
              <td style="background:#f2f2f2;"><strong>FECHA ENTREGA</strong></td>
              <td>${fecha}</td>
              <td style="background:#f2f2f2;"><strong>HORA ENTREGA</strong></td>
              <td>${hora}</td>
            </tr>
            <tr>
              <td style="background:#f2f2f2;"><strong>CHOFER</strong></td>
              <td>${chofer}</td>
              <td style="background:#f2f2f2;"><strong>RUT</strong></td>
              <td>${rut}</td>
            </tr>
            <tr>
              <td style="background:#f2f2f2;"><strong>N° CELULAR</strong></td>
              <td>${celular}</td>
              <td style="background:#f2f2f2;"><strong>N° PATENTE</strong></td>
              <td>${patente}</td>
            </tr>
            <tr>
              <td style="background:#f2f2f2;"><strong>TRANSPORTE</strong></td>
              <td>${transportista}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td style="background:#f2f2f2;"><strong>N° DE SELLO TRASERO</strong></td>
              <td>${selloTrasero}</td>
              <td style="background:#f2f2f2;"><strong>N° DE SELLO LATERAL</strong></td>
              <td>${selloLateral}</td>
            </tr>
            <tr>
              <td style="background:#f2f2f2;"><strong>N° DE SELLO ADICIONAL</strong></td>
              <td>${selloAdicional}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td style="background:#f2f2f2;"><strong>FISCAL</strong></td>
              <td>${fiscal}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td style="background:#f2f2f2;"><strong>ADMINISTRATIVO</strong></td>
              <td>${administrativo}</td>
              <td></td>
              <td></td>
            </tr>
          </table>
  `;

  for (const local of datos.locales) {
    const codigo = escaparHTML(local.codigo);
    const nombre = escaparHTML(local.nombre);

    let filasBultos = '';
    if (local.bultos.length === 0) {
      filasBultos = '<tr><td colspan="5" style="text-align:center;">Sin bultos registrados</td></tr>';
    } else {
      let contador = 0;
      for (const bulto of local.bultos) {
        const detalle = escaparHTML(bulto.origenCarga);
        const actaVtradex = bulto.tipoDocumento === 'Vtradex' ? escaparHTML(bulto.numeroDocumento) : '';
        const actaSap = bulto.tipoDocumento === 'Sap' ? escaparHTML(bulto.numeroDocumento) : '';
        const cantidad = bulto.cantidad.toString();
        const obs = escaparHTML(bulto.observacion || '');
        const claseFila = contador % 2 === 0 ? 'fila-alternada' : '';
        filasBultos += `<tr class="${claseFila}">
          <td>${detalle}</td>
          <td>${actaVtradex}</td>
          <td>${actaSap}</td>
          <td>${cantidad}</td>
          <td>${obs}</td>
        </tr>`;
        contador++;
      }
    }

    html += `
      <br>
      <div class="seccion">DETALLE DE CARGA - ${codigo} ${nombre}</div>
      <table class="tabla">
        <tr style="background:#d9e2f3;">
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
