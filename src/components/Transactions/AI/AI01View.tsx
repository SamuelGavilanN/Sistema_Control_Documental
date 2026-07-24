// src/components/Transactions/AI/AI01View.tsx

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { auth } from '../../../lib/auth';
import './AI01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const AI01View: React.FC = () => {
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
      const resp = await fetch(API_URL + '/ai_inventario?select=*&order=creado_en.desc', { headers: HEADERS });
      const data = await resp.json();
      if (data && data.length > 0) {
        const empaquesConBoms = await Promise.all(data.map(async (empaque: any) => {
          const respBoms = await fetch(API_URL + '/ai_inventario_boms?select=*&empaque_id=eq.' + empaque.id + '&order=bom_sku.asc', { headers: HEADERS });
          const boms = await respBoms.json();
          const cantidadTotal = boms ? boms.reduce((s: number, b: any) => s + b.cantidad_maxima, 0) : 0;

          let cantidadRevisada = 0;
          let idTarea = '-';
          let estado = empaque.estado || 'Pendiente';
          const revisionesPorBOM: Record<string, number> = {};
          
          try {
            const respTareaEmp = await fetch(API_URL + '/ai_tarea_empaques?select=tarea_id&numero_empaque=eq.' + encodeURIComponent(empaque.numero_empaque), { headers: HEADERS });
            const tareasEmp = await respTareaEmp.json();
            
            if (tareasEmp && tareasEmp.length > 0) {
              const tareaId = tareasEmp[tareasEmp.length - 1].tarea_id;
              
              const respTarea = await fetch(API_URL + '/ai_tareas?select=*&id=eq.' + tareaId, { headers: HEADERS });
              const tareaData = await respTarea.json();
              if (tareaData && tareaData.length > 0) {
                idTarea = tareaData[0].numero_tarea;
                
                const respCapturas = await fetch(API_URL + '/ai_capturas?select=bom_sku&tarea_id=eq.' + tareaId, { headers: HEADERS });
                const capturas = await respCapturas.json();
                
                if (capturas) {
                  const bomsSku = boms ? boms.map((b: any) => b.bom_sku) : [];
                  capturas.forEach((c: any) => {
                    if (!revisionesPorBOM[c.bom_sku]) revisionesPorBOM[c.bom_sku] = 0;
                    revisionesPorBOM[c.bom_sku]++;
                    
                    if (bomsSku.includes(c.bom_sku)) {
                      cantidadRevisada++;
                    }
                  });
                }
                
                if (tareaData[0].estado === 'Finalizado') {
                  estado = 'Finalizado';
                } else if (tareaData[0].estado === 'Con Diferencias') {
                  estado = 'Con Diferencias';
                } else if (tareaData[0].estado === 'En Proceso') {
                  estado = 'En Proceso';
                }
              }
            }
          } catch (e) {}

          const bomsConEstado = boms ? boms.map((bom: any) => {
            const cantRev = revisionesPorBOM[bom.bom_sku] || 0;
            return {
              ...bom,
              cantidad_revisada: cantRev,
              cantidad_pendiente: Math.max(0, bom.cantidad_maxima - cantRev)
            };
          }) : [];

          return {
            ...empaque,
            boms: bomsConEstado,
            cantidad_total: cantidadTotal,
            cantidad_revisada: cantidadRevisada,
            cantidad_pendiente: Math.max(0, cantidadTotal - cantidadRevisada),
            id_tarea: idTarea,
            estado: estado
          };
        }));
        setEmpaques(empaquesConBoms);
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
      
      const colUltimaMod = headers.findIndex((h: string) => {
        if (!h) return false;
        const header = h.toString().toLowerCase().trim();
        const tieneUltima = header.includes('ltima');
        const tieneModificacion = header.includes('modificacion') || header.includes('modificación');
        const tieneEn = header.endsWith('en') || header.includes(' en');
        const tienePor = header.includes('por');
        return tieneUltima && tieneModificacion && tieneEn && !tienePor;
      });
      
      const colCodDestino = headers.findIndex((h: string) => h && (h.toString().toLowerCase().includes('cod.destino') || h.toString().toLowerCase().includes('cod_destino')));
      const colDestino = headers.findIndex((h: string) => h && h.toString().toLowerCase() === 'destino');
      const colBOM = headers.findIndex((h: string) => h && (h.toString().toLowerCase().includes('bom') || h.toString().toLowerCase().includes('sku')));

      if (colEmpaque < 0 || colBOM < 0) {
        mostrarMensaje('error', 'Columnas requeridas no encontradas (Número de Empaque, BOM/SKU)');
        setCargando(false);
        return;
      }

      const truncarAMinutos = (fechaStr: string): string => {
        if (!fechaStr) return '';
        const partes = fechaStr.trim().split(' ');
        if (partes.length >= 2) {
          const horaPartes = partes[1].split(':');
          if (horaPartes.length >= 2) {
            return partes[0] + ' ' + horaPartes[0] + ':' + horaPartes[1];
          }
        }
        return fechaStr.trim();
      };

      const conteoCajas: Record<string, number> = {};
      
      dataRows.forEach((row: any) => {
        const empaque = String(row[colEmpaque] || '').trim();
        const ultimaModRaw = colUltimaMod >= 0 ? String(row[colUltimaMod] || '').trim() : '';
        const ultimaMod = truncarAMinutos(ultimaModRaw);
        const codDestino = colCodDestino >= 0 ? String(row[colCodDestino] || '').trim() : '';
        const destino = colDestino >= 0 ? String(row[colDestino] || '').trim() : '';
        const bom = String(row[colBOM] || '').trim();

        if (!empaque || !bom) return;

        const keyCaja = empaque + '|' + bom + '|' + ultimaMod;
        conteoCajas[keyCaja] = 1;
      });

      const consolidado: Record<string, any> = {};
      Object.keys(conteoCajas).forEach((keyCaja) => {
        const partes = keyCaja.split('|');
        const empaque = partes[0];
        const bom = partes[1];
        
        const key = empaque + '|' + bom;
        if (!consolidado[key]) {
          consolidado[key] = { empaque, bom, cantidad: 0 };
        }
        consolidado[key].cantidad += 1;
      });

      const infoEmpaques: Record<string, any> = {};
      dataRows.forEach((row: any) => {
        const empaque = String(row[colEmpaque] || '').trim();
        const codDestino = colCodDestino >= 0 ? String(row[colCodDestino] || '').trim() : '';
        const destino = colDestino >= 0 ? String(row[colDestino] || '').trim() : '';
        if (empaque && !infoEmpaques[empaque]) {
          infoEmpaques[empaque] = { codDestino, destino };
        }
      });

      const empaquesMap: Record<string, any> = {};
      Object.values(consolidado).forEach((item: any) => {
        if (!empaquesMap[item.empaque]) {
          empaquesMap[item.empaque] = { 
            codDestino: infoEmpaques[item.empaque]?.codDestino || '', 
            destino: infoEmpaques[item.empaque]?.destino || '', 
            boms: {} 
          };
        }
        empaquesMap[item.empaque].boms[item.bom] = item.cantidad;
      });

      let creados = 0;
      for (const numEmpaque of Object.keys(empaquesMap)) {
        const emp = empaquesMap[numEmpaque];
        
        const respExistente = await fetch(API_URL + '/ai_inventario?select=id&numero_empaque=eq.' + encodeURIComponent(numEmpaque), { headers: HEADERS });
        const existente = await respExistente.json();
        
        let empaqueId;
        if (existente && existente.length > 0) {
          empaqueId = existente[0].id;
          await fetch(API_URL + '/ai_inventario?id=eq.' + empaqueId, {
            method: 'PATCH',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ cod_destino: emp.codDestino, destino: emp.destino, estado: 'Pendiente' })
          });
          await fetch(API_URL + '/ai_inventario_boms?empaque_id=eq.' + empaqueId, { method: 'DELETE', headers: HEADERS });
        } else {
          const respEmpaque = await fetch(API_URL + '/ai_inventario', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify({
              numero_empaque: numEmpaque,
              cod_destino: emp.codDestino,
              destino: emp.destino,
              estado: 'Pendiente',
              creado_por: usuario?.id
            })
          });
          const empaqueData = await respEmpaque.json();
          const empaqueCreado = Array.isArray(empaqueData) ? empaqueData[0] : empaqueData;
          empaqueId = empaqueCreado.id;
        }

        for (const bom of Object.keys(emp.boms)) {
          await fetch(API_URL + '/ai_inventario_boms', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empaque_id: empaqueId,
              bom_sku: bom,
              cantidad_maxima: emp.boms[bom]
            })
          });
        }
        creados++;
      }

      let totalCajas = 0;
      Object.values(consolidado).forEach((item: any) => { totalCajas += item.cantidad; });
      
      mostrarMensaje('success', creados + ' empaques procesados. Total cajas: ' + totalCajas);
      cargarInventario();
    } catch (e) {
      console.error('Error procesando archivo:', e);
      mostrarMensaje('error', 'Error al procesar el archivo');
    }
    setCargando(false);
  };

  const handleEliminarEmpaque = async (empaque: any) => {
    if (!window.confirm('¿Eliminar el empaque ' + empaque.numero_empaque + '?')) return;
    try {
      const resp = await fetch(API_URL + '/ai_inventario?id=eq.' + empaque.id, { method: 'DELETE', headers: HEADERS });
      if (resp.ok) {
        mostrarMensaje('success', 'Empaque eliminado');
        setEmpaqueSeleccionado(null);
        setEmpaqueExpandido(null);
        cargarInventario();
      } else {
        mostrarMensaje('error', 'Error al eliminar');
      }
    } catch (e) {
      mostrarMensaje('error', 'Error al eliminar');
    }
  };

  const toggleExpandir = (empaque: any) => {
    setEmpaqueExpandido(empaqueExpandido && empaqueExpandido.id === empaque.id ? null : empaque);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Pendiente': return { color: '#b45309', bg: '#fef3c7' };
      case 'En Proceso': return { color: '#1d4ed8', bg: '#dbeafe' };
      case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' };
      case 'Con Diferencias': return { color: '#dc2626', bg: '#fef2f2' };
      default: return { color: '#64748b', bg: '#f1f5f9' };
    }
  };

  if (cargando && empaques.length === 0) {
    return (
      <div className="ai01-view">
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando inventario...</div>
      </div>
    );
  }

  return (
    <div className="ai01-view">
      {mensaje.visible && <div className={'ai01-toast ai01-toast-' + mensaje.tipo}>{mensaje.texto}</div>}

      <div className="ai01-header"><h2>AI01 · Gestión Auditoría Inv</h2></div>

      <div className="ai01-toolbar">
        <button className="ai01-btn ai01-btn-primary" onClick={() => fileInputRef.current?.click()}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 10V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V10M4.66667 6.66667L8 10M8 10L11.3333 6.66667M8 10V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Cargar Excel
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
          onChange={(e: any) => { const file = e.target.files?.[0]; if (file) procesarArchivo(file); }} />
        <div className="ai01-separator"></div>
        <button className="ai01-btn" onClick={() => empaqueSeleccionado && toggleExpandir(empaqueSeleccionado)} disabled={!empaqueSeleccionado}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.33325 8.00004C1.33325 8.00004 3.99992 3.33337 7.99992 3.33337C11.9999 3.33337 14.6666 8.00004 14.6666 8.00004C14.6666 8.00004 11.9999 12.6667 7.99992 12.6667C3.99992 12.6667 1.33325 8.00004 1.33325 8.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Ver Detalle
        </button>
        <button 
          className="ai01-btn ai01-btn-danger" 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (empaqueSeleccionado) handleEliminarEmpaque(empaqueSeleccionado); 
          }} 
          disabled={!empaqueSeleccionado}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4H14M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Eliminar
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="ed03-tabla" style={{ minWidth: '1100px' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Número de Empaque</th>
              <th>Cod. Destino</th>
              <th>Destino</th>
              <th style={{ textAlign: 'center' }}>Cant. Total</th>
              <th style={{ textAlign: 'center' }}>Cant. Revisada</th>
              <th style={{ textAlign: 'center' }}>Cant. Pendiente</th>
              <th>ID Tarea</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {empaques.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-placeholder)' }}>No hay empaques en el inventario</td></tr>
            ) : (
              empaques.map((empaque: any) => {
                const eb = getEstadoBadge(empaque.estado);
                const seleccionado = empaqueSeleccionado && empaqueSeleccionado.id === empaque.id;
                return (
                  <React.Fragment key={empaque.id}>
                    <tr 
                      onClick={() => setEmpaqueSeleccionado(seleccionado ? null : empaque)}
                      style={{ 
                        cursor: 'pointer', 
                        background: seleccionado ? 'var(--table-row-selected)' : 'transparent' 
                      }}
                    >
                      <td>
                        <input type="radio" className="sd01-radio"
                          checked={seleccionado}
                          onChange={() => setEmpaqueSeleccionado(empaque)}
                          onClick={(e: any) => e.stopPropagation()} />
                      </td>
                      <td style={{ fontFamily: 'Courier New, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{empaque.numero_empaque}</td>
                      <td>{empaque.cod_destino || '-'}</td>
                      <td>{empaque.destino || '-'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{empaque.cantidad_total}</td>
                      <td style={{ textAlign: 'center', color: empaque.cantidad_revisada > 0 ? 'var(--success-text)' : 'var(--text-muted)' }}>{empaque.cantidad_revisada}</td>
                      <td style={{ textAlign: 'center', color: empaque.cantidad_pendiente > 0 ? 'var(--error-text)' : 'var(--success-text)', fontWeight: 600 }}>{empaque.cantidad_pendiente}</td>
                      <td style={{ fontFamily: 'Courier New, monospace', fontSize: '12px' }}>{empaque.id_tarea}</td>
                      <td><span className="ai01-badge" style={{ background: eb.bg, color: eb.color }}>{empaque.estado}</span></td>
                    </tr>
                    {empaqueExpandido && empaqueExpandido.id === empaque.id && (
                      <tr>
                        <td colSpan={9} style={{ padding: '0' }}>
                          <div style={{ padding: '16px', background: 'var(--bg-section)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <thead><tr style={{ background: 'var(--table-header-bg)' }}><th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--table-header-text)' }}>BOM/SKU</th><th style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--table-header-text)' }}>Cant. Sistema</th><th style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--table-header-text)' }}>Cant. Revisada</th><th style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--table-header-text)' }}>Estado</th></tr></thead>
                              <tbody>
                                {empaque.boms.map((bom: any) => {
                                  const pendiente = Math.max(0, bom.cantidad_maxima - (bom.cantidad_revisada || 0));
                                  return (
                                    <tr key={bom.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '6px 10px', fontFamily: 'Courier New, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{bom.bom_sku}</td>
                                      <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}>{bom.cantidad_maxima}</td>
                                      <td style={{ padding: '6px 10px', textAlign: 'center', color: (bom.cantidad_revisada || 0) > 0 ? 'var(--success-text)' : 'var(--text-muted)', fontWeight: 600 }}>{bom.cantidad_revisada || 0}</td>
                                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                        <span className="ai01-badge" style={{
                                          background: pendiente === 0 ? 'var(--success-bg)' : ((bom.cantidad_revisada || 0) > 0 ? 'var(--warning-bg)' : 'var(--bg-readonly)'),
                                          color: pendiente === 0 ? 'var(--success-text)' : ((bom.cantidad_revisada || 0) > 0 ? 'var(--warning-text)' : 'var(--text-muted)')
                                        }}>
                                          {pendiente === 0 ? 'Completo' : ((bom.cantidad_revisada || 0) > 0 ? 'Parcial' : 'Pendiente')}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AI01View;
