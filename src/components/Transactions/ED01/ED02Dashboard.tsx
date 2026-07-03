// src/components/Transactions/ED/ED02Dashboard.tsx

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import './ED02Dashboard.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = { 
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G' 
};

const ED02Dashboard: React.FC = () => {
  const [filtros, setFiltros]: any = useState({ usuario: '', desde: '', hasta: '' });
  const [datosLinea, setDatosLinea]: any = useState([]);
  const [datosBarra, setDatosBarra]: any = useState([]);
  const [usuarios, setUsuarios]: any = useState([]);
  const [cargando, setCargando]: any = useState(true);

  useEffect(() => { cargarUsuarios(); cargarDatos(); }, []);

  const cargarUsuarios = async () => {
    try {
      const resp = await fetch(API_URL + '/usuarios?select=id,nombre,apellido', { headers: HEADERS });
      const data = await resp.json();
      if (data) setUsuarios(data);
    } catch (e) {}
  };

  const cargarTodosLosRegistros = async (urlBase: string) => {
    let todosLosDatos: any[] = [];
    let offset = 0;
    const limit = 1000;
    let hayMas = true;

    while (hayMas) {
      const url = urlBase + '&limit=' + limit + '&offset=' + offset;
      const resp = await fetch(url, { headers: HEADERS });
      const data = await resp.json();
      
      if (data && data.length > 0) {
        todosLosDatos = [...todosLosDatos, ...data];
        offset += limit;
        
        // Si recibimos menos del límite, ya no hay más
        if (data.length < limit) {
          hayMas = false;
        }
      } else {
        hayMas = false;
      }
    }

    return todosLosDatos;
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      let urlBase = API_URL + '/ed01_empaques?select=*&estado=eq.Finalizado&order=creado_en.asc';
      if (filtros.usuario) urlBase += '&creado_por=eq.' + filtros.usuario;
      if (filtros.desde) urlBase += '&creado_en=gte.' + filtros.desde;
      if (filtros.hasta) urlBase += '&creado_en=lte.' + filtros.hasta + 'T23:59:59';
      
      const data = await cargarTodosLosRegistros(urlBase);
      
      if (data && data.length > 0) {
        const puntosLinea = data.map((reg: any) => ({
          fechaHora: new Date(reg.creado_en).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(reg.creado_en).getTime(),
          bultos: reg.cantidad_bultos || 0,
          empaque: reg.numero_empaque,
          tienda: reg.codigo_local
        }));
        setDatosLinea(puntosLinea);

        const agrupado: Record<string, any> = {};
        data.forEach((reg: any) => {
          const dia = new Date(reg.creado_en).toLocaleDateString('es-CL');
          if (!agrupado[dia]) agrupado[dia] = { dia, tareas: 0, bultos: 0 };
          agrupado[dia].tareas++;
          agrupado[dia].bultos += reg.cantidad_bultos || 0;
        });
        
        // Ordenar por fecha
        const barrasOrdenadas = Object.values(agrupado).sort((a: any, b: any) => {
          const fechaA = a.dia.split('-').reverse().join('');
          const fechaB = b.dia.split('-').reverse().join('');
          return fechaA.localeCompare(fechaB);
        });
        
        setDatosBarra(barrasOrdenadas);
      } else {
        setDatosLinea([]);
        setDatosBarra([]);
      }
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
    setCargando(false);
  };

  const totalTareas = datosBarra.reduce((s: number, d: any) => s + d.tareas, 0);
  const totalBultos = datosBarra.reduce((s: number, d: any) => s + d.bultos, 0);

  return (
    <div className="ed02-view">
      <div className="ed02-header"><h2>Dashboard Produccion Directo</h2></div>

      <div className="ed02-filtros">
        <select value={filtros.usuario} onChange={e => setFiltros({ ...filtros, usuario: e.target.value })}>
          <option value="">Todos los usuarios</option>
          {usuarios.map((u: any) => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
        </select>
        <input type="date" value={filtros.desde} onChange={e => setFiltros({ ...filtros, desde: e.target.value })} />
        <input type="date" value={filtros.hasta} onChange={e => setFiltros({ ...filtros, hasta: e.target.value })} />
        <button className="ed02-btn-aplicar" onClick={cargarDatos}>Aplicar</button>
      </div>

      <div className="ed02-resumen">
        <div className="ed02-card"><span>Tareas Procesadas</span><strong>{totalTareas}</strong></div>
        <div className="ed02-card"><span>Total Bultos</span><strong>{totalBultos}</strong></div>
        <div className="ed02-card"><span>Días Trabajados</span><strong>{datosBarra.length}</strong></div>
      </div>

      {datosBarra.length > 0 && (
        <>
          <div className="ed02-chart">
            <h3>Flujo de Empaques por Fecha y Hora ({datosLinea.length} registros)</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={datosLinea} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="fechaHora" stroke="var(--text-muted)" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(label: any) => 'Fecha: ' + label} formatter={(value: any) => [value, 'Bultos']} />
                <Legend />
                <Line type="monotone" dataKey="bultos" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Bultos por empaque" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="ed02-chart">
            <h3>Tareas y Bultos por Dia</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosBarra}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="dia" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="tareas" fill="#3b82f6" radius={[4,4,0,0]} name="Tareas" />
                <Bar dataKey="bultos" fill="#10b981" radius={[4,4,0,0]} name="Bultos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="ed02-tabla-container">
        <table className="ed02-tabla">
          <thead><tr><th>Dia</th><th>Tareas</th><th>Bultos</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando...</td></tr> :
              datosBarra.length === 0 ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin datos</td></tr> :
              datosBarra.map((d: any, i: number) => <tr key={i}><td>{d.dia}</td><td>{d.tareas}</td><td>{d.bultos}</td></tr>)
            }
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ED02Dashboard;
