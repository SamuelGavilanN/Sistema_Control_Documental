import React, { useState } from 'react';
import logoPath from '../../assets/fashions-park-logo2.png';

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
      { id: 'ed-history', label: 'ED02 Historial de Registro', type: 'subitem' }
    ]
  }
];

interface SidebarProps {
  activeTab: string;
  onModuleClick: (moduleId: string) => void;
  rol?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onModuleClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['ed']);

  const toggleSection = (sectionId: string) => {
    if (expandedSections.includes(sectionId)) {
      setExpandedSections(expandedSections.filter(id => id !== sectionId));
    } else {
      setExpandedSections([...expandedSections, sectionId]);
    }
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
    if (searchTerm.trim()) {
      setExpandedSections(filteredSections.map(s => s.id));
    }
  }, [searchTerm]);

  return (
    <div className="sidebar">
      <div className="logo-area">
        <div className="logo">
          <img src={logoPath} alt="FASHIONSPARK Logo" className="logo-image" />
        </div>
      </div>
      <div className="search-container">
        <div className="search-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 14L11.1 11.1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input type="text" className="search-input" placeholder="Buscar transacción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && <button className="search-clear" onClick={() => setSearchTerm('')}>×</button>}
        </div>
      </div>
      <div className="nav-menu">
        {filteredSections.length === 0 ? (
          <div className="search-no-results">No se encontraron resultados</div>
        ) : (
          filteredSections.map(section => {
            const isExpanded = expandedSections.includes(section.id);
            return (
              <div key={section.id} className="nav-section">
                <div className="nav-section-header" onClick={() => toggleSection(section.id)}>
                  <span className="nav-section-title">{section.title}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`section-arrow ${isExpanded ? 'expanded' : ''}`}>
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="#8a93a5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {isExpanded && (
                  <div className="nav-section-content">
                    {section.items.map(item => {
                      if (item.type === 'item') {
                        return <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => onModuleClick(item.id)}><span className="nav-indicator"></span>{item.label}</div>;
                      } else {
                        return <div key={item.id} className={`nav-subitem ${activeTab === item.id ? 'active-sub' : ''}`} onClick={() => onModuleClick(item.id)}>{item.label}</div>;
                      }
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Sidebar;
