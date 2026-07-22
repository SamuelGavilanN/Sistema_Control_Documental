// src/components/Transactions/AI/AI02Stats.tsx

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import './AI02Stats.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const COLORS = ['#15803d', '#dc2626', '#b45309', '#1d4ed8'];

const formatNum = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

interface AI02StatsProps {
  onVolver: () => void;
}

const AI02Stats: React.FC<AI02StatsProps> = ({ onVolver }) => {
  const [cargando, setCargando]: any = useState(true);
  const [filtroUsuario, setFiltroUsuario]: any = useState('');
  const [filtroDesde, setFiltroDesde]: any = useState('');
  const [filtroHasta, setFiltroHasta]: any = useState('');
  const [usuarios, setUsuarios]: any = useState([]);
  const [tareas, setTareas]: any = useState([]);
  const [detalleExpandido, setDetalleExpandido]: any = useState(new Set());
  const [kpis, setKpis]: any = useState({
    totalTareas: 0,
    tareasOK: 0,
    tareasConDiferencias: 0,
    tareasPendientes: 0,
    totalBultosSistema: 0,
    totalBultosRevisados: 0,
    porcentajeCumplimiento: 0
  });
  const [datosBarra, setDatosBarra]: any = useState([]);

  useEffect(() => {
    cargarUsuarios();
    cargarDatos();
    const intervalo = setInterval(cargarDatos, 10000);
    return () => clearInterval(intervalo);
  }, [filtroUsuario, filtroDesde, filtroHasta]);

  const cargarUsuarios = async () => {
    try {
      const resp = await fetch(API_URL + '/usuarios?select=id,nombre,apellido&order=nombre.asc', { headers: HEADERS });
      const data = await resp.json();
      if (data) setUsuarios(data);
    } catch (e) {}
  };

  const obtenerNombreAuditor = (auditorId: string): string => {
    if (!auditorId) return '-';
    const u = usuarios.find((user: any) => user.id === auditorId);
    return u ? u.nombre + ' ' + u.apellido : '-';
  };

  const toggleExpandir = (tareaId: string) => {
    const nuevos = new Set(detalleExpandido);
    if (nuevos.has(tareaId)) {
      nuevos.delete(tareaId);
    } else {
      nuevos.add(tareaId);
    }
    setDetalleExpandido(nuevos);
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      let url = API_URL + '/ai_tareas?select=*&order=creado_en.asc';
      if (filtroUsuario) url += '&creado_por=eq.' + filtroUsuario;
      if (filtroDesde) url += '&creado_en=gte.' + filtroDesde;
      if (filtroHasta) url += '&creado_en=lte.' + filtroHasta + 'T23:59:59';

      const resp = await fetch(url, { headers: HEADERS });
      const tareasData = await resp.json() || [];

      const tareasConDetalle = await Promise.all((tareasData || []).map(async (tarea: any) => {
        const respEmpaques = await fetch(API_URL + '/ai_tarea_empaques?select=numero_empaque&tarea_id=eq.' + tarea.id, { headers: HEADERS });
        const empaques = await respEmpaques.json();

        let totalSistema = 0;
        const bomsSistema: string[] = [];
        
        // Detalle por empaque
        const detallePorEmpaque: any[] = [];

        for (const emp of (empaques || [])) {
          const respInv = await fetch(API_URL + '/ai_inventario?select=id,cod_destino,destino&numero_empaque=eq.' + encodeURIComponent(emp.numero_empaque), { headers: HEADERS });
          const invData = await respInv.json();
          
          let bultosSistemaEmpaque = 0;
          let bultosRevisadosEmpaque = 0;
          
          if (invData && invData.length > 0) {
            const respBoms = await fetch(API_URL + '/ai_inventario_boms?select=cantidad_maxima,bom_sku&empaque_id=eq.' + invData[0].id, { headers: HEADERS });
            const boms = await respBoms.json();
            if (boms) {
              boms.forEach((b: any) => {
                bultosSistemaEmpaque += b.cantidad_maxima;
                totalSistema += b.cantidad_maxima;
                bomsSistema.push(b.bom_sku);
              });
            }
          }

          // Contar capturas para este empaque (buscando BOMs que coincidan)
          const respCapturasEmp = await fetch(API_URL + '/ai_capturas?select=bom_sku&tarea_id=eq.' + tarea.id, { headers: HEADERS });
          const capturasEmp = await respCapturasEmp.json() || [];
          
          // Obtener BOMs específicos de este empaque
          const bomsEsteEmpaque: string[] = [];
          if (invData && invData.length > 0) {
            const respBomsEmp = await fetch(API_URL + '/ai_inventario_boms?select=bom_sku&empaque_id=eq.' + invData[0].id, { headers: HEADERS });
            const bomsEmp = await respBomsEmp.json();
            if (bomsEmp) {
              bomsEmp.forEach((b: any) => bomsEsteEmpaque.push(b.bom_sku));
            }
          }
          
          bultosRevisadosEmpaque = capturasEmp.filter((c: any) => bomsEsteEmpaque.includes(c.bom_sku)).length;
          const noEncontradosEmpaque = capturasEmp.filter((c: any) => !bomsSistema.includes(c.bom_sku)).length;

          detallePorEmpaque.push({
            numero_empaque: emp.numero_empaque,
            cod_destino: invData && invData.length > 0 ? invData[0].cod_destino : '',
            destino: invData && invData.length > 0 ? invData[0].destino : '',
            bultos_sistema: bultosSistemaEmpaque,
            bultos_revisados: bultosRevisadosEmpaque,
            diferencia: bultosSistemaEmpaque - bultosRevisadosEmpaque,
            porcentaje: bultosSistemaEmpaque > 0 ? Math.round((bultosRevisadosEmpaque / bultosSistemaEmpaque) * 100) : 0
          });
        }

        const respCapturas = await fetch(API_URL + '/ai_capturas?select=bom_sku&tarea_id=eq.' + tarea.id, { headers: HEADERS });
        const capturas = await respCapturas.json() || [];
        const totalRevisado = capturas.filter((c: any) => bomsSistema.includes(c.bom_sku)).length;
        const totalNoEncontrados = capturas.filter((c: any) => !bomsSistema.includes(c.bom_sku)).length;

        return {
          ...tarea,
          empaques: (empaques || []).map((e: any) => e.numero_empaque),
          detalle_empaques: detallePorEmpaque,
          total_bultos_sistema: totalSistema,
          total_bultos_revisados_sistema: totalRevisado,
          total_no_encontrados: totalNoEncontrados,
          total_bultos_revisados_total: capturas.length,
          diferencia: totalSistema - totalRevisado,
          auditor_nombre: obtenerNombreAuditor(tarea.auditor)
        };
      }));

      setTareas(tareasConDetalle);

      const finalizadas = tareasConDetalle.filter((t: any) => t.estado === 'Finalizado').length;
      const conDiferencias = tareasConDetalle.filter((t: any) => t.estado === 'Con Diferencias').length;
      const pendientes = tareasConDetalle.filter((t: any) => t.estado === 'Pendiente' || t.estado === 'En Proceso').length;
      const totalTareas = tareasConDetalle.length;
      const totalBultosSistema = tareasConDetalle.reduce((s: number, t: any) => s + t.total_bultos_sistema, 0);
      const totalBultosRevisados = tareasConDetalle.reduce((s: number, t: any) => s + t.total_bultos_revisados_sistema, 0);
      const porcentajeCumplimiento = totalBultosSistema > 0 ? parseFloat(((totalBultosRevisados / totalBultosSistema) * 100).toFixed(1)) : 0;

      setKpis({
        totalTareas,
        tareasOK: finalizadas,
        tareasConDiferencias: conDiferencias,
        tareasPendientes: pendientes,
        totalBultosSistema,
        totalBultosRevisados,
        porcentajeCumplimiento
      });

      const agrupadoPorDia: Record<string, any> = {};
      tareasConDetalle.forEach((t: any) => {
        const dia = new Date(t.creado_en).toLocaleDateString('es-CL');
        if (!agrupadoPorDia[dia]) {
          agrupadoPorDia[dia] = { dia, total: 0, ok: 0, diferencias: 0 };
        }
        agrupadoPorDia[dia].total++;
        if (t.estado === 'Finalizado') agrupadoPorDia[dia].ok++;
        if (t.estado === 'Con Diferencias') agrupadoPorDia[dia].diferencias++;
      });

      const barrasOrdenadas = Object.values(agrupadoPorDia).sort((a: any, b: any) => {
        const fechaA = a.dia.split('-').reverse().join('');
        const fechaB = b.dia.split('-').reverse().join('');
        return fechaA.localeCompare(fechaB);
      });

      setDatosBarra(barrasOrdenadas);
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
    setCargando(false);
  };

  const handleExportarExcel = () => {
    const filas: any[] = [];
    
    tareas.forEach((tarea: any) => {
      if (tarea.detalle_empaques && tarea.detalle_empaques.length > 0) {
        tarea.detalle_empaques.forEach((detalle: any) => {
          filas.push({
            'TAREA': tarea.numero_tarea,
            'LOCAL': tarea.cod_local + ' - ' + tarea.local,
            'AUDITOR': tarea.auditor_nombre,
            'ESTADO TAREA': tarea.estado,
            'N° EMPAQUE': detalle.numero_empaque,
            'COD. DESTINO': detalle.cod_destino,
            'DESTINO': detalle.destino,
            'BULTOS SISTEMA': detalle.bultos_sistema,
            'BULTOS REVISADOS': detalle.bultos_revisados,
            'DIFERENCIA': detalle.diferencia === 0 ? 'OK' : detalle.diferencia,
            '% CUMPLIMIENTO': detalle.porcentaje + '%',
            'FECHA': new Date(tarea.creado_en).toLocaleDateString('es-CL')
          });
        });
      } else {
        filas.push({
          'TAREA': tarea.numero_tarea,
          'LOCAL': tarea.cod_local + ' - ' + tarea.local,
          'AUDITOR': tarea.auditor_nombre,
          'ESTADO TAREA': tarea.estado,
          'N° EMPAQUE': '-',
          'COD. DESTINO': '-',
          'DESTINO': '-',
          'BULTOS SISTEMA': tarea.total_bultos_sistema,
          'BULTOS REVISADOS': tarea.total_bultos_revisados_sistema,
          'DIFERENCIA': tarea.diferencia === 0 ? 'OK' : tarea.diferencia,
          '% CUMPLIMIENTO': tarea.total_bultos_sistema > 0 ? Math.round((tarea.total_bultos_revisados_sistema / tarea.total_bultos_sistema) * 100) + '%' : '0%',
          'FECHA': new Date(tarea.creado_en).toLocaleDateString('es-CL')
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(filas);
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 18 },
      { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estadisticas');
    
    const fechaActual = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
    XLSX.writeFile(wb, 'Estadisticas_Auditoria_' + fechaActual + '.xlsx');
  };

  const datosPie = [
    { name: 'OK', value: kpis.tareasOK },
    { name: 'Con Diferencias', value: kpis.tareasConDiferencias },
    { name: 'Pendientes', value: kpis.tareasPendientes },
  ].filter((d: any) => d.value > 0);

  if (cargando && tareas.length === 0) {
    return (
      <div className="ai02stats-view">
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div className="ai02stats-view">
      <div className="ai02stats-header">
        <h2>Estadísticas de Auditoría Inventario</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="ai02stats-btn ai02stats-btn-primary" onClick={handleExportarExcel}>
            Exportar Excel
          </button>
          <button className="ai02stats-btn" onClick={onVolver}>
            ← Volver a Tareas
          </button>
        </div>
      </div>

      <div className="ai02stats-filtros">
        <select value={filtroUsuario} onChange={(e: any) => setFiltroUsuario(e.target.value)}>
          <option value="">Todos los auditores</option>
          {usuarios.map((u: any) => (
            <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
          ))}
        </select>
        <input type="date" value={filtroDesde} onChange={(e: any) => setFiltroDesde(e.target.value)} placeholder="Desde" />
        <input type="date" value={filtroHasta} onChange={(e: any) => setFiltroHasta(e.target.value)} placeholder="Hasta" />
        <button className="ai02stats-btn ai02stats-btn-primary" onClick={cargarDatos}>
          Aplicar Filtros
        </button>
      </div>

      <div className="ai02stats-kpis">
        <div className="ai02stats-kpi">
          <span>Total Tareas</span>
          <strong>{formatNum(kpis.totalTareas)}</strong>
        </div>
        <div className="ai02stats-kpi">
          <span>Tareas OK</span>
          <strong style={{ color: '#15803d' }}>{formatNum(kpis.tareasOK)}</strong>
        </div>
        <div className="ai02stats-kpi">
          <span>Con Diferencias</span>
          <strong style={{ color: '#dc2626' }}>{formatNum(kpis.tareasConDiferencias)}</strong>
        </div>
        <div className="ai02stats-kpi">
          <span>Pendientes</span>
          <strong style={{ color: '#b45309' }}>{formatNum(kpis.tareasPendientes)}</strong>
        </div>
        <div className="ai02stats-kpi">
          <span>Bultos Sistema</span>
          <strong>{formatNum(kpis.totalBultosSistema)}</strong>
        </div>
        <div className="ai02stats-kpi">
          <span>Bultos Revisados</span>
          <strong style={{ color: '#1d4ed8' }}>{formatNum(kpis.totalBultosRevisados)}</strong>
        </div>
        <div className="ai02stats-kpi">
          <span>% Cumplimiento</span>
          <strong style={{ color: kpis.porcentajeCumplimiento >= 100 ? '#15803d' : kpis.porcentajeCumplimiento >= 80 ? '#b45309' : '#dc2626' }}>
            {kpis.porcentajeCumplimiento}%
          </strong>
        </div>
      </div>

      {datosBarra.length > 0 && (
        <div className="ai02stats-charts">
          <div className="ai02stats-chart">
            <h3>Tareas por Día</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosBarra}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="dia" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ok" fill="#15803d" radius={[4, 4, 0, 0]} name="OK" />
                <Bar dataKey="diferencias" fill="#dc2626" radius={[4, 4, 0, 0]} name="Con Diferencias" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="ai02stats-chart">
            <h3>Distribución de Estados</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={datosPie} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, value }) => name + ': ' + formatNum(value)}>
                  {datosPie.map((_: any, index: number) => <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: any) => formatNum(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="ai02stats-tabla-container">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>Detalle por Tarea y Empaque</h3>
          <button className="ai02stats-btn ai02stats-btn-primary" onClick={handleExportarExcel} style={{ fontSize: '11px', padding: '5px 10px' }}>
            Exportar Excel
          </button>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
          <table className="ed03-tabla" style={{ minWidth: '1200px' }}>
            <thead>
              <tr>
                <th style={{ width: '30px' }}></th>
                <th>Tarea</th>
                <th>Local</th>
                <th>Auditor</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th>N° Empaque</th>
                <th style={{ textAlign: 'center' }}>Bultos Sist.</th>
                <th style={{ textAlign: 'center' }}>Bultos Rev.</th>
                <th style={{ textAlign: 'center' }}>Dif.</th>
                <th style={{ textAlign: 'center' }}>% Cumpl.</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {tareas.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-placeholder)' }}>Sin datos</td></tr>
              ) : (
                tareas.map((tarea: any) => {
                  const getEstadoColor = (estado: string) => {
                    switch (estado) {
                      case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' };
                      case 'Con Diferencias': return { color: '#dc2626', bg: '#fef2f2' };
                      case 'En Proceso': return { color: '#1d4ed8', bg: '#dbeafe' };
                      default: return { color: '#b45309', bg: '#fef3c7' };
                    }
                  };
                  const ec = getEstadoColor(tarea.estado);
                  const expandido = detalleExpandido.has(tarea.id);
                  const tieneEmpaques = tarea.detalle_empaques && tarea.detalle_empaques.length > 0;

                  return (
                    <React.Fragment key={tarea.id}>
                      {/* Fila resumen de la tarea */}
                      <tr 
                        onClick={() => tieneEmpaques && toggleExpandir(tarea.id)}
                        style={{ cursor: tieneEmpaques ? 'pointer' : 'default', background: 'var(--bg-section)' }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          {tieneEmpaques && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                              <path d="M4 2L8 6L4 10" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          )}
                        </td>
                        <td style={{ fontFamily: 'Courier New, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{tarea.numero_tarea}</td>
                        <td>{tarea.cod_local} - {tarea.local}</td>
                        <td>{tarea.auditor_nombre}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: ec.bg, color: ec.color }}>
                            {tarea.estado}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{tarea.empaques.length} empaque(s)</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{formatNum(tarea.total_bultos_sistema)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>{formatNum(tarea.total_bultos_revisados_sistema)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: tarea.diferencia === 0 ? '#15803d' : '#dc2626' }}>
                          {tarea.diferencia === 0 ? 'OK' : tarea.diferencia}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: tarea.total_bultos_sistema > 0 ? (tarea.total_bultos_revisados_sistema >= tarea.total_bultos_sistema ? '#15803d' : '#b45309') : 'var(--text-muted)' }}>
                          {tarea.total_bultos_sistema > 0 ? Math.round((tarea.total_bultos_revisados_sistema / tarea.total_bultos_sistema) * 100) + '%' : '-'}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(tarea.creado_en).toLocaleDateString('es-CL')}</td>
                      </tr>
                      {/* Filas de detalle por empaque */}
                      {expandido && tarea.detalle_empaques && tarea.detalle_empaques.map((detalle: any, idx: number) => (
                        <tr key={tarea.id + '-emp-' + idx} style={{ background: 'var(--bg-panel)' }}>
                          <td></td>
                          <td colSpan={4} style={{ paddingLeft: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            └ {detalle.numero_empaque} ({detalle.cod_destino} - {detalle.destino})
                          </td>
                          <td style={{ fontFamily: 'Courier New, monospace', fontSize: '12px', color: 'var(--text-link)' }}>{detalle.numero_empaque}</td>
                          <td style={{ textAlign: 'center', fontSize: '12px' }}>{formatNum(detalle.bultos_sistema)}</td>
                          <td style={{ textAlign: 'center', fontSize: '12px', color: '#1d4ed8' }}>{formatNum(detalle.bultos_revisados)}</td>
                          <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: detalle.diferencia === 0 ? '#15803d' : '#dc2626' }}>
                            {detalle.diferencia === 0 ? 'OK' : detalle.diferencia}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: detalle.porcentaje >= 100 ? '#15803d' : detalle.porcentaje >= 80 ? '#b45309' : '#dc2626' }}>
                            {detalle.porcentaje}%
                          </td>
                          <td></td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AI02Stats;
