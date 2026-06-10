// src/components/Transactions/SD/SD01Table.tsx

import React, { useState, useRef } from 'react';
import { locales } from '../../../data/locales';
import DCModal from './SD01Modales/DCModal';

interface SD01Row {
  id: number;
  codigoLocal: string;
  nombreLocal: string;
  fechaEntrega: string;
  horaEntrega: string;
  selloTrasero: string;
  cantidadPallet: number;
  totalCarga: number;
  carga?: Array<{ id: number; origenCarga: string; tipoDocumento: string; numeroDocumento: string; cantidadBultos: number; observacion: string }>;
}

interface SD01TableProps {
  rows: SD01Row[];
  setRows: (rows: SD01Row[]) => void;
  cantidadFilasAgregar: number;
  setCantidadFilasAgregar: (value: number) => void;
  selectedRows: number[];
  setSelectedRows: (ids: number[]) => void;
}

const generateTimeOptions = () => {
  const options = [];
  for (let h = 6; h < 24; h++) { options.push(`${h.toString().padStart(2, "0")}:00`); options.push(`${h.toString().padStart(2, "0")}:30`); }
  for (let h = 0; h < 6; h++) { options.push(`${h.toString().padStart(2, "0")}:00`); options.push(`${h.toString().padStart(2, "0")}:30`); }
  return options;
};
const timeOptions = generateTimeOptions();

