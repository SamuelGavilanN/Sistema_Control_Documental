import React, { useState } from 'react';
import logoPath from '../../assets/fashions-park-logo2.png';
import docxentraLogo from '../../assets/Carrusel/docxentra-logo.png';

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  label: string;
  type: 'item' | 'subitem';
}

const menuSections: MenuSection[] = [
  {
    id: 'ed',
    title: 'ED · Empaque Directos',
    items: [
      { id: 'ed', label: 'ED01 Registro Empaque', type: 'item' },
      { id: 'ed-history', label: 'ED02 Dashboard Produccion', type: 'subitem' },
      { id: 'ed-tickets', label: 'ED03 BT Portico', type: 'subitem' }
    ]
  },
  {
    id: 'ad',
    title: 'AD · Auditoría',
    items: [
      { id: 'ad', label: 'AD01 Gestión Auditoría', type: 'item' },
      { id: 'ad-captura', label: 'AD02 Captura Física', type: 'subitem' },
      { id: 'ad-dashboard', label: 'AD03 Dashboard', type: 'subitem' }
    ]
  },
  {
    id: 'tk',
    title: 'TK · Mesa de Ayuda',
    items: [
      { id: 'tk', label: 'TK01 Crear Ticket', type: 'item' },
      { id: 'tk-dashboard', label: 'TK02 Dashboard Tickets', type: 'subitem' }
    ]
  },
  {
    id: 'bd',
    title: 'BD · Administración',
    items: [
      { id: 'bd-usuarios', label: 'BD01 Usuarios', type: 'item' }
      { id: 'bd-locales', label: 'BD02 Locales', type: 'subitem' }
    ]
  }
];

interface SidebarProps {
  activeTab: string;
  onModuleClick: (moduleId: string) => void;
  rol?: string;
  permisos?: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onModuleClick, rol, permisos }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['ed']);

  const toggleSection = (sectionId: string) => {
    if (expandedSections.includes(sectionId)) setExpandedSections(expandedSections.filter(id => id !== sectionId));
    else setExpandedSections([...expandedSections, sectionId]);
  };

  const filterMenuSections = () => {
    if (!searchTerm.trim()) return menuSections;
    const term = searchTerm.toLowerCase();
    return menuSections.map(section => {
      const filteredItems = section.items.filter(item =>
        item.label.toLowerCase().includes(term) || section.title.toLowerCase().includes(term) || item.id.toLowerCase().includes(term)
      );
      return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);
  };

  const filteredSections = filterMenuSections();

  React.useEffect(() => {
    if (searchTerm.trim()) setExpandedSections(filteredSections.map(s => s.id));
  }, [searchTerm]);

  // Verificar si un item está permitido
  const itemPermitido = (itemId: string): boolean => {
    // Si no hay permisos configurados, usar lógica por rol
    if (!permisos || permisos.length === 0) {
      if (itemId === 'ed-history' && rol === 'Portico') return false;
      if ((itemId === 'tk' || itemId === 'tk-dashboard') && rol === 'Portico') return false;
      if ((itemId === 'ad' || itemId === 'ad-captura' || itemId === 'ad-dashboard') && rol === 'Portico') return false;
      if (itemId === 'bd-usuarios' && rol !== 'Owner' && rol !== 'Admin') return false;
      return true;
    }
    // Si hay permisos, usarlos
    return permisos.includes(itemId);
  };

  return (
    <div className="sidebar">
      <div className="logo-area"><div className="logo"><img src={logoPath} alt="FASHIONSPARK Logo" className="logo-image" /></div></div>
      <div className="search-container">
        <div className="search-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 14L11.1 11.1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input type="text" className="search-input" placeholder="Buscar transaccion..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && <button className="search-clear" onClick={() => setSearchTerm('')}>×</button>}
        </div>
      </div>
      <div className="nav-menu">
        {filteredSections.length === 0 ? <div className="search-no-results">No se encontraron resultados</div> :
          filteredSections.map(section => {
            const isExpanded = expandedSections.includes(section.id);
            // Verificar si la sección tiene al menos un item permitido
            const itemsVisibles = section.items.filter(item => itemPermitido(item.id));
            if (itemsVisibles.length === 0) return null;
            return (
              <div key={section.id} className="nav-section">
                <div className="nav-section-header" onClick={() => toggleSection(section.id)}>
                  <span className="nav-section-title">{section.title}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`section-arrow ${isExpanded ? 'expanded' : ''}`}><path d="M3 4.5L6 7.5L9 4.5" stroke="#8a93a5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                {isExpanded && (
                  <div className="nav-section-content">
                    {section.items.map(item => {
                      if (!itemPermitido(item.id)) return null;
                      return item.type === 'item' ? (
                        <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => onModuleClick(item.id)}><span className="nav-indicator"></span>{item.label}</div>
                      ) : (
                        <div key={item.id} className={`nav-subitem ${activeTab === item.id ? 'active-sub' : ''}`} onClick={() => onModuleClick(item.id)}>{item.label}</div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
      <div className="sidebar-footer">
        <div className="logo"><img src={docxentraLogo} alt="Docxentra" className="logo-image-docxentra" /></div>
        <p className="sidebar-footer-text">Control Documental Inteligente</p>
      </div>
    </div>
  );
};

export default Sidebar;
