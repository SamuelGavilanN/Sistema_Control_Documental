// src/components/Transactions/RP/RP01View.tsx

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { auth } from '../../../lib/auth';
import './RP01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const RP01View: React.FC = () => {
  const [cargando, setCargando]: any = useState(false);
  const [mensaje, setMensaje]: any = useState({ tipo: '', texto: '' });
  const [archivoNombre, setArchivoNombre]: any = useState('');
  const [resumen, setResumen]: any = useState(null);
  const fileInputRef: any = useRef(null);
  const usuario: any = auth.getUsuario();

  const procesarArchivo = async (file: File) => {
    setArchivoNombre(file.name);
    setCargando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 2) {
        setMensaje({ tipo: 'error', texto: 'El archivo está vacío' });
        setCargando(false);
        return;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1).filter((row: any) => row.length > 0);

      const colEmpaque = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('empaque'));
      const colCarga = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('carga'));
      const colCodDestino = headers.findIndex((h: string) => h && (h.toString().toLowerCase().includes('cod.destino') || h.toString().toLowerCase().includes('destino')));
      const colDestino = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('destino') && colCodDestino >= 0 && headers.indexOf(h) !== colCodDestino);
      const colBOM = headers.findIndex((h: string) => h && (h.toString().toLowerCase().includes('bom') || h.toString().toLowerCase().includes('sku')));
      const colCantidad = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('cantidad'));

      if (colEmpaque < 0 || colBOM < 0 || colCantidad < 0) {
        setMensaje({ tipo: 'error', texto: 'Columnas requeridas no encontradas: Número de Empaque, BOM/SKU, Cantidad' });
        setCargando(false);
        return;
      }

      const consolidado: Record<string, any> = {};
      const cargasSet = new Set<string>();

      dataRows.forEach((row: any) => {
        const empaque = String(row[colEmpaque] || '').trim();
        const carga = colCarga >= 0 ? String(row[colCarga] || '').trim() : '';
        const codDestino = colCodDestino >= 0 ? String(row[colCodDestino] || '').trim() : '';
        const destino = colDestino >= 0 ? String(row[colDestino] || '').trim() : '';
        const bom = String(row[colBOM] || '').trim();
        const cantidad = parseInt(row[colCantidad]) || 1;

        if (!empaque || !bom) return;
        if (carga) cargasSet.add(carga);

        const key = empaque + '|' + bom;
        if (!consolidado[key]) {
          consolidado[key] = { empaque, carga, codDestino, destino, bom, cantidad };
        } else {
          if (cantidad > consolidado[key].cantidad) {
            consolidado[key].cantidad = cantidad;
          }
        }
      });

      const consolidadoArray = Object.values(consolidado);

      const agrupadoPorCarga: Record<string, any> = {};
      consolidadoArray.forEach((item: any) => {
        if (!agrupadoPorCarga[item.carga]) {
          agrupadoPorCarga[item.carga] = { carga: item.carga, pallets: new Set(), boms: 0 };
        }
        agrupadoPorCarga[item.carga].pallets.add(item.empaque);
        agrupadoPorCarga[item.carga].boms++;
      });

      setResumen({
        totalCargas: Object.keys(agrupadoPorCarga).length,
        totalPallets: new Set(consolidadoArray.map((i: any) => i.empaque)).size,
        totalBOMs: consolidadoArray.length,
        agrupadoPorCarga,
        consolidado: consolidadoArray
      });

      setMensaje({ tipo: 'success', texto: 'Archivo procesado correctamente' });
    } catch (e) {
      console.error('Error procesando archivo:', e);
      setMensaje({ tipo: 'error', texto: 'Error al procesar el archivo' });
    }
    setCargando(false);
  };

  const handleGuardar = async () => {
    if (!resumen) return;
    setCargando(true);

    try {
      const cargasGuardadas: Record<string, string> = {};

      for (const item of resumen.consolidado) {
        if (!cargasGuardadas[item.carga]) {
          const respCarga = await fetch(API_URL + '/rp_cargas', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify({
              numero_carga: item.carga,
              estado: 'Pendiente',
              creado_por: usuario?.id
            })
          });

          if (respCarga.ok) {
            const cargaData = await respCarga.json();
            const carga = Array.isArray(cargaData) ? cargaData[0] : cargaData;
            cargasGuardadas[item.carga] = carga.id;
          } else {
            const respExistente = await fetch(API_URL + '/rp_cargas?select=id&numero_carga=eq.' + encodeURIComponent(item.carga), { headers: HEADERS });
            const existenteData = await respExistente.json();
            if (existenteData && existenteData.length > 0) {
              cargasGuardadas[item.carga] = existenteData[0].id;
            }
          }
        }

        const cargaId = cargasGuardadas[item.carga];
        if (!cargaId) continue;

        const respPallet = await fetch(API_URL + '/rp_pallets', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify({
            carga_id: cargaId,
            numero_empaque: item.empaque,
            cod_destino: item.codDestino,
            destino: item.destino
          })
        });

        if (respPallet.ok) {
          const palletData = await respPallet.json();
          const pallet = Array.isArray(palletData) ? palletData[0] : palletData;

          await fetch(API_URL + '/rp_pallet_boms', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pallet_id: pallet.id,
              bom_sku: item.bom,
              cantidad_maxima: item.cantidad
            })
          });
        }
      }

      setMensaje({ tipo: 'success', texto: 'Datos guardados correctamente. ' + Object.keys(cargasGuardadas).length + ' cargas creadas.' });
      setResumen(null);
      setArchivoNombre('');
    } catch (e) {
      console.error('Error guardando:', e);
      setMensaje({ tipo: 'error', texto: 'Error al guardar los datos' });
    }
    setCargando(false);
  };

  return (
    <div className="rp01-view">
      <div className="rp01-header">
        <h2>RP01 · Carga de Revisión Pallet</h2>
      </div>

      <div className="rp01-upload-area">
        <label className="rp01-upload-label">Archivo Excel</label>
        <div
          className="rp01-upload-box"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <span>{archivoNombre ? archivoNombre : 'Haga clic para cargar archivo Excel'}</span>
          {archivoNombre && <span className="rp01-upload-nombre">Click para cambiar</span>}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e: any) => {
              const file = e.target.files?.[0];
              if (file) procesarArchivo(file);
            }}
          />
        </div>
      </div>

      {mensaje.texto && (
        <div className="rp01-mensaje" style={{
          background: mensaje.tipo === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
          color: mensaje.tipo === 'success' ? 'var(--success-text)' : 'var(--error-text)',
          border: mensaje.tipo === 'success' ? '1px solid var(--success-border)' : '1px solid var(--error-border)'
        }}>
          {mensaje.texto}
        </div>
      )}

      {resumen && (
        <>
          <div className="rp01-resumen">
            <div className="rp01-resumen-card">
              <span>Cargas</span>
              <strong>{resumen.totalCargas}</strong>
            </div>
            <div className="rp01-resumen-card">
              <span>Pallets</span>
              <strong>{resumen.totalPallets}</strong>
            </div>
            <div className="rp01-resumen-card">
              <span>BOMs</span>
              <strong>{resumen.totalBOMs}</strong>
            </div>
          </div>

          <div className="ed03-tabla-container" style={{ marginBottom: '20px' }}>
            <table className="ed03-tabla">
              <thead>
                <tr>
                  <th>N° Carga</th>
                  <th>Pallets</th>
                  <th>BOMs</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(resumen.agrupadoPorCarga).map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="ed03-ticket-id">{item.carga}</td>
                    <td>{item.pallets.size}</td>
                    <td>{item.boms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="sd01-btn-cancel" onClick={() => { setResumen(null); setArchivoNombre(''); }}>
              Cancelar
            </button>
            <button className="sd01-btn-save" onClick={handleGuardar} disabled={cargando}>
              {cargando ? 'Guardando...' : 'Guardar Datos'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default RP01View;
