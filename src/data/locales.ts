import { supabase } from '../lib/supabase';

export interface Local {
  id: string;
  codigo_local: string;
  nombre_local: string;
  drop_local: string;
  zona: string;
  correo: string;
  activo: boolean;
}

export let locales: Local[] = [];

export const cargarLocales = async (): Promise<Local[]> => {
  const { data, error } = await supabase
    .from('locales')
    .select('*')
    .eq('activo', true)
    .order('codigo_local');
  
  if (error) throw error;
  locales = data || [];
  return locales;
};