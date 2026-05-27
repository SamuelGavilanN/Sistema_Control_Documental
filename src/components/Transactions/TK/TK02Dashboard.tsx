import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './TK02.css';

interface Ticket {
  id: string; numero_ticket: string; area: string; tipo_problema: string;
  prioridad: string; estado: string; creado_en: string; resuelto_en: string | null;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

const TK02Dashboard: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroArea, setFiltroArea] = useState('');

  useEffect(() => { cargarTickets(); }, []);

  const cargarTickets = async () => {
    setCargando(true);
    let query = supabase.from('tickets').select('*');
    if (filtroArea) query = query.eq('area', filtroArea) as any;
    const result = await query.order('creado_en', { ascending: false }) as any;
    if (result.data) setTickets(result.data);
    setCargando(false);
  };

  // Estadísticas
  const totalTickets = tickets.length;
  const abiertos = tickets.filter(t => t.estado === 'Abierto').length;
  const enProceso = tickets.filter(t => t.estado === 'En Proceso').length;
  const resueltos = tickets.filter(t => t.estado === 'Resuelto').length;
  const cerrados = tickets.filter(t => t.estado === 'Cerrado').length;

  // Por área
  const porArea: Record<string, number> = {};
  tickets.forEach(t => { porArea[t.area] = (porArea[t.area] || 0) + 1; });
  const dataArea = Object.entries(porArea).map(([name, value]) => ({ name, value }));

  // Por tipo de problema
  const porTipo: Record<string, number> = {};
  tickets.forEach(t => { porTipo[t.tipo_problema] = (porTipo[t.tipo_problema] || 0) + 1; });
  const dataTipo = Object.entries(porTipo).map(([name, value]) => ({ name, value }));

  // Por estado
  const dataEstado = [
    { name: 'Abierto', value: abiertos, color: '#dc2626' },
    { name: 'En Proceso', value: enProceso, color: '#f59e0b' },
    { name: 'Resuelto', value: resueltos, color: '#10b981' },
    { name: 'Cerrado', value: cerrados, color: '#64748b' },
  ];

  // Tickets recientes
  const recientes = tickets.slice(0, 10);

  const getEstadoBadge = (e: string) => {
    switch (e) { case 'Abierto': return { color: '#dc2626', bg: '#fef2f2' }; case 'En Proceso': return { color: '#b45309', bg: '#fef3c7' }; case 'Resuelto': return { color: '#15803d', bg: '#dcfce7' }; default: return { color: '#64748b', bg: '#f1f5f9' }; }
  };

  return (
    <div className="tk02-view">
      <div className="tk02-header">
        <h2>Dashboard Tickets</h2>
        <select value={filtroArea} onChange={e => { setFiltroArea(e.target.value); setTimeout(cargarTickets, 100); }}>
          <option value="">Todas las areas</option>
          <option value="Portico">Portico</option>
        </select>
      </div>

      {/* Resumen */}
      <div className="tk02-resumen">
        <div className="tk02-card"><span>Total Tickets</span><strong>{totalTickets}</strong></div>
        <div className="tk02-card"><span>Abiertos</span><strong style={{ color: '#dc2626' }}>{abiertos}</strong></div>
        <div className="tk02-card"><span>En Proceso</span><strong style={{ color: '#f59e0b' }}>{enProceso}</strong></div>
        <div className="tk02-card"><span>Resueltos</span><strong style={{ color: '#10b981' }}>{resueltos}</strong></div>
      </div>

      {/* Gráficos */}
      <div className="tk02-charts">
        <div className="tk02-chart">
          <h3>Tickets por Estado</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={dataEstado} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value">
                {dataEstado.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="tk02-chart">
          <h3>Tickets por Tipo de Problema</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dataTipo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla recientes */}
      <div className="tk02-tabla-container">
        <h3>Tickets Recientes</h3>
        <table className="tk02-tabla">
          <thead><tr><th>Ticket</th><th>Area</th><th>Tipo</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            {recientes.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Sin tickets</td></tr> :
              recientes.map(t => {
                const eb = getEstadoBadge(t.estado);
                return <tr key={t.id}><td className="ed03-ticket-id">{t.numero_ticket}</td><td>{t.area}</td><td>{t.tipo_problema}</td><td><span style={{ background: eb.bg, color: eb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.estado}</span></td><td>{new Date(t.creado_en).toLocaleDateString('es-CL')}</td></tr>;
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TK02Dashboard;
