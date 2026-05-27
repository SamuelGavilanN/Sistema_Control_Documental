import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import './TK01.css';

const tiposProblema = [
  'Empaque dañado', 'Error en datos', 'Etiqueta ilegible',
  'Faltante de bultos', 'Sobrante de bultos',
  'Problema con QR', 'Problema con código de barras', 'Otro'
];

interface Ticket {
  id: string;
  numero_ticket: string;
  numero_empaque: string;
  prioridad: string;
  estado: string;
  tipo_problema: string;
  descripcion: string;
  creado_en: string;
  creado_por: string;
}

interface Respuesta {
  id: string;
  ticket_id: string;
  mensaje: string;
  creado_por: string;
  creado_en: string;
}

const TK01CrearTicket: React.FC = () => {
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showVerModal, setShowVerModal] = useState(false);
  const [ticketVer, setTicketVer] = useState<Ticket | null>(null);
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [area, setArea] = useState('Portico');
  const [tipoProblema, setTipoProblema] = useState('');
  const [prioridad, setPrioridad] = useState('Media');
  const [numeroEmpaque, setNumeroEmpaque] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [asignadoA, setAsignadoA] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [misTickets, setMisTickets] = useState<Ticket[]>([]);
  const [contadoresSinLeer, setContadoresSinLeer] = useState<Record<string, number>>({});
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});

  useEffect(() => { cargarUsuarios(); cargarMisTickets(); }, []);

  const cargarUsuarios = async () => {
    const result = await supabase.from('usuarios').select('id, nombre, apellido, rol');
    if (result.data) {
      setUsuarios(result.data);
      const m: Record<string, string> = {};
      result.data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido}`; });
      setNombresUsuarios(m);
    }
  };

  const cargarMisTickets = async () => {
    const usuario = auth.getUsuario();
    if (!usuario) return;
    const result = await supabase.from('tickets').select('*').eq('creado_por', usuario.id).order('creado_en', { ascending: false }) as any;
    if (result.data) {
      const contadores: Record<string, number> = {};
      for (const t of result.data) {
        const { data: notifs } = await supabase.from('ticket_notificaciones').select('*').eq('ticket_id', t.id).eq('usuario_id', usuario.id).eq('visto', false) as any;
        contadores[t.id] = notifs?.length || 0;
      }
      setContadoresSinLeer(contadores);
      setMisTickets(result.data);
    }
  };

  const handleCrear = async () => {
    if (!tipoProblema || !descripcion || !area) return;
    const usuario = auth.getUsuario();
    const numeroTicket = 'TK-' + Date.now().toString().slice(-8);

    const result = await supabase.from('tickets').insert([{
      numero_ticket: numeroTicket, area, tipo_problema: tipoProblema, prioridad,
      numero_empaque: numeroEmpaque, descripcion, estado: 'Abierto',
      creado_por: usuario?.id, asignado_a: asignadoA || null
    }]).select('id').single() as any;

    if (result.error) { alert('Error: ' + result.error.message); return; }
    const ticketId = result.data?.id;
    if (!ticketId) return;

    const usuariosANotificar = usuarios.filter(u =>
      u.rol === 'Admin' || u.rol === 'Owner' || (area === 'Portico' && u.rol === 'Portico') || (area === 'Portico' && u.rol === 'Lider')
    );
    for (const u of usuariosANotificar) {
      await supabase.from('ticket_notificaciones').insert([{ ticket_id: ticketId, usuario_id: u.id }]) as any;
    }

    setMensaje('Ticket ' + numeroTicket + ' creado');
    setTipoProblema(''); setPrioridad('Media'); setNumeroEmpaque(''); setDescripcion(''); setAsignadoA('');
    setTimeout(() => { setMensaje(''); setShowCrearModal(false); }, 1500);
    cargarMisTickets();
  };

  const abrirVerModal = async (ticket: Ticket) => {
    setTicketVer(ticket);
    setRespuestaTexto('');
    const usuario = auth.getUsuario();
    await supabase.from('ticket_notificaciones').update({ visto: true }).eq('ticket_id', ticket.id).eq('usuario_id', usuario?.id) as any;
    setContadoresSinLeer(prev => ({ ...prev, [ticket.id]: 0 }));
    const { data } = await supabase.from('ticket_respuestas').select('*').eq('ticket_id', ticket.id).order('creado_en', { ascending: true });
    setRespuestas(data || []);
    setShowVerModal(true);
  };

  const handleResponder = async () => {
    if (!respuestaTexto.trim() || !ticketVer) return;
    const usuario = auth.getUsuario();
    await supabase.from('ticket_respuestas').insert([{ ticket_id: ticketVer.id, mensaje: respuestaTexto, creado_por: usuario?.id }]);

    const usuariosANotificar = new Set<string>();
    if (ticketVer.creado_por !== usuario?.id) usuariosANotificar.add(ticketVer.creado_por);
    
    const { data: usuariosPortico } = await supabase.from('usuarios').select('id').in('rol', ['Portico', 'Lider', 'Admin', 'Owner']);
    if (usuariosPortico) usuariosPortico.forEach((u: any) => { if (u.id !== usuario?.id) usuariosANotificar.add(u.id); });
    
    const { data: respuestasData } = await supabase.from('ticket_respuestas').select('creado_por').eq('ticket_id', ticketVer.id);
    if (respuestasData) respuestasData.forEach((r: any) => { if (r.creado_por !== usuario?.id) usuariosANotificar.add(r.creado_por); });
    
    for (const uid of usuariosANotificar) {
      await supabase.from('ticket_notificaciones').insert([{ ticket_id: ticketVer.id, usuario_id: uid }]) as any;
    }

    setRespuestaTexto('');
    const { data } = await supabase.from('ticket_respuestas').select('*').eq('ticket_id', ticketVer.id).order('creado_en', { ascending: true });
    setRespuestas(data || []);
    cargarMisTickets();
  };

  const getEstadoBadge = (e: string) => {
    switch (e) { case 'Abierto': return { color: '#dc2626', bg: '#fef2f2' }; case 'En Proceso': return { color: '#b45309', bg: '#fef3c7' }; case 'Resuelto': return { color: '#15803d', bg: '#dcfce7' }; default: return { color: '#64748b', bg: '#f1f5f9' }; }
  };
  const getPrioridadBadge = (p: string) => {
    switch (p) { case 'Urgente': return { color: '#dc2626', bg: '#fef2f2' }; case 'Alta': return { color: '#ea580c', bg: '#fff7ed' }; case 'Media': return { color: '#b45309', bg: '#fef3c7' }; default: return { color: '#15803d', bg: '#dcfce7' }; }
  };

  return (
    <div className="tk01-view">
      <div className="tk01-header"><h2>Crear Ticket</h2><button className="ed01-btn-save" onClick={() => setShowCrearModal(true)}>+ Nuevo Ticket</button></div>
      <div className="ed03-tabla-container" style={{ maxHeight: '500px' }}>
        <table className="ed03-tabla">
          <thead><tr><th style={{ width: '130px' }}>Ticket</th><th style={{ width: '130px' }}>Empaque</th><th style={{ width: '150px' }}>Tipo</th><th style={{ width: '90px' }}>Prioridad</th><th style={{ width: '100px' }}>Estado</th><th style={{ width: '100px' }}>Fecha</th></tr></thead>
          <tbody>
            {misTickets.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No has creado tickets</td></tr> : misTickets.map(t => {
              const eb = getEstadoBadge(t.estado); const pb = getPrioridadBadge(t.prioridad); const sinLeer = contadoresSinLeer[t.id] || 0;
              return (
                <tr key={t.id} onClick={() => abrirVerModal(t)} style={{ cursor: 'pointer' }}>
                  <td className="ed03-ticket-id">{t.numero_ticket}{sinLeer > 0 && <span style={{ background: '#dc2626', color: 'white', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '10px', marginLeft: '8px', display: 'inline-block' }}>{sinLeer}</span>}</td>
                  <td>{t.numero_empaque || '-'}</td><td>{t.tipo_problema}</td>
                  <td><span style={{ background: pb.bg, color: pb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.prioridad}</span></td>
                  <td><span style={{ background: eb.bg, color: eb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.estado}</span></td>
                  <td>{new Date(t.creado_en).toLocaleDateString('es-CL')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCrearModal && (
        <div className="ed01-modal-overlay" onClick={() => setShowCrearModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header"><h2>Nuevo Ticket</h2><button className="ed01-modal-close" onClick={() => setShowCrearModal(false)}>×</button></div>
            <div className="ed01-modal-body">
              <div className="ed01-field"><label>Area *</label><select value={area} onChange={e => setArea(e.target.value)}><option value="Portico">Portico</option></select></div>
              <div className="ed01-field"><label>Tipo de Problema *</label><select value={tipoProblema} onChange={e => setTipoProblema(e.target.value)}><option value="">Seleccionar...</option>{tiposProblema.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="ed01-field"><label>Prioridad</label><select value={prioridad} onChange={e => setPrioridad(e.target.value)}><option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option><option value="Urgente">Urgente</option></select></div>
              <div className="ed01-field"><label>Numero de Empaque (Pallet)</label><input type="text" value={numeroEmpaque} onChange={e => setNumeroEmpaque(e.target.value)} placeholder="Obligatorio para Portico" /></div>
              <div className="ed01-field"><label>Descripcion *</label><textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4} placeholder="Describe el problema..." /></div>
              <div className="ed01-field"><label>Asignar a (opcional)</label><select value={asignadoA} onChange={e => setAsignadoA(e.target.value)}><option value="">Sin asignar</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.rol})</option>)}</select></div>
              {mensaje && <div style={{ padding: '10px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '13px' }}>{mensaje}</div>}
            </div>
            <div className="ed01-modal-footer"><button className="ed01-btn-cancel" onClick={() => setShowCrearModal(false)}>Cancelar</button><button className="ed01-btn-save" onClick={handleCrear}>Crear Ticket</button></div>
          </div>
        </div>
      )}

      {showVerModal && ticketVer && (
        <div className="ed01-modal-overlay" onClick={() => setShowVerModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header"><h2>{ticketVer.numero_ticket}</h2><button className="ed01-modal-close" onClick={() => setShowVerModal(false)}>×</button></div>
            <div className="ed01-modal-body">
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', fontSize: '13px' }}><div><strong>Tipo:</strong> {ticketVer.tipo_problema}</div><div><strong>Prioridad:</strong> {ticketVer.prioridad}</div><div><strong>Empaque:</strong> {ticketVer.numero_empaque || '-'}</div><div><strong>Estado:</strong> {ticketVer.estado}</div></div>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}><strong>Descripcion:</strong> {ticketVer.descripcion}</p>
              <div style={{ marginBottom: '16px', maxHeight: '250px', overflowY: 'auto' }}><h4 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Historial de Respuestas</h4>
                {respuestas.length === 0 ? <p style={{ fontSize: '12px', color: '#94a3b8' }}>Sin respuestas</p> : respuestas.map(r => (
                  <div key={r.id} style={{ background: '#f8fafd', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', border: '1px solid #eef0f5' }}><p style={{ fontSize: '13px', color: '#1e293b', margin: '0 0 4px' }}>{r.mensaje}</p><span style={{ fontSize: '10px', color: '#94a3b8' }}>{nombresUsuarios[r.creado_por] || 'Usuario'} · {new Date(r.creado_en).toLocaleString('es-CL')}</span></div>
                ))}
              </div>
              {ticketVer.estado !== 'Resuelto' && ticketVer.estado !== 'Cerrado' && (
                <div>
                  <textarea value={respuestaTexto} onChange={e => setRespuestaTexto(e.target.value)} placeholder="Escribe una respuesta..." rows={3} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', marginBottom: '10px' }} />
                  <button className="ed01-btn-save" onClick={handleResponder}>Responder</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TK01CrearTicket;
