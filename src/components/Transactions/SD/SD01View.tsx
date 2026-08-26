// src/components/Transactions/SD/SD01View.tsx

import React, { useState, useRef, useEffect } from "react";
import SD01Toolbar from "./SD01Toolbar";
import SD01Table from "./SD01Table";
import DocumentosModal from "./DocumentosModal";
import ImprimirModal from "./ImprimirModal";
import ImprimirSeleccionModal from "./ImprimirSeleccionModal";
import NuevaDocumentacionModal from "./NuevaDocumentacionModal";
import TarjetaTransporte from "./TarjetaTransporte";
import SellosAdicionales from "./SellosAdicionales";
import { auth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import { conductores, cargarConductores } from "../../../data/conductores";
import { patentes, cargarPatentes } from "../../../data/patentes";
import { locales, cargarLocales } from "../../../data/locales";
import "./SD01.css";

export interface SD01Row {
  id: number;
  codigoLocal: string;
  nombreLocal: string;
  fechaEntrega: string;
  horaEntrega: string;
  selloTrasero: string;
  cantidadPallet: number;
  totalCarga: number;
  carga?: Array<{
    id: number;
    origenCarga: string;
    tipoDocumento: string;
    numeroDocumento: string;
    cantidadBultos: number;
    observacion: string;
  }>;
}

const filaVacia = (): SD01Row => ({
  id: 1,
  codigoLocal: "",
  nombreLocal: "",
  fechaEntrega: "",
  horaEntrega: "",
  selloTrasero: "",
  cantidadPallet: 0,
  totalCarga: 0,
});

const SD01View: React.FC = () => {
  // ---- State del formulario ----
  const [rows, setRows] = useState<SD01Row[]>([filaVacia()]);
  const [conductorSeleccionado, setConductorSeleccionado] = useState("");
  const [conductorId, setConductorId] = useState<string>("");
  const [patentePrincipal, setPatentePrincipal] = useState("");
  const [patentePrincipalId, setPatentePrincipalId] = useState<string>("");
  const [patenteAdicional, setPatenteAdicional] = useState("");
  const [patenteAdicionalId, setPatenteAdicionalId] = useState<string>("");
  const [fechaProgramacion, setFechaProgramacion] = useState("");
  const [nombreAdministrativo, setNombreAdministrativo] = useState("");
  const [selloLateral, setSelloLateral] = useState("");
  const [selloAdicional, setSelloAdicional] = useState("");
  const [observacionesGenerales, setObservacionesGenerales] = useState("");
  const [cantidadFilasAgregar, setCantidadFilasAgregar] = useState(1);

  // ---- Estado del documento ----
  const [guardando, setGuardando] = useState(false);
  const [idDocumentoActual, setIdDocumentoActual] = useState<string | null>(null);
  const [estadoDocumento, setEstadoDocumento] = useState<string>("borrador");
  const [documentoCreado, setDocumentoCreado] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<any>(null);

  // ---- Modales ----
  const [showDocumentosModal, setShowDocumentosModal] = useState(false);
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [showImprimirSeleccionModal, setShowImprimirSeleccionModal] = useState(false);
  const [showNuevaDocModal, setShowNuevaDocModal] = useState(false);
  const [showEditarTransporteModal, setShowEditarTransporteModal] = useState(false);

  // ---- Impresión ----
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [rowsParaImprimir, setRowsParaImprimir] = useState<SD01Row[]>([]);
  const [copiasActivas, setCopiasActivas] = useState<string[]>(["Local", "Guardia", "Conductor", "Original"]);

  const observacionesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // ---- Carga inicial ----
  useEffect(() => {
    const user = auth.getUsuario();
    setUsuarioActual(user);
    if (user) {
      setNombreAdministrativo(`${user.nombre || ""} ${user.apellido || ""}`.trim());
    }
    cargarConductores();
    cargarPatentes();
    cargarLocales();
  }, []);

  // ---- Utilidades ----
  const limpiarFormulario = () => {
    setRows([filaVacia()]);
    setConductorSeleccionado("");
    setConductorId("");
    setPatentePrincipal("");
    setPatentePrincipalId("");
    setPatenteAdicional("");
    setPatenteAdicionalId("");
    setFechaProgramacion("");
    setSelloLateral("");
    setSelloAdicional("");
    setObservacionesGenerales("");
    setCantidadFilasAgregar(1);
    setIdDocumentoActual(null);
    setEstadoDocumento("borrador");
    setDocumentoCreado(false);
    setSelectedRows([]);
  };

  // ---- Crear nuevo documento (desde modal) ----
  const handleCrearDocumento = async (datos: {
    conductor: string;
    conductorId: string;
    patentePrincipal: string;
    patentePrincipalId: string;
    patenteAdicional: string;
    patenteAdicionalId: string;
    fechaProgramacion: string;
  }) => {
    try {
      // Generar ID del documento (local)
      const idGenerado = `SD${Date.now()}`;

      setConductorSeleccionado(datos.conductor);
      setConductorId(datos.conductorId);
      setPatentePrincipal(datos.patentePrincipal);
      setPatentePrincipalId(datos.patentePrincipalId);
      setPatenteAdicional(datos.patenteAdicional);
      setPatenteAdicionalId(datos.patenteAdicionalId);
      setFechaProgramacion(datos.fechaProgramacion);
      setIdDocumentoActual(idGenerado);
      setShowNuevaDocModal(false);
      setDocumentoCreado(true);
      setEstadoDocumento("borrador");
      setRows([filaVacia()]);

      // Guardar inmediatamente como borrador
      await guardarDocumento("borrador", true);
    } catch (error: any) {
      alert("Error al crear documento: " + error.message);
    }
  };

  // ---- Editar transporte (datos maestros) ----
  const handleEditarTransporte = () => {
    if (!idDocumentoActual) {
      alert("No hay documento activo para editar.");
      return;
    }
    setShowEditarTransporteModal(true);
  };

  const handleActualizarTransporte = async (datos: {
    conductor: string;
    conductorId: string;
    patentePrincipal: string;
    patentePrincipalId: string;
    patenteAdicional: string;
    patenteAdicionalId: string;
    fechaProgramacion: string;
  }) => {
    setConductorSeleccionado(datos.conductor);
    setConductorId(datos.conductorId);
    setPatentePrincipal(datos.patentePrincipal);
    setPatentePrincipalId(datos.patentePrincipalId);
    setPatenteAdicional(datos.patenteAdicional);
    setPatenteAdicionalId(datos.patenteAdicionalId);
    setFechaProgramacion(datos.fechaProgramacion);
    setShowEditarTransporteModal(false);
    if (idDocumentoActual) {
      await guardarDocumento(estadoDocumento, true);
    }
  };

  // ---- Guardar documento (crear o actualizar) ----
  const guardarDocumento = async (estado: string, silencioso: boolean = false) => {
    if (!idDocumentoActual) {
      if (!silencioso) alert("No hay documento activo.");
      return;
    }
    setGuardando(true);
    try {
      const localesValidos = rows.filter((r) => r.codigoLocal);
      if (localesValidos.length === 0 && estado === "finalizado") {
        alert("Debe agregar al menos un local antes de finalizar.");
        setGuardando(false);
        return;
      }

      const documentoData: any = {
        id_documento: idDocumentoActual,
        conductor_id: conductorId || null,
        patente_principal_id: patentePrincipalId || null,
        patente_secundaria_id: patenteAdicionalId || null,
        fecha_programacion: fechaProgramacion || null,
        administrativo: nombreAdministrativo || null,
        sello_lateral: selloLateral || null,
        sello_adicional: selloAdicional || null,
        observaciones: observacionesGenerales || null,
        estado: estado,
        modificado_por: usuarioActual?.id || null,
        modificado_en: new Date().toISOString(),
      };
      if (estado === "finalizado") {
        documentoData.fecha_finalizacion = new Date().toISOString();
      }

      // Verificar si ya existe el documento
      const { data: existing, error: checkError } = await supabase
        .from("sd01_documentos")
        .select("id")
        .eq("id_documento", idDocumentoActual)
        .single();

      if (checkError && checkError.code !== "PGRST116") throw checkError;

      if (existing) {
        // Actualizar
        const { error: updateError } = await supabase
          .from("sd01_documentos")
          .update(documentoData)
          .eq("id_documento", idDocumentoActual);
        if (updateError) throw updateError;
      } else {
        // Insertar (primera vez)
        documentoData.creado_por = usuarioActual?.id || null;
        documentoData.creado_en = new Date().toISOString();
        const { error: insertError } = await supabase
          .from("sd01_documentos")
          .insert([documentoData]);
        if (insertError) throw insertError;
      }

      // Eliminar locales existentes
      await supabase
        .from("sd01_documento_locales")
        .delete()
        .eq("documento_id", idDocumentoActual);

      // Insertar nuevos locales y cargas
      for (const row of localesValidos) {
        const { data: localData, error: localError } = await supabase
          .from("sd01_documento_locales")
          .insert({
            documento_id: idDocumentoActual,
            codigo_local: row.codigoLocal,
            nombre_local: row.nombreLocal,
            fecha_entrega: row.fechaEntrega || null,
            hora_entrega: row.horaEntrega || null,
            sello_trasero: row.selloTrasero || null,
            cantidad_pallet: row.cantidadPallet || 0,
            total_carga: row.totalCarga || 0,
          })
          .select("id")
          .single();
        if (localError) throw localError;
        if (!localData) {
          throw new Error("No se pudo obtener el ID del local insertado");
        }

        if (row.carga && row.carga.length > 0) {
          const cargas = row.carga.map((c) => ({
            local_id: localData.id,
            documento_id: idDocumentoActual,
            origen_carga: c.origenCarga,
            tipo_documento: c.tipoDocumento || null,
            numero_documento: c.numeroDocumento || null,
            cantidad_bultos: c.cantidadBultos || 0,
            observacion: c.observacion || null,
          }));
          const { error: cargaError } = await supabase
            .from("sd01_documento_cargas")
            .insert(cargas);
          if (cargaError) throw cargaError;
        }
      }

      setEstadoDocumento(estado);
      if (!silencioso) {
        alert(`✅ Documento ${idDocumentoActual} guardado como ${estado}.`);
      }
    } catch (error: any) {
      console.error("Error guardando:", error);
      if (!silencioso) alert("❌ Error al guardar: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  // ---- Cancelar (descarta cambios) ----
  const handleCancelar = () => {
    if (documentoCreado) {
      if (!confirm("¿Descartar los cambios del documento actual?")) return;
    }
    limpiarFormulario();
  };

  // ---- Cargar documento existente ----
  const handleAbrirDocumento = async (idDocumento: string) => {
    try {
      const { data: doc, error } = await supabase
        .from("sd01_documentos")
        .select("*")
        .eq("id_documento", idDocumento)
        .single();
      if (error) throw error;

      const { data: localesData, error: localesError } = await supabase
        .from("sd01_documento_locales")
        .select("*")
        .eq("documento_id", idDocumento);
      if (localesError) throw localesError;

      let cargasData: any[] = [];
      if (localesData && localesData.length > 0) {
        const localIds = localesData.map((l: any) => l.id);
        const { data: cargas, error: cargasError } = await supabase
          .from("sd01_documento_cargas")
          .select("*")
          .in("local_id", localIds);
        if (cargasError) throw cargasError;
        cargasData = cargas || [];
      }

      const localesConCargas = (localesData || []).map((local: any) => ({
        ...local,
        cargas: cargasData.filter((c: any) => c.local_id === local.id),
      }));

      setShowDocumentosModal(false);
      setIdDocumentoActual(doc.id_documento);
      setDocumentoCreado(true);
      setEstadoDocumento(doc.estado);
      setFechaProgramacion(doc.fecha_programacion || "");
      setObservacionesGenerales(doc.observaciones || "");
      setSelloLateral(doc.sello_lateral || "");
      setSelloAdicional(doc.sello_adicional || "");
      setNombreAdministrativo(doc.administrativo || "");

      if (doc.conductor_id) {
        const cond = conductores.find((c) => c.id === doc.conductor_id);
        if (cond) {
          setConductorId(cond.id);
          setConductorSeleccionado(cond.nombre_completo || `${cond.nombre} ${cond.apellido}`);
        }
      }
      if (doc.patente_principal_id) {
        const pat = patentes.find((p) => p.id === doc.patente_principal_id);
        if (pat) {
          setPatentePrincipalId(pat.id);
          setPatentePrincipal(pat.numero_patente);
        }
      }
      if (doc.patente_secundaria_id) {
        const pat = patentes.find((p) => p.id === doc.patente_secundaria_id);
        if (pat) {
          setPatenteAdicionalId(pat.id);
          setPatenteAdicional(pat.numero_patente);
        }
      }

      if (localesConCargas && localesConCargas.length > 0) {
        const filas: SD01Row[] = localesConCargas.map((local: any, index: number) => {
          const cargas = local.cargas || [];
          const totalCarga = cargas.reduce((sum: number, c: any) => sum + (c.cantidad_bultos || 0), 0);
          return {
            id: index + 1,
            codigoLocal: local.codigo_local || "",
            nombreLocal: local.nombre_local || "",
            fechaEntrega: local.fecha_entrega || "",
            horaEntrega: local.hora_entrega || "",
            selloTrasero: local.sello_trasero || "",
            cantidadPallet: local.cantidad_pallet || 0,
            totalCarga: totalCarga,
            carga: cargas.map((c: any) => ({
              id: c.id,
              origenCarga: c.origen_carga || "",
              tipoDocumento: c.tipo_documento || "",
              numeroDocumento: c.numero_documento || "",
              cantidadBultos: c.cantidad_bultos || 0,
              observacion: c.observacion || "",
            })),
          };
        });
        setRows(filas);
        setCantidadFilasAgregar(filas.length);
      } else {
        setRows([filaVacia()]);
        setCantidadFilasAgregar(1);
      }
    } catch (error: any) {
      alert("Error al cargar documento: " + error.message);
    }
  };

  // ---- Funciones de impresión ----
  const handleImprimirTodos = () => {
    const todos = rows.filter((r) => r.codigoLocal);
    if (todos.length === 0) {
      alert("No hay locales para imprimir");
      return;
    }
    setRowsParaImprimir(todos);
    setCopiasActivas(["Local", "Guardia", "Conductor", "Original"]);
    setShowImprimirModal(true);
  };

  const handleImprimirSeleccionados = () => {
    if (selectedRows.length === 0) {
      alert("Selecciona al menos un local con el checkbox");
      return;
    }
    const seleccionados = rows.filter(
      (r) => selectedRows.includes(r.id) && r.codigoLocal
    );
    if (seleccionados.length === 0) {
      alert("Los locales seleccionados no tienen código");
      return;
    }
    setRowsParaImprimir(seleccionados);
    setShowImprimirSeleccionModal(true);
  };

  const handleImprimirConCopias = (copiasSeleccionadas: string[]) => {
    setCopiasActivas(copiasSeleccionadas);
    setShowImprimirSeleccionModal(false);
    setTimeout(() => setShowImprimirModal(true), 200);
  };

  // ---- Control de visibilidad ----
  const esEditable = estadoDocumento !== "finalizado";
  const puedeGuardar = documentoCreado && esEditable;

  return (
    <div className="sd01-view">
      <SD01Toolbar
        onNuevaDocumentacion={() => setShowNuevaDocModal(true)}
        onGuardarBorrador={() => guardarDocumento("borrador", false)}
        onFinalizar={() => guardarDocumento("finalizado", false)}
        onCancelar={handleCancelar}
        onAbrirDocumentos={() => setShowDocumentosModal(true)}
        onImprimir={handleImprimirTodos}
        onImprimirSeleccionados={handleImprimirSeleccionados}
        onEditarTransporte={handleEditarTransporte}
        estado={estadoDocumento}
        guardando={guardando}
        documentoCreado={documentoCreado}
        puedeGuardar={puedeGuardar}
      />

      <div className="sd01-form-grid">
        <div className="sd01-left-column">
          {documentoCreado ? (
            <TarjetaTransporte
              idDocumento={idDocumentoActual || ""}
              conductor={conductorSeleccionado}
              patentePrincipal={patentePrincipal}
              patenteAdicional={patenteAdicional}
              fechaProgramacion={fechaProgramacion}
              administrativo={nombreAdministrativo}
              estado={estadoDocumento}
            />
          ) : (
            <div className="sin-documento">
              <div className="sin-documento-icon">📋</div>
              <h3>Sin documento activo</h3>
              <p>
                Haz clic en <strong>"Nuevo Transporte"</strong> para comenzar.
              </p>
            </div>
          )}
        </div>

        <div className="sd01-right-column">
          {documentoCreado && (
            <SellosAdicionales
              selloLateral={selloLateral}
              selloAdicional={selloAdicional}
              onSelloLateralChange={setSelloLateral}
              onSelloAdicionalChange={setSelloAdicional}
              disabled={!esEditable}
            />
          )}
        </div>
      </div>

      {documentoCreado && (
        <>
          <SD01Table
            rows={rows}
            setRows={setRows}
            cantidadFilasAgregar={cantidadFilasAgregar}
            setCantidadFilasAgregar={setCantidadFilasAgregar}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            editable={esEditable}
            idDocumento={idDocumentoActual || ""}
          />

          <div className="sd01-footer">
            <div className="observaciones-section">
              <label>Observaciones Generales</label>
              <textarea
                ref={observacionesTextareaRef}
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                placeholder="Ingresar observaciones generales del transporte..."
                rows={2}
                disabled={!esEditable}
              />
            </div>
          </div>
        </>
      )}

      <DocumentosModal
        isOpen={showDocumentosModal}
        onClose={() => setShowDocumentosModal(false)}
        onAbrirDocumento={handleAbrirDocumento}
      />

      <ImprimirModal
        isOpen={showImprimirModal}
        rows={rowsParaImprimir.length > 0 ? rowsParaImprimir : rows}
        conductor={conductorSeleccionado}
        patentePrincipal={patentePrincipal}
        patenteAdicional={patenteAdicional}
        selloLateral={selloLateral}
        selloAdicional={selloAdicional}
        nombreAdministrativo={nombreAdministrativo}
        onClose={() => {
          setShowImprimirModal(false);
          setRowsParaImprimir([]);
        }}
        copias={copiasActivas}
      />

      <ImprimirSeleccionModal
        isOpen={showImprimirSeleccionModal}
        onClose={() => setShowImprimirSeleccionModal(false)}
        onImprimir={handleImprimirConCopias}
        localesSeleccionados={rowsParaImprimir.length}
      />

      <NuevaDocumentacionModal
        isOpen={showNuevaDocModal}
        onClose={() => setShowNuevaDocModal(false)}
        onCrear={handleCrearDocumento}
        valoresIniciales={{}}
      />

      <NuevaDocumentacionModal
        isOpen={showEditarTransporteModal}
        onClose={() => setShowEditarTransporteModal(false)}
        onCrear={handleActualizarTransporte}
        valoresIniciales={{
          conductor: conductorSeleccionado,
          conductorId: conductorId,
          patentePrincipal: patentePrincipal,
          patentePrincipalId: patentePrincipalId,
          patenteAdicional: patenteAdicional,
          patenteAdicionalId: patenteAdicionalId,
          fechaProgramacion: fechaProgramacion,
        }}
        modoEdicion={true}
      />
    </div>
  );
};

export default SD01View;
