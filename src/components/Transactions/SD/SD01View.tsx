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

  // Estados del formulario
  const [fechaProgramacion, setFechaProgramacion] = useState('');
  const [conductor, setConductor] = useState('');
  const [patentePrincipal, setPatentePrincipal] = useState('');
  const [patenteAdicional, setPatenteAdicional] = useState('');
  const [selloLateral, setSelloLateral] = useState('');
  const [selloAdicional, setSelloAdicional] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [locales, setLocales] = useState<LocalRow[]>([
    { id: 1, codigoLocal: '', nombreLocal: '', fechaEntrega: '', horaEntrega: '' }
  ]);

  // Datos de Supabase
  const [conductores, setConductores] = useState<any[]>([]);
  const [patentes, setPatentes] = useState<any[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'error'>('success');

  // Autocomplete
  const [showConductorSuggestions, setShowConductorSuggestions] = useState(false);
  const [conductorSuggestions, setConductorSuggestions] = useState<any[]>([]);
  const [showPatentePSuggestions, setShowPatentePSuggestions] = useState(false);
  const [patentePSuggestions, setPatentePSuggestions] = useState<any[]>([]);
  const [showPatenteASuggestions, setShowPatenteASuggestions] = useState(false);
  const [patenteASuggestions, setPatenteASuggestions] = useState<any[]>([]);

  const conductorRef = useRef<HTMLInputElement>(null);
  const patentePRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cargarLocales(); cargarDatosIniciales(); }, []);

  const cargarDatosIniciales = async () => {
    setCargandoDatos(true);
    try {
      const [respCond, respPat] = await Promise.all([
        fetch(API_URL + '/sd01_conductores?select=*&activo=eq.true&order=nombre,apellido', { headers: HEADERS }),
        fetch(API_URL + '/sd01_patentes?select=*&activo=eq.true&order=numero_patente', { headers: HEADERS }),
      ]);
      const condData = await respCond.json();
      const patData = await respPat.json();
      setConductores((condData || []).map((c: any) => ({ ...c, nombre_completo: c.nombre + ' ' + c.apellido })));
      setPatentes(patData || []);
    } catch (e) {}
    setCargandoDatos(false);
  };

  // Agregar / Eliminar locales
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

  // Autocomplete Conductor (startsWith)
  const handleConductorChange = (value: string) => {
    setConductor(value);
    if (value.trim()) {
      const filtered = conductores.filter((c: any) => c.nombre_completo?.toLowerCase().startsWith(value.toLowerCase()));
      setConductorSuggestions(filtered);
      setShowConductorSuggestions(filtered.length > 0);
    } else {
      setShowConductorSuggestions(false);
    }
  };

  const selectConductor = (c: any) => {
    setConductor(c.nombre_completo || '');
    setShowConductorSuggestions(false);
  };

  // Autocomplete Patente Principal (startsWith)
  const handlePatentePChange = (value: string) => {
    setPatentePrincipal(value);
    if (value.trim()) {
      const filtered = patentes.filter((p: any) => p.numero_patente?.toUpperCase().startsWith(value.toUpperCase()));
      setPatentePSuggestions(filtered);
      setShowPatentePSuggestions(filtered.length > 0);
    } else {
      setShowPatentePSuggestions(false);
    }
  };

  const selectPatenteP = (p: any) => {
    setPatentePrincipal(p.numero_patente || '');
    setShowPatentePSuggestions(false);
  };

  // Autocomplete Patente Adicional (startsWith)
  const handlePatenteAChange = (value: string) => {
    setPatenteAdicional(value);
    if (value.trim()) {
      const filtered = patentes.filter((p: any) => p.numero_patente?.toUpperCase().startsWith(value.toUpperCase()));
      setPatenteASuggestions(filtered);
      setShowPatenteASuggestions(filtered.length > 0);
    } else {
      setShowPatenteASuggestions(false);
    }
  };

  const selectPatenteA = (p: any) => {
    setPatenteAdicional(p.numero_patente || '');
    setShowPatenteASuggestions(false);
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

      // Generar ID
      const now = new Date();
      const fecha = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0') + now.getFullYear();
      const respCount = await fetch(API_URL + '/sd01_documentos?select=id&order=creado_en.desc&limit=1', { headers: HEADERS });
      const countData = await respCount.json();
      const count = (countData?.length || 0) + 1;
      const idDocumento = 'SD01-' + fecha + '-' + String(count).padStart(4, '0');

      // Crear documento
      const respDoc = await fetch(API_URL + '/sd01_documentos', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_documento: idDocumento,
          conductor_id: conductorData?.id || null,
          patente_principal_id: patentePData?.id || null,
          patente_adicional_id: patenteSData?.id || null,
          fecha_programacion: fechaProgramacion,
          sello_lateral: selloLateral,
          sello_adicional: selloAdicional,
          administrativo: (user?.nombre || '') + ' ' + (user?.apellido || ''),
          observaciones: observaciones,
          estado: estado,
          creado_por: user?.id,
        }),
      });
      const docCreado = await respDoc.json();
      const docId = Array.isArray(docCreado) ? docCreado[0]?.id : docCreado?.id;

      // Crear locales
      for (const loc of localesValidos) {
        await fetch(API_URL + '/sd01_documento_locales', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documento_id: idDocumento,
            codigo_local: loc.codigoLocal,
            nombre_local: loc.nombreLocal,
            fecha_entrega: loc.fechaEntrega || null,
            hora_entrega: loc.horaEntrega || null,
            sello_trasero: '',
            cantidad_pallet: 0,
            total_carga: 0,
          }),
        });
      }

      setMensaje('✅ Transporte ' + idDocumento + ' creado como ' + (estado === 'Pendiente' ? 'Pendiente' : 'Borrador'));
      setTipoMensaje('success');
      limpiarFormulario();
    } catch (e: any) {
      setMensaje('Error: ' + e.message);
      setTipoMensaje('error');
    } finally {
      setGuardando(false);
    }
  };

  const limpiarFormulario = () => {
    setFechaProgramacion('');
    setConductor('');
    setPatentePrincipal('');
    setPatenteAdicional('');
    setSelloLateral('');
    setSelloAdicional('');
    setObservaciones('');
    setLocales([{ id: 1, codigoLocal: '', nombreLocal: '', fechaEntrega: '', horaEntrega: '' }]);
  };

  if (cargandoDatos) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#64748b' }}>Cargando datos...</div>;

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', marginBottom: '20px' }}>SD01 · Crear Transporte</h2>

      {/* Fecha Programación */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Fecha Programación *</label>
        <input type="date" value={fechaProgramacion} onChange={e => setFechaProgramacion(e.target.value)}
          style={{ width: '200px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
      </div>

      {/* Conductor + Patentes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Conductor */}
        <div style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Conductor *</label>
          <input ref={conductorRef} type="text" value={conductor} onChange={e => handleConductorChange(e.target.value)}
            onFocus={() => { if (conductor) handleConductorChange(conductor); }}
            placeholder="Buscar conductor..." autoComplete="off"
            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
          {showConductorSuggestions && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '180px', overflowY: 'auto' }}>
              {conductorSuggestions.map((c: any) => (
                <div key={c.id} onClick={() => selectConductor(c)} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  onMouseEnter={e => (e.target as HTMLElement).style.background = '#f1f5f9'} onMouseLeave={e => (e.target as HTMLElement).style.background = 'white'}>
                  {c.nombre_completo}
                </div>
              ))}
              <div onClick={() => { setShowConductorSuggestions(false); }} style={{ padding: '8px 12px', fontSize: '12px', color: '#3b82f6', cursor: 'pointer', fontWeight: 500 }}>
                + Agregar nuevo conductor
              </div>
            </div>
          )}
        </div>

        {/* Patente Principal */}
        <div style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Patente Principal *</label>
          <input ref={patentePRef} type="text" value={patentePrincipal} onChange={e => handlePatentePChange(e.target.value)}
            onFocus={() => { if (patentePrincipal) handlePatentePChange(patentePrincipal); }}
            placeholder="Buscar patente..." autoComplete="off"
            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
          {showPatentePSuggestions && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '180px', overflowY: 'auto' }}>
              {patentePSuggestions.map((p: any) => (
                <div key={p.id} onClick={() => selectPatenteP(p)} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  onMouseEnter={e => (e.target as HTMLElement).style.background = '#f1f5f9'} onMouseLeave={e => (e.target as HTMLElement).style.background = 'white'}>
                  {p.numero_patente}
                </div>
              ))}
              <div onClick={() => { setShowPatentePSuggestions(false); }} style={{ padding: '8px 12px', fontSize: '12px', color: '#3b82f6', cursor: 'pointer', fontWeight: 500 }}>
                + Agregar nueva patente
              </div>
            </div>
          )}
        </div>

        {/* Patente Adicional */}
        <div style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Patente Adicional</label>
          <input type="text" value={patenteAdicional} onChange={e => handlePatenteAChange(e.target.value)}
            onFocus={() => { if (patenteAdicional) handlePatenteAChange(patenteAdicional); }}
            placeholder="Buscar patente..." autoComplete="off"
            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
          {showPatenteASuggestions && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '180px', overflowY: 'auto' }}>
              {patenteASuggestions.map((p: any) => (
                <div key={p.id} onClick={() => selectPatenteA(p)} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  onMouseEnter={e => (e.target as HTMLElement).style.background = '#f1f5f9'} onMouseLeave={e => (e.target as HTMLElement).style.background = 'white'}>
                  {p.numero_patente}
                </div>
              ))}
              <div onClick={() => { setShowPatenteASuggestions(false); }} style={{ padding: '8px 12px', fontSize: '12px', color: '#3b82f6', cursor: 'pointer', fontWeight: 500 }}>
                + Agregar nueva patente
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sellos */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Sello Lateral</label>
          <input type="text" value={selloLateral} onChange={e => setSelloLateral(e.target.value)} placeholder="N° Sello"
            style={{ width: '140px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Sello Adicional</label>
          <input type="text" value={selloAdicional} onChange={e => setSelloAdicional(e.target.value)} placeholder="N° Sello"
            style={{ width: '140px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
        </div>
      </div>

      {/* Tabla de Locales */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Locales *</label>
          <button onClick={addLocal} style={{ padding: '6px 14px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>+ Agregar Local</button>
        </div>
        <div style={{ border: '1px solid #eef0f5', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#fafcff' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5', width: '120px' }}>Código Local</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Nombre Local</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5', width: '150px' }}>Fecha Entrega</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5', width: '130px' }}>Hora Entrega</th>
                <th style={{ width: '40px', borderBottom: '1px solid #eef0f5' }}></th>
              </tr>
            </thead>
            <tbody>
              {locales.map((loc) => (
                <tr key={loc.id}>
                  <td style={{ padding: '8px' }}>
                    <input type="text" value={loc.codigoLocal} onChange={e => updateLocal(loc.id, 'codigoLocal', e.target.value.toUpperCase())}
                      placeholder="D001" maxLength={4}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type="text" value={loc.nombreLocal} readOnly placeholder="Auto-completado"
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', background: '#f8fafd', color: '#64748b' }} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type="date" value={loc.fechaEntrega} onChange={e => updateLocal(loc.id, 'fechaEntrega', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <select value={loc.horaEntrega} onChange={e => updateLocal(loc.id, 'horaEntrega', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }}>
                      <option value="">Seleccionar</option>
                      {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    {locales.length > 1 && (
                      <button onClick={() => removeLocal(loc.id)} style={{ width: '24px', height: '24px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Observaciones */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Observaciones</label>
        <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Observaciones generales..."
          style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }} />
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', background: tipoMensaje === 'success' ? '#dcfce7' : '#fef2f2', color: tipoMensaje === 'success' ? '#15803d' : '#dc2626' }}>
          {mensaje}
        </div>
      )}

      {/* Botones */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button onClick={limpiarFormulario} style={{ padding: '10px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#64748b' }}>Cancelar</button>
        <button onClick={() => handleGuardar('Borrador')} disabled={guardando} style={{ padding: '10px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
          {guardando ? 'Guardando...' : 'Guardar Borrador'}
        </button>
        <button onClick={() => handleGuardar('Pendiente')} disabled={guardando} style={{ padding: '10px 20px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
          {guardando ? 'Guardando...' : 'Crear Transporte'}
        </button>
      </div>
    </div>
  );
};

export default SD01View;
