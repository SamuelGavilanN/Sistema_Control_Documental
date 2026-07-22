// src/components/Transactions/AI/AI02Stats.tsx

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
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

  const cargarDatos = async () => {
    setCargando(true);
    try {
      let url = API_URL + '/ai_tareas?select=*&order=creado_en.asc';
      if (filtroUsuario) url += '&creado_por=eq.' + filtroUsuario;
      if (filtroDesde) url += '&creado_en=gte.' + filtroDesde;
      if (filtroHasta) url += '&creado_en=lte.' + filtroHasta + 'T23:59:59';

      const resp = await fetch(url, { headers: HEADERS });
      const tareasData = await resp.json() || [];

      // Cargar detalles de cada tarea
      const tareasConDetalle = await Promise.all((tareasData || []).map(async (tarea: any) => {
        const respEmpaques = await fetch(API_URL + '/ai_tarea_empaques?select=numero_empaque&tarea_id=eq.' + tarea.id, { headers: HEADERS });
        const empaques = await respEmpaques.json();

        let totalSistema = 0;
        const bomsSistema: string[] = [];

        for (const emp of (empaques || [])) {
          const respInv = await fetch(API_URL + '/ai_inventario?select=id&numero_empaque=eq.' + encodeURIComponent(emp.numero_empaque), { headers: HEADERS });
          const invData = await respInv.json();
          if (invData && invData.length > 0) {
            const respBoms = await fetch(API_URL + '/ai_inventario_boms?select=cantidad_maxima,bom_sku&empaque_id=eq.' + invData[0].id, { headers: HEADERS });
            const boms = await respBoms.json();
            if (boms) {
              boms.forEach((b: any) => {
                totalSistema += b.cantidad_maxima;
                bomsSistema.push(b.bom_sku);
              });
            }
          }
        }

        const respCapturas = await fetch(API_URL + '/ai_capturas?select=bom_sku&tarea_id=eq.' + tarea.id, { headers: HEADERS });
        const capturas = await respCapturas.json() || [];
        const totalRevisado = capturas.filter((c: any) => bomsSistema.includes(c.bom_sku)).length;
        const totalNoEncontrados = capturas.filter((c: any) => !bomsSistema.includes(c.bom_sku)).length;

        // Obtener nombre del auditor
        let auditorNombre = '-';
        if (tarea.auditor) {
          const u = usuarios.find((user: any) => user.id === tarea.auditor);
          if (u) auditorNombre = u.nombre + ' ' + u.apellido;
        }

        return {
          ...tarea,
          empaques: (empaques || []).map((e: any) => e.numero_empaque),
          total_bultos_sistema: totalSistema,
          total_bultos_revisados_sistema: totalRevisado,
          total_no_encontrados: totalNoEncontrados,
          total_bultos_revisados_total: capturas.length,
          diferencia: totalSistema - totalRevisado,
          auditor_nombre: auditorNombre
        };
      }));

      setTareas(tareasConDetalle);

      // Calcular KPIs
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

      // Datos para gráfico de barras por día
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
        <button className="ai02stats-btn" onClick={onVolver}>
          ← Volver a Tareas
        </button>
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

      {/* KPIs */}
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

      {/* Gráficos */}
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

      {/* Tabla de tareas */}
      <div className="ai02stats-tabla-container">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>Detalle por Tarea</h3>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
          <table className="ed03-tabla" style={{ minWidth: '1000px' }}>
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Local</th>
                <th>Auditor</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Empaques</th>
                <th style={{ textAlign: 'center' }}>Sistema</th>
                <th style={{ textAlign: 'center' }}>Revisado</th>
                <th style={{ textAlign: 'center' }}>No Enc.</th>
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
                  const porcentaje = tarea.total_bultos_sistema > 0 ? Math.round((tarea.total_bultos_revisados_sistema / tarea.total_bultos_sistema) * 100) : 0;
                  return (
                    <tr key={tarea.id}>
                      <td style={{ fontFamily: 'Courier New, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{tarea.numero_tarea}</td>
                      <td>{tarea.cod_local} - {tarea.local}</td>
                      <td>{tarea.auditor_nombre}</td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: ec.bg, color: ec.color }}>
                          {tarea.estado}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{tarea.empaques.length}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{formatNum(tarea.total_bultos_sistema)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>{formatNum(tarea.total_bultos_revisados_sistema)}</td>
                      <td style={{ textAlign: 'center', color: tarea.total_no_encontrados > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: 600 }}>
                        {tarea.total_no_encontrados > 0 ? tarea.total_no_encontrados : '-'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: tarea.diferencia === 0 ? '#15803d' : '#dc2626' }}>
                        {tarea.diferencia === 0 ? 'OK' : tarea.diferencia}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: porcentaje >= 100 ? '#15803d' : porcentaje >= 80 ? '#b45309' : '#dc2626' }}>
                        {porcentaje}%
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(tarea.creado_en).toLocaleDateString('es-CL')}</td>
                    </tr>
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
