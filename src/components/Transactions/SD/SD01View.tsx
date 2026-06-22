// src/components/Transactions/SD/SD01View.tsx

import React, { useState, useEffect } from "react";
import { auth } from '../../../lib/auth';
import { cargarLocales } from '../../../data/locales';
import SD01Toolbar from './SD01Toolbar';
import SD01Table from './SD01Table';
import TarjetaTransporte from './SD01Modales/TarjetaTransporte';
import SellosAdicionales from './SD01Modales/SellosAdicionales';
import NuevaDocumentacionModal from './SD01Modales/NuevaDocumentacionModal';
import DocumentosModal from './SD01Modales/DocumentosModal';
import "./SD01.css";

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface Conductor {
  id: string; nombre: string; apellido: string; nombre_completo?: string;
  numero_documento: string; telefono: string; empresa: string;
}

interface Patente {
  id: string; numero_patente: string; tipo_vehiculo: string; cantidad_sellos: number;
}

interface SD01Row {
  id: number; codigoLocal: string; nombreLocal: string; fechaEntrega: string; horaEntrega: string;
  selloTrasero: string; cantidadPallet: number; totalCarga: number;
  carga?: Array<{ id: number; origenCarga: string; tipoDocumento: string; numeroDocumento: string; cantidadBultos: number; observacion: string }>;
}

const cargarConductoresAPI = async (): Promise<Conductor[]> => {
  const resp = await fetch(API_URL + '/sd01_conductores?select=*&activo=eq.true&order=nombre,apellido', { headers: HEADERS });
  const data = await resp.json();
  return (data || []).map((c: any) => ({ ...c, nombre_completo: c.nombre + ' ' + c.apellido }));
};

const cargarPatentesAPI = async (): Promise<Patente[]> => {
  const resp = await fetch(API_URL + '/sd01_patentes?select=*&activo=eq.true&order=numero_patente', { headers: HEADERS });
  return (await resp.json()) || [];
};

const generarIdDocumento = async (): Promise<string> => {
  const now = new Date();
  const fecha = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0') + now.getFullYear();
  const resp = await fetch(API_URL + '/sd01_documentos?select=id_documento&order=creado_en.desc&limit=1', { headers: HEADERS });
  const data = await resp.json();
  const count = (data?.length || 0) + 1;
  return 'SD01-' + fecha + '-' + String(count).padStart(4, '0');
};

const filaVacia = (): SD01Row => ({
  id: 1, codigoLocal: "", nombreLocal: "", fechaEntrega: "", horaEntrega: "",
  selloTrasero: "", cantidadPallet: 0, totalCarga: 0,
});

