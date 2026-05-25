import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { ED01Row } from './ED01View';
import './EtiquetaModal.css';

interface EtiquetaModalProps {
  isOpen: boolean;
  onClose: () => void;
  registro: ED01Row | null;
  nombreCreador?: string;
}

const generarHTML = (
  registro: ED01Row,
  palletActual: number,
  totalPallets: number,
  qrGrande: string,
  qrPequeno: string,
  barcodeSvg: string,
  nombreCreador: string
): string => {
  const fecha = registro?.creado_en
    ? new Date(registro.creado_en).toLocaleDateString('es-CL').replace(/\//g, '-')
    : '';
  const nombreTienda = `${registro.codigo_local}-${registro.nombre_local}`;

  return `
<div class="contenedor-exterior">
 <div class="etiqueta">
  <div class="recuadro recuadro-1">
   <img src="${qrGrande}" class="qr-grande" />
   <div class="columna-derecha-r1">
    <div class="fecha-texto">${fecha}</div>
    <div class="codigo-largo">${registro.numero_tarea}</div>
   </div>
  </div>
  <div class="recuadro recuadro-2">
   <div class="qr-titulo-container"><img src="${qrPequeno}" class="qr-pequeno" /></div>
   <div class="titulo-texto">${nombreTienda}</div>
  </div>
  <div class="recuadro recuadro-3">
   <div class="col-cantidad-izq">CANTIDAD</div>
   <div class="col-cantidad-der">${registro.cantidad_bultos}</div>
  </div>
  <div class="recuadro recuadro-4">
   ${barcodeSvg}
   <div class="texto-pallet">${registro.numero_empaque}</div>
  </div>
  <div class="recuadro recuadro-5">
   <div class="revisado-texto">${nombreCreador.toUpperCase()}</div>
  </div>
  <div class="recuadro recuadro-6">
   <div class="footer-texto">PALLET ${palletActual} DE ${totalPallets}</div>
  </div>
 </div>
</div>`;
};

const cssEtiqueta = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:white;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif!important}
.etiqueta-wrapper{width:100mm;height:130mm;margin:0 auto;box-sizing:border-box;padding:0}
.contenedor-exterior{width:100%;height:100%;background:white;padding:15mm 4.5mm 0.5mm 0.5mm;box-sizing:border-box}
.etiqueta{width:100%;height:100%;border:2px solid black;display:flex;flex-direction:column;background:white;padding:0.5mm;font-family:Arial,Helvetica,sans-serif!important}
.recuadro{border:2px solid black;display:flex;align-items:center;justify-content:center;width:100%}
.recuadro-1{height:25%;flex-direction:row;justify-content:space-between;padding:1mm 2mm}
.qr-grande{width:70px;height:70px}
.columna-derecha-r1{display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;height:100%;padding-top:1px}
.fecha-texto{font-size:16px;font-weight:900;font-family:Arial,Helvetica,sans-serif!important}
.codigo-largo{font-size:10pt;font-weight:900;text-align:right;margin-top:auto;word-break:break-all;font-family:Arial,Helvetica,sans-serif!important}
.recuadro-2{height:20%;flex-direction:column;justify-content:space-between;padding:1mm 2mm;margin-top:0.5mm}
.qr-titulo-container{width:100%;display:flex;justify-content:flex-end;padding-right:1mm}
.qr-pequeno{width:40px;height:40px}
.titulo-texto{font-size:18px;font-weight:900;text-align:center;width:100%;padding-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:Arial,Helvetica,sans-serif!important}
.recuadro-3{height:15%;flex-direction:row;padding:0mm;margin-top:0.5mm}
.col-cantidad-izq{width:50%;border-right:2px solid black;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;font-family:Arial,Helvetica,sans-serif!important}
.col-cantidad-der{width:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;font-family:Arial,Helvetica,sans-serif!important}
.recuadro-4{height:22%;flex-direction:column;justify-content:center;margin-top:0.5mm;padding:0mm 2mm}
.texto-pallet{font-size:14px;font-weight:900;margin-top:1px;text-align:center;font-family:Arial,Helvetica,sans-serif!important}
.recuadro-5{height:10%;margin-top:0.5mm}
.revisado-texto{font-size:18px;font-weight:900;font-family:Arial,Helvetica,sans-serif!important}
.recuadro-6{height:7%;margin-top:0.5mm;justify-content:flex-end;padding-right:3mm;border:none}
.footer-texto{font-size:16px;font-weight:900;font-family:Arial,Helvetica,sans-serif!important}
@media print{
  @page{size:100mm 130mm;margin:0}
  body{background:white;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif!important}
  .etiqueta-wrapper{page-break-after:always;padding:0}
  .etiqueta-wrapper:last-child{page-break-after:auto}
  .contenedor-exterior{padding:15mm 4.5mm 0.5mm 0.5mm}
}
`;

const EtiquetaModal: React.FC<EtiquetaModalProps> = ({ isOpen, onClose, registro, nombreCreador }) => {
  const [qrGrande, setQrGrande] = useState('');
  const [qrPequeno, setQrPequeno] = useState('');
  const [barcodeSvg, setBarcodeSvg] = useState('');

  useEffect(() => { if (isOpen && registro) generarCodigos(); }, [isOpen, registro]);

  const generarCodigos = async () => {
    if (!registro) return;
    const qrGrandeData = await QRCode.toDataURL(registro.numero_tarea, { width: 70, margin: 1, errorCorrectionLevel: 'H' });
    setQrGrande(qrGrandeData);
    const dropCode = `DROP${registro.codigo_local}`;
    const qrPequenoData = await QRCode.toDataURL(dropCode, { width: 40, margin: 1, errorCorrectionLevel: 'H' });
    setQrPequeno(qrPequenoData);
    const svgElement = document.createElement('svg');
    JsBarcode(svgElement, registro.numero_empaque, { format: 'CODE128', displayValue: false, width: 1.5, height: 38, margin: 2 });
    setBarcodeSvg(svgElement.outerHTML);
  };

  const handleImprimir = () => {
    if (!registro || !qrGrande || !qrPequeno || !barcodeSvg) return;
    const totalPallets = registro.cantidad_pallet || 1;
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    const nombre = nombreCreador || 'Usuario';
    let htmlCompleto = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Etiquetas</title><style>${cssEtiqueta}</style></head><body>`;
    for (let i = 1; i <= totalPallets; i++) {
      htmlCompleto += `<div class="etiqueta-wrapper">${generarHTML(registro, i, totalPallets, qrGrande, qrPequeno, barcodeSvg, nombre)}</div>`;
    }
    htmlCompleto += '</body></html>';
    ventana.document.write(htmlCompleto);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 500);
  };

  if (!isOpen || !registro) return null;

  return (
    <div className="etiqueta-modal-overlay" onClick={onClose}>
      <div className="etiqueta-modal" onClick={(e) => e.stopPropagation()}>
        <div className="etiqueta-modal-header"><h2>Imprimir Etiqueta</h2><button className="etiqueta-modal-close" onClick={onClose}>×</button></div>
        <div className="etiqueta-modal-body">
          <div className="etiqueta-info">
            <div className="etiqueta-dato"><span>Empaque:</span> <strong>{registro.numero_empaque}</strong></div>
            <div className="etiqueta-dato"><span>Tienda:</span> <strong>{registro.codigo_local} - {registro.nombre_local}</strong></div>
            <div className="etiqueta-dato"><span>Bultos:</span> <strong>{registro.cantidad_bultos}</strong></div>
            <div className="etiqueta-dato"><span>Pallets:</span> <strong>{registro.cantidad_pallet}</strong></div>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>Se generaran <strong>{registro.cantidad_pallet}</strong> etiqueta(s).</p>
        </div>
        <div className="etiqueta-modal-footer">
          <button className="ed01-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="ed01-btn-save" onClick={handleImprimir}>Imprimir Etiquetas</button>
        </div>
      </div>
    </div>
  );
};

export default EtiquetaModal;
