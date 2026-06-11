import React, { useState, useEffect } from 'react';
import { auth } from '../../../lib/auth';
import * as XLSX from 'xlsx';
import './PK01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';

const PK01View: React.FC = () => {
  const [pedidos, setPedidos]: any = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {}, []);

  return (
    <div className="pk01-view">
      <div className="pk01-header">
        <h2>Picking LPN - Pedidos</h2>
        <button className="pk01-btn-nueva" onClick={() => setShowCrearModal(true)}>Nuevo Pedido</button>
      </div>
      <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
        {cargando ? 'Cargando...' : pedidos.length === 0 ? 'Sin pedidos' : pedidos.length + ' pedido(s)'}
      </p>
      {mensaje && <div style={{ padding: '10px', background: '#dcfce7', color: '#15803d', borderRadius: '8px' }}>{mensaje}</div>}
    </div>
  );
};

export default PK01View;
