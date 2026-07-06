// src/components/Transactions/RP/RP02Revision.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import './RP02.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const ORIGENES = [
  { codigo: 'CD01', nombre: 'Centro Distribución Central', requiereBOM: true },
  { codigo: 'CD12', nombre: 'Bodegas Lampa', requiereBOM: true },
  { codigo: 'CD30', nombre: 'Bodegas Renca', requiereBOM: true },
  { codigo: 'C144', nombre: 'Bodega Holly Concept', requiereBOM: true },
  { codigo: 'CD16', nombre: 'Bodega San Francisco', requiereBOM: true },
  { codigo: 'SG01', nombre: 'Internet', requiereBOM: true },
  { codigo: 'SG02', nombre: 'Insumos', requiereBOM: true },
  { codigo: 'SG03', nombre: 'Traspasos', requiereBOM: true },
  { codigo: 'SG04', nombre: 'Valija', requiereBOM: true },
  { codigo: 'SG05', nombre: 'Bultos Regularizar Stock', requiereBOM: true },
  { codigo: 'SG06', nombre: 'Bultos Quedados en Camion', requiereBOM: true },
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
  const [capturas, setCapturas]: any = useState([]);
  const [cajaActual, setCajaActual]: any = useState(1);
  const [origenSeleccionado, setOrigenSeleccionado]: any = useState('');
  const [bomInput, setBomInput]: any = useState('');
  const [cantidadInput, setCantidadInput]: any = useState('1');
  const [mostrarDetallePallet, setMostrarDetallePallet]: any = useState(false);
  const [palletDetalle, setPalletDetalle]: any = useState(null);
  const bomInputRef: any = useRef(null);
  const cantidadInputRef: any = useRef(null);
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
        body: JSON.stringify({ id_documento: idDocumento, estado: 'Pendiente', creado_por: usuario?.id })
      });
      mostrarMensaje('success', 'Documento ' + idDocumento + ' creado');
      setMostrarCrearDoc(false);
      cargarDocumentos();
    } catch (e) { mostrarMensaje('error', 'Error al crear documento'); }
  };

  const handleEliminarDocumento = async () => {
    if (!documentoSeleccionado) { mostrarMensaje('warning', 'Seleccione un documento'); return; }
    if (!window.confirm('¿Eliminar documento ' + documentoSeleccionado.id_documento + '?')) return;
    try {
      await fetch(API_URL + '/rp_documento_revisiones?documento_id=eq.' + documentoSeleccionado.id_documento, { method: 'DELETE', headers: HEADERS });
      await fetch(API_URL + '/rp_documento_pallets?documento_id=eq.' + documentoSeleccionado.id_documento, { method: 'DELETE', headers: HEADERS });
      await fetch(API_URL + '/rp_documentos?id=eq.' + documentoSeleccionado.id, { method: 'DELETE', headers: HEADERS });
      mostrarMensaje('success', 'Documento eliminado');
      setDocumentoSeleccionado(null);
      cargarDocumentos();
    } catch (e) { mostrarMensaje('error', 'Error al eliminar'); }
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
        const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + pallet.id + '&order=caja_numero.asc', { headers: HEADERS });
        return { ...pallet, revisiones: await respRev.json() || [] };
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
        body: JSON.stringify({ documento_id: documentoSeleccionado.id_documento, numero_pallet: numeroPallet })
      });
      if (resp.ok) {
        const palletData = await resp.json();
        const nuevoPallet = Array.isArray(palletData) ? palletData[0] : palletData;
        await cargarPallets(documentoSeleccionado);
        setPalletActual(nuevoPallet);
        setCapturas([]);
        setCajaActual(1);
        setOrigenSeleccionado('');
        setBomInput('');
        setCantidadInput('1');
        mostrarMensaje('success', numeroPallet + ' iniciado');
      }
    } catch (e) { mostrarMensaje('error', 'Error al iniciar pallet'); }
  };

  const handleAbrirPallet = async (pallet: any) => {
    setPalletActual(pallet);
    const revisiones = pallet.revisiones || [];
    
    // Reconstruir capturas
    const capturasTemp: any[] = [];
    let maxCaja = 0;
    
    revisiones.forEach((r: any) => {
      if (r.caja_numero > maxCaja) maxCaja = r.caja_numero;
      
      capturasTemp.push({
        caja: r.caja_numero,
        origen: r.origen,
        bom_sku: r.bom_sku,
        cantidad: r.cantidad_revisada,
        cantidad_sistema: r.cantidad_sistema,
        estado: r.estado || 'OK'
      });
    });
    
    setCapturas(capturasTemp.sort((a: any, b: any) => a.caja - b.caja));
    setCajaActual(maxCaja + 1);
    setOrigenSeleccionado('');
    setBomInput('');
    setCantidadInput('1');
  };

  const handleAgregarCaptura = async () => {
    if (!origenSeleccionado) {
      mostrarMensaje('warning', 'Seleccione un origen');
      return;
    }
    if (!palletActual) return;

    const origenData = ORIGENES.find(o => o.codigo === origenSeleccionado);
    const cantidad = parseInt(cantidadInput) || 1;
    const bom = bomInput.trim().toUpperCase();

    let cantidadSistema = 0;
    let estado = 'OK';

    // Si es CD01, verificar contra inventario
    if (origenSeleccionado === 'CD01' && bom) {
      try {
        // Buscar en todos los BOMs del inventario
        const resp = await fetch(API_URL + '/rp_inventario_boms?select=*,rp_inventario_empaques!inner(numero_empaque,cod_destino,destino)&bom_sku=eq.' + encodeURIComponent(bom), { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) {
          cantidadSistema = data.reduce((s: number, b: any) => s + (b.cantidad_maxima || 0), 0);
          estado = cantidad === cantidadSistema ? 'OK' : (cantidad < cantidadSistema ? 'FALTA' : 'SOBRA');
        } else {
          estado = 'NO_ENCONTRADO';
        }
      } catch (e) {}
    }

    const nuevaCaptura = {
      caja: cajaActual,
      origen: origenSeleccionado,
      bom_sku: bom || '-',
      cantidad,
      cantidad_sistema: cantidadSistema,
      estado
    };

    setCapturas([...capturas, nuevaCaptura]);
    setCajaActual(cajaActual + 1);
    setBomInput('');
    setCantidadInput('1');
    setTimeout(() => bomInputRef.current?.focus(), 100);
  };

  const handleEliminarCaptura = (index: number) => {
    setCapturas(capturas.filter((_: any, i: number) => i !== index));
  };

  const handleFinalizarRevision = async () => {
    if (!palletActual || !documentoSeleccionado) return;
    if (capturas.length === 0) {
      mostrarMensaje('warning', 'No hay capturas para guardar');
      return;
    }

    try {
      // Eliminar revisiones anteriores
      await fetch(API_URL + '/rp_documento_revisiones?pallet_id=eq.' + palletActual.id, { method: 'DELETE', headers: HEADERS });

      // Guardar cada captura
      for (const cap of capturas) {
        await fetch(API_URL + '/rp_documento_revisiones', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documento_id: documentoSeleccionado.id_documento,
            pallet_id: palletActual.id,
            caja_numero: cap.caja,
            bom_sku: cap.bom_sku,
            cantidad_sistema: cap.cantidad_sistema,
            cantidad_revisada: cap.cantidad,
            origen: cap.origen,
            estado: cap.estado,
            revisado_por: usuario?.id
          })
        });
      }

      await cargarPallets(documentoSeleccionado);
      mostrarMensaje('success', 'Revisión finalizada - ' + capturas.length + ' cajas guardadas');
      setPalletActual(null);
      setCapturas([]);
      setCajaActual(1);
    } catch (e) { mostrarMensaje('error', 'Error al finalizar revisión'); }
  };

  const handleVerDetallePallet = (pallet: any) => {
    setPalletDetalle(pallet);
    setMostrarDetallePallet(true);
  };

  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case 'OK': return { bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-border)' };
      case 'FALTA': return { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)' };
      case 'SOBRA': return { bg: 'var(--error-bg)', color: 'var(--error-text)', border: 'var(--error-border)' };
      case 'NO_ENCONTRADO': return { bg: 'var(--error-bg)', color: 'var(--error-text)', border: 'var(--error-border)' };
      default: return { bg: 'var(--bg-panel)', color: 'var(--text-primary)', border: 'var(--border)' };
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
      {mensaje.visible && <div className={'rp02-toast rp02-toast-' + mensaje.tipo}>{mensaje.texto}</div>}

      <div className="rp02-header"><h2>RP02 · Revisión Pallet</h2></div>

      <div className="rp02-toolbar">
        <button className="rp02-btn rp02-btn-primary" onClick={() => setMostrarCrearDoc(true)}>+ Nuevo Documento</button>
        <button className="rp02-btn" onClick={() => documentoSeleccionado && handleAbrirDocumento(documentoSeleccionado)} disabled={!documentoSeleccionado}>Abrir Documento</button>
        <div className="rp02-separator"></div>
        <button className="rp02-btn rp01-btn-danger" onClick={handleEliminarDocumento} disabled={!documentoSeleccionado}>Eliminar</button>
      </div>

      {documentoSeleccionado && (
        <div className="rp02-selected-info">
          <span>Documento: <strong>{documentoSeleccionado.id_documento}</strong></span>
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
                <tr key={doc.id} onClick={() => setDocumentoSeleccionado(documentoSeleccionado && documentoSeleccionado.id === doc.id ? null : doc)}
                  style={{ cursor: 'pointer', background: documentoSeleccionado && documentoSeleccionado.id === doc.id ? 'var(--table-row-selected)' : 'transparent' }}>
                  <td><input type="radio" className="sd01-radio" checked={documentoSeleccionado && documentoSeleccionado.id === doc.id} onChange={() => setDocumentoSeleccionado(doc)} onClick={(e: any) => e.stopPropagation()} /></td>
                  <td style={{ fontFamily: 'Courier New, monospace', fontWeight: 600 }}>{doc.id_documento}</td>
                  <td>{doc.estado}</td>
                  <td>{new Date(doc.creado_en).toLocaleString('es-CL')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Documento */}
      {mostrarCrearDoc && (
        <div className="rp02-modal-overlay" onClick={() => setMostrarCrearDoc(false)}>
          <div className="rp02-modal" style={{ maxWidth: '450px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header"><h2>Nuevo Documento</h2><button className="rp02-modal-close" onClick={() => setMostrarCrearDoc(false)}>×</button></div>
            <div className="rp02-modal-body"><p style={{ color: 'var(--text-secondary)' }}>Se generará un nuevo documento con ID automático.</p></div>
            <div className="rp02-modal-footer">
              <button className="rp02-btn-cancel" onClick={() => setMostrarCrearDoc(false)}>Cancelar</button>
              <button className="rp02-btn-save" onClick={handleCrearDocumento}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Revisión */}
      {mostrarRevisar && documentoSeleccionado && (
        <div className="rp02-modal-overlay" onClick={() => { setMostrarRevisar(false); setPalletActual(null); }}>
          <div className="rp02-modal" style={{ maxWidth: '800px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header">
              <h2>{documentoSeleccionado.id_documento} - Revisión</h2>
              <button className="rp02-modal-close" onClick={() => { setMostrarRevisar(false); setPalletActual(null); }}>×</button>
            </div>
            <div className="rp02-modal-body">
              {!palletActual ? (
                <>
                  <button className="rp02-btn rp02-btn-primary" onClick={handleIniciarPallet} style={{ marginBottom: '16px', width: '100%', justifyContent: 'center' }}>
                    + Iniciar Pallet_{palletsDoc.length + 1}
                  </button>

                  {palletsDoc.map((pallet: any) => {
                    const revs = pallet.revisiones || [];
                    const totalItems = revs.filter((r: any) => r.cantidad_revisada > 0).length;
                    return (
                      <div key={pallet.id} className="rp02-pallet-card">
                        <div className="rp02-pallet-header">
                          <span className="rp02-pallet-numero" style={{ cursor: 'pointer' }} onClick={() => handleAbrirPallet(pallet)}>
                            {pallet.numero_pallet}
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="rp02-btn" onClick={() => handleVerDetallePallet(pallet)} style={{ fontSize: '11px', padding: '4px 10px' }}>Ver</button>
                            <button className="rp02-btn" onClick={() => handleAbrirPallet(pallet)} style={{ fontSize: '11px', padding: '4px 10px' }}>Editar</button>
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {totalItems} items | {revs.length} registros
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  <button onClick={() => { setPalletActual(null); }} className="rp02-btn" style={{ marginBottom: '16px' }}>
                    ← Volver a Pallets
                  </button>

                  {/* Panel de captura */}
                  <div style={{ background: 'var(--bg-section)', borderRadius: '8px', padding: '14px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="rp02-pallet-numero" style={{ fontSize: '16px' }}>{palletActual.numero_pallet}</span>
                      <span className="rp01-badge" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: '12px', padding: '4px 10px' }}>
                        Caja #{cajaActual}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                      <div className="rp02-form-group">
                        <label className="rp02-form-label">Origen</label>
                        <select className="rp02-form-input" value={origenSeleccionado} onChange={(e: any) => setOrigenSeleccionado(e.target.value)}>
                          <option value="">Seleccionar...</option>
                          {ORIGENES.map(o => <option key={o.codigo} value={o.codigo}>{o.codigo} - {o.nombre}</option>)}
                        </select>
                      </div>
                      <div className="rp02-form-group">
                        <label className="rp02-form-label">BOM/SKU</label>
                        <input ref={bomInputRef} type="text" className="rp02-form-input" value={bomInput}
                          onChange={(e: any) => setBomInput(e.target.value)}
                          onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); cantidadInputRef.current?.focus(); } }}
                          placeholder="Escanear BOM..." />
                      </div>
                      <div className="rp02-form-group">
                        <label className="rp02-form-label">Cantidad</label>
                        <input ref={cantidadInputRef} type="number" className="rp02-form-input" value={cantidadInput}
                          onChange={(e: any) => setCantidadInput(e.target.value)}
                          onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarCaptura(); } }}
                          min="1" />
                      </div>
                      <button className="rp02-btn-save" onClick={handleAgregarCaptura} style={{ height: '42px', whiteSpace: 'nowrap' }}>
                        Agregar
                      </button>
                    </div>
                  </div>

                  {/* Tabla de capturas */}
                  {capturas.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div className="rp02-modal-section-title" style={{ marginBottom: '8px' }}>
                        Capturas ({capturas.length} cajas)
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="ed03-tabla" style={{ minWidth: '700px' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '60px', textAlign: 'center' }}>Caja #</th>
                              <th>Origen</th>
                              <th>BOM</th>
                              <th style={{ textAlign: 'center', width: '80px' }}>Cantidad</th>
                              <th style={{ textAlign: 'center', width: '100px' }}>Cant. Sistema</th>
                              <th style={{ textAlign: 'center', width: '100px' }}>Estado</th>
                              <th style={{ width: '40px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {capturas.map((cap: any, idx: number) => {
                              const estilo = getEstadoStyle(cap.estado);
                              return (
                                <tr key={idx}>
                                  <td style={{ textAlign: 'center' }}>
                                    <span className="rp01-badge" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: '11px', padding: '2px 8px' }}>
                                      #{cap.caja}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 500 }}>{cap.origen}</td>
                                  <td style={{ fontFamily: 'Courier New, monospace', fontWeight: 600 }}>{cap.bom_sku}</td>
                                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{cap.cantidad}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    {cap.cantidad_sistema > 0 ? cap.cantidad_sistema : '-'}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '3px 10px',
                                      borderRadius: '10px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      background: estilo.bg,
                                      color: estilo.color,
                                      border: '1px solid ' + estilo.border
                                    }}>
                                      {cap.estado}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => handleEliminarCaptura(idx)} style={{
                                      width: '22px', height: '22px', background: 'var(--error-bg)', color: 'var(--error-text)',
                                      border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'
                                    }}>×</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Resumen */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px' }}>
                        <div className="rp01-resumen-card" style={{ padding: '8px' }}>
                          <span style={{ fontSize: '10px' }}>Total Cajas</span>
                          <strong style={{ fontSize: '16px' }}>{capturas.length}</strong>
                        </div>
                        <div className="rp01-resumen-card" style={{ padding: '8px' }}>
                          <span style={{ fontSize: '10px' }}>Total Unidades</span>
                          <strong style={{ fontSize: '16px' }}>{capturas.reduce((s: number, c: any) => s + c.cantidad, 0)}</strong>
                        </div>
                        <div className="rp01-resumen-card" style={{ padding: '8px' }}>
                          <span style={{ fontSize: '10px' }}>OK / Diferencias</span>
                          <strong style={{ fontSize: '16px' }}>
                            <span style={{ color: 'var(--success-text)' }}>{capturas.filter((c: any) => c.estado === 'OK').length}</span>
                            <span style={{ color: 'var(--text-muted)' }}> / </span>
                            <span style={{ color: 'var(--error-text)' }}>{capturas.filter((c: any) => c.estado !== 'OK').length}</span>
                          </strong>
                        </div>
                      </div>

                      <button className="rp02-btn rp02-btn-primary" onClick={handleFinalizarRevision}
                        style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                        Finalizar Revisión
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Pallet */}
      {mostrarDetallePallet && palletDetalle && (
        <div className="rp02-modal-overlay" onClick={() => setMostrarDetallePallet(false)}>
          <div className="rp02-modal" style={{ maxWidth: '700px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header">
              <h2>{palletDetalle.numero_pallet} - Detalle</h2>
              <button className="rp02-modal-close" onClick={() => setMostrarDetallePallet(false)}>×</button>
            </div>
            <div className="rp02-modal-body">
              <div style={{ overflowX: 'auto' }}>
                <table className="ed03-tabla" style={{ minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', width: '60px' }}>Caja #</th>
                      <th>Origen</th>
                      <th>BOM</th>
                      <th style={{ textAlign: 'center' }}>Cant.</th>
                      <th style={{ textAlign: 'center' }}>Sist.</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(palletDetalle.revisiones || []).length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-placeholder)' }}>Sin revisiones</td></tr>
                    ) : (
                      (palletDetalle.revisiones || []).map((rev: any, idx: number) => {
                        const estilo = getEstadoStyle(rev.estado || 'OK');
                        return (
                          <tr key={idx}>
                            <td style={{ textAlign: 'center' }}>
                              <span className="rp01-badge" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: '10px' }}>#{rev.caja_numero}</span>
                            </td>
                            <td>{rev.origen}</td>
                            <td style={{ fontFamily: 'Courier New, monospace', fontWeight: 600 }}>{rev.bom_sku}</td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{rev.cantidad_revisada}</td>
                            <td style={{ textAlign: 'center' }}>{rev.cantidad_sistema > 0 ? rev.cantidad_sistema : '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                                fontSize: '10px', fontWeight: 600, background: estilo.bg, color: estilo.color,
                                border: '1px solid ' + estilo.border
                              }}>
                                {rev.estado || 'OK'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rp02-modal-footer">
              <button className="rp02-btn-cancel" onClick={() => setMostrarDetallePallet(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RP02Revision;
