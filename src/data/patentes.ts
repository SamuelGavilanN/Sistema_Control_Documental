// src/data/patentes.ts

import { supabase } from '../lib/supabase';

export interface Patente {
  id: string;
  numero_patente: string;
  tipo_vehiculo: string;
  cantidad_sellos: number;
  activo: boolean;
}

export let patentes: Patente[] = [];

export const cargarPatentes = async (): Promise<Patente[]> => {
  const { data, error } = await supabase
    .from('patentes')
    .select('*')
    .eq('activo', true)
    .order('numero_patente');
  if (error) throw error;
  patentes = data || [];
  return patentes;
};

export const crearPatente = async (patente: Partial<Patente>): Promise<Patente> => {
  const { data, error } = await supabase
    .from('patentes')
    .insert([patente])
    .select()
    .single();
  if (error) throw error;
  patentes.push(data);
  return data;
};
