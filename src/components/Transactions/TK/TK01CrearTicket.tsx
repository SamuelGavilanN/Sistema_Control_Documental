import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import './TK01.css';

const tiposProblema = [
  'Empaque dañado', 'Error en datos', 'Etiqueta ilegible',
  'Faltante de bultos', 'Sobrante de bultos',
  'Problema con QR', 'Problema con código de barras', 'Otro'
];

const TK01CrearTicket: React.FC = () => {
  const [area, setArea] = useState('Portico');
  const [tipoProblema, setTipoProblema] = useState('');
  const [prioridad, setPrioridad] = useState('Media');
  const [numeroEmpaque, setNumeroEmpaque] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [asignadoA, setAsignadoA] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => { cargarUsuarios(); }, []);

  const cargarUsuarios = async () => {
    const { data } = await supabase.from('usuarios').select('id, nombre, apellido, rol');
    if (data) setUsuarios(data);
  };

  const handleCrear = async () => {
    if (!tipoProblema || !descripcion || !area) return;
    const usuario = auth.getUsuario();
    const numeroTicket = 'TK-' + Date.now().toString().slice(-8);

    const { error, data } = await supabase.from('tickets').insert([{
      numero_ticket: numeroTicket,
      area,
      tipo_problema: tipoProblema,
      prioridad,
      numero_empaque: numeroEmpaque,
      descripcion,
      estado: 'Abierto',
      creado_por: usuario?.id,
      asignado_a: asignadoA || null
    }]).select('id').single();

    if (error) { alert('Error: ' + error.message); return; }

    // Crear notificaciones para usuarios de esta área y admins
    const usuariosANotificar = usuarios.filter(u => u.rol === 'Admin' || u.rol === 'Owner' || (area === 'Portico' && u.rol === 'Portico') || (area === 'Portico' && u.rol === 'Lider'));
    
    for (const u of usuariosANotificar) {
      await supabase.from('ticket_notificaciones').insert([{
        ticket_id: data.id,
        usuario_id: u.id
      }]);
    }

    setMensaje('Ticket ' + numeroTicket + ' creado exitosamente');
    setTipoProblema(''); setPrioridad('Media'); setNumeroEmpaque(''); setDescripcion(''); setAsignadoA('');
    setTimeout(() => setMensaje(''), 3000);
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
    </div>
  );
};

export default TK01CrearTicket;
