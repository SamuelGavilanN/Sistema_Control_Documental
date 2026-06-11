// src/components/Transactions/UT/UT01View.tsx

import React, { useState } from 'react';
import QRCode from 'qrcode';
import './UT01.css';

const UT01View: React.FC = () => {
  const [prefijo, setPrefijo] = useState('');
  const [inicio, setInicio] = useState(1);
  const [fin, setFin] = useState(100);
  const [digitos, setDigitos] = useState(4);
  const [qrPreview, setQrPreview] = useState('');

  // Generar vista previa
  const generarPreview = async () => {
    const numero = String(inicio).padStart(digitos, '0');
    const valorCompleto = prefijo + numero;
    const qr = await QRCode.toDataURL(valorCompleto, { width: 120, margin: 1 });
    setQrPreview(qr);
  };

  // Generar HTML con todas las etiquetas
  const generarEtiquetas = async () => {
    const total = fin - inicio + 1;
    if (total <= 0 || total > 1000) {
      alert('El rango debe ser entre 1 y 1000 etiquetas');
      return;
    }

    let etiquetasHTML = '';

    for (let i = inicio; i <= fin; i++) {
      const numero = String(i).padStart(digitos, '0');
      const valorCompleto = prefijo + numero;
      const qr = await QRCode.toDataURL(valorCompleto, { width: 100, margin: 1 });

      etiquetasHTML += `
        <div class="etiqueta">
          <div class="etiqueta-numero">${valorCompleto}</div>
          <img src="${qr}" class="etiqueta-qr" alt="QR" />
        </div>`;
    }

    const htmlCompleto = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Etiquetas QR Correlativas</title>
  <style>${cssEtiquetas}</style>
</head>
<body>
  ${etiquetasHTML}
</body>
</html>`;

    const ventana = window.open('', '_blank');
    if (ventana) {
      ventana.document.write(htmlCompleto);
      ventana.document.close();
      ventana.focus();
      setTimeout(() => ventana.print(), 800);
    }
  };

  return (
    <div className="ut01-view">
      <div className="ut01-header">
        <h2>UT01 · Generador de Etiquetas QR Correlativas</h2>
        <p className="ut01-subtitle">Genera etiquetas con número correlativo y código QR. 1 etiqueta por fila, 100mm × 50mm.</p>
      </div>

      <div className="ut01-form">
        <div className="ut01-field">
          <label>Prefijo (opcional)</label>
          <input
            type="text"
            value={prefijo}
            onChange={e => setPrefijo(e.target.value)}
            placeholder="Ej: LPN-"
            onBlur={generarPreview}
          />
        </div>
        <div className="ut01-field">
          <label>N° Inicial</label>
          <input
            type="number"
            value={inicio}
            onChange={e => { setInicio(parseInt(e.target.value) || 1); }}
            min={1}
            onBlur={generarPreview}
          />
        </div>
        <div className="ut01-field">
          <label>N° Final</label>
          <input
            type="number"
            value={fin}
            onChange={e => { setFin(parseInt(e.target.value) || 1); }}
            min={1}
            onBlur={generarPreview}
          />
        </div>
        <div className="ut01-field">
          <label>Dígitos (padding)</label>
          <input
            type="number"
            value={digitos}
            onChange={e => { setDigitos(parseInt(e.target.value) || 1); }}
            min={1}
            max={10}
            onBlur={generarPreview}
          />
        </div>
        <button className="ut01-btn-generar" onClick={generarEtiquetas}>
          🖨️ Generar {fin - inicio + 1} Etiquetas
        </button>
      </div>

      <div className="ut01-preview">
        <h3>Vista Previa</h3>
        <div className="ut01-preview-container">
          <div className="etiqueta-preview">
            <div className="etiqueta-preview-numero">
              {prefijo}{String(inicio).padStart(digitos, '0')}
            </div>
            {qrPreview && <img src={qrPreview} alt="QR Preview" style={{ width: '90px', height: '90px' }} />}
          </div>
        </div>
        <div className="ut01-info">
          Total de etiquetas: <strong>{fin - inicio + 1}</strong> | 
          Formato: <strong>{prefijo}{String(inicio).padStart(digitos, '0')}</strong> a <strong>{prefijo}{String(fin).padStart(digitos, '0')}</strong>
        </div>
      </div>
    </div>
  );
};

// CSS para las etiquetas en la ventana de impresión
const cssEtiquetas = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: white; margin: 0; padding: 0; }
.etiqueta {
  width: 100mm;
  height: 50mm;
  border: 1px dashed #ccc;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 5mm;
  gap: 8mm;
  page-break-after: always;
  box-sizing: border-box;
  margin: 0 auto;
}
.etiqueta:last-child {
  page-break-after: auto;
}
.etiqueta-numero {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 28px;
  font-weight: 900;
  color: #000;
  text-align: center;
  word-break: break-all;
  line-height: 1.2;
  flex: 1;
}
.etiqueta-qr {
  width: 35mm;
  height: 35mm;
  flex-shrink: 0;
}
@media print {
  @page {
    size: 100mm 50mm;
    margin: 0;
  }
  body { background: white; }
  .etiqueta { 
    border: none;
    page-break-after: always;
  }
  .etiqueta:last-child {
    page-break-after: auto;
  }
}
`;

// Estilos para la vista previa
const stylePreview = document.createElement('style');
stylePreview.textContent = `
.etiqueta-preview {
  width: 100mm;
  height: 50mm;
  border: 2px solid #1a1f2e;
  border-radius: 4px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 5mm;
  gap: 8mm;
  background: white;
}
.etiqueta-preview-numero {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 28px;
  font-weight: 900;
  color: #000;
  text-align: center;
  word-break: break-all;
  line-height: 1.2;
  flex: 1;
}
`;
document.head.appendChild(stylePreview);

export default UT01View;
