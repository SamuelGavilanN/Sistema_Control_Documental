import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import './ED03Tickets.css';

interface Ticket {
  id: string;
  numero_ticket: string;
  area: string;
  tipo_problema: string;
  prioridad: string;
  numero_empaque: string;
  descripcion: string;
  estado: string;
  creado_por: string;
  asignado_a: string;
  creado_en: string;
  sin_leer?: number;
}

interface Respuesta {
  id: string;
  ticket_id: string;
  mensaje: string;
  creado_por: string;
  creado_en: string;
}

const ED03Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsFinalizados, setTicketsFinalizados] = useState<Ticket[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null);
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [respuesta, setRespuesta] = useState('');
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});
  const [contadoresSinLeer, setContadoresSinLeer] = useState<Record<string, number>>({});

  useEffect(() => {
    cargarTickets();
    cargarUsuarios();
  }, []);

  useEffect(() => {
    if (ticketSeleccionado) {
      cargarRespuestas(ticketSeleccionado.id);
      marcarComoLeidas(ticketSeleccionado.id);
    }
  }, [ticketSeleccionado]);

  const cargarUsuarios = async () => {
    const { data } = await supabase.from('usuarios').select('id, nombre, apellido');
    if (data) {
      const m: Record<string, string> = {};
      data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido}`; });
      setNombresUsuarios(m);
    }
  };

  const cargarTickets = async () => {
    setCargando(true);
    const usuario = auth.getUsuario();
    
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('area', 'Portico')
      .order('creado_en', { ascending: false });

    if (data) {
      const activos = data.filter(t => t.estado !== 'Resuelto' && t.estado !== 'Cerrado');
      const finalizados = data.filter(t => t.estado === 'Resuelto' || t.estado === 'Cerrado');
      
      // Calcular mensajes sin leer por ticket
      const contadores: Record<string, number> = {};
      for (const t of data) {
        const { data: notifs } = await supabase
          .from('ticket_notificaciones')
          .select('*')
          .eq('usuario_id', usuario?.id)
          .eq('visto', false) as any;
        
        // Contar respuestas no vistas (simplificado: notificaciones no vistas del ticket)
        if (notifs) {
          const noVistas = notifs.filter((n: any) => n.ticket_id === t.id).length;
          contadores[t.id] = noVistas;
        }
      }
      
      setContadoresSinLeer(contadores);
      setTickets(activos);
      setTicketsFinalizados(finalizados);
    }
    setCargando(false);
  };

  const cargarRespuestas = async (ticketId: string) => {
    const { data } = await supabase
      .from('ticket_respuestas')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('creado_en', { ascending: true });
    
    if (data) setRespuestas(data);
  };

  const marcarComoLeidas = async (ticketId: string) => {
    const usuario = auth.getUsuario();
    await supabase
      .from('ticket_notificaciones')
      .update({ visto: true })
      .eq('ticket_id', ticketId)
      .eq('usuario_id', usuario?.id) as any;
    
    setContadoresSinLeer(prev => ({ ...prev, [ticketId]: 0 }));
  };

  const handleResponder = async () => {
    if (!respuesta.trim() || !ticketSeleccionado) return;
    const usuario = auth.getUsuario();
    
    await supabase.from('ticket_respuestas').insert([{
      ticket_id: ticketSeleccionado.id,
      mensaje: respuesta,
      creado_por: usuario?.id
    }]);

    if (ticketSeleccionado.estado === 'Abierto') {
      await supabase.from('tickets').update({ estado: 'En Proceso' }).eq('id', ticketSeleccionado.id);
    }

    setRespuesta('');
    cargarRespuestas(ticketSeleccionado.id);
    cargarTickets();
  };

  const handleResolver = async () => {
    if (!ticketSeleccionado) return;
    await supabase.from('tickets').update({ estado: 'Resuelto', resuelto_en: new Date().toISOString() }).eq('id', ticketSeleccionado.id);
    cargarTickets();
    setTicketSeleccionado(null);
  };

  const getPrioridadBadge = (p: string) => {
    switch (p) { case 'Urgente': return { color: '#dc2626', bg: '#fef2f2' }; case 'Alta': return { color: '#ea580c', bg: '#fff7ed' }; case 'Media': return { color: '#b45309', bg: '#fef3c7' }; default: return { color: '#15803d', bg: '#dcfce7' }; }
  };
  const getEstadoBadge = (e: string) => {
    switch (e) { case 'Abierto': return { color: '#dc2626', bg: '#fef2f2' }; case 'En Proceso': return { color: '#b45309', bg: '#fef3c7' }; case 'Resuelto': return { color: '#15803d', bg: '#dcfce7' }; default: return { color: '#64748b', bg: '#f1f5f9' }; }
  };

  const renderTabla = (lista: Ticket[], titulo: string) => (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>{titulo} ({lista.length})</h3>
      <div className="ed03-tabla-container" style={{ maxHeight: '350px' }}>
        <table className="ed03-tabla">
          <thead>
            <tr><th>Ticket</th><th>Tipo</th><th>Prioridad</th><th>Empaque</th><th>Estado</th><th>Fecha</th><th></th></tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Sin tickets</td></tr>
            ) : (
              lista.map(t => {
                const pb = getPrioridadBadge(t.prioridad);
                const eb = getEstadoBadge(t.estado);
                const sinLeer = contadoresSinLeer[t.id] || 0;
                return (
                  <tr key={t.id} className={ticketSeleccionado?.id === t.id ? 'selected' : ''} onClick={() => setTicketSeleccionado(t)} style={{ cursor: 'pointer' }}>
                    <td className="ed03-ticket-id">
                      {t.numero_ticket}
                      {sinLeer > 0 && (
                        <span style={{ background: '#dc2626', color: 'white', fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '10px', marginLeft: '6px' }}>{sinLeer}</span>
                      )}
                    </td>
                    <td>{t.tipo_problema}</td>
                    <td><span style={{ background: pb.bg, color: pb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.prioridad}</span></td>
                    <td>{t.numero_empaque || '-'}</td>
                    <td><span style={{ background: eb.bg, color: eb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.estado}</span></td>
                    <td>{new Date(t.creado_en).toLocaleDateString('es-CL')}</td>
                    <td><button className="ed03-btn-ver">Ver</button></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="ed03-view">
      <div className="ed03-header"><h2>Bandeja de Tickets · Portico</h2></div>

      <div className="ed03-layout">
        <div className="ed03-lista">
          {cargando ? <p>Cargando...</p> : (
            <>
              {renderTabla(tickets, 'Tickets Pendientes')}
              {renderTabla(ticketsFinalizados, 'Tickets Finalizados')}
            </>
          )}
        </div>

        {ticketSeleccionado && (
          <div className="ed03-detalle">
            <h3>{ticketSeleccionado.numero_ticket}</h3>
            <div className="ed03-detalle-info">
              <p><strong>Tipo:</strong> {ticketSeleccionado.tipo_problema}</p>
              <p><strong>Prioridad:</strong> {ticketSeleccionado.prioridad}</p>
              <p><strong>Empaque:</strong> {ticketSeleccionado.numero_empaque || '-'}</p>
              <p><strong>Estado:</strong> {ticketSeleccionado.estado}</p>
              <p><strong>Descripcion:</strong> {ticketSeleccionado.descripcion}</p>
            </div>

            {/* Respuestas */}
            <div className="ed03-respuestas-lista">
              <h4>Historial</h4>
              {respuestas.length === 0 ? <p style={{ fontSize: '12px', color: '#94a3b8' }}>Sin respuestas</p> : (
                respuestas.map(r => (
                  <div key={r.id} className="ed03-respuesta-item">
                    <p className="ed03-respuesta-texto">{r.mensaje}</p>
                    <span className="ed03-respuesta-info">{nombresUsuarios[r.creado_por] || 'Usuario'} · {new Date(r.creado_en).toLocaleString('es-CL')}</span>
                  </div>
                ))
              )}
            </div>

            {ticketSeleccionado.estado !== 'Resuelto' && ticketSeleccionado.estado !== 'Cerrado' && (
              <div className="ed03-respuesta">
                <textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Escribe una respuesta..." rows={3} />
                <div className="ed03-respuesta-acciones">
                  <button onClick={handleResponder}>Responder</button>
                  <button onClick={handleResolver} className="ed03-btn-resolver">Marcar como Resuelto</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ED03Tickets;
