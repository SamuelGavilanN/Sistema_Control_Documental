// src/components/Transactions/BD/BD01Usuarios.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import './BD01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS = { 'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G' };

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  usuario: string;
  password: string;
  rol: string;
  activo: boolean;
}

const TRANSACCIONES = [
  { id: 'ed', label: 'ED01 Registro Empaque' },
  { id: 'ed-history', label: 'ED02 Dashboard Produccion' },
  { id: 'ed-tickets', label: 'ED03 BT Portico' },
  { id: 'ad', label: 'AD01 Gestión Auditoría' },
  { id: 'ad-captura', label: 'AD02 Captura Física' },
  { id: 'ad-dashboard', label: 'AD03 Dashboard' },
  { id: 'rd', label: 'RD01 Ingreso Devolución' },
  { id: 'rd-salida', label: 'RD02 Salida Devolución' },
  { id: 'rd-informe', label: 'RD03 Informe' },
  { id: 'rd-dashboard', label: 'RD04 Dashboard' },
  { id: 'sd', label: 'SD01 Salida Despacho' },
  { id: 'pk', label: 'PK01 Crear Pedido' },
  { id: 'pk-captura', label: 'PK02 Capturar LPN' },
  { id: 'ut', label: 'UT01 Correlativo QR' },
  { id: 'tk', label: 'TK01 Crear Ticket' },
  { id: 'tk-dashboard', label: 'TK02 Dashboard Tickets' },
  { id: 'bd-usuarios', label: 'BD01 Usuarios' },
  { id: 'bd-locales', label: 'BD02 Locales' },
];

const BD01Usuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermisosModal, setShowPermisosModal] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
  const [permisosUsuario, setPermisosUsuario] = useState<string[]>([]);
  const [form, setForm] = useState({ nombre: '', apellido: '', usuario: '', password: '', rol: 'Auditor' });

  useEffect(() => { cargarUsuarios(); }, []);

  const cargarUsuarios = async () => {
    setCargando(true);
    const { data } = await supabase.from('usuarios').select('*').order('nombre') as any;
    if (data) setUsuarios(data);
    setCargando(false);
  };

  const handleGuardar = async () => {
    if (!form.nombre || !form.apellido || !form.usuario) { alert('Completa todos los campos'); return; }
    if (usuarioEditar) {
      await supabase.from('usuarios').update({ nombre: form.nombre, apellido: form.apellido, usuario: form.usuario, password: form.password || undefined, rol: form.rol }).eq('id', usuarioEditar.id) as any;
    } else {
      if (!form.password) { alert('Ingresa una contraseña'); return; }
      await supabase.from('usuarios').insert([{ nombre: form.nombre, apellido: form.apellido, usuario: form.usuario, password: form.password, rol: form.rol, activo: true }]) as any;
    }
    setShowModal(false); setUsuarioEditar(null); cargarUsuarios();
  };

  const handleEditar = (u: Usuario) => {
    setUsuarioEditar(u); setForm({ nombre: u.nombre, apellido: u.apellido, usuario: u.usuario, password: '', rol: u.rol }); setShowModal(true);
  };

  const handleToggleActivo = async (u: Usuario) => {
    await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id) as any; cargarUsuarios();
  };

  const handleAbrirPermisos = async (u: Usuario) => {
    setUsuarioEditar(u);
    try {
      const resp = await fetch(`${API_URL}/usuario_permisos?select=transaccion_id&usuario_id=eq.${u.id}&activo=eq.true`, { headers: HEADERS });
      const data = await resp.json();
      setPermisosUsuario(data?.map((p: any) => p.transaccion_id) || []);
    } catch (e) {}
    setShowPermisosModal(true);
  };

  const togglePermiso = (tid: string) => {
    if (permisosUsuario.includes(tid)) setPermisosUsuario(permisosUsuario.filter(p => p !== tid));
    else setPermisosUsuario([...permisosUsuario, tid]);
  };

  const handleGuardarPermisos = async () => {
    if (!usuarioEditar) return;
    try {
      await fetch(`${API_URL}/usuario_permisos?usuario_id=eq.${usuarioEditar.id}`, { method: 'DELETE', headers: HEADERS });
      if (permisosUsuario.length > 0) {
        await fetch(`${API_URL}/usuario_permisos`, { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify(permisosUsuario.map(tid => ({ usuario_id: usuarioEditar!.id, transaccion_id: tid, activo: true }))) });
      }
    } catch (e) {}
    setShowPermisosModal(false); cargarUsuarios();
  };

  return (
    <div className="bd01-view">
      <div className="bd01-header"><h2>Administración de Usuarios</h2><button className="ad01-btn-nueva" onClick={() => { setUsuarioEditar(null); setForm({ nombre: '', apellido: '', usuario: '', password: '', rol: 'Auditor' }); setShowModal(true); }}>+ Nuevo Usuario</button></div>

      <div className="ed03-tabla-container">
        <table className="ed03-tabla">
          <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Activo</th><th style={{ width: '200px' }}>Acciones</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr> :
              usuarios.map(u => (
                <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.5 }}>
                  <td>{u.nombre} {u.apellido}</td><td>{u.usuario}</td><td>{u.rol}</td>
                  <td><span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: u.activo ? '#dcfce7' : '#fef2f2', color: u.activo ? '#15803d' : '#dc2626' }}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div className="ad01-acciones">
                      <button className="ad01-btn-detalle" onClick={() => handleEditar(u)}>Editar</button>
                      <button className="ad01-btn-limpiar" onClick={() => handleToggleActivo(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>
                      <button className="ad01-btn-exportar" onClick={() => handleAbrirPermisos(u)}>Permisos</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="ed01-modal-overlay" onClick={() => setShowModal(false)}><div className="ed01-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
          <div className="ed01-modal-header"><h2>{usuarioEditar ? 'Editar Usuario' : 'Nuevo Usuario'}</h2><button className="ed01-modal-close" onClick={() => setShowModal(false)}>×</button></div>
          <div className="ed01-modal-body">
            <div className="ed01-field"><label>Nombre</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
            <div className="ed01-field"><label>Apellido</label><input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} /></div>
            <div className="ed01-field"><label>Usuario</label><input value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })} /></div>
            <div className="ed01-field"><label>Contraseña {usuarioEditar ? '(dejar vacío para no cambiar)' : ''}</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div className="ed01-field"><label>Rol</label><select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}><option value="Auditor">Auditor</option><option value="Portico">Portico</option><option value="Lider">Lider</option><option value="Admin">Admin</option><option value="Owner">Owner</option></select></div>
          </div>
          <div className="ed01-modal-footer"><button className="ed01-btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button><button className="ed01-btn-save" onClick={handleGuardar}>Guardar</button></div>
        </div></div>
      )}

      {showPermisosModal && usuarioEditar && (
        <div className="ed01-modal-overlay" onClick={() => setShowPermisosModal(false)}><div className="ed01-modal" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
          <div className="ed01-modal-header"><h2>Permisos - {usuarioEditar.nombre} {usuarioEditar.apellido}</h2><button className="ed01-modal-close" onClick={() => setShowPermisosModal(false)}>×</button></div>
          <div className="ed01-modal-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TRANSACCIONES.map(t => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#f8fafd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={permisosUsuario.includes(t.id)} onChange={() => togglePermiso(t.id)} />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          <div className="ed01-modal-footer"><button className="ed01-btn-cancel" onClick={() => setShowPermisosModal(false)}>Cancelar</button><button className="ed01-btn-save" onClick={handleGuardarPermisos}>Guardar Permisos</button></div>
        </div></div>
      )}
    </div>
  );
};

export default BD01Usuarios;
