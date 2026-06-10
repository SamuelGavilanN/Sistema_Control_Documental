// src/components/Transactions/AD/AD03Dashboard.tsx

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import './AD03.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS = { 'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G' };

const COLORS = ['#15803d', '#dc2626', '#b45309'];

interface TareaPorcentaje {
  id: string;
  numero_tarea: string;
  codigo_local: string;
  nombre_local: string;
  estado: string;
  totalSAP: number;
  totalFisico: number;
  diferenciaAbsoluta: number;
  porcentajeDif: number;
  creado_en: string;
}

const AD03Dashboard: React.FC = () => {
  const [datos, setDatos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [localesData, setLocalesData] = useState<{ codigo: string; nombre: string }[]>([]);
  const [tareasPorcentaje, setTareasPorcentaje] = useState<TareaPorcentaje[]>([]);
  const [cargandoPorcentajes, setCargandoPorcentajes] = useState(false);

  useEffect(() => { cargarLocales(); cargarDatos(); }, []);
  useEffect(() => { cargarDatos(); }, [filtroLocal, filtroDesde, filtroHasta]);

  const cargarLocales = async () => {
    try {
      const resp = await fetch(`${API_URL}/ad_auditorias?select=codigo_local,nombre_local`, { headers: HEADERS });
      const data = await resp.json();
      if (data) {
        const mapa = new Map<string, string>();
        data.forEach((d: any) => { if (!mapa.has(d.codigo_local)) mapa.set(d.codigo_local, d.nombre_local); });
        setLocalesData(Array.from(mapa.entries()).map(([cod, nom]) => ({ codigo: cod, nombre: nom })));
      }
    } catch (e) {}
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      let url = `${API_URL}/ad_auditorias?select=*&order=creado_en.asc`;
      if (filtroLocal) url += `&codigo_local=eq.${filtroLocal}`;
      if (filtroDesde) url += `&creado_en=gte.${filtroDesde}`;
      if (filtroHasta) url += `&creado_en=lte.${filtroHasta}T23:59:59`;

      const resp = await fetch(url, { headers: HEADERS });
      const data = await resp.json();
      setDatos(data || []);
    } catch (e) {}
    setCargando(false);
  };

  // Calcular % de diferencias por tarea
  const cargarPorcentajesTareas = async () => {
    setCargandoPorcentajes(true);
    try {
      const resultados: TareaPorcentaje[] = [];

      for (const auditoria of datos) {
        // Obtener SAP
        const respSAP = await fetch(
          `${API_URL}/ad_datos_sap?select=sku,cantidad_sap&auditoria_id=eq.${auditoria.id}`,
          { headers: HEADERS }
        );
        const sapData = await respSAP.json();

        // Consolidar SAP por SKU
        const sapConsolidado: Record<string, number> = {};
        (sapData || []).forEach((s: any) => {
          if (!sapConsolidado[s.sku]) sapConsolidado[s.sku] = 0;
          sapConsolidado[s.sku] += (s.cantidad_sap || 0);
        });

        // Obtener cajas
        const respCajas = await fetch(
          `${API_URL}/ad_capturas_cajas?select=id&auditoria_id=eq.${auditoria.id}`,
          { headers: HEADERS }
        );
        const cajas = await respCajas.json();
        const cajaIds = (cajas || []).map((c: any) => c.id);

        // Obtener capturas
        let capturas: any[] = [];
        if (cajaIds.length > 0) {
          const idsParam = cajaIds.map((id: string) => `"${id}"`).join(',');
          const respCap = await fetch(
            `${API_URL}/ad_capturas_skus?select=sku,cantidad_fisica&caja_id=in.(${idsParam})`,
            { headers: HEADERS }
          );
          capturas = await respCap.json();
        }

        // Consolidar físico por SKU
        const fisicoConsolidado: Record<string, number> = {};
        (capturas || []).forEach((c: any) => {
          if (!fisicoConsolidado[c.sku]) fisicoConsolidado[c.sku] = 0;
          fisicoConsolidado[c.sku] += (c.cantidad_fisica || 0);
        });

        // Calcular totales y diferencias
        let totalSAP = 0;
        let totalFisico = 0;
        let diferenciaAbsoluta = 0;

        // Todos los SKUs (unión de SAP y capturas)
        const todosLosSKUs = new Set([...Object.keys(sapConsolidado), ...Object.keys(fisicoConsolidado)]);

        todosLosSKUs.forEach(sku => {
          const sap = sapConsolidado[sku] || 0;
          const fisico = fisicoConsolidado[sku] || 0;
          totalSAP += sap;
          totalFisico += fisico;
          diferenciaAbsoluta += Math.abs(sap - fisico);
        });

        const porcentajeDif = totalSAP > 0 ? (diferenciaAbsoluta / totalSAP) * 100 : 0;

        resultados.push({
          id: auditoria.id,
          numero_tarea: auditoria.numero_tarea,
          codigo_local: auditoria.codigo_local,
          nombre_local: auditoria.nombre_local,
          estado: auditoria.estado,
          totalSAP,
          totalFisico,
          diferenciaAbsoluta,
          porcentajeDif: parseFloat(porcentajeDif.toFixed(1)),
          creado_en: auditoria.creado_en,
        });
      }

      setTareasPorcentaje(resultados);
    } catch (e) {}
    setCargandoPorcentajes(false);
  };

  // KPIs globales
  const [porcentajesGlobales, setPorcentajesGlobales] = useState({
    totalUnidadesSAP: 0,
    totalUnidadesFisico: 0,
    unidadesDiferencia: 0,
    porcentajeDif: 0,
  });

  useEffect(() => {
    if (datos.length === 0) return;
    calcularPorcentajeGlobal();
  }, [datos]);

  const calcularPorcentajeGlobal = async () => {
    try {
      let totalSAP = 0;
      let totalFisico = 0;
      let difAbsoluta = 0;

      for (const auditoria of datos) {
        const respSAP = await fetch(
          `${API_URL}/ad_datos_sap?select=sku,cantidad_sap&auditoria_id=eq.${auditoria.id}`,
          { headers: HEADERS }
        );
        const sapData = await respSAP.json();

        const sapConsolidado: Record<string, number> = {};
        (sapData || []).forEach((s: any) => {
          if (!sapConsolidado[s.sku]) sapConsolidado[s.sku] = 0;
          sapConsolidado[s.sku] += (s.cantidad_sap || 0);
        });

        const respCajas = await fetch(
          `${API_URL}/ad_capturas_cajas?select=id&auditoria_id=eq.${auditoria.id}`,
          { headers: HEADERS }
        );
        const cajas = await respCajas.json();
        const cajaIds = (cajas || []).map((c: any) => c.id);

        let capturas: any[] = [];
        if (cajaIds.length > 0) {
          const idsParam = cajaIds.map((id: string) => `"${id}"`).join(',');
          const respCap = await fetch(
            `${API_URL}/ad_capturas_skus?select=sku,cantidad_fisica&caja_id=in.(${idsParam})`,
            { headers: HEADERS }
          );
          capturas = await respCap.json();
        }

        const fisicoConsolidado: Record<string, number> = {};
        (capturas || []).forEach((c: any) => {
          if (!fisicoConsolidado[c.sku]) fisicoConsolidado[c.sku] = 0;
          fisicoConsolidado[c.sku] += (c.cantidad_fisica || 0);
        });

        const todosSKUs = new Set([...Object.keys(sapConsolidado), ...Object.keys(fisicoConsolidado)]);
        todosSKUs.forEach(sku => {
          const sap = sapConsolidado[sku] || 0;
          const fisico = fisicoConsolidado[sku] || 0;
          totalSAP += sap;
          totalFisico += fisico;
          difAbsoluta += Math.abs(sap - fisico);
        });
      }

      const porcentaje = totalSAP > 0 ? (difAbsoluta / totalSAP) * 100 : 0;

      setPorcentajesGlobales({
        totalUnidadesSAP: totalSAP,
        totalUnidadesFisico: totalFisico,
        unidadesDiferencia: difAbsoluta,
        porcentajeDif: parseFloat(porcentaje.toFixed(1)),
      });
    } catch (e) {}
  };

  // Agrupar por día
  const porDia: Record<string, any> = {};
  datos.forEach(d => {
    const dia = new Date(d.creado_en).toLocaleDateString('es-CL');
    if (!porDia[dia]) porDia[dia] = { dia, total: 0, ok: 0, diferencias: 0 };
    porDia[dia].total++;
    if (d.estado === 'Finalizado') porDia[dia].ok++;
    if (d.estado === 'Con Diferencias') porDia[dia].diferencias++;
  });

  const datosBarra = Object.values(porDia).map((d: any) => ({
    ...d,
    porcentajeDif: d.total > 0 ? ((d.diferencias / d.total) * 100).toFixed(1) : '0',
  }));

  // KPIs
  const total = datos.length;
  const finalizadas = datos.filter(d => d.estado === 'Finalizado').length;
  const conDiferencias = datos.filter(d => d.estado === 'Con Diferencias').length;
  const pendientes = datos.filter(d => d.estado === 'Pendiente' || d.estado === 'En Proceso').length;
  const totalCerradas = finalizadas + conDiferencias;
  const porcentajeDiferenciasTareas = totalCerradas > 0 ? ((conDiferencias / totalCerradas) * 100).toFixed(1) : '0';

  // Datos para torta
  const datosPie = [
    { name: 'OK', value: finalizadas },
    { name: 'Con Diferencias', value: conDiferencias },
    { name: 'Pendientes', value: pendientes },
  ].filter(d => d.value > 0);

  // Datos para línea
  const datosLinea = datosBarra.map((d: any) => ({
    dia: d.dia,
    porcentaje: parseFloat(d.porcentajeDif),
  }));

  return (
    <div className="ad03-view">
      <div className="ad03-header"><h2>Dashboard Auditoría</h2></div>

      <div className="ad03-filtros">
        <select value={filtroLocal} onChange={e => setFiltroLocal(e.target.value)}>
          <option value="">Todos los locales</option>
          {localesData.map(l => <option key={l.codigo} value={l.codigo}>{l.codigo} - {l.nombre}</option>)}
        </select>
        <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} placeholder="Desde" />
        <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} placeholder="Hasta" />
        <button className="ad03-btn-aplicar" onClick={cargarDatos}>Aplicar</button>
      </div>

      <div className="ad03-kpis">
        <div className="ad03-kpi"><span>Total Auditorías</span><strong>{total}</strong></div>
        <div className="ad03-kpi ad03-kpi-ok"><span>Finalizadas OK</span><strong>{finalizadas}</strong></div>
        <div className="ad03-kpi ad03-kpi-diff"><span>Con Diferencias</span><strong>{conDiferencias}</strong></div>
        <div className="ad03-kpi ad03-kpi-pend"><span>Pendientes</span><strong>{pendientes}</strong></div>
        <div className="ad03-kpi ad03-kpi-porc"><span>% Tareas con Dif.</span><strong>{porcentajeDiferenciasTareas}%</strong></div>
        <div className="ad03-kpi ad03-kpi-porc" style={{ background: '#fef2f2' }}>
          <span>% Unidades con Dif.</span>
          <strong style={{ color: '#dc2626' }}>{porcentajesGlobales.porcentajeDif}%</strong>
          <small style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
            {porcentajesGlobales.unidadesDiferencia} de {porcentajesGlobales.totalUnidadesSAP} un
          </small>
        </div>
      </div>

      <div className="ad03-charts">
        <div className="ad03-chart">
          <h3>Auditorías por Día</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosBarra}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
              <XAxis dataKey="dia" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="ok" fill="#15803d" radius={[4,4,0,0]} name="OK" />
              <Bar dataKey="diferencias" fill="#dc2626" radius={[4,4,0,0]} name="Con Diferencias" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="ad03-chart">
          <h3>% Diferencias por Día</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datosLinea}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
              <XAxis dataKey="dia" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(value: any) => [`${value}%`, '% Diferencias']} />
              <Line type="monotone" dataKey="porcentaje" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} name="% Diferencias" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="ad03-chart">
          <h3>Distribución de Estados</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={datosPie} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {datosPie.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla de % por día */}
      <div className="ad03-tabla-container" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>Resumen por Día</h3>
        <table className="ed03-tabla">
          <thead>
            <tr>
              <th>Día</th>
              <th>Total</th>
              <th>OK</th>
              <th>Diferencias</th>
              <th>% Dif. Tareas</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr> :
              datosBarra.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Sin datos</td></tr> :
              datosBarra.map((d: any, i: number) => {
                const cerradas = d.ok + d.diferencias;
                const pctTareas = cerradas > 0 ? ((d.diferencias / cerradas) * 100).toFixed(1) : '0';
                return (
                  <tr key={i}>
                    <td className="ed03-ticket-id">{d.dia}</td>
                    <td>{d.total}</td>
                    <td>{d.ok}</td>
                    <td style={{ color: '#dc2626', fontWeight: 600 }}>{d.diferencias}</td>
                    <td style={{ fontWeight: 600, color: '#dc2626' }}>{pctTareas}%</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* NUEVA TABLA: % Diferencias por Tarea */}
      <div className="ad03-tabla-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: 0 }}>Análisis de Diferencias por Tarea (% de Unidades)</h3>
          <button className="ad03-btn-aplicar" onClick={cargarPorcentajesTareas} disabled={cargandoPorcentajes}>
            {cargandoPorcentajes ? 'Calculando...' : 'Calcular % por Tarea'}
          </button>
        </div>
        <table className="ed03-tabla">
          <thead>
            <tr>
              <th>Tarea</th>
              <th>Local</th>
              <th>Estado</th>
              <th>Total SAP</th>
              <th>Total Físico</th>
              <th>Dif. Absoluta</th>
              <th>% Dif.</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {tareasPorcentaje.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                {cargandoPorcentajes ? 'Calculando porcentajes...' : 'Haz clic en "Calcular % por Tarea" para ver el análisis'}
              </td></tr>
            ) : (
              tareasPorcentaje.map((t, i) => (
                <tr key={t.id} style={{ background: t.porcentajeDif > 0 ? '#fff5f5' : 'transparent' }}>
                  <td className="ed03-ticket-id">{t.numero_tarea}</td>
                  <td>{t.codigo_local} - {t.nombre_local}</td>
                  <td>{t.estado}</td>
                  <td style={{ textAlign: 'center' }}>{t.totalSAP}</td>
                  <td style={{ textAlign: 'center' }}>{t.totalFisico}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: t.diferenciaAbsoluta > 0 ? '#dc2626' : '#15803d' }}>
                    {t.diferenciaAbsoluta > 0 ? t.diferenciaAbsoluta : '-'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      background: t.porcentajeDif === 0 ? '#dcfce7' : t.porcentajeDif <= 5 ? '#fef3c7' : '#fef2f2',
                      color: t.porcentajeDif === 0 ? '#15803d' : t.porcentajeDif <= 5 ? '#b45309' : '#dc2626',
                    }}>
                      {t.porcentajeDif}%
                    </span>
                  </td>
                  <td>{new Date(t.creado_en).toLocaleDateString('es-CL')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AD03Dashboard;
