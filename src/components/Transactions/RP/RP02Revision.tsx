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
  { codigo: 'CD01', nombre: 'Centro Distribución Central' },
  { codigo: 'CD12', nombre: 'Bodegas Lampa' },
  { codigo: 'CD30', nombre: 'Bodegas Renca' },
  { codigo: 'C144', nombre: 'Bodega Holly Concept' },
  { codigo: 'CD16', nombre: 'Bodega San Francisco' },
  { codigo: 'SG01', nombre: 'Internet' },
  { codigo: 'SG02', nombre: 'Insumos' },
  { codigo: 'SG03', nombre: 'Traspasos' },
  { codigo: 'SG04', nombre: 'Valija' },
  { codigo: 'SG05', nombre: 'Bultos Regularizar Stock' },
  { codigo: 'SG06', nombre: 'Bultos Quedados en Camion' },
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
  const [etapa, setEtapa]: any = useState('origenes');
  const [origenesAgregados, setOrigenesAgregados]: any = useState([]);
  const [bomsConsolidados, setBomsConsolidados]: any = useState([]);
  const [capturasBOM, setCapturasBOM]: any = useState([]);
  const [cajaActual, setCajaActual]: any = useState(1);
  const [inputBOM, setInputBOM]: any = useState('');
  const [mostrarAgregarOrigen, setMostrarAgregarOrigen]: any = useState(false);
  const [nuevoOrigen, setNuevoOrigen]: any = useState('');
  const [nuevoNumeroEmpaque, setNuevoNumeroEmpaque]: any = useState('');
  const [nuevaCantidadCajas, setNuevaCantidadCajas]: any = useState('1');
  const [mostrarDetallePallet, setMostrarDetallePallet]: any = useState(false);
  const [palletDetalle, setPalletDetalle]: any = useState(null);
  const inputBOMRef: any = useRef(null);
  const inputEmpaqueRef: any = useRef(null);
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
    } catch (e) {
      mostrarMensaje('error', 'Error al crear documento');
    }
  };

  const handleEliminarDocumento = async () => {
    if (!documentoSeleccionado) { mostrarMensaje('warning', 'Seleccione un documento'); return; }
    if (!window.confirm('¿Eliminar el documento ' + documentoSeleccionado.id_documento + '?')) return;
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
        const revisiones = await respRev.json() || [];
        return { ...pallet, revisiones };
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
        setEtapa('origenes');
        setOrigenesAgregados([]);
        setBomsConsolidados([]);
        setCapturasBOM([]);
        setCajaActual(1);
        setInputBOM('');
        mostrarMensaje('success', numeroPallet + ' iniciado');
      }
    } catch (e) { mostrarMensaje('error', 'Error al iniciar pallet'); }
  };

  const handleAbrirPallet = async (pallet: any) => {
    setPalletActual(pallet);
    const revisiones = pallet.revisiones || [];
    
    // Reconstruir orígenes desde las revisiones
    const origenesMap: Record<string, any> = {};
    const capturasTemp: any[] = [];
    const bomsTemp: any[] = [];
    let maxCaja = 0;

    revisiones.forEach((r: any) => {
      const key = r.origen + '|' + (r.numero_empaque || '');
      if (!origenesMap[key]) {
        origenesMap[key] = {
          origen: r.origen,
          numero_empaque: r.numero_empaque || '',
          cantidad_cajas: 0
        };
      }
      origenesMap[key].cantidad_cajas += r.cantidad_revisada || 0;
      
      if (r.caja_numero > maxCaja) maxCaja = r.caja_numero;

      if (r.origen === 'SISTEMA') {
        const existente = bomsTemp.find((b: any) => b.bom_sku === r.bom_sku);
        if (existente) {
          existente.cantidad_sistema = Math.max(existente.cantidad_sistema, r.cantidad_sistema || 0);
          existente.cantidad_revisada += r.cantidad_revisada || 0;
        } else {
          bomsTemp.push({
            bom_sku: r.bom_sku,
            cantidad_sistema: r.cantidad_sistema || 0,
            cantidad_revisada: r.cantidad_revisada || 0
          });
        }
      }

      // Reconstruir capturas individuales
      for (let i = 0; i < (r.cantidad_revisada || 0); i++) {
        capturasTemp.push({
          caja: r.caja_numero + i,
          bom_sku: r.bom_sku,
          origen: r.origen,
          estado: 'capturado',
          creado_en: r.creado_en
        });
      }
    });

    setOrigenesAgregados(Object.values(origenesMap));
    setBomsConsolidados(bomsTemp);
    setCapturasBOM(capturasTemp.sort((a: any, b: any) => a.caja - b.caja));
    setCajaActual(maxCaja + 1);
    setEtapa('origenes');
    setInputBOM('');
  };

  const handleAgregarOrigen = () => {
    if (!nuevoOrigen) { mostrarMensaje('warning', 'Seleccione un origen'); return; }

    if (nuevoOrigen === 'CD01' && !nuevoNumeroEmpaque.trim()) {
      mostrarMensaje('warning', 'Ingrese número de empaque para CD01');
      return;
    }

    const key = nuevoOrigen + '|' + nuevoNumeroEmpaque;
    if (origenesAgregados.find((o: any) => (o.origen + '|' + o.numero_empaque) === key)) {
      mostrarMensaje('warning', 'Este origen ya fue agregado');
      return;
    }

    setOrigenesAgregados([...origenesAgregados, {
      origen: nuevoOrigen,
      numero_empaque: nuevoNumeroEmpaque.trim(),
      cantidad_cajas: parseInt(nuevaCantidadCajas) || 1
    }]);

    setNuevoOrigen('');
    setNuevoNumeroEmpaque('');
    setNuevaCantidadCajas('1');
    setMostrarAgregarOrigen(false);
  };

  const handleEliminarOrigen = (index: number) => {
    setOrigenesAgregados(origenesAgregados.filter((_: any, i: number) => i !== index));
  };

  const handleIniciarRevision = async () => {
    if (origenesAgregados.length === 0) { mostrarMensaje('warning', 'Agregue al menos un origen'); return; }
    if (!palletActual) return;

    // Consolidar BOMs de empaques CD01
    let bomsTemp: any[] = [];
    for (const org of origenesAgregados) {
      if (org.origen === 'CD01' && org.numero_empaque) {
        try {
          const resp = await fetch(API_URL + '/rp_inventario_empaques?select=id&numero_empaque=eq.' + encodeURIComponent(org.numero_empaque), { headers: HEADERS });
          const empaques = await resp.json();
          if (empaques && empaques.length > 0) {
            const respBoms = await fetch(API_URL + '/rp_inventario_boms?select=*&empaque_id=eq.' + empaques[0].id, { headers: HEADERS });
            const boms = await respBoms.json();
            if (boms) {
              for (const bom of boms) {
                const existente = bomsTemp.find((b: any) => b.bom_sku === bom.bom_sku);
                if (existente) {
                  existente.cantidad_sistema += bom.cantidad_maxima;
                } else {
                  bomsTemp.push({ bom_sku: bom.bom_sku, cantidad_sistema: bom.cantidad_maxima, cantidad_revisada: 0 });
                }
              }
            }
          }
        } catch (e) {}
      }
    }

    setBomsConsolidados(bomsTemp);
    setCapturasBOM([]);
    setCajaActual(1);
    setEtapa('revision');
    setTimeout(() => inputBOMRef.current?.focus(), 300);
  };

  const handleCapturarBOM = () => {
    const valor = inputBOM.trim();
    if (!valor) return;

    const bomEsperado = bomsConsolidados.find((b: any) => b.bom_sku === valor);
    let estado = 'no_encontrado';
    let mensajeCaptura = 'BOM no encontrado en sistema';

    if (bomEsperado) {
      const nuevaCantidad = bomEsperado.cantidad_revisada + 1;
      if (nuevaCantidad < bomEsperado.cantidad_sistema) {
        estado = 'falta';
        mensajeCaptura = 'Falta ' + (bomEsperado.cantidad_sistema - nuevaCantidad);
      } else if (nuevaCantidad === bomEsperado.cantidad_sistema) {
        estado = 'completo';
        mensajeCaptura = 'Completo';
      } else {
        estado = 'sobra';
        mensajeCaptura = 'Sobra ' + (nuevaCantidad - bomEsperado.cantidad_sistema);
      }
      setBomsConsolidados(bomsConsolidados.map((b: any) => {
        if (b.bom_sku === valor) return { ...b, cantidad_revisada: nuevaCantidad };
        return b;
      }));
    }

    setCapturasBOM([...capturasBOM, {
      caja: cajaActual,
      bom_sku: valor,
      estado,
      mensaje: mensajeCaptura,
      creado_en: new Date().toISOString()
    }]);

    setCajaActual(cajaActual + 1);
    setInputBOM('');
    setTimeout(() => inputBOMRef.current?.focus(), 100);
  };

  const handleEliminarCaptura = (index: number) => {
    const captura = capturasBOM[index];
    if (captura.estado !== 'no_encontrado') {
      const bomEsperado = bomsConsolidados.find((b: any) => b.bom_sku === captura.bom_sku);
      if (bomEsperado && bomEsperado.cantidad_revisada > 0) {
        setBomsConsolidados(bomsConsolidados.map((b: any) => {
          if (b.bom_sku === captura.bom_sku) return { ...b, cantidad_revisada: b.cantidad_revisada - 1 };
          return b;
        }));
      }
    }
    setCapturasBOM(capturasBOM.filter((_: any, i: number) => i !== index));
  };

  const handleFinalizarRevision = async () => {
    if (!palletActual || !documentoSeleccionado) return;

    try {
      // Eliminar revisiones anteriores de este pallet
      await fetch(API_URL + '/rp_documento_revisiones?pallet_id=eq.' + palletActual.id, { method: 'DELETE', headers: HEADERS });

      // Guardar orígenes como parte del pallet
      const empaquesStr = origenesAgregados.map((o: any) => o.origen + (o.numero_empaque ? ':' + o.numero_empaque : '')).join(',');
      await fetch(API_URL + '/rp_documento_pallets?id=eq.' + palletActual.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_empaque: empaquesStr })
      });

      // Guardar cada captura como una revisión individual
      for (let i = 0; i < capturasBOM.length; i++) {
        const cap = capturasBOM[i];
        const bomEsperado = bomsConsolidados.find((b: any) => b.bom_sku === cap.bom_sku);
        
        // Determinar el origen de esta captura
        let origenCaptura = 'MANUAL';
        if (bomEsperado && cap.estado !== 'no_encontrado') {
          origenCaptura = 'SISTEMA';
        } else if (cap.estado === 'no_encontrado') {
          // Buscar si pertenece a algún origen manual
          const origenManual = origenesAgregados.find((o: any) => o.origen !== 'CD01');
          if (origenManual) origenCaptura = origenManual.origen;
        }

        await fetch(API_URL + '/rp_documento_revisiones', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documento_id: documentoSeleccionado.id_documento,
            pallet_id: palletActual.id,
            caja_numero: cap.caja,
            bom_sku: cap.bom_sku,
            cantidad_sistema: bomEsperado ? bomEsperado.cantidad_sistema : 0,
            cantidad_revisada: 1,
            origen: origenCaptura,
            numero_empaque: cap.estado === 'no_encontrado' ? null : (origenesAgregados.find((o: any) => o.origen === 'CD01')?.numero_empaque || null),
            revisado_por: usuario?.id
          })
        });
      }

      // También guardar BOMs del sistema que no se capturaron (cantidad 0)
      for (const bom of bomsConsolidados) {
        if (bom.cantidad_revisada === 0 && bom.cantidad_sistema > 0) {
          await fetch(API_URL + '/rp_documento_revisiones', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documento_id: documentoSeleccionado.id_documento,
              pallet_id: palletActual.id,
              caja_numero: 0,
              bom_sku: bom.bom_sku,
              cantidad_sistema: bom.cantidad_sistema,
              cantidad_revisada: 0,
              origen: 'SISTEMA',
              revisado_por: usuario?.id
            })
          });
        }
      }

      await cargarPallets(documentoSeleccionado);
      mostrarMensaje('success', 'Revisión finalizada');
      setPalletActual(null);
      setEtapa('origenes');
      setOrigenesAgregados([]);
      setBomsConsolidados([]);
      setCapturasBOM([]);
      setCajaActual(1);
    } catch (e) { mostrarMensaje('error', 'Error al finalizar revisión'); }
  };

  const handleVerDetallePallet = (pallet: any) => {
    setPalletDetalle(pallet);
    setMostrarDetallePallet(true);
  };

  const totalSistema = bomsConsolidados.reduce((s: number, b: any) => s + b.cantidad_sistema, 0);
  const totalRevisado = bomsConsolidados.reduce((s: number, b: any) => s + b.cantidad_revisada, 0);
  const diferencia = totalRevisado - totalSistema;

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
        <button className="rp02-btn rp01-btn-danger" onClick={handleEliminarDocumento} disabled={!documentoSeleccionado}>Eliminar Documento</button>
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
                <tr key={doc.id} onClick={() => { if (documentoSeleccionado && documentoSeleccionado.id === doc.id) setDocumentoSeleccionado(null); else setDocumentoSeleccionado(doc); }}
                  style={{ cursor: 'pointer', background: documentoSeleccionado && documentoSeleccionado.id === doc.id ? 'var(--table-row-selected)' : 'transparent' }}>
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
            <div className="rp02-modal-header"><h2>Nuevo Documento</h2><button className="rp02-modal-close" onClick={() => setMostrarCrearDoc(false)}>×</button></div>
            <div className="rp02-modal-body"><p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Se generará un nuevo documento con ID automático.</p></div>
            <div className="rp02-modal-footer">
              <button className="rp02-btn-cancel" onClick={() => setMostrarCrearDoc(false)}>Cancelar</button>
              <button className="rp02-btn-save" onClick={handleCrearDocumento}>Crear Documento</button>
            </div>
          </div>
        </div>
      )}

      {mostrarRevisar && documentoSeleccionado && (
        <div className="rp02-modal-overlay" onClick={() => { setMostrarRevisar(false); setPalletActual(null); setEtapa('origenes'); }}>
          <div className="rp02-modal" style={{ maxWidth: '750px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header">
              <h2>{documentoSeleccionado.id_documento} - Pallets</h2>
              <button className="rp02-modal-close" onClick={() => { setMostrarRevisar(false); setPalletActual(null); setEtapa('origenes'); }}>×</button>
            </div>
            <div className="rp02-modal-body">
              {!palletActual ? (
                <>
                  <button className="rp02-btn rp02-btn-primary" onClick={handleIniciarPallet} style={{ marginBottom: '16px', width: '100%', justifyContent: 'center' }}>
                    + Iniciar Pallet_{palletsDoc.length + 1}
                  </button>

                  {palletsDoc.map((pallet: any) => {
                    const revisiones = pallet.revisiones || [];
                    const totalItems = revisiones.reduce((s: number, r: any) => s + (r.cantidad_revisada || 0), 0);
                    const origenesUnicos = new Set(revisiones.map((r: any) => r.origen));
                    
                    return (
                      <div key={pallet.id} className="rp02-pallet-card">
                        <div className="rp02-pallet-header">
                          <span className="rp02-pallet-numero" style={{ cursor: 'pointer' }} onClick={() => handleAbrirPallet(pallet)}>
                            {pallet.numero_pallet}
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="rp02-btn" onClick={() => handleVerDetallePallet(pallet)} style={{ fontSize: '11px', padding: '4px 10px' }}>
                              Ver Detalle
                            </button>
                            <button className="rp02-btn" onClick={() => handleAbrirPallet(pallet)} style={{ fontSize: '11px', padding: '4px 10px' }}>
                              Editar
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {origenesUnicos.size} orígenes | {totalItems} items | {pallet.numero_empaque || 'Sin empaques'}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  <button onClick={() => { setPalletActual(null); setEtapa('origenes'); }} className="rp02-btn" style={{ marginBottom: '16px' }}>
                    ← Volver a Pallets
                  </button>

                  <div style={{ background: 'var(--bg-section)', borderRadius: '8px', padding: '14px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="rp02-pallet-numero" style={{ fontSize: '16px' }}>{palletActual.numero_pallet}</span>
                      <span className="rp01-badge" style={{
                        background: etapa === 'origenes' ? 'var(--warning-bg)' : 'var(--info-bg)',
                        color: etapa === 'origenes' ? 'var(--warning-text)' : 'var(--info-text)'
                      }}>
                        {etapa === 'origenes' ? 'Etapa 1: Orígenes' : 'Etapa 2: Revisión BOMs'}
                      </span>
                    </div>

                    {etapa === 'origenes' ? (
                      <>
                        <button className="rp02-btn" onClick={() => setMostrarAgregarOrigen(!mostrarAgregarOrigen)}
                          style={{ marginBottom: '10px', width: '100%', justifyContent: 'center' }}>
                          {mostrarAgregarOrigen ? 'Cancelar' : '+ Agregar Origen'}
                        </button>

                        {mostrarAgregarOrigen && (
                          <div style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid var(--border)' }}>
                            <div className="rp02-form-group">
                              <label className="rp02-form-label">Origen</label>
                              <select className="rp02-form-input" value={nuevoOrigen} onChange={(e: any) => { setNuevoOrigen(e.target.value); setNuevoNumeroEmpaque(''); }}>
                                <option value="">Seleccionar...</option>
                                {ORIGENES.map(o => <option key={o.codigo} value={o.codigo}>{o.codigo} - {o.nombre}</option>)}
                              </select>
                            </div>
                            {nuevoOrigen === 'CD01' && (
                              <div className="rp02-form-group">
                                <label className="rp02-form-label">Número de Empaque</label>
                                <input ref={inputEmpaqueRef} type="text" className="rp02-form-input" value={nuevoNumeroEmpaque}
                                  onChange={(e: any) => setNuevoNumeroEmpaque(e.target.value)} placeholder="Escanear empaque..." />
                              </div>
                            )}
                            <button className="rp02-btn-save" onClick={handleAgregarOrigen} style={{ width: '100%', marginTop: '8px' }}>
                              Agregar Origen
                            </button>
                          </div>
                        )}

                        {origenesAgregados.length > 0 && (
                          <>
                            <div className="rp02-modal-section-title" style={{ marginBottom: '8px' }}>Orígenes Agregados</div>
                            {origenesAgregados.map((org: any, idx: number) => (
                              <div key={idx} className="rp02-bom-item" style={{ marginBottom: '4px' }}>
                                <div>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{org.origen}</span>
                                  {org.numero_empaque && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>{org.numero_empaque}</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{org.cantidad_cajas} cajas</span>
                                  <button onClick={() => handleEliminarOrigen(idx)} style={{
                                    width: '22px', height: '22px', background: 'var(--error-bg)', color: 'var(--error-text)',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'
                                  }}>×</button>
                                </div>
                              </div>
                            ))}
                            <button className="rp02-btn rp02-btn-primary" onClick={handleIniciarRevision}
                              style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}>
                              Iniciar Revisión de BOMs
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                          <div className="rp01-resumen-card" style={{ padding: '10px' }}><span style={{ fontSize: '10px' }}>Sistema</span><strong style={{ fontSize: '18px' }}>{totalSistema}</strong></div>
                          <div className="rp01-resumen-card" style={{ padding: '10px' }}><span style={{ fontSize: '10px' }}>Revisado</span><strong style={{ fontSize: '18px', color: totalRevisado >= totalSistema ? 'var(--success-text)' : 'var(--error-text)' }}>{totalRevisado}</strong></div>
                          <div className="rp01-resumen-card" style={{ padding: '10px' }}><span style={{ fontSize: '10px' }}>Caja #</span><strong style={{ fontSize: '18px' }}>{cajaActual}</strong></div>
                          <div className="rp01-resumen-card" style={{ padding: '10px' }}><span style={{ fontSize: '10px' }}>Diferencia</span><strong style={{ fontSize: '18px', color: diferencia === 0 ? 'var(--success-text)' : 'var(--error-text)' }}>{diferencia === 0 ? 'OK' : (diferencia > 0 ? '+' + diferencia : diferencia)}</strong></div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                          <input ref={inputBOMRef} type="text" className="rp02-form-input" value={inputBOM}
                            onChange={(e: any) => setInputBOM(e.target.value)}
                            onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleCapturarBOM(); } }}
                            placeholder="Escanear BOM/SKU..." autoFocus />
                          <button className="rp02-btn-save" onClick={handleCapturarBOM}>Capturar</button>
                        </div>

                        {bomsConsolidados.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <div className="rp02-modal-section-title">BOMs del Sistema</div>
                            {bomsConsolidados.map((bom: any) => (
                              <div key={bom.bom_sku} className="rp02-bom-item" style={{
                                marginBottom: '4px',
                                background: bom.cantidad_revisada === 0 ? 'var(--bg-panel)' : bom.cantidad_revisada < bom.cantidad_sistema ? 'var(--warning-bg)' : bom.cantidad_revisada === bom.cantidad_sistema ? 'var(--success-bg)' : 'var(--error-bg)',
                                borderColor: bom.cantidad_revisada === 0 ? 'var(--border)' : bom.cantidad_revisada < bom.cantidad_sistema ? 'var(--warning-border)' : bom.cantidad_revisada === bom.cantidad_sistema ? 'var(--success-border)' : 'var(--error-border)'
                              }}>
                                <span className="rp02-bom-sku">{bom.bom_sku}</span>
                                <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Sist: {bom.cantidad_sistema}</span>
                                  <span style={{ fontWeight: 700, color: bom.cantidad_revisada < bom.cantidad_sistema ? 'var(--warning-text)' : bom.cantidad_revisada === bom.cantidad_sistema ? 'var(--success-text)' : 'var(--error-text)' }}>Rev: {bom.cantidad_revisada}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {capturasBOM.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span className="rp02-modal-section-title">Capturas ({capturasBOM.length})</span>
                              <span className="rp02-modal-section-title">Cajas: {cajaActual - 1}</span>
                            </div>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                              {capturasBOM.map((cap: any, idx: number) => (
                                <div key={idx} className="rp02-bom-item" style={{
                                  marginBottom: '3px', padding: '8px 10px',
                                  background: cap.estado === 'completo' ? 'var(--success-bg)' : cap.estado === 'falta' ? 'var(--warning-bg)' : cap.estado === 'sobra' ? 'var(--error-bg)' : 'var(--error-bg)',
                                  borderColor: cap.estado === 'completo' ? 'var(--success-border)' : cap.estado === 'falta' ? 'var(--warning-border)' : cap.estado === 'sobra' ? 'var(--error-border)' : 'var(--error-border)'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="rp01-badge" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: '10px', minWidth: '30px', textAlign: 'center' }}>#{cap.caja}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'Courier New, monospace' }}>{cap.bom_sku}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '10px', color: cap.estado === 'completo' ? 'var(--success-text)' : cap.estado === 'falta' ? 'var(--warning-text)' : 'var(--error-text)' }}>{cap.mensaje}</span>
                                    <button onClick={() => handleEliminarCaptura(idx)} style={{ width: '18px', height: '18px', background: 'transparent', color: 'var(--error-text)', border: '1px solid var(--error-border)', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button className="rp02-btn rp02-btn-primary" onClick={handleFinalizarRevision} style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}>
                          Finalizar Revisión
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Pallet */}
      {mostrarDetallePallet && palletDetalle && (
        <div className="rp02-modal-overlay" onClick={() => setMostrarDetallePallet(false)}>
          <div className="rp02-modal" style={{ maxWidth: '650px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header">
              <h2>{palletDetalle.numero_pallet} - Detalle</h2>
              <button className="rp02-modal-close" onClick={() => setMostrarDetallePallet(false)}>×</button>
            </div>
            <div className="rp02-modal-body">
              <div className="rp02-modal-section-title">Emplaques/Orígenes</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {palletDetalle.numero_empaque || 'Sin empaques registrados'}
              </p>

              <div className="rp02-modal-section-title">Revisiones ({palletDetalle.revisiones?.length || 0})</div>
              {(palletDetalle.revisiones || []).length === 0 ? (
                <p style={{ color: 'var(--text-placeholder)', fontSize: '13px' }}>Sin revisiones</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(palletDetalle.revisiones || []).map((rev: any, idx: number) => (
                    <div key={idx} className="rp02-bom-item" style={{
                      marginBottom: '3px', padding: '10px 12px',
                      background: rev.origen === 'SISTEMA' ? 'var(--success-bg)' : rev.origen === 'NO_ENCONTRADO' ? 'var(--error-bg)' : 'var(--warning-bg)',
                      borderColor: rev.origen === 'SISTEMA' ? 'var(--success-border)' : rev.origen === 'NO_ENCONTRADO' ? 'var(--error-border)' : 'var(--warning-border)'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {rev.caja_numero > 0 && (
                            <span className="rp01-badge" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: '10px', minWidth: '30px', textAlign: 'center' }}>
                              #{rev.caja_numero}
                            </span>
                          )}
                          <span style={{ fontWeight: 600, fontFamily: 'Courier New, monospace', fontSize: '13px' }}>{rev.bom_sku}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {rev.origen} | Sistema: {rev.cantidad_sistema} | Revisado: {rev.cantidad_revisada}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
