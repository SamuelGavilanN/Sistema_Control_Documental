// src/components/Transactions/SD/SD01View.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import { locales as localesData, cargarLocales } from '../../../data/locales';
import * as XLSX from 'xlsx';
import './SD01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface LocalRow {
  id: number;
  codigoLocal: string;
  nombreLocal: string;
  fechaEntrega: string;
  horaEntrega: string;
}

const generateTimeOptions = () => {
  const options: string[] = [];
  for (let h = 6; h < 24; h++) { options.push(h.toString().padStart(2, '0') + ':00'); options.push(h.toString().padStart(2, '0') + ':30'); }
  for (let h = 0; h < 6; h++) { options.push(h.toString().padStart(2, '0') + ':00'); options.push(h.toString().padStart(2, '0') + ':30'); }
  return options;
};
const timeOptions = generateTimeOptions();

const SD01View: React.FC = () => {
  const usuario = auth.getUsuario();

  const [transportes, setTransportes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal Manual
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [fechaProgramacion, setFechaProgramacion] = useState('');
  const [conductor, setConductor] = useState('');
  const [patentePrincipal, setPatentePrincipal] = useState('');
  const [patenteAdicional, setPatenteAdicional] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [locales, setLocales] = useState<LocalRow[]>([
    { id: 1, codigoLocal: '', nombreLocal: '', fechaEntrega: '', horaEntrega: '' }
  ]);

  // Modal Excel
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [archivoExcel, setArchivoExcel] = useState<any>(null);
  const [nombreArchivoExcel, setNombreArchivoExcel] = useState('');
  const [vistaPrevia, setVistaPrevia] = useState<any[]>([]);
  const [procesandoExcel, setProcesandoExcel] = useState(false);
  const [mensajeExcel, setMensajeExcel] = useState('');

  const [conductores, setConductores] = useState<any[]>([]);
  const [patentes, setPatentes] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'error'>('success');

  // Autocomplete states
  const [showConductorSuggestions, setShowConductorSuggestions] = useState(false);
  const [conductorSuggestions, setConductorSuggestions] = useState<any[]>([]);
  const [conductorHighlight, setConductorHighlight] = useState(-1);
  const [showPatentePSuggestions, setShowPatentePSuggestions] = useState(false);
  const [patentePSuggestions, setPatentePSuggestions] = useState<any[]>([]);
  const [patentePHighlight, setPatentePHighlight] = useState(-1);
  const [showPatenteASuggestions, setShowPatenteASuggestions] = useState(false);
  const [patenteASuggestions, setPatenteASuggestions] = useState<any[]>([]);
  const [patenteAHighlight, setPatenteAHighlight] = useState(-1);

  const conductorRef = useRef<HTMLInputElement>(null);
  const patentePRef = useRef<HTMLInputElement>(null);
  const patenteARef = useRef<HTMLInputElement>(null);

  useEffect(() => { cargarLocales(); cargarDatosIniciales(); cargarTransportes(); }, []);
  useEffect(() => { const intervalo = setInterval(cargarTransportes, 10000); return () => clearInterval(intervalo); }, []);

  const cargarDatosIniciales = async () => {
    try {
      const [respCond, respPat] = await Promise.all([
        fetch(API_URL + '/sd01_conductores?select=*&activo=eq.true&order=nombre,apellido', { headers: HEADERS }),
        fetch(API_URL + '/sd01_patentes?select=*&activo=eq.true&order=numero_patente', { headers: HEADERS }),
      ]);
      setConductores((await respCond.json() || []).map((c: any) => ({ ...c, nombre_completo: c.nombre + ' ' + c.apellido })));
      setPatentes(await respPat.json() || []);
    } catch (e) {}
  };

  const cargarTransportes = async () => {
    setCargando(true);
    try {
      const resp = await fetch(API_URL + '/sd01_documentos?select=*&order=creado_en.desc', { headers: HEADERS });
      const data = await resp.json();
      if (data) {
        const enriquecidos = [];
        for (const d of data) {
          const respLoc = await fetch(API_URL + '/sd01_documento_locales?select=id&documento_id=eq.' + d.id_documento, { headers: HEADERS });
          const locData = await respLoc.json();
          const conductorData = conductores.find((c: any) => c.id === d.conductor_id);
          const patenteData = patentes.find((p: any) => p.id === d.patente_principal_id);
          enriquecidos.push({ ...d, nombre_conductor: conductorData?.nombre_completo || '-', numero_patente: patenteData?.numero_patente || '-', total_locales: locData?.length || 0 });
        }
        setTransportes(enriquecidos);
      }
    } catch (e) {}
    setCargando(false);
  };

  // ============ MANUAL ============
  const addLocal = () => {
    const newId = Math.max(...locales.map(l => l.id), 0) + 1;
    setLocales([...locales, { id: newId, codigoLocal: '', nombreLocal: '', fechaEntrega: '', horaEntrega: '' }]);
  };
  const removeLocal = (id: number) => { if (locales.length === 1) return; setLocales(locales.filter(l => l.id !== id)); };
  const updateLocal = (id: number, field: keyof LocalRow, value: string) => {
    setLocales(locales.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === 'codigoLocal' && value.trim()) {
        const loc = localesData.find((x: any) => x.codigo_local?.toUpperCase() === value.toUpperCase());
        if (loc) updated.nombreLocal = loc.nombre_local; else updated.nombreLocal = '';
      }
      return updated;
    }));
  };

  const filterStartsWith = (list: any[], field: string, search: string) => {
    if (!search) return [];
    return list.filter((item: any) => String(item[field] || '').toLowerCase().startsWith(search.toLowerCase()));
  };

  // Conductor autocomplete
  const handleConductorChange = (v: string) => { setConductor(v); const f = filterStartsWith(conductores, 'nombre_completo', v); setConductorSuggestions(f); setShowConductorSuggestions(f.length > 0); setConductorHighlight(-1); };
  const handleConductorKeyDown = (e: React.KeyboardEvent) => {
    if (!showConductorSuggestions || conductorSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setConductorHighlight(p => p < conductorSuggestions.length - 1 ? p + 1 : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setConductorHighlight(p => p > 0 ? p - 1 : conductorSuggestions.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); const i = conductorHighlight >= 0 ? conductorHighlight : 0; if (conductorSuggestions[i]) selectConductor(conductorSuggestions[i]); }
    else if (e.key === 'Tab') { if (conductor.trim()) { e.preventDefault(); const i = conductorHighlight >= 0 ? conductorHighlight : 0; if (conductorSuggestions[i]) selectConductor(conductorSuggestions[i]); } }
    else if (e.key === 'Escape') { setShowConductorSuggestions(false); setConductorHighlight(-1); }
  };
  const selectConductor = (c: any) => { setConductor(c.nombre_completo || ''); setShowConductorSuggestions(false); setConductorHighlight(-1); setTimeout(() => patentePRef.current?.focus(), 100); };

  // Patente P autocomplete
  const handlePatentePChange = (v: string) => { setPatentePrincipal(v); const f = filterStartsWith(patentes, 'numero_patente', v); setPatentePSuggestions(f); setShowPatentePSuggestions(f.length > 0); setPatentePHighlight(-1); };
  const handlePatentePKeyDown = (e: React.KeyboardEvent) => {
    if (!showPatentePSuggestions || patentePSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setPatentePHighlight(p => p < patentePSuggestions.length - 1 ? p + 1 : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setPatentePHighlight(p => p > 0 ? p - 1 : patentePSuggestions.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); const i = patentePHighlight >= 0 ? patentePHighlight : 0; if (patentePSuggestions[i]) selectPatenteP(patentePSuggestions[i]); }
    else if (e.key === 'Tab') { if (patentePrincipal.trim()) { e.preventDefault(); const i = patentePHighlight >= 0 ? patentePHighlight : 0; if (patentePSuggestions[i]) selectPatenteP(patentePSuggestions[i]); } }
    else if (e.key === 'Escape') { setShowPatentePSuggestions(false); setPatentePHighlight(-1); }
  };
  const selectPatenteP = (p: any) => { setPatentePrincipal(p.numero_patente || ''); setShowPatentePSuggestions(false); setPatentePHighlight(-1); setTimeout(() => patenteARef.current?.focus(), 100); };

  // Patente A autocomplete
  const handlePatenteAChange = (v: string) => { setPatenteAdicional(v); const f = filterStartsWith(patentes, 'numero_patente', v); setPatenteASuggestions(f); setShowPatenteASuggestions(f.length > 0); setPatenteAHighlight(-1); };
  const handlePatenteAKeyDown = (e: React.KeyboardEvent) => {
    if (!showPatenteASuggestions || patenteASuggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setPatenteAHighlight(p => p < patenteASuggestions.length - 1 ? p + 1 : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setPatenteAHighlight(p => p > 0 ? p - 1 : patenteASuggestions.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); const i = patenteAHighlight >= 0 ? patenteAHighlight : 0; if (patenteASuggestions[i]) selectPatenteA(patenteASuggestions[i]); }
    else if (e.key === 'Tab') { if (patenteAdicional.trim()) { e.preventDefault(); const i = patenteAHighlight >= 0 ? patenteAHighlight : 0; if (patenteASuggestions[i]) selectPatenteA(patenteASuggestions[i]); } }
    else if (e.key === 'Escape') { setShowPatenteASuggestions(false); setPatenteAHighlight(-1); }
  };
  const selectPatenteA = (p: any) => { setPatenteAdicional(p.numero_patente || ''); setShowPatenteASuggestions(false); setPatenteAHighlight(-1); };

  // Guardar Manual
  const handleGuardarManual = async (estado: string) => {
    if (!fechaProgramacion) { setMensaje('Selecciona fecha de programación'); setTipoMensaje('error'); return; }
    if (!conductor) { setMensaje('Selecciona un conductor'); setTipoMensaje('error'); return; }
    if (!patentePrincipal) { setMensaje('Selecciona patente principal'); setTipoMensaje('error'); return; }
    const localesValidos = locales.filter(l => l.codigoLocal.trim());
    if (localesValidos.length === 0) { setMensaje('Agrega al menos un local'); setTipoMensaje('error'); return; }

    setGuardando(true);
    try {
      const user = auth.getUsuario();
      const conductorData = conductores.find((c: any) => c.nombre_completo === conductor);
      const patentePData = patentes.find((p: any) => p.numero_patente === patentePrincipal);
      const patenteSData = patentes.find((p: any) => p.numero_patente === patenteAdicional);
      const now = new Date();
      const fecha = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0') + now.getFullYear();
      const respCount = await fetch(API_URL + '/sd01_documentos?select=id&order=creado_en.desc&limit=1', { headers: HEADERS });
      const countData = await respCount.json();
      const count = (countData?.length || 0) + 1;
      const idDocumento = 'SD01-' + fecha + '-' + String(count).padStart(4, '0');

      await fetch(API_URL + '/sd01_documentos', {
        method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_documento: idDocumento, conductor_id: conductorData?.id || null, patente_principal_id: patentePData?.id || null, patente_adicional_id: patenteSData?.id || null, fecha_programacion: fechaProgramacion, administrativo: (user?.nombre || '') + ' ' + (user?.apellido || ''), observaciones: observaciones, estado: estado, creado_por: user?.id }),
      });
      for (const loc of localesValidos) {
        await fetch(API_URL + '/sd01_documento_locales', { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ documento_id: idDocumento, codigo_local: loc.codigoLocal, nombre_local: loc.nombreLocal, fecha_entrega: loc.fechaEntrega || null, hora_entrega: loc.horaEntrega || null, sello_trasero: '', cantidad_pallet: 0, total_carga: 0 }) });
      }
      setMensaje('✅ Transporte ' + idDocumento + ' creado'); setTipoMensaje('success');
      setTimeout(() => { setShowCrearModal(false); limpiarFormulario(); setMensaje(''); }, 1500);
      cargarTransportes();
    } catch (e: any) { setMensaje('Error: ' + e.message); setTipoMensaje('error'); }
    finally { setGuardando(false); }
  };

  const limpiarFormulario = () => {
    setFechaProgramacion(''); setConductor(''); setPatentePrincipal(''); setPatenteAdicional('');
    setObservaciones(''); setLocales([{ id: 1, codigoLocal: '', nombreLocal: '', fechaEntrega: '', horaEntrega: '' }]);
  };

  // ============ CARGA EXCEL ============
  const procesarArchivoExcel = () => {
    if (!archivoExcel) { setMensajeExcel('Selecciona un archivo'); return; }
    setProcesandoExcel(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][];
      
      // Agrupar por transporte (separados por filas vacías)
      const transportesAgrupados: any[][] = [];
      let grupoActual: any[] = [];
      
      for (const row of sheet) {
        const tieneDatos = row.some((cell: any) => cell !== undefined && cell !== null && String(cell).trim() !== '');
        if (!tieneDatos) {
          if (grupoActual.length > 0) {
            transportesAgrupados.push(grupoActual);
            grupoActual = [];
          }
        } else {
          grupoActual.push(row);
        }
      }
      if (grupoActual.length > 0) transportesAgrupados.push(grupoActual);

      // Procesar cada grupo (transporte)
      const vista: any[] = [];
      for (const grupo of transportesAgrupados) {
        if (grupo.length < 2) continue; // Necesita al menos encabezado + 1 fila
        
        const headerRow = grupo[0];
        const colCodTi = headerRow.findIndex((h: any) => String(h || '').trim().toUpperCase() === 'CÓD TI' || String(h || '').trim().toUpperCase() === 'COD TI');
        const colTienda = headerRow.findIndex((h: any) => String(h || '').trim().toUpperCase() === 'TIENDA');
        const colConductor = headerRow.findIndex((h: any) => String(h || '').trim().toUpperCase() === 'CONDUCTOR');
        const colVehiculo = headerRow.findIndex((h: any) => String(h || '').trim().toUpperCase() === 'VEHÍCULO' || String(h || '').trim().toUpperCase() === 'VEHICULO');
        const colFecha = headerRow.findIndex((h: any) => String(h || '').trim().toUpperCase() === 'FECHA ENTREGA');
        const colHora = headerRow.findIndex((h: any) => String(h || '').trim().toUpperCase() === 'HORA ENTREGA');
        
        if (colCodTi === -1) continue;

        const conductorNombre = String(grupo[1][colConductor] || '').trim();
        const patente = String(grupo[1][colVehiculo] || '').trim();
        const fechaEntrega = String(grupo[1][colFecha] || '').trim();
        const horaEntrega = String(grupo[1][colHora] || '').trim();

        const localesTransporte: any[] = [];
        for (let i = 1; i < grupo.length; i++) {
          const row = grupo[i];
          const codTi = String(row[colCodTi] || '').trim();
          const tienda = String(row[colTienda] || '').trim();
          if (codTi) {
            localesTransporte.push({ codigo: codTi, nombre: tienda });
          }
        }

        vista.push({
          conductor: conductorNombre,
          patente: patente,
          fechaEntrega: fechaEntrega,
          horaEntrega: horaEntrega,
          locales: localesTransporte,
          totalLocales: localesTransporte.length,
        });
      }

      setVistaPrevia(vista);
      setProcesandoExcel(false);
    };
    reader.readAsArrayBuffer(archivoExcel);
  };

  const guardarTransportesExcel = async () => {
    if (vistaPrevia.length === 0) return;
    setProcesandoExcel(true);
    setMensajeExcel('');
    try {
      const user = auth.getUsuario();
      let creados = 0;
      
      for (const t of vistaPrevia) {
        const conductorData = conductores.find((c: any) => c.nombre_completo?.toUpperCase() === t.conductor.toUpperCase());
        const patenteData = patentes.find((p: any) => p.numero_patente?.toUpperCase() === t.patente.toUpperCase());

        const now = new Date();
        const fecha = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0') + now.getFullYear();
        const respCount = await fetch(API_URL + '/sd01_documentos?select=id&order=creado_en.desc&limit=1', { headers: HEADERS });
        const countData = await respCount.json();
        const count = (countData?.length || 0) + 1;
        const idDocumento = 'SD01-' + fecha + '-' + String(count).padStart(4, '0');

        await fetch(API_URL + '/sd01_documentos', {
          method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_documento: idDocumento,
            conductor_id: conductorData?.id || null,
            patente_principal_id: patenteData?.id || null,
            fecha_programacion: new Date().toISOString().split('T')[0],
            administrativo: (user?.nombre || '') + ' ' + (user?.apellido || ''),
            estado: 'Pendiente',
            creado_por: user?.id,
          }),
        });

        for (const loc of t.locales) {
          await fetch(API_URL + '/sd01_documento_locales', {
            method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documento_id: idDocumento, codigo_local: loc.codigo, nombre_local: loc.nombre,
              fecha_entrega: t.fechaEntrega || null, hora_entrega: t.horaEntrega || null,
              sello_trasero: '', cantidad_pallet: 0, total_carga: 0,
            }),
          });
        }
        creados++;
      }

      setMensajeExcel('✅ ' + creados + ' transportes creados correctamente');
      setTimeout(() => { setShowExcelModal(false); setVistaPrevia([]); setArchivoExcel(null); setNombreArchivoExcel(''); setMensajeExcel(''); }, 2000);
      cargarTransportes();
    } catch (e: any) { setMensajeExcel('Error: ' + e.message); }
    finally { setProcesandoExcel(false); }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Pendiente': return { color: '#b45309', bg: '#fef3c7' };
      case 'Borrador': return { color: '#64748b', bg: '#f1f5f9' };
      case 'Asignado': case 'En Proceso': return { color: '#1d4ed8', bg: '#dbeafe' };
      case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' };
      case 'Cancelado': return { color: '#dc2626', bg: '#fef2f2' };
      default: return { color: '#64748b', bg: '#f1f5f9' };
    }
  };

  return (
    <div className="sd01-view">
      <div className="sd01-header"><h2>SD01 · Gestión de Transportes</h2></div>

      {/* BARRA DE HERRAMIENTAS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button className="sd01-btn-nueva" onClick={() => { limpiarFormulario(); setShowCrearModal(true); }}>+ Nuevo Transporte</button>
        <button className="sd01-btn-nueva" style={{ background: '#1d4ed8' }} onClick={() => { setShowExcelModal(true); setVistaPrevia([]); setArchivoExcel(null); setNombreArchivoExcel(''); setMensajeExcel(''); }}>📁 Carga Excel</button>
      </div>

      {/* TABLA */}
      <div className="ed03-tabla-container">
        <table className="ed03-tabla">
          <thead><tr><th>ID</th><th>Fecha Prog.</th><th>Conductor</th><th>Patente</th><th>Locales</th><th>Estado</th><th>Creado</th><th style={{ width: '180px' }}>Acciones</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr> :
              transportes.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Sin transportes</td></tr> :
              transportes.map((t: any) => {
                const eb = getEstadoBadge(t.estado);
                return (
                  <tr key={t.id}><td className="ed03-ticket-id">{t.id_documento}</td><td>{t.fecha_programacion ? new Date(t.fecha_programacion + 'T00:00:00').toLocaleDateString('es-CL') : '-'}</td><td>{t.nombre_conductor}</td><td>{t.numero_patente}</td><td style={{ textAlign: 'center' }}>{t.total_locales}</td><td><span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: eb.bg, color: eb.color }}>{t.estado}</span></td><td>{new Date(t.creado_en).toLocaleDateString('es-CL')}</td><td><div style={{ display: 'flex', gap: '4px' }}><button style={{ padding: '5px 10px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Ver</button>{(t.estado === 'Borrador' || t.estado === 'Pendiente') && (<><button style={{ padding: '5px 10px', background: '#b45309', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Editar</button><button style={{ padding: '5px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Cancelar</button></>)}</div></td></tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* MODAL MANUAL */}
      {showCrearModal && (
        <div className="ed01-modal-overlay" onClick={() => !guardando && setShowCrearModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '800px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header"><h2>Nuevo Transporte</h2><button className="ed01-modal-close" onClick={() => setShowCrearModal(false)}>×</button></div>
            <div className="ed01-modal-body">
              <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Fecha Programación *</label><input type="date" value={fechaProgramacion} onChange={e => setFechaProgramacion(e.target.value)} style={{ width: '200px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ position: 'relative' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Conductor *</label><input ref={conductorRef} type="text" value={conductor} onChange={e => handleConductorChange(e.target.value)} onFocus={() => { if (conductor) handleConductorChange(conductor); }} onKeyDown={handleConductorKeyDown} placeholder="Buscar..." autoComplete="off" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
                  {showConductorSuggestions && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '2px solid #3b82f6', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, maxHeight: '180px', overflowY: 'auto' }}>{conductorSuggestions.map((c: any, i: number) => (<div key={c.id} onClick={() => selectConductor(c)} style={{ padding: '10px 14px', fontSize: '14px', cursor: 'pointer', background: i === conductorHighlight ? '#1d4ed8' : 'white', color: i === conductorHighlight ? 'white' : '#1e293b', fontWeight: i === conductorHighlight ? 600 : 400, borderBottom: '1px solid #f1f5f9' }}>{c.nombre_completo}</div>))}</div>)}</div>
                <div style={{ position: 'relative' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Patente Principal *</label><input ref={patentePRef} type="text" value={patentePrincipal} onChange={e => handlePatentePChange(e.target.value)} onFocus={() => { if (patentePrincipal) handlePatentePChange(patentePrincipal); }} onKeyDown={handlePatentePKeyDown} placeholder="Buscar..." autoComplete="off" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
                  {showPatentePSuggestions && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '2px solid #3b82f6', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, maxHeight: '180px', overflowY: 'auto' }}>{patentePSuggestions.map((p: any, i: number) => (<div key={p.id} onClick={() => selectPatenteP(p)} style={{ padding: '10px 14px', fontSize: '14px', cursor: 'pointer', background: i === patentePHighlight ? '#1d4ed8' : 'white', color: i === patentePHighlight ? 'white' : '#1e293b', fontWeight: i === patentePHighlight ? 600 : 400, borderBottom: '1px solid #f1f5f9' }}>{p.numero_patente}</div>))}</div>)}</div>
                <div style={{ position: 'relative' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Patente Adicional</label><input ref={patenteARef} type="text" value={patenteAdicional} onChange={e => handlePatenteAChange(e.target.value)} onFocus={() => { if (patenteAdicional) handlePatenteAChange(patenteAdicional); }} onKeyDown={handlePatenteAKeyDown} placeholder="Buscar..." autoComplete="off" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
                  {showPatenteASuggestions && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '2px solid #3b82f6', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, maxHeight: '180px', overflowY: 'auto' }}>{patenteASuggestions.map((p: any, i: number) => (<div key={p.id} onClick={() => selectPatenteA(p)} style={{ padding: '10px 14px', fontSize: '14px', cursor: 'pointer', background: i === patenteAHighlight ? '#1d4ed8' : 'white', color: i === patenteAHighlight ? 'white' : '#1e293b', fontWeight: i === patenteAHighlight ? 600 : 400, borderBottom: '1px solid #f1f5f9' }}>{p.numero_patente}</div>))}</div>)}</div>
              </div>
              <div style={{ marginBottom: '16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}><label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Locales *</label><button onClick={addLocal} style={{ padding: '6px 14px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>+ Agregar</button></div><div style={{ border: '1px solid #eef0f5', borderRadius: '8px', overflow: 'auto', maxHeight: '250px' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}><thead><tr style={{ background: '#fafcff' }}><th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Código</th><th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Nombre</th><th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Fecha Entrega</th><th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Hora</th><th style={{ width: '40px', borderBottom: '1px solid #eef0f5' }}></th></tr></thead><tbody>{locales.map((loc) => (<tr key={loc.id}><td style={{ padding: '8px' }}><input type="text" value={loc.codigoLocal} onChange={e => updateLocal(loc.id, 'codigoLocal', e.target.value.toUpperCase())} placeholder="T001" maxLength={4} style={{ width: '80px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }} /></td><td style={{ padding: '8px' }}><input type="text" value={loc.nombreLocal} readOnly placeholder="Auto" style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', background: '#f8fafd', color: '#64748b' }} /></td><td style={{ padding: '8px' }}><input type="date" value={loc.fechaEntrega} onChange={e => updateLocal(loc.id, 'fechaEntrega', e.target.value)} style={{ width: '130px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }} /></td><td style={{ padding: '8px' }}><select value={loc.horaEntrega} onChange={e => updateLocal(loc.id, 'horaEntrega', e.target.value)} style={{ width: '100px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }}><option value="">--</option>{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></td><td style={{ padding: '8px', textAlign: 'center' }}>{locales.length > 1 && <button onClick={() => removeLocal(loc.id)} style={{ width: '24px', height: '24px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>×</button>}</td></tr>))}</tbody></table></div></div>
              <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Observaciones</label><textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Observaciones..." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }} /></div>
              {mensaje && <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', background: tipoMensaje === 'success' ? '#dcfce7' : '#fef2f2', color: tipoMensaje === 'success' ? '#15803d' : '#dc2626' }}>{mensaje}</div>}
            </div>
            <div className="ed01-modal-footer"><button className="ed01-btn-cancel" onClick={() => setShowCrearModal(false)}>Cancelar</button><button className="ed01-btn-save" style={{ background: '#f59e0b' }} onClick={() => handleGuardarManual('Borrador')} disabled={guardando}>{guardando ? '...' : 'Guardar Borrador'}</button><button className="ed01-btn-save" onClick={() => handleGuardarManual('Pendiente')} disabled={guardando}>{guardando ? '...' : 'Crear Transporte'}</button></div>
          </div>
        </div>
      )}

      {/* MODAL EXCEL */}
      {showExcelModal && (
        <div className="ed01-modal-overlay" onClick={() => !procesandoExcel && setShowExcelModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '700px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header"><h2>Carga Masiva por Excel</h2><button className="ed01-modal-close" onClick={() => setShowExcelModal(false)}>×</button></div>
            <div className="ed01-modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>Archivo Excel (.xlsx)</label>
                <div onClick={() => document.getElementById('file-excel-sd')?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '28px', border: '2px dashed #e2e8f0', borderRadius: '10px', cursor: 'pointer', background: '#fafcff', color: '#94a3b8', fontSize: '13px' }}>
                  <input id="file-excel-sd" type="file" accept=".xlsx,.xls" hidden onChange={(e: any) => { setArchivoExcel(e.target.files?.[0] || null); setNombreArchivoExcel(e.target.files?.[0]?.name || ''); setVistaPrevia([]); }} />
                  {nombreArchivoExcel ? <span style={{ color: '#1e293b', fontWeight: 500 }}>{nombreArchivoExcel}</span> : <><span>Seleccionar archivo</span></>}
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                Columnas: <strong>Cód TI, Tienda, Conductor, Vehículo, Fecha Entrega, Hora Entrega</strong><br />
                Los transportes se separan por una fila en blanco.
              </p>
              {archivoExcel && <button className="sd01-btn-nueva" onClick={procesarArchivoExcel} style={{ marginBottom: '12px' }}>🔍 Analizar archivo</button>}

              {/* Vista previa */}
              {vistaPrevia.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>{vistaPrevia.length} transporte(s) encontrado(s):</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {vistaPrevia.map((t: any, i: number) => (
                      <div key={i} style={{ padding: '10px', marginBottom: '8px', background: '#f8fafd', borderRadius: '8px', border: '1px solid #eef0f5', fontSize: '13px' }}>
                        <div><strong>Conductor:</strong> {t.conductor} | <strong>Patente:</strong> {t.patente} | <strong>Fecha:</strong> {t.fechaEntrega} | <strong>Hora:</strong> {t.horaEntrega}</div>
                        <div style={{ marginTop: '4px', color: '#64748b' }}>{t.totalLocales} locales: {t.locales.map((l: any) => l.codigo + ' ' + l.nombre).join(', ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mensajeExcel && <div style={{ padding: '10px', borderRadius: '8px', fontSize: '13px', background: mensajeExcel.includes('✅') ? '#dcfce7' : '#fef2f2', color: mensajeExcel.includes('✅') ? '#15803d' : '#dc2626' }}>{mensajeExcel}</div>}
            </div>
            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => setShowExcelModal(false)}>Cancelar</button>
              {vistaPrevia.length > 0 && <button className="ed01-btn-save" onClick={guardarTransportesExcel} disabled={procesandoExcel}>{procesandoExcel ? 'Creando...' : 'Crear ' + vistaPrevia.length + ' Transportes'}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD01View;
