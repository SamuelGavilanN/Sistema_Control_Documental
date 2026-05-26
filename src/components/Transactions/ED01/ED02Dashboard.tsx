import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import './ED02Dashboard.css';

interface FiltrosDashboard {
  usuario: string;
  desde: string;
  hasta: string;
}

const ED02Dashboard: React.FC = () => {
  const [filtros, setFiltros] = useState<FiltrosDashboard>({ usuario: '', desde: '', hasta: '' });
  const [datos, setDatos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarUsuarios();
    cargarDatos();
  }, []);

  const cargarUsuarios = async () => {
    const { data } = await supabase.from('usuarios').select('id, nombre, apellido');
    if (data) setUsuarios(data);
  };

  const cargarDatos = async () => {
    setCargando(true);
    let query = supabase.from('ed01_empaques').select('*');
    
    if (filtros.usuario) query = query.eq('creado_por', filtros.usuario);
    if (filtros.desde) query = query.gte('creado_en', filtros.desde + 'T00:00:00');
    if (filtros.hasta) query = query.lte('creado_en', filtros.hasta + 'T23:59:59');
    
    const { data } = await query.order('creado_en', { ascending: true });
    
    if (data) {
      // Agrupar por día
      const agrupado: Record<string, any> = {};
      data.forEach((reg: any) => {
        const dia = new Date(reg.creado_en).toLocaleDateString('es-CL');
        if (!agrupado[dia]) agrupado[dia] = { dia, tareas: 0, bultos: 0, tiempos: [], primera: '', ultima: '' };
        agrupado[dia].tareas++;
        agrupado[dia].bultos += reg.cantidad_bultos || 0;
        const hora = new Date(reg.creado_en);
        agrupado[dia].tiempos.push(hora);
        if (!agrupado[dia].primera || hora < new Date(agrupado[dia].primera)) agrupado[dia].primera = reg.creado_en;
        if (!agrupado[dia].ultima || hora > new Date(agrupado[dia].ultima)) agrupado[dia].ultima = reg.creado_en;
      });

      const resultado = Object.values(agrupado).map((d: any) => ({
        dia: d.dia,
        tareas: d.tareas,
        bultos: d.bultos,
        horaMin: d.primera ? new Date(d.primera).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '-',
        horaMax: d.ultima ? new Date(d.ultima).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '-',
      }));

      setDatos(resultado);
    }
    setCargando(false);
  };

  const totalTareas = datos.reduce((s, d) => s + d.tareas, 0);
  const totalBultos = datos.reduce((s, d) => s + d.bultos, 0);

  return (
    <div className="ed02-view">
      <div className="ed02-header">
        <h2>Dashboard Produccion Directo</h2>
      </div>

      {/* Filtros */}
      <div className="ed02-filtros">
        <select value={filtros.usuario} onChange={(e) => setFiltros({ ...filtros, usuario: e.target.value })}>
          <option value="">Todos los usuarios</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
        </select>
        <input type="date" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} placeholder="Desde" />
        <input type="date" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} placeholder="Hasta" />
        <button className="ed02-btn-aplicar" onClick={cargarDatos}>Aplicar</button>
      </div>

      {/* Resumen */}
      <div className="ed02-resumen">
        <div className="ed02-card"><span>Tareas Procesadas</span><strong>{totalTareas}</strong></div>
        <div className="ed02-card"><span>Total Bultos</span><strong>{totalBultos}</strong></div>
      </div>

      {/* Gráficos */}
      <div className="ed02-charts">
        <div className="ed02-chart">
          <h3>Tareas por Día</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
              <XAxis dataKey="dia" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Bar dataKey="tareas" fill="#3b82f6" radius={[4,4,0,0]} name="Tareas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="ed02-chart">
          <h3>Bultos por Día</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
              <XAxis dataKey="dia" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Bar dataKey="bultos" fill="#10b981" radius={[4,4,0,0]} name="Bultos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla detalle */}
      <div className="ed02-tabla-container">
        <table className="ed02-tabla">
          <thead>
            <tr>
              <th>Día</th>
              <th>Tareas</th>
              <th>Bultos</th>
              <th>Hora Mín</th>
              <th>Hora Máx</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr>
            ) : datos.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Sin datos</td></tr>
            ) : (
              datos.map((d, i) => (
                <tr key={i}>
                  <td>{d.dia}</td>
                  <td>{d.tareas}</td>
                  <td>{d.bultos}</td>
                  <td>{d.horaMin}</td>
                  <td>{d.horaMax}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ED02Dashboard;
