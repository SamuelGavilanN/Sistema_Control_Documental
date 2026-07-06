// src/components/Transactions/RP/RP01View.tsx

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { auth } from '../../../lib/auth';
import './RP01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const RP01View: React.FC = () => {
  const [empaques, setEmpaques]: any = useState([]);
  const [cargando, setCargando]: any = useState(true);
  const [mensaje, setMensaje]: any = useState({ tipo: '', texto: '', visible: false });
  const [empaqueExpandido, setEmpaqueExpandido]: any = useState(null);
  const [empaqueSeleccionado, setEmpaqueSeleccionado]: any = useState(null);
  const fileInputRef: any = useRef(null);
  const usuario: any = auth.getUsuario();

  useEffect(() => {
    cargarInventario();
    const intervalo = setInterval(cargarInventario, 10000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarInventario = async () => {
    try {
      const resp = await fetch(API_URL + '/rp_inventario_empaques?select=*&order=creado_en.desc', { headers: HEADERS });
      const data = await resp.json();
      if (data && data.length > 0) {
        const empaquesConDatos = await Promise.all(data.map(async (empaque: any) => {
          const respBoms = await fetch(API_URL + '/rp_inventario_boms?select=*&empaque_id=eq.' + empaque.id + '&order=bom_sku.asc', { headers: HEADERS });
          const boms = await respBoms.json();
          const cantidadTotal = boms ? boms.reduce((s: number, b: any) => s + b.cantidad_maxima, 0) : 0;

          // Buscar TODAS las revisiones de RP02 para los BOMs de este empaque
          const bomsSku = boms ? boms.map((b: any) => b.bom_sku) : [];
          let todasRevisiones: any[] = [];
          
          if (bomsSku.length > 0) {
            for (const sku of bomsSku) {
              const respRev = await fetch(
                API_URL + '/rp_documento_revisiones?select=*&bom_sku=eq.' + encodeURIComponent(sku) + '&origen=eq.CD01&order=creado_en.desc',
                { headers: HEADERS }
              );
              const revs = await respRev.json();
              if (revs && revs.length > 0) {
                todasRevisiones = [...todasRevisiones, ...revs];
              }
            }
          }

          // Calcular cantidad revisada por BOM
          const revisionesPorBOM: Record<string, number> = {};
          let idRevision = '-';
          let revisadoPor = '-';
          let revisadoEn = '-';
          
          todasRevisiones.forEach((r: any) => {
            if (!revisionesPorBOM[r.bom_sku]) revisionesPorBOM[r.bom_sku] = 0;
            revisionesPorBOM[r.bom_sku] += (r.cantidad_revisada || 0);
            if (r.documento_id) idRevision = r.documento_id;
          });

          if (todasRevisiones.length > 0) {
            const ultima = todasRevisiones[todasRevisiones.length - 1];
            revisadoEn = new Date(ultima.creado_en).toLocaleString('es-CL');
            if (ultima.revisado_por) {
              try {
                const respUser = await fetch(API_URL + '/usuarios?select=nombre,apellido&id=eq.' + ultima.revisado_por, { headers: HEADERS });
                const userData = await respUser.json();
                if (userData && userData.length > 0) {
                  revisadoPor = userData[0].nombre + ' ' + userData[0].apellido;
                }
              } catch (e) {}
            }
          }

          const cantidadRevisada = Object.values(revisionesPorBOM).reduce((s: number, v: number) => s + v, 0);
          const cantidadPendiente = Math.max(0, cantidadTotal - cantidadRevisada);

          const bomsConEstado = boms ? boms.map((bom: any) => {
            const cantidadRev = revisionesPorBOM[bom.bom_sku] || 0;
            return {
              ...bom,
              revisado: cantidadRev > 0,
              cantidad_revisada: cantidadRev,
              cantidad_pendiente: Math.max(0, bom.cantidad_maxima - cantidadRev)
            };
          }) : [];

          return {
            ...empaque,
            boms: bomsConEstado,
            cantidad_total: cantidadTotal,
            cantidad_revisada: cantidadRevisada,
            cantidad_pendiente: cantidadPendiente,
            id_revision: idRevision,
            revisado_por: revisadoPor,
            revisado_en: revisadoEn
          };
        }));
        setEmpaques(empaquesConDatos);
      } else {
        setEmpaques([]);
      }
      setCargando(false);
    } catch (e) {
      console.error('Error cargando inventario:', e);
      setCargando(false);
    }
  };

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto, visible: true });
    setTimeout(() => setMensaje({ tipo: '', texto: '', visible: false }), 4000);
  };

  const procesarArchivo = async (file: File) => {
    setCargando(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 2) {
        mostrarMensaje('error', 'El archivo está vacío');
        setCargando(false);
        return;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1).filter((row: any) => row.length > 0);

      const colEmpaque = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('empaque'));
      const colCodDestino = headers.findIndex((h: string) => h && (h.toString().toLowerCase().includes('cod.destino') || h.toString().toLowerCase().includes('cod_destino')));
      const colDestino = headers.findIndex((h: string) => h && h.toString().toLowerCase() === 'destino');
      const colBOM = headers.findIndex((h: string) => h && (h.toString().toLowerCase().includes('bom') || h.toString().toLowerCase().includes('sku')));
      const colCantidad = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('cantidad'));

      if (colEmpaque < 0 || colBOM < 0) {
        mostrarMensaje('error', 'Columnas requeridas no encontradas');
        setCargando(false);
        return;
      }

      const empaquesMap: Record<string, any> = {};

      dataRows.forEach((row: any) => {
        const empaque = String(row[colEmpaque] || '').trim();
        const codDestino = colCodDestino >= 0 ? String(row[colCodDestino] || '').trim() : '';
        const destino = colDestino >= 0 ? String(row[colDestino] || '').trim() : '';
        const bom = String(row[colBOM] || '').trim();
        const cantidad = colCantidad >= 0 ? parseInt(row[colCantidad]) || 1 : 1;

        if (!empaque || !bom) return;

        if (!empaquesMap[empaque]) {
          empaquesMap[empaque] = { empaque, codDestino, destino, boms: {} };
        }
        if (!empaquesMap[empaque].boms[bom] || cantidad > empaquesMap[empaque].boms[bom]) {
          empaquesMap[empaque].boms[bom] = cantidad;
        }
      });

      let creados = 0;
      for (const key of Object.keys(empaquesMap)) {
        const emp = empaquesMap[key];
        
        const respEmpaque = await fetch(API_URL + '/rp_inventario_empaques', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify({
            numero_empaque: emp.empaque,
            cod_destino: emp.codDestino,
            destino: emp.destino,
            creado_por: usuario?.id
          })
        });

        if (respEmpaque.ok) {
          const empaqueData = await respEmpaque.json();
          const empaqueCreado = Array.isArray(empaqueData) ? empaqueData[0] : empaqueData;

          for (const bom of Object.keys(emp.boms)) {
            await fetch(API_URL + '/rp_inventario_boms', {
              method: 'POST',
              headers: { ...HEADERS, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                empaque_id: empaqueCreado.id,
                bom_sku: bom,
                cantidad_maxima: emp.boms[bom]
              })
            });
          }
          creados++;
        }
      }

      mostrarMensaje('success', creados + ' empaques cargados correctamente');
      cargarInventario();
    } catch (e) {
      console.error('Error procesando archivo:', e);
      mostrarMensaje('error', 'Error al procesar el archivo');
    }
    setCargando(false);
  };

  const handleEliminarEmpaque = async () => {
    if (!empaqueSeleccionado) {
      mostrarMensaje('warning', 'Seleccione un empaque de la tabla');
      return;
    }
    if (!window.confirm('¿Eliminar el empaque ' + empaqueSeleccionado.numero_empaque + '?')) return;
    try {
      await fetch(API_URL + '/rp_inventario_empaques?id=eq.' + empaqueSeleccionado.id, { method: 'DELETE', headers: HEADERS });
      mostrarMensaje('success', 'Empaque eliminado');
      setEmpaqueSeleccionado(null);
      setEmpaqueExpandido(null);
      cargarInventario();
    } catch (e) {
      mostrarMensaje('error', 'Error al eliminar');
    }
  };

  const toggleExpandir = (empaque: any) => {
    setEmpaqueExpandido(empaqueExpandido && empaqueExpandido.id === empaque.id ? null : empaque);
  };

  if (cargando && empaques.length === 0) {
    return (
      <div className="rp01-view">
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando inventario...</div>
      </div>
    );
  }

  return (
    <div className="rp01-view">
      {mensaje.visible && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, padding: '14px 24px',
          borderRadius: '10px', fontSize: '14px', fontWeight: 500, boxShadow: 'var(--shadow-md)',
          maxWidth: '420px',
          background: mensaje.tipo === 'success' ? 'var(--success-bg)' : mensaje.tipo === 'error' ? 'var(--error-bg)' : 'var(--warning-bg)',
          color: mensaje.tipo === 'success' ? 'var(--success-text)' : mensaje.tipo === 'error' ? 'var(--error-text)' : 'var(--warning-text)',
          border: '1px solid ' + (mensaje.tipo === 'success' ? 'var(--success-border)' : mensaje.tipo === 'error' ? 'var(--error-border)' : 'var(--warning-border)')
        }}>
          {mensaje.texto}
        </div>
      )}

      <div className="rp01-header">
        <h2>RP01 · Inventario de Empaques</h2>
      </div>

      <div className="rp01-toolbar">
        <button className="rp01-btn rp01-btn-primary" onClick={() => fileInputRef.current?.click()}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 10V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V10M4.66667 6.66667L8 10M8 10L11.3333 6.66667M8 10V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Cargar Excel
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
          onChange={(e: any) => { const file = e.target.files?.[0]; if (file) procesarArchivo(file); }} />

        <div className="rp01-separator"></div>

        <button className="rp01-btn" onClick={() => empaqueSeleccionado && toggleExpandir(empaqueSeleccionado)} disabled={!empaqueSeleccionado}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1.33325 8.00004C1.33325 8.00004 3.99992 3.33337 7.99992 3.33337C11.9999 3.33337 14.6666 8.00004 14.6666 8.00004C14.6666 8.00004 11.9999 12.6667 7.99992 12.6667C3.99992 12.6667 1.33325 8.00004 1.33325 8.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Ver Detalle
        </button>

        <button className="rp01-btn rp01-btn-danger" onClick={handleEliminarEmpaque} disabled={!empaqueSeleccionado}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4H14M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Eliminar
        </button>
      </div>

      {empaqueSeleccionado && (
        <div className="rp02-selected-info">
          <span>Empaque seleccionado: <strong>{empaqueSeleccionado.numero_empaque}</strong></span>
          <button className="rp02-selected-close" onClick={() => setEmpaqueSeleccionado(null)}>×</button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="ed03-tabla" style={{ minWidth: '1200px' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Número de Empaque</th>
              <th>Cod. Destino</th>
              <th>Destino</th>
              <th style={{ textAlign: 'center' }}>Cant. Total</th>
              <th>ID Revisión</th>
              <th style={{ textAlign: 'center' }}>Cant. Revisada</th>
              <th style={{ textAlign: 'center' }}>Cant. Pendiente</th>
              <th>Revisado Por</th>
              <th>Revisado En</th>
            </tr>
          </thead>
          <tbody>
            {empaques.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-placeholder)' }}>No hay empaques en el inventario</td></tr>
            ) : (
              empaques.map((empaque: any) => (
                <React.Fragment key={empaque.id}>
                  <tr onClick={() => {
                    if (empaqueSeleccionado && empaqueSeleccionado.id === empaque.id) {
                      setEmpaqueSeleccionado(null);
                    } else {
                      setEmpaqueSeleccionado(empaque);
                    }
                  }} style={{
                    cursor: 'pointer',
                    background: empaqueSeleccionado && empaqueSeleccionado.id === empaque.id ? 'var(--table-row-selected)' : 'transparent'
                  }}>
                    <td>
                      <input type="radio" className="sd01-radio"
                        checked={empaqueSeleccionado && empaqueSeleccionado.id === empaque.id}
                        onChange={() => setEmpaqueSeleccionado(empaque)}
                        onClick={(e: any) => e.stopPropagation()} />
                    </td>
                    <td className="rp01-empaque-id">{empaque.numero_empaque}</td>
                    <td>{empaque.cod_destino || '-'}</td>
                    <td>{empaque.destino || '-'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{empaque.cantidad_total}</td>
                    <td className="rp01-empaque-id" style={{ fontSize: '12px' }}>{empaque.id_revision}</td>
                    <td style={{ textAlign: 'center', color: empaque.cantidad_revisada > 0 ? 'var(--success-text)' : 'var(--text-muted)' }}>
                      {empaque.cantidad_revisada}
                    </td>
                    <td style={{ textAlign: 'center', color: empaque.cantidad_pendiente > 0 ? 'var(--error-text)' : 'var(--success-text)', fontWeight: 600 }}>
                      {empaque.cantidad_pendiente}
                    </td>
                    <td>{empaque.revisado_por}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{empaque.revisado_en}</td>
                  </tr>
                  {empaqueExpandido && empaqueExpandido.id === empaque.id && (
                    <tr>
                      <td colSpan={10} style={{ padding: '0' }}>
                        <div style={{ padding: '16px', background: 'var(--bg-section)' }}>
                          <table className="rp01-bom-tabla" style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th>BOM/SKU</th>
                                <th style={{ textAlign: 'center' }}>Cant. Sistema</th>
                                <th style={{ textAlign: 'center' }}>Cant. Revisada</th>
                                <th style={{ textAlign: 'center' }}>Cant. Pendiente</th>
                                <th style={{ textAlign: 'center' }}>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {empaque.boms.map((bom: any) => (
                                <tr key={bom.id}>
                                  <td className="rp01-bom-sku">{bom.bom_sku}</td>
                                  <td style={{ textAlign: 'center' }}>{bom.cantidad_maxima}</td>
                                  <td style={{ textAlign: 'center', color: bom.cantidad_revisada > 0 ? 'var(--success-text)' : 'var(--text-muted)' }}>
                                    {bom.cantidad_revisada}
                                  </td>
                                  <td style={{ textAlign: 'center', color: bom.cantidad_pendiente > 0 ? 'var(--error-text)' : 'var(--success-text)', fontWeight: 600 }}>
                                    {bom.cantidad_pendiente}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span className="rp01-badge" style={{
                                      background: bom.revisado ? (bom.cantidad_pendiente === 0 ? 'var(--success-bg)' : 'var(--warning-bg)') : 'var(--warning-bg)',
                                      color: bom.revisado ? (bom.cantidad_pendiente === 0 ? 'var(--success-text)' : 'var(--warning-text)') : 'var(--warning-text)'
                                    }}>
                                      {bom.revisado ? (bom.cantidad_pendiente === 0 ? 'Revisado' : 'Parcial') : 'Pendiente'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RP01View;
