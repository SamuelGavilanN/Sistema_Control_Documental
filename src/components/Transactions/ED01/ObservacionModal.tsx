import React from 'react';

interface ObservacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  observacion: string;
}

const ObservacionModal: React.FC<ObservacionModalProps> = ({ isOpen, onClose, observacion }) => {
  if (!isOpen) return null;

  return (
    <div className="ed01-modal-overlay" onClick={onClose}>
      <div className="ed01-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="ed01-modal-header"><h2>Observacion</h2><button className="ed01-modal-close" onClick={onClose}>×</button></div>
        <div className="ed01-modal-body">
          <div style={{ padding: '16px', background: '#f8fafd', borderRadius: '8px', border: '1px solid #eef0f5', fontSize: '14px', color: '#1e293b', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '80px' }}>
            {observacion || 'Sin observacion'}
          </div>
        </div>
        <div className="ed01-modal-footer"><button className="ed01-btn-save" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  );
};

export default ObservacionModal;