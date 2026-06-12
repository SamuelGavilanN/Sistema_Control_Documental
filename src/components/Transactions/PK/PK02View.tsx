// src/components/Transactions/PK/PK02View.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import * as XLSX from 'xlsx';
import './PK01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface Pedido {
  id: string;
  numero_pedido: string;
  cod_tda: string;
  nombre_tda: string;
  estado: string;
  creado_en: string;
  total_lpns?: number;
  encontrados?: number;
}

interface LPNItem {
  id: string;
  pallet: string;
  codigo_lpn: string;
  encontrado: boolean;
}

interface CapturaLog {
  id: string;
  pallet_escaneado: string;
  lpn_escaneado: string;
  corresponde: boolean;
  capturado_en: string;
}

const PK02View: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);
  const [lpnsPedido, setLpnsPedido] = useState<LPNItem[]>([]);
  const [capturasLog, setCapturasLog] = useState<CapturaLog[]>([]);

  // Estados de escaneo
  const [palletEscaneado, setPalletEscaneado] = useState('');
  const [lpnEscaneado, setLpnEscaneado] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [palletValido, setPalletValido] = useState<boolean | null>(null);
  const [lpnsDelPallet, setLpnsDelPallet] = useState<LPNItem[]>([]);

  const palletInputRef = useRef<HTMLInputElement>(null);
  const lpnInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cargarPedidos(); }, []);
  useEffect(() => { const intervalo = setInterval(cargarPedidos, 10000); return () => clearInterval(intervalo); }, []);

  const cargarPedidos = async () => {
    setCargando(true);
    try {
      const resp = await fetch(`${API_URL}/pk01_pedidos?select=*&order=creado_en.desc`, { headers: HEADERS });
      const data = await resp.json();

      const pedidosConConteo = await Promise.all((data || []).map(async (p: any) => {
        const respLPN = await fetch(
          `${API_URL}/pk01_pedido_lpns?select=id,encontrado&pedido_id=eq.${p.id}`,
          { headers: HEADERS }
        );
        const lpns = await respLPN.json();
        return {
          ...p,
          total_lpns: lpns?.length || 0,
          encontrados: lpns?.filter((l: any) => l.encontrado).length || 0,
        };
      }));

      setPedidos(pedidosConConteo);
    } catch (e) {}
    setCargando(false);
  };

  const seleccionarPedido = async (pedido: Pedido) => {
    setPedidoActivo(pedido);
    setPalletEscaneado('');
    setLpnEscaneado('');
    setMensaje('');
    setPalletValido(null);
    setLpnsDelPallet([]);

    // Cargar LPNs del pedido
    const resp = await fetch(
      `${API_URL}/pk01_pedido_lpns?select=*&pedido_id=eq.${pedido.id}&order=pallet,codigo_lpn`,
      { headers: HEADERS }
    );
    setLpnsPedido(await resp.json() || []);

    // Cargar log de capturas
    const respLog = await fetch(
      `${API_URL}/pk02_capturas?select=*&pedido_id=eq.${pedido.id}&order=capturado_en.desc&limit=50`,
      { headers: HEADERS }
    );
    setCapturasLog(await respLog.json() || []);

    // Actualizar estado a "En Proceso"
    if (pedido.estado === 'Pendiente') {
      await fetch(`${API_URL}/pk01_pedidos?id=eq.${pedido.id}`, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'En Proceso' }),
      });
    }

    setTimeout(() => palletInputRef.current?.focus(), 300);
  };

  const handleEscanearPallet = async () => {
    if (!palletEscaneado.trim() || !pedidoActivo) return;

    // Buscar LPNs de este pallet en el pedido
    const lpnsEncontrados = lpnsPedido.filter(
      l => l.pallet.toUpperCase() === palletEscaneado.trim().toUpperCase() && !l.encontrado
    );

    if (lpnsEncontrados.length > 0) {
      setPalletValido(true);
      setLpnsDelPallet(lpnsEncontrados);
      setMensaje(`✅ Pallet ${palletEscaneado} válido. Contiene ${lpnsEncontrados.length} LPN(s) pendiente(s) de este pedido.`);
      setTipoMensaje('success');
      setTimeout(() => lpnInputRef.current?.focus(), 200);
    } else {
      // Verificar si ya fueron encontrados
      const yaEncontrados = lpnsPedido.filter(
        l => l.pallet.toUpperCase() === palletEscaneado.trim().toUpperCase() && l.encontrado
      );
      
      if (yaEncontrados.length > 0) {
        setPalletValido(true);
        setLpnsDelPallet([]);
        setMensaje(`⚠️ Pallet ${palletEscaneado} ya fue procesado. Todos sus LPNs fueron encontrados.`);
        setTipoMensaje('warning');
      } else {
        setPalletValido(false);
        setLpnsDelPallet([]);
        setMensaje(`❌ El pallet ${palletEscaneado} no contiene LPNs de este pedido.`);
        setTipoMensaje('error');
      }
    }
  };

  const handleEscanearLPN = async () => {
    if (!lpnEscaneado.trim() || !pedidoActivo) return;

    const user = auth.getUsuario();
    const lpnEncontrado = lpnsPedido.find(
      l => l.codigo_lpn.toUpperCase() === lpnEscaneado.trim().toUpperCase()
    );

    const corresponde = !!lpnEncontrado && !lpnEncontrado.encontrado;

    // Guardar captura
    const resp = await fetch(`${API_URL}/pk02_capturas`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pedido_id: pedidoActivo.id,
        pallet_escaneado: palletEscaneado || '-',
        lpn_escaneado: lpnEscaneado.trim(),
        corresponde: corresponde,
        capturado_por: user?.id,
      }),
    });
    const captura = await resp.json();

    if (corresponde) {
      // Marcar como encontrado
      await fetch(`${API_URL}/pk01_pedido_lpns?id=eq.${lpnEncontrado!.id}`, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ encontrado: true, capturado_en: new Date().toISOString() }),
      });

      setMensaje(`✅ LPN ${lpnEscaneado} → CORRESPONDE al pedido ${pedidoActivo.numero_pedido}`);
      setTipoMensaje('success');

      // Actualizar lista local
      setLpnsPedido(prev => prev.map(l => 
        l.id === lpnEncontrado!.id ? { ...l, encontrado: true } : l
      ));

      // Quitar de lpnsDelPallet
      setLpnsDelPallet(prev => prev.filter(l => l.id !== lpnEncontrado!.id));
    } else {
      setMensaje(`❌ LPN ${lpnEscaneado} → NO CORRESPONDE al pedido ${pedidoActivo.numero_pedido}`);
      setTipoMensaje('error');
    }

    // Agregar al log
    setCapturasLog(prev => [{ ...captura, id: captura.id || Date.now().toString() }, ...prev]);

    setLpnEscaneado('');
    setTimeout(() => lpnInputRef.current?.focus(), 100);

    // Recargar conteo
    cargarPedidos();
  };

  const handleFinalizar = async () => {
    if (!pedidoActivo) return;
    if (!confirm('¿Finalizar este pedido? Se generará un informe Excel.')) return;

    await fetch(`${API_URL}/pk01_pedidos?id=eq.${pedidoActivo.id}`, {
      method: 'PATCH',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'Finalizado', finalizado_en: new Date().toISOString() }),
    });

    // Generar Excel
    exportarExcel();

    setPedidoActivo(null);
    cargarPedidos();
  };

  const exportarExcel = () => {
    if (!pedidoActivo) return;

    const filas = lpnsPedido.map(lpn => ({
      'COD TDA': pedidoActivo.cod_tda,
      'TDA': pedidoActivo.nombre_tda,
      'PALLET': lpn.pallet,
      'CODIGO LPN': lpn.codigo_lpn,
      'ENCONTRADO': lpn.encontrado ? 'SI' : 'NO',
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedido');
    XLSX.writeFile(wb, `${pedidoActivo.numero_pedido}_${pedidoActivo.cod_tda}.xlsx`);
  };

  const handleKeyDownPallet = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEscanearPallet();
    }
  };

  const handleKeyDownLPN = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEscanearLPN();
    }
  };

  const getMensajeStyle = () => {
    switch (tipoMensaje) {
      case 'success': return { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' };
      case 'error': return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
      case 'warning': return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
      case 'info': return { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Pendiente': return { color: '#b45309', bg: '#fef3c7' };
      case 'En Proceso': return { color: '#1d4ed8', bg: '#dbeafe' };
      case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' };
      default: return { color: '#64748b', bg: '#f1f5f9' };
    }
  };

  return (
    <div className="pk01-view">
      <div className="pk01-header">
        <h2>Picking LPN - Captura</h2>
        {pedidoActivo && (
          <button className="pk01-btn-nueva" onClick={handleFinalizar} style={{ background: '#15803d' }}>
            ✅ Finalizar Pedido
          </button>
        )}
      </div>

      {!pedidoActivo ? (
        <>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Selecciona un pedido para comenzar la captura de LPNs.</p>
          <div className="ed03-tabla-container">
            <table className="ed03-tabla">
              <thead>
                <tr>
                  <th>N° Pedido</th>
                  <th>Tienda</th>
                  <th>Total LPNs</th>
                  <th>Encontrados</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th style={{ width: '100px' }}></th>
                </tr>
              </thead>
              <tbody>
                {cargando ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr> :
                  pedidos.filter(p => p.estado !== 'Finalizado').length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Sin pedidos pendientes</td></tr> :
                  pedidos.filter(p => p.estado !== 'Finalizado').map(p => {
                    const eb = getEstadoBadge(p.estado);
                    return (
                      <tr key={p.id} onClick={() => seleccionarPedido(p)} style={{ cursor: 'pointer' }}>
                        <td className="ed03-ticket-id">{p.numero_pedido}</td>
                        <td>{p.cod_tda} - {p.nombre_tda}</td>
                        <td style={{ textAlign: 'center' }}>{p.total_lpns}</td>
                        <td style={{ textAlign: 'center', color: '#15803d', fontWeight: 600 }}>{p.encontrados || 0}</td>
                        <td><span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: eb.bg, color: eb.color }}>{p.estado}</span></td>
                        <td>{new Date(p.creado_en).toLocaleDateString('es-CL')}</td>
                        <td><button className="pk01-btn-detalle" onClick={(e) => { e.stopPropagation(); seleccionarPedido(p); }}>Iniciar</button></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Info del pedido activo */}
          <div style={{ background: '#f8fafd', border: '1px solid #eef0f5', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px' }}>
              <div><strong>Pedido:</strong> <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{pedidoActivo.numero_pedido}</span></div>
              <div><strong>Tienda:</strong> {pedidoActivo.cod_tda} - {pedidoActivo.nombre_tda}</div>
              <div><strong>LPNs:</strong> {lpnsPedido.filter(l => l.encontrado).length} de {lpnsPedido.length} encontrados</div>
            </div>
            <button className="pk01-btn-detalle" onClick={() => { setPedidoActivo(null); cargarPedidos(); }} style={{ marginTop: '10px', background: '#64748b' }}>
              ← Volver a pedidos
            </button>
          </div>

          {/* Escanear Pallet */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              📦 Escanear Pallet
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                ref={palletInputRef}
                type="text"
                value={palletEscaneado}
                onChange={e => { setPalletEscaneado(e.target.value); setPalletValido(null); }}
                onKeyDown={handleKeyDownPallet}
                placeholder="Escanee el código del pallet..."
                style={{
                  flex: 1, padding: '14px', fontSize: '18px', border: `2px solid ${palletValido === true ? '#15803d' : palletValido === false ? '#dc2626' : '#e2e8f0'}`,
                  borderRadius: '8px', transition: 'border-color 0.2s',
                }}
                autoFocus
              />
              <button className="pk01-btn-nueva" onClick={handleEscanearPallet} style={{ padding: '14px 24px', fontSize: '16px' }}>
                Verificar
              </button>
            </div>
          </div>

          {/* Mensaje */}
          {mensaje && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, marginBottom: '16px', ...getMensajeStyle() }}>
              {mensaje}
            </div>
          )}

          {/* LPNs del pallet */}
          {lpnsDelPallet.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#15803d', marginBottom: '8px' }}>
                📋 LPNs pendientes en este pallet ({lpnsDelPallet.length})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {lpnsDelPallet.map(lpn => (
                  <span key={lpn.id} style={{
                    padding: '4px 10px', background: 'white', border: '1px solid #bbf7d0',
                    borderRadius: '6px', fontSize: '12px', fontFamily: 'Courier New, monospace',
                    color: '#15803d', fontWeight: 600,
                  }}>
                    {lpn.codigo_lpn}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Escanear LPN */}
          {palletValido && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                📱 Escanear LPN
              </label>
              <input
                ref={lpnInputRef}
                type="text"
                value={lpnEscaneado}
                onChange={e => setLpnEscaneado(e.target.value)}
                onKeyDown={handleKeyDownLPN}
                placeholder="Escanee el código LPN de la caja..."
                style={{
                  width: '100%', padding: '14px', fontSize: '18px', border: '2px solid #e2e8f0',
                  borderRadius: '8px', transition: 'border-color 0.2s',
                }}
              />
            </div>
          )}

          {/* Log de capturas */}
          <div className="ed03-tabla-container" style={{ maxHeight: '300px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
              📝 Últimas capturas
            </h4>
            <table className="ed03-tabla">
              <thead>
                <tr>
                  <th>Pallet</th>
                  <th>LPN</th>
                  <th style={{ width: '120px' }}>¿Corresponde?</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {capturasLog.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Sin capturas aún</td></tr>
                ) : (
                  capturasLog.map(c => (
                    <tr key={c.id} style={{ background: c.corresponde ? '#dcfce7' : '#fef2f2' }}>
                      <td>{c.pallet_escaneado}</td>
                      <td className="ed03-ticket-id">{c.lpn_escaneado}</td>
                      <td style={{ textAlign: 'center' }}>
                        {c.corresponde ? (
                          <span style={{ color: '#15803d', fontWeight: 600 }}>✅ SI</span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>❌ NO</span>
                        )}
                      </td>
                      <td>{new Date(c.capturado_en).toLocaleTimeString('es-CL')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default PK02View;