import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import { locales, cargarLocales } from '../../../data/locales';
import ED01Toolbar from './ED01Toolbar';
import ED01Tabla from './ED01Tabla';
import ED01Modal from './ED01Modal';
import ObservacionModal from './ObservacionModal';
import FiltroModal from './FiltroModal';
import EtiquetaModal from './EtiquetaModal';
import './ED01.css';

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

  useEffect(() => {
    cargarLocales();
    cargarUsuarios();
  }, []);

  // Polling: recargar registros cada 10 segundos
  useEffect(() => {
    cargarRegistros(false);
    const intervalo = setInterval(() => {
      cargarRegistros(false);
    }, 10000);
    return () => clearInterval(intervalo);
  }, [filtros, ordenColumna, ordenDireccion]);

  const cargarUsuarios = async () => {
    try {
      const { data } = await supabase.from('usuarios').select('id, nombre, apellido');
      if (data) {
        const mapa: Record<string, string> = {};
        data.forEach((u: any) => { mapa[u.id] = `${u.nombre} ${u.apellido}`; });
        setNombresUsuarios(mapa);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const cargarRegistros = async (mostrarCargando: boolean = true) => {
    try {
      if (mostrarCargando) setCargando(true);
      const { data, error } = await supabase
        .from('ed01_empaques')
        .select('*')
        .order(ordenColumna, { ascending: ordenDireccion === 'asc' });
      
      if (error) throw error;
      
      let datosFiltrados = data || [];
      
      filtros.forEach((filtro: any) => {
        const col = filtro.columna;
        const op = filtro.operador;
        const val = (filtro.valor || '').toLowerCase();
        
        if (!col) return;
        
        datosFiltrados = datosFiltrados.filter((item: any) => {
          const itemVal = item[col];
          
          if (op === 'vacio') return itemVal === null || itemVal === '' || itemVal === undefined;
          if (op === 'no_vacio') return itemVal !== null && itemVal !== '' && itemVal !== undefined;
          if (val === '') return true;
          
          const itemStr = String(itemVal || '').toLowerCase();
          
          if (op === 'igual') return itemStr === val;
          if (op === 'mayor') return Number(itemVal) > Number(val);
          if (op === 'menor') return Number(itemVal) < Number(val);
          if (op === 'mayor_igual') return Number(itemVal) >= Number(val);
          if (op === 'menor_igual') return Number(itemVal) <= Number(val);
          if (op === 'contiene') return itemStr.includes(val);
          if (op === 'no_contiene') return !itemStr.includes(val);
          
          return true;
        });
      });
      
      setRegistros(datosFiltrados);
    } catch (error) {
      console.error('Error cargando registros:', error);
    } finally {
      if (mostrarCargando) setCargando(false);
    }
  };

  const handleNuevo = () => { setModoModal('nuevo'); setRegistroSeleccionado(null); setShowModal(true); };
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

  const handleGuardar = async (datos: any) => {
    try {
      const usuario = auth.getUsuario();
      if (modoModal === 'nuevo') {
        const { data: idData, error: idError } = await supabase.rpc('generar_numero_empaque');
        if (idError) throw idError;
        const localData = locales.find(l => l.codigo_local === datos.codigo_local);
        const { error: insertError } = await supabase.from('ed01_empaques').insert([{
          numero_empaque: idData, numero_tarea: datos.numero_tarea,
          codigo_local: datos.codigo_local, nombre_local: localData?.nombre_local || '',
          cantidad_bultos: datos.cantidad_bultos, cantidad_pallet: datos.cantidad_pallet,
          observacion: datos.observacion || null, estado: 'Finalizado',
          creado_por: usuario?.id, creado_en: new Date().toISOString()
        }]);
        if (insertError) throw insertError;
      } else if (modoModal === 'editar') {
        await supabase.from('ed01_empaques').update({ estado: 'Editando', modificado_por: usuario?.id, modificado_en: new Date().toISOString() }).eq('id', registroSeleccionado?.id);
        await supabase.from('ed01_empaques').update({
          numero_tarea: datos.numero_tarea, codigo_local: datos.codigo_local,
          nombre_local: datos.nombre_local, cantidad_bultos: datos.cantidad_bultos,
          cantidad_pallet: datos.cantidad_pallet, observacion: datos.observacion,
          estado: 'Finalizado', modificado_por: usuario?.id, modificado_en: new Date().toISOString()
        }).eq('id', registroSeleccionado?.id);
      } else if (modoModal === 'cancelar') {
        await supabase.from('ed01_empaques').update({ estado: 'Editando', modificado_por: usuario?.id, modificado_en: new Date().toISOString() }).eq('id', registroSeleccionado?.id);
        await supabase.from('ed01_empaques').update({
          estado: 'Cancelado', observacion: datos.observacion,
          modificado_por: usuario?.id, modificado_en: new Date().toISOString()
        }).eq('id', registroSeleccionado?.id);
      }
      setShowModal(false); setRegistroSeleccionado(null); cargarRegistros(false);
    } catch (error: any) { alert('Error: ' + error.message); }
  };

  const handleVerObservacion = (obs: string | null) => { setObservacionVer(obs || 'Sin observacion'); setShowObservacionModal(true); };

  return (
    <div className="ed01-view">
      <ED01Toolbar onNuevo={handleNuevo} onEditar={handleEditar} onCancelar={handleCancelarRegistro} onImprimir={handleImprimirEtiqueta} onFiltro={() => setShowFiltroModal(true)} registroSeleccionado={!!registroSeleccionado} />
      <ED01Tabla registros={registros} cargando={cargando} seleccionado={registroSeleccionado} onSeleccionar={setRegistroSeleccionado} onVerObservacion={handleVerObservacion} ordenColumna={ordenColumna} ordenDireccion={ordenDireccion} onOrdenar={(columna) => { if (ordenColumna === columna) setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc'); else { setOrdenColumna(columna); setOrdenDireccion('asc'); } }} nombresUsuarios={nombresUsuarios} />
      <ED01Modal isOpen={showModal} onClose={() => setShowModal(false)} onGuardar={handleGuardar} modo={modoModal} registro={registroSeleccionado} />
      <ObservacionModal isOpen={showObservacionModal} onClose={() => setShowObservacionModal(false)} observacion={observacionVer} />
      <FiltroModal isOpen={showFiltroModal} onClose={() => setShowFiltroModal(false)} filtros={filtros} onAplicar={setFiltros} />
      <EtiquetaModal isOpen={showEtiquetaModal} onClose={() => setShowEtiquetaModal(false)} registro={registroSeleccionado} nombreCreador={registroSeleccionado ? (nombresUsuarios[registroSeleccionado.creado_por] || 'Usuario') : 'Usuario'} />
    </div>
  );
};

export default ED01View;
