import React, { useState } from 'react';
import './FiltroModal.css';

interface FiltroModalProps {
  isOpen: boolean;
  onClose: () => void;
  filtros: any[];
  onAplicar: (filtros: any[]) => void;
}

const operadores = [
  { value: 'igual', label: 'Igual a' },
  { value: 'mayor', label: 'Mayor que' },
  { value: 'menor', label: 'Menor que' },
  { value: 'mayor_igual', label: 'Mayor o igual' },
  { value: 'menor_igual', label: 'Menor o igual' },
  { value: 'contiene', label: 'Contiene' },
  { value: 'no_contiene', label: 'No contiene' },
  { value: 'vacio', label: 'Vacio' },
  { value: 'no_vacio', label: 'No vacio' },
];

const columnasFiltrables = [
  { value: 'estado', label: 'Estado' },
  { value: 'numero_tarea', label: 'Numero Tarea' },
  { value: 'numero_empaque', label: 'Numero Empaque' },
  { value: 'codigo_local', label: 'Codigo Local' },
  { value: 'nombre_local', label: 'Nombre Local' },
  { value: 'cantidad_bultos', label: 'Cantidad Bultos' },
  { value: 'cantidad_pallet', label: 'Cantidad Pallet' },
  { value: 'creado_por', label: 'Creado Por' },
  { value: 'modificado_por', label: 'Modificado Por' },
  { value: 'observacion', label: 'Observacion' },
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
    <div className="filtro-overlay" onClick={onClose}>
      <div className="filtro-modal" onClick={(e) => e.stopPropagation()}>
        <div className="filtro-header">
          <h2>Filtros</h2>
          <button className="filtro-close" onClick={onClose}>×</button>
        </div>

        <div className="filtro-body">
          <div className="filtro-acciones">
            <button className="filtro-btn-agregar" onClick={agregarFiltro}>+ Agregar Filtro</button>
            {filtrosLocales.length > 0 && (
              <button className="filtro-btn-limpiar" onClick={limpiarFiltros}>Limpiar Filtros</button>
            )}
          </div>

          {filtrosLocales.length === 0 ? (
            <div className="filtro-vacio">No hay filtros aplicados. Agrega uno para comenzar.</div>
          ) : (
            <div className="filtro-lista">
              {filtrosLocales.map((filtro, index) => (
                <div key={index} className="filtro-fila">
                  <select value={filtro.columna} onChange={(e) => actualizarFiltro(index, 'columna', e.target.value)}>
                    {columnasFiltrables.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <select value={filtro.operador} onChange={(e) => actualizarFiltro(index, 'operador', e.target.value)}>
                    {operadores.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input
                    value={filtro.valor || ''}
                    onChange={(e) => actualizarFiltro(index, 'valor', e.target.value)}
                    placeholder="Valor"
                    disabled={filtro.operador === 'vacio' || filtro.operador === 'no_vacio'}
                  />
                  <button className="filtro-eliminar" onClick={() => eliminarFiltro(index)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="filtro-footer">
          <button className="filtro-btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="filtro-btn-aplicar" onClick={() => { onAplicar(filtrosLocales); onClose(); }}>Aplicar Filtros</button>
        </div>
      </div>
    </div>
  );
};

export default FiltroModal;
