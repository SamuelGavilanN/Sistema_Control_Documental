import React, { useState } from 'react';

interface FiltroModalProps {
  isOpen: boolean;
  onClose: () => void;
  filtros: any[];
  onAplicar: (filtros: any[]) => void;
}

const operadores = [
  { value: 'igual', label: 'Igual a' }, { value: 'mayor', label: 'Mayor que' },
  { value: 'menor', label: 'Menor que' }, { value: 'mayor_igual', label: 'Mayor o igual' },
  { value: 'menor_igual', label: 'Menor o igual' }, { value: 'contiene', label: 'Contiene' },
  { value: 'no_contiene', label: 'No contiene' }, { value: 'vacio', label: 'Vacio' },
  { value: 'no_vacio', label: 'No vacio' },
];

const columnasFiltrables = [
  { value: 'estado', label: 'Estado' }, { value: 'numero_tarea', label: 'Numero Tarea' },
  { value: 'numero_empaque', label: 'Numero Empaque' }, { value: 'codigo_local', label: 'Codigo Local' },
  { value: 'nombre_local', label: 'Nombre Local' }, { value: 'cantidad_bultos', label: 'Cantidad Bultos' },
  { value: 'cantidad_pallet', label: 'Cantidad Pallet' }, { value: 'creado_por', label: 'Creado Por' },
  { value: 'modificado_por', label: 'Modificado Por' }, { value: 'observacion', label: 'Observacion' },
];

const FiltroModal: React.FC<FiltroModalProps> = ({ isOpen, onClose, filtros, onAplicar }) => {
  const [filtrosLocales, setFiltrosLocales] = useState<any[]>(filtros.length > 0 ? filtros : []);

  const agregarFiltro = () => setFiltrosLocales([...filtrosLocales, { columna: 'estado', operador: 'igual', valor: '' }]);
  const actualizarFiltro = (index: number, campo: string, valor: string) => {
    const nuevos = [...filtrosLocales]; nuevos[index][campo] = valor; setFiltrosLocales(nuevos);
  };
  const eliminarFiltro = (index: number) => setFiltrosLocales(filtrosLocales.filter((_, i) => i !== index));
  const limpiarFiltros = () => { setFiltrosLocales([]); onAplicar([]); onClose(); };

  if (!isOpen) return null;

  return (
    <div className="ed01-modal-overlay" onClick={onClose}>
      <div className="ed01-modal" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
        <div className="ed01-modal-header"><h2>Filtros</h2><button className="ed01-modal-close" onClick={onClose}>×</button></div>
        <div className="ed01-modal-body">
          <div style={{ marginBottom: '16px' }}>
            <button className="toolbar-btn toolbar-btn-primary" onClick={agregarFiltro} style={{ marginBottom: '16px' }}>+ Agregar Filtro</button>
            {filtrosLocales.length > 0 && <button className="toolbar-btn" onClick={limpiarFiltros} style={{ marginLeft: '8px' }}>Limpiar Filtros</button>}
          </div>
          {filtrosLocales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '14px' }}>No hay filtros aplicados.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtrosLocales.map((filtro, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px', background: '#f8fafd', borderRadius: '8px', border: '1px solid #eef0f5' }}>
                  <select value={filtro.columna} onChange={(e) => actualizarFiltro(index, 'columna', e.target.value)} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', background: 'white', flex: '2' }}>
                    {columnasFiltrables.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <select value={filtro.operador} onChange={(e) => actualizarFiltro(index, 'operador', e.target.value)} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', background: 'white', flex: '2' }}>
                    {operadores.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input value={filtro.valor || ''} onChange={(e) => actualizarFiltro(index, 'valor', e.target.value)} placeholder="Valor" style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', flex: '3' }} disabled={filtro.operador === 'vacio' || filtro.operador === 'no_vacio'} />
                  <button onClick={() => eliminarFiltro(index)} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', fontSize: '16px', flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="ed01-modal-footer">
          <button className="ed01-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="ed01-btn-save" onClick={() => { onAplicar(filtrosLocales); onClose(); }}>Aplicar Filtros</button>
        </div>
      </div>
    </div>
  );
};

export default FiltroModal;