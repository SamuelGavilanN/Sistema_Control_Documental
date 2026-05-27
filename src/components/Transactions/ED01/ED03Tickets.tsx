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
  const [showModal, setShowModal] = useState(false);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null);
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [respuesta, setRespuesta] = useState('');
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});
  const [contadoresSinLeer, setContadoresSinLeer] = useState<Record<string, number>>({});

  useEffect(() => {
    cargarTickets();
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    const { data } = await supabase.from('usuarios').select('id, nombre, apellido');
    if (data) { const m: Record<string, string> = {}; data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido}`; }); setNombresUsuarios(m); }
  };

  const cargarTickets = async () => {
    setCargando(true);
    const usuario = auth.getUsuario();
    const { data } = await supabase.from('tickets').select('*').eq('area', 'Portico').order('creado_en', { ascending: false });
    if (data) {
      const activos = data.filter(t => t.estado !== 'Resuelto' && t.estado !== 'Cerrado');
      const finalizados = data.filter(t => t.estado === 'Resuelto' || t.estado === 'Cerrado');
      setTickets(activos);
      setTicketsFinalizados(finalizados);
      
      const contadores: Record<string, number> = {};
      for (const t of data) {
        const { data: notifs } = await supabase.from('ticket_notificaciones').select('*').eq('ticket_id', t.id).eq('usuario_id', usuario?.id).eq('visto', false) as any;
        contadores[t.id] = notifs?.length || 0;
      }
      setContadoresSinLeer(contadores);
    }
    setCargando(false);
  };

  const abrirModal = async (ticket: Ticket) => {
    setTicketSeleccionado(ticket);
    setShowModal(true);
    const usuario = auth.getUsuario();
    await supabase.from('ticket_notificaciones').update({ visto: true }).eq('ticket_id', ticket.id).eq('usuario_id', usuario?.id) as any;
    setContadoresSinLeer(prev => ({ ...prev, [ticket.id]: 0 }));
    const { data } = await supabase.from('ticket_respuestas').select('*').eq('ticket_id', ticket.id).order('creado_en', { ascending: true });
    if (data) setRespuestas(data);
  };

  const handleResponder = async () => {
    if (!respuesta.trim() || !ticketSeleccionado) return;
    const usuario = auth.getUsuario();
    await supabase.from('ticket_respuestas').insert([{ ticket_id: ticketSeleccionado.id, mensaje: respuesta, creado_por: usuario?.id }]);
    if (ticketSeleccionado.estado === 'Abierto') {
      await supabase.from('tickets').update({ estado: 'En Proceso' }).eq('id', ticketSeleccionado.id);
    }
    setRespuesta('');
    const { data } = await supabase.from('ticket_respuestas').select('*').eq('ticket_id', ticketSeleccionado.id).order('creado_en', { ascending: true });
    if (data) setRespuestas(data);
    cargarTickets();
  };

  const handleResolver = async () => {
    if (!ticketSeleccionado) return;
    await supabase.from('tickets').update({ estado: 'Resuelto', resuelto_en: new Date().toISOString() }).eq('id', ticketSeleccionado.id);
    setShowModal(false);
    setTicketSeleccionado(null);
    cargarTickets();
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
            <tr>
              <th style={{ width: '130px' }}>Ticket</th>
              <th style={{ width: '140px' }}>Tipo</th>
              <th style={{ width: '90px' }}>Prioridad</th>
              <th style={{ width: '130px' }}>Empaque</th>
              <th style={{ width: '100px' }}>Estado</th>
              <th style={{ width: '100px' }}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Sin tickets</td></tr>
            ) : (
              lista.map(t => {
                const pb = getPrioridadBadge(t.prioridad);
                const eb = getEstadoBadge(t.estado);
                const sinLeer = contadoresSinLeer[t.id] || 0;
                return (
                  <tr key={t.id} onClick={() => abrirModal(t)} style={{ cursor: 'pointer' }}>
                    <td className="ed03-ticket-id">
                      {t.numero_ticket}
                      {sinLeer > 0 && <span className="ed03-badge-sinleer">{sinLeer}</span>}
                    </td>
                    <td>{t.tipo_problema}</td>
                    <td><span style={{ background: pb.bg, color: pb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.prioridad}</span></td>
                    <td>{t.numero_empaque || '-'}</td>
                    <td><span style={{ background: eb.bg, color: eb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.estado}</span></td>
                    <td>{new Date(t.creado_en).toLocaleDateString('es-CL')}</td>
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
      {cargando ? <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Cargando...</p> : (
        <>
          {renderTabla(tickets, 'Tickets Pendientes')}
          {renderTabla(ticketsFinalizados, 'Tickets Finalizados')}
        </>
      )}

      {/* Modal para ver/responder ticket */}
      {showModal && ticketSeleccionado && (
        <div className="ed01-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header">
              <h2>{ticketSeleccionado.numero_ticket}</h2>
              <button className="ed01-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="ed01-modal-body">
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div><strong>Tipo:</strong> {ticketSeleccionado.tipo_problema}</div>
                <div><strong>Prioridad:</strong> {ticketSeleccionado.prioridad}</div>
                <div><strong>Empaque:</strong> {ticketSeleccionado.numero_empaque || '-'}</div>
                <div><strong>Estado:</strong> {ticketSeleccionado.estado}</div>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}><strong>Descripcion:</strong> {ticketSeleccionado.descripcion}</p>

              <div className="ed03-respuestas-lista">
                <h4>Historial de Respuestas</h4>
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
                <div>
                  <textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Escribe una respuesta..." rows={3} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', marginBottom: '10px' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="ed01-btn-save" onClick={handleResponder}>Responder</button>
                    <button className="ed01-btn-save" onClick={handleResolver} style={{ background: '#15803d' }}>Marcar como Resuelto</button>
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
