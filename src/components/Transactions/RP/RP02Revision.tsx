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
  const [etapa, setEtapa]: any = useState('empaques');
  const [empaquesAgregados, setEmpaquesAgregados]: any = useState([]);
  const [bomsConsolidados, setBomsConsolidados]: any = useState([]);
  const [capturasBOM, setCapturasBOM]: any = useState([]);
  const [cajaActual, setCajaActual]: any = useState(1);
  const [inputEmpaque, setInputEmpaque]: any = useState('');
  const [inputBOM, setInputBOM]: any = useState('');
  const [origenManualSeleccionado, setOrigenManualSeleccionado]: any = useState(ORIGENES_MANUALES[0]);
  const [mostrarOrigenesManuales, setMostrarOrigenesManuales]: any = useState(false);
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

  const handleEliminarDocumento = async () => {
    if (!documentoSeleccionado) {
      mostrarMensaje('warning', 'Seleccione un documento');
      return;
    }
    if (!window.confirm('¿Eliminar el documento ' + documentoSeleccionado.id_documento + ' y todas sus revisiones?')) return;
    try {
      await fetch(API_URL + '/rp_documento_revisiones?documento_id=eq.' + documentoSeleccionado.id_documento, { method: 'DELETE', headers: HEADERS });
      await fetch(API_URL + '/rp_documento_pallets?documento_id=eq.' + documentoSeleccionado.id_documento, { method: 'DELETE', headers: HEADERS });
      await fetch(API_URL + '/rp_documentos?id=eq.' + documentoSeleccionado.id, { method: 'DELETE', headers: HEADERS });
      mostrarMensaje('success', 'Documento eliminado');
      setDocumentoSeleccionado(null);
      cargarDocumentos();
    } catch (e) {
      mostrarMensaje('error', 'Error al eliminar');
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
        setCajaActual(1);
        setInputEmpaque('');
        setInputBOM('');
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
    setCajaActual(1);
    setInputEmpaque('');
    setInputBOM('');

    // Cargar empaques guardados
    const respRev = await fetch(API_URL + '/rp_documento_revisiones?select=*&pallet_id=eq.' + pallet.id + '&order=creado_en.asc', { headers: HEADERS });
    const revisiones = await respRev.json() || [];

    if (revisiones.length > 0) {
      // Extraer empaques únicos
      const empaquesUnicos: any[] = [];
      const visto = new Set();
      
      revisiones.forEach((r: any) => {
        if (r.origen !== 'SISTEMA' && !visto.has(r.origen)) {
          visto.add(r.origen);
          empaquesUnicos.push({ numero_empaque: r.origen, tipo: 'manual' });
        }
      });

      // Empaques del inventario
      if (pallet.numero_empaque) {
        const empaquesStr = pallet.numero_empaque;
        const empaquesList = empaquesStr.split(',').map((e: string) => e.trim()).filter((e: string) => e);
        for (const emp of empaquesList) {
          if (!visto.has(emp)) {
            visto.add(emp);
            // Verificar si existe en inventario
            try {
              const resp = await fetch(API_URL + '/rp_inventario_empaques?select=*&numero_empaque=eq.' + encodeURIComponent(emp), { headers: HEADERS });
              const data = await resp.json();
              if (data && data.length > 0) {
                empaquesUnicos.push({
                  numero_empaque: emp,
                  tipo: 'inventario',
                  empaque_id: data[0].id,
                  cod_destino: data[0].cod_destino,
                  destino: data[0].destino
                });
              } else {
                empaquesUnicos.push({ numero_empaque: emp, tipo: 'manual' });
              }
            } catch (e) {
              empaquesUnicos.push({ numero_empaque: emp, tipo: 'manual' });
            }
          }
        }
      }

      setEmpaquesAgregados(empaquesUnicos);

      // Cargar BOMs consolidados
      const bomsSistema = revisiones.filter((r: any) => r.origen === 'SISTEMA');
      const bomsManuales = revisiones.filter((r: any) => r.origen !== 'SISTEMA');

      const bomsConsolidadosTemp: any[] = [];
      bomsSistema.forEach((r: any) => {
        const existente = bomsConsolidadosTemp.find((b: any) => b.bom_sku === r.bom_sku);
        if (existente) {
          existente.cantidad_revisada += r.cantidad_revisada;
        } else {
          bomsConsolidadosTemp.push({
            bom_sku: r.bom_sku,
            cantidad_sistema: r.cantidad_sistema,
            cantidad_revisada: r.cantidad_revisada
          });
        }
      });

      // Agregar BOMs manuales como capturas
      const capturasTemp: any[] = [];
      bomsManuales.forEach((r: any) => {
        for (let i = 0; i < r.cantidad_revisada; i++) {
          capturasTemp.push({
            caja: capturasTemp.length + 1,
            bom_sku: r.bom_sku,
            estado: 'manual',
            mensaje: r.origen,
            creado_en: r.creado_en
          });
        }
      });

      setBomsConsolidados(bomsConsolidadosTemp);
      setCapturasBOM(capturasTemp);
      setCajaActual(capturasTemp.length + 1);
    }
  };

  const handleAgregarEmpaque = async () => {
    const valor = inputEmpaque.trim();
    if (!valor) {
      mostrarMensaje('warning', 'Ingrese un número de empaque');
      return;
    }
    if (!palletActual) return;

    if (empaquesAgregados.find((e: any) => e.numero_empaque === valor)) {
      mostrarMensaje('warning', 'Este empaque ya fue agregado');
      setInputEmpaque('');
      return;
    }

    const esOrigenManual = ORIGENES_MANUALES.some(o => o === valor);

    if (esOrigenManual) {
      setEmpaquesAgregados([...empaquesAgregados, { numero_empaque: valor, tipo: 'manual' }]);
      setInputEmpaque('');
      setTimeout(() => inputEmpaqueRef.current?.focus(), 200);
      return;
    }

    try {
      const resp = await fetch(API_URL + '/rp_inventario_empaques?select=*&numero_empaque=eq.' + encodeURIComponent(valor), { headers: HEADERS });
      const empaques = await resp.json();

      if (!empaques || empaques.length === 0) {
        setEmpaquesAgregados([...empaquesAgregados, { numero_empaque: valor, tipo: 'manual' }]);
        setInputEmpaque('');
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
      setTimeout(() => inputEmpaqueRef.current?.focus(), 200);
    } catch (e) {
      mostrarMensaje('error', 'Error al buscar empaque');
    }
  };

  const handleAgregarOrigenManual = (origen: string) => {
    if (empaquesAgregados.find((e: any) => e.numero_empaque === origen)) {
      mostrarMensaje('warning', 'Este origen ya fue agregado');
      return;
    }
    setEmpaquesAgregados([...empaquesAgregados, { numero_empaque: origen, tipo: 'manual' }]);
    setMostrarOrigenesManuales(false);
    setTimeout(() => inputEmpaqueRef.current?.focus(), 200);
  };

  const handleEliminarEmpaque = (index: number) => {
    setEmpaquesAgregados(empaquesAgregados.filter((_: any, i: number) => i !== index));
  };

  const handleIniciarRevision = async () => {
    if (empaquesAgregados.length === 0) {
      mostrarMensaje('warning', 'Agregue al menos un empaque');
      return;
    }

    const empaquesStr = empaquesAgregados.map((e: any) => e.numero_empaque).join(',');
    await fetch(API_URL + '/rp_documento_pallets?id=eq.' + palletActual.id, {
      method: 'PATCH',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero_empaque: empaquesStr })
    });

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
            } else {
              bomsConsolidadosTemp.push({
                bom_sku: bom.bom_sku,
                cantidad_sistema: bom.cantidad_maxima,
                cantidad_revisada: 0
              });
            }
          }
        }
      }
    }

    setBomsConsolidados(bomsConsolidadosTemp);
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
    let mensajeCaptura = 'No encontrado en sistema';

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

    setCapturasBOM([{
      caja: cajaActual,
      bom_sku: valor,
      estado,
      mensaje: mensajeCaptura,
      creado_en: new Date().toISOString()
    }, ...capturasBOM]);

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
      // Eliminar revisiones anteriores
      await fetch(API_URL + '/rp_documento_revisiones?pallet_id=eq.' + palletActual.id, { method: 'DELETE', headers: HEADERS });

      // Guardar revisiones de BOMs del sistema
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

      // Guardar BOMs no encontrados (manuales/sobrantes)
      const bomsSistema = bomsConsolidados.map((b: any) => b.bom_sku);
      const capturasNoSistema = capturasBOM.filter((c: any) => !bomsSistema.includes(c.bom_sku));

      // Agrupar por BOM
      const agrupados: Record<string, number> = {};
      capturasNoSistema.forEach((c: any) => {
        if (!agrupados[c.bom_sku]) agrupados[c.bom_sku] = 0;
        agrupados[c.bom_sku]++;
      });

      for (const bomSku of Object.keys(agrupados)) {
        await fetch(API_URL + '/rp_documento_revisiones', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documento_id: documentoSeleccionado.id_documento,
            pallet_id: palletActual.id,
            bom_sku: bomSku,
            cantidad_sistema: 0,
            cantidad_revisada: agrupados[bomSku],
            origen: 'NO_ENCONTRADO',
            revisado_por: usuario?.id
          })
        });
      }

      await cargarPallets(documentoSeleccionado);
      mostrarMensaje('success', 'Revisión finalizada correctamente');
      setPalletActual(null);
      setEtapa('empaques');
      setEmpaquesAgregados([]);
      setBomsConsolidados([]);
      setCapturasBOM([]);
      setCajaActual(1);
    } catch (e) {
      mostrarMensaje('error', 'Error al finalizar revisión');
    }
  };

  const totalSistema = bomsConsolidados.reduce((s: number, b: any) => s + b.cantidad_sistema, 0);
  const totalRevisado = bomsConsolidados.reduce((s: number, b: any) => s + b.cantidad_revisada, 0);
  const totalCapturas = capturasBOM.length;
  const diferencia = totalRevisado - totalSistema;
  const bomsNoEncontrados = capturasBOM.filter((c: any) => c.estado === 'no_encontrado');

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
        <button className="rp02-btn" onClick={() => documentoSeleccionado && handleAbrirDocumento(documentoSeleccionado)}
          disabled={!documentoSeleccionado}>
          Abrir Documento
        </button>
        <div className="rp02-separator"></div>
        <button className="rp02-btn rp01-btn-danger" onClick={handleEliminarDocumento} disabled={!documentoSeleccionado}>
          Eliminar Documento
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
          <div className="rp02-modal" style={{ maxWidth: '750px' }} onClick={(e: any) => e.stopPropagation()}>
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

                  {palletsDoc.length > 0 && (
                    <div className="rp02-modal-section-title" style={{ marginBottom: '10px' }}>Pallets del Documento</div>
                  )}
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
                            placeholder="Número de Empaque"
                            autoFocus
                          />
                          <button className="rp02-btn-save" onClick={handleAgregarEmpaque} style={{ whiteSpace: 'nowrap' }}>
                            Agregar
                          </button>
                        </div>

                        <button className="rp02-btn" onClick={() => setMostrarOrigenesManuales(!mostrarOrigenesManuales)}
                          style={{ marginBottom: '10px', width: '100%', justifyContent: 'center' }}>
                          {mostrarOrigenesManuales ? 'Ocultar' : 'Mostrar'} Otros Centros / Orígenes
                        </button>

                        {mostrarOrigenesManuales && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                            {ORIGENES_MANUALES.map((origen: string) => (
                              <button key={origen} className="rp02-btn" onClick={() => handleAgregarOrigenManual(origen)}
                                style={{ fontSize: '11px', padding: '8px 10px', textAlign: 'left' }}>
                                {origen}
                              </button>
                            ))}
                          </div>
                        )}

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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                          <div className="rp01-resumen-card" style={{ padding: '10px' }}>
                            <span style={{ fontSize: '10px' }}>Sistema</span>
                            <strong style={{ fontSize: '18px' }}>{totalSistema}</strong>
                          </div>
                          <div className="rp01-resumen-card" style={{ padding: '10px' }}>
                            <span style={{ fontSize: '10px' }}>Revisado</span>
                            <strong style={{ fontSize: '18px', color: totalRevisado >= totalSistema ? 'var(--success-text)' : 'var(--error-text)' }}>{totalRevisado}</strong>
                          </div>
                          <div className="rp01-resumen-card" style={{ padding: '10px' }}>
                            <span style={{ fontSize: '10px' }}>Caja #</span>
                            <strong style={{ fontSize: '18px' }}>{cajaActual}</strong>
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
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Sist: {bom.cantidad_sistema}
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

                        {capturasBOM.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span className="rp02-modal-section-title">Capturas ({capturasBOM.length})</span>
                              <span className="rp02-modal-section-title" style={{ color: 'var(--text-muted)' }}>Total cajas: {cajaActual - 1}</span>
                            </div>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                              {capturasBOM.map((cap: any, idx: number) => (
                                <div key={idx} className="rp02-bom-item" style={{
                                  marginBottom: '3px', padding: '8px 10px',
                                  background: cap.estado === 'completo' ? 'var(--success-bg)' :
                                    cap.estado === 'falta' ? 'var(--warning-bg)' :
                                    cap.estado === 'sobra' ? 'var(--error-bg)' :
                                    'var(--error-bg)',
                                  borderColor: cap.estado === 'completo' ? 'var(--success-border)' :
                                    cap.estado === 'falta' ? 'var(--warning-border)' :
                                    cap.estado === 'sobra' ? 'var(--error-border)' :
                                    'var(--error-border)'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="rp01-badge" style={{
                                      background: 'var(--btn-primary-bg)',
                                      color: 'var(--btn-primary-text)',
                                      fontSize: '10px', minWidth: '30px', textAlign: 'center'
                                    }}>
                                      #{cap.caja}
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'Courier New, monospace' }}>
                                      {cap.bom_sku}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                      fontSize: '10px',
                                      color: cap.estado === 'completo' ? 'var(--success-text)' :
                                        cap.estado === 'falta' ? 'var(--warning-text)' :
                                        'var(--error-text)'
                                    }}>
                                      {cap.mensaje}
                                    </span>
                                    <button onClick={() => handleEliminarCaptura(idx)} style={{
                                      width: '18px', height: '18px', background: 'transparent', color: 'var(--error-text)',
                                      border: '1px solid var(--error-border)', borderRadius: '3px', cursor: 'pointer',
                                      fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>×</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button className="rp02-btn rp02-btn-primary" onClick={handleFinalizarRevision}
                          style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}>
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
    </div>
  );
};

export default RP02Revision;
