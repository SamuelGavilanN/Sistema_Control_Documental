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
  { codigo: 'CD12', nombre: 'Bodegas Lampa' },
  { codigo: 'CD30', nombre: 'Bodegas Renca' },
  { codigo: 'C144', nombre: 'Bodega Holly Concept' },
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
  const [capturas, setCapturas]: any = useState([]);
  const [empaquesActivos, setEmpaquesActivos]: any = useState([]);
  const [origenSeleccionado, setOrigenSeleccionado]: any = useState('');
  const [inputEmpaque, setInputEmpaque]: any = useState('');
  const [bomInput, setBomInput]: any = useState('');
  const [cantidadInput, setCantidadInput]: any = useState('1');
  const [mostrarDetallePallet, setMostrarDetallePallet]: any = useState(false);
  const [palletDetalle, setPalletDetalle]: any = useState(null);
  const inputEmpaqueRef: any = useRef(null);
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

  const obtenerSiguienteCaja = () => {
    if (capturas.length === 0) return 1;
    const cajasOrdenadas = capturas.map((c: any) => c.caja).sort((a: number, b: number) => a - b);
    for (let i = 0; i < cajasOrdenadas.length; i++) {
      if (cajasOrdenadas[i] !== i + 1) return i + 1;
    }
    return cajasOrdenadas.length + 1;
  };

  const recalcularEstados = (listaCapturas: any[]) => {
    const resultado = [...listaCapturas];
    
    const empaques: Record<string, any[]> = {};
    resultado.forEach((c: any) => {
      if (c.numero_empaque && c.numero_empaque !== '') {
        if (!empaques[c.numero_empaque]) empaques[c.numero_empaque] = [];
        empaques[c.numero_empaque].push(c);
      }
    });

    Object.keys(empaques).forEach(numEmpaque => {
      const bomsUnicos: string[] = [];
      const visto: any = {};
      
      resultado.forEach((c: any) => {
        if (c.numero_empaque === numEmpaque && c.bom_sku !== '-' && !visto[c.bom_sku]) {
          visto[c.bom_sku] = true;
          bomsUnicos.push(c.bom_sku);
        }
      });

      bomsUnicos.forEach((bomSku: string) => {
        let cantidadSistema = 0;
        for (const c of resultado) {
          if (c.numero_empaque === numEmpaque && c.bom_sku === bomSku && c.cantidad_sistema > 0) {
            cantidadSistema = c.cantidad_sistema;
            break;
          }
        }

        let totalCapturado = 0;
        resultado.forEach((c: any) => {
          if (c.numero_empaque === numEmpaque && c.bom_sku === bomSku) {
            totalCapturado += c.cantidad;
          }
        });

        let estado = 'OK';
        if (cantidadSistema === 0) {
          estado = 'NO_ENCONTRADO';
        } else if (totalCapturado < cantidadSistema) {
          estado = 'FALTA';
        } else if (totalCapturado > cantidadSistema) {
          estado = 'SOBRA';
        }

        resultado.forEach((c: any, i: number) => {
          if (c.numero_empaque === numEmpaque && c.bom_sku === bomSku) {
            resultado[i] = { ...c, estado };
          }
        });
      });
    });

    return resultado;
  };

  const verificarEmpaqueCompleto = async (numeroEmpaque: string) => {
    try {
      const respEmpaque = await fetch(
        API_URL + '/rp_inventario_empaques?select=*&numero_empaque=eq.' + encodeURIComponent(numeroEmpaque),
        { headers: HEADERS }
      );
      const empaqueData = await respEmpaque.json();
      
      if (!empaqueData || empaqueData.length === 0) {
        return { encontrado: false, completo: false, empaque: null };
      }

      const empaque = empaqueData[0];
      
      const respBoms = await fetch(
        API_URL + '/rp_inventario_boms?select=*&empaque_id=eq.' + empaque.id,
        { headers: HEADERS }
      );
      const boms = await respBoms.json();
      
      if (!boms || boms.length === 0) {
        return { encontrado: true, completo: true, empaque };
      }

      let todasRevisiones: any[] = [];
      for (const bom of boms) {
        const respRev = await fetch(
          API_URL + '/rp_documento_revisiones?select=*&bom_sku=eq.' + encodeURIComponent(bom.bom_sku) + '&numero_empaque=eq.' + encodeURIComponent(numeroEmpaque),
          { headers: HEADERS }
        );
        const revs = await respRev.json();
        if (revs && revs.length > 0) {
          todasRevisiones = [...todasRevisiones, ...revs];
        }
      }

      const revisionesPorBOM: Record<string, number> = {};
      todasRevisiones.forEach((r: any) => {
        if (!revisionesPorBOM[r.bom_sku]) revisionesPorBOM[r.bom_sku] = 0;
        revisionesPorBOM[r.bom_sku] += (r.cantidad_revisada || 0);
      });

      let completo = true;
      for (const bom of boms) {
        const revisado = revisionesPorBOM[bom.bom_sku] || 0;
        if (revisado < bom.cantidad_maxima) {
          completo = false;
          break;
        }
      }

      return { encontrado: true, completo, empaque };
    } catch (e) {
      return { encontrado: false, completo: false, empaque: null };
    }
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
        setEmpaquesActivos([]);
        setOrigenSeleccionado('');
        setInputEmpaque('');
        setBomInput('');
        setCantidadInput('1');
        mostrarMensaje('success', numeroPallet + ' iniciado');
        setTimeout(() => inputEmpaqueRef.current?.focus(), 300);
      }
    } catch (e) { mostrarMensaje('error', 'Error al iniciar pallet'); }
  };

  const handleAbrirPallet = async (pallet: any) => {
    setPalletActual(pallet);
    const revisiones = pallet.revisiones || [];
    
    const capturasTemp: any[] = [];
    const empaquesSet = new Set<string>();
    
    for (const r of revisiones) {
      capturasTemp.push({
        caja: r.caja_numero,
        origen: r.origen,
        bom_sku: r.bom_sku,
        cantidad: r.cantidad_revisada,
        cantidad_sistema: r.cantidad_sistema,
        numero_empaque: r.numero_empaque || '',
        estado: r.estado || 'OK'
      });
      if (r.numero_empaque) empaquesSet.add(r.numero_empaque);
    }
    
    capturasTemp.sort((a: any, b: any) => a.caja - b.caja);
    
    const capturasConEstado = recalcularEstados(capturasTemp);
    setCapturas(capturasConEstado);
    setEmpaquesActivos(Array.from(empaquesSet));
    setOrigenSeleccionado('');
    setInputEmpaque('');
    setBomInput('');
    setCantidadInput('1');
  };

  const handleCapturarEmpaque = async () => {
    const valor = inputEmpaque.trim();
    if (!valor) {
      mostrarMensaje('warning', 'Ingrese un número de empaque');
      return;
    }

    if (empaquesActivos.includes(valor)) {
      mostrarMensaje('warning', 'Este empaque ya fue agregado');
      setInputEmpaque('');
      return;
    }

    const resultado = await verificarEmpaqueCompleto(valor);
    
    if (!resultado.encontrado) {
      // Si no está en inventario, preguntar si agregar igual
      if (window.confirm('Empaque no encontrado en inventario. ¿Agregar de todas formas?')) {
        setEmpaquesActivos([...empaquesActivos, valor]);
        setInputEmpaque('');
        mostrarMensaje('success', 'Empaque ' + valor + ' agregado');
        setTimeout(() => inputEmpaqueRef.current?.focus(), 200);
      }
      return;
    }

    if (resultado.completo) {
      mostrarMensaje('error', 'Este empaque ya fue revisado completamente en otro pallet');
      return;
    }

    setEmpaquesActivos([...empaquesActivos, valor]);
    setOrigenSeleccionado('');
    setInputEmpaque('');
    mostrarMensaje('success', 'Empaque ' + valor + ' agregado');
    setTimeout(() => bomInputRef.current?.focus(), 200);
  };

  const handleEliminarEmpaque = (empaque: string) => {
    setEmpaquesActivos(empaquesActivos.filter((e: string) => e !== empaque));
    // También eliminar capturas asociadas a este empaque
    setCapturas(capturas.filter((c: any) => c.numero_empaque !== empaque));
  };

  const handleAgregarCaptura = async () => {
    if (empaquesActivos.length === 0 && !origenSeleccionado) {
      mostrarMensaje('warning', 'Agregue al menos un empaque o seleccione un origen manual');
      return;
    }
    if (!palletActual) return;

    const cantidad = parseInt(cantidadInput) || 1;
    const bom = bomInput.trim().toUpperCase();
    const nuevoId = obtenerSiguienteCaja();

    const existeCaja = capturas.find((c: any) => c.caja === nuevoId);
    if (existeCaja) {
      mostrarMensaje('error', 'El ID de caja #' + nuevoId + ' ya existe. Recargue el pallet.');
      return;
    }

    let origenFinal = origenSeleccionado || 'CD01';
    let cantidadSistema = 0;
    
    // Si hay empaques activos y un BOM, buscar en el inventario
    if (empaquesActivos.length > 0 && bom) {
      for (const numEmp of empaquesActivos) {
        try {
          const respEmp = await fetch(API_URL + '/rp_inventario_empaques?select=id,origen&numero_empaque=eq.' + encodeURIComponent(numEmp), { headers: HEADERS });
          const empData = await respEmp.json();
          if (empData && empData.length > 0) {
            const respBoms = await fetch(
              API_URL + '/rp_inventario_boms?select=*&empaque_id=eq.' + empData[0].id + '&bom_sku=eq.' + encodeURIComponent(bom),
              { headers: HEADERS }
            );
            const boms = await respBoms.json();
            if (boms && boms.length > 0) {
              cantidadSistema += boms.reduce((s: number, b: any) => s + (b.cantidad_maxima || 0), 0);
              if (!origenSeleccionado) origenFinal = empData[0].origen || 'CD01';
            }
          }
        } catch (e) {}
      }
    }

    // Usar el primer empaque activo como numero_empaque, o el origen manual
    const numeroEmpaque = empaquesActivos.length > 0 ? empaquesActivos[0] : (origenSeleccionado || '');

    const nuevaCaptura: any = {
      caja: nuevoId,
      origen: origenFinal,
      bom_sku: bom || '-',
      cantidad: cantidad,
      cantidad_sistema: cantidadSistema,
      numero_empaque: numeroEmpaque,
      estado: 'OK'
    };

    let nuevasCapturas: any[] = [...capturas, nuevaCaptura];
    nuevasCapturas.sort((a: any, b: any) => a.caja - b.caja);

    const cajasArray = nuevasCapturas.map((c: any) => c.caja);
    const cajasUnicas = new Set(cajasArray);
    if (cajasUnicas.size !== cajasArray.length) {
      mostrarMensaje('error', 'Se detectaron IDs de caja duplicados. Recargue el pallet.');
      return;
    }

    nuevasCapturas = recalcularEstados(nuevasCapturas);

    setCapturas(nuevasCapturas);
    setBomInput('');
    setCantidadInput('1');
    setTimeout(() => bomInputRef.current?.focus(), 100);
  };

  const handleEliminarCaptura = (index: number) => {
    let nuevasCapturas: any[] = capturas.filter((_: any, i: number) => i !== index);
    nuevasCapturas = recalcularEstados(nuevasCapturas);
    setCapturas(nuevasCapturas);
  };

  const handleFinalizarRevision = async () => {
    if (!palletActual || !documentoSeleccionado) return;
    if (capturas.length === 0) {
      mostrarMensaje('warning', 'No hay capturas para guardar');
      return;
    }

    const capturasFinales = recalcularEstados(capturas);

    try {
      await fetch(API_URL + '/rp_documento_revisiones?pallet_id=eq.' + palletActual.id, { method: 'DELETE', headers: HEADERS });

      // Guardar empaques en el pallet
      const empaquesStr = empaquesActivos.join(',');
      await fetch(API_URL + '/rp_documento_pallets?id=eq.' + palletActual.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_empaque: empaquesStr })
      });

      for (const cap of capturasFinales) {
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
            numero_empaque: cap.numero_empaque || null,
            estado: cap.estado,
            revisado_por: usuario?.id
          })
        });
      }

      await cargarPallets(documentoSeleccionado);
      mostrarMensaje('success', 'Revisión finalizada - ' + capturasFinales.length + ' cajas guardadas');
      setPalletActual(null);
      setCapturas([]);
      setEmpaquesActivos([]);
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

      {mostrarRevisar && documentoSeleccionado && (
        <div className="rp02-modal-overlay" onClick={() => { setMostrarRevisar(false); setPalletActual(null); setEmpaquesActivos([]); }}>
          <div className="rp02-modal" style={{ maxWidth: '950px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header">
              <h2>{documentoSeleccionado.id_documento} - Revisión</h2>
              <button className="rp02-modal-close" onClick={() => { setMostrarRevisar(false); setPalletActual(null); setEmpaquesActivos([]); }}>×</button>
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
                    const empaquesUnicos = [...new Set(revs.map((r: any) => r.numero_empaque).filter((e: string) => e))];
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
                          {empaquesUnicos.length > 0 && <span>Empaques: {empaquesUnicos.join(', ')} | </span>}
                          {totalItems} items | {revs.length} registros
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  <button onClick={() => { setPalletActual(null); setEmpaquesActivos([]); }} className="rp02-btn" style={{ marginBottom: '16px' }}>
                    ← Volver a Pallets
                  </button>

                  <div style={{ background: 'var(--bg-section)', borderRadius: '8px', padding: '14px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="rp02-pallet-numero" style={{ fontSize: '16px' }}>{palletActual.numero_pallet}</span>
                      <span className="rp01-badge" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: '12px', padding: '4px 10px' }}>
                        Caja #{obtenerSiguienteCaja()}
                      </span>
                    </div>

                    <div style={{ marginBottom: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Capture números de empaque (CD01/CD16) o seleccione un origen manual.
                    </div>

                    {/* Captura de empaques */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr auto', gap: '8px', alignItems: 'end', marginBottom: '10px' }}>
                      <div className="rp02-form-group">
                        <label className="rp02-form-label">N° Empaque</label>
                        <input ref={inputEmpaqueRef} type="text" className="rp02-form-input" value={inputEmpaque}
                          onChange={(e: any) => setInputEmpaque(e.target.value)}
                          onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleCapturarEmpaque(); } }}
                          placeholder="Escanear número de empaque..." />
                      </div>
                      <button className="rp02-btn-save" onClick={handleCapturarEmpaque} style={{ height: '42px', whiteSpace: 'nowrap' }}>
                        Agregar
                      </button>
                    </div>

                    {/* Lista de empaques activos */}
                    {empaquesActivos.length > 0 && (
                      <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {empaquesActivos.map((emp: string, idx: number) => (
                          <span key={idx} style={{
                            padding: '6px 10px',
                            background: 'var(--success-bg)',
                            borderRadius: '6px',
                            border: '1px solid var(--success-border)',
                            fontSize: '12px',
                            color: 'var(--success-text)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {emp}
                            <button onClick={() => handleEliminarEmpaque(emp)} style={{
                              background: 'none', border: 'none', color: 'var(--error-text)', cursor: 'pointer', fontSize: '14px', padding: '0'
                            }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Captura de BOM */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '10px' }}>
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

                    {/* Origen manual */}
                    <div className="rp02-form-group">
                      <label className="rp02-form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Origen manual (opcional)
                      </label>
                      <select className="rp02-form-input" value={origenSeleccionado} onChange={(e: any) => setOrigenSeleccionado(e.target.value)}>
                        <option value="">Usar empaque capturado</option>
                        {ORIGENES.map(o => <option key={o.codigo} value={o.codigo}>{o.codigo} - {o.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  {capturas.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div className="rp02-modal-section-title" style={{ marginBottom: '8px' }}>
                        Registro de Capturas ({capturas.length} cajas)
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="ed03-tabla" style={{ minWidth: '950px' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '70px', textAlign: 'center' }}>ID Caja</th>
                              <th>Origen</th>
                              <th>N° Empaque</th>
                              <th>BOM</th>
                              <th style={{ textAlign: 'center', width: '80px' }}>Cant.</th>
                              <th style={{ textAlign: 'center', width: '100px' }}>Sistema</th>
                              <th style={{ textAlign: 'center', width: '110px' }}>Estado</th>
                              <th style={{ width: '40px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {capturas.map((cap: any, idx: number) => {
                              const estilo = getEstadoStyle(cap.estado);
                              return (
                                <tr key={idx}>
                                  <td style={{ textAlign: 'center' }}>
                                    <span className="rp01-badge" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: '11px', padding: '3px 10px', fontWeight: 700 }}>
                                      #{cap.caja}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 500 }}>{cap.origen}</td>
                                  <td style={{ fontFamily: 'Courier New, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {cap.numero_empaque || '-'}
                                  </td>
                                  <td style={{ fontFamily: 'Courier New, monospace', fontWeight: 600, fontSize: '12px' }}>{cap.bom_sku}</td>
                                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{cap.cantidad}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    {cap.cantidad_sistema > 0 ? cap.cantidad_sistema : '-'}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span style={{
                                      display: 'inline-block', padding: '3px 10px', borderRadius: '10px',
                                      fontSize: '11px', fontWeight: 600, background: estilo.bg,
                                      color: estilo.color, border: '1px solid ' + estilo.border
                                    }}>
                                      {cap.estado}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => handleEliminarCaptura(idx)} style={{
                                      width: '24px', height: '24px', background: 'var(--error-bg)', color: 'var(--error-text)',
                                      border: '1px solid var(--error-border)', borderRadius: '4px', cursor: 'pointer',
                                      fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>×</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px' }}>
                        <div className="rp01-resumen-card" style={{ padding: '10px' }}>
                          <span style={{ fontSize: '10px' }}>Total Cajas</span>
                          <strong style={{ fontSize: '18px' }}>{capturas.length}</strong>
                        </div>
                        <div className="rp01-resumen-card" style={{ padding: '10px' }}>
                          <span style={{ fontSize: '10px' }}>Total Unidades</span>
                          <strong style={{ fontSize: '18px' }}>{capturas.reduce((s: number, c: any) => s + c.cantidad, 0)}</strong>
                        </div>
                        <div className="rp01-resumen-card" style={{ padding: '10px' }}>
                          <span style={{ fontSize: '10px' }}>OK / Con Dif.</span>
                          <strong style={{ fontSize: '18px' }}>
                            <span style={{ color: 'var(--success-text)' }}>{capturas.filter((c: any) => c.estado === 'OK').length}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}> / </span>
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

                  {capturas.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-placeholder)', fontSize: '13px' }}>
                      No hay capturas registradas.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {mostrarDetallePallet && palletDetalle && (
        <div className="rp02-modal-overlay" onClick={() => setMostrarDetallePallet(false)}>
          <div className="rp02-modal" style={{ maxWidth: '850px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header">
              <h2>{palletDetalle.numero_pallet} - Detalle</h2>
              <button className="rp02-modal-close" onClick={() => setMostrarDetallePallet(false)}>×</button>
            </div>
            <div className="rp02-modal-body">
              <div style={{ overflowX: 'auto' }}>
                <table className="ed03-tabla" style={{ minWidth: '750px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', width: '70px' }}>ID Caja</th>
                      <th>Origen</th>
                      <th>N° Empaque</th>
                      <th>BOM</th>
                      <th style={{ textAlign: 'center' }}>Cant.</th>
                      <th style={{ textAlign: 'center' }}>Sist.</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(palletDetalle.revisiones || []).length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-placeholder)' }}>Sin revisiones</td></tr>
                    ) : (
                      (palletDetalle.revisiones || [])
                        .sort((a: any, b: any) => a.caja_numero - b.caja_numero)
                        .map((rev: any, idx: number) => {
                          const estilo = getEstadoStyle(rev.estado || 'OK');
                          return (
                            <tr key={idx}>
                              <td style={{ textAlign: 'center' }}>
                                <span className="rp01-badge" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: '10px', padding: '2px 8px' }}>#{rev.caja_numero}</span>
                              </td>
                              <td>{rev.origen}</td>
                              <td style={{ fontFamily: 'Courier New, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                                {rev.numero_empaque || '-'}
                              </td>
                              <td style={{ fontFamily: 'Courier New, monospace', fontWeight: 600, fontSize: '12px' }}>{rev.bom_sku}</td>
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
