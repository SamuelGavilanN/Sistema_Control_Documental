// src/components/Transactions/LP/LP02View.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import * as XLSX from 'xlsx';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface CapturaLog {
  id: string;
  pallet_escaneado: string;
  lpn_escaneado: string;
  corresponde: boolean;
  capturado_en: string;
}

const LP02View: React.FC = () => {
  const usuario = auth.getUsuario();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pedidoActivo, setPedidoActivo] = useState<any>(null);
  const [lpnsPedido, setLpnsPedido] = useState<any[]>([]);
  const [capturasLog, setCapturasLog] = useState<CapturaLog[]>([]);

  const [palletInput, setPalletInput] = useState('');
  const [lpnInput, setLpnInput] = useState('');

  const [palletVerificado, setPalletVerificado] = useState(false);
  const [palletActual, setPalletActual] = useState('');
  const [lpnsPendientesPallet, setLpnsPendientesPallet] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const palletInputRef = useRef<HTMLInputElement>(null);
  const lpnInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cargarPedidos(); }, []);
  useEffect(() => { const intervalo = setInterval(cargarPedidos, 10000); return () => clearInterval(intervalo); }, []);

  const cargarPedidos = async () => {
    setCargando(true);
    try {
      const resp = await fetch(API_URL + '/pk01_pedidos?select=*&order=creado_en.desc', { headers: HEADERS });
      const data = await resp.json();
      const pedidosConConteo: any[] = [];
      if (data && data.length) {
        for (let i = 0; i < data.length; i++) {
          const p = data[i];
          const respLPN = await fetch(API_URL + '/pk01_pedido_lpns?select=id,encontrado&pedido_id=eq.' + p.id, { headers: HEADERS });
          const lpns = await respLPN.json();
          pedidosConConteo.push({
            ...p,
            total_lpns: lpns ? lpns.length : 0,
            encontrados: lpns ? lpns.filter((l: any) => l.encontrado).length : 0,
          });
        }
      }
      setPedidos(pedidosConConteo);
    } catch (e) {}
    setCargando(false);
  };

  const refrescarPedidoActivo = async () => {
    if (!pedidoActivo) return;
    const resp = await fetch(API_URL + '/pk01_pedido_lpns?select=*&pedido_id=eq.' + pedidoActivo.id + '&order=pallet,codigo_lpn', { headers: HEADERS });
    const lpnsActualizados = await resp.json() || [];
    setLpnsPedido(lpnsActualizados);

    if (palletVerificado && palletActual) {
      const pendientes = lpnsActualizados.filter(
        (l: any) => l.pallet.toUpperCase() === palletActual.toUpperCase() && !l.encontrado
      );
      setLpnsPendientesPallet(pendientes);

      if (pendientes.length === 0) {
        setPalletVerificado(false);
        setPalletActual('');
        setPalletInput('');
        setMensaje('🎉 ¡Pallet ' + palletActual + ' completado! Escanea el siguiente pallet.');
        setTipoMensaje('success');
        setTimeout(() => palletInputRef.current?.focus(), 300);
      }
    }
  };

  const seleccionarPedido = async (pedido: any) => {
    setPedidoActivo(pedido);
    setPalletInput('');
    setLpnInput('');
    setPalletVerificado(false);
    setPalletActual('');
    setLpnsPendientesPallet([]);
    setMensaje('');
    setCapturasLog([]);

    const resp = await fetch(API_URL + '/pk01_pedido_lpns?select=*&pedido_id=eq.' + pedido.id + '&order=pallet,codigo_lpn', { headers: HEADERS });
    setLpnsPedido(await resp.json() || []);

    if (pedido.estado === 'Pendiente') {
      await fetch(API_URL + '/pk01_pedidos?id=eq.' + pedido.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'En Proceso' }),
      });
    }

    setTimeout(() => palletInputRef.current?.focus(), 300);
  };

  const handleVerificarPallet = () => {
    if (!palletInput.trim() || !pedidoActivo) return;

    const palletBuscado = palletInput.trim().toUpperCase();
    const pendientes = lpnsPedido.filter(
      l => l.pallet.toUpperCase() === palletBuscado && !l.encontrado
    );

    if (pendientes.length > 0) {
      setPalletVerificado(true);
      setPalletActual(palletBuscado);
      setLpnsPendientesPallet(pendientes);
      setMensaje('✅ Pallet ' + palletBuscado + ' verificado. ' + pendientes.length + ' LPN(s) pendiente(s).');
      setTipoMensaje('success');
      setTimeout(() => lpnInputRef.current?.focus(), 200);
    } else {
      const yaEncontrados = lpnsPedido.filter(
        l => l.pallet.toUpperCase() === palletBuscado && l.encontrado
      );
      if (yaEncontrados.length > 0) {
        setMensaje('⚠️ El pallet ' + palletBuscado + ' ya fue procesado completamente.');
        setTipoMensaje('warning');
      } else {
        setMensaje('❌ El pallet ' + palletBuscado + ' no tiene LPNs pendientes de este pedido.');
        setTipoMensaje('error');
      }
      setPalletVerificado(false);
      setLpnsPendientesPallet([]);
    }
  };

  const handleBuscarLPN = async () => {
    if (!lpnInput.trim() || !pedidoActivo || !palletVerificado) return;

    const user = auth.getUsuario();
    const lpnBuscado = lpnInput.trim().toUpperCase();
    const lpnEncontrado = lpnsPedido.find(
      l => l.codigo_lpn.toUpperCase() === lpnBuscado
    );
    const corresponde = !!lpnEncontrado && !lpnEncontrado.encontrado;

    // Guardar captura
    const resp = await fetch(API_URL + '/pk02_capturas', {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pedido_id: pedidoActivo.id,
        pallet_escaneado: palletActual,
        lpn_escaneado: lpnBuscado,
        corresponde: corresponde,
        capturado_por: user?.id,
      }),
    });
    const captura = await resp.json();

    // Limpiar input inmediatamente
    setLpnInput('');
    if (lpnInputRef.current) {
      lpnInputRef.current.value = '';
    }

    if (corresponde) {
      await fetch(API_URL + '/pk01_pedido_lpns?id=eq.' + lpnEncontrado!.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ encontrado: true, capturado_en: new Date().toISOString() }),
      });
      setMensaje('✅ LPN ' + lpnBuscado + ' → CORRESPONDE');
      setTipoMensaje('success');
    } else if (lpnEncontrado && lpnEncontrado.encontrado) {
      setMensaje('⚠️ LPN ' + lpnBuscado + ' → YA FUE CAPTURADO');
      setTipoMensaje('warning');
    } else {
      setMensaje('❌ LPN ' + lpnBuscado + ' → NO CORRESPONDE');
      setTipoMensaje('error');
    }

    // Actualizar log
    const nuevaCaptura = { ...captura, id: captura.id || Date.now().toString() };
    setCapturasLog(prev => [nuevaCaptura, ...prev]);

    // Refrescar datos
    await refrescarPedidoActivo();
    cargarPedidos();

    // Enfocar input LPN
    setTimeout(() => {
      if (lpnInputRef.current) {
        lpnInputRef.current.focus();
      }
    }, 150);
  };

  const handleFinalizar = async () => {
    if (!pedidoActivo) return;
    if (!confirm('¿Finalizar este pedido? Se generará un informe Excel.')) return;

    await fetch(API_URL + '/pk01_pedidos?id=eq.' + pedidoActivo.id, {
      method: 'PATCH',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'Finalizado', finalizado_en: new Date().toISOString() }),
    });

    exportarExcel();
    setPedidoActivo(null);
    cargarPedidos();
  };

  const exportarExcel = () => {
    if (!pedidoActivo) return;
    const filas = lpnsPedido.map((lpn: any) => ({
      'COD TDA': pedidoActivo.cod_tda,
      'TDA': pedidoActivo.nombre_tda,
      'PALLET': lpn.pallet,
      'CODIGO LPN': lpn.codigo_lpn,
      'ENCONTRADO': lpn.encontrado ? 'SI' : 'NO',
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedido');
    XLSX.writeFile(wb, pedidoActivo.numero_pedido + '_' + pedidoActivo.cod_tda + '.xlsx');
  };

  const handleKeyDownPallet = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleVerificarPallet(); }
  };

  const handleKeyDownLPN = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleBuscarLPN(); }
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

  const encontrados = lpnsPedido.filter((l: any) => l.encontrado).length;
  const total = lpnsPedido.length;

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b' }}>Capturar LPN - LP02</h2>
        {pedidoActivo && (
          <button onClick={handleFinalizar} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#15803d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
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
                <tr><th>Pedido</th><th>Tienda</th><th>Total LPNs</th><th>Encontrados</th><th>Estado</th><th>Fecha</th><th style={{ width: '100px' }}></th></tr>
              </thead>
              <tbody>
                {cargando ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr> :
                  pedidos.filter((p: any) => p.estado !== 'Finalizado' && (!p.usuario_asignado || p.usuario_asignado === usuario?.id)).length === 0 ?
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Sin pedidos disponibles</td></tr> :
                  pedidos.filter((p: any) => p.estado !== 'Finalizado' && (!p.usuario_asignado || p.usuario_asignado === usuario?.id)).map((p: any) => {
                    const eb = getEstadoBadge(p.estado);
                    return (
                      <tr key={p.id} onClick={() => seleccionarPedido(p)} style={{ cursor: 'pointer' }}>
                        <td className="ed03-ticket-id">{p.numero_pedido}</td>
                        <td>{p.cod_tda} - {p.nombre_tda}</td>
                        <td style={{ textAlign: 'center' }}>{p.total_lpns}</td>
                        <td style={{ textAlign: 'center', color: '#15803d', fontWeight: 600 }}>{p.encontrados || 0}</td>
                        <td><span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: eb.bg, color: eb.color }}>{p.estado}</span></td>
                        <td>{new Date(p.creado_en).toLocaleDateString('es-CL')}</td>
                        <td><button onClick={(e) => { e.stopPropagation(); seleccionarPedido(p); }} style={{ padding: '5px 12px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Iniciar</button></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div style={{ background: '#f8fafd', border: '1px solid #eef0f5', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px', marginBottom: '10px' }}>
              <div><strong>Pedido:</strong> <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{pedidoActivo.numero_pedido}</span></div>
              <div><strong>Tienda:</strong> {pedidoActivo.cod_tda} - {pedidoActivo.nombre_tda}</div>
              <div><strong>Progreso:</strong> {encontrados} de {total} LPNs</div>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: total > 0 ? (encontrados / total) * 100 + '%' : '0%', height: '100%', background: encontrados === total ? '#15803d' : '#3b82f6', transition: 'width 0.3s', borderRadius: '4px' }} />
            </div>
            <button onClick={() => { setPedidoActivo(null); cargarPedidos(); }} style={{ marginTop: '10px', padding: '6px 12px', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              ← Volver a pedidos
            </button>
          </div>

          {/* ESCANEAR PALLET */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              📦 Escanear Pallet
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                ref={palletInputRef}
                type="text"
                value={palletInput}
                onChange={e => setPalletInput(e.target.value)}
                onKeyDown={handleKeyDownPallet}
                placeholder="Escanee el código del pallet..."
                disabled={palletVerificado}
                style={{
                  flex: 1, padding: '14px', fontSize: '18px',
                  border: '2px solid ' + (palletVerificado ? '#15803d' : '#e2e8f0'),
                  borderRadius: '8px', background: palletVerificado ? '#f0fdf4' : 'white',
                }}
              />
              <button onClick={handleVerificarPallet} disabled={palletVerificado}
                style={{ padding: '14px 24px', fontSize: '16px', background: palletVerificado ? '#15803d' : '#1a1f2e', color: 'white', border: 'none', borderRadius: '8px', cursor: palletVerificado ? 'default' : 'pointer' }}>
                {palletVerificado ? '✓ Verificado' : 'Verificar'}
              </button>
            </div>
            {palletVerificado && (
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#15803d' }}>
                Pallet <strong>{palletActual}</strong> · {lpnsPendientesPallet.length} LPN(s) pendiente(s)
              </div>
            )}
          </div>

          {/* LPNs PENDIENTES DEL PALLET */}
          {palletVerificado && lpnsPendientesPallet.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#15803d', marginBottom: '8px' }}>
                📋 LPNs pendientes en {palletActual} ({lpnsPendientesPallet.length})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {lpnsPendientesPallet.map(lpn => (
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

          {/* ESCANEAR LPN */}
          {palletVerificado && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                📱 Escanear LPN
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  ref={lpnInputRef}
                  type="text"
                  value={lpnInput}
                  onChange={e => setLpnInput(e.target.value)}
                  onKeyDown={handleKeyDownLPN}
                  placeholder="Escanee el código LPN de la caja..."
                  style={{
                    flex: 1, padding: '14px', fontSize: '18px',
                    border: '2px solid #e2e8f0', borderRadius: '8px',
                  }}
                />
                <button onClick={handleBuscarLPN}
                  style={{ padding: '14px 24px', fontSize: '16px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  Buscar
                </button>
              </div>
            </div>
          )}

          {/* Mensaje */}
          {mensaje && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, marginBottom: '16px', ...getMensajeStyle() }}>
              {mensaje}
            </div>
          )}

          {/* Log de capturas */}
          <div className="ed03-tabla-container" style={{ maxHeight: '300px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
              📝 Capturas de esta sesión ({capturasLog.length})
            </h4>
            <table className="ed03-tabla">
              <thead>
                <tr><th>Pallet</th><th>LPN</th><th style={{ width: '120px' }}>¿Corresponde?</th><th>Hora</th></tr>
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
                        {c.corresponde ? <span style={{ color: '#15803d', fontWeight: 600 }}>✅ SI</span> : <span style={{ color: '#dc2626', fontWeight: 600 }}>❌ NO</span>}
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

export default LP02View;
