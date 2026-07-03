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

  useEffect(() => { cargarLotes(); }, []);

  const cargarLotes = async () => {
    setCargando(true);
    try {
      const resp = await fetch(API_URL + '/ed04_lotes?select=*&order=creado_en.desc', { headers: HEADERS });
      const data = await resp.json();
      setLotes(data || []);
    } catch (e) {}
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

      const empaques = rows.slice(1)
        .map((row: any) => String(row[0] || '').trim())
        .filter((e: string) => e.length > 0);

      if (empaques.length === 0) {
        mostrarMensaje('error', 'No se encontraron empaques en el archivo');
        setSubiendo(false);
        return;
      }

      const idLote = generarIdLote();

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
        mostrarMensaje('error', 'Error al crear lote: ' + (err.message || ''));
        setSubiendo(false);
        return;
      }

      const loteData = await respLote.json();
      const lote = Array.isArray(loteData) ? loteData[0] : loteData;

      // Insertar empaques en lotes de 100
      for (let i = 0; i < empaques.length; i += 100) {
        const batch = empaques.slice(i, i + 100).map((emp: string) => ({
          lote_id: lote.id,
          numero_empaque: emp
        }));

        await fetch(API_URL + '/ed04_lote_empaques', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify(batch)
        });
      }

      mostrarMensaje('success', 'Lote ' + idLote + ' creado con ' + empaques.length + ' empaques');
      setMostrarUpload(false);
      setArchivoNombre('');
      cargarLotes();
    } catch (e) {
      mostrarMensaje('error', 'Error al procesar archivo');
    }
    setSubiendo(false);
  };

  const handleEliminarLote = async () => {
    if (!loteSeleccionado) { mostrarMensaje('warning', 'Seleccione un lote'); return; }
    if (!window.confirm('¿Eliminar el lote ' + loteSeleccionado.id_lote + '?')) return;
    try {
      await fetch(API_URL + '/ed04_lotes?id=eq.' + loteSeleccionado.id, { method: 'DELETE', headers: HEADERS });
      mostrarMensaje('success', 'Lote eliminado');
      setLoteSeleccionado(null);
      cargarLotes();
    } catch (e) { mostrarMensaje('error', 'Error al eliminar'); }
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

  const getColorBorde = (porcentaje: number) => {
    if (porcentaje >= 90) return '#fca5a5';
    if (porcentaje >= 60) return '#fcd34d';
    return '#86efac';
  };

  const formatearFecha = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  if (cargando) {
    return (
      <div className="ed04-view">
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando lotes...</div>
      </div>
    );
  }

  return (
    <div className="ed04-view">
      {mensaje.visible && (
        <div className={'ed04-toast ed04-toast-' + mensaje.tipo}>{mensaje.texto}</div>
      )}

      <div className="ed04-header">
        <h2>ED04 · Almacén Lotes Etiquetas</h2>
      </div>

      <div className="ed04-toolbar">
        <button className="ed04-btn ed04-btn-primary" onClick={() => setMostrarUpload(true)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 10V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V10M4.66667 6.66667L8 10M8 10L11.3333 6.66667M8 10V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Cargar Lote
        </button>
        <div className="ed04-separator"></div>
        <button className="ed04-btn ed04-btn-danger" onClick={handleEliminarLote} disabled={!loteSeleccionado}>
          Eliminar Lote
        </button>
      </div>

      {mostrarUpload && (
        <div className="ed04-upload-area">
          <div className="ed04-upload-box" onClick={() => fileInputRef.current?.click()}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <span>{archivoNombre ? archivoNombre : 'Seleccionar archivo Excel con números de empaque'}</span>
            {subiendo && <span style={{ color: 'var(--text-muted)' }}>Procesando...</span>}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
              onChange={(e: any) => { const file = e.target.files?.[0]; if (file) procesarArchivo(file); }} />
          </div>
        </div>
      )}

      <div className="ed04-grid">
        {lotes.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-placeholder)' }}>
            No hay lotes registrados
          </div>
        ) : (
          lotes.map((lote: any) => {
            const porcentaje = getPorcentajeUso(lote.empaques_usados, lote.total_empaques);
            const colorProgreso = getColorProgreso(porcentaje);
            const colorFondo = getColorFondoProgreso(porcentaje);
            const colorBorde = getColorBorde(porcentaje);
            const agotado = porcentaje >= 100;

            return (
              <div
                key={lote.id}
                className="ed04-card"
                onClick={() => setLoteSeleccionado(loteSeleccionado && loteSeleccionado.id === lote.id ? null : lote)}
                style={{
                  cursor: 'pointer',
                  borderColor: loteSeleccionado && loteSeleccionado.id === lote.id ? 'var(--border-focus)' : (agotado ? '#fca5a5' : 'var(--border-card)'),
                  opacity: agotado ? 0.7 : 1
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
                    <strong>{lote.total_empaques}</strong>
                  </div>
                  <div className="ed04-card-row">
                    <span>Usados</span>
                    <strong style={{ color: colorProgreso }}>{lote.empaques_usados}</strong>
                  </div>
                  <div className="ed04-card-row">
                    <span>Disponibles</span>
                    <strong>{lote.total_empaques - lote.empaques_usados}</strong>
                  </div>
                </div>
                <div className="ed04-progress">
                  <div className="ed04-progress-info">
                    <span>Uso del lote</span>
                    <span style={{ color: colorProgreso, fontWeight: 600 }}>{porcentaje}%</span>
                  </div>
                  <div className="ed04-progress-bar" style={{ background: colorFondo }}>
                    <div className="ed04-progress-fill" style={{ width: porcentaje + '%', background: colorProgreso }}></div>
                  </div>
                </div>
                <div className="ed04-card-footer">
                  <span>Registrado por: {usuario?.nombre} {usuario?.apellido}</span>
                  {agotado && <span style={{ color: '#dc2626', fontWeight: 600 }}>AGOTADO</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ED04Lotes;