const SD01Table: React.FC<SD01TableProps> = ({ rows, setRows, cantidadFilasAgregar, setCantidadFilasAgregar, selectedRows, setSelectedRows }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<SD01Row | null>(null);
  const codigoLocalRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const fechaRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const horaRefs = useRef<Map<number, HTMLSelectElement>>(new Map());
  const selloRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const palletRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const cargaInicialMap: Record<string, any[]> = {};
  rows.forEach(row => { if (row.codigoLocal && row.carga) cargaInicialMap[row.codigoLocal] = row.carga; });

  const addSingleRow = () => {
    const newRow: SD01Row = {
      id: rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1,
      codigoLocal: "", nombreLocal: "", fechaEntrega: "", horaEntrega: "",
      selloTrasero: "", cantidadPallet: 0, totalCarga: 0,
    };
    setRows([...rows, newRow]);
    setCantidadFilasAgregar(rows.length + 1);
  };

  const addMultipleRows = () => {
    const currentCount = rows.length;
    const targetCount = cantidadFilasAgregar;
    if (targetCount <= currentCount) { setRows(rows.slice(0, targetCount)); return; }
    const newRows: SD01Row[] = [...rows];
    const startId = Math.max(...rows.map(r => r.id)) + 1;
    for (let i = 0; i < targetCount - currentCount; i++) {
      newRows.push({ id: startId + i, codigoLocal: "", nombreLocal: "", fechaEntrega: "", horaEntrega: "", selloTrasero: "", cantidadPallet: 0, totalCarga: 0 });
    }
    setRows(newRows);
  };

  const removeRow = (id: number) => {
    if (rows.length > 1) {
      const newRows = rows.filter(row => row.id !== id);
      setRows(newRows);
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
      setCantidadFilasAgregar(newRows.length);
    }
  };

  const updateRow = (id: number, field: keyof SD01Row, value: any) => {
    const updatedRows = rows.map(row => row.id === id ? { ...row, [field]: value } : row);
    if (field === "codigoLocal") {
      const local = locales.find(l => l.codigo_local.toUpperCase() === value.toUpperCase());
      if (local) {
        setRows(updatedRows.map(row => row.id === id ? { ...row, nombreLocal: local.nombre_local } : row));
        return;
      }
    }
    setRows(updatedRows);
  };

  const fillDown = (field: keyof SD01Row) => {
    if (rows.length <= 1) return;
    const firstRowValue = rows[0][field];
    setRows(rows.map((row, index) => index === 0 ? row : { ...row, [field]: firstRowValue }));
  };

  const toggleRowSelection = (id: number) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedRows(prev => prev.length === rows.length ? [] : rows.map(row => row.id));
  };

  const handleDCClick = (row: SD01Row) => { setCurrentRow(row); setModalOpen(true); };

  const handleDCSave = (documentos: any[], localCodigo: string) => {
    const totalCarga = documentos.reduce((sum, doc) => sum + (doc.cantidadBultos || 0), 0);
    setRows(prevRows => prevRows.map(row =>
      row.codigoLocal === localCodigo ? { ...row, totalCarga, carga: documentos } : row
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: number, field: string, rowIndex: number) => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const nextRowIndex = rowIndex + 1;
      if (nextRowIndex < rows.length) {
        const nextRow = rows[nextRowIndex];
        setTimeout(() => {
          switch (field) {
            case "codigoLocal": codigoLocalRefs.current.get(nextRow.id)?.focus(); break;
            case "fecha": fechaRefs.current.get(nextRow.id)?.focus(); break;
            case "hora": horaRefs.current.get(nextRow.id)?.focus(); break;
            case "sello": selloRefs.current.get(nextRow.id)?.focus(); break;
            case "pallet": palletRefs.current.get(nextRow.id)?.focus(); break;
          }
        }, 10);
      }
    } else if (e.key === "Enter" && field === "codigoLocal") {
      e.preventDefault();
      fechaRefs.current.get(rowId)?.focus();
    }
  };

  const localesRegistrados = rows.filter(row => row.codigoLocal).map(row => ({
    codigo: row.codigoLocal, nombre: row.nombreLocal,
  }));

  return (
    <>
      <div className="sd01-table-container">
        <div className="table-header-actions">
          <div className="add-row-controls">
            <button className="add-row-btn" onClick={addSingleRow}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Agregar Local
            </button>
            <div className="row-quantity-control">
              <label>Cantidad Locales:</label>
              <input type="number" min="1" value={cantidadFilasAgregar} onChange={e => setCantidadFilasAgregar(parseInt(e.target.value) || 1)} onBlur={addMultipleRows} onKeyPress={e => { if (e.key === "Enter") addMultipleRows(); }} />
              <button className="apply-quantity-btn" onClick={addMultipleRows}>Aplicar</button>
            </div>
          </div>
        </div>
        <div className="sd01-table-wrapper">
          <table className="sd01-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}><input type="checkbox" checked={selectedRows.length === rows.length && rows.length > 0} onChange={toggleSelectAll} /></th>
                <th style={{ width: "120px" }}># Código Local</th>
                <th style={{ width: "180px" }}>Nombre Local</th>
                <th style={{ width: "130px" }}><div className="th-with-btn"><span>Fecha Entrega</span><button className="fill-down-btn" onClick={() => fillDown("fechaEntrega")} title="Copiar primera fila"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button></div></th>
                <th style={{ width: "120px" }}><div className="th-with-btn"><span>Hora Entrega</span><button className="fill-down-btn" onClick={() => fillDown("horaEntrega")} title="Copiar primera fila"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button></div></th>
                <th style={{ width: "130px" }}><div className="th-with-btn"><span>Sello Trasero</span><button className="fill-down-btn" onClick={() => fillDown("selloTrasero")} title="Copiar primera fila"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button></div></th>
                <th style={{ width: "100px" }}>Cant. Pallet</th>
                <th style={{ width: "130px" }}>Total Carga</th>
                <th style={{ width: "50px" }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td><input type="checkbox" checked={selectedRows.includes(row.id)} onChange={() => toggleRowSelection(row.id)} /></td>
                  <td><input ref={el => { if (el) codigoLocalRefs.current.set(row.id, el); else codigoLocalRefs.current.delete(row.id); }} type="text" className="table-input" value={row.codigoLocal} onChange={e => updateRow(row.id, "codigoLocal", e.target.value.toUpperCase())} onKeyDown={e => handleKeyDown(e, row.id, "codigoLocal", index)} placeholder="Ej: D001" maxLength={4} /></td>
                  <td><input type="text" className="table-input" value={row.nombreLocal} readOnly placeholder="Auto-completado" /></td>
                  <td><input ref={el => { if (el) fechaRefs.current.set(row.id, el); else fechaRefs.current.delete(row.id); }} type="date" className="table-input" value={row.fechaEntrega} onChange={e => updateRow(row.id, "fechaEntrega", e.target.value)} onKeyDown={e => handleKeyDown(e, row.id, "fecha", index)} /></td>
                  <td><select ref={el => { if (el) horaRefs.current.set(row.id, el); else horaRefs.current.delete(row.id); }} className="table-select" value={row.horaEntrega} onChange={e => updateRow(row.id, "horaEntrega", e.target.value)} onKeyDown={e => handleKeyDown(e, row.id, "hora", index)}><option value="">Seleccionar</option>{timeOptions.map(time => <option key={time} value={time}>{time}</option>)}</select></td>
                  <td><input ref={el => { if (el) selloRefs.current.set(row.id, el); else selloRefs.current.delete(row.id); }} type="text" className="table-input" value={row.selloTrasero} onChange={e => updateRow(row.id, "selloTrasero", e.target.value)} onKeyDown={e => handleKeyDown(e, row.id, "sello", index)} placeholder="N° Sello" /></td>
                  <td><input ref={el => { if (el) palletRefs.current.set(row.id, el); else palletRefs.current.delete(row.id); }} type="number" className="table-input" value={row.cantidadPallet || ""} onChange={e => updateRow(row.id, "cantidadPallet", parseInt(e.target.value) || 0)} onKeyDown={e => handleKeyDown(e, row.id, "pallet", index)} min="0" /></td>
                  <td><div className="total-carga-cell"><input type="text" className="table-input total-carga-input" value={row.totalCarga || ""} readOnly placeholder="Ver detalle" /><button className="dc-btn" onClick={() => handleDCClick(row)}>DC</button></div></td>
                  <td><button className="remove-row-btn" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {currentRow && (
        <DCModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          localActual={{ codigo: currentRow.codigoLocal || "D001", nombre: currentRow.nombreLocal || "Local" }}
          todosLosLocales={localesRegistrados.length > 0 ? localesRegistrados : [{ codigo: currentRow.codigoLocal || "D001", nombre: currentRow.nombreLocal || "Local" }]}
          onSave={handleDCSave}
          cargaInicial={cargaInicialMap}
        />
      )}
    </>
  );
};

export default SD01Table;