// src/components/Layout/Sidebar.tsx

import React, { useState, useEffect } from 'react';
import logoPath from '../../assets/fashions-park-logo2.png';
import docxentraLogo from '../../assets/Carrusel/docxentra-logo.png';
import { auth } from '../../lib/auth';

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
    id: 'ad',
    title: 'AD · Auditoría',
    items: [
      { id: 'ad', label: 'AD01 Gestión Auditoría', type: 'item' },
      { id: 'ad-captura', label: 'AD02 Captura Física', type: 'subitem' },
      { id: 'ad-dashboard', label: 'AD03 Dashboard', type: 'subitem' }
    ]
  },
  {
    id: 'ai',
    title: 'AI · Auditoría Inventario',
    items: [
      { id: 'ai', label: 'AI01 Gestión Auditoría Inv', type: 'item' },
      { id: 'ai-captura', label: 'AI02 Captura Auditoria Inv', type: 'subitem' },
    ]
  },
  {
    id: 'rp',
    title: 'RP · Revisión Pallet',
    items: [
      { id: 'rp', label: 'RP01 Carga Revisión', type: 'item' },
      { id: 'rp-revision', label: 'RP02 Revisar Pallet', type: 'subitem' },
    ]
  },
  {
    id: 'rd',
    title: 'RD · Recepción Devolución',
    items: [
      { id: 'rd', label: 'RD01 Ingreso Devolución', type: 'item' },
      { id: 'rd-salida', label: 'RD02 Salida Devolución', type: 'subitem' },
      { id: 'rd-informe', label: 'RD03 Informe', type: 'subitem' },
      { id: 'rd-dashboard', label: 'RD04 Dashboard', type: 'subitem' }
    ]
  },
  {
    id: 'sd',
    title: 'SD · Salida Despacho',
    items: [
      { id: 'sd', label: 'SD01 Salida Despacho', type: 'item' },
      { id: 'sd-asignador', label: 'SD02 Asignador Móvil', type: 'subitem' },
    ]
  },
  {
    id: 'lp',
    title: 'LP · Lectura Pedidos',
    items: [
      { id: 'lp', label: 'LP01 Crear Pedido', type: 'item' },
      { id: 'lp-captura', label: 'LP02 Capturar LPN', type: 'subitem' },
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
      { id: 'bd-usuarios', label: 'BD01 Usuarios', type: 'item' },
      { id: 'bd-locales', label: 'BD02 Locales', type: 'subitem' }
    ]
  },
  {
    id: 'ut',
    title: 'UT · Utilidades',
    items: [
      { id: 'ut', label: 'UT01 Correlativo QR', type: 'item' },
    ]
  }
];

interface SidebarProps {
  activeTab: string;
  onModuleClick: (moduleId: string) => void;
  rol?: string;
  permisos?: string[];
}

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onModuleClick, rol, permisos }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['ed']);
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
        const respPermisos = await fetch(
          API_URL + '/usuario_permisos?select=transaccion_id&usuario_id=eq.' + usuario.id + '&activo=eq.true',
          { headers: HEADERS }
        );
        const dataPermisos = await respPermisos.json();
        if (dataPermisos && dataPermisos.length > 0) {
          setPermisosActuales(dataPermisos.map((p: any) => p.transaccion_id));
        } else {
          setPermisosActuales([]);
        }

        const respFavoritos = await fetch(
          API_URL + '/usuario_favoritos?select=transaccion_id&usuario_id=eq.' + usuario.id,
          { headers: HEADERS }
        );
        const dataFavoritos = await respFavoritos.json();
        if (dataFavoritos) {
          setFavoritos(dataFavoritos.map((f: any) => f.transaccion_id));
        }
      } catch (e) {}
    };

    cargarDatos();
    const intervalo = setInterval(cargarDatos, 5000);
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
          API_URL + '/usuario_favoritos?usuario_id=eq.' + usuario.id + '&transaccion_id=eq.' + transaccionId,
          { method: 'DELETE', headers: HEADERS }
        );
        setFavoritos(favoritos.filter(f => f !== transaccionId));
      } else {
        await fetch(
          API_URL + '/usuario_favoritos',
          {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
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
        item.label.toLowerCase().includes(term) ||
        section.title.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term)
      );
      return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);
  };

  const filteredSections = filterMenuSections();

  useEffect(() => {
    if (searchTerm.trim()) {
      setExpandedSections(filteredSections.map(s => s.id));
    }
  }, [searchTerm]);

  const itemPermitido = (itemId: string): boolean => {
    if (!permisosActuales || permisosActuales.length === 0) {
      if (itemId === 'ed-history' && rol === 'Portico') return false;
      if ((itemId === 'tk' || itemId === 'tk-dashboard') && rol === 'Portico') return false;
      if ((itemId === 'ad' || itemId === 'ad-captura' || itemId === 'ad-dashboard') && rol === 'Portico') return false;
      if ((itemId === 'bd-usuarios' || itemId === 'bd-locales') && rol !== 'Owner' && rol !== 'Admin') return false;
      if ((itemId === 'rd-salida' || itemId === 'rd-informe' || itemId === 'rd-dashboard') && rol !== 'Admin' && rol !== 'Owner') return false;
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
            placeholder="Buscar transaccion..."
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
                <div
                  className="nav-section-header"
                  onClick={() => toggleSection(section.id)}
                >
                  <span className="nav-section-title">{section.title}</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className={`section-arrow ${isExpanded ? 'expanded' : ''}`}
                  >
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
