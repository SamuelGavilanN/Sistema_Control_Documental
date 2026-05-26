import React, { useState, useEffect } from 'react';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (datos: any) => void;
  ticket: any;
  modo: 'crear' | 'ver';
}

const tiposProblema = [
  'Empaque dañado',
  'Error en datos',
  'Etiqueta ilegible',
  'Faltante de bultos',
  'Sobrante de bultos',
  'Problema con QR',
  'Problema con código de barras',
  'Otro'
];

const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, onGuardar, ticket, modo }) => {
  const [tipoProblema, setTipoProblema] = useState('');
  const [prioridad, setPrioridad] = useState('Media');
  const [numeroEmpaque, setNumeroEmpaque] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (isOpen && ticket) {
      setTipoProblema(ticket.tipo_problema || '');
      setPrioridad(ticket.prioridad || 'Media');
      setNumeroEmpaque(ticket.numero_empaque || '');
      setDescripcion(ticket.descripcion || '');
    } else if (isOpen && !ticket) {
      setTipoProblema('');
      setPrioridad('Media');
      setNumeroEmpaque('');
      setDescripcion('');
    }
  }, [isOpen, ticket]);

  const handleGuardar = () => {
    if (!tipoProblema || !descripcion) return;
    onGuardar({ tipo_problema: tipoProblema, prioridad, numero_empaque: numeroEmpaque, descripcion });
  };

  if (!isOpen) return null;

  return (
    <div className="ed01-modal-overlay" onClick={onClose}>
      <div className="ed01-modal" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
        <div className="ed01-modal-header"><h2>{modo === 'crear' ? 'Nuevo Ticket' : 'Ticket ' + ticket?.numero_ticket}</h2><button className="ed01-modal-close" onClick={onClose}>×</button></div>
        <div className="ed01-modal-body">
          <div className="ed01-field"><label>Tipo de Problema *</label><select value={tipoProblema} onChange={e => setTipoProblema(e.target.value)} disabled={modo === 'ver'}>{tiposProblema.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="ed01-field"><label>Prioridad</label><select value={prioridad} onChange={e => setPrioridad(e.target.value)} disabled={modo === 'ver'}><option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option><option value="Urgente">Urgente</option></select></div>
          <div className="ed01-field"><label>Numero de Empaque</label><input type="text" value={numeroEmpaque} onChange={e => setNumeroEmpaque(e.target.value)} placeholder="Opcional" disabled={modo === 'ver'} /></div>
          <div className="ed01-field"><label>Descripcion *</label><textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4} placeholder="Describe el problema..." disabled={modo === 'ver'} /></div>
          {modo === 'ver' && ticket && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafd', borderRadius: '8px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 4px' }}>Estado: <strong>{ticket.estado}</strong></p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0' }}>Creado: {new Date(ticket.creado_en).toLocaleString('es-CL')}</p>
            </div>
          )}
        </div>
        <div className="ed01-modal-footer">
          <button className="ed01-btn-cancel" onClick={onClose}>{modo === 'ver' ? 'Cerrar' : 'Cancelar'}</button>
          {modo === 'crear' && <button className="ed01-btn-save" onClick={handleGuardar}>Crear Ticket</button>}
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
