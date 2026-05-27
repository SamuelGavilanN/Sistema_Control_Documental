import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import './ED03Tickets.css';

interface Ticket {
  id: string; numero_ticket: string; area: string; tipo_problema: string;
  prioridad: string; numero_empaque: string; descripcion: string;
  estado: string; creado_por: string; asignado_a: string; creado_en: string;
}

interface Respuesta {
  id: string; ticket_id: string; mensaje: string; creado_por: string; creado_en: string;
}

const ED03Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});

  useEffect(() => { cargarTickets(); cargarUsuarios(); }, []);
  useEffect(() => { const intervalo = setInterval(() => cargarTickets(), 15000); return () => clearInterval(intervalo); }, []);

  // Polling del chat cada 5 segundos cuando hay ticket seleccionado
  useEffect(() => {
    if (!ticketSeleccionado) return;
    cargarRespuestas(ticketSeleccionado.id);
    const intervalo = setInterval(() => cargarRespuestas(ticketSeleccionado.id), 5000);
    return () => clearInterval(intervalo);
  }, [ticketSeleccionado]);

  const cargarUsuarios = async () => {
    const result = await supabase.from('usuarios').select('id, nombre, apellido, rol') as any;
    if (result.data) { const m: Record<string, string> = {}; result.data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido} (${u.rol})`; }); setNombresUsuarios(m); }
  };

  const cargarTickets = async () => {
    const result = await supabase.from('tickets').select('*').eq('area', 'Portico').order('creado_en', { ascending: false }) as any;
    if (result.data) setTickets(result.data);
  };

  const cargarRespuestas = async (ticketId: string) => {
    const result = await supabase.from('ticket_respuestas').select('*').eq('ticket_id', ticketId).order('creado_en', { ascending: true }) as any;
    if (result.data) setRespuestas(result.data);
  };

  const handleVerTicket = (ticket: Ticket) => {
    setTicketSeleccionado(ticket);
    setShowChatModal(true);
  };

  const handleResponder = async () => {
    if (!respuesta.trim() || !ticketSeleccionado) return;
    const usuario = auth.getUsuario();
    await supabase.from('ticket_respuestas').insert([{ ticket_id: ticketSeleccionado.id, mensaje: respuesta, creado_por: usuario?.id }]) as any;
    
    if (ticketSeleccionado.estado === 'Abierto') {
      await supabase.from('tickets').update({ estado: 'En Proceso' }).eq('id', ticketSeleccionado.id) as any;
    }

    if (ticketSeleccionado.creado_por !== usuario?.id) {
      await supabase.from('ticket_notificaciones').insert([{ ticket_id: ticketSeleccionado.id, usuario_id: ticketSeleccionado.creado_por }]) as any;
    }

    setRespuesta(''); cargarTickets(); cargarRespuestas(ticketSeleccionado.id);
  };

  const handleResolver = async () => {
    if (!ticketSeleccionado) return;
    const usuario = auth.getUsuario();
    await supabase.from('ticket_respuestas').insert([{ ticket_id: ticketSeleccionado.id, mensaje: 'Ticket marcado como resuelto', creado_por: usuario?.id }]) as any;
    await supabase.from('tickets').update({ estado: 'Resuelto', resuelto_en: new Date().toISOString() }).eq('id', ticketSeleccionado.id) as any;
    
    if (ticketSeleccionado.creado_por !== usuario?.id) {
      await supabase.from('ticket_notificaciones').insert([{ ticket_id: ticketSeleccionado.id, usuario_id: ticketSeleccionado.creado_por }]) as any;
    }

    cargarTickets(); cargarRespuestas(ticketSeleccionado.id);
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
      <div className="ed03-tabla-container">
        <table className="ed03-tabla"><thead><tr><th>Ticket</th><th>Tipo</th><th>Prioridad</th><th>Empaque</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>
          {tickets.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>No hay tickets</td></tr> :
            tickets.map(t => {
              const pb = getPrioridadBadge(t.prioridad); const eb = getEstadoBadge(t.estado);
              return <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => handleVerTicket(t)}>
                <td className="ed03-ticket-id">{t.numero_ticket}</td><td>{t.tipo_problema}</td>
                <td><span style={{ background: pb.bg, color: pb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.prioridad}</span></td>
                <td>{t.numero_empaque || '-'}</td>
                <td><span style={{ background: eb.bg, color: eb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.estado}</span></td>
                <td>{new Date(t.creado_en).toLocaleDateString('es-CL')}</td>
                <td><button className="ed03-btn-ver">Ver</button></td>
              </tr>;
            })
          }
        </tbody></table>
      </div>

      {/* Modal de chat */}
      {showChatModal && ticketSeleccionado && (
        <div className="ed01-modal-overlay" onClick={() => setShowChatModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '650px', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header">
              <h2>{ticketSeleccionado.numero_ticket}</h2>
              <button className="ed01-modal-close" onClick={() => setShowChatModal(false)}>×</button>
            </div>
            <div className="ed01-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Info del ticket */}
              <div className="ed03-modal-info">
                <div className="ed03-info-row"><span>Tipo:</span><strong>{ticketSeleccionado.tipo_problema}</strong></div>
                <div className="ed03-info-row"><span>Prioridad:</span><strong>{ticketSeleccionado.prioridad}</strong></div>
                <div className="ed03-info-row"><span>Empaque:</span><strong>{ticketSeleccionado.numero_empaque || '-'}</strong></div>
                <div className="ed03-info-row"><span>Estado:</span><strong>{ticketSeleccionado.estado}</strong></div>
                <div className="ed03-info-row"><span>Descripcion:</span><strong>{ticketSeleccionado.descripcion}</strong></div>
              </div>

              {/* Chat */}
              <div className="ed03-chat">
                <h4>Conversacion</h4>
                <div className="ed03-chat-mensajes">
                  {respuestas.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '10px' }}>Sin respuestas</p> :
                    respuestas.map(r => {
                      const esMio = r.creado_por === auth.getUsuario()?.id;
                      return (
                        <div key={r.id} className={`ed03-mensaje ${esMio ? 'mio' : 'otro'}`}>
                          <div className="ed03-mensaje-header"><span className="ed03-mensaje-usuario">{nombresUsuarios[r.creado_por] || 'Usuario'}</span><span className="ed03-mensaje-hora">{new Date(r.creado_en).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span></div>
                          <div className="ed03-mensaje-texto">{r.mensaje}</div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>

              {/* Campo de respuesta con separación */}
              {ticketSeleccionado.estado !== 'Resuelto' && ticketSeleccionado.estado !== 'Cerrado' && (
                <div className="ed03-respuesta-separada">
                  <textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Escribe una respuesta..." rows={2} />
                  <div className="ed03-respuesta-acciones">
                    <button onClick={handleResponder}>Responder</button>
                    <button onClick={handleResolver} className="ed03-btn-resolver">Marcar como Resuelto</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ED03Tickets;
