// src/components/Layout/Sidebar.tsx

import React, { useState, useEffect } from 'react';
import logoPath from '../../assets/fashions-park-logo2.png';
import docxentraLogo from '../../assets/Carrusel/docxentra-logo.png';
import { auth } from '../../lib/auth';
import { getPermisos, getFavoritos } from '../../lib/api';

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
      { id: 'ed-tickets', label: 'ED03 BT Portico', type: 'subitem' },
      { id: 'ed-lotes', label: 'ED04 Almacén Lotes', type: 'subitem' },
    ]
  },
  {
    id: 'sd',
    title: 'SD · Salida Despacho',
    items: [
      { id: 'sd', label: 'SD01 Planificación Transporte', type: 'item' },
      { id: 'sd-informe-bultos', label: 'SD02 Informe Bultos Desp.', type: 'subitem' },
    ]
  },
  {
    id: 'ut',
    title: 'UT · Utilidades',
    items: [
      { id: 'ut', label: 'UT01 Correlativo QR', type: 'item' },
      { id: 'ut-revision', label: 'UT02 Revisión Pallet', type: 'subitem' },
    ]
  },
  {
    id: 'bd',
    title: 'BD · Administración',
    items: [
      { id: 'bd-usuarios', label: 'BD01 Usuarios', type: 'item' },
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
  const [expandedSections, setExpandedSections] = useState<string[]>(['ed', 'sd', 'ut', 'bd']);
  const [permisosActuales, setPermisosActuales] = useState<string[]>(permisos || []);
  const [favoritos, setFavoritos] = useState<string[]>([]);

  useEffect(() => {
    setPermisosActuales(permisos || []);
  }, [permisos]);

  useEffect(() => {
    const usuario = auth.getUsuario();
    if (!usuario?.id) return;

    const cargarDatos = async () => {
      try {
        const [perms, favs] = await Promise.all([
          getPermisos(usuario.id),
          getFavoritos(usuario.id)
        ]);
        if (perms) setPermisosActuales(perms);
        if (favs) setFavoritos(favs);
      } catch (e) {
        console.error('Error cargando datos de sidebar:', e);
      }
    };

    cargarDatos();
    const intervalo = setInterval(cargarDatos, 15000);
    return () => clearInterval(intervalo);
  }, []);

  const toggleFavorito = async (transaccionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const usuario = auth.getUsuario();
    if (!usuario?.id) return;

    const esFavorito = favoritos.includes(transaccionId);

    try {
      if (esFavorito) {
        await fetch(
          `https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1/usuario_favoritos?usuario_id=eq.${usuario.id}&transaccion_id=eq.${transaccionId}`,
          { method: 'DELETE', headers: { 'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G' } }
        );
        setFavoritos(favoritos.filter(f => f !== transaccionId));
      } else {
        await fetch(
          'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1/usuario_favoritos',
          {
            method: 'POST',
            headers: { 'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              usuario_id: usuario.id,
              transaccion_id: transaccionId
            })
          }
        );
        setFavoritos([...favoritos, transaccionId]);
      }
    } catch (e) {
      console.error('Error toggle favorito:', e);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  const filterMenuSections = () => {
    if (!searchTerm.trim()) return menuSections;
    const term = searchTerm.toLowerCase();
    return menuSections
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.label.toLowerCase().includes(term) ||
          section.title.toLowerCase().includes(term) ||
          item.id.toLowerCase().includes(term)
        )
      }))
      .filter(section => section.items.length > 0);
  };

  const filteredSections = filterMenuSections();

  useEffect(() => {
    if (searchTerm.trim()) {
      setExpandedSections(filteredSections.map(s => s.id));
    }
  }, [searchTerm, filteredSections]);

  const itemPermitido = (itemId: string): boolean => {
    if (!permisosActuales || permisosActuales.length === 0) {
      if ((itemId === 'bd-usuarios' || itemId === 'bd-locales') && rol !== 'Owner' && rol !== 'Admin') return false;
      return true;
    }
    return permisosActuales.includes(itemId);
  };

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
          <input
            type="text"
            className="search-input"
            placeholder="Buscar transacción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>
      </div>

      <div className="nav-menu">
        {filteredSections.length === 0 ? (
          <div className="search-no-results">No se encontraron resultados</div>
        ) : (
          filteredSections.map(section => {
            const isExpanded = expandedSections.includes(section.id);
            const itemsVisibles = section.items.filter(item => itemPermitido(item.id));
            if (itemsVisibles.length === 0) return null;

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
                      if (!itemPermitido(item.id)) return null;
                      const esFavorito = favoritos.includes(item.id);
                      return item.type === 'item' ? (
                        <div
                          key={item.id}
                          className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                          onClick={() => onModuleClick(item.id)}
                        >
                          <span className="nav-indicator"></span>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          <span
                            onClick={(e) => toggleFavorito(item.id, e)}
                            style={{
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: esFavorito ? '#f59e0b' : 'var(--text-placeholder)',
                              padding: '2px 4px',
                              transition: 'color 0.15s',
                              flexShrink: 0
                            }}
                            title={esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                          >
                            {esFavorito ? '★' : '☆'}
                          </span>
                        </div>
                      ) : (
                        <div
                          key={item.id}
                          className={`nav-subitem ${activeTab === item.id ? 'active-sub' : ''}`}
                          style={{ display: 'flex', alignItems: 'center' }}
                        >
                          <span style={{ flex: 1 }} onClick={() => onModuleClick(item.id)}>
                            {item.label}
                          </span>
                          <span
                            onClick={(e) => toggleFavorito(item.id, e)}
                            style={{
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: esFavorito ? '#f59e0b' : 'var(--text-placeholder)',
                              padding: '2px 4px',
                              transition: 'color 0.15s',
                              flexShrink: 0,
                              marginRight: '4px'
                            }}
                            title={esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                          >
                            {esFavorito ? '★' : '☆'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="sidebar-footer">
        <div className="logo">
          <img src={docxentraLogo} alt="Docxentra" className="logo-image-docxentra" />
        </div>
        <p className="sidebar-footer-text">Control Documental Inteligente</p>
      </div>
    </div>
  );
};

export default Sidebar;
