// src/components/Transactions/SD/SD01View.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import { cargarLocales } from '../../../data/locales';
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

  const [showCrearModal, setShowCrearModal] = useState(false);
  const [fechaProgramacion, setFechaProgramacion] = useState('');
  const [conductor, setConductor] = useState('');
  const [patentePrincipal, setPatentePrincipal] = useState('');
  const [patenteAdicional, setPatenteAdicional] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [locales, setLocales] = useState<LocalRow[]>([
    { id: 1, codigoLocal: '', nombreLocal: '', fechaEntrega: '', horaEntrega: '' }
  ]);

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

  const addLocal = () => {
    const newId = Math.max(...locales.map(l => l.id), 0) + 1;
    setLocales([...locales, { id: newId, codigoLocal: '', nombreLocal: '', fechaEntrega: '', horaEntrega: '' }]);
  };

  const removeLocal = (id: number) => {
    if (locales.length === 1) return;
    setLocales(locales.filter(l => l.id !== id));
  };

  const updateLocal = (id: number, field: keyof LocalRow, value: string) => {
    setLocales(locales.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === 'codigoLocal') {
        const loc = (window as any).__locales?.find((x: any) => x.codigo_local?.toUpperCase() === value.toUpperCase());
        if (loc) updated.nombreLocal = loc.nombre_local;
      }
      return updated;
    }));
  };

  // ============ AUTOCOMPLETE GENÉRICO ============
  const filterStartsWith = (list: any[], field: string, search: string) => {
    return list.filter((item: any) => String(item[field] || '').toLowerCase().startsWith(search.toLowerCase()));
  };

  // Conductor
  const handleConductorChange = (value: string) => {
    setConductor(value);
    const filtered = filterStartsWith(conductores, 'nombre_completo', value);
    setConductorSuggestions(filtered);
    setShowConductorSuggestions(filtered.length > 0 && value.length > 0);
    setConductorHighlight(-1);
  };

  const handleConductorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setConductorHighlight(prev => prev < conductorSuggestions.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setConductorHighlight(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (conductorHighlight >= 0 && conductorSuggestions[conductorHighlight]) {
        selectConductor(conductorSuggestions[conductorHighlight]);
      } else {
        const first = filterStartsWith(conductores, 'nombre_completo', conductor)[0];
        if (first) selectConductor(first);
      }
    } else if (e.key === 'Tab') {
      const first = filterStartsWith(conductores, 'nombre_completo', conductor)[0];
      if (first) { e.preventDefault(); selectConductor(first); }
    } else if (e.key === 'Escape') {
      setShowConductorSuggestions(false);
    }
  };

  const selectConductor = (c: any) => {
    setConductor(c.nombre_completo || '');
    setShowConductorSuggestions(false);
    setConductorHighlight(-1);
    setTimeout(() => patentePRef.current?.focus(), 100);
  };

  // Patente Principal
  const handlePatentePChange = (value: string) => {
    setPatentePrincipal(value);
    const filtered = filterStartsWith(patentes, 'numero_patente', value);
    setPatentePSuggestions(filtered);
    setShowPatentePSuggestions(filtered.length > 0 && value.length > 0);
    setPatentePHighlight(-1);
  };

  const handlePatentePKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setPatentePHighlight(prev => prev < patentePSuggestions.length - 1 ? prev + 1 : prev); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setPatentePHighlight(prev => prev > 0 ? prev - 1 : -1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (patentePHighlight >= 0 && patentePSuggestions[patentePHighlight]) { selectPatenteP(patentePSuggestions[patentePHighlight]); }
      else { const first = filterStartsWith(patentes, 'numero_patente', patentePrincipal)[0]; if (first) selectPatenteP(first); }
    } else if (e.key === 'Tab') {
      const first = filterStartsWith(patentes, 'numero_patente', patentePrincipal)[0];
      if (first) { e.preventDefault(); selectPatenteP(first); }
    } else if (e.key === 'Escape') { setShowPatentePSuggestions(false); }
  };

  const selectPatenteP = (p: any) => {
    setPatentePrincipal(p.numero_patente || '');
    setShowPatentePSuggestions(false);
    setPatentePHighlight(-1);
    setTimeout(() => patenteARef.current?.focus(), 100);
  };

  // Patente Adicional
  const handlePatenteAChange = (value: string) => {
    setPatenteAdicional(value);
    const filtered = filterStartsWith(patentes, 'numero_patente', value);
    setPatenteASuggestions(filtered);
    setShowPatenteASuggestions(filtered.length > 0 && value.length > 0);
    setPatenteAHighlight(-1);
  };

  const handlePatenteAKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setPatenteAHighlight(prev => prev < patenteASuggestions.length - 1 ? prev + 1 : prev); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setPatenteAHighlight(prev => prev > 0 ? prev - 1 : -1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (patenteAHighlight >= 0 && patenteASuggestions[patenteAHighlight]) { selectPatenteA(patenteASuggestions[patenteAHighlight]); }
      else { const first = filterStartsWith(patentes, 'numero_patente', patenteAdicional)[0]; if (first) selectPatenteA(first); }
    } else if (e.key === 'Tab') {
      const first = filterStartsWith(patentes, 'numero_patente', patenteAdicional)[0];
      if (first) { e.preventDefault(); selectPatenteA(first); }
    } else if (e.key === 'Escape') { setShowPatenteASuggestions(false); }
  };

  const selectPatenteA = (p: any) => {
    setPatenteAdicional(p.numero_patente || '');
    setShowPatenteASuggestions(false);
    setPatenteAHighlight(-1);
  };

  // Guardar
  const handleGuardar = async (estado: string) => {
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
        await fetch(API_URL + '/sd01_documento_locales', {
          method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ documento_id: idDocumento, codigo_local: loc.codigoLocal, nombre_local: loc.nombreLocal, fecha_entrega: loc.fechaEntrega || null, hora_entrega: loc.horaEntrega || null, sello_trasero: '', cantidad_pallet: 0, total_carga: 0 }),
        });
      }

      setMensaje('✅ Transporte ' + idDocumento + ' creado');
      setTipoMensaje('success');
      setTimeout(() => { setShowCrearModal(false); limpiarFormulario(); setMensaje(''); }, 1500);
      cargarTransportes();
    } catch (e: any) { setMensaje('Error: ' + e.message); setTipoMensaje('error'); }
    finally { setGuardando(false); }
  };

  const limpiarFormulario = () => {
    setFechaProgramacion(''); setConductor(''); setPatentePrincipal(''); setPatenteAdicional('');
    setObservaciones(''); setLocales([{ id: 1, codigoLocal: '', nombreLocal: '', fechaEntrega: '', horaEntrega: '' }]);
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
      <div className="sd01-header">
        <h2>SD01 · Gestión de Transportes</h2>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button className="sd01-btn-nueva" onClick={() => { limpiarFormulario(); setShowCrearModal(true); }}>+ Nuevo Transporte</button>
        <button className="sd01-btn-nueva" style={{ background: '#1d4ed8' }}>📁 Carga Excel</button>
      </div>

      <div className="ed03-tabla-container">
        <table className="ed03-tabla">
          <thead>
            <tr><th>ID</th><th>Fecha Prog.</th><th>Conductor</th><th>Patente</th><th>Locales</th><th>Estado</th><th>Creado</th><th style={{ width: '180px' }}>Acciones</th></tr>
          </thead>
          <tbody>
            {cargando ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr> :
              transportes.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Sin transportes</td></tr> :
              transportes.map((t: any) => {
                const eb = getEstadoBadge(t.estado);
                return (
                  <tr key={t.id}>
                    <td className="ed03-ticket-id">{t.id_documento}</td>
                    <td>{t.fecha_programacion ? new Date(t.fecha_programacion + 'T00:00:00').toLocaleDateString('es-CL') : '-'}</td>
                    <td>{t.nombre_conductor}</td>
                    <td>{t.numero_patente}</td>
                    <td style={{ textAlign: 'center' }}>{t.total_locales}</td>
                    <td><span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: eb.bg, color: eb.color }}>{t.estado}</span></td>
                    <td>{new Date(t.creado_en).toLocaleDateString('es-CL')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button style={{ padding: '5px 10px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Ver</button>
                        {(t.estado === 'Borrador' || t.estado === 'Pendiente') && (
                          <>
                            <button style={{ padding: '5px 10px', background: '#b45309', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Editar</button>
                            <button style={{ padding: '5px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Cancelar</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR */}
      {showCrearModal && (
        <div className="ed01-modal-overlay" onClick={() => !guardando && setShowCrearModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '800px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header"><h2>Nuevo Transporte</h2><button className="ed01-modal-close" onClick={() => setShowCrearModal(false)}>×</button></div>
            <div className="ed01-modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Fecha Programación *</label>
                <input type="date" value={fechaProgramacion} onChange={e => setFechaProgramacion(e.target.value)} style={{ width: '200px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Conductor */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Conductor *</label>
                  <input ref={conductorRef} type="text" value={conductor} onChange={e => handleConductorChange(e.target.value)} onFocus={() => { if (conductor) handleConductorChange(conductor); }} onKeyDown={handleConductorKeyDown} placeholder="Buscar..." autoComplete="off"
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
                  {showConductorSuggestions && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
                      {conductorSuggestions.map((c: any, i: number) => (
                        <div key={c.id} onClick={() => selectConductor(c)} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', background: i === conductorHighlight ? '#eef2ff' : 'white', borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={e => (e.target as HTMLElement).style.background = '#eef2ff'} onMouseLeave={e => (e.target as HTMLElement).style.background = i === conductorHighlight ? '#eef2ff' : 'white'}>
                          {c.nombre_completo}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Patente Principal */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Patente Principal *</label>
                  <input ref={patentePRef} type="text" value={patentePrincipal} onChange={e => handlePatentePChange(e.target.value)} onFocus={() => { if (patentePrincipal) handlePatentePChange(patentePrincipal); }} onKeyDown={handlePatentePKeyDown} placeholder="Buscar..." autoComplete="off"
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
                  {showPatentePSuggestions && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
                      {patentePSuggestions.map((p: any, i: number) => (
                        <div key={p.id} onClick={() => selectPatenteP(p)} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', background: i === patentePHighlight ? '#eef2ff' : 'white', borderBottom: '1px solid #f1f5f9' }}>
                          {p.numero_patente}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Patente Adicional */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Patente Adicional</label>
                  <input ref={patenteARef} type="text" value={patenteAdicional} onChange={e => handlePatenteAChange(e.target.value)} onFocus={() => { if (patenteAdicional) handlePatenteAChange(patenteAdicional); }} onKeyDown={handlePatenteAKeyDown} placeholder="Buscar..." autoComplete="off"
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
                  {showPatenteASuggestions && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
                      {patenteASuggestions.map((p: any, i: number) => (
                        <div key={p.id} onClick={() => selectPatenteA(p)} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', background: i === patenteAHighlight ? '#eef2ff' : 'white', borderBottom: '1px solid #f1f5f9' }}>
                          {p.numero_patente}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Locales */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Locales *</label>
                  <button onClick={addLocal} style={{ padding: '6px 14px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>+ Agregar</button>
                </div>
                <div style={{ border: '1px solid #eef0f5', borderRadius: '8px', overflow: 'auto', maxHeight: '250px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#fafcff' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Código</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Nombre</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Fecha Entrega</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Hora</th>
                        <th style={{ width: '40px', borderBottom: '1px solid #eef0f5' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {locales.map((loc) => (
                        <tr key={loc.id}>
                          <td style={{ padding: '8px' }}><input type="text" value={loc.codigoLocal} onChange={e => updateLocal(loc.id, 'codigoLocal', e.target.value.toUpperCase())} placeholder="D001" maxLength={4} style={{ width: '80px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }} /></td>
                          <td style={{ padding: '8px' }}><input type="text" value={loc.nombreLocal} readOnly placeholder="Auto" style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', background: '#f8fafd', color: '#64748b' }} /></td>
                          <td style={{ padding: '8px' }}><input type="date" value={loc.fechaEntrega} onChange={e => updateLocal(loc.id, 'fechaEntrega', e.target.value)} style={{ width: '130px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }} /></td>
                          <td style={{ padding: '8px' }}><select value={loc.horaEntrega} onChange={e => updateLocal(loc.id, 'horaEntrega', e.target.value)} style={{ width: '100px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }}><option value="">--</option>{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{locales.length > 1 && <button onClick={() => removeLocal(loc.id)} style={{ width: '24px', height: '24px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>×</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Observaciones</label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Observaciones..." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>

              {mensaje && <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', background: tipoMensaje === 'success' ? '#dcfce7' : '#fef2f2', color: tipoMensaje === 'success' ? '#15803d' : '#dc2626' }}>{mensaje}</div>}
            </div>
            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => setShowCrearModal(false)}>Cancelar</button>
              <button className="ed01-btn-save" style={{ background: '#f59e0b' }} onClick={() => handleGuardar('Borrador')} disabled={guardando}>{guardando ? '...' : 'Guardar Borrador'}</button>
              <button className="ed01-btn-save" onClick={() => handleGuardar('Pendiente')} disabled={guardando}>{guardando ? '...' : 'Crear Transporte'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD01View;
