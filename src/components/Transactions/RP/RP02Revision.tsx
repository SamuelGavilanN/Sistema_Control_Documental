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
  const [cargas, setCargas]: any = useState([]);
  const [cargasFiltradas, setCargasFiltradas]: any = useState([]);
  const [busqueda, setBusqueda]: any = useState('');
  const [cargando, setCargando]: any = useState(true);
  const [cargaSeleccionada, setCargaSeleccionada]: any = useState(null);
  const [pallets, setPallets]: any = useState([]);
  const [palletSeleccionado, setPalletSeleccionado]: any = useState(null);
  const [boms, setBoms]: any = useState([]);
  const [revisiones, setRevisiones]: any = useState([]);
  const [mensaje, setMensaje]: any = useState({ tipo: '', texto: '', visible: false });
  const [mostrarAgregarManual, setMostrarAgregarManual]: any = useState(false);
  const [manualSKU, setManualSKU]: any = useState('');
  const [manualOrigen, setManualOrigen]: any = useState(ORIGENES_MANUALES[0]);
  const skuManualRef: any = useRef(null);
  const usuario: any = auth.getUsuario();

  useEffect(() => {
    cargarCargas();
    const intervalo = setInterval(cargarCargas, 10000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    filtrarCargas();
  }, [busqueda, cargas]);

  const cargarCargas = async () => {
    try {
      const resp = await fetch(API_URL + '/rp_cargas?select=*&estado=eq.Pendiente&order=creado_en.desc', { headers: HEADERS });
      const data = await resp.json();
      if (data) {
        const cargasConConteo = await Promise.all(data.map(async (carga: any) => {
          const respPallets = await fetch(API_URL + '/rp_pallets?select=id&carga_id=eq.' + carga.id, { headers: HEADERS });
          const pallets = await respPallets.json();
          
          let totalBoms = 0;
          if (pallets && pallets.length > 0) {
            for (const pallet of pallets) {
              const respBoms = await fetch(API_URL + '/rp_pallet_boms?select=id&pallet_id=eq.' + pallet.id, { headers: HEADERS });
              const boms = await respBoms.json();
              totalBoms += boms ? boms.length : 0;
            }
          }

          return {
            ...carga,
            total_pallets: pallets ? pallets.length : 0,
            total_boms: totalBoms
          };
        }));
        setCargas(cargasConConteo);
      } else {
        setCargas([]);
      }
      setCargando(false);
    } catch (e) {
      console.error('Error cargando cargas:', e);
      setCargando(false);
    }
  };

  const filtrarCargas = () => {
    if (!busqueda.trim()) {
      setCargasFiltradas(cargas);
      return;
    }
    const termino = busqueda.toLowerCase();
    setCargasFiltradas(cargas.filter((c: any) => 
      c.numero_carga.toLowerCase().includes(termino)
    ));
  };

  const seleccionarCarga = async (carga: any) => {
    setCargaSeleccionada(carga);
    try {
      const respPallets = await fetch(API_URL + '/rp_pallets?select=*&carga_id=eq.' + carga.id + '&order=numero_empaque.asc', { headers: HEADERS });
      const palletsData = await respPallets.json();
      
      const palletsConBoms = await Promise.all((palletsData || []).map(async (pallet: any) => {
        const respBoms = await fetch(API_URL + '/rp_pallet_boms?select=*&pallet_id=eq.' + pallet.id + '&order=bom_sku.asc', { headers: HEADERS });
        const bomsData = await respBoms.json();
        
        const respRevisiones = await fetch(API_URL + '/rp_revisiones?select=*&pallet_id=eq.' + pallet.id, { headers: HEADERS });
        const revisionesData = await respRevisiones.json();

        return {
          ...pallet,
          boms: bomsData || [],
          revisiones: revisionesData || []
        };
      }));

      setPallets(palletsConBoms);
    } catch (e) {
      console.error('Error cargando pallets:', e);
    }
  };

  const seleccionarPallet = (pallet: any) => {
    setPalletSeleccionado(pallet);
    setBoms(pallet.boms || []);
    setRevisiones(pallet.revisiones || []);
  };

  const handleRevisarBOM = async (bom: any) => {
    if (!cargaSeleccionada || !palletSeleccionado) return;

    const yaRevisado = revisiones.find((r: any) => r.bom_sku === bom.bom_sku);
    if (yaRevisado) return;

    try {
      const resp = await fetch(API_URL + '/rp_revisiones', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          carga_id: cargaSeleccionada.id,
          pallet_id: palletSeleccionado.id,
          bom_sku: bom.bom_sku,
          cantidad_revisada: 1,
          origen: 'SISTEMA',
          revisado_por: usuario?.id
        })
      });

      if (resp.ok) {
        const nuevaRevision = await resp.json();
        const revision = Array.isArray(nuevaRevision) ? nuevaRevision[0] : nuevaRevision;
        setRevisiones([...revisiones, revision]);
      }
    } catch (e) {
      console.error('Error revisando BOM:', e);
    }
  };

  const handleAgregarManual = async () => {
    if (!manualSKU.trim() || !cargaSeleccionada || !palletSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Ingrese un SKU', visible: true });
      setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 3000);
      return;
    }

    try {
      const resp = await fetch(API_URL + '/rp_revisiones', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          carga_id: cargaSeleccionada.id,
          pallet_id: palletSeleccionado.id,
          bom_sku: manualSKU.trim().toUpperCase(),
          cantidad_revisada: 1,
          origen: manualOrigen,
          revisado_por: usuario?.id
        })
      });

      if (resp.ok) {
        const nuevaRevision = await resp.json();
        const revision = Array.isArray(nuevaRevision) ? nuevaRevision[0] : nuevaRevision;
        setRevisiones([...revisiones, revision]);
        setManualSKU('');
        setMostrarAgregarManual(false);
        setMensaje({ tipo: 'success', texto: 'SKU agregado correctamente', visible: true });
        setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 2000);
        setTimeout(() => skuManualRef.current?.focus(), 100);
      }
    } catch (e) {
      setMensaje({ tipo: 'error', texto: 'Error al agregar SKU', visible: true });
      setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 3000);
    }
  };

  const estaRevisado = (bomSku: string) => {
    return revisiones.some((r: any) => r.bom_sku === bomSku);
  };

  if (cargando) {
    return (
      <div className="rp02-container">
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Cargando cargas...
        </div>
      </div>
    );
  }

  return (
    <div className="rp02-container">
      {mensaje.visible && (
        <div className={'rp02-toast rp02-toast-' + mensaje.tipo}>
          {mensaje.texto}
        </div>
      )}

      <div className="rp02-header">
        <h2>Revisión Pallet</h2>
        <p className="rp02-subtitle">Buscar por número de carga</p>
      </div>

      <div className="rp02-search">
        <input
          type="text"
          className="rp02-search-input"
          placeholder="Número de carga..."
          value={busqueda}
          onChange={(e: any) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="rp02-count">
        Mostrando <strong>{cargasFiltradas.length}</strong> de <strong>{cargas.length}</strong> cargas
      </div>

      {cargasFiltradas.length === 0 ? (
        <div className="rp02-empty">
          {busqueda ? 'No se encontraron cargas' : 'No hay cargas pendientes'}
        </div>
      ) : (
        <div className="rp02-list">
          {cargasFiltradas.map((carga: any) => (
            <div
              key={carga.id}
              className="rp02-card"
              onClick={() => seleccionarCarga(carga)}
            >
              <div className="rp02-card-header">
                <span className="rp02-card-id">{carga.numero_carga}</span>
                <span className="rp02-card-estado" style={{ color: 'var(--estado-pendiente-text)', background: 'var(--estado-pendiente-bg)' }}>
                  Pendiente
                </span>
              </div>
              <div className="rp02-card-body">
                <div className="rp02-card-row">
                  <span className="rp02-card-label">Pallets</span>
                  <span className="rp02-card-value">{carga.total_pallets}</span>
                </div>
                <div className="rp02-card-row">
                  <span className="rp02-card-label">BOMs</span>
                  <span className="rp02-card-value">{carga.total_boms}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {cargaSeleccionada && (
        <div className="rp02-modal-overlay" onClick={() => { setCargaSeleccionada(null); setPalletSeleccionado(null); }}>
          <div className="rp02-modal" onClick={(e: any) => e.stopPropagation()}>
            <div className="rp02-modal-header">
              <h2>{cargaSeleccionada.numero_carga}</h2>
              <button className="rp02-modal-close" onClick={() => { setCargaSeleccionada(null); setPalletSeleccionado(null); }}>×</button>
            </div>
            <div className="rp02-modal-body">
              {!palletSeleccionado ? (
                <>
                  <div className="rp02-modal-section">
                    <div className="rp02-modal-section-title">Pallets ({pallets.length})</div>
                    <div className="rp02-list">
                      {pallets.map((pallet: any) => {
                        const revisadosCount = pallet.revisiones ? pallet.revisiones.length : 0;
                        const totalBoms = pallet.boms ? pallet.boms.length : 0;
                        const completado = totalBoms > 0 && revisadosCount >= totalBoms;
                        
                        return (
                          <div
                            key={pallet.id}
                            className="rp02-card"
                            onClick={() => seleccionarPallet(pallet)}
                            style={{ borderLeft: completado ? '3px solid var(--success-text)' : '3px solid var(--border)' }}
                          >
                            <div className="rp02-card-header">
                              <span className="rp02-card-id">{pallet.numero_empaque}</span>
                              <span style={{ fontSize: '11px', color: completado ? 'var(--success-text)' : 'var(--text-muted)' }}>
                                {revisadosCount}/{totalBoms}
                              </span>
                            </div>
                            <div className="rp02-card-body">
                              <div className="rp02-card-row">
                                <span className="rp02-card-label">Destino</span>
                                <span className="rp02-card-value">{pallet.cod_destino} - {pallet.destino}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setPalletSeleccionado(null)}
                    style={{
                      padding: '8px 14px',
                      background: 'var(--btn-bg)',
                      color: 'var(--btn-text)',
                      border: '1px solid var(--btn-border)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Volver a Pallets
                  </button>

                  <div className="rp02-modal-section">
                    <div className="rp02-modal-section-title">
                      Pallet {palletSeleccionado.numero_empaque} - {palletSeleccionado.cod_destino}
                    </div>
                    <div className="rp02-bom-list">
                      {boms.map((bom: any) => (
                        <div key={bom.id} className="rp02-bom-item">
                          <div>
                            <div className="rp02-bom-sku">{bom.bom_sku}</div>
                            <div className="rp02-bom-info">Max: {bom.cantidad_maxima}</div>
                          </div>
                          <div
                            className={'rp02-bom-check ' + (estaRevisado(bom.bom_sku) ? 'revisado' : '')}
                            onClick={() => handleRevisarBOM(bom)}
                          >
                            {estaRevisado(bom.bom_sku) ? '✓' : ''}
                          </div>
                        </div>
                      ))}
                      {revisiones.filter((r: any) => r.origen !== 'SISTEMA').map((rev: any) => (
                        <div key={rev.id} className="rp02-bom-item" style={{ borderColor: 'var(--warning-border)', background: 'var(--warning-bg)' }}>
                          <div>
                            <div className="rp02-bom-sku">{rev.bom_sku}</div>
                            <div className="rp02-bom-info" style={{ color: 'var(--warning-text)' }}>{rev.origen}</div>
                          </div>
                          <div className="rp02-bom-check revisado">✓</div>
                        </div>
                      ))}
                    </div>

                    {mostrarAgregarManual && (
                      <div className="rp02-manual-form">
                        <input
                          ref={skuManualRef}
                          type="text"
                          value={manualSKU}
                          onChange={(e: any) => setManualSKU(e.target.value)}
                          onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarManual(); } }}
                          placeholder="SKU"
                          style={{ flex: 1, minWidth: '120px' }}
                        />
                        <select value={manualOrigen} onChange={(e: any) => setManualOrigen(e.target.value)} style={{ flex: 2, minWidth: '150px' }}>
                          {ORIGENES_MANUALES.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <button onClick={handleAgregarManual} style={{ padding: '8px 14px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Agregar
                        </button>
                      </div>
                    )}

                    <button className="rp02-btn-agregar" onClick={() => { setMostrarAgregarManual(!mostrarAgregarManual); setManualSKU(''); }}>
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
