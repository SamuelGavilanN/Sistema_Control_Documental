import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import './TK01.css';

const tiposProblema = ['Empaque dañado', 'Error en datos', 'Etiqueta ilegible', 'Faltante de bultos', 'Sobrante de bultos', 'Problema con QR', 'Problema con código de barras', 'Otro'];

interface Ticket {
  id: string; numero_ticket: string; numero_empaque: string; area: string;
  prioridad: string; estado: string; tipo_problema: string; descripcion: string;
  creado_por: string; creado_en: string;
}

interface Respuesta {
  id: string; ticket_id: string; mensaje: string; creado_por: string; creado_en: string;
}

const TK01CrearTicket: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [area, setArea] = useState('Portico');
  const [tipoProblema, setTipoProblema] = useState('');
  const [prioridad, setPrioridad] = useState('Media');
  const [numeroEmpaque, setNumeroEmpaque] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [asignadoA, setAsignadoA] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [misTickets, setMisTickets] = useState<Ticket[]>([]);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});

  useEffect(() => { cargarUsuarios(); cargarMisTickets(); }, []);
  useEffect(() => { const intervalo = setInterval(() => cargarMisTickets(), 15000); return () => clearInterval(intervalo); }, []);
  useEffect(() => { if (ticketSeleccionado) cargarRespuestas(ticketSeleccionado.id); }, [ticketSeleccionado]);

  const cargarUsuarios = async () => {
    const result = await supabase.from('usuarios').select('id, nombre, apellido, rol') as any;
    if (result.data) {
      const m: Record<string, string> = {};
      result.data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido} (${u.rol})`; });
      setUsuarios(result.data); setNombresUsuarios(m);
    }
  };

  const cargarMisTickets = async () => {
    const usuario = auth.getUsuario(); if (!usuario) return;
    const result = await supabase.from('tickets').select('*').eq('creado_por', usuario.id).order('creado_en', { ascending: false }) as any;
    if (result.data) setMisTickets(result.data);
  };

  const cargarRespuestas = async (ticketId: string) => {
    const result = await supabase.from('ticket_respuestas').select('*').eq('ticket_id', ticketId).order('creado_en', { ascending: true }) as any;
    if (result.data) setRespuestas(result.data);
  };

  const handleCrear = async () => {
    if (!tipoProblema || !descripcion || !area) return;
    const usuario = auth.getUsuario();
    const numeroTicket = 'TK-' + Date.now().toString().slice(-8);
    const result = await supabase.from('tickets').insert([{ numero_ticket: numeroTicket, area, tipo_problema: tipoProblema, prioridad, numero_empaque: numeroEmpaque, descripcion, estado: 'Abierto', creado_por: usuario?.id, asignado_a: asignadoA || null }]).select('id').single() as any;
    if (result.error) { alert('Error: ' + result.error.message); return; }
    const ticketId = result.data?.id; if (!ticketId) return;
    const usuariosANotificar = usuarios.filter(u => u.rol === 'Admin' || u.rol === 'Owner' || (area === 'Portico' && u.rol === 'Portico') || (area === 'Portico' && u.rol === 'Lider'));
    for (const u of usuariosANotificar) { await supabase.from('ticket_notificaciones').insert([{ ticket_id: ticketId, usuario_id: u.id }]) as any; }
    setMensaje('Ticket ' + numeroTicket + ' creado'); setTipoProblema(''); setPrioridad('Media'); setNumeroEmpaque(''); setDescripcion(''); setAsignadoA('');
    setTimeout(() => { setMensaje(''); setShowModal(false); }, 1500); cargarMisTickets();
  };

  const handleResponder = async () => {
    if (!respuesta.trim() || !ticketSeleccionado) return;
    const usuario = auth.getUsuario();
    await supabase.from('ticket_respuestas').insert([{ ticket_id: ticketSeleccionado.id, mensaje: respuesta, creado_por: usuario?.id }]) as any;
    
    // Notificar a los que participan (Portico, Admin, Owner)
    const usersANotificar = usuarios.filter(u => u.rol === 'Admin' || u.rol === 'Owner' || u.rol === 'Portico' || u.rol === 'Lider');
    for (const u of usersANotificar) {
      if (u.id !== usuario?.id) {
        await supabase.from('ticket_notificaciones').insert([{ ticket_id: ticketSeleccionado.id, usuario_id: u.id }]) as any;
      }
    }

    setRespuesta(''); cargarMisTickets(); cargarRespuestas(ticketSeleccionado.id);
  };

  const getEstadoBadge = (e: string) => { switch (e) { case 'Abierto': return { color: '#dc2626', bg: '#fef2f2' }; case 'En Proceso': return { color: '#b45309', bg: '#fef3c7' }; case 'Resuelto': return { color: '#15803d', bg: '#dcfce7' }; default: return { color: '#64748b', bg: '#f1f5f9' }; } };
  const getPrioridadBadge = (p: string) => { switch (p) { case 'Urgente': return { color: '#dc2626', bg: '#fef2f2' }; case 'Alta': return { color: '#ea580c', bg: '#fff7ed' }; case 'Media': return { color: '#b45309', bg: '#fef3c7' }; default: return { color: '#15803d', bg: '#dcfce7' }; } };

  return (
    <div className="tk01-view">
      <div className="tk01-header"><h2>Mis Tickets</h2><button className="ed01-btn-save" onClick={() => setShowModal(true)}>+ Nuevo Ticket</button></div>
      
      <div className="ed03-layout">
        <div className="ed03-lista">
          <div className="ed03-tabla-container" style={{ maxHeight: '500px' }}>
            <table className="ed03-tabla"><thead><tr><th>Ticket</th><th>Empaque</th><th>Tipo</th><th>Prioridad</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>
              {misTickets.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No has creado tickets</td></tr> :
                misTickets.map(t => { const eb = getEstadoBadge(t.estado); const pb = getPrioridadBadge(t.prioridad);
                  return <tr key={t.id} className={ticketSeleccionado?.id === t.id ? 'selected' : ''} onClick={() => setTicketSeleccionado(t)} style={{ cursor: 'pointer' }}><td className="ed03-ticket-id">{t.numero_ticket}</td><td>{t.numero_empaque || '-'}</td><td>{t.tipo_problema}</td><td><span style={{ background: pb.bg, color: pb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.prioridad}</span></td><td><span style={{ background: eb.bg, color: eb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.estado}</span></td><td>{new Date(t.creado_en).toLocaleDateString('es-CL')}</td></tr>;
                })
              }
            </tbody></table>
          </div>
        </div>

        {ticketSeleccionado && (
          <div className="ed03-detalle">
            <h3>{ticketSeleccionado.numero_ticket}</h3>
            <div className="ed03-detalle-info"><p><strong>Tipo:</strong> {ticketSeleccionado.tipo_problema}</p><p><strong>Prioridad:</strong> {ticketSeleccionado.prioridad}</p><p><strong>Empaque:</strong> {ticketSeleccionado.numero_empaque || '-'}</p><p><strong>Estado:</strong> {ticketSeleccionado.estado}</p><p><strong>Descripcion:</strong> {ticketSeleccionado.descripcion}</p></div>
            
            <div className="ed03-chat">
              <h4>Conversación</h4>
              <div className="ed03-chat-mensajes">
                {respuestas.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '10px' }}>Sin respuestas aún</p> :
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

            {ticketSeleccionado.estado !== 'Resuelto' && ticketSeleccionado.estado !== 'Cerrado' && (
              <div className="ed03-respuesta"><textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Escribe un mensaje..." rows={2} /><div className="ed03-respuesta-acciones"><button onClick={handleResponder}>Enviar</button></div></div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="ed01-modal-overlay" onClick={() => setShowModal(false)}><div className="ed01-modal" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}><div className="ed01-modal-header"><h2>Nuevo Ticket</h2><button className="ed01-modal-close" onClick={() => setShowModal(false)}>×</button></div><div className="ed01-modal-body"><div className="ed01-field"><label>Area *</label><select value={area} onChange={e => setArea(e.target.value)}><option value="Portico">Portico</option></select></div><div className="ed01-field"><label>Tipo de Problema *</label><select value={tipoProblema} onChange={e => setTipoProblema(e.target.value)}><option value="">Seleccionar...</option>{tiposProblema.map(t => <option key={t} value={t}>{t}</option>)}</select></div><div className="ed01-field"><label>Prioridad</label><select value={prioridad} onChange={e => setPrioridad(e.target.value)}><option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option><option value="Urgente">Urgente</option></select></div><div className="ed01-field"><label>Numero de Empaque (Pallet)</label><input type="text" value={numeroEmpaque} onChange={e => setNumeroEmpaque(e.target.value)} placeholder="Obligatorio para Portico" /></div><div className="ed01-field"><label>Descripcion *</label><textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4} placeholder="Describe el problema..." /></div><div className="ed01-field"><label>Asignar a (opcional)</label><select value={asignadoA} onChange={e => setAsignadoA(e.target.value)}><option value="">Sin asignar</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.rol})</option>)}</select></div>{mensaje && <div style={{ padding: '10px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '13px' }}>{mensaje}</div>}</div><div className="ed01-modal-footer"><button className="ed01-btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button><button className="ed01-btn-save" onClick={handleCrear}>Crear Ticket</button></div></div></div>
      )}
    </div>
  );
};

export default TK01CrearTicket;
