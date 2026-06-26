// src/components/Transactions/SD/SD01CancelarModal.tsx

import React, { useState } from 'react';

interface SD01CancelarModalProps {
  isOpen: boolean;
  transporte: any;
  onClose: () => void;
  onConfirmar: (motivo: string) => void;
}

const SD01CancelarModal: React.FC<SD01CancelarModalProps> = ({
  isOpen,
  transporte,
  onClose,
  onConfirmar,
}) => {
  const [motivo, setMotivo] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  if (!isOpen || !transporte) return null;

  const handleConfirmar = () => {
    if (!motivo.trim()) {
      alert('Debes ingresar un motivo de cancelación');
      return;
    }
    setConfirmando(true);
    onConfirmar(motivo);
  };

  return (
    <div className="ed01-modal-overlay" onClick={() => !confirmando && onClose()}>
      <div className="ed01-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="ed01-modal-header">
          <h2 style={{ color: '#dc2626' }}>✕ Cancelar Transporte</h2>
          <button className="ed01-modal-close" onClick={() => !confirmando && onClose()}>×</button>
        </div>

        <div className="ed01-modal-body">
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#475569' }}>
              ¿Estás seguro de cancelar el transporte <strong>{transporte.id_documento}</strong>?
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Conductor: {transporte.nombre_conductor || '-'} · Patente: {transporte.numero_patente || '-'}
            </p>
          </div>

          <div className="ed01-field">
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
              Motivo de Cancelación *
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              placeholder="Describe el motivo de la cancelación..."
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
              autoFocus
            />
          </div>
        </div>

        <div className="ed01-modal-footer">
          <button className="ed01-btn-cancel" onClick={() => !confirmando && onClose()} disabled={confirmando}>
            Volver
          </button>
          <button
            onClick={handleConfirmar}
            disabled={confirmando || !motivo.trim()}
            style={{
              padding: '10px 20px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              opacity: confirmando || !motivo.trim() ? 0.5 : 1,
            }}
          >
            {confirmando ? 'Cancelando...' : '✕ Confirmar Cancelación'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SD01CancelarModal;
