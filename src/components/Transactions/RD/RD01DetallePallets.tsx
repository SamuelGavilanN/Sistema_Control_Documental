// src/components/Transactions/RD/RD01DetallePallets.tsx

import React, { useState, useEffect } from 'react';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface RD01DetallePalletsProps {
  numeroSolicitud: string;
}

const RD01DetallePallets: React.FC<RD01DetallePalletsProps> = ({ numeroSolicitud }) => {
  const [pallets, setPallets] = useState<string[]>([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const resp = await fetch(
          `${API_URL}/rd01_devoluciones?select=id_pallet&numero_solicitud=eq.${numeroSolicitud}&order=id_pallet`,
          { headers: HEADERS }
        );
        const data = await resp.json();
        if (data) setPallets(data.map((r: any) => r.id_pallet));
      } catch (e) {}
    };
    cargar();
  }, [numeroSolicitud]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {pallets.map((p: string, i: number) => (
        <div key={i} className="rd01-pallet-mini">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="#1d4ed8" strokeWidth="1.5"/>
            <path d="M4 5H10M4 8H10M4 11H7" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {p}
        </div>
      ))}
    </div>
  );
};

export default RD01DetallePallets;
