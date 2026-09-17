// src/components/Transactions/BD/BD01Usuarios.tsx

import React, { useState, useEffect } from 'react';
import { auth } from '../../../lib/auth';
import { apiFetch } from '../../../lib/apiClient';
import './BD01.css';

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
  { id: 'ed-lotes', label: 'ED04 Almacén Lotes' },
  { id: 'sd', label: 'SD01 Salida Despacho' },
  { id: 'sd-informe-bultos', label: 'SD02 Informe Bultos Desp.' },
  { id: 'sd-informe-unidades', label: 'SD03 Informe Un Desp' },
  { id: 'sd-analisis-bultos', label: 'SD04 Análisis Bultos Desp' },
  { id: 'sd-estado-carga', label: 'SD05 Estado de Carga' },
  { id: 'sd-pedidos-especiales', label: 'SD06 Pedidos Especiales' },
  { id: 'sd-comparativa-cd01', label: 'SD07 Comparativa CD01 vs WMS' },
  { id: 'ut', label: 'UT01 Correlativo QR' },
  { id: 'ut-revision', label: 'UT02 Revisión Pallet' },
  { id: 'bd-usuarios', label: 'BD01 Usuarios' },
  { id: 'bd-locales', label: 'BD02 Locales' },
];

const BD01Usuarios: React.FC = () => {
  const [usuarios, setUsuarios]: any = useState([]);
  const [cargando, setCargando]: any = useState(true);
  const [showModal, setShowModal]: any = useState(false);
  const [showPermisosModal, setShowPermisosModal]: any = useState(false);
  const [usuarioEditar, setUsuarioEditar]: any = useState(null);
  const [permisosUsuario, setPermisosUsuario]: any = useState([]);
  const [form, setForm]: any = useState({ nombre: '', apellido: '', usuario: '', password: '', rol: 'Auditor' });
  const [mensaje, setMensaje]: any = useState({ tipo: '', texto: '' });

  useEffect(() => { cargarUsuarios(); }, []);

  const cargarUsuarios = async () => {
    setCargando(true);
    try {
      const data = await apiFetch<any[]>('/usuarios?select=*&order=nombre.asc');
      if (data) setUsuarios(data);
    } catch (e) {
      console.error('Error cargando usuarios:', e);
    }
    setCargando(false);
  };

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
  };

  const handleGuardar = async () => {
    if (!form.nombre || !form.apellido || !form.usuario) {
      mostrarMensaje('error', 'Completa todos los campos');
      return;
    }

    try {
      if (usuarioEditar) {
        // --- Editar usuario existente ---
        // Solo se actualizan nombre, apellido, usuario y rol.
        // El cambio de contraseña requiere service_role (Fase 5).
        const updateData: any = {
          nombre: form.nombre,
          apellido: form.apellido,
          usuario: form.usuario,
          rol: form.rol
        };

        await apiFetch('/usuarios?id=eq.' + usuarioEditar.id, {
          method: 'PATCH',
          body: JSON.stringify(updateData)
        });
      } else {
        // --- Crear usuario nuevo ---
        // ⚠️ Con Supabase Auth, la creación requiere service_role.
        // Se implementará con una Edge Function en Fase 5.
        mostrarMensaje(
          'error',
          'La creación de usuarios se implementará en la próxima fase. ' +
          'Por ahora, los usuarios deben crearse desde Supabase Auth.'
        );
        return;
      }

      setShowModal(false);
      setUsuarioEditar(null);
      cargarUsuarios();
      mostrarMensaje('success', usuarioEditar ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
    } catch (e: any) {
      console.error('Error:', e);
      mostrarMensaje('error', 'Error al guardar usuario: ' + (e.message || ''));
    }
  };

  const handleEditar = (u: Usuario) => {
    setUsuarioEditar(u);
    setForm({ nombre: u.nombre, apellido: u.apellido, usuario: u.usuario, password: '', rol: u.rol });
    setShowModal(true);
  };

  const handleToggleActivo = async (u: Usuario) => {
    try {
      await apiFetch('/usuarios?id=eq.' + u.id, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !u.activo })
      });

      cargarUsuarios();
      mostrarMensaje('success', u.activo ? 'Usuario desactivado' : 'Usuario activado');
    } catch (e: any) {
      console.error('Error:', e);
      mostrarMensaje('error', 'Error al cambiar estado: ' + (e.message || ''));
    }
  };

  const handleAbrirPermisos = async (u: Usuario) => {
    setUsuarioEditar(u);
    try {
      const data = await apiFetch<any[]>('/usuario_permisos?select=transaccion_id&usuario_id=eq.' + u.id + '&activo=eq.true');
      setPermisosUsuario(data?.map((p: any) => p.transaccion_id) || []);
    } catch (e) {
      console.error('Error cargando permisos:', e);
    }
    setShowPermisosModal(true);
  };

  const togglePermiso = (tid: string) => {
    if (permisosUsuario.includes(tid)) setPermisosUsuario(permisosUsuario.filter((p: string) => p !== tid));
    else setPermisosUsuario([...permisosUsuario, tid]);
  };

  const handleGuardarPermisos = async () => {
    if (!usuarioEditar) return;
    try {
      // 1. Eliminar permisos actuales
      await apiFetch('/usuario_permisos?usuario_id=eq.' + usuarioEditar.id, {
        method: 'DELETE'
      });

      // 2. Insertar los nuevos
      if (permisosUsuario.length > 0) {
        await apiFetch('/usuario_permisos', {
          method: 'POST',
          body: JSON.stringify(permisosUsuario.map((tid: string) => ({
            usuario_id: usuarioEditar.id,
            transaccion_id: tid,
            activo: true
          })))
        });
      }

      setShowPermisosModal(false);
      cargarUsuarios();
      mostrarMensaje('success', 'Permisos actualizados correctamente');
    } catch (e: any) {
      mostrarMensaje('error', 'Error al guardar permisos: ' + (e.message || ''));
    }
  };

  const getRolBadge = (rol: string) => {
    const badges: any = {
      'Owner': { color: '#1d4ed8', bg: '#dbeafe' },
      'Admin': { color: '#7c3aed', bg: '#ede9fe' },
      'Administrativo': { color: '#0891b2', bg: '#cffafe' },
      'Lider': { color: '#059669', bg: '#d1fae5' },
      'Auditor': { color: '#d97706', bg: '#fef3c7' },
      'Portico': { color: '#dc2626', bg: '#fef2f2' },
    };
    const badge = badges[rol] || { color: '#64748b', bg: '#f1f5f9' };
    return (
      <span style={{
        padding: '3px 10px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 600,
        background: badge.bg,
        color: badge.color
      }}>
        {rol}
      </span>
    );
  };

  return (
    <div className="bd01-view">
      {mensaje.texto && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 2000,
          padding: '14px 24px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          animation: 'sd01SlideIn 0.3s ease',
          background: mensaje.tipo === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
          color: mensaje.tipo === 'success' ? 'var(--success-text)' : 'var(--error-text)',
          border: mensaje.tipo === 'success' ? '1px solid var(--success-border)' : '1px solid var(--error-border)'
        }}>
          {mensaje.texto}
        </div>
      )}

      <div className="bd01-header">
        <h2>Administración de Usuarios</h2>
        <button className="ad01-btn-nueva" onClick={() => { setUsuarioEditar(null); setForm({ nombre: '', apellido: '', usuario: '', password: '', rol: 'Auditor' }); setShowModal(true); }}>+ Nuevo Usuario</button>
      </div>

      <div className="ed03-tabla-container">
        <table className="ed03-tabla">
          <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Activo</th><th style={{ width: '200px' }}>Acciones</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando...</td></tr> :
              usuarios.map((u: any) => (
                <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.5 }}>
                  <td>{u.nombre} {u.apellido}</td>
                  <td>{u.usuario}</td>
                  <td>{getRolBadge(u.rol)}</td>
                  <td><span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: u.activo ? 'var(--success-bg)' : 'var(--error-bg)', color: u.activo ? 'var(--success-text)' : 'var(--error-text)' }}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
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
        <div className="sd01-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sd01-modal" style={{ maxWidth: '500px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="sd01-modal-header">
              <h2>{usuarioEditar ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button className="sd01-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="sd01-modal-body">
              {!usuarioEditar && (
                <div style={{
                  background: 'var(--warning-bg)',
                  color: 'var(--warning-text)',
                  border: '1px solid var(--warning-border)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  marginBottom: '16px',
                  fontSize: '12px'
                }}>
                  ⚠️ La creación de usuarios se implementará en la próxima fase.
                  Por ahora, los usuarios deben crearse desde el panel de Supabase Auth.
                </div>
              )}
              <div className="sd01-form-group">
                <label className="sd01-form-label">Nombre</label>
                <input className="sd01-form-input" value={form.nombre} onChange={(e: any) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="sd01-form-group">
                <label className="sd01-form-label">Apellido</label>
                <input className="sd01-form-input" value={form.apellido} onChange={(e: any) => setForm({ ...form, apellido: e.target.value })} />
              </div>
              <div className="sd01-form-group">
                <label className="sd01-form-label">Usuario</label>
                <input className="sd01-form-input" value={form.usuario} onChange={(e: any) => setForm({ ...form, usuario: e.target.value })} />
              </div>
              {usuarioEditar && (
                <div className="sd01-form-group">
                  <label className="sd01-form-label">Contraseña</label>
                  <input className="sd01-form-input" type="password" value="" disabled placeholder="Gestionar desde Supabase Auth" />
                  <small style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    El cambio de contraseña se gestiona desde Supabase Auth
                  </small>
                </div>
              )}
              <div className="sd01-form-group">
                <label className="sd01-form-label">Rol</label>
                <select className="sd01-form-select" value={form.rol} onChange={(e: any) => setForm({ ...form, rol: e.target.value })}>
                  <option value="Owner">Owner</option>
                  <option value="Admin">Admin</option>
                  <option value="Lider">Lider</option>
                  <option value="Portico">Portico</option>
                </select>
              </div>
            </div>
            <div className="sd01-modal-footer">
              <button className="sd01-btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="sd01-btn-save" onClick={handleGuardar} disabled={!usuarioEditar}>
                {usuarioEditar ? 'Guardar' : 'Crear (no disponible)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermisosModal && usuarioEditar && (
        <div className="sd01-modal-overlay" onClick={() => setShowPermisosModal(false)}>
          <div className="sd01-modal" style={{ maxWidth: '550px' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="sd01-modal-header">
              <h2>Permisos - {usuarioEditar.nombre} {usuarioEditar.apellido}</h2>
              <button className="sd01-modal-close" onClick={() => setShowPermisosModal(false)}>×</button>
            </div>
            <div className="sd01-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {TRANSACCIONES.map((t: any) => (
                  <label
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      background: 'var(--bg-section)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      transition: 'all 0.15s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={permisosUsuario.includes(t.id)}
                      onChange={() => togglePermiso(t.id)}
                      style={{ accentColor: '#1d4ed8', width: '16px', height: '16px' }}
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="sd01-modal-footer">
              <button className="sd01-btn-cancel" onClick={() => setShowPermisosModal(false)}>Cancelar</button>
              <button className="sd01-btn-save" onClick={handleGuardarPermisos}>Guardar Permisos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BD01Usuarios;