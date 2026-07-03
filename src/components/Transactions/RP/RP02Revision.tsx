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
  'CD16 Bodega San Francisco',
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
  const [etapa, setEtapa]: any = useState('empaques'); // 'empaques' | 'revision'
  const [empaquesAgregados, setEmpaquesAgregados]: any = useState([]);
  const [bomsConsolidados, setBomsConsolidados]: any = useState([]);
  const [capturasBOM, setCapturasBOM]: any = useState([]);
  const [inputEmpaque, setInputEmpaque]: any = useState('');
  const [inputBOM, setInputBOM]: any = useState('');
  const inputEmpaqueRef: any = useRef(null);
  const inputBOMRef: any = useRef(null);
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
        body: JSON.stringify({ documento_id: documentoSeleccionado.id_documento, numero_pallet: numeroPallet })
      });
      if (resp.ok) {
        const palletData = await resp.json();
        const nuevoPallet = Array.isArray(palletData) ? palletData[0] : palletData;
        await cargarPallets(documentoSeleccionado);
        setPalletActual(nuevoPallet);
        setEtapa('empaques');
        setEmpaquesAgregados([]);
        setBomsConsolidados([]);
        setCapturasBOM([]);
        setInputEmpaque('');
        mostrarMensaje('success', numeroPallet + ' iniciado');
        setTimeout(() => inputEmpaqueRef.current?.focus(), 300);
      }
    } catch (e) {
      mostrarMensaje('error', 'Error al iniciar pallet');
    }
  };

  const handleSeleccionarPallet = async (pallet: any) => {
    setPalletActual(pallet);
    setEtapa('empaques');
    setEmpaquesAgregados([]);
    setBomsConsolidados([]);
    setCapturasBOM([]);
    setInputEmpaque('');
    
    // Cargar empaques ya registrados en este pallet
    try {
      const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + pallet.id + '&order=creado_en.asc', { headers: HEADERS });
      const revisiones = await respRev.json() || [];
      
      // Extraer empaques únicos
      const empaquesUnicos: any[] = [];
      const visto = new Set();
      (revisiones || []).forEach((r: any) => {
        const key = r.origen + '|' + (r.bom_sku || '');
        if (!visto.has(r.origen) && r.origen !== 'SISTEMA') {
          visto.add(r.origen);
          empaquesUnicos.push({ numero_empaque: r.origen, tipo: 'manual' });
        }
      });
      
      // Buscar empaques del inventario
      const respPallets = await fetch(API_URL + '/rp_documento_pallets?select=*&id=eq.' + pallet.id, { headers: HEADERS });
      const palletData = await respPallets.json();
      if (palletData && palletData.length > 0 && palletData[0].numero_empaque) {
        const empaquesStr = palletData[0].numero_empaque;
        const empaquesList = empaquesStr.split(',').map((e: string) => e.trim()).filter((e: string) => e);
        for (const emp of empaquesList) {
          if (!visto.has(emp)) {
            visto.add(emp);
            empaquesUnicos.push({ numero_empaque: emp, tipo: 'inventario' });
          }
        }
      }
      
      setEmpaquesAgregados(empaquesUnicos);
    } catch (e) {}
  };

  const handleAgregarEmpaque = async () => {
    const valor = inputEmpaque.trim();
    if (!valor) {
      mostrarMensaje('warning', 'Ingrese un número de empaque');
      return;
    }
    if (!palletActual) return;

    // Verificar si ya fue agregado
    if (empaquesAgregados.find((e: any) => e.numero_empaque === valor)) {
      mostrarMensaje('warning', 'Este empaque ya fue agregado');
      setInputEmpaque('');
      return;
    }

    // Verificar si es origen manual
    const esOrigenManual = ORIGENES_MANUALES.some(o => o.toLowerCase().startsWith(valor.toLowerCase().substring(0, 3)));

    if (esOrigenManual) {
      setEmpaquesAgregados([...empaquesAgregados, { numero_empaque: valor, tipo: 'manual' }]);
      setInputEmpaque('');
      mostrarMensaje('success', 'Empaque manual agregado');
      setTimeout(() => inputEmpaqueRef.current?.focus(), 200);
      return;
    }

    // Verificar si existe en inventario
    try {
      const resp = await fetch(API_URL + '/rp_inventario_empaques?select=*&numero_empaque=eq.' + encodeURIComponent(valor), { headers: HEADERS });
      const empaques = await resp.json();

      if (!empaques || empaques.length === 0) {
        // No existe en inventario, agregar como manual
        setEmpaquesAgregados([...empaquesAgregados, { numero_empaque: valor, tipo: 'manual' }]);
        setInputEmpaque('');
        mostrarMensaje('warning', 'No encontrado en inventario, agregado como manual');
        setTimeout(() => inputEmpaqueRef.current?.focus(), 200);
        return;
      }

      setEmpaquesAgregados([...empaquesAgregados, { 
        numero_empaque: valor, 
        tipo: 'inventario',
        empaque_id: empaques[0].id,
        cod_destino: empaques[0].cod_destino,
        destino: empaques[0].destino
      }]);
      setInputEmpaque('');
      mostrarMensaje('success', 'Empaque ' + valor + ' agregado');
      setTimeout(() => inputEmpaqueRef.current?.focus(), 200);
    } catch (e) {
      mostrarMensaje('error', 'Error al buscar empaque');
    }
  };

  const handleEliminarEmpaque = (index: number) => {
    const nuevos = empaquesAgregados.filter((_: any, i: number) => i !== index);
    setEmpaquesAgregados(nuevos);
  };

  const handleIniciarRevision = async () => {
    if (empaquesAgregados.length === 0) {
      mostrarMensaje('warning', 'Agregue al menos un empaque');
      return;
    }

    // Guardar empaques en el pallet
    const empaquesStr = empaquesAgregados.map((e: any) => e.numero_empaque).join(',');
    await fetch(API_URL + '/rp_documento_pallets?id=eq.' + palletActual.id, {
      method: 'PATCH',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero_empaque: empaquesStr })
    });

    // Consolidar BOMs de empaques del inventario
    let bomsConsolidadosTemp: any[] = [];
    
    for (const emp of empaquesAgregados) {
      if (emp.tipo === 'inventario' && emp.empaque_id) {
        const respBoms = await fetch(API_URL + '/rp_inventario_boms?select=*&empaque_id=eq.' + emp.empaque_id + '&order=bom_sku.asc', { headers: HEADERS });
        const boms = await respBoms.json();
        
        if (boms) {
          for (const bom of boms) {
            const existente = bomsConsolidadosTemp.find((b: any) => b.bom_sku === bom.bom_sku);
            if (existente) {
              existente.cantidad_sistema += bom.cantidad_maxima;
              if (!existente.empaques.includes(emp.numero_empaque)) {
                existente.empaques.push(emp.numero_empaque);
              }
            } else {
              bomsConsolidadosTemp.push({
                bom_sku: bom.bom_sku,
                cantidad_sistema: bom.cantidad_maxima,
                cantidad_revisada: 0,
                empaques: [emp.numero_empaque]
              });
            }
          }
        }
      }
    }

    setBomsConsolidados(bomsConsolidadosTemp);
    setCapturasBOM([]);
    setEtapa('revision');
    setTimeout(() => inputBOMRef.current?.focus(), 300);
  };

  const handleCapturarBOM = () => {
    const valor = inputBOM.trim();
    if (!valor) {
      mostrarMensaje('warning', 'Ingrese un BOM/SKU');
      return;
    }

    const bomsEnSistema = [...bomsConsolidados.map((b: any) => b.bom_sku)];
    const bomsManuales = empaquesAgregados.filter((e: any) => e.tipo === 'manual').map((e: any) => e.numero_empaque);
    
    // Verificar si coincide con algún BOM del sistema
    const bomEsperado = bomsConsolidados.find((b: any) => b.bom_sku === valor);
    
    let estado = 'no_corresponde';
    let mensajeCaptura = '';
    
    if (bomEsperado) {
      const capturasActuales = capturasBOM.filter((c: any) => c.bom_sku === valor).length;
      const nuevaCantidad = capturasActuales + 1;
      
      if (nuevaCantidad < bomEsperado.cantidad_sistema) {
        estado = 'falta';
        mensajeCaptura = 'Falta ' + (bomEsperado.cantidad_sistema - nuevaCantidad) + ' unidad(es)';
      } else if (nuevaCantidad === bomEsperado.cantidad_sistema) {
        estado = 'completo';
        mensajeCaptura = 'Completo';
      } else {
        estado = 'sobra';
        mensajeCaptura = 'Sobra ' + (nuevaCantidad - bomEsperado.cantidad_sistema) + ' unidad(es)';
      }
      
      // Actualizar cantidad revisada
      setBomsConsolidados(bomsConsolidados.map((b: any) => {
        if (b.bom_sku === valor) {
          return { ...b, cantidad_revisada: nuevaCantidad };
        }
        return b;
      }));
    }

    const nuevaCaptura = {
      bom_sku: valor,
      estado,
      mensaje: mensajeCaptura,
      creado_en: new Date().toISOString()
    };

    setCapturasBOM([nuevaCaptura, ...capturasBOM]);
    setInputBOM('');
    setTimeout(() => inputBOMRef.current?.focus(), 100);
  };

  const handleFinalizarPallet = async () => {
    if (!palletActual || !documentoSeleccionado) return;

    // Verificar si hay BOMs sin completar
    const incompletos = bomsConsolidados.filter((b: any) => b.cantidad_revisada < b.cantidad_sistema);
    if (incompletos.length > 0) {
      if (!window.confirm('Hay ' + incompletos.length + ' BOM(s) sin completar. ¿Desea finalizar igual?')) return;
    }

    try {
      // Guardar todas las revisiones de BOMs del sistema
      for (const bom of bomsConsolidados) {
        if (bom.cantidad_revisada > 0) {
          await fetch(API_URL + '/rp_documento_revisiones', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documento_id: documentoSeleccionado.id_documento,
              pallet_id: palletActual.id,
              bom_sku: bom.bom_sku,
              cantidad_sistema: bom.cantidad_sistema,
              cantidad_revisada: bom.cantidad_revisada,
              origen: 'SISTEMA',
              revisado_por: usuario?.id
            })
          });
        }
      }

      // Guardar capturas manuales (BOMs que no están en sistema)
      const bomsSistema = bomsConsolidados.map((b: any) => b.bom_sku);
      const capturasManuales = capturasBOM.filter((c: any) => !bomsSistema.includes(c.bom_sku));
      
      // Agrupar capturas manuales por BOM
      const manualesAgrupados: Record<string, number> = {};
      capturasManuales.forEach((c: any) => {
        if (!manualesAgrupados[c.bom_sku]) manualesAgrupados[c.bom_sku] = 0;
        manualesAgrupados[c.bom_sku]++;
      });

      for (const bomSku of Object.keys(manualesAgrupados)) {
        // Buscar si este BOM viene de un empaque manual
        const empaqueManual = empaquesAgregados.find((e: any) => 
          e.tipo === 'manual' && bomSku.startsWith(e.numero_empaque.substring(0, 3))
        );
        
        await fetch(API_URL + '/rp_documento_revisiones', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documento_id: documentoSeleccionado.id_documento,
            pallet_id: palletActual.id,
            bom_sku: bomSku,
            cantidad_sistema: 0,
            cantidad_revisada: manualesAgrupados[bomSku],
            origen: empaqueManual ? empaqueManual.numero_empaque : 'MANUAL',
            revisado_por: usuario?.id
          })
        });
      }

      await cargarPallets(documentoSeleccionado);
      mostrarMensaje('success', 'Pallet finalizado correctamente');
      setPalletActual(null);
      setEtapa('empaques');
      setEmpaquesAgregados([]);
      setBomsConsolidados([]);
      setCapturasBOM([]);
    } catch (e) {
      mostrarMensaje('error', 'Error al finalizar pallet');
    }
  };

  // Calcular totales
  const totalSistema = bomsConsolidados.reduce((s: number, b: any) => s + b.cantidad_sistema, 0);
  const totalRevisado = bomsConsolidados.reduce((s: number, b: any) => s + b.cantidad_revisada, 0);
  const totalCapturas = capturasBOM.length;
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
        <div className="rp02-modal-overlay" onClick={() => { setMostrarRevisar(false); setPalletActual(null); setEtapa('empaques'); }}>
          <div className="rp02-modal" style={{ maxWidth: '700px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header">
              <h2>{documentoSeleccionado.id_documento} - Revisión</h2>
              <button className="rp02-modal-close" onClick={() => { setMostrarRevisar(false); setPalletActual(null); setEtapa('empaques'); }}>×</button>
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
                          {pallet.numero_empaque ? pallet.numero_empaque.split(',').length + ' empaques' : 'Sin empaques'} | {pallet.total_revisado} items
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <button onClick={() => { setPalletActual(null); setEtapa('empaques'); }} className="rp02-btn" style={{ marginBottom: '16px' }}>
                    ← Volver a Pallets
                  </button>

                  <div style={{ background: 'var(--bg-section)', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="rp02-pallet-numero" style={{ fontSize: '16px' }}>{palletActual.numero_pallet}</span>
                      <span className="rp01-badge" style={{
                        background: etapa === 'empaques' ? 'var(--warning-bg)' : 'var(--info-bg)',
                        color: etapa === 'empaques' ? 'var(--warning-text)' : 'var(--info-text)'
                      }}>
                        {etapa === 'empaques' ? 'Etapa 1: Empaques' : 'Etapa 2: Revisión BOMs'}
                      </span>
                    </div>

                    {etapa === 'empaques' ? (
                      <>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                          <input
                            ref={inputEmpaqueRef}
                            type="text"
                            className="rp02-form-input"
                            value={inputEmpaque}
                            onChange={(e: any) => setInputEmpaque(e.target.value)}
                            onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarEmpaque(); } }}
                            placeholder="Número de Empaque o código manual (CD12, SG01...)"
                            autoFocus
                          />
                          <button className="rp02-btn-save" onClick={handleAgregarEmpaque} style={{ whiteSpace: 'nowrap' }}>
                            Agregar
                          </button>
                        </div>

                        {empaquesAgregados.length > 0 && (
                          <>
                            <div className="rp02-modal-section-title" style={{ marginBottom: '8px' }}>
                              Empaques Agregados ({empaquesAgregados.length})
                            </div>
                            {empaquesAgregados.map((emp: any, idx: number) => (
                              <div key={idx} className="rp02-bom-item" style={{
                                marginBottom: '4px',
                                background: emp.tipo === 'inventario' ? 'var(--success-bg)' : 'var(--warning-bg)',
                                borderColor: emp.tipo === 'inventario' ? 'var(--success-border)' : 'var(--warning-border)'
                              }}>
                                <div>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.numero_empaque}</span>
                                  {emp.destino && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                      {emp.cod_destino} - {emp.destino}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="rp01-badge" style={{
                                    background: emp.tipo === 'inventario' ? 'var(--success-bg)' : 'var(--warning-bg)',
                                    color: emp.tipo === 'inventario' ? 'var(--success-text)' : 'var(--warning-text)',
                                    fontSize: '10px'
                                  }}>
                                    {emp.tipo === 'inventario' ? 'Inventario' : 'Manual'}
                                  </span>
                                  <button onClick={() => handleEliminarEmpaque(idx)} style={{
                                    width: '22px', height: '22px', background: 'var(--error-bg)', color: 'var(--error-text)',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center'
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
                        {/* Etapa 2: Revisión de BOMs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                          <div className="rp01-resumen-card" style={{ padding: '10px' }}>
                            <span style={{ fontSize: '10px' }}>Total Sistema</span>
                            <strong style={{ fontSize: '18px' }}>{totalSistema}</strong>
                          </div>
                          <div className="rp01-resumen-card" style={{ padding: '10px' }}>
                            <span style={{ fontSize: '10px' }}>Total Revisado</span>
                            <strong style={{ fontSize: '18px', color: totalRevisado >= totalSistema ? 'var(--success-text)' : 'var(--error-text)' }}>{totalRevisado}</strong>
                          </div>
                          <div className="rp01-resumen-card" style={{ padding: '10px' }}>
                            <span style={{ fontSize: '10px' }}>Capturas</span>
                            <strong style={{ fontSize: '18px' }}>{totalCapturas}</strong>
                          </div>
                          <div className="rp01-resumen-card" style={{ padding: '10px' }}>
                            <span style={{ fontSize: '10px' }}>Diferencia</span>
                            <strong style={{ fontSize: '18px', color: diferencia === 0 ? 'var(--success-text)' : diferencia > 0 ? 'var(--info-text)' : 'var(--error-text)' }}>
                              {diferencia === 0 ? 'OK' : (diferencia > 0 ? '+' + diferencia : diferencia)}
                            </strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                          <input
                            ref={inputBOMRef}
                            type="text"
                            className="rp02-form-input"
                            value={inputBOM}
                            onChange={(e: any) => setInputBOM(e.target.value)}
                            onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleCapturarBOM(); } }}
                            placeholder="Escanear BOM/SKU..."
                            autoFocus
                          />
                          <button className="rp02-btn-save" onClick={handleCapturarBOM} style={{ whiteSpace: 'nowrap' }}>
                            Capturar
                          </button>
                        </div>

                        {/* BOMs del sistema */}
                        {bomsConsolidados.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <div className="rp02-modal-section-title" style={{ marginBottom: '6px' }}>
                              BOMs del Sistema
                            </div>
                            {bomsConsolidados.map((bom: any) => (
                              <div key={bom.bom_sku} className="rp02-bom-item" style={{
                                marginBottom: '4px',
                                background: bom.cantidad_revisada === 0 ? 'var(--bg-panel)' :
                                  bom.cantidad_revisada < bom.cantidad_sistema ? 'var(--warning-bg)' :
                                  bom.cantidad_revisada === bom.cantidad_sistema ? 'var(--success-bg)' :
                                  'var(--error-bg)',
                                borderColor: bom.cantidad_revisada === 0 ? 'var(--border)' :
                                  bom.cantidad_revisada < bom.cantidad_sistema ? 'var(--warning-border)' :
                                  bom.cantidad_revisada === bom.cantidad_sistema ? 'var(--success-border)' :
                                  'var(--error-border)'
                              }}>
                                <div>
                                  <span className="rp02-bom-sku">{bom.bom_sku}</span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                    {bom.empaques.join(', ')}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Sistema: {bom.cantidad_sistema}
                                  </span>
                                  <span style={{
                                    fontSize: '13px', fontWeight: 700,
                                    color: bom.cantidad_revisada === 0 ? 'var(--text-muted)' :
                                      bom.cantidad_revisada < bom.cantidad_sistema ? 'var(--warning-text)' :
                                      bom.cantidad_revisada === bom.cantidad_sistema ? 'var(--success-text)' :
                                      'var(--error-text)'
                                  }}>
                                    Rev: {bom.cantidad_revisada}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Últimas capturas */}
                        {capturasBOM.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <div className="rp02-modal-section-title" style={{ marginBottom: '6px' }}>
                              Últimas Capturas
                            </div>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                              {capturasBOM.slice(0, 20).map((cap: any, idx: number) => (
                                <div key={idx} className="rp02-bom-item" style={{
                                  marginBottom: '3px', padding: '8px 10px',
                                  background: cap.estado === 'completo' ? 'var(--success-bg)' :
                                    cap.estado === 'falta' ? 'var(--warning-bg)' :
                                    cap.estado === 'sobra' ? 'var(--error-bg)' :
                                    'var(--bg-panel)',
                                  borderColor: cap.estado === 'completo' ? 'var(--success-border)' :
                                    cap.estado === 'falta' ? 'var(--warning-border)' :
                                    cap.estado === 'sobra' ? 'var(--error-border)' :
                                    'var(--border)'
                                }}>
                                  <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'Courier New, monospace' }}>
                                    {cap.bom_sku}
                                  </span>
                                  <span style={{
                                    fontSize: '10px',
                                    color: cap.estado === 'completo' ? 'var(--success-text)' :
                                      cap.estado === 'falta' ? 'var(--warning-text)' :
                                      cap.estado === 'sobra' ? 'var(--error-text)' :
                                      'var(--text-muted)'
                                  }}>
                                    {cap.mensaje || 'No corresponde'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button className="rp02-btn rp02-btn-primary" onClick={handleFinalizarPallet}
                          style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}>
                          Finalizar Pallet
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
    </div>
  );
};

export default RP02Revision;
