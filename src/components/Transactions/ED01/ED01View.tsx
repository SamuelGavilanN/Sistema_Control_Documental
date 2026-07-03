// src/components/Transactions/ED/ED01View.tsx

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import { locales, cargarLocales } from '../../../data/locales';
import * as XLSX from 'xlsx';
import ED01Toolbar from './ED01Toolbar';
import ED01Tabla from './ED01Tabla';
import ED01Modal from './ED01Modal';
import ObservacionModal from './ObservacionModal';
import FiltroModal from './FiltroModal';
import EtiquetaModal from './EtiquetaModal';
import './ED01.css';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

export interface ED01Row {
  id: string;
  estado: string;
  numero_tarea: string;
  numero_empaque: string;
  codigo_local: string;
  nombre_local: string;
  cantidad_bultos: number;
  cantidad_pallet: number;
  observacion: string | null;
  creado_por: string;
  creado_en: string;
  modificado_por: string | null;
  modificado_en: string | null;
}

const ED01View: React.FC = () => {
  const usuario = auth.getUsuario();
  const [registros, setRegistros] = useState<ED01Row[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modoModal, setModoModal] = useState<'nuevo' | 'editar' | 'cancelar' | 'ver'>('nuevo');
  const [registroSeleccionado, setRegistroSeleccionado] = useState<ED01Row | null>(null);
  const [showObservacionModal, setShowObservacionModal] = useState(false);
  const [observacionVer, setObservacionVer] = useState('');
  const [showFiltroModal, setShowFiltroModal] = useState(false);
  const [showEtiquetaModal, setShowEtiquetaModal] = useState(false);
  const [filtros, setFiltros] = useState<any[]>([]);
  const [ordenColumna, setOrdenColumna] = useState<string>('creado_en');
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('desc');
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});
  const [loteActivo, setLoteActivo] = useState<any>(null);
  const [empaquesDisponibles, setEmpaquesDisponibles] = useState(0);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarLocales();
    cargarUsuarios();
    verificarLoteActivo();
    cargarRegistros(true);
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => { cargarRegistros(false); }, 10000);
    return () => clearInterval(intervalo);
  }, [filtros, ordenColumna, ordenDireccion]);

  const verificarLoteActivo = async () => {
    try {
      const resp = await fetch(API_URL + '/ed04_lotes?select=*&activo=eq.true&order=creado_en.desc&limit=1', { headers: HEADERS });
      const data = await resp.json();
      if (data && data.length > 0) {
        setLoteActivo(data[0]);
        setEmpaquesDisponibles(data[0].total_empaques - data[0].empaques_usados);
      } else {
        setLoteActivo(null);
        setEmpaquesDisponibles(0);
      }
    } catch (e) {}
  };

  const cargarUsuarios = async () => {
    const { data } = await supabase.from('usuarios').select('id, nombre, apellido');
    if (data) { const m: Record<string, string> = {}; data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido}`; }); setNombresUsuarios(m); }
  };

  const cargarRegistros = async (mostrarCargando: boolean = false) => {
    try {
      if (mostrarCargando) setCargando(true);
      const { data, error } = await supabase.from('ed01_empaques').select('*').order(ordenColumna, { ascending: ordenDireccion === 'asc' });
      if (error) throw error;
      let datosFiltrados = data || [];
      filtros.forEach((filtro: any) => {
        const col = filtro.columna; const op = filtro.operador; const val = (filtro.valor || '').toLowerCase();
        if (!col) return;
        datosFiltrados = datosFiltrados.filter((item: any) => {
          const itemVal = item[col];
          if (op === 'vacio') return itemVal === null || itemVal === '' || itemVal === undefined;
          if (op === 'no_vacio') return itemVal !== null && itemVal !== '' && itemVal !== undefined;
          if (val === '') return true;
          const itemStr = String(itemVal || '').toLowerCase();
          if (op === 'igual') return itemStr === val; if (op === 'mayor') return Number(itemVal) > Number(val);
          if (op === 'menor') return Number(itemVal) < Number(val); if (op === 'mayor_igual') return Number(itemVal) >= Number(val);
          if (op === 'menor_igual') return Number(itemVal) <= Number(val); if (op === 'contiene') return itemStr.includes(val);
          if (op === 'no_contiene') return !itemStr.includes(val); return true;
        });
      });
      setRegistros(datosFiltrados);
    } catch (error) { console.error('Error:', error); }
    finally { if (mostrarCargando) setCargando(false); }
  };

  const handleNuevo = () => {
    if (!loteActivo) {
      alert('No hay un lote activo. Cargue un lote en ED04 primero.');
      return;
    }
    if (empaquesDisponibles <= 0) {
      alert('El lote activo está agotado. Cargue un nuevo lote en ED04.');
      return;
    }
    setModoModal('nuevo'); setRegistroSeleccionado(null); setShowModal(true);
  };

  const handleEditar = () => {
    if (!registroSeleccionado) { alert('Selecciona un registro'); return; }
    if (registroSeleccionado.estado === 'Cancelado') { alert('No se puede editar un registro cancelado'); return; }
    setModoModal('editar'); setShowModal(true);
  };

  const handleCancelarRegistro = () => {
    if (!registroSeleccionado) { alert('Selecciona un registro'); return; }
    if (registroSeleccionado.estado === 'Cancelado') { alert('El registro ya esta cancelado'); return; }
    setModoModal('cancelar'); setShowModal(true);
  };

  const handleImprimirEtiqueta = () => {
    if (!registroSeleccionado) { alert('Selecciona un registro'); return; }
    setShowEtiquetaModal(true);
  };

  const handleExportarExcel = () => {
    if (registros.length === 0) { alert('No hay datos para exportar'); return; }
    
    const datosExport = registros.map(reg => ({
      'Estado': reg.estado,
      'N° Tarea': reg.numero_tarea,
      'N° Empaque': reg.numero_empaque,
      'Cod. Local': reg.codigo_local,
      'Tienda': reg.nombre_local,
      'Cant. Bultos': reg.cantidad_bultos,
      'Cant. Pallet': reg.cantidad_pallet,
      'Creado Por': nombresUsuarios[reg.creado_por] || reg.creado_por,
      'Creado En': reg.creado_en ? new Date(reg.creado_en).toLocaleString('es-CL') : '-',
      'Mod. Por': reg.modificado_por ? (nombresUsuarios[reg.modificado_por] || reg.modificado_por) : '-',
      'Mod. En': reg.modificado_en ? new Date(reg.modificado_en).toLocaleString('es-CL') : '-',
      'Observación': reg.observacion || ''
    }));

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empaques');
    XLSX.writeFile(wb, 'Registro_Empaques_' + new Date().toLocaleDateString('es-CL').replace(/\//g, '-') + '.xlsx');
  };

  const handleGuardar = async (datos: any) => {
    try {
      const user = auth.getUsuario();
      if (modoModal === 'nuevo') {
        // Obtener siguiente empaque del lote activo via RPC
        const { data: idData, error: idError } = await supabase.rpc('obtener_siguiente_empaque');
        if (idError) {
          alert('Error al obtener empaque: ' + idError.message);
          return;
        }
        
        const localData = locales.find(l => l.codigo_local === datos.codigo_local);
        const { error: insertError } = await supabase.from('ed01_empaques').insert([{
          numero_empaque: idData,
          numero_tarea: datos.numero_tarea,
          codigo_local: datos.codigo_local,
          nombre_local: localData?.nombre_local || '',
          cantidad_bultos: datos.cantidad_bultos,
          cantidad_pallet: datos.cantidad_pallet,
          observacion: datos.observacion || null,
          estado: 'Finalizado',
          creado_por: user?.id,
          creado_en: new Date().toISOString()
        }]);
        if (insertError) throw insertError;
        
        setShowModal(false);
        verificarLoteActivo();
        cargarRegistros(false);
        
        setTimeout(() => {
          setRegistroSeleccionado({
            id: '', numero_empaque: idData, numero_tarea: datos.numero_tarea,
            codigo_local: datos.codigo_local, nombre_local: localData?.nombre_local || '',
            cantidad_bultos: datos.cantidad_bultos, cantidad_pallet: datos.cantidad_pallet,
            creado_por: user?.id, ...datos
          } as any);
          setTimeout(() => setShowEtiquetaModal(true), 300);
        }, 500);
      } else if (modoModal === 'editar') {
        await supabase.from('ed01_empaques').update({ estado: 'Editando', modificado_por: user?.id, modificado_en: new Date().toISOString() }).eq('id', registroSeleccionado?.id);
        await supabase.from('ed01_empaques').update({
          numero_tarea: datos.numero_tarea, codigo_local: datos.codigo_local, nombre_local: datos.nombre_local,
          cantidad_bultos: datos.cantidad_bultos, cantidad_pallet: datos.cantidad_pallet, observacion: datos.observacion,
          estado: 'Finalizado', modificado_por: user?.id, modificado_en: new Date().toISOString()
        }).eq('id', registroSeleccionado?.id);
        setShowModal(false); cargarRegistros(false);
        setTimeout(() => {
          setRegistroSeleccionado({ ...registroSeleccionado!, ...datos } as any);
          setTimeout(() => setShowEtiquetaModal(true), 300);
        }, 500);
      } else if (modoModal === 'cancelar') {
        await supabase.from('ed01_empaques').update({ estado: 'Editando', modificado_por: user?.id, modificado_en: new Date().toISOString() }).eq('id', registroSeleccionado?.id);
        await supabase.from('ed01_empaques').update({ estado: 'Cancelado', observacion: datos.observacion, modificado_por: user?.id, modificado_en: new Date().toISOString() }).eq('id', registroSeleccionado?.id);
        setShowModal(false); setRegistroSeleccionado(null); cargarRegistros(false);
      }
    } catch (error: any) { alert('Error: ' + error.message); }
  };

  const handleVerObservacion = (obs: string | null) => { setObservacionVer(obs || 'Sin observacion'); setShowObservacionModal(true); };

  const nombreCreadorEtiqueta = registroSeleccionado?.creado_por
    ? (nombresUsuarios[registroSeleccionado.creado_por] || `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim())
    : `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim();

  return (
    <div className="ed01-view">
      <div ref={toolbarRef} style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg-panel)', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
        <ED01Toolbar
          onNuevo={handleNuevo}
          onEditar={handleEditar}
          onCancelar={handleCancelarRegistro}
          onImprimir={handleImprimirEtiqueta}
          onFiltro={() => setShowFiltroModal(true)}
          onExportar={handleExportarExcel}
          registroSeleccionado={!!registroSeleccionado}
          loteActivo={loteActivo}
          empaquesDisponibles={empaquesDisponibles}
        />
      </div>
      
      <ED01Tabla
        registros={registros}
        cargando={cargando}
        seleccionado={registroSeleccionado}
        onSeleccionar={setRegistroSeleccionado}
        onVerObservacion={handleVerObservacion}
        ordenColumna={ordenColumna}
        ordenDireccion={ordenDireccion}
        onOrdenar={(columna) => {
          if (ordenColumna === columna) setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
          else { setOrdenColumna(columna); setOrdenDireccion('asc'); }
        }}
        nombresUsuarios={nombresUsuarios}
      />
      
      <ED01Modal isOpen={showModal} onClose={() => setShowModal(false)} onGuardar={handleGuardar} modo={modoModal} registro={registroSeleccionado} />
      <ObservacionModal isOpen={showObservacionModal} onClose={() => setShowObservacionModal(false)} observacion={observacionVer} />
      <FiltroModal isOpen={showFiltroModal} onClose={() => setShowFiltroModal(false)} filtros={filtros} onAplicar={setFiltros} />
      <EtiquetaModal isOpen={showEtiquetaModal} onClose={() => setShowEtiquetaModal(false)} registro={registroSeleccionado} nombreCreador={nombreCreadorEtiqueta} />
    </div>
  );
};

export default ED01View;
