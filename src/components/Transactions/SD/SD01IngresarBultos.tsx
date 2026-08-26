// src/components/Transactions/SD/SD01IngresarBultos.tsx

import React, { useState, useEffect } from 'react';
import './SD01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface SD01IngresarBultosProps {
  local: any;
  documentoId: string;
  onClose: () => void;
  onGuardado: () => void;
  usuario: any;
}

const SD01IngresarBultos: React.FC<SD01IngresarBultosProps> = ({ local, documentoId, onClose, onGuardado, usuario }) => {
  const [bultos, setBultos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [origen, setOrigen] = useState('');
  const [cantidad, setCantidad] = useState('');

  useEffect(() => {
    cargarBultos();
  }, []);

  const cargarBultos = async () => {
    try {
      const resp = await fetch(
        API_URL + '/sd01_bultos?select=*&local_id=eq.' + local.id + '&order=creado_en.asc',
        { headers: HEADERS }
      );
      const data = await resp.json();
      if (data) setBultos(data);
    } catch (e) {
      console.error('Error cargando bultos:', e);
    }
    setCargando(false);
  };

  const agregarBulto = async () => {
    if (!origen.trim()) {
      alert('Debe ingresar un origen');
      return;
    }
    const cant = parseInt(cantidad);
    if (isNaN(cant) || cant <= 0) {
      alert('La cantidad debe ser un número mayor a 0');
      return;
    }

    setGuardando(true);
    try {
      const nuevoBulto = {
        local_id: local.id,
        documento_id: documentoId,
        origen: origen.trim(),
        cantidad: cant,
        creado_por: usuario?.id,
        creado_en: new Date().toISOString()
      };
      const resp = await fetch(API_URL + '/sd01_bultos', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(nuevoBulto)
      });
      if (resp.ok) {
        const data = await resp.json();
        setBultos([...bultos, data[0]]);
        setOrigen('');
        setCantidad('');
        // Actualizar contador en el local (opcional, pero lo haremos en el padre)
        onGuardado();
      } else {
        alert('Error al guardar el bulto');
      }
    } catch (e) {
      console.error('Error:', e);
      alert('Error al guardar el bulto');
    }
    setGuardando(false);
  };

  const eliminarBulto = async (id: string) => {
    if (!window.confirm('¿Eliminar este bulto?')) return;
    try {
      await fetch(API_URL + '/sd01_bultos?id=eq.' + id, { method: 'DELETE', headers: HEADERS });
      setBultos(bultos.filter(b => b.id !== id));
      onGuardado();
    } catch (e) {
      console.error('Error eliminando bulto:', e);
      alert('Error al eliminar');
    }
  };

  if (cargando) {
    return (
      <div className="sd01-modal-overlay" onClick={onClose}>
        <div className="sd01-modal" style={{ maxWidth: '500px' }} onClick={(e: any) => e.stopPropagation()}>
          <div className="sd01-modal-header">
            <h2>Ingresar Bultos</h2>
            <button className="sd01-modal-close" onClick={onClose}>×</button>
          </div>
          <div className="sd01-modal-body" style={{ textAlign: 'center', padding: '40px' }}>
            Cargando...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sd01-modal-overlay" onClick={onClose}>
      <div className="sd01-modal" style={{ maxWidth: '550px' }} onClick={(e: any) => e.stopPropagation()}>
        <div className="sd01-modal-header">
          <h2>Bultos - Local {local.codigo_local}</h2>
          <button className="sd01-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="sd01-modal-body">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'end', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label className="sd01-form-label" style={{ fontSize: '12px' }}>Origen</label>
              <input
                type="text"
                className="sd01-form-input"
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
                placeholder="Ej: Bodega 1"
              />
            </div>
            <div style={{ width: '100px' }}>
              <label className="sd01-form-label" style={{ fontSize: '12px' }}>Cantidad</label>
              <input
                type="number"
                className="sd01-form-input"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0"
                min="1"
              />
            </div>
            <button
              className="sd01-btn sd01-btn-primary"
              onClick={agregarBulto}
              disabled={guardando}
              style={{ whiteSpace: 'nowrap' }}
            >
              {guardando ? 'Agregando...' : 'Agregar'}
            </button>
          </div>

          {bultos.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-placeholder)', padding: '20px' }}>
              No hay bultos registrados
            </div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="sd01-table" style={{ minWidth: 'auto' }}>
                <thead>
                  <tr>
                    <th>Origen</th>
                    <th style={{ textAlign: 'center' }}>Cantidad</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {bultos.map((b) => (
                    <tr key={b.id}>
                      <td>{b.origen}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{b.cantidad}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => eliminarBulto(b.id)}
                          style={{
                            background: 'var(--error-bg)',
                            color: 'var(--error-text)',
                            border: '1px solid var(--error-border)',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="sd01-modal-footer">
          <div></div>
          <button className="sd01-btn-cancel" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default SD01IngresarBultos;
