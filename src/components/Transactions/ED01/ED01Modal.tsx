import React, { useState, useEffect } from 'react';
import { locales } from '../../../data/locales';

interface ED01ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (datos: any) => void;
  modo: 'nuevo' | 'editar' | 'cancelar' | 'ver';
  registro: any;
}

const ED01Modal: React.FC<ED01ModalProps> = ({ isOpen, onClose, onGuardar, modo, registro }) => {
  const [numeroTarea, setNumeroTarea] = useState('');
  const [codigoLocal, setCodigoLocal] = useState('');
  const [nombreLocal, setNombreLocal] = useState('');
  const [cantidadBultos, setCantidadBultos] = useState(0);
  const [cantidadPallet, setCantidadPallet] = useState(0);
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (registro) {
        setNumeroTarea(registro.numero_tarea || '');
        setCodigoLocal(registro.codigo_local || '');
        setNombreLocal(registro.nombre_local || '');
        setCantidadBultos(registro.cantidad_bultos || 0);
        setCantidadPallet(registro.cantidad_pallet || 0);
        // Limpiar observación para editar/cancelar (forzar nueva)
        setObservacion(modo === 'editar' || modo === 'cancelar' ? '' : (registro.observacion || ''));
      } else {
        setNumeroTarea(''); setCodigoLocal(''); setNombreLocal('');
        setCantidadBultos(0); setCantidadPallet(0); setObservacion('');
      }
      setError('');
    }
  }, [isOpen, registro, modo]);

  const handleCodigoLocalChange = (codigo: string) => {
    setCodigoLocal(codigo);
    const local = locales.find(l => l.codigo_local.toUpperCase() === codigo.toUpperCase());
    setNombreLocal(local?.nombre_local || '');
  };

  const soloLectura = modo === 'cancelar';
  const titulo = modo === 'nuevo' ? 'Nuevo Empaque' : modo === 'editar' ? 'Editar Empaque' : 'Cancelar Empaque';
  const requiereObservacion = modo === 'editar' || modo === 'cancelar';

  const handleGuardar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    if (!numeroTarea) { setError('Numero de Tarea es requerido'); return; }
    if (!numeroTarea.match(/^TSKORDPI\d{15}$/)) { setError('Formato invalido. Debe ser TSKORDPI + 15 digitos'); return; }
    if (!codigoLocal) { setError('Codigo Local es requerido'); return; }
    if (!nombreLocal) { setError('Codigo Local no encontrado'); return; }
    if (cantidadBultos <= 0) { setError('Cantidad Bultos debe ser mayor a 0'); return; }
    if (cantidadPallet <= 0) { setError('Cantidad Pallet debe ser mayor a 0'); return; }
    if (requiereObservacion && !observacion.trim()) { setError('La observacion es obligatoria para esta accion'); return; }

    onGuardar({ numero_tarea: numeroTarea, codigo_local: codigoLocal, nombre_local: nombreLocal, cantidad_bultos: cantidadBultos, cantidad_pallet: cantidadPallet, observacion: observacion || null });
  };

  if (!isOpen) return null;

  return (
    <div className="ed01-modal-overlay" onClick={onClose}>
      <div className="ed01-modal" onClick={e => e.stopPropagation()}>
        <div className="ed01-modal-header"><h2>{titulo}</h2><button className="ed01-modal-close" onClick={onClose}>×</button></div>
        <form onSubmit={handleGuardar}>
          <div className="ed01-modal-body">
            {modo === 'nuevo' && <div className="ed01-field"><label>Numero Empaque</label><input type="text" value="(Se genera automaticamente)" disabled /></div>}
            {modo !== 'nuevo' && registro && <div className="ed01-field"><label>Numero Empaque</label><input type="text" value={registro.numero_empaque || ''} disabled /></div>}
            <div className="ed01-field"><label>Numero Tarea *</label><input type="text" value={numeroTarea} onChange={e => setNumeroTarea(e.target.value.toUpperCase())} placeholder="TSKORDPI125032500000161" disabled={soloLectura} maxLength={23} /><small style={{ color: '#94a3b8', fontSize: '11px' }}>Formato: TSKORDPI + 15 digitos</small></div>
            <div className="ed01-field"><label>Codigo Local *</label><input type="text" value={codigoLocal} onChange={e => handleCodigoLocalChange(e.target.value.toUpperCase())} placeholder="Ej: T001" disabled={soloLectura} maxLength={4} /></div>
            <div className="ed01-field"><label>Nombre Local</label><input type="text" value={nombreLocal} disabled /></div>
            <div className="ed01-row">
              <div className="ed01-field"><label>Cantidad Bultos *</label><input type="number" value={cantidadBultos || ''} onChange={e => setCantidadBultos(parseInt(e.target.value) || 0)} disabled={soloLectura} min="0" /></div>
              <div className="ed01-field"><label>Cantidad Pallet *</label><input type="number" value={cantidadPallet || ''} onChange={e => setCantidadPallet(parseInt(e.target.value) || 0)} disabled={soloLectura} min="0" /></div>
            </div>
            <div className="ed01-field"><label>Observacion {requiereObservacion ? '*' : ''}</label><textarea value={observacion} onChange={e => setObservacion(e.target.value)} placeholder={requiereObservacion ? 'Observacion obligatoria para esta accion...' : 'Observacion opcional'} rows={3} /></div>
            {error && <div className="ed01-error"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.5"/><path d="M8 5V9" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.75" fill="#dc2626"/></svg>{error}</div>}
          </div>
          <div className="ed01-modal-footer">
            <button type="button" className="ed01-btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="ed01-btn-save">{modo === 'nuevo' ? 'Registrar e Imprimir' : modo === 'editar' ? 'Guardar e Imprimir' : 'Confirmar Cancelacion'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ED01Modal;
