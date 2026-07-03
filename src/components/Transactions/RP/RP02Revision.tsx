// src/components/Transactions/RP/RP02Revision.tsx

import React, { useState, useEffect, useRef } from 'react';
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
  const [bomsPendientes, setBomsPendientes]: any = useState([]);
  const [capturandoBOMs, setCapturandoBOMs]: any = useState(false);
  const [mostrarAgregarManual, setMostrarAgregarManual]: any = useState(false);
  const [manualEmpaque, setManualEmpaque]: any = useState('');
  const [manualSKU, setManualSKU]: any = useState('');
  const [manualCantidad, setManualCantidad]: any = useState('1');
  const [manualOrigen, setManualOrigen]: any = useState(ORIGENES_MANUALES[0]);
  const inputEmpaqueRef: any = useRef(null);
  const inputManualSKURef: any = useRef(null);
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

  const handleAbrirDocumento = async (doc: any) => {
    setDocumentoSeleccionado(doc);
    await cargarPallets(doc);
    setMostrarRevisar(true);
  };

  const cargarPallets = async (doc: any) => {
    try {
      const resp = await fetch(API_URL + '/rp_documento_pallets?select=*&documento_id=eq.' + doc.id_documento + '&order=creado_en.asc', { headers: HEADERS });
      const pallets = await resp.json();
      
      const palletsConRev = await Promise.all((pallets || []).map(async (pallet: any) => {
        const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + pallet.id + '&order=creado_en.asc', { headers: HEADERS });
        const revisiones = await respRev.json() || [];
        const total = revisiones.reduce((s: number, r: any) => s + (r.cantidad_revisada || 0), 0);
        return { ...pallet, revisiones, total_revisado: total };
      }));
      
      setPalletsDoc(palletsConRev);
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
          numero_pallet: numeroPallet
        })
      });
      if (resp.ok) {
        const palletData = await resp.json();
        const nuevoPallet = Array.isArray(palletData) ? palletData[0] : palletData;
        await cargarPallets(documentoSeleccionado);
        setPalletActual(nuevoPallet);
        setRevisiones([]);
        setBomsPendientes([]);
        mostrarMensaje('success', numeroPallet + ' iniciado');
        setTimeout(() => inputEmpaqueRef.current?.focus(), 300);
      }
    } catch (e) {
      mostrarMensaje('error', 'Error al iniciar pallet');
    }
  };

  const handleSeleccionarPallet = async (pallet: any) => {
    setPalletActual(pallet);
    setCapturandoBOMs(false);
    setBomsPendientes([]);
    const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + pallet.id + '&order=creado_en.asc', { headers: HEADERS });
    setRevisiones(await respRev.json() || []);
  };

  const handleCapturarEmpaque = async () => {
    const valor = (document.getElementById('rp02-input-empaque') as HTMLInputElement)?.value?.trim();
    if (!valor) {
      mostrarMensaje('warning', 'Ingrese un número de empaque');
      return;
    }
    if (!palletActual) {
      mostrarMensaje('warning', 'Seleccione un pallet primero');
      return;
    }

    // Verificar si es un origen manual
    const esOrigenManual = ORIGENES_MANUALES.some(o => o.toLowerCase().startsWith(valor.toLowerCase().substring(0, 3)));

    if (esOrigenManual) {
      // Abrir formulario manual
      setManualEmpaque(valor);
      setMostrarAgregarManual(true);
      setTimeout(() => inputManualSKURef.current?.focus(), 200);
      return;
    }

    // Buscar en inventario
    try {
      const resp = await fetch(API_URL + '/rp_inventario_empaques?select=*&numero_empaque=eq.' + encodeURIComponent(valor), { headers: HEADERS });
      const empaques = await resp.json();

      if (!empaques || empaques.length === 0) {
        // No encontrado, abrir manual con este número como origen
        setManualEmpaque(valor);
        setMostrarAgregarManual(true);
        setTimeout(() => inputManualSKURef.current?.focus(), 200);
        return;
      }

      const empaque = empaques[0];
      
      // Actualizar pallet con número empaque
      await fetch(API_URL + '/rp_documento_pallets?id=eq.' + palletActual.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_empaque: valor })
      });

      // Cargar BOMs del inventario
      const respBoms = await fetch(API_URL + '/rp_inventario_boms?select=*&empaque_id=eq.' + empaque.id + '&order=bom_sku.asc', { headers: HEADERS });
      const boms = await respBoms.json();

      if (boms && boms.length > 0) {
        // Crear revisiones pendientes
        const nuevasRevisiones = await Promise.all(boms.map(async (bom: any) => {
          const respRev = await fetch(API_URL + '/rp_documento_revisiones', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify({
              documento_id: documentoSeleccionado.id_documento,
              pallet_id: palletActual.id,
              bom_sku: bom.bom_sku,
              cantidad_sistema: bom.cantidad_maxima,
              cantidad_revisada: 0,
              origen: 'SISTEMA',
              revisado_por: null
            })
          });
          const revData = await respRev.json();
          return Array.isArray(revData) ? revData[0] : revData;
        }));

        setBomsPendientes(nuevasRevisiones);
        setCapturandoBOMs(true);
        await cargarPallets(documentoSeleccionado);
        
        // Actualizar revisiones del pallet
        const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + palletActual.id + '&order=creado_en.asc', { headers: HEADERS });
        setRevisiones(await respRev.json() || []);

        mostrarMensaje('success', boms.length + ' BOMs cargados del empaque ' + valor);
      }
    } catch (e) {
      mostrarMensaje('error', 'Error al buscar empaque');
    }
  };

  const handleConfirmarBOM = async (bom: any) => {
    try {
      await fetch(API_URL + '/rp_documento_revisiones?id=eq.' + bom.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad_revisada: bom.cantidad_sistema,
          revisado_por: usuario?.id
        })
      });

      // Actualizar listas
      setBomsPendientes(bomsPendientes.filter((b: any) => b.id !== bom.id));
      const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + palletActual.id + '&order=creado_en.asc', { headers: HEADERS });
      setRevisiones(await respRev.json() || []);
      await cargarPallets(documentoSeleccionado);
    } catch (e) {
      mostrarMensaje('error', 'Error al confirmar BOM');
    }
  };

  const handleAgregarManual = async () => {
    if (!manualSKU.trim() || !palletActual) return;

    try {
      const cantidad = parseInt(manualCantidad) || 1;
      await fetch(API_URL + '/rp_documento_revisiones', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          documento_id: documentoSeleccionado.id_documento,
          pallet_id: palletActual.id,
          bom_sku: manualSKU.trim().toUpperCase(),
          cantidad_sistema: 0,
          cantidad_revisada: cantidad,
          origen: manualEmpaque || manualOrigen,
          revisado_por: usuario?.id
        })
      });

      // Actualizar pallet con el número de empaque manual
      if (manualEmpaque && palletActual.numero_empaque !== manualEmpaque) {
        await fetch(API_URL + '/rp_documento_pallets?id=eq.' + palletActual.id, {
          method: 'PATCH',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ numero_empaque: manualEmpaque, origen: manualOrigen })
        });
      }

      setManualSKU('');
      setManualCantidad('1');
      setMostrarAgregarManual(false);
      
      const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + palletActual.id + '&order=creado_en.asc', { headers: HEADERS });
      setRevisiones(await respRev.json() || []);
      await cargarPallets(documentoSeleccionado);
      
      mostrarMensaje('success', 'SKU agregado correctamente');
    } catch (e) {
      mostrarMensaje('error', 'Error al agregar SKU');
    }
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
        <button className="rp02-btn" onClick={() => documentoSeleccionado && handleAbrirDocumento(documentoSeleccionado)}
          disabled={!documentoSeleccionado}>
          Abrir Documento
        </button>
      </div>

      {documentoSeleccionado && (
        <div className="rp02-selected-info">
          <span>Documento: <strong>{documentoSeleccionado.id_documento}</strong> - {documentoSeleccionado.estado}</span>
          <button className="rp02-selected-close" onClick={() => setDocumentoSeleccionado(null)}>×</button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
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
                  <td style={{ fontFamily: 'Courier New, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{doc.id_documento}</td>
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
        <div className="rp02-modal-overlay" onClick={() => { setMostrarRevisar(false); setPalletActual(null); setCapturandoBOMs(false); }}>
          <div className="rp02-modal" style={{ maxWidth: '650px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header">
              <h2>{documentoSeleccionado.id_documento} - Revisión</h2>
              <button className="rp02-modal-close" onClick={() => { setMostrarRevisar(false); setPalletActual(null); setCapturandoBOMs(false); }}>×</button>
            </div>
            <div className="rp02-modal-body">
              {!palletActual ? (
                <>
                  <button className="rp02-btn rp02-btn-primary" onClick={handleIniciarPallet} style={{ marginBottom: '16px', width: '100%', justifyContent: 'center' }}>
                    + Iniciar Pallet_{palletsDoc.length + 1}
                  </button>

                  <div className="rp02-modal-section-title" style={{ marginBottom: '10px' }}>Pallets del Documento</div>
                  {palletsDoc.map((pallet: any) => (
                    <div key={pallet.id} className="rp02-pallet-card" onClick={() => handleSeleccionarPallet(pallet)} style={{ cursor: 'pointer' }}>
                      <div className="rp02-pallet-header">
                        <span className="rp02-pallet-numero">{pallet.numero_pallet}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {pallet.numero_empaque || 'Sin empaque'} | {pallet.total_revisado} items
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <button onClick={() => { setPalletActual(null); setCapturandoBOMs(false); setBomsPendientes([]); }} className="rp02-btn" style={{ marginBottom: '16px' }}>
                    ← Volver a Pallets
                  </button>

                  <div style={{ background: 'var(--bg-section)', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                    <div className="rp02-form-label" style={{ marginBottom: '8px' }}>{palletActual.numero_pallet}</div>
                    
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        id="rp02-input-empaque"
                        ref={inputEmpaqueRef}
                        type="text"
                        className="rp02-form-input"
                        placeholder="Escanear o escribir N° Empaque..."
                        onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleCapturarEmpaque(); } }}
                        autoFocus
                      />
                      <button className="rp02-btn-save" onClick={handleCapturarEmpaque} style={{ whiteSpace: 'nowrap' }}>
                        Capturar
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Empaque actual: {palletActual.numero_empaque || 'Ninguno'}
                    </span>
                  </div>

                  {capturandoBOMs && bomsPendientes.length > 0 && (
                    <div className="rp02-modal-section">
                      <div className="rp02-modal-section-title">
                        BOMs por Confirmar ({bomsPendientes.length})
                      </div>
                      {bomsPendientes.map((bom: any) => (
                        <div key={bom.id} className="rp02-bom-item" style={{ marginBottom: '6px' }}>
                          <div>
                            <span className="rp02-bom-sku">{bom.bom_sku}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              Sistema: {bom.cantidad_sistema}
                            </span>
                          </div>
                          <button
                            className="rp02-btn-save"
                            onClick={() => handleConfirmarBOM(bom)}
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                          >
                            Confirmar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {revisiones.filter((r: any) => r.cantidad_revisada > 0).length > 0 && (
                    <div className="rp02-modal-section">
                      <div className="rp02-modal-section-title">
                        BOMs Revisados ({revisiones.filter((r: any) => r.cantidad_revisada > 0).length})
                      </div>
                      {revisiones.filter((r: any) => r.cantidad_revisada > 0).map((rev: any) => (
                        <div key={rev.id} className="rp02-bom-item" style={{
                          background: rev.origen !== 'SISTEMA' ? 'var(--warning-bg)' : 'var(--success-bg)',
                          borderColor: rev.origen !== 'SISTEMA' ? 'var(--warning-border)' : 'var(--success-border)',
                          marginBottom: '4px'
                        }}>
                          <div>
                            <span className="rp02-bom-sku">{rev.bom_sku}</span>
                            {rev.origen !== 'SISTEMA' && (
                              <span style={{ fontSize: '10px', color: 'var(--warning-text)', display: 'block' }}>{rev.origen}</span>
                            )}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success-text)' }}>
                            {rev.cantidad_revisada}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {mostrarAgregarManual && (
                    <div className="rp02-modal-section" style={{ background: 'var(--warning-bg)', padding: '14px', borderRadius: '8px', border: '1px solid var(--warning-border)' }}>
                      <div className="rp02-modal-section-title" style={{ color: 'var(--warning-text)' }}>Agregar SKU Manual</div>
                      <div className="rp02-manual-form">
                        <input ref={inputManualSKURef} type="text" value={manualSKU} onChange={(e: any) => setManualSKU(e.target.value)}
                          onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarManual(); } }}
                          placeholder="SKU" style={{ flex: 2 }} />
                        <input type="number" value={manualCantidad} onChange={(e: any) => setManualCantidad(e.target.value)}
                          placeholder="Cant" min="1" style={{ flex: 1, minWidth: '60px' }} />
                        <select value={manualOrigen} onChange={(e: any) => setManualOrigen(e.target.value)} style={{ flex: 2 }}>
                          {ORIGENES_MANUALES.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <button className="rp02-btn-save" onClick={handleAgregarManual} style={{ whiteSpace: 'nowrap' }}>Agregar</button>
                      </div>
                    </div>
                  )}

                  <button className="rp02-btn-agregar" onClick={() => { setMostrarAgregarManual(!mostrarAgregarManual); setManualSKU(''); setManualCantidad('1'); }}>
                    {mostrarAgregarManual ? 'Cancelar' : '+ Agregar SKU Manual'}
                  </button>
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
