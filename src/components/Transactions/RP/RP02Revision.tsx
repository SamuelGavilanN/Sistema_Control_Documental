// src/components/Transactions/RP/RP02Revision.tsx

import React, { useState, useEffect } from 'react';
import { auth } from '../../../lib/auth';
import './RP02.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const ORIGENES_MANUALES = [
  'CD12 Bodegas Lampa',
  'CD30 Bodegas Renca',
  'C144 Bodega Holly Concept',
  'SG01 Internet',
  'SG02 Insumos',
  'SG03 Traspasos',
  'SG04 Valija',
  'SG05 Bultos Regularizar Stock',
  'SG06 Bultos Quedados en Camion'
];

const RP02Revision: React.FC = () => {
  const [documentos, setDocumentos]: any = useState([]);
  const [cargando, setCargando]: any = useState(true);
  const [mensaje, setMensaje]: any = useState({ tipo: '', texto: '', visible: false });
  const [documentoSeleccionado, setDocumentoSeleccionado]: any = useState(null);
  const [mostrarCrearDoc, setMostrarCrearDoc]: any = useState(false);
  const [mostrarRevisar, setMostrarRevisar]: any = useState(false);
  const [palletsDoc, setPalletsDoc]: any = useState([]);
  const [palletActual, setPalletActual]: any = useState(null);
  const [revisiones, setRevisiones]: any = useState([]);
  const [mostrarAgregarManual, setMostrarAgregarManual]: any = useState(false);
  const [manualSKU, setManualSKU]: any = useState('');
  const [manualOrigen, setManualOrigen]: any = useState(ORIGENES_MANUALES[0]);
  const [inventarioEmpaques, setInventarioEmpaques]: any = useState([]);
  const usuario: any = auth.getUsuario();

  useEffect(() => { cargarDocumentos(); }, []);

  const cargarDocumentos = async () => {
    setCargando(true);
    try {
      const resp = await fetch(API_URL + '/rp_documentos?select=*&order=creado_en.desc', { headers: HEADERS });
      setDocumentos(await resp.json() || []);
    } catch (e) {}
    setCargando(false);
  };

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  const generarIdDocumento = () => {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = ahora.getFullYear();
    const random = String(Math.floor(Math.random() * 90000) + 10000);
    return 'RPE' + dia + mes + anio + random;
  };

  const handleCrearDocumento = async () => {
    const idDocumento = generarIdDocumento();
    try {
      await fetch(API_URL + '/rp_documentos', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id_documento: idDocumento,
          estado: 'Pendiente',
          creado_por: usuario?.id
        })
      });
      mostrarMensaje('success', 'Documento ' + idDocumento + ' creado');
      setMostrarCrearDoc(false);
      cargarDocumentos();
    } catch (e) {
      mostrarMensaje('error', 'Error al crear documento');
    }
  };

  const handleSeleccionarDocumento = async (doc: any) => {
    setDocumentoSeleccionado(doc);
    await cargarPalletsDocumento(doc);
    await cargarInventarioEmpaques();
    setMostrarRevisar(true);
  };

  const cargarPalletsDocumento = async (doc: any) => {
    try {
      const resp = await fetch(API_URL + '/rp_documento_pallets?select=*&documento_id=eq.' + doc.id_documento + '&order=creado_en.asc', { headers: HEADERS });
      const pallets = await resp.json();
      
      const palletsConRevisiones = await Promise.all((pallets || []).map(async (pallet: any) => {
        const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + pallet.id, { headers: HEADERS });
        return { ...pallet, revisiones: await respRev.json() || [] };
      }));
      
      setPalletsDoc(palletsConRevisiones);
    } catch (e) {}
  };

  const cargarInventarioEmpaques = async () => {
    try {
      const resp = await fetch(API_URL + '/rp_inventario_empaques?select=*&order=numero_empaque.asc', { headers: HEADERS });
      setInventarioEmpaques(await resp.json() || []);
    } catch (e) {}
  };

  const handleIniciarPallet = async () => {
    if (!documentoSeleccionado) return;
    const numeroPallet = 'Pallet_' + (palletsDoc.length + 1);
    try {
      const resp = await fetch(API_URL + '/rp_documento_pallets', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          documento_id: documentoSeleccionado.id_documento,
          numero_pallet: numeroPallet,
          origen: 'INVENTARIO'
        })
      });
      if (resp.ok) {
        await cargarPalletsDocumento(documentoSeleccionado);
        mostrarMensaje('success', numeroPallet + ' iniciado');
      }
    } catch (e) {
      mostrarMensaje('error', 'Error al iniciar pallet');
    }
  };

  const handleCapturarEmpaque = async (empaque: any) => {
    if (!documentoSeleccionado || palletsDoc.length === 0) {
      mostrarMensaje('warning', 'Inicie un pallet primero');
      return;
    }
    const ultimoPallet = palletsDoc[palletsDoc.length - 1];
    
    try {
      await fetch(API_URL + '/rp_documento_pallets?id=eq.' + ultimoPallet.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_empaque: empaque.numero_empaque })
      });

      const respBoms = await fetch(API_URL + '/rp_inventario_boms?select=*&empaque_id=eq.' + empaque.id, { headers: HEADERS });
      const boms = await respBoms.json();

      if (boms && boms.length > 0) {
        for (const bom of boms) {
          await fetch(API_URL + '/rp_documento_revisiones', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documento_id: documentoSeleccionado.id_documento,
              pallet_id: ultimoPallet.id,
              bom_sku: bom.bom_sku,
              cantidad_sistema: bom.cantidad_maxima,
              cantidad_revisada: 1,
              origen: 'SISTEMA',
              revisado_por: usuario?.id
            })
          });
        }
      }

      await cargarPalletsDocumento(documentoSeleccionado);
      setPalletActual(ultimoPallet);
      const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + ultimoPallet.id, { headers: HEADERS });
      setRevisiones(await respRev.json() || []);
    } catch (e) {
      mostrarMensaje('error', 'Error al capturar empaque');
    }
  };

  const handleRevisarBOM = async (bom: any) => {
    const yaRevisado = revisiones.find((r: any) => r.bom_sku === bom.bom_sku && r.id === bom.id);
    if (yaRevisado) return;

    try {
      await fetch(API_URL + '/rp_documento_revisiones?id=eq.' + bom.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad_revisada: 1, revisado_por: usuario?.id })
      });
      const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + palletActual.id, { headers: HEADERS });
      setRevisiones(await respRev.json() || []);
    } catch (e) {}
  };

  const handleAgregarManual = async () => {
    if (!manualSKU.trim() || !palletActual) return;
    try {
      await fetch(API_URL + '/rp_documento_revisiones', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documento_id: documentoSeleccionado.id_documento,
          pallet_id: palletActual.id,
          bom_sku: manualSKU.trim().toUpperCase(),
          cantidad_sistema: 0,
          cantidad_revisada: 1,
          origen: manualOrigen,
          revisado_por: usuario?.id
        })
      });
      setManualSKU('');
      setMostrarAgregarManual(false);
      const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + palletActual.id, { headers: HEADERS });
      setRevisiones(await respRev.json() || []);
      await cargarPalletsDocumento(documentoSeleccionado);
    } catch (e) {
      mostrarMensaje('error', 'Error al agregar SKU');
    }
  };

  const seleccionarPalletParaVer = async (pallet: any) => {
    setPalletActual(pallet);
    const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + pallet.id, { headers: HEADERS });
    setRevisiones(await respRev.json() || []);
  };

  if (cargando) {
    return (
      <div className="rp02-view">
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="rp02-view">
      {mensaje.visible && (
        <div className={'rp02-toast rp02-toast-' + mensaje.tipo}>{mensaje.texto}</div>
      )}

      <div className="rp02-header">
        <h2>RP02 · Revisión Pallet</h2>
      </div>

      <div className="rp02-toolbar">
        <button className="rp02-btn rp02-btn-primary" onClick={() => setMostrarCrearDoc(true)}>
          + Nuevo Documento
        </button>
        <div className="rp02-separator"></div>
        <button className="rp02-btn" onClick={() => documentoSeleccionado && handleSeleccionarDocumento(documentoSeleccionado)}
          disabled={!documentoSeleccionado}>
          Ver Documento
        </button>
      </div>

      {documentoSeleccionado && (
        <div className="rp02-selected-info">
          <span>Documento: <strong>{documentoSeleccionado.id_documento}</strong> - {documentoSeleccionado.estado}</span>
          <button className="rp02-selected-close" onClick={() => setDocumentoSeleccionado(null)}>×</button>
        </div>
      )}

      <div className="ed03-tabla-container">
        <table className="ed03-tabla">
          <thead><tr><th style={{ width: '40px' }}></th><th>ID Documento</th><th>Estado</th><th>Creado En</th></tr></thead>
          <tbody>
            {documentos.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-placeholder)' }}>No hay documentos</td></tr>
            ) : (
              documentos.map((doc: any) => (
                <tr key={doc.id} onClick={() => {
                  if (documentoSeleccionado && documentoSeleccionado.id === doc.id) setDocumentoSeleccionado(null);
                  else setDocumentoSeleccionado(doc);
                }} style={{
                  cursor: 'pointer',
                  background: documentoSeleccionado && documentoSeleccionado.id === doc.id ? 'var(--table-row-selected)' : 'transparent'
                }}>
                  <td><input type="radio" className="sd01-radio" checked={documentoSeleccionado && documentoSeleccionado.id === doc.id} onChange={() => setDocumentoSeleccionado(doc)} onClick={(e: any) => e.stopPropagation()} /></td>
                  <td className="rp02-pallet-numero">{doc.id_documento}</td>
                  <td>{doc.estado}</td>
                  <td>{new Date(doc.creado_en).toLocaleString('es-CL')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mostrarCrearDoc && (
        <div className="rp02-modal-overlay" onClick={() => setMostrarCrearDoc(false)}>
          <div className="rp02-modal" style={{ maxWidth: '450px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header"><h2>Nuevo Documento de Revisión</h2><button className="rp02-modal-close" onClick={() => setMostrarCrearDoc(false)}>×</button></div>
            <div className="rp02-modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Se generará un nuevo documento con ID automático para iniciar la revisión de pallets.</p>
            </div>
            <div className="rp02-modal-footer">
              <button className="rp02-btn-cancel" onClick={() => setMostrarCrearDoc(false)}>Cancelar</button>
              <button className="rp02-btn-save" onClick={handleCrearDocumento}>Crear Documento</button>
            </div>
          </div>
        </div>
      )}

      {mostrarRevisar && documentoSeleccionado && (
        <div className="rp02-modal-overlay" onClick={() => { setMostrarRevisar(false); setPalletActual(null); }}>
          <div className="rp02-modal" onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header">
              <h2>{documentoSeleccionado.id_documento} - Pallets</h2>
              <button className="rp02-modal-close" onClick={() => { setMostrarRevisar(false); setPalletActual(null); }}>×</button>
            </div>
            <div className="rp02-modal-body">
              {!palletActual ? (
                <>
                  <button className="rp02-btn rp02-btn-primary" onClick={handleIniciarPallet} style={{ marginBottom: '16px', width: '100%', justifyContent: 'center' }}>
                    + Iniciar Pallet_{palletsDoc.length + 1}
                  </button>

                  {palletsDoc.map((pallet: any) => (
                    <div key={pallet.id} className="rp02-pallet-card" onClick={() => seleccionarPalletParaVer(pallet)} style={{ cursor: 'pointer' }}>
                      <div className="rp02-pallet-header">
                        <span className="rp02-pallet-numero">{pallet.numero_pallet}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {pallet.numero_empaque || 'Sin empaque'} | {pallet.revisiones.length} BOMs
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <button onClick={() => setPalletActual(null)} style={{
                    padding: '8px 14px', background: 'var(--btn-bg)', color: 'var(--btn-text)',
                    border: '1px solid var(--btn-border)', borderRadius: '6px', cursor: 'pointer',
                    marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
                  }}>
                    ← Volver a Pallets
                  </button>

                  <div className="rp02-form-group">
                    <label className="rp02-form-label">Capturar Número de Empaque</label>
                    <select className="rp02-form-input" onChange={(e: any) => {
                      const emp = inventarioEmpaques.find((inv: any) => inv.numero_empaque === e.target.value);
                      if (emp) handleCapturarEmpaque(emp);
                    }} value="">
                      <option value="">Seleccionar empaque del inventario...</option>
                      {inventarioEmpaques.map((emp: any) => (
                        <option key={emp.id} value={emp.numero_empaque}>{emp.numero_empaque} - {emp.destino}</option>
                      ))}
                    </select>
                  </div>

                  <div className="rp02-form-group">
                    <label className="rp02-form-label">BOMs del Pallet ({revisiones.length})</label>
                    {revisiones.map((rev: any) => (
                      <div key={rev.id} className="rp02-bom-item" style={{
                        background: rev.origen !== 'SISTEMA' ? 'var(--warning-bg)' : 'var(--bg-panel)',
                        borderColor: rev.origen !== 'SISTEMA' ? 'var(--warning-border)' : 'var(--border)'
                      }}>
                        <div>
                          <span className="rp02-bom-sku">{rev.bom_sku}</span>
                          {rev.origen !== 'SISTEMA' && (
                            <span style={{ fontSize: '10px', color: 'var(--warning-text)', display: 'block' }}>{rev.origen}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {rev.cantidad_sistema > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sist: {rev.cantidad_sistema}</span>
                          )}
                          <div className={'rp02-bom-check revisado'}>✓</div>
                        </div>
                      </div>
                    ))}

                    {mostrarAgregarManual && (
                      <div className="rp02-manual-form">
                        <input type="text" value={manualSKU} onChange={(e: any) => setManualSKU(e.target.value)}
                          placeholder="SKU" />
                        <select value={manualOrigen} onChange={(e: any) => setManualOrigen(e.target.value)}>
                          {ORIGENES_MANUALES.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <button className="rp02-btn-save" onClick={handleAgregarManual} style={{ whiteSpace: 'nowrap' }}>Agregar</button>
                      </div>
                    )}

                    <button className="rp02-btn-agregar" onClick={() => setMostrarAgregarManual(!mostrarAgregarManual)}>
                      {mostrarAgregarManual ? 'Cancelar' : '+ Agregar SKU Manual'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RP02Revision;
