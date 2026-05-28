import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './AD03.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS = { 'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G' };

const COLORS = ['#15803d', '#dc2626', '#b45309', '#1d4ed8'];

const AD03Dashboard: React.FC = () => {
  const [datos, setDatos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [locales, setLocales] = useState<string[]>([]);

  useEffect(() => { cargarLocales(); cargarDatos(); }, []);
  useEffect(() => {
  const intervalo = setInterval(cargarDatos, 10000);
  return () => clearInterval(intervalo);
}, [filtroLocal, filtroDesde, filtroHasta]);

  const cargarLocales = async () => {
    try {
      const resp = await fetch(`${API_URL}/ad_auditorias?select=codigo_local`, { headers: HEADERS });
      const data = await resp.json();
      if (data) {
        const unicos = [...new Set(data.map((d: any) => d.codigo_local))];
        setLocales(unicos as string[]);
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

  // KPIs
  const total = datos.length;
  const finalizadas = datos.filter(d => d.estado === 'Finalizado').length;
  const conDiferencias = datos.filter(d => d.estado === 'Con Diferencias').length;
  const pendientes = datos.filter(d => d.estado === 'Pendiente' || d.estado === 'En Proceso').length;
  const totalCerradas = finalizadas + conDiferencias;
  const porcentajeDiferencias = totalCerradas > 0 ? ((conDiferencias / totalCerradas) * 100).toFixed(1) : '0';

  // Datos para gráfico de barras
  const porLocal: Record<string, any> = {};
  datos.forEach(d => {
    if (!porLocal[d.codigo_local]) porLocal[d.codigo_local] = { local: d.codigo_local, total: 0, finalizadas: 0, diferencias: 0, pendientes: 0 };
    porLocal[d.codigo_local].total++;
    if (d.estado === 'Finalizado') porLocal[d.codigo_local].finalizadas++;
    if (d.estado === 'Con Diferencias') porLocal[d.codigo_local].diferencias++;
    if (d.estado === 'Pendiente' || d.estado === 'En Proceso') porLocal[d.codigo_local].pendientes++;
  });
  const datosBarra = Object.values(porLocal);

  // Datos para gráfico de torta
  const datosPie = [
    { name: 'Finalizadas OK', value: finalizadas },
    { name: 'Con Diferencias', value: conDiferencias },
    { name: 'Pendientes', value: pendientes },
  ].filter(d => d.value > 0);

  return (
    <div className="ad03-view">
      <div className="ad03-header"><h2>Dashboard Auditoría</h2></div>

      <div className="ad03-filtros">
        <select value={filtroLocal} onChange={e => setFiltroLocal(e.target.value)}>
          <option value="">Todos los locales</option>
          {locales.map(l => <option key={l} value={l}>{l}</option>)}
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
        <div className="ad03-kpi ad03-kpi-porc"><span>% Con Diferencias</span><strong>{porcentajeDiferencias}%</strong></div>
      </div>

      <div className="ad03-charts">
        <div className="ad03-chart">
          <h3>Auditorías por Local</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosBarra}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
              <XAxis dataKey="local" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="finalizadas" fill="#15803d" radius={[4,4,0,0]} name="OK" />
              <Bar dataKey="diferencias" fill="#dc2626" radius={[4,4,0,0]} name="Diferencias" />
              <Bar dataKey="pendientes" fill="#b45309" radius={[4,4,0,0]} name="Pendientes" />
            </BarChart>
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

      <div className="ad03-tabla-container">
        <table className="ed03-tabla">
          <thead><tr><th>Local</th><th>Total</th><th>OK</th><th>Diferencias</th><th>Pendientes</th><th>% Dif.</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr> :
              datosBarra.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Sin datos</td></tr> :
              datosBarra.map((d, i) => {
                const totalLocal = d.finalizadas + d.diferencias;
                const pct = totalLocal > 0 ? ((d.diferencias / totalLocal) * 100).toFixed(1) : '0';
                return (
                  <tr key={i}>
                    <td className="ed03-ticket-id">{d.local}</td><td>{d.total}</td><td>{d.finalizadas}</td>
                    <td style={{ color: '#dc2626', fontWeight: 600 }}>{d.diferencias}</td><td>{d.pendientes}</td>
                    <td style={{ fontWeight: 600, color: '#dc2626' }}>{pct}%</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AD03Dashboard;
