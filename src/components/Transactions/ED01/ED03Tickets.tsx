import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import './ED03Tickets.css';

interface Ticket {
  id: string; numero_ticket: string; area: string; tipo_problema: string;
  prioridad: string; numero_empaque: string; descripcion: string;
  estado: string; creado_por: string; asignado_a: string; creado_en: string;
}

const ED03Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});

  useEffect(() => { cargarTickets(); cargarUsuarios(); }, []);
  useEffect(() => { const intervalo = setInterval(() => cargarTickets(), 15000); return () => clearInterval(intervalo); }, []);

  const cargarUsuarios = async () => {
    const result = await supabase.from('usuarios').select('id, nombre, apellido') as any;
    if (result.data) { const m: Record<string, string> = {}; result.data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido}`; }); setNombresUsuarios(m); }
  };

  const cargarTickets = async () => {
    const result = await supabase.from('tickets').select('*').eq('area', 'Portico').order('creado_en', { ascending: false }) as any;
    if (result.data) setTickets(result.data);
  };

  const handleResponder = async () => {
    if (!respuesta.trim() || !ticketSeleccionado) return;
    const usuario = auth.getUsuario();
    await supabase.from('ticket_respuestas').insert([{ ticket_id: ticketSeleccionado.id, mensaje: respuesta, creado_por: usuario?.id }]) as any;
    if (ticketSeleccionado.estado === 'Abierto') {
      await supabase.from('tickets').update({ estado: 'En Proceso' }).eq('id', ticketSeleccionado.id) as any;
    }
    setRespuesta(''); cargarTickets();
  };

  const handleResolver = async () => {
    if (!ticketSeleccionado) return;
    await supabase.from('tickets').update({ estado: 'Resuelto', resuelto_en: new Date().toISOString() }).eq('id', ticketSeleccionado.id) as any;
    cargarTickets(); setTicketSeleccionado(null);
  };

  const getPrioridadBadge = (p: string) => {
    switch (p) { case 'Urgente': return { color: '#dc2626', bg: '#fef2f2' }; case 'Alta': return { color: '#ea580c', bg: '#fff7ed' }; case 'Media': return { color: '#b45309', bg: '#fef3c7' }; default: return { color: '#15803d', bg: '#dcfce7' }; }
  };
  const getEstadoBadge = (e: string) => {
    switch (e) { case 'Abierto': return { color: '#dc2626', bg: '#fef2f2' }; case 'En Proceso': return { color: '#b45309', bg: '#fef3c7' }; case 'Resuelto': return { color: '#15803d', bg: '#dcfce7' }; default: return { color: '#64748b', bg: '#f1f5f9' }; }
  };

  return (
    <div className="ed03-view">
      <div className="ed03-header"><h2>Bandeja de Tickets · Portico</h2></div>
      <div className="ed03-layout">
        <div className="ed03-lista">
          <div className="ed03-tabla-container">
            <table className="ed03-tabla"><thead><tr><th>Ticket</th><th>Tipo</th><th>Prioridad</th><th>Empaque</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>
              {tickets.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>No hay tickets</td></tr> :
                tickets.map(t => {
                  const pb = getPrioridadBadge(t.prioridad); const eb = getEstadoBadge(t.estado);
                  return <tr key={t.id} className={ticketSeleccionado?.id === t.id ? 'selected' : ''} onClick={() => setTicketSeleccionado(t)} style={{ cursor: 'pointer' }}><td className="ed03-ticket-id">{t.numero_ticket}</td><td>{t.tipo_problema}</td><td><span style={{ background: pb.bg, color: pb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.prioridad}</span></td><td>{t.numero_empaque || '-'}</td><td><span style={{ background: eb.bg, color: eb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.estado}</span></td><td>{new Date(t.creado_en).toLocaleDateString('es-CL')}</td></tr>;
                })
              }
            </tbody></table>
          </div>
        </div>
        {ticketSeleccionado && (
          <div className="ed03-detalle">
            <h3>{ticketSeleccionado.numero_ticket}</h3>
            <div className="ed03-detalle-info"><p><strong>Tipo:</strong> {ticketSeleccionado.tipo_problema}</p><p><strong>Prioridad:</strong> {ticketSeleccionado.prioridad}</p><p><strong>Empaque:</strong> {ticketSeleccionado.numero_empaque || '-'}</p><p><strong>Estado:</strong> {ticketSeleccionado.estado}</p><p><strong>Descripcion:</strong> {ticketSeleccionado.descripcion}</p></div>
            {ticketSeleccionado.estado !== 'Resuelto' && ticketSeleccionado.estado !== 'Cerrado' && (
              <div className="ed03-respuesta"><textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Escribe una respuesta..." rows={3} /><div className="ed03-respuesta-acciones"><button onClick={handleResponder}>Responder</button><button onClick={handleResolver} className="ed03-btn-resolver">Marcar como Resuelto</button></div></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ED03Tickets;
