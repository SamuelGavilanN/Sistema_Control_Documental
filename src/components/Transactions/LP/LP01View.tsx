// src/components/Transactions/LP/LP01View.tsx

import React, { useState, useEffect } from 'react';
import { auth } from '../../../lib/auth';
import * as XLSX from 'xlsx';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const LP01View: React.FC = () => {
  const [pedidos, setPedidos]: any = useState([]);
  const [cargando, setCargando]: any = useState(true);
  const [showCrearModal, setShowCrearModal]: any = useState(false);
  const [showDetalleModal, setShowDetalleModal]: any = useState(false);
  const [pedidoDetalle, setPedidoDetalle]: any = useState(null);
  const [lpnsDetalle, setLpnsDetalle]: any = useState([]);
  const [archivo, setArchivo]: any = useState(null);
  const [nombreArchivo, setNombreArchivo]: any = useState('');
  const [procesando, setProcesando]: any = useState(false);
  const [mensaje, setMensaje]: any = useState('');

  useEffect(() => { cargarPedidos(); }, []);
  useEffect(() => { const intervalo = setInterval(cargarPedidos, 10000); return () => clearInterval(intervalo); }, []);

  const cargarPedidos = async () => {
    setCargando(true);
    try {
      const resp: any = await fetch(API_URL + '/pk01_pedidos?select=*&order=creado_en.desc', { headers: HEADERS });
      const data: any = await resp.json();
      const resultado: any = [];
      if (data && data.length) {
        for (let i = 0; i < data.length; i++) {
          const p: any = data[i];
          const respLPN: any = await fetch(API_URL + '/pk01_pedido_lpns?select=id,encontrado&pedido_id=eq.' + p.id, { headers: HEADERS });
          const lpns: any = await respLPN.json();
          resultado.push({
            id: p.id,
            numero_pedido: p.numero_pedido,
            cod_tda: p.cod_tda,
            nombre_tda: p.nombre_tda,
            estado: p.estado,
            creado_en: p.creado_en,
            total_lpns: lpns ? lpns.length : 0,
            encontrados: lpns ? lpns.filter((l: any) => l.encontrado).length : 0,
          });
        }
      }
      setPedidos(resultado);
    } catch (e) {}
    setCargando(false);
  };

  const procesarArchivo = async () => {
    if (!archivo) { alert('Selecciona un archivo'); return; }
    setProcesando(true);
    setMensaje('');
    try {
      const data: any = await leerExcel(archivo);
      console.log('Datos leidos del Excel:', data);

      if (!data || !data.length) { setMensaje('El archivo esta vacio'); setProcesando(false); return; }

      const primeraFila: any = data[0];
      console.log('Columnas encontradas:', Object.keys(primeraFila));

      const colCodTda: any = Object.keys(primeraFila).find((k: any) => k.toUpperCase().includes('COD TDA') || k.toUpperCase().includes('COD_TDA')) || '';
      const colTda: any = Object.keys(primeraFila).find((k: any) => k.toUpperCase() === 'TDA' || k.toUpperCase().includes('TIENDA')) || '';
      const colPallet: any = Object.keys(primeraFila).find((k: any) => k.toUpperCase().includes('PALLET')) || '';
      const colLpn: any = Object.keys(primeraFila).find((k: any) => k.toUpperCase().includes('LPN') || k.toUpperCase().includes('CODIGO')) || '';

      console.log('Columna COD TDA:', colCodTda, '| Valor:', primeraFila[colCodTda]);
      console.log('Columna TDA:', colTda, '| Valor:', primeraFila[colTda]);
      console.log('Columna PALLET:', colPallet, '| Valor:', primeraFila[colPallet]);
      console.log('Columna LPN:', colLpn, '| Valor:', primeraFila[colLpn]);

      if (!colCodTda || !colPallet || !colLpn) {
        setMensaje('El archivo debe tener las columnas: COD TDA, TDA, PALLET, CODIGO LPN');
        setProcesando(false);
        return;
      }

      const grupos: any = {};
      data.forEach((row: any) => {
        const codTda: any = String(row[colCodTda] || '').trim();
        const nombreTda: any = String(row[colTda] || '').trim();
        if (!codTda) return;
        if (!grupos[codTda]) { grupos[codTda] = { nombre: nombreTda, items: [] }; }
        grupos[codTda].items.push(row);
      });

      console.log('Grupos formados:', Object.keys(grupos).length);

      const user: any = auth.getUsuario();
      const keys: any = Object.keys(grupos);

      for (let g = 0; g < keys.length; g++) {
        const codTda: any = keys[g];
        const grupo: any = grupos[codTda];
        const now: any = new Date();
        const fecha: any = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0') + now.getFullYear();
        const respCount: any = await fetch(API_URL + '/pk01_pedidos?select=id&order=creado_en.desc&limit=1', { headers: HEADERS });
        const countData: any = await respCount.json();
        const count: any = (countData ? countData.length : 0) + 1;
        const numeroPedido: any = 'LP-' + fecha + '-' + String(count).padStart(4, '0');

        const respPedido: any = await fetch(API_URL + '/pk01_pedidos', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ numero_pedido: numeroPedido, cod_tda: codTda, nombre_tda: grupo.nombre, estado: 'Pendiente', creado_por: user?.id }),
        });
        const pedidoCreado: any = await respPedido.json();
        console.log('Pedido creado:', pedidoCreado.id, numeroPedido);

        for (let j = 0; j < grupo.items.length; j++) {
          const item: any = grupo.items[j];
          const pallet: any = String(item[colPallet] || '').trim();
          const lpn: any = String(item[colLpn] || '').trim();

          console.log('Insertando LPN:', { pedido_id: pedidoCreado.id, pallet, codigo_lpn: lpn });

          const respInsert: any = await fetch(API_URL + '/pk01_pedido_lpns', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ pedido_id: pedidoCreado.id, pallet: pallet, codigo_lpn: lpn, encontrado: false }),
          });
          
          if (!respInsert.ok) {
            const err: any = await respInsert.json();
            console.error('Error insertando LPN:', err);
          }
        }
      }

      setMensaje('Pedido(s) creado(s) correctamente');
      setNombreArchivo('');
      setArchivo(null);
      setTimeout(() => { setMensaje(''); setShowCrearModal(false); }, 2000);
      cargarPedidos();
    } catch (e: any) {
      console.error('Error general:', e);
      setMensaje('Error: ' + e.message);
    } finally {
      setProcesando(false);
    }
  };

  const leerExcel = (file: any): Promise<any[]> => new Promise((resolve, reject) => {
    const reader: any = new FileReader();
    reader.onload = (e: any) => { const data: any = new Uint8Array(e.target?.result); const wb: any = XLSX.read(data, { type: 'array' }); resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const verDetalle = async (pedido: any) => {
    setPedidoDetalle(pedido);
    console.log('Cargando detalle para pedido:', pedido.id);
    const resp: any = await fetch(API_URL + '/pk01_pedido_lpns?select=*&pedido_id=eq.' + pedido.id + '&order=pallet,codigo_lpn', { headers: HEADERS });
    const data: any = await resp.json();
    console.log('LPNs encontrados:', data ? data.length : 0, data);
    setLpnsDetalle(data || []);
    setShowDetalleModal(true);
  };

  const getEstadoBadge = (estado: any) => {
    switch (estado) {
      case 'Pendiente': return { color: '#b45309', bg: '#fef3c7' };
      case 'En Proceso': return { color: '#1d4ed8', bg: '#dbeafe' };
      case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' };
      default: return { color: '#64748b', bg: '#f1f5f9' };
    }
  };

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b' }}>Lectura Pedidos - LP01</h2>
        <button onClick={() => setShowCrearModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
          + Nuevo Pedido
        </button>
      </div>

      <div className="ed03-tabla-container">
        <table className="ed03-tabla">
          <thead>
            <tr><th>Pedido</th><th>Tienda</th><th>Total LPNs</th><th>Encontrados</th><th>Estado</th><th>Fecha</th><th style={{ width: '100px' }}>Acciones</th></tr>
          </thead>
          <tbody>
            {cargando ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr> :
              pedidos.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Sin pedidos</td></tr> :
              pedidos.map((p: any) => {
                const eb: any = getEstadoBadge(p.estado);
                return (
                  <tr key={p.id}>
                    <td className="ed03-ticket-id">{p.numero_pedido}</td>
                    <td>{p.cod_tda} - {p.nombre_tda}</td>
                    <td style={{ textAlign: 'center' }}>{p.total_lpns}</td>
                    <td style={{ textAlign: 'center', color: (p.encontrados || 0) > 0 ? '#15803d' : '#64748b', fontWeight: 600 }}>{p.encontrados || 0}</td>
                    <td><span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: eb.bg, color: eb.color }}>{p.estado}</span></td>
                    <td>{new Date(p.creado_en).toLocaleDateString('es-CL')}</td>
                    <td><button onClick={() => verDetalle(p)} style={{ padding: '5px 12px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Detalle</button></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {showCrearModal && (
        <div className="ed01-modal-overlay" onClick={() => !procesando && setShowCrearModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header"><h2>Nuevo Pedido</h2><button className="ed01-modal-close" onClick={() => setShowCrearModal(false)}>×</button></div>
            <div className="ed01-modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>Archivo Excel (.xlsx)</label>
                <div onClick={() => document.getElementById('file-lp')?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '28px', border: '2px dashed #e2e8f0', borderRadius: '10px', cursor: 'pointer', background: '#fafcff', color: '#94a3b8', fontSize: '13px' }}>
                  <input id="file-lp" type="file" accept=".xlsx,.xls" hidden onChange={(e: any) => { setArchivo(e.target.files?.[0] || null); setNombreArchivo(e.target.files?.[0]?.name || ''); }} />
                  {nombreArchivo ? <span style={{ color: '#1e293b', fontWeight: 500 }}>{nombreArchivo}</span> : <><span>Seleccionar archivo</span></>}
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Columnas: <strong>COD TDA, TDA, PALLET, CODIGO LPN</strong></p>
              {mensaje && <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', fontSize: '13px', background: '#dcfce7', color: '#15803d' }}>{mensaje}</div>}
            </div>
            <div className="ed01-modal-footer"><button className="ed01-btn-cancel" onClick={() => setShowCrearModal(false)}>Cancelar</button><button className="ed01-btn-save" onClick={procesarArchivo} disabled={procesando}>{procesando ? 'Procesando...' : 'Crear Pedido'}</button></div>
          </div>
        </div>
      )}

      {showDetalleModal && pedidoDetalle && (
        <div className="ed01-modal-overlay" onClick={() => setShowDetalleModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header"><h2>{pedidoDetalle.numero_pedido} - {pedidoDetalle.cod_tda} {pedidoDetalle.nombre_tda}</h2><button className="ed01-modal-close" onClick={() => setShowDetalleModal(false)}>×</button></div>
            <div className="ed01-modal-body">
              <div className="ed03-tabla-container" style={{ maxHeight: '400px' }}>
                <table className="ed03-tabla">
                  <thead><tr><th>Pallet</th><th>Codigo LPN</th><th style={{ width: '100px' }}>Encontrado</th></tr></thead>
                  <tbody>
                    {lpnsDetalle.length === 0 ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Sin LPNs</td></tr> :
                      lpnsDetalle.map((lpn: any) => (
                        <tr key={lpn.id} style={{ background: lpn.encontrado ? '#dcfce7' : 'transparent' }}>
                          <td>{lpn.pallet}</td><td className="ed03-ticket-id">{lpn.codigo_lpn}</td>
                          <td style={{ textAlign: 'center' }}>{lpn.encontrado ? <span style={{ color: '#15803d', fontWeight: 600 }}>SI</span> : <span style={{ color: '#dc2626', fontWeight: 600 }}>NO</span>}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="ed01-modal-footer"><button className="ed01-btn-cancel" onClick={() => setShowDetalleModal(false)}>Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LP01View;
