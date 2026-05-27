import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import './ED02Dashboard.css';

interface FiltrosDashboard {
  usuario: string;
  desde: string;
  hasta: string;
}

const ED02Dashboard: React.FC = () => {
  const [filtros, setFiltros] = useState<FiltrosDashboard>({ usuario: '', desde: '', hasta: '' });
  const [datosLinea, setDatosLinea] = useState<any[]>([]);
  const [datosBarra, setDatosBarra] = useState<any[]>([]);
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
      // Datos para gráfico de línea: cada empaque como punto (fecha/hora exacta)
      const puntosLinea = data.map((reg: any) => ({
        fechaHora: new Date(reg.creado_en).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(reg.creado_en).getTime(),
        bultos: reg.cantidad_bultos || 0,
        empaque: reg.numero_empaque,
        tienda: reg.codigo_local
      }));

      setDatosLinea(puntosLinea);

      // Datos para gráfico de barras: agrupado por día
      const agrupado: Record<string, any> = {};
      data.forEach((reg: any) => {
        const dia = new Date(reg.creado_en).toLocaleDateString('es-CL');
        if (!agrupado[dia]) agrupado[dia] = { dia, tareas: 0, bultos: 0 };
        agrupado[dia].tareas++;
        agrupado[dia].bultos += reg.cantidad_bultos || 0;
      });
      setDatosBarra(Object.values(agrupado));
    }
    setCargando(false);
  };

  const totalTareas = datosBarra.reduce((s, d) => s + d.tareas, 0);
  const totalBultos = datosBarra.reduce((s, d) => s + d.bultos, 0);

  return (
    <div className="ed02-view">
      <div className="ed02-header"><h2>Dashboard Produccion Directo</h2></div>

      <div className="ed02-filtros">
        <select value={filtros.usuario} onChange={e => setFiltros({ ...filtros, usuario: e.target.value })}>
          <option value="">Todos los usuarios</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
        </select>
        <input type="date" value={filtros.desde} onChange={e => setFiltros({ ...filtros, desde: e.target.value })} />
        <input type="date" value={filtros.hasta} onChange={e => setFiltros({ ...filtros, hasta: e.target.value })} />
        <button className="ed02-btn-aplicar" onClick={cargarDatos}>Aplicar</button>
      </div>

      <div className="ed02-resumen">
        <div className="ed02-card"><span>Tareas Procesadas</span><strong>{totalTareas}</strong></div>
        <div className="ed02-card"><span>Total Bultos</span><strong>{totalBultos}</strong></div>
      </div>

      {/* Gráfico de línea: Flujo de empaques en el tiempo */}
      <div className="ed02-chart">
        <h3>Flujo de Empaques por Fecha y Hora</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={datosLinea} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
            <XAxis dataKey="fechaHora" stroke="#64748b" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(label) => `Fecha: ${label}`} formatter={(value: any) => [value, 'Bultos']} />
            <Legend />
            <Line type="monotone" dataKey="bultos" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Bultos por empaque" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de barras: Resumen por día */}
      <div className="ed02-chart">
        <h3>Tareas y Bultos por Dia</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={datosBarra}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
            <XAxis dataKey="dia" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="tareas" fill="#3b82f6" radius={[4,4,0,0]} name="Tareas" />
            <Bar dataKey="bultos" fill="#10b981" radius={[4,4,0,0]} name="Bultos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla */}
      <div className="ed02-tabla-container">
        <table className="ed02-tabla">
          <thead><tr><th>Dia</th><th>Tareas</th><th>Bultos</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr> :
              datosBarra.length === 0 ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Sin datos</td></tr> :
              datosBarra.map((d, i) => <tr key={i}><td>{d.dia}</td><td>{d.tareas}</td><td>{d.bultos}</td></tr>)
            }
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ED02Dashboard;
