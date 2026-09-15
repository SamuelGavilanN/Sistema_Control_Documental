// src/lib/apiClient.ts
//
// Wrapper de fetch que inyecta automáticamente el token de la sesión actual.
// Reemplaza las llamadas con credenciales hardcodeadas.
//
// Uso:
//   import { apiFetch } from '../lib/apiClient';
//   const data = await apiFetch('/ed01_empaques?select=*');

import { supabase } from './supabase';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL) {
  console.warn('[apiClient] Falta REACT_APP_SUPABASE_URL en .env');
}
if (!SUPABASE_ANON_KEY) {
  console.warn('[apiClient] Falta REACT_APP_SUPABASE_ANON_KEY en .env');
}

const API_URL = `${SUPABASE_URL}/rest/v1`;

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SUPABASE_ANON_KEY;

  const url = path.startsWith('http') ? path : `${API_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`apiFetch ${response.status}: ${errorText}`);
  }

  // Si la respuesta es 204 (No Content) o vacía, retornar null
  if (response.status === 204) return null as unknown as T;

  const text = await response.text();
  if (!text) return null as unknown as T;

  return JSON.parse(text) as T;
}

// Helper para endpoints con la URL completa (si algún archivo lo necesita)
export function getApiUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

// Exponer las variables por si algún módulo las necesita
export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  apiUrl: API_URL,
};