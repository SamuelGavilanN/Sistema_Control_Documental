import React, { useState } from 'react';

interface HeaderProps {
  activeTab: string;
  openTabs: string[];
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  usuario: any;
  onLogout: () => void;
}

const moduleTitles: Record<string, string> = {
  'dashboard': 'Ventana de Trabajo',
  'ed': 'ED01 · Reg Empaque',
  'ed-history': 'ED02 · Dashboard',
};

const Header: React.FC<HeaderProps> = ({ activeTab, openTabs, onTabClick, onTabClose, usuario, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getTabTitle = (tabId: string): string => moduleTitles[tabId] || tabId;

  const iniciales = usuario ? `${usuario.nombre?.charAt(0) || ''}${usuario.apellido?.charAt(0) || ''}`.toUpperCase() : '??';
  const nombreCompleto = usuario ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() : 'Usuario';

  return (
    <div className="top-header">
      <div className="tabs-bar">
        {openTabs.map(tabId => (
          <div key={tabId} className={`tab ${activeTab === tabId ? 'active-tab' : ''}`} onClick={() => onTabClick(tabId)}>
            <span>{getTabTitle(tabId)}</span>
            {tabId !== 'dashboard' && <span className="tab-close" onClick={(e) => { e.stopPropagation(); onTabClose(tabId); }}>×</span>}
          </div>
        ))}
      </div>
      <div className="user-area">
        <div className="user-info" onClick={() => setShowUserMenu(!showUserMenu)}>
          <div className="user-avatar"><span>{iniciales}</span></div>
          <span className="user-name">{nombreCompleto}</span>
          <svg className="user-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {showUserMenu && (
          <div className="user-menu">
            <div className="user-menu-item" onClick={() => { onLogout(); setShowUserMenu(false); }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 13V11H3V3H6V1H2V13H6Z" fill="#64748b"/><path d="M10 4L14 8L10 12V9H6V7H10V4Z" fill="#64748b"/></svg>
              <span>Cerrar Sesion</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
