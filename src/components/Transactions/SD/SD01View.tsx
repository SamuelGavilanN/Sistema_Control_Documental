// src/components/Transactions/SD/SD01View.tsx

import React, { useState, useEffect } from 'react';
import { auth } from '../../../lib/auth';
import { getTransportesSD01, invalidarTransportes } from '../../../lib/api'; // importamos
import SD01CrearTransporte from './SD01CrearTransporte';
import SD01VerTransporte from './SD01VerTransporte';
import SD01CargaExcel from './SD01CargaExcel';
import SD01IniciarTransporte from './SD01IniciarTransporte';
import './SD01.css';

const SD01View: React.FC = () => {
  const [transportes, setTransportes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [transporteSeleccionado, setTransporteSeleccionado] = useState<any>(null);
  const [transportesSeleccionados, setTransportesSeleccionados] = useState<Set<string>>(new Set());
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', visible: false });
  const [mostrarCrearTransporte, setMostrarCrearTransporte] = useState(false);
  const [mostrarEditarTransporte, setMostrarEditarTransporte] = useState(false);
  const [mostrarVerTransporte, setMostrarVerTransporte] = useState(false);
  const [mostrarCargaExcel, setMostrarCargaExcel] = useState(false);
  const [mostrarIniciarTransporte, setMostrarIniciarTransporte] = useState(false);
  const [usuariosAdmin, setUsuariosAdmin] = useState<any[]>([]);
  const [mostrarAsignarModal, setMostrarAsignarModal] = useState(false);
  const [usuarioAsignar, setUsuarioAsignar] = useState('');
  const usuario = auth.getUsuario();

  useEffect(() => {
    cargarTransportes();
    cargarUsuariosAdmin();
    const intervalo = setInterval(cargarTransportes, 15000); // reducido a 15s
    return () => clearInterval(intervalo);
  }, []);

  const cargarTransportes = async () => {
    try {
      const data = await getTransportesSD01(); // consulta optimizada
      if (data && data.length > 0) {
        // Los datos ya vienen con las relaciones incluidas
        // Solo formateamos para mostrar
        const formateados = data.map((t: any) => ({
          ...t,
          cantidad_locales: t.locales ? t.locales.length : 0,
          conductor_nombre: t.conductor ? `${t.conductor.nombre} ${t.conductor.apellido}` : '-',
          patente_principal: t.patente_principal ? t.patente_principal.numero_patente : '-',
          creado_por_nombre: t.creado_por ? 'Nombre pendiente' : '-' // si queremos el nombre del creador, podemos hacer otra consulta o incluirlo en la select
        }));
        setTransportes(formateados);
      } else {
        setTransportes([]);
      }
    } catch (e) {
      console.error('Error cargando transportes:', e);
    }
    setCargando(false);
  };

  const cargarUsuariosAdmin = async () => {
    try {
      // Usamos la función de api (no está creada aún, pero la añadimos)
      const { getUsuarios } = await import('../../../lib/api');
      const data = await getUsuarios();
      if (data) {
        setUsuariosAdmin(data.filter((u: any) => u.rol === 'Administrativo' || u.rol === 'Lider'));
      }
    } catch (e) {}
  };

  // ... resto de funciones (mostrarMensaje, toggleSeleccion, etc.) se mantienen igual

  const handleTransporteCreado = () => {
    setMostrarCrearTransporte(false);
    invalidarTransportes(); // invalidamos caché
    cargarTransportes();
    mostrarMensaje('success', 'Transporte creado exitosamente');
  };

  const handleTransporteEditado = () => {
    setMostrarEditarTransporte(false);
    setTransporteSeleccionado(null);
    invalidarTransportes();
    cargarTransportes();
    mostrarMensaje('success', 'Transporte editado exitosamente');
  };

  const handleCargaExcelCompletada = () => {
    setMostrarCargaExcel(false);
    invalidarTransportes();
    cargarTransportes();
    mostrarMensaje('success', 'Transportes creados exitosamente');
  };

  // handleIniciarTransporte, handleCancelarTransporte, etc. se mantienen igual

  // ... render y modales (sin cambios)

  return ( ... ); // mismo JSX
};

export default SD01View;
