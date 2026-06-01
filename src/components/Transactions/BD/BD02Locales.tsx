import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import './BD01.css';

interface Local {
  id: string;
  codigo_local: string;
  nombre_local: string;
  drop_local: string;
  zona: string;
  correo: string;
  activo: boolean;
}

const BD02Locales: React.FC = () => {
  const [locales, setLocales] = useState<Local[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [localEditar, setLocalEditar] = useState<Local | null>(null);
  const [form, setForm] = useState({ codigo_local: '', nombre_local: '', drop_local: '', zona: '', correo: '' });

  useEffect(() => { cargarLocales(); }, []);

  const cargarLocales = async () => {
    setCargando(true);
    const { data } = await supabase.from('locales').select('*').order('codigo_local') as any;
    if (data) setLocales(data);
    setCargando(false);
  };

  const handleGuardar = async () => {
    if (!form.codigo_local || !form.nombre_local) { alert('Código y Nombre son requeridos'); return; }
    if (localEditar) {
      await supabase.from('locales').update({ codigo_local: form.codigo_local, nombre_local: form.nombre_local, drop_local: form.drop_local, zona: form.zona, correo: form.correo }).eq('id', localEditar.id) as any;
    } else {
      await supabase.from('locales').insert([{ codigo_local: form.codigo_local, nombre_local: form.nombre_local, drop_local: form.drop_local, zona: form.zona, correo: form.correo, activo: true }]) as any;
    }
    setShowModal(false); setLocalEditar(null); cargarLocales();
  };

  const handleEditar = (l: Local) => {
    setLocalEditar(l); setForm({ codigo_local: l.codigo_local, nombre_local: l.nombre_local, drop_local: l.drop_local || '', zona: l.zona || '', correo: l.correo || '' }); setShowModal(true);
  };

  const handleToggleActivo = async (l: Local) => {
    await supabase.from('locales').update({ activo: !l.activo }).eq('id', l.id) as any; cargarLocales();
  };

  return (
    <div className="bd01-view">
      <div className="bd01-header"><h2>Administración de Locales</h2><button className="ad01-btn-nueva" onClick={() => { setLocalEditar(null); setForm({ codigo_local: '', nombre_local: '', drop_local: '', zona: '', correo: '' }); setShowModal(true); }}>+ Nuevo Local</button></div>

      <div className="ed03-tabla-container">
        <table className="ed03-tabla">
          <thead><tr><th>Código</th><th>Nombre</th><th>Drop</th><th>Zona</th><th>Correo</th><th>Activo</th><th style={{ width: '140px' }}>Acciones</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr> :
              locales.map(l => (
                <tr key={l.id} style={{ opacity: l.activo ? 1 : 0.5 }}>
                  <td className="ed03-ticket-id">{l.codigo_local}</td><td>{l.nombre_local}</td><td>{l.drop_local || '-'}</td><td>{l.zona || '-'}</td><td>{l.correo || '-'}</td>
                  <td><span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: l.activo ? '#dcfce7' : '#fef2f2', color: l.activo ? '#15803d' : '#dc2626' }}>{l.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div className="ad01-acciones">
                      <button className="ad01-btn-detalle" onClick={() => handleEditar(l)}>Editar</button>
                      <button className="ad01-btn-limpiar" onClick={() => handleToggleActivo(l)}>{l.activo ? 'Desactivar' : 'Activar'}</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="ed01-modal-overlay" onClick={() => setShowModal(false)}><div className="ed01-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
          <div className="ed01-modal-header"><h2>{localEditar ? 'Editar Local' : 'Nuevo Local'}</h2><button className="ed01-modal-close" onClick={() => setShowModal(false)}>×</button></div>
          <div className="ed01-modal-body">
            <div className="ed01-field"><label>Código Local *</label><input value={form.codigo_local} onChange={e => setForm({ ...form, codigo_local: e.target.value })} placeholder="Ej: H007" /></div>
            <div className="ed01-field"><label>Nombre Local *</label><input value={form.nombre_local} onChange={e => setForm({ ...form, nombre_local: e.target.value })} placeholder="Ej: Plaza Egaña" /></div>
            <div className="ed01-field"><label>Drop</label><input value={form.drop_local} onChange={e => setForm({ ...form, drop_local: e.target.value })} placeholder="DROP" /></div>
            <div className="ed01-field"><label>Zona</label><input value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value })} placeholder="Zona" /></div>
            <div className="ed01-field"><label>Correo</label><input value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} placeholder="correo@mail.com" /></div>
          </div>
          <div className="ed01-modal-footer"><button className="ed01-btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button><button className="ed01-btn-save" onClick={handleGuardar}>Guardar</button></div>
        </div></div>
      )}
    </div>
  );
};

export default BD02Locales;
