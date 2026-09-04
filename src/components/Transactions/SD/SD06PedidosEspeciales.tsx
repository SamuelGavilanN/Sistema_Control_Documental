// src/components/Transactions/SD/SD06PedidosEspeciales.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';
import './SD06.css';

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

type OrdenColumna = 'numero_tarea' | 'tipo_pedido' | 'codigo_local' | 'nombre_local' | 'fecha_pedido' | 'estado' | 'etiqueta_generada' | 'creado_en';
type OrdenDireccion = 'asc' | 'desc';

const SD06PedidosEspeciales: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoEspecial[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });
  const [indiceCarrusel, setIndiceCarrusel] = useState(0);
  const [vistaCompleta, setVistaCompleta] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ordenColumna, setOrdenColumna] = useState<OrdenColumna>('creado_en');
  const [ordenDireccion, setOrdenDireccion] = useState<OrdenDireccion>('desc');

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  const cargarPedidos = useCallback(async () => {
    try {
      setCargando(true);
      let query = supabase
        .from('pedidos_especiales')
        .select('*')
        .order('creado_en', { ascending: false });

      if (filtroEstado !== 'Todos') query = query.eq('estado', filtroEstado);
      if (filtroFecha) query = query.eq('fecha_pedido', filtroFecha);

      const { data, error } = await query;
      if (error) throw error;
      setPedidos(data || []);
    } catch (e) {
      mostrarMensaje('error', 'Error al cargar pedidos');
    } finally {
      setCargando(false);
    }
  }, [filtroEstado, filtroFecha]);

  useEffect(() => {
    cargarPedidos();
    const channel = supabase
      .channel('sd06-pedidos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_especiales' }, () => cargarPedidos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cargarPedidos]);

  // Carrusel automático cada 5 segundos (solo listos para cargar)
  useEffect(() => {
    const listos = pedidos.filter(p => p.estado === 'Listo para cargar');
    if (listos.length === 0) return;
    const interval = setInterval(() => {
      setIndiceCarrusel((prev) => (prev + 1) % Math.ceil(listos.length / 4));
    }, 5000);
    return () => clearInterval(interval);
  }, [pedidos]);

  // Ordenamiento de la tabla
  const pedidosOrdenados = useMemo(() => {
    const copia = [...pedidos];
    copia.sort((a, b) => {
      let valA: any = a[ordenColumna];
      let valB: any = b[ordenColumna];
      if (typeof valA === 'boolean') {
        valA = valA ? 1 : 0;
        valB = valB ? 1 : 0;
      }
      if (valA < valB) return ordenDireccion === 'asc' ? -1 : 1;
      if (valA > valB) return ordenDireccion === 'asc' ? 1 : -1;
      return 0;
    });
    return copia;
  }, [pedidos, ordenColumna, ordenDireccion]);

  const cambiarOrden = (columna: OrdenColumna) => {
    if (ordenColumna === columna) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenColumna(columna);
      setOrdenDireccion('asc');
    }
  };

  const marcarListo = async (id: string) => {
    await supabase.from('pedidos_especiales').update({ estado: 'Listo para cargar', etiqueta_generada: true }).eq('id', id);
  };

  const marcarPendiente = async (id: string) => {
    await supabase.from('pedidos_especiales').update({ estado: 'Pendiente', etiqueta_generada: false }).eq('id', id);
  };

  // ====== IMPORTAR PEDIDOS DESDE EXCEL ======
  const procesarExcel = async () => {
    if (!archivo) {
      mostrarMensaje('warning', 'Selecciona un archivo Excel');
      return;
    }
    try {
      const data = await archivo.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const headerRow = rows.find((r: any[]) => r && r.some((c: any) => c && c.toString().toLowerCase().includes('tarea')));
      const headerIndex = rows.indexOf(headerRow as any[]);
      if (headerIndex === -1 || !headerRow) {
        mostrarMensaje('error', 'No se encontró la columna "Número Tarea"');
        return;
      }

      const headers = (headerRow as any[]).map((h: any) => h.toString().toLowerCase());
      const idxTipo = headers.findIndex((h: string) => h.includes('tipo'));
      const idxTarea = headers.findIndex((h: string) => h.includes('tarea'));
      const idxCodigo = headers.findIndex((h: string) => h.includes('código') || h.includes('codigo'));
      const idxNombre = headers.findIndex((h: string) => h.includes('nombre') || h.includes('tienda'));
      const idxFecha = headers.findIndex((h: string) => h.includes('fecha'));

      if (idxTarea === -1) {
        mostrarMensaje('error', 'Columna "Número Tarea" no encontrada');
        return;
      }

      const pedidos = rows.slice(headerIndex + 1)
        .filter((r: any[]) => r && r[idxTarea])
        .map((r: any[]) => ({
          tipo_pedido: idxTipo >= 0 ? r[idxTipo]?.toString() || 'Pedido Especial' : 'Pedido Especial',
          numero_tarea: r[idxTarea].toString().trim(),
          codigo_local: idxCodigo >= 0 ? r[idxCodigo]?.toString() || null : null,
          nombre_local: idxNombre >= 0 ? r[idxNombre]?.toString() || null : null,
          fecha_pedido: idxFecha >= 0 ? r[idxFecha]?.toString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          estado: 'Pendiente',
          etiqueta_generada: false
        }));

      if (pedidos.length === 0) {
        mostrarMensaje('warning', 'No hay datos para importar');
        return;
      }

      const BATCH = 100;
      for (let i = 0; i < pedidos.length; i += BATCH) {
        const batch = pedidos.slice(i, i + BATCH);
        const { error } = await supabase.from('pedidos_especiales').insert(batch);
        if (error) throw error;
      }

      mostrarMensaje('success', `${pedidos.length} pedidos importados correctamente`);
      setShowImportModal(false);
      setArchivo(null);
      cargarPedidos();
    } catch (e) {
      console.error('Error importando Excel:', e);
      mostrarMensaje('error', 'Error al procesar el archivo');
    }
  };

  // Carrusel: solo listos para cargar
  const renderCarrusel = () => {
    const listos = pedidos.filter(p => p.estado === 'Listo para cargar');
    if (listos.length === 0) return null;
    const totalPorPagina = 4;
    const totalPaginas = Math.ceil(listos.length / totalPorPagina);
    const paginaActual = Math.min(indiceCarrusel % totalPaginas, totalPaginas - 1);
    const inicio = paginaActual * totalPorPagina;
    const tarjetas = listos.slice(inicio, inicio + totalPorPagina);

    return (
      <div className="sd06-carrusel">
        <h3>✅ Pedidos Especiales Listos para Cargar ({listos.length})</h3>
        <div className="sd06-carrusel-tarjetas">
          {tarjetas.map((p) => (
            <div key={p.id} className="sd06-carrusel-tarjeta">
              <strong>{p.numero_tarea}</strong>
              <span>{p.tipo_pedido}</span>
              <span>{p.codigo_local} - {p.nombre_local}</span>
              <span>Fecha: {p.fecha_pedido}</span>
              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Listo para cargar</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`sd06-container ${vistaCompleta ? 'sd06-vista-completa' : ''}`}>
      {mensaje.visible && <div className={`sd06-toast sd06-toast-${mensaje.tipo}`}>{mensaje.texto}</div>}

      <div className="sd06-toolbar">
        <div className="sd06-filter-group">
          <label>Estado:</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="sd06-select">
            <option value="Todos">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Listo para cargar">Listo para cargar</option>
          </select>
        </div>
        <div className="sd06-filter-group">
          <label>Fecha:</label>
          <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} className="sd06-date-input" />
        </div>
        <button className="sd06-btn sd06-btn-primary" onClick={cargarPedidos}>Actualizar</button>
        <button className="sd06-btn" onClick={() => { setFiltroEstado('Todos'); setFiltroFecha(''); }}>Limpiar</button>
        <button className="sd06-btn sd06-btn-success" onClick={() => setShowImportModal(true)}>📤 Importar Pedidos</button>
        <button className="sd06-btn" onClick={() => setVistaCompleta(!vistaCompleta)}>{vistaCompleta ? 'Salir' : 'Vista Completa'}</button>
      </div>

      {renderCarrusel()}

      <div className="sd06-table-wrapper">
        <table className="sd06-table">
          <thead>
            <tr>
              <th onClick={() => cambiarOrden('numero_tarea')}>
                N° Tarea {ordenColumna === 'numero_tarea' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => cambiarOrden('tipo_pedido')}>
                Tipo {ordenColumna === 'tipo_pedido' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => cambiarOrden('codigo_local')}>
                Local {ordenColumna === 'codigo_local' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => cambiarOrden('fecha_pedido')}>
                Fecha {ordenColumna === 'fecha_pedido' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => cambiarOrden('estado')}>
                Estado {ordenColumna === 'estado' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => cambiarOrden('etiqueta_generada')}>
                Etiqueta {ordenColumna === 'etiqueta_generada' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr><td colSpan={7} className="sd06-empty">No hay pedidos registrados</td></tr>
            ) : (
              pedidosOrdenados.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.numero_tarea}</strong></td>
                  <td>{p.tipo_pedido}</td>
                  <td>{p.codigo_local} - {p.nombre_local}</td>
                  <td>{p.fecha_pedido}</td>
                  <td>{p.estado}</td>
                  <td>{p.etiqueta_generada ? '✅' : '❌'}</td>
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

      {/* Modal Importar Excel */}
      {showImportModal && (
        <div className="sd06-modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="sd06-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd06-modal-header">
              <h2>Importar Pedidos Especiales</h2>
              <button className="sd06-modal-close" onClick={() => setShowImportModal(false)}>×</button>
            </div>
            <div className="sd06-modal-body">
              <p>Selecciona un archivo Excel con las columnas: <strong>Tipo Pedido, Número Tarea, Código Local, Nombre Local, Fecha Pedido</strong>.</p>
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
              <div className="sd06-modal-actions">
                <button className="sd06-btn" onClick={() => setShowImportModal(false)}>Cancelar</button>
                <button className="sd06-btn sd06-btn-primary" onClick={procesarExcel} disabled={!archivo}>Importar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD06PedidosEspeciales;
