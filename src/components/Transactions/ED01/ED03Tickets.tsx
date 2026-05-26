import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import TicketModal from './TicketModal';
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

const ED03Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'ver'>('crear');

  useEffect(() => {
    cargarTickets();
  }, []);

  const cargarTickets = async () => {
    setCargando(true);
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('area', 'Portico')
      .order('creado_en', { ascending: false });
    
    if (data) setTickets(data);
    setCargando(false);
  };

  const handleCrear = () => {
    setModoModal('crear');
    setTicketSeleccionado(null);
    setShowModal(true);
  };

  const handleVer = (ticket: Ticket) => {
    setModoModal('ver');
    setTicketSeleccionado(ticket);
    setShowModal(true);
  };

  const handleGuardarTicket = async (datos: any) => {
    const usuario = auth.getUsuario();
    const { error } = await supabase.from('tickets').insert([{
      ...datos,
      area: 'Portico',
      creado_por: usuario?.id,
      numero_ticket: 'TK-' + Date.now().toString().slice(-8)
    }]);
    
    if (error) { alert('Error: ' + error.message); return; }
    setShowModal(false);
    cargarTickets();
  };

  const getPrioridadBadge = (p: string) => {
    switch (p) {
      case 'Urgente': return { color: '#dc2626', bg: '#fef2f2' };
      case 'Alta': return { color: '#ea580c', bg: '#fff7ed' };
      case 'Media': return { color: '#b45309', bg: '#fef3c7' };
      default: return { color: '#15803d', bg: '#dcfce7' };
    }
  };

  const getEstadoBadge = (e: string) => {
    switch (e) {
      case 'Abierto': return { color: '#dc2626', bg: '#fef2f2' };
      case 'En Proceso': return { color: '#b45309', bg: '#fef3c7' };
      case 'Resuelto': return { color: '#15803d', bg: '#dcfce7' };
      case 'Cerrado': return { color: '#64748b', bg: '#f1f5f9' };
      default: return { color: '#64748b', bg: '#f1f5f9' };
    }
  };

  return (
    <div className="ed03-view">
      <div className="ed03-header">
        <h2>Bandeja de Tickets · Portico</h2>
        <button className="ed03-btn-crear" onClick={handleCrear}>+ Nuevo Ticket</button>
      </div>

      <div className="ed03-tabla-container">
        <table className="ed03-tabla">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Tipo</th>
              <th>Prioridad</th>
              <th>Empaque</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>Cargando...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>No hay tickets</td></tr>
            ) : (
              tickets.map(t => {
                const pb = getPrioridadBadge(t.prioridad);
                const eb = getEstadoBadge(t.estado);
                return (
                  <tr key={t.id} onClick={() => handleVer(t)} style={{ cursor: 'pointer' }}>
                    <td className="ed03-ticket-id">{t.numero_ticket}</td>
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

      <TicketModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onGuardar={handleGuardarTicket}
        ticket={ticketSeleccionado}
        modo={modoModal}
      />
    </div>
  );
};

export default ED03Tickets;
