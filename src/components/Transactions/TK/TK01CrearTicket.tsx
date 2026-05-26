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
  creado_en: string;
}

const TK01CrearTicket: React.FC = () => {
  const [area, setArea] = useState('Portico');
  const [tipoProblema, setTipoProblema] = useState('');
  const [prioridad, setPrioridad] = useState('Media');
  const [numeroEmpaque, setNumeroEmpaque] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [asignadoA, setAsignadoA] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [misTickets, setMisTickets] = useState<Ticket[]>([]);

  useEffect(() => { 
    cargarUsuarios(); 
    cargarMisTickets();
  }, []);

  const cargarUsuarios = async () => {
    const result = await supabase.from('usuarios').select('id, nombre, apellido, rol');
    if (result.data) setUsuarios(result.data);
  };

  const cargarMisTickets = async () => {
    const usuario = auth.getUsuario();
    if (!usuario) return;
    const result = await supabase.from('tickets').select('*').eq('creado_por', usuario.id).order('creado_en', { ascending: false });
    if (result.data) setMisTickets(result.data);
  };

  const handleCrear = async () => {
    if (!tipoProblema || !descripcion || !area) return;
    const usuario = auth.getUsuario();
    const numeroTicket = 'TK-' + Date.now().toString().slice(-8);

    const result = await supabase.from('tickets').insert([{
      numero_ticket: numeroTicket, area, tipo_problema: tipoProblema,
      prioridad, numero_empaque: numeroEmpaque, descripcion,
      estado: 'Abierto', creado_por: usuario?.id, asignado_a: asignadoA || null
    }]).select('id').single();

    if (result.error) { alert('Error: ' + result.error.message); return; }
    
    const ticketId = result.data ? (result.data as any).id : null;
    if (!ticketId) { alert('Error al obtener ID del ticket'); return; }

    const usuariosANotificar = usuarios.filter(u => 
      u.rol === 'Admin' || u.rol === 'Owner' || 
      (area === 'Portico' && u.rol === 'Portico') || 
      (area === 'Portico' && u.rol === 'Lider')
    );
    
    for (const u of usuariosANotificar) {
      await supabase.from('ticket_notificaciones').insert([{ ticket_id: ticketId, usuario_id: u.id }]);
    }

    setMensaje('Ticket ' + numeroTicket + ' creado exitosamente');
    setTipoProblema(''); setPrioridad('Media'); setNumeroEmpaque(''); setDescripcion(''); setAsignadoA('');
    setTimeout(() => setMensaje(''), 3000);
    cargarMisTickets();
  };

  const getEstadoBadge = (e: string) => {
    switch (e) {
      case 'Abierto': return { color: '#dc2626', bg: '#fef2f2' };
      case 'En Proceso': return { color: '#b45309', bg: '#fef3c7' };
      case 'Resuelto': return { color: '#15803d', bg: '#dcfce7' };
      default: return { color: '#64748b', bg: '#f1f5f9' };
    }
  };

  const getPrioridadBadge = (p: string) => {
    switch (p) {
      case 'Urgente': return { color: '#dc2626', bg: '#fef2f2' };
      case 'Alta': return { color: '#ea580c', bg: '#fff7ed' };
      case 'Media': return { color: '#b45309', bg: '#fef3c7' };
      default: return { color: '#15803d', bg: '#dcfce7' };
    }
  };

  return (
    <div className="tk01-view">
      <div className="tk01-header"><h2>Crear Ticket</h2></div>
      <div className="tk01-form">
        <div className="ed01-field"><label>Area *</label><select value={area} onChange={e => setArea(e.target.value)}><option value="Portico">Portico</option></select></div>
        <div className="ed01-field"><label>Tipo de Problema *</label><select value={tipoProblema} onChange={e => setTipoProblema(e.target.value)}><option value="">Seleccionar...</option>{tiposProblema.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div className="ed01-field"><label>Prioridad</label><select value={prioridad} onChange={e => setPrioridad(e.target.value)}><option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option><option value="Urgente">Urgente</option></select></div>
        <div className="ed01-field"><label>Numero de Empaque (Pallet)</label><input type="text" value={numeroEmpaque} onChange={e => setNumeroEmpaque(e.target.value)} placeholder="Obligatorio para Portico" /></div>
        <div className="ed01-field"><label>Descripcion *</label><textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4} placeholder="Describe el problema..." /></div>
        <div className="ed01-field"><label>Asignar a (opcional)</label><select value={asignadoA} onChange={e => setAsignadoA(e.target.value)}><option value="">Sin asignar</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.rol})</option>)}</select></div>
        {mensaje && <div style={{ padding: '10px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '13px' }}>{mensaje}</div>}
        <button className="ed01-btn-save" onClick={handleCrear}>Crear Ticket</button>
      </div>

      {/* Tabla de mis tickets */}
      <div style={{ marginTop: '40px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '14px' }}>Mis Solicitudes</h3>
        <div className="ed03-tabla-container" style={{ maxHeight: '400px' }}>
          <table className="ed03-tabla">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Empaque</th>
                <th>Tipo</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {misTickets.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No has creado tickets</td></tr>
              ) : (
                misTickets.map(t => {
                  const eb = getEstadoBadge(t.estado);
                  const pb = getPrioridadBadge(t.prioridad);
                  return (
                    <tr key={t.id}>
                      <td className="ed03-ticket-id">{t.numero_ticket}</td>
                      <td>{t.numero_empaque || '-'}</td>
                      <td>{t.tipo_problema}</td>
                      <td><span style={{ background: pb.bg, color: pb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{t.prioridad}</span></td>
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
    </div>
  );
};

export default TK01CrearTicket;
