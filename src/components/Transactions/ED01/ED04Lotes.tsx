// src/components/Transactions/ED/ED04Lotes.tsx

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { auth } from '../../../lib/auth';
import './ED04.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const ED04Lotes: React.FC = () => {
  const [lotes, setLotes]: any = useState([]);
  const [cargando, setCargando]: any = useState(true);
  const [mensaje, setMensaje]: any = useState({ tipo: '', texto: '', visible: false });
  const [mostrarUpload, setMostrarUpload]: any = useState(false);
  const [archivoNombre, setArchivoNombre]: any = useState('');
  const [subiendo, setSubiendo]: any = useState(false);
  const [loteSeleccionado, setLoteSeleccionado]: any = useState(null);
  const fileInputRef: any = useRef(null);
  const usuario: any = auth.getUsuario();

  useEffect(() => {
    cargarLotes();
    const intervalo = setInterval(cargarLotes, 10000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarLotes = async () => {
    try {
      const resp = await fetch(API_URL + '/ed04_lotes?select=*&order=creado_en.desc', { headers: HEADERS });
      const data = await resp.json();
      if (data) {
        setLotes(data);
        // Actualizar lote seleccionado si aún existe
        if (loteSeleccionado) {
          const actualizado = data.find((l: any) => l.id === loteSeleccionado.id);
          if (actualizado) {
            setLoteSeleccionado(actualizado);
          } else {
            setLoteSeleccionado(null);
          }
        }
      }
    } catch (e) {
      console.error('Error cargando lotes:', e);
    }
    setCargando(false);
  };

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  const generarIdLote = () => {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = ahora.getFullYear();
    const random = String(Math.floor(Math.random() * 9000) + 1000);
    return 'LTPL' + dia + mes + anio + random;
  };

  const procesarArchivo = async (file: File) => {
    setArchivoNombre(file.name);
    setSubiendo(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 2) {
        mostrarMensaje('error', 'El archivo está vacío');
        setSubiendo(false);
        return;
      }

      // Extraer empaques de la primera columna
      const empaques = rows.slice(1)
        .map((row: any) => String(row[0] || '').trim())
        .filter((e: string) => e.length > 0);

      if (empaques.length === 0) {
        mostrarMensaje('error', 'No se encontraron empaques en el archivo');
        setSubiendo(false);
        return;
      }

      // Verificar que no haya empaques duplicados con lotes existentes
      const todosLosEmpaquesExistentes: string[] = [];
      try {
        const respExistente = await fetch(API_URL + '/ed04_lote_empaques?select=numero_empaque&limit=10000', { headers: HEADERS });
        const existentes = await respExistente.json();
        if (existentes) {
          existentes.forEach((e: any) => todosLosEmpaquesExistentes.push(e.numero_empaque));
        }
      } catch (e) {}

      const duplicados = empaques.filter((e: string) => todosLosEmpaquesExistentes.includes(e));
      if (duplicados.length > 0) {
        if (!window.confirm('Hay ' + duplicados.length + ' empaques que ya existen en otros lotes. ¿Continuar de todas formas?')) {
          setSubiendo(false);
          return;
        }
      }

      const idLote = generarIdLote();

      // Crear el lote
      const respLote = await fetch(API_URL + '/ed04_lotes', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id_lote: idLote,
          fecha_registro: new Date().toISOString().split('T')[0],
          usuario_registro: usuario?.id,
          total_empaques: empaques.length,
          empaques_usados: 0,
          activo: true
        })
      });

      if (!respLote.ok) {
        const err = await respLote.json();
        mostrarMensaje('error', 'Error al crear lote: ' + (err.message || 'Error desconocido'));
        setSubiendo(false);
        return;
      }

      const loteData = await respLote.json();
      const lote = Array.isArray(loteData) ? loteData[0] : loteData;

      // Insertar empaques en lotes de 100
      let insertados = 0;
      for (let i = 0; i < empaques.length; i += 100) {
        const batch = empaques.slice(i, i + 100).map((emp: string) => ({
          lote_id: lote.id,
          numero_empaque: emp
        }));

        const respBatch = await fetch(API_URL + '/ed04_lote_empaques', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify(batch)
        });

        if (respBatch.ok) {
          insertados += batch.length;
        }
      }

      mostrarMensaje('success', 'Lote ' + idLote + ' creado con ' + insertados + ' empaques');
      setMostrarUpload(false);
      setArchivoNombre('');
      cargarLotes();
    } catch (e: any) {
      console.error('Error procesando archivo:', e);
      mostrarMensaje('error', 'Error al procesar archivo: ' + (e.message || 'Error desconocido'));
    }
    setSubiendo(false);
  };

  const handleEliminarLote = async () => {
    if (!loteSeleccionado) {
      mostrarMensaje('warning', 'Seleccione un lote');
      return;
    }
    if (!window.confirm('¿Está seguro de eliminar el lote ' + loteSeleccionado.id_lote + '?\n\nSe eliminarán todos los empaques asociados.')) return;
    
    try {
      // Eliminar empaques primero (por cascada debería ser automático, pero por si acaso)
      await fetch(API_URL + '/ed04_lote_empaques?lote_id=eq.' + loteSeleccionado.id, {
        method: 'DELETE',
        headers: HEADERS
      });
      
      // Eliminar lote
      const resp = await fetch(API_URL + '/ed04_lotes?id=eq.' + loteSeleccionado.id, {
        method: 'DELETE',
        headers: HEADERS
      });

      if (!resp.ok) {
        const err = await resp.json();
        mostrarMensaje('error', 'Error al eliminar: ' + (err.message || 'Error desconocido'));
        return;
      }

      mostrarMensaje('success', 'Lote ' + loteSeleccionado.id_lote + ' eliminado correctamente');
      setLoteSeleccionado(null);
      cargarLotes();
    } catch (e: any) {
      console.error('Error eliminando lote:', e);
      mostrarMensaje('error', 'Error al eliminar lote');
    }
  };

  const handleToggleActivo = async () => {
    if (!loteSeleccionado) {
      mostrarMensaje('warning', 'Seleccione un lote');
      return;
    }

    const nuevoEstado = !loteSeleccionado.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (!window.confirm('¿' + (nuevoEstado ? 'Activar' : 'Desactivar') + ' el lote ' + loteSeleccionado.id_lote + '?')) return;

    try {
      const resp = await fetch(API_URL + '/ed04_lotes?id=eq.' + loteSeleccionado.id, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoEstado })
      });

      if (!resp.ok) {
        const err = await resp.json();
        mostrarMensaje('error', 'Error al ' + accion + ': ' + (err.message || 'Error desconocido'));
        return;
      }

      mostrarMensaje('success', 'Lote ' + accion + ' correctamente');
      cargarLotes();
    } catch (e: any) {
      mostrarMensaje('error', 'Error al ' + accion + ' lote');
    }
  };

  const getPorcentajeUso = (usados: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((usados / total) * 100);
  };

  const getColorProgreso = (porcentaje: number) => {
    if (porcentaje >= 90) return '#dc2626';
    if (porcentaje >= 60) return '#f59e0b';
    return '#15803d';
  };

  const getColorFondoProgreso = (porcentaje: number) => {
    if (porcentaje >= 90) return '#fef2f2';
    if (porcentaje >= 60) return '#fffbeb';
    return '#dcfce7';
  };

  const formatearFecha = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (cargando && lotes.length === 0) {
    return (
      <div className="ed04-view">
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Cargando lotes...
        </div>
      </div>
    );
  }

  return (
    <div className="ed04-view">
      {mensaje.visible && (
        <div className={'ed04-toast ed04-toast-' + mensaje.tipo}>
          {mensaje.texto}
        </div>
      )}

      <div className="ed04-header">
        <h2>ED04 · Almacén Lotes Etiquetas</h2>
      </div>

      <div className="ed04-toolbar">
        <button className="ed04-btn ed04-btn-primary" onClick={() => setMostrarUpload(!mostrarUpload)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 10V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V10M4.66667 6.66667L8 10M8 10L11.3333 6.66667M8 10V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {mostrarUpload ? 'Ocultar Carga' : 'Cargar Lote'}
        </button>
        <div className="ed04-separator"></div>
        <button className="ed04-btn" onClick={handleToggleActivo} disabled={!loteSeleccionado}>
          {loteSeleccionado?.activo ? 'Desactivar Lote' : 'Activar Lote'}
        </button>
        <button className="ed04-btn ed04-btn-danger" onClick={handleEliminarLote} disabled={!loteSeleccionado}>
          Eliminar Lote
        </button>
      </div>

      {loteSeleccionado && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 14px',
          background: 'var(--bg-section)',
          borderRadius: '8px',
          border: '1px solid var(--info-border)',
          fontSize: '13px',
          color: 'var(--info-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8.00004C14.6667 4.31814 11.6819 1.33337 8 1.33337C4.3181 1.33337 1.33333 4.31814 1.33333 8.00004C1.33333 11.6819 4.3181 14.6667 8 14.6667Z" stroke="#1d4ed8" strokeWidth="1.5"/>
            <path d="M8 5.33337V8.66671" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="11" r="0.666667" fill="#1d4ed8"/>
          </svg>
          <span>Lote seleccionado: <strong>{loteSeleccionado.id_lote}</strong></span>
          <button
            onClick={() => setLoteSeleccionado(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0 4px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {mostrarUpload && (
        <div className="ed04-upload-area">
          <div
            className="ed04-upload-box"
            onClick={() => !subiendo && fileInputRef.current?.click()}
            style={{ cursor: subiendo ? 'wait' : 'pointer', opacity: subiendo ? 0.7 : 1 }}
          >
            {subiendo ? (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span>Procesando archivo...</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{archivoNombre}</span>
              </>
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <span>{archivoNombre ? archivoNombre : 'Seleccionar archivo Excel con números de empaque'}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  El archivo debe contener una columna con los números de empaque (formato PLT...)
                </span>
                {archivoNombre && <span className="ed04-upload-nombre">Click para cambiar archivo</span>}
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e: any) => {
                const file = e.target.files?.[0];
                if (file) procesarArchivo(file);
              }}
              disabled={subiendo}
            />
          </div>
        </div>
      )}

      <div className="ed04-grid">
        {lotes.length === 0 && !cargando ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--text-placeholder)',
            background: 'var(--bg-section)',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '12px', opacity: 0.5 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p style={{ fontSize: '15px', marginBottom: '4px' }}>No hay lotes registrados</p>
            <p style={{ fontSize: '13px' }}>Cargue un archivo Excel para crear un nuevo lote de empaques</p>
          </div>
        ) : (
          lotes.map((lote: any) => {
            const porcentaje = getPorcentajeUso(lote.empaques_usados, lote.total_empaques);
            const colorProgreso = getColorProgreso(porcentaje);
            const colorFondo = getColorFondoProgreso(porcentaje);
            const agotado = porcentaje >= 100;
            const disponible = lote.total_empaques - lote.empaques_usados;

            return (
              <div
                key={lote.id}
                className="ed04-card"
                onClick={() => setLoteSeleccionado(loteSeleccionado && loteSeleccionado.id === lote.id ? null : lote)}
                style={{
                  cursor: 'pointer',
                  borderColor: loteSeleccionado && loteSeleccionado.id === lote.id
                    ? 'var(--border-focus)'
                    : (agotado ? '#fca5a5' : 'var(--border-card)'),
                  opacity: agotado ? 0.75 : 1,
                  boxShadow: loteSeleccionado && loteSeleccionado.id === lote.id
                    ? '0 0 0 2px var(--border-focus)'
                    : 'var(--shadow-sm)'
                }}
              >
                <div className="ed04-card-header">
                  <span className="ed04-card-id">{lote.id_lote}</span>
                  <span className="ed04-card-badge" style={{
                    background: lote.activo ? 'var(--success-bg)' : 'var(--bg-readonly)',
                    color: lote.activo ? 'var(--success-text)' : 'var(--text-muted)'
                  }}>
                    {lote.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="ed04-card-body">
                  <div className="ed04-card-row">
                    <span>Fecha Registro</span>
                    <strong>{formatearFecha(lote.fecha_registro)}</strong>
                  </div>
                  <div className="ed04-card-row">
                    <span>Total Empaques</span>
                    <strong>{lote.total_empaques.toLocaleString('es-CL')}</strong>
                  </div>
                  <div className="ed04-card-row">
                    <span>Usados</span>
                    <strong style={{ color: colorProgreso }}>{lote.empaques_usados.toLocaleString('es-CL')}</strong>
                  </div>
                  <div className="ed04-card-row">
                    <span>Disponibles</span>
                    <strong style={{ color: disponible <= 10 ? '#dc2626' : 'var(--text-primary)' }}>
                      {disponible.toLocaleString('es-CL')}
                    </strong>
                  </div>
                </div>

                <div className="ed04-progress">
                  <div className="ed04-progress-info">
                    <span>Progreso de uso</span>
                    <span style={{ color: colorProgreso, fontWeight: 600 }}>{porcentaje}%</span>
                  </div>
                  <div className="ed04-progress-bar" style={{ background: colorFondo }}>
                    <div
                      className="ed04-progress-fill"
                      style={{
                        width: Math.min(porcentaje, 100) + '%',
                        background: colorProgreso,
                        transition: 'width 0.5s ease'
                      }}
                    ></div>
                  </div>
                </div>

                <div className="ed04-card-footer">
                  <span>Creado: {formatearFecha(lote.fecha_registro)}</span>
                  {agotado && (
                    <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '12px' }}>
                      AGOTADO
                    </span>
                  )}
                  {!agotado && lote.activo && disponible <= 10 && (
                    <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '12px' }}>
                      ¡Quedan {disponible}!
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{
        marginTop: '20px',
        padding: '10px 16px',
        background: 'var(--bg-panel)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        fontSize: '12px',
        color: 'var(--text-muted)',
        textAlign: 'right'
      }}>
        Total de lotes: <strong style={{ color: 'var(--text-primary)' }}>{lotes.length}</strong>
      </div>
    </div>
  );
};

export default ED04Lotes;
