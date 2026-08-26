// src/data/conductores.ts

import { supabase } from '../lib/supabase';

export interface Conductor {
  id: string;
  nombre: string;
  apellido: string;
  numero_documento: string;  // <- RUT
  telefono: string;
  empresa: string;
  activo: boolean;
  nombre_completo?: string;
}

export let conductores: Conductor[] = [];

export const cargarConductores = async (): Promise<Conductor[]> => {
  const { data, error } = await supabase
    .from('conductores')
    .select('*')
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  conductores = data || [];
  conductores.forEach(c => {
    c.nombre_completo = `${c.nombre} ${c.apellido}`.trim();
  });
  return conductores;
};

export const crearConductor = async (conductor: Partial<Conductor>): Promise<Conductor> => {
  const { data, error } = await supabase
    .from('conductores')
    .insert([conductor])
    .select()
    .single();
  if (error) throw error;
  const nuevo = data;
  nuevo.nombre_completo = `${nuevo.nombre} ${nuevo.apellido}`.trim();
  conductores.push(nuevo);
  return nuevo;
};
