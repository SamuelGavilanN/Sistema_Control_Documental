// src/components/Transactions/SD/SD01EditarModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../lib/auth';
import { locales as localesData } from '../../../data/locales';

interface LocalRow {
  id: number;
  codigoLocal: string;
  nombreLocal: string;
  fechaEntrega: string;
  horaEntrega: string;
}

interface SD01EditarModalProps {
  isOpen: boolean;
  transporte: any;
  localesAsignados: any[];
  conductores: any[];
  patentes: any[];
  onClose: () => void;
  onGuardar: (data: any) => void;
  onCancelar: () => void;
}

const timeOptions = (() => {
  const options: string[] = [];
  for (let h = 6; h < 24; h++) {
    options.push(h.toString().padStart(2, '0') + ':00');
    options.push(h.toString().padStart(2, '0') + ':30');
  }
  for (let h = 0; h < 6; h++) {
    options.push(h.toString().padStart(2, '0') + ':00');
    options.push(h.toString().padStart(2, '0') + ':30');
  }
  return options;
})();

const SD01EditarModal: React.FC<SD01EditarModalProps> = ({
  isOpen,
  transporte,
  localesAsignados,
  conductores,
  patentes,
  onClose,
  onGuardar,
  onCancelar,
}) => {
  const [fechaProgramacion, setFechaProgramacion] = useState('');
  const [conductor, setConductor] = useState('');
  const [patentePrincipal, setPatentePrincipal] = useState('');
  const [patenteAdicional, setPatenteAdicional] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [locales, setLocales] = useState<LocalRow[]>([]);
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

  useEffect(() => {
    if (isOpen && transporte) {
      setFechaProgramacion(transporte.fecha_programacion || '');
      setConductor(transporte.nombre_conductor || '');
      setPatentePrincipal(transporte.numero_patente || '');
      setPatenteAdicional(transporte.patente_adicional || '');
      setObservaciones(transporte.observaciones || '');

      // Cargar locales
      if (localesAsignados && localesAsignados.length > 0) {
        setLocales(localesAsignados.map((loc: any, idx: number) => ({
          id: idx + 1,
          codigoLocal: loc.codigo_local || '',
          nombreLocal: loc.nombre_local || '',
          fechaEntrega: loc.fecha_entrega || '',
          horaEntrega: loc.hora_entrega || '',
        })));
      } else {
        setLocales([{ id: 1, codigoLocal: '', nombreLocal: '', fechaEntrega: '', horaEntrega: '' }]);
      }
    }
  }, [isOpen, transporte, localesAsignados]);

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
      if (field === 'codigoLocal' && value.trim()) {
        const loc = localesData.find((x: any) => x.codigo_local?.toUpperCase() === value.toUpperCase());
        if (loc) updated.nombreLocal = loc.nombre_local;
        else updated.nombreLocal = '';
      }
      return updated;
    }));
  };

  // Autocomplete helpers
  const filterStartsWith = (list: any[], field: string, search: string) => {
    if (!search) return [];
    return list.filter((item: any) => String(item[field] || '').toLowerCase().startsWith(search.toLowerCase()));
  };

  const handleConductorChange = (v: string) => {
    setConductor(v);
    const f = filterStartsWith(conductores, 'nombre_completo', v);
    setConductorSuggestions(f);
    setShowConductorSuggestions(f.length > 0);
    setConductorHighlight(-1);
  };

  const handleConductorKeyDown = (e: React.KeyboardEvent) => {
    if (!showConductorSuggestions || conductorSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setConductorHighlight(p => p < conductorSuggestions.length - 1 ? p + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setConductorHighlight(p => p > 0 ? p - 1 : conductorSuggestions.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const i = conductorHighlight >= 0 ? conductorHighlight : 0;
      if (conductorSuggestions[i]) selectConductor(conductorSuggestions[i]);
    } else if (e.key === 'Escape') {
      setShowConductorSuggestions(false);
      setConductorHighlight(-1);
    }
  };

  const selectConductor = (c: any) => {
    setConductor(c.nombre_completo || '');
    setShowConductorSuggestions(false);
    setConductorHighlight(-1);
    setTimeout(() => patentePRef.current?.focus(), 100);
  };

  // Similar para patentes...
  const handlePatentePChange = (v: string) => {
    setPatentePrincipal(v);
    const f = filterStartsWith(patentes, 'numero_patente', v);
    setPatentePSuggestions(f);
    setShowPatentePSuggestions(f.length > 0);
    setPatentePHighlight(-1);
  };

  const handlePatentePKeyDown = (e: React.KeyboardEvent) => {
    if (!showPatentePSuggestions || patentePSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPatentePHighlight(p => p < patentePSuggestions.length - 1 ? p + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPatentePHighlight(p => p > 0 ? p - 1 : patentePSuggestions.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const i = patentePHighlight >= 0 ? patentePHighlight : 0;
      if (patentePSuggestions[i]) selectPatenteP(patentePSuggestions[i]);
    } else if (e.key === 'Escape') {
      setShowPatentePSuggestions(false);
      setPatentePHighlight(-1);
    }
  };

  const selectPatenteP = (p: any) => {
    setPatentePrincipal(p.numero_patente || '');
    setShowPatentePSuggestions(false);
    setPatentePHighlight(-1);
    setTimeout(() => patenteARef.current?.focus(), 100);
  };

  const handlePatenteAChange = (v: string) => {
    setPatenteAdicional(v);
    const f = filterStartsWith(patentes, 'numero_patente', v);
    setPatenteASuggestions(f);
    setShowPatenteASuggestions(f.length > 0);
    setPatenteAHighlight(-1);
  };

  const handlePatenteAKeyDown = (e: React.KeyboardEvent) => {
    if (!showPatenteASuggestions || patenteASuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPatenteAHighlight(p => p < patenteASuggestions.length - 1 ? p + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPatenteAHighlight(p => p > 0 ? p - 1 : patenteASuggestions.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const i = patenteAHighlight >= 0 ? patenteAHighlight : 0;
      if (patenteASuggestions[i]) selectPatenteA(patenteASuggestions[i]);
    } else if (e.key === 'Escape') {
      setShowPatenteASuggestions(false);
      setPatenteAHighlight(-1);
    }
  };

  const selectPatenteA = (p: any) => {
    setPatenteAdicional(p.numero_patente || '');
    setShowPatenteASuggestions(false);
    setPatenteAHighlight(-1);
  };

  const handleSubmit = async () => {
    if (!fechaProgramacion) {
      setMensaje('Selecciona fecha de programación');
      setTipoMensaje('error');
      return;
    }
    if (!conductor) {
      setMensaje('Selecciona un conductor');
      setTipoMensaje('error');
      return;
    }
    if (!patentePrincipal) {
      setMensaje('Selecciona patente principal');
      setTipoMensaje('error');
      return;
    }
    const localesValidos = locales.filter(l => l.codigoLocal.trim());
    if (localesValidos.length === 0) {
      setMensaje('Agrega al menos un local');
      setTipoMensaje('error');
      return;
    }

    setGuardando(true);
    try {
      const conductorData = conductores.find((c: any) => c.nombre_completo === conductor);
      const patentePData = patentes.find((p: any) => p.numero_patente === patentePrincipal);
      const patenteAData = patentes.find((p: any) => p.numero_patente === patenteAdicional);

      const data = {
        id_documento: transporte.id_documento,
        fecha_programacion: fechaProgramacion,
        conductor_id: conductorData?.id || null,
        patente_principal_id: patentePData?.id || null,
        patente_adicional_id: patenteAData?.id || null,
        observaciones: observaciones,
        locales: localesValidos,
      };

      onGuardar(data);
    } catch (error: any) {
      setMensaje('Error: ' + error.message);
      setTipoMensaje('error');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ed01-modal-overlay" onClick={() => !guardando && onClose()}>
      <div className="ed01-modal" style={{ maxWidth: '800px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="ed01-modal-header">
          <h2>✏️ Editar Transporte - {transporte?.id_documento}</h2>
          <button className="ed01-modal-close" onClick={() => !guardando && onClose()}>×</button>
        </div>

        <div className="ed01-modal-body">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Fecha Programación *
            </label>
            <input
              type="date"
              value={fechaProgramacion}
              onChange={e => setFechaProgramacion(e.target.value)}
              style={{ width: '200px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Conductor */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Conductor *
              </label>
              <input
                ref={conductorRef}
                type="text"
                value={conductor}
                onChange={e => handleConductorChange(e.target.value)}
                onFocus={() => { if (conductor) handleConductorChange(conductor); }}
                onKeyDown={handleConductorKeyDown}
                placeholder="Buscar..."
                autoComplete="off"
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
              {showConductorSuggestions && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {conductorSuggestions.map((c: any, i: number) => (
                    <div
                      key={c.id}
                      onClick={() => selectConductor(c)}
                      style={{
                        padding: '10px 14px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        background: i === conductorHighlight ? '#1d4ed8' : 'white',
                        color: i === conductorHighlight ? 'white' : '#1e293b',
                        fontWeight: i === conductorHighlight ? 600 : 400,
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      {c.nombre_completo}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Patente Principal */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Patente Principal *
              </label>
              <input
                ref={patentePRef}
                type="text"
                value={patentePrincipal}
                onChange={e => handlePatentePChange(e.target.value)}
                onFocus={() => { if (patentePrincipal) handlePatentePChange(patentePrincipal); }}
                onKeyDown={handlePatentePKeyDown}
                placeholder="Buscar..."
                autoComplete="off"
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
              {showPatentePSuggestions && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {patentePSuggestions.map((p: any, i: number) => (
                    <div
                      key={p.id}
                      onClick={() => selectPatenteP(p)}
                      style={{
                        padding: '10px 14px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        background: i === patentePHighlight ? '#1d4ed8' : 'white',
                        color: i === patentePHighlight ? 'white' : '#1e293b',
                        fontWeight: i === patentePHighlight ? 600 : 400,
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      {p.numero_patente}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Patente Adicional */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Patente Adicional
              </label>
              <input
                ref={patenteARef}
                type="text"
                value={patenteAdicional}
                onChange={e => handlePatenteAChange(e.target.value)}
                onFocus={() => { if (patenteAdicional) handlePatenteAChange(patenteAdicional); }}
                onKeyDown={handlePatenteAKeyDown}
                placeholder="Buscar..."
                autoComplete="off"
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
              {showPatenteASuggestions && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {patenteASuggestions.map((p: any, i: number) => (
                    <div
                      key={p.id}
                      onClick={() => selectPatenteA(p)}
                      style={{
                        padding: '10px 14px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        background: i === patenteAHighlight ? '#1d4ed8' : 'white',
                        color: i === patenteAHighlight ? 'white' : '#1e293b',
                        fontWeight: i === patenteAHighlight ? 600 : 400,
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
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
              <button onClick={addLocal} style={{ padding: '6px 14px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                + Agregar
              </button>
            </div>
            <div style={{ border: '1px solid #eef0f5', borderRadius: '8px', overflow: 'auto', maxHeight: '200px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#fafcff' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Código</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Nombre</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Fecha Entrega</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #eef0f5' }}>Hora</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {locales.map((loc) => (
                    <tr key={loc.id}>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          value={loc.codigoLocal}
                          onChange={e => updateLocal(loc.id, 'codigoLocal', e.target.value.toUpperCase())}
                          placeholder="T001"
                          maxLength={4}
                          style={{ width: '80px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          value={loc.nombreLocal}
                          readOnly
                          placeholder="Auto"
                          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', background: '#f8fafd', color: '#64748b' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="date"
                          value={loc.fechaEntrega}
                          onChange={e => updateLocal(loc.id, 'fechaEntrega', e.target.value)}
                          style={{ width: '130px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <select
                          value={loc.horaEntrega}
                          onChange={e => updateLocal(loc.id, 'horaEntrega', e.target.value)}
                          style={{ width: '100px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }}
                        >
                          <option value="">--</option>
                          {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {locales.length > 1 && (
                          <button
                            onClick={() => removeLocal(loc.id)}
                            style={{ width: '24px', height: '24px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Observaciones..."
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          {mensaje && (
            <div style={{
              marginBottom: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              background: tipoMensaje === 'success' ? '#dcfce7' : '#fef2f2',
              color: tipoMensaje === 'success' ? '#15803d' : '#dc2626'
            }}>
              {mensaje}
            </div>
          )}
        </div>

        <div className="ed01-modal-footer">
          <button className="ed01-btn-cancel" onClick={() => !guardando && onClose()} disabled={guardando}>
            Cancelar
          </button>
          <button className="ed01-btn-save" onClick={handleSubmit} disabled={guardando}>
            {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SD01EditarModal;
