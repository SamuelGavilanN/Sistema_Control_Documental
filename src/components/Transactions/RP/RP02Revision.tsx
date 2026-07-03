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
  const [empaquesInventario, setEmpaquesInventario]: any = useState([]);
  const [bomsInventario, setBomsInventario]: any = useState([]);
  const [capturas, setCapturas]: any = useState([]);
  const [cajaActual, setCajaActual]: any = useState(1);
  const [inputEscaner, setInputEscaner]: any = useState('');
  const [modoCaptura, setModoCaptura]: any = useState('bom'); // 'bom' | 'origen'
  const [origenActivo, setOrigenActivo]: any = useState('');
  const inputEscanerRef: any = useRef(null);
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
        iniciarNuevoPallet();
        mostrarMensaje('success', numeroPallet + ' iniciado');
      }
    } catch (e) { mostrarMensaje('error', 'Error al iniciar pallet'); }
  };

  const iniciarNuevoPallet = () => {
    setEtapa('origenes');
    setEmpaquesInventario([]);
    setBomsInventario([]);
    setCapturas([]);
    setCajaActual(1);
    setInputEscaner('');
    setModoCaptura('bom');
    setOrigenActivo('');
  };

  const handleAbrirPallet = async (pallet: any) => {
    setPalletActual(pallet);
    const revisiones = pallet.revisiones || [];

    // Reconstruir empaques del inventario desde revisiones SISTEMA
    const empaquesSet = new Set<string>();
    const bomsTemp: any[] = [];
    const capturasTemp: any[] = [];
    let maxCaja = 0;

    revisiones.forEach((r: any) => {
      if (r.caja_numero > maxCaja) maxCaja = r.caja_numero;
      
      if (r.origen === 'SISTEMA') {
        if (r.numero_empaque) empaquesSet.add(r.numero_empaque);
        const existente = bomsTemp.find((b: any) => b.bom_sku === r.bom_sku);
        if (existente) {
          existente.cantidad_sistema = Math.max(existente.cantidad_sistema, r.cantidad_sistema);
          existente.cantidad_revisada += r.cantidad_revisada;
        } else {
          bomsTemp.push({ bom_sku: r.bom_sku, cantidad_sistema: r.cantidad_sistema, cantidad_revisada: r.cantidad_revisada });
        }
      }

      // Reconstruir capturas
      for (let i = 0; i < (r.cantidad_revisada || 0); i++) {
        capturasTemp.push({
          caja: r.caja_numero,
          bom_sku: r.bom_sku,
          origen: r.origen,
          numero_empaque: r.numero_empaque || '',
          creado_en: r.creado_en
        });
      }
    });

    // Cargar info de empaques del inventario
    const empaquesInfo: any[] = [];
    for (const emp of empaquesSet) {
      try {
        const resp = await fetch(API_URL + '/rp_inventario_empaques?select=*&numero_empaque=eq.' + encodeURIComponent(emp), { headers: HEADERS });
        const data = await resp.json();
        if (data && data.length > 0) {
          empaquesInfo.push({ numero_empaque: emp, cod_destino: data[0].cod_destino, destino: data[0].destino });
        } else {
          empaquesInfo.push({ numero_empaque: emp });
        }
      } catch (e) {
        empaquesInfo.push({ numero_empaque: emp });
      }
    }

    setEmpaquesInventario(empaquesInfo);
    setBomsInventario(bomsTemp);
    setCapturas(capturasTemp.sort((a: any, b: any) => a.caja - b.caja));
    setCajaActual(maxCaja + 1);
    setEtapa('captura');
    setModoCaptura('bom');
    setOrigenActivo('');
    setInputEscaner('');
    setTimeout(() => inputEscanerRef.current?.focus(), 300);
  };

  // Agregar empaque del inventario
  const handleAgregarEmpaque = async () => {
    const valor = inputEscaner.trim();
    if (!valor) { mostrarMensaje('warning', 'Ingrese número de empaque'); return; }

    if (empaquesInventario.find((e: any) => e.numero_empaque === valor)) {
      mostrarMensaje('warning', 'Empaque ya agregado');
      setInputEscaner('');
      return;
    }

    try {
      const resp = await fetch(API_URL + '/rp_inventario_empaques?select=*&numero_empaque=eq.' + encodeURIComponent(valor), { headers: HEADERS });
      const data = await resp.json();

      if (data && data.length > 0) {
        // Cargar BOMs del empaque
        const respBoms = await fetch(API_URL + '/rp_inventario_boms?select=*&empaque_id=eq.' + data[0].id, { headers: HEADERS });
        const boms = await respBoms.json();

        if (boms) {
          setBomsInventario((prev: any) => {
            const nuevos = [...prev];
            boms.forEach((bom: any) => {
              const existente = nuevos.find((b: any) => b.bom_sku === bom.bom_sku);
              if (existente) {
                existente.cantidad_sistema += bom.cantidad_maxima;
              } else {
                nuevos.push({ bom_sku: bom.bom_sku, cantidad_sistema: bom.cantidad_maxima, cantidad_revisada: 0 });
              }
            });
            return nuevos;
          });
        }

        setEmpaquesInventario([...empaquesInventario, {
          numero_empaque: valor,
          cod_destino: data[0].cod_destino,
          destino: data[0].destino
        }]);
        mostrarMensaje('success', 'Empaque ' + valor + ' agregado');
      } else {
        // No existe en inventario, preguntar si agregar como manual
        if (window.confirm('Empaque no encontrado en inventario. ¿Agregar como referencia?')) {
          setEmpaquesInventario([...empaquesInventario, { numero_empaque: valor }]);
        }
      }
    } catch (e) { mostrarMensaje('error', 'Error al buscar empaque'); }
    setInputEscaner('');
    setTimeout(() => inputEscanerRef.current?.focus(), 200);
  };

  // Activar modo captura con origen específico
  const handleActivarOrigen = (origen: string) => {
    setOrigenActivo(origen);
    setModoCaptura('origen');
    setInputEscaner('');
    setTimeout(() => inputEscanerRef.current?.focus(), 200);
  };

  // Capturar BOM (modo bom = sistema, modo origen = manual con origen)
  const handleCapturar = () => {
    const valor = inputEscaner.trim();
    if (!valor) return;

    if (modoCaptura === 'bom') {
      // Buscar en BOMs del inventario
      const bomEsperado = bomsInventario.find((b: any) => b.bom_sku === valor);

      if (bomEsperado) {
        const nuevaCantidad = bomEsperado.cantidad_revisada + 1;
        setBomsInventario(bomsInventario.map((b: any) => {
          if (b.bom_sku === valor) return { ...b, cantidad_revisada: nuevaCantidad };
          return b;
        }));

        let estado = '';
        if (nuevaCantidad < bomEsperado.cantidad_sistema) estado = 'falta';
        else if (nuevaCantidad === bomEsperado.cantidad_sistema) estado = 'completo';
        else estado = 'sobra';

        setCapturas([...capturas, {
          caja: cajaActual,
          bom_sku: valor,
          origen: 'SISTEMA',
          estado,
          creado_en: new Date().toISOString()
        }]);
      } else {
        // BOM no encontrado en sistema
        setCapturas([...capturas, {
          caja: cajaActual,
          bom_sku: valor,
          origen: 'SISTEMA',
          estado: 'no_encontrado',
          creado_en: new Date().toISOString()
        }]);
      }
    } else if (modoCaptura === 'origen' && origenActivo) {
      // Captura con origen manual
      setCapturas([...capturas, {
        caja: cajaActual,
        bom_sku: valor,
        origen: origenActivo,
        estado: 'manual',
        creado_en: new Date().toISOString()
      }]);
    }

    setCajaActual(cajaActual + 1);
    setInputEscaner('');
    setTimeout(() => inputEscanerRef.current?.focus(), 100);
  };

  const handleEliminarCaptura = (index: number) => {
    const captura = capturas[index];
    if (captura.origen === 'SISTEMA' && captura.estado !== 'no_encontrado') {
      const bomEsperado = bomsInventario.find((b: any) => b.bom_sku === captura.bom_sku);
      if (bomEsperado && bomEsperado.cantidad_revisada > 0) {
        setBomsInventario(bomsInventario.map((b: any) => {
          if (b.bom_sku === captura.bom_sku) return { ...b, cantidad_revisada: b.cantidad_revisada - 1 };
          return b;
        }));
      }
    }
    setCapturas(capturas.filter((_: any, i: number) => i !== index));
  };

  const handleFinalizarRevision = async () => {
    if (!palletActual || !documentoSeleccionado) return;
    if (capturas.length === 0) { mostrarMensaje('warning', 'No hay capturas para guardar'); return; }

    try {
      // Eliminar revisiones anteriores
      await fetch(API_URL + '/rp_documento_revisiones?pallet_id=eq.' + palletActual.id, { method: 'DELETE', headers: HEADERS });

      // Guardar info de empaques en el pallet
      const empaquesStr = empaquesInventario.map((e: any) => e.numero_empaque).join(',');
      await fetch(API_URL + '/rp_documento_pallets?id=eq.' + palletActual.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_empaque: empaquesStr })
      });

      // Guardar cada captura
      for (const cap of capturas) {
        const bomSistema = bomsInventario.find((b: any) => b.bom_sku === cap.bom_sku);
        await fetch(API_URL + '/rp_documento_revisiones', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documento_id: documentoSeleccionado.id_documento,
            pallet_id: palletActual.id,
            caja_numero: cap.caja,
            bom_sku: cap.bom_sku,
            cantidad_sistema: bomSistema ? bomSistema.cantidad_sistema : 0,
            cantidad_revisada: 1,
            origen: cap.origen,
            numero_empaque: cap.origen === 'SISTEMA' ? (empaquesInventario[0]?.numero_empaque || null) : null,
            revisado_por: usuario?.id
          })
        });
      }

      // Guardar BOMs no capturados con cantidad 0
      for (const bom of bomsInventario) {
        if (bom.cantidad_revisada === 0) {
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
      mostrarMensaje('success', 'Revisión finalizada - ' + capturas.length + ' capturas guardadas');
      setPalletActual(null);
      iniciarNuevoPallet();
    } catch (e) { mostrarMensaje('error', 'Error al finalizar revisión'); }
  };

  const handleVerDetallePallet = (pallet: any) => {
    setPalletActual(pallet);
    handleAbrirPallet(pallet);
    setEtapa('detalle');
  };

  const totalSistema = bomsInventario.reduce((s: number, b: any) => s + b.cantidad_sistema, 0);
  const totalRevisado = bomsInventario.reduce((s: number, b: any) => s + b.cantidad_revisada, 0);
  const totalManuales = capturas.filter((c: any) => c.origen !== 'SISTEMA' || c.estado === 'no_encontrado').length;

  if (cargando) {
    return (
      <div className="rp02-view">
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando...</div>
      </div>
    );
  }

  const renderBotonOrigen = (origen: any) => (
    <button
      key={origen.codigo}
      className="rp02-btn"
      onClick={() => handleActivarOrigen(origen.codigo)}
      style={{
        fontSize: '11px', padding: '8px 10px', textAlign: 'left',
        background: origenActivo === origen.codigo ? 'var(--btn-primary-bg)' : 'var(--btn-bg)',
        color: origenActivo === origen.codigo ? 'var(--btn-primary-text)' : 'var(--btn-text)',
        borderColor: origenActivo === origen.codigo ? 'var(--btn-primary-bg)' : 'var(--btn-border)'
      }}
    >
      {origen.codigo} - {origen.nombre}
    </button>
  );

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
        <div className="rp02-modal-overlay" onClick={() => { setMostrarRevisar(false); setPalletActual(null); iniciarNuevoPallet(); }}>
          <div className="rp02-modal" style={{ maxWidth: '800px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header">
              <h2>{documentoSeleccionado.id_documento}</h2>
              <button className="rp02-modal-close" onClick={() => { setMostrarRevisar(false); setPalletActual(null); iniciarNuevoPallet(); }}>×</button>
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
                    const origenesUnicos = [...new Set(revs.map((r: any) => r.origen))];
                    return (
                      <div key={pallet.id} className="rp02-pallet-card">
                        <div className="rp02-pallet-header">
                          <span className="rp02-pallet-numero" style={{ cursor: 'pointer' }} onClick={() => handleVerDetallePallet(pallet)}>
                            {pallet.numero_pallet}
                          </span>
                          <button className="rp02-btn" onClick={() => handleAbrirPallet(pallet)} style={{ fontSize: '11px', padding: '4px 10px' }}>
                            Editar
                          </button>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {origenesUnicos.length} orígenes | {totalItems} items | Cajas: {revs.filter((r: any) => r.caja_numero > 0).length}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : etapa === 'detalle' ? (
                <>
                  <button onClick={() => { setPalletActual(null); iniciarNuevoPallet(); }} className="rp02-btn" style={{ marginBottom: '16px' }}>← Volver</button>
                  <div className="rp02-modal-section-title">Detalle de {palletActual.numero_pallet}</div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Empaques: {palletActual.numero_empaque || 'Ninguno'}
                  </p>
                  {(palletActual.revisiones || []).length === 0 ? (
                    <p style={{ color: 'var(--text-placeholder)' }}>Sin revisiones</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '400px', overflowY: 'auto' }}>
                      {(palletActual.revisiones || []).map((rev: any, idx: number) => (
                        <div key={idx} className="rp02-bom-item" style={{
                          padding: '8px 10px',
                          background: rev.cantidad_revisada === 0 ? 'var(--bg-panel)' : rev.origen === 'SISTEMA' ? 'var(--success-bg)' : 'var(--warning-bg)',
                          borderColor: rev.origen === 'SISTEMA' ? 'var(--success-border)' : 'var(--warning-border)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {rev.caja_numero > 0 && <span className="rp01-badge" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: '10px', minWidth: '30px', textAlign: 'center' }}>#{rev.caja_numero}</span>}
                            <span style={{ fontWeight: 600, fontFamily: 'Courier New, monospace', fontSize: '12px' }}>{rev.bom_sku}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {rev.origen} | Sist: {rev.cantidad_sistema} | Rev: {rev.cantidad_revisada}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => { setPalletActual(null); iniciarNuevoPallet(); }} className="rp02-btn" style={{ marginBottom: '12px' }}>← Volver a Pallets</button>

                  {/* Contenedor principal del pallet */}
                  <div style={{ background: 'var(--bg-section)', borderRadius: '8px', padding: '14px', border: '1px solid var(--border)', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="rp02-pallet-numero" style={{ fontSize: '16px' }}>{palletActual.numero_pallet}</span>
                      <span className="rp01-badge" style={{ background: 'var(--info-bg)', color: 'var(--info-text)' }}>
                        Caja #{cajaActual}
                      </span>
                    </div>

                    {/* Empaques del inventario */}
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        <input ref={inputEscanerRef} type="text" className="rp02-form-input"
                          value={inputEscaner} onChange={(e: any) => setInputEscaner(e.target.value)}
                          onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarEmpaque(); } }}
                          placeholder="Escanear N° Empaque (CD01)..." />
                        <button className="rp02-btn-save" onClick={handleAgregarEmpaque} style={{ whiteSpace: 'nowrap' }}>Agregar</button>
                      </div>
                      {empaquesInventario.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {empaquesInventario.map((emp: any, idx: number) => (
                            <span key={idx} className="rp01-badge" style={{ background: 'var(--success-bg)', color: 'var(--success-text)', fontSize: '11px', padding: '4px 8px' }}>
                              {emp.numero_empaque}
                              <button onClick={() => setEmpaquesInventario(empaquesInventario.filter((_: any, i: number) => i !== idx))}
                                style={{ marginLeft: '4px', background: 'none', border: 'none', color: 'var(--error-text)', cursor: 'pointer', fontSize: '14px' }}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selector de orígenes */}
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        {modoCaptura === 'bom' ? 'Modo: Sistema (BOMs de inventario)' : 'Modo: ' + origenActivo}
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '4px' }}>
                        <button className="rp02-btn" onClick={() => { setModoCaptura('bom'); setOrigenActivo(''); setInputEscaner(''); inputEscanerRef.current?.focus(); }}
                          style={{ fontSize: '11px', padding: '6px 8px', background: modoCaptura === 'bom' ? 'var(--btn-primary-bg)' : 'var(--btn-bg)', color: modoCaptura === 'bom' ? 'var(--btn-primary-text)' : 'var(--btn-text)' }}>
                          SISTEMA (CD01)
                        </button>
                        {ORIGENES.filter(o => o.codigo !== 'CD01').map(o => renderBotonOrigen(o))}
                      </div>
                    </div>

                    {/* Input de captura */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input ref={inputEscanerRef} type="text" className="rp02-form-input"
                        value={inputEscaner} onChange={(e: any) => setInputEscaner(e.target.value)}
                        onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleCapturar(); } }}
                        placeholder={modoCaptura === 'bom' ? 'Escanear BOM/SKU...' : 'Escanear BOM para ' + origenActivo + '...'}
                        autoFocus />
                      <button className="rp02-btn-save" onClick={handleCapturar} style={{ whiteSpace: 'nowrap' }}>
                        Capturar
                      </button>
                    </div>
                  </div>

                  {/* Resumen */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div className="rp01-resumen-card" style={{ padding: '8px' }}><span style={{ fontSize: '10px' }}>Sistema</span><strong style={{ fontSize: '16px' }}>{totalSistema}</strong></div>
                    <div className="rp01-resumen-card" style={{ padding: '8px' }}><span style={{ fontSize: '10px' }}>Revisado</span><strong style={{ fontSize: '16px', color: totalRevisado >= totalSistema ? 'var(--success-text)' : 'var(--warning-text)' }}>{totalRevisado}</strong></div>
                    <div className="rp01-resumen-card" style={{ padding: '8px' }}><span style={{ fontSize: '10px' }}>Cajas</span><strong style={{ fontSize: '16px' }}>{cajaActual - 1}</strong></div>
                    <div className="rp01-resumen-card" style={{ padding: '8px' }}><span style={{ fontSize: '10px' }}>Manuales</span><strong style={{ fontSize: '16px', color: totalManuales > 0 ? 'var(--warning-text)' : 'var(--text-muted)' }}>{totalManuales}</strong></div>
                  </div>

                  {/* BOMs del sistema */}
                  {bomsInventario.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div className="rp02-modal-section-title">BOMs Sistema</div>
                      {bomsInventario.map((bom: any) => (
                        <div key={bom.bom_sku} className="rp02-bom-item" style={{
                          marginBottom: '3px', padding: '6px 10px',
                          background: bom.cantidad_revisada === 0 ? 'var(--bg-panel)' : bom.cantidad_revisada < bom.cantidad_sistema ? 'var(--warning-bg)' : bom.cantidad_revisada === bom.cantidad_sistema ? 'var(--success-bg)' : 'var(--error-bg)'
                        }}>
                          <span className="rp02-bom-sku" style={{ fontSize: '12px' }}>{bom.bom_sku}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: bom.cantidad_revisada < bom.cantidad_sistema ? 'var(--warning-text)' : bom.cantidad_revisada === bom.cantidad_sistema ? 'var(--success-text)' : 'var(--error-text)' }}>
                            {bom.cantidad_revisada}/{bom.cantidad_sistema}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Capturas */}
                  {capturas.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div className="rp02-modal-section-title">Capturas ({capturas.length})</div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {capturas.map((cap: any, idx: number) => (
                          <div key={idx} className="rp02-bom-item" style={{
                            marginBottom: '3px', padding: '6px 10px',
                            background: cap.origen === 'SISTEMA' ? (cap.estado === 'no_encontrado' ? 'var(--error-bg)' : 'var(--success-bg)') : 'var(--warning-bg)',
                            borderColor: cap.origen === 'SISTEMA' ? (cap.estado === 'no_encontrado' ? 'var(--error-border)' : 'var(--success-border)') : 'var(--warning-border)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="rp01-badge" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: '10px', minWidth: '28px', textAlign: 'center' }}>#{cap.caja}</span>
                              <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'Courier New, monospace' }}>{cap.bom_sku}</span>
                              <span className="rp01-badge" style={{
                                fontSize: '9px', padding: '1px 6px',
                                background: cap.origen === 'SISTEMA' ? 'var(--success-bg)' : 'var(--warning-bg)',
                                color: cap.origen === 'SISTEMA' ? 'var(--success-text)' : 'var(--warning-text)'
                              }}>{cap.origen}</span>
                            </div>
                            <button onClick={() => handleEliminarCaptura(idx)} style={{
                              width: '18px', height: '18px', background: 'transparent', color: 'var(--error-text)',
                              border: '1px solid var(--error-border)', borderRadius: '3px', cursor: 'pointer', fontSize: '12px'
                            }}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button className="rp02-btn rp02-btn-primary" onClick={handleFinalizarRevision}
                    style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
                    disabled={capturas.length === 0}>
                    Finalizar Revisión ({capturas.length} capturas)
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
