import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
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
  const [datosHorarios, setDatosHorarios] = useState<any[]>([]);
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
      // Datos por día para barras
      const agrupado: Record<string, any> = {};
      data.forEach((reg: any) => {
        const dia = new Date(reg.creado_en).toLocaleDateString('es-CL');
        if (!agrupado[dia]) agrupado[dia] = { dia, tareas: 0, bultos: 0 };
        agrupado[dia].tareas++;
        agrupado[dia].bultos += reg.cantidad_bultos || 0;
      });

      const resultado = Object.values(agrupado).map((d: any) => ({
        dia: d.dia,
        tareas: d.tareas,
        bultos: d.bultos,
      }));

      setDatos(resultado);

      // Datos horarios para dispersión
      const puntosHorarios = data.map((reg: any) => {
        const fecha = new Date(reg.creado_en);
        const dia = fecha.toLocaleDateString('es-CL');
        const hora = fecha.getHours() + fecha.getMinutes() / 60;
        return {
          dia,
          hora: Math.round(hora * 100) / 100,
          tarea: reg.numero_empaque,
          bultos: reg.cantidad_bultos
        };
      });

      setDatosHorarios(puntosHorarios);
    }
    setCargando(false);
  };

  const totalTareas = datos.reduce((s, d) => s + d.tareas, 0);
  const totalBultos = datos.reduce((s, d) => s + d.bultos, 0);

  // Horas para el eje Y
  const horasEje = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="ed02-view">
      <div className="ed02-header">
        <h2>Dashboard Produccion Directo</h2>
      </div>

      <div className="ed02-filtros">
        <select value={filtros.usuario} onChange={(e) => setFiltros({ ...filtros, usuario: e.target.value })}>
          <option value="">Todos los usuarios</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
        </select>
        <input type="date" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} placeholder="Desde" />
        <input type="date" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} placeholder="Hasta" />
        <button className="ed02-btn-aplicar" onClick={cargarDatos}>Aplicar</button>
      </div>

      <div className="ed02-resumen">
        <div className="ed02-card"><span>Tareas Procesadas</span><strong>{totalTareas}</strong></div>
        <div className="ed02-card"><span>Total Bultos</span><strong>{totalBultos}</strong></div>
      </div>

      {/* Gráfico de barras: Tareas y Bultos por día */}
      <div className="ed02-chart">
        <h3>Tareas y Bultos por Dia</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={datos}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
            <XAxis dataKey="dia" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="tareas" fill="#3b82f6" radius={[4,4,0,0]} name="Tareas" />
            <Bar dataKey="bultos" fill="#10b981" radius={[4,4,0,0]} name="Bultos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de dispersión: Distribución horaria */}
      <div className="ed02-chart">
        <h3>Distribucion Horaria de Empaques</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
            <XAxis 
              dataKey="dia" 
              stroke="#64748b" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              dataKey="hora" 
              stroke="#64748b" 
              tick={{ fontSize: 11 }}
              domain={[0, 24]}
              ticks={[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]}
              tickFormatter={(h) => `${h}:00`}
            />
            <ZAxis range={[60, 60]} />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }: { payload?: any[] }) => {
                if (payload && payload[0]) {
                  const d = payload[0].payload;
                  return (
                    <div style={{ background: 'white', padding: '8px 12px', border: '1px solid #eef0f5', borderRadius: '6px', fontSize: '12px' }}>
                      <p><strong>{d.tarea}</strong></p>
                      <p>Día: {d.dia}</p>
                      <p>Hora: {Math.floor(d.hora)}:{String(Math.round((d.hora % 1) * 60)).padStart(2, '0')}</p>
                      <p>Bultos: {d.bultos}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter data={datosHorarios} fill="#dc2626" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla detalle */}
      <div className="ed02-tabla-container">
        <table className="ed02-tabla">
          <thead>
            <tr>
              <th>Dia</th>
              <th>Tareas</th>
              <th>Bultos</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr>
            ) : datos.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Sin datos</td></tr>
            ) : (
              datos.map((d, i) => (
                <tr key={i}>
                  <td>{d.dia}</td>
                  <td>{d.tareas}</td>
                  <td>{d.bultos}</td>
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
