// src/components/Transactions/UT/UT01View.tsx

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import './UT01.css';

const UT01View: React.FC = () => {
  const [prefijo, setPrefijo]: any = useState('');
  const [inicio, setInicio]: any = useState(1);
  const [fin, setFin]: any = useState(100);
  const [digitos, setDigitos]: any = useState(4);
  const [orientacion, setOrientacion]: any = useState('horizontal');
  const [qrPreview, setQrPreview]: any = useState('');
  const styleRef: any = useRef(null);

  useEffect(() => {
    if (!styleRef.current) {
      const style = document.createElement('style');
      style.textContent = `
        .ut01-preview-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          background: var(--bg-input);
          border-radius: 8px;
        }
        .etiqueta-preview {
          border: 2px solid var(--text-primary);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          gap: 12px;
          background: var(--bg-panel);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .preview-horizontal {
          width: 300px;
          height: 150px;
          flex-direction: row;
        }
        .preview-vertical {
          width: 150px;
          height: 300px;
          flex-direction: column;
        }
        .etiqueta-preview-numero {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 24px;
          font-weight: 900;
          color: var(--text-primary);
          text-align: center;
          word-break: break-all;
          line-height: 1.2;
        }
        .etiqueta-preview img {
          image-rendering: auto;
        }
      `;
      document.head.appendChild(style);
      styleRef.current = style;
    }
  }, []);

  const generarPreview = async () => {
    const numero = String(inicio).padStart(digitos, '0');
    const valorCompleto = prefijo + numero;
    const qr = await QRCode.toDataURL(valorCompleto, { width: 200, margin: 1 });
    setQrPreview(qr);
  };

  const generarEtiquetas = async () => {
    const total = fin - inicio + 1;
    if (total <= 0 || total > 1000) {
      alert('El rango debe ser entre 1 y 1000 etiquetas');
      return;
    }

    const esHorizontal = orientacion === 'horizontal';
    const css = esHorizontal ? cssHorizontal : cssVertical;

    let etiquetasHTML = '';

    for (let i = fin; i >= inicio; i--) {
      const numero = String(i).padStart(digitos, '0');
      const valorCompleto = prefijo + numero;
      const qrSize = esHorizontal ? 200 : 250;
      const qr = await QRCode.toDataURL(valorCompleto, { width: qrSize, margin: 2 });

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
  <style>${css}</style>
</head>
<body>
  ${etiquetasHTML}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</body>
</html>`;

    const ventana = window.open('', '_blank', 'width=800,height=600');
    if (ventana) {
      ventana.document.write(htmlCompleto);
      ventana.document.close();
      ventana.focus();
    }
  };

  const esHorizontal = orientacion === 'horizontal';

  return (
    <div className="ut01-view">
      <div className="ut01-header">
        <h2>UT01 · Generador de Etiquetas QR Correlativas</h2>
        <p className="ut01-subtitle">
          Genera etiquetas con número correlativo y código QR. 1 etiqueta por hoja.{' '}
          {esHorizontal ? '100mm × 50mm (Horizontal)' : '50mm × 100mm (Vertical)'}
        </p>
      </div>

      <div className="ut01-form">
        <div className="ut01-field">
          <label>Prefijo (opcional)</label>
          <input
            type="text"
            value={prefijo}
            onChange={(e: any) => setPrefijo(e.target.value)}
            placeholder="Ej: LPN-"
            onBlur={generarPreview}
          />
        </div>
        <div className="ut01-field">
          <label>N° Inicial</label>
          <input
            type="number"
            value={inicio}
            onChange={(e: any) => { setInicio(parseInt(e.target.value) || 1); }}
            min={1}
            onBlur={generarPreview}
          />
        </div>
        <div className="ut01-field">
          <label>N° Final</label>
          <input
            type="number"
            value={fin}
            onChange={(e: any) => { setFin(parseInt(e.target.value) || 1); }}
            min={1}
            onBlur={generarPreview}
          />
        </div>
        <div className="ut01-field">
          <label>Dígitos (padding)</label>
          <input
            type="number"
            value={digitos}
            onChange={(e: any) => { setDigitos(parseInt(e.target.value) || 1); }}
            min={1}
            max={10}
            onBlur={generarPreview}
          />
        </div>
        <div className="ut01-field">
          <label>Orientación</label>
          <select
            value={orientacion}
            onChange={(e: any) => {
              setOrientacion(e.target.value);
              setTimeout(generarPreview, 100);
            }}
            style={{ 
              padding: '10px 12px', 
              border: '1px solid var(--border-input)', 
              borderRadius: '8px', 
              fontSize: '14px', 
              height: '42px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="horizontal">Horizontal (100×50mm)</option>
            <option value="vertical">Vertical (50×100mm)</option>
          </select>
        </div>
        <button className="ut01-btn-generar" onClick={generarEtiquetas}>
          Generar {fin - inicio + 1} Etiquetas
        </button>
      </div>

      <div className="ut01-preview">
        <h3>Vista Previa ({esHorizontal ? '100×50mm' : '50×100mm'})</h3>
        <div className="ut01-preview-container">
          <div className={`etiqueta-preview ${esHorizontal ? 'preview-horizontal' : 'preview-vertical'}`}>
            <div className="etiqueta-preview-numero" style={esHorizontal ? {} : { writingMode: 'vertical-rl', textOrientation: 'mixed' } as React.CSSProperties}>
              {prefijo}{String(inicio).padStart(digitos, '0')}
            </div>
            {qrPreview && <img src={qrPreview} alt="QR Preview" style={esHorizontal ? { width: '90px', height: '90px' } : { width: '100px', height: '100px' }} />}
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

const cssHorizontal = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  background: white; 
  margin: 0; 
  padding: 10mm;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.etiqueta {
  width: 80mm;
  height: 36mm;
  border: 2px solid #000;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  padding: 3mm;
  gap: 4mm;
  page-break-after: always;
  box-sizing: border-box;
  margin-bottom: 5mm;
  background: white;
}
.etiqueta:last-child { page-break-after: auto; }
.etiqueta-numero {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 22px;
  font-weight: 900;
  color: #000;
  text-align: center;
  word-break: break-all;
  line-height: 1.2;
  flex: 1;
  padding: 1mm;
}
.etiqueta-qr {
  width: 28mm;
  height: 28mm;
  flex-shrink: 0;
}
@media print {
  @page { size: 100mm 50mm; margin: 0; }
  body { padding: 0; margin: 0; }
  .etiqueta { 
    border: 1px solid #000; 
    margin: 0;
    page-break-after: always;
    width: 94mm;
    height: 44mm;
    padding: 3mm;
  }
  .etiqueta:last-child { page-break-after: auto; }
  .etiqueta-numero { font-size: 20px; }
  .etiqueta-qr { width: 26mm; height: 26mm; }
}
`;

const cssVertical = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  background: white; 
  margin: 0; 
  padding: 10mm;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.etiqueta {
  width: 36mm;
  height: 80mm;
  border: 2px solid #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3mm;
  gap: 4mm;
  page-break-after: always;
  box-sizing: border-box;
  margin-bottom: 5mm;
  background: white;
}
.etiqueta:last-child { page-break-after: auto; }
.etiqueta-numero {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 18px;
  font-weight: 900;
  color: #000;
  text-align: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 3px;
}
.etiqueta-qr {
  width: 28mm;
  height: 28mm;
}
@media print {
  @page { size: 50mm 100mm; margin: 0; }
  body { padding: 0; margin: 0; }
  .etiqueta { 
    border: 1px solid #000; 
    margin: 0;
    page-break-after: always;
    width: 44mm;
    height: 94mm;
    padding: 3mm;
  }
  .etiqueta:last-child { page-break-after: auto; }
  .etiqueta-numero { font-size: 16px; letter-spacing: 2px; }
  .etiqueta-qr { width: 26mm; height: 26mm; }
}
`;

export default UT01View;
