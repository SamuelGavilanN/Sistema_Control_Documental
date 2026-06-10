// src/components/Transactions/SD/SD01Toolbar.tsx

import React, { useState, useRef, useEffect } from 'react';

interface SD01ToolbarProps {
  onGuardarBorrador: () => void;
  onFinalizar: () => void;
  onCancelar: () => void;
  onAbrirDocumentos?: () => void;
  onImprimir?: () => void;
  onImprimirSeleccionados?: () => void;
  onNuevaDocumentacion?: () => void;
  onEditarTransporte?: () => void;
  estado: string;
  guardando: boolean;
  documentoCreado: boolean;
}

const SD01Toolbar: React.FC<SD01ToolbarProps> = ({
  onGuardarBorrador, onFinalizar, onCancelar, onAbrirDocumentos,
  onImprimir, onImprimirSeleccionados, onNuevaDocumentacion,
  onEditarTransporte, estado, guardando, documentoCreado,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleToggle = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="sd01-toolbar" ref={toolbarRef}>
      <div className="toolbar-group">
        {!documentoCreado && (
          <button className="toolbar-btn toolbar-btn-primary" onClick={onNuevaDocumentacion}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Nuevo Transporte
          </button>
        )}
        {documentoCreado && estado !== "finalizado" && (
          <>
            <button className="toolbar-btn" onClick={onEditarTransporte}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M11 2L14 5L5 14H2V11L11 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              Editar Transporte
            </button>
            <button className="toolbar-btn" onClick={onGuardarBorrador} disabled={guardando}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13 2H4C3.44772 2 3 2.44772 3 3V13C3 13.5523 3.44772 14 4 14H13C13.5523 14 14 13.5523 14 13V3C14 2.44772 13.5523 2 13 2Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 2V5H11V2" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              {guardando ? "Guardando..." : "Guardar Borrador"}
            </button>
            <button className="toolbar-btn" onClick={onFinalizar} disabled={guardando}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 8L10 4V7H3V9H10V12L14 8Z" fill="currentColor"/>
                <path d="M2 4H1V12H2V4Z" fill="currentColor"/>
              </svg>
              {guardando ? "Guardando..." : "Finalizar Transporte"}
            </button>
            <button className="toolbar-btn" onClick={onCancelar} disabled={guardando}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10.5 5.5L5.5 10.5M5.5 5.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Cancelar
            </button>
          </>
        )}
        {estado === "finalizado" && (
          <div className="estado-badge-finalizado">✅ Finalizado</div>
        )}

        <div className="dropdown-container">
          <button className={`toolbar-btn ${openMenu === "print" ? "active" : ""}`} onClick={() => handleToggle("print")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 11H3C2.44772 11 2 10.5523 2 10V6C2 5.44772 2.44772 5 3 5H13C13.5523 5 14 5.44772 14 6V10C14 10.5523 13.5523 11 13 11H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4 13V10H12V13H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M5 2H11V5H5V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            Imprimir
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {openMenu === "print" && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={() => { onImprimir?.(); setOpenMenu(null); }}>Imprimir Todos los locales</div>
              <div className="dropdown-item" onClick={() => { onImprimirSeleccionados?.(); setOpenMenu(null); }}>Imprimir Locales Seleccionados</div>
            </div>
          )}
        </div>

        <div className="dropdown-container">
          <button className={`toolbar-btn ${openMenu === "advanced" ? "active" : ""}`} onClick={() => handleToggle("advanced")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
              <circle cx="3" cy="8" r="1.5" fill="currentColor"/>
              <circle cx="13" cy="8" r="1.5" fill="currentColor"/>
            </svg>
            Opciones Avanzadas
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {openMenu === "advanced" && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={() => setOpenMenu(null)}>Anular Documento</div>
              <div className="dropdown-item" onClick={() => { onAbrirDocumentos?.(); setOpenMenu(null); }}>Archivos</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SD01Toolbar;