// src/components/Transactions/SD/SD06PedidosEspeciales.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '../../../lib/auth';
import './SD06.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface PedidoEspecial {
  id: string;
  tipo_pedido: string;
  numero_tarea: string;
  codigo_local: string;
  nombre_local: string;
  fecha_pedido: string;
  estado: string;
  etiqueta_generada: boolean;
  creado_en: string;
}

const formatDate = (fecha: string) => {
  if (!fecha) return '-';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTime = (fecha: string) => {
  if (!fecha) return '-';
  const d = new Date(fecha);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
};

const SD06PedidosEspeciales: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoEspecial[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });
  const [indiceCarrusel, setIndiceCarrusel] = useState(0);
  const [vistaCompleta, setVistaCompleta] = useState(false);

  const usuario = auth.getUsuario();

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  // Cargar pedidos (con polling cada 10 segundos para actualización automática)
  const cargarPedidos = useCallback(async () => {
    try {
      let query = `${API_URL}/pedidos_especiales?select=*&order=creado_en.desc`;

      if (filtroEstado !== 'Todos') {
        query += `&estado=eq.${encodeURIComponent(filtroEstado)}`;
      }
      if (filtroFecha) {
        query += `&fecha_pedido=eq.${filtroFecha}`;
      }

      const resp = await fetch(query, { headers: HEADERS });
      const data = await resp.json();
      if (Array.isArray(data)) {
        setPedidos(data);
      }
    } catch (e) {
      console.error('Error cargando pedidos:', e);
    }
  }, [filtroEstado, filtroFecha]);

  useEffect(() => {
    cargarPedidos();
    const interval = setInterval(cargarPedidos, 10000); // Actualiza cada 10 segundos
    return () => clearInterval(interval);
  }, [cargarPedidos]);

  // Carrusel automático cada 5 segundos (para que se mueva rápido)
  useEffect(() => {
    if (pedidos.length === 0) return;
    const interval = setInterval(() => {
      setIndiceCarrusel((prev) => (prev + 1) % Math.ceil(pedidos.length / 4));
    }, 5000);
    return () => clearInterval(interval);
  }, [pedidos.length]);

  // Actualizar estado a "Listo para cargar"
  const marcarListo = async (id: string) => {
    try {
      await fetch(`${API_URL}/pedidos_especiales?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'Listo para cargar',
          etiqueta_generada: true,
          actualizado_en: new Date().toISOString()
        })
      });
      mostrarMensaje('success', 'Pedido marcado como listo para cargar');
      cargarPedidos();
    } catch (e) {
      mostrarMensaje('error', 'Error al actualizar el pedido');
    }
  };

  // Revertir a pendiente
  const marcarPendiente = async (id: string) => {
    try {
      await fetch(`${API_URL}/pedidos_especiales?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'Pendiente',
          etiqueta_generada: false,
          actualizado_en: new Date().toISOString()
        })
      });
      mostrarMensaje('info', 'Pedido marcado como pendiente');
      cargarPedidos();
    } catch (e) {
      mostrarMensaje('error', 'Error al actualizar el pedido');
    }
  };

  const pedidosPendientes = pedidos.filter(p => p.estado === 'Pendiente');

  const renderCarrusel = () => {
    if (pedidosPendientes.length === 0) return null;
    const totalPorPagina = 4;
    const totalPaginas = Math.ceil(pedidosPendientes.length / totalPorPagina);
    const paginaActual = Math.min(indiceCarrusel % totalPaginas, totalPaginas - 1);
    const inicio = paginaActual * totalPorPagina;
    const tarjetas = pedidosPendientes.slice(inicio, inicio + totalPorPagina);

    return (
      <div className="sd06-carrusel">
        <h3>🚨 Pedidos Especiales Pendientes ({pedidosPendientes.length})</h3>
        <div className="sd06-carrusel-tarjetas">
          {tarjetas.map((p) => (
            <div key={p.id} className="sd06-carrusel-tarjeta">
              <strong>{p.numero_tarea}</strong>
              <span>{p.tipo_pedido}</span>
              <span>{p.codigo_local} - {p.nombre_local}</span>
              <span>Fecha: {formatDate(p.fecha_pedido)}</span>
              <span style={{ color: '#d97706', fontWeight: 'bold' }}>Pendiente</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getEstadoBadge = (estado: string) => {
    if (estado === 'Pendiente') {
      return <span className="sd06-estado-badge sd06-estado-pendiente">Pendiente</span>;
    }
    return <span className="sd06-estado-badge sd06-estado-listo">Listo para cargar</span>;
  };

  const exportarExcel = () => {
    if (pedidos.length === 0) {
      mostrarMensaje('warning', 'No hay datos para exportar');
      return;
    }
    const headers = ['N° Tarea', 'Tipo', 'Local', 'Fecha', 'Estado', 'Etiqueta', 'Creado En'];
    const rows = pedidos.map(p => [
      p.numero_tarea,
      p.tipo_pedido,
      `${p.codigo_local} - ${p.nombre_local}`,
      formatDate(p.fecha_pedido),
      p.estado,
      p.etiqueta_generada ? 'Sí' : 'No',
      formatDate(p.creado_en) + ' ' + formatTime(p.creado_en)
    ]);
    // Usar XLSX (ya está en el proyecto)
    const XLSX = require('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos Especiales');
    XLSX.writeFile(wb, `Pedidos_Especiales_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className={`sd06-container ${vistaCompleta ? 'sd06-vista-completa' : ''}`}>
      {mensaje.visible && (
        <div className={`sd06-toast sd06-toast-${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      {!vistaCompleta && (
        <div className="sd06-header">
          <h2>SD06 – Pedidos Especiales</h2>
          <p className="sd06-subtitle">Seguimiento de pedidos especiales generados en ED01</p>
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="sd06-toolbar">
        <div className="sd06-filter-group">
          <label className="sd06-filter-label">Estado:</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="sd06-select">
            <option value="Todos">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Listo para cargar">Listo para cargar</option>
          </select>
        </div>

        <div className="sd06-filter-group">
          <label className="sd06-filter-label">Fecha:</label>
          <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} className="sd06-date-input" />
        </div>

        <button className="sd06-btn sd06-btn-primary" onClick={cargarPedidos}>Actualizar</button>
        <button className="sd06-btn" onClick={() => { setFiltroEstado('Todos'); setFiltroFecha(''); }}>Limpiar</button>

        <div className="sd06-separator"></div>

        <button className="sd06-btn sd06-btn-success" onClick={exportarExcel}>Exportar Excel</button>
        <button className="sd06-btn" onClick={() => setVistaCompleta(!vistaCompleta)}>
          {vistaCompleta ? 'Salir de Vista Completa' : 'Vista Completa'}
        </button>
      </div>

      {renderCarrusel()}

      {/* Tabla de pedidos */}
      <div className="sd06-table-wrapper">
        <table className="sd06-table">
          <thead>
            <tr>
              <th>N° Tarea</th>
              <th>Tipo</th>
              <th>Local</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Etiqueta</th>
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr><td colSpan={8} className="sd06-empty">No hay pedidos registrados</td></tr>
            ) : (
              pedidos.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.numero_tarea}</strong></td>
                  <td>{p.tipo_pedido}</td>
                  <td>{p.codigo_local} - {p.nombre_local}</td>
                  <td>{formatDate(p.fecha_pedido)}</td>
                  <td>{getEstadoBadge(p.estado)}</td>
                  <td>{p.etiqueta_generada ? '✅ Sí' : '❌ No'}</td>
                  <td>{formatDate(p.creado_en)} {formatTime(p.creado_en)}</td>
                  <td>
                    {p.estado === 'Pendiente' ? (
                      <button className="sd06-btn sd06-btn-success" onClick={() => marcarListo(p.id)}>Marcar Listo</button>
                    ) : (
                      <button className="sd06-btn sd06-btn-warning" onClick={() => marcarPendiente(p.id)}>Reabrir</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SD06PedidosEspeciales;