const SD01View: React.FC = () => {
  const [rows, setRows] = useState<SD01Row[]>([filaVacia()]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [patentes, setPatentes] = useState<Patente[]>([]);
  const [conductorSeleccionado, setConductorSeleccionado] = useState("");
  const [patentePrincipal, setPatentePrincipal] = useState("");
  const [patenteAdicional, setPatenteAdicional] = useState("");
  const [fechaProgramacion, setFechaProgramacion] = useState("");
  const [nombreAdministrativo, setNombreAdministrativo] = useState("");
  const [selloLateral, setSelloLateral] = useState("");
  const [selloAdicional, setSelloAdicional] = useState("");
  const [observacionesGenerales, setObservacionesGenerales] = useState("");
  const [cantidadFilasAgregar, setCantidadFilasAgregar] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [idDocumentoActual, setIdDocumentoActual] = useState<string | null>(null);
  const [estadoDocumento, setEstadoDocumento] = useState<string>("borrador");
  const [documentoCreado, setDocumentoCreado] = useState(false);
  const [showDocumentosModal, setShowDocumentosModal] = useState(false);
  const [showNuevaDocModal, setShowNuevaDocModal] = useState(false);
  const [showEditarTransporteModal, setShowEditarTransporteModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  useEffect(() => {
    cargarLocales();
    cargarDatosIniciales();
    const usuario = auth.getUsuario();
    if (usuario) setNombreAdministrativo((usuario.nombre || "") + " " + (usuario.apellido || "").trim());
  }, []);

  const cargarDatosIniciales = async () => {
    setCargandoDatos(true);
    try {
      const [conductoresData, patentesData] = await Promise.all([cargarConductoresAPI(), cargarPatentesAPI()]);
      setConductores(conductoresData); setPatentes(patentesData);
    } catch (e) { console.error('Error cargando datos:', e); }
    setCargandoDatos(false);
  };

  const limpiarFormulario = () => {
    setRows([filaVacia()]); setConductorSeleccionado(""); setPatentePrincipal(""); setPatenteAdicional("");
    setFechaProgramacion(""); setSelloLateral(""); setSelloAdicional("");
    setObservacionesGenerales(""); setCantidadFilasAgregar(1);
    setIdDocumentoActual(null); setEstadoDocumento("borrador");
    setDocumentoCreado(false); setSelectedRows([]);
  };

  const handleCrearDocumento = async (datos: { conductor: string; patentePrincipal: string; patenteAdicional: string; fechaProgramacion: string }) => {
    setConductorSeleccionado(datos.conductor); setPatentePrincipal(datos.patentePrincipal);
    setPatenteAdicional(datos.patenteAdicional); setFechaProgramacion(datos.fechaProgramacion);
    setDocumentoCreado(true); setRows([filaVacia()]); setShowNuevaDocModal(false);
  };

  const guardarDocumento = async (estado: string) => {
    setGuardando(true);
    try {
      const user = auth.getUsuario();
      const conductorData = conductores.find(c => c.nombre_completo === conductorSeleccionado);
      const patentePData = patentes.find(p => p.numero_patente === patentePrincipal);
      const patenteSData = patentes.find(p => p.numero_patente === patenteAdicional);
      const docId = idDocumentoActual || await generarIdDocumento();
      const docData: any = { id_documento: docId, conductor_id: conductorData?.id || null, patente_principal_id: patentePData?.id || null, patente_adicional_id: patenteSData?.id || null, fecha_programacion: fechaProgramacion || null, sello_lateral: selloLateral, sello_adicional: selloAdicional, administrativo: nombreAdministrativo, observaciones: observacionesGenerales, estado: estado, creado_por: user?.id };

      if (idDocumentoActual) {
        docData.modificado_en = new Date().toISOString();
        await fetch(API_URL + '/sd01_documentos?id_documento=eq.' + docId, { method: 'PATCH', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify(docData) });
      } else {
        await fetch(API_URL + '/sd01_documentos', { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify(docData) });
      }
      const localesFiltrados = rows.filter(r => r.codigoLocal);
      for (const row of localesFiltrados) {
        await fetch(API_URL + '/sd01_documento_locales', { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ documento_id: docId, codigo_local: row.codigoLocal, nombre_local: row.nombreLocal, fecha_entrega: row.fechaEntrega || null, hora_entrega: row.horaEntrega || null, sello_trasero: row.selloTrasero, cantidad_pallet: row.cantidadPallet, total_carga: row.totalCarga }) });
      }
      if (!idDocumentoActual) setIdDocumentoActual(docId);
      setEstadoDocumento(estado);
      alert('✅ Documento ' + (estado === "finalizado" ? "finalizado" : "guardado como borrador") + ' correctamente');
      if (estado === "finalizado") limpiarFormulario();
    } catch (error: any) { alert("Error al guardar: " + error.message); }
    finally { setGuardando(false); }
  };

  if (cargandoDatos) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#64748b' }}>Cargando datos...</div>;

  return (
    <div className="sd01-view">
      <SD01Toolbar onGuardarBorrador={() => guardarDocumento("borrador")} onFinalizar={() => guardarDocumento("finalizado")} onCancelar={() => { if (confirm("¿Descartar cambios?")) limpiarFormulario(); }} onAbrirDocumentos={() => setShowDocumentosModal(true)} onNuevaDocumentacion={() => setShowNuevaDocModal(true)} onEditarTransporte={() => setShowEditarTransporteModal(true)} onImprimir={() => {}} onImprimirSeleccionados={() => {}} estado={estadoDocumento} guardando={guardando} documentoCreado={documentoCreado} />

      {documentoCreado && (
        <div style={{ marginBottom: '16px' }}>
          <TarjetaTransporte idDocumento={idDocumentoActual || ""} conductor={conductorSeleccionado} patentePrincipal={patentePrincipal} patenteAdicional={patenteAdicional} fechaProgramacion={fechaProgramacion} administrativo={nombreAdministrativo} conductores={conductores} patentes={patentes} />
        </div>
      )}

      {documentoCreado && (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px', padding: '12px 16px', background: '#f8fafd', borderRadius: '8px', border: '1px solid #eef0f5' }}>
          <button className="add-row-btn" onClick={() => { const newRow: SD01Row = { id: rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1, codigoLocal: "", nombreLocal: "", fechaEntrega: "", horaEntrega: "", selloTrasero: "", cantidadPallet: 0, totalCarga: 0 }; setRows([...rows, newRow]); setCantidadFilasAgregar(rows.length + 1); }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Agregar Local
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>Cantidad:</label>
            <input type="number" min="1" value={cantidadFilasAgregar} onChange={e => setCantidadFilasAgregar(parseInt(e.target.value) || 1)} onBlur={() => { const c = rows.length; const t = cantidadFilasAgregar; if (t <= c) { setRows(rows.slice(0, t)); return; } const nr: SD01Row[] = [...rows]; const sId = Math.max(...rows.map(r => r.id)) + 1; for (let i = 0; i < t - c; i++) { nr.push({ id: sId + i, codigoLocal: "", nombreLocal: "", fechaEntrega: "", horaEntrega: "", selloTrasero: "", cantidadPallet: 0, totalCarga: 0 }); } setRows(nr); }} onKeyPress={(e: any) => { if (e.key === "Enter") { const c = rows.length; const t = cantidadFilasAgregar; if (t <= c) { setRows(rows.slice(0, t)); return; } const nr: SD01Row[] = [...rows]; const sId = Math.max(...rows.map(r => r.id)) + 1; for (let i = 0; i < t - c; i++) { nr.push({ id: sId + i, codigoLocal: "", nombreLocal: "", fechaEntrega: "", horaEntrega: "", selloTrasero: "", cantidadPallet: 0, totalCarga: 0 }); } setRows(nr); } }} style={{ width: '60px', padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', textAlign: 'center' }} />
            <button className="apply-quantity-btn" onClick={() => { const c = rows.length; const t = cantidadFilasAgregar; if (t <= c) { setRows(rows.slice(0, t)); return; } const nr: SD01Row[] = [...rows]; const sId = Math.max(...rows.map(r => r.id)) + 1; for (let i = 0; i < t - c; i++) { nr.push({ id: sId + i, codigoLocal: "", nombreLocal: "", fechaEntrega: "", horaEntrega: "", selloTrasero: "", cantidadPallet: 0, totalCarga: 0 }); } setRows(nr); }}>Aplicar</button>
          </div>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <SellosAdicionales selloLateral={selloLateral} selloAdicional={selloAdicional} onSelloLateralChange={setSelloLateral} onSelloAdicionalChange={setSelloAdicional} />
          </div>
        </div>
      )}

      {!documentoCreado && (
        <div className="sin-documento" style={{ marginTop: '20px' }}><div className="sin-documento-icon">📋</div><h3>Sin documento activo</h3><p>Haz clic en <strong>"Nuevo Transporte"</strong> para comenzar.</p></div>
      )}

      {documentoCreado && (
        <>
          <SD01Table rows={rows} setRows={setRows} cantidadFilasAgregar={cantidadFilasAgregar} setCantidadFilasAgregar={setCantidadFilasAgregar} selectedRows={selectedRows} setSelectedRows={setSelectedRows} />
          <div className="sd01-footer"><div className="observaciones-section"><label>Observaciones Generales</label><textarea value={observacionesGenerales} onChange={e => setObservacionesGenerales(e.target.value)} placeholder="Ingresar observaciones generales del transporte..." rows={2} /></div></div>
        </>
      )}

      {showNuevaDocModal && <NuevaDocumentacionModal isOpen={showNuevaDocModal} onClose={() => setShowNuevaDocModal(false)} onCrear={handleCrearDocumento} conductores={conductores} setConductores={setConductores} patentes={patentes} setPatentes={setPatentes} />}
      {showEditarTransporteModal && <NuevaDocumentacionModal isOpen={showEditarTransporteModal} onClose={() => setShowEditarTransporteModal(false)} onCrear={(datos) => { handleCrearDocumento(datos); setShowEditarTransporteModal(false); }} valoresIniciales={{ conductor: conductorSeleccionado, patentePrincipal, patenteAdicional, fechaProgramacion }} conductores={conductores} setConductores={setConductores} patentes={patentes} setPatentes={setPatentes} />}
      {showDocumentosModal && <DocumentosModal isOpen={showDocumentosModal} onClose={() => setShowDocumentosModal(false)} onAbrirDocumento={(idDoc) => { setShowDocumentosModal(false); setIdDocumentoActual(idDoc); setDocumentoCreado(true); }} />}
    </div>
  );
};

export default SD01View;
