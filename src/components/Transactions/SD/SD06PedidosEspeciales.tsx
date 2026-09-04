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

interface Consolidado {
  codigo_local: string;
  nombre_local: string;
  tipo_pedido: string;
  total: number;
  listas: number;
  pendientes: number;
  faltantes: number;
  completo: boolean;
}

const SD06PedidosEspeciales: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoEspecial[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });
  const [indiceCarrusel, setIndiceCarrusel] = useState(0);
  const [indiceCarruselListos, setIndiceCarruselListos] = useState(0);
  const [vistaCompleta, setVistaCompleta] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ordenColumna, setOrdenColumna] = useState<OrdenColumna>('creado_en');
  const [ordenDireccion, setOrdenDireccion] = useState<OrdenDireccion>('desc');
  const [vistaTabla, setVistaTabla] = useState<'detalle' | 'consolidado'>('detalle');

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  // Cargar todos los pedidos (solo filtro por fecha, NO por estado)
  const cargarPedidos = useCallback(async () => {
    try {
      setCargando(true);
      let query = supabase
        .from('pedidos_especiales')
        .select('*')
        .order('creado_en', { ascending: false });

      if (filtroFecha) query = query.eq('fecha_pedido', filtroFecha);

      const { data, error } = await query;
      if (error) throw error;
      setPedidos(data || []);
    } catch (e) {
      mostrarMensaje('error', 'Error al cargar pedidos');
    } finally {
      setCargando(false);
    }
  }, [filtroFecha]);

  useEffect(() => {
    cargarPedidos();
    const channel = supabase
      .channel('sd06-pedidos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_especiales' }, () => cargarPedidos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cargarPedidos]);

  // Pedidos filtrados para la tabla de detalle (según filtroEstado)
  const pedidosDetalle = useMemo(() => {
    if (filtroEstado === 'Todos') return pedidos;
    return pedidos.filter(p => p.estado === filtroEstado);
  }, [pedidos, filtroEstado]);

  // Carrusel de pendientes (cada 5 segundos)
  useEffect(() => {
    const pendientes = pedidos.filter(p => p.estado === 'Pendiente');
    if (pendientes.length === 0) return;
    const interval = setInterval(() => {
      setIndiceCarrusel((prev) => (prev + 1) % Math.ceil(pendientes.length / 4));
    }, 5000);
    return () => clearInterval(interval);
  }, [pedidos]);

  // Carrusel de listos (cada 5 segundos)
  useEffect(() => {
    const listos = pedidos.filter(p => p.estado === 'Listo para cargar');
    if (listos.length === 0) return;
    const interval = setInterval(() => {
      setIndiceCarruselListos((prev) => (prev + 1) % Math.ceil(listos.length / 4));
    }, 5000);
    return () => clearInterval(interval);
  }, [pedidos]);

  // Ordenamiento de la tabla de detalle
  const pedidosOrdenados = useMemo(() => {
    const copia = [...pedidosDetalle];
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
  }, [pedidosDetalle, ordenColumna, ordenDireccion]);

  // Consolidado: SIEMPRE usa todos los pedidos (ignora filtroEstado)
  const consolidado = useMemo(() => {
    const mapa = new Map<string, Consolidado>();
    pedidos.forEach((p) => {
      const key = `${p.codigo_local}||${p.tipo_pedido}`;
      if (!mapa.has(key)) {
        mapa.set(key, {
          codigo_local: p.codigo_local,
          nombre_local: p.nombre_local,
          tipo_pedido: p.tipo_pedido,
          total: 0,
          listas: 0,
          pendientes: 0,
          faltantes: 0,
          completo: false
        });
      }
      const item = mapa.get(key)!;
      item.total++;
      if (p.estado === 'Listo para cargar') item.listas++;
      else item.pendientes++;
      item.faltantes = item.total - item.listas;
      item.completo = item.pendientes === 0;
    });
    return Array.from(mapa.values()).sort((a, b) => {
      if (a.completo !== b.completo) return a.completo ? 1 : -1;
      return a.codigo_local.localeCompare(b.codigo_local);
    });
  }, [pedidos]);

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

  // Render carrusel de pendientes
  const renderCarruselPendientes = () => {
    const pendientes = pedidos.filter(p => p.estado === 'Pendiente');
    if (pendientes.length === 0) return null;
    const totalPorPagina = 4;
    const totalPaginas = Math.ceil(pendientes.length / totalPorPagina);
    const paginaActual = Math.min(indiceCarrusel % totalPaginas, totalPaginas - 1);
    const inicio = paginaActual * totalPorPagina;
    const tarjetas = pendientes.slice(inicio, inicio + totalPorPagina);

    return (
      <div className="sd06-carrusel">
        <h3>🚨 Pendientes ({pendientes.length})</h3>
        <div className="sd06-carrusel-tarjetas">
          {tarjetas.map((p) => (
            <div key={p.id} className="sd06-carrusel-tarjeta sd06-tarjeta-pendiente">
              <strong>{p.numero_tarea}</strong>
              <span>{p.tipo_pedido}</span>
              <span>{p.codigo_local} - {p.nombre_local}</span>
              <span>Fecha: {p.fecha_pedido}</span>
              <span style={{ color: '#d97706', fontWeight: 'bold' }}>Pendiente</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render carrusel de listos
  const renderCarruselListos = () => {
    const listos = pedidos.filter(p => p.estado === 'Listo para cargar');
    if (listos.length === 0) return null;
    const totalPorPagina = 4;
    const totalPaginas = Math.ceil(listos.length / totalPorPagina);
    const paginaActual = Math.min(indiceCarruselListos % totalPaginas, totalPaginas - 1);
    const inicio = paginaActual * totalPorPagina;
    const tarjetas = listos.slice(inicio, inicio + totalPorPagina);

    return (
      <div className="sd06-carrusel">
        <h3>✅ Listos para cargar ({listos.length})</h3>
        <div className="sd06-carrusel-tarjetas">
          {tarjetas.map((p) => (
            <div key={p.id} className="sd06-carrusel-tarjeta sd06-tarjeta-listo">
              <strong>{p.numero_tarea}</strong>
              <span>{p.tipo_pedido}</span>
              <span>{p.codigo_local} - {p.nombre_local}</span>
              <span>Fecha: {p.fecha_pedido}</span>
              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Listo</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const exportarExcel = () => {
    if (pedidos.length === 0) {
      mostrarMensaje('warning', 'No hay datos para exportar');
      return;
    }

    if (vistaTabla === 'consolidado') {
      const headers = ['Local', 'Tipo', 'Total', 'Listas', 'Pendientes', 'Faltantes', 'Estado'];
      const rows = consolidado.map((c) => [
        `${c.codigo_local} - ${c.nombre_local}`,
        c.tipo_pedido,
        c.total,
        c.listas,
        c.pendientes,
        c.faltantes,
        c.completo ? 'Completo' : 'Incompleto'
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Resumen Cargas');
      XLSX.writeFile(wb, `Resumen_Cargas_${new Date().toISOString().slice(0,10)}.xlsx`);
    } else {
      const headers = ['N° Tarea', 'Tipo', 'Local', 'Fecha', 'Estado', 'Etiqueta', 'Creado En'];
      const rows = pedidosOrdenados.map((p) => [
        p.numero_tarea,
        p.tipo_pedido,
        `${p.codigo_local} - ${p.nombre_local}`,
        p.fecha_pedido,
        p.estado,
        p.etiqueta_generada ? 'Sí' : 'No',
        p.creado_en
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Detalle Pedidos');
      XLSX.writeFile(wb, `Detalle_Pedidos_${new Date().toISOString().slice(0,10)}.xlsx`);
    }
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
        <button className="sd06-btn" onClick={() => setVistaTabla(vistaTabla === 'detalle' ? 'consolidado' : 'detalle')}>
          {vistaTabla === 'detalle' ? 'Ver Consolidado' : 'Ver Detalle'}
        </button>
      </div>

      {renderCarruselPendientes()}
      {renderCarruselListos()}

      {/* ====== TABLA CONSOLIDADA (vista consolidado) ====== */}
      {vistaTabla === 'consolidado' && (
        <div className="sd06-table-wrapper">
          <h3 className="sd06-subtitulo-tabla">Resumen de Cargas por Local y Tipo (Todos los estados)</h3>
          <table className="sd06-table">
            <thead>
              <tr>
                <th>Local</th>
                <th>Tipo</th>
                <th>Total</th>
                <th>Listas</th>
                <th>Pendientes</th>
                <th>Faltantes</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {consolidado.length === 0 ? (
                <tr><td colSpan={7} className="sd06-empty">No hay datos consolidados</td></tr>
              ) : (
                consolidado.map((c) => (
                  <tr key={`${c.codigo_local}-${c.tipo_pedido}`}>
                    <td><strong>{c.codigo_local} - {c.nombre_local}</strong></td>
                    <td>{c.tipo_pedido}</td>
                    <td>{c.total}</td>
                    <td style={{ color: '#16a34a' }}>{c.listas}</td>
                    <td style={{ color: '#d97706' }}>{c.pendientes}</td>
                    <td style={{ color: c.faltantes > 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>{c.faltantes}</td>
                    <td>
                      {c.completo ? (
                        <span className="sd06-estado-badge sd06-estado-listo">Completo</span>
                      ) : (
                        <span className="sd06-estado-badge sd06-estado-pendiente">Faltan {c.faltantes}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== TABLA DE DETALLE (vista detalle) ====== */}
      {vistaTabla === 'detalle' && (
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
              {pedidosDetalle.length === 0 ? (
                <tr><td colSpan={7} className="sd06-empty">No hay pedidos para el filtro seleccionado</td></tr>
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
      )}

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
