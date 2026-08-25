// src/lib/api.ts

import { cache } from './cache';
import { supabase } from './supabase';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const API_KEY = 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G';
const HEADERS = {
  'apikey': API_KEY,
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

const TTL_LIST = 60000;      // 1 minuto
const TTL_MASTER = 300000;   // 5 minutos
const TTL_SHORT = 10000;     // 10 segundos

async function fetchWithCache<T>(url: string, options?: RequestInit, ttl: number = TTL_LIST, cacheKey?: string): Promise<T> {
  const key = cacheKey || url;
  const cached = cache.get<T>(key);
  if (cached) return cached;

  const response = await fetch(url, { ...options, headers: { ...HEADERS, ...options?.headers } });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  cache.set(key, data, ttl);
  return data;
}

// === Usuarios ===
export async function getUsuarios() {
  const url = `${API_URL}/usuarios?select=id,nombre,apellido,rol&activo=eq.true`;
  return fetchWithCache<any[]>(url, undefined, TTL_MASTER, 'usuarios_all');
}

// === Locales ===
export async function getLocales() {
  const url = `${API_URL}/locales?select=*&activo=eq.true&order=codigo_local.asc`;
  return fetchWithCache<any[]>(url, undefined, TTL_MASTER, 'locales_all');
}

// === Lote activo ===
export async function getLoteActivo() {
  const url = `${API_URL}/ed04_lotes?select=*&activo=eq.true&order=creado_en.desc&limit=1`;
  const data = await fetchWithCache<any[]>(url, undefined, TTL_SHORT, 'lote_activo');
  return data && data.length > 0 ? data[0] : null;
}

// === Registros ED01 ===
export async function getRegistrosED01(ordenColumna: string = 'creado_en', ordenDireccion: 'asc' | 'desc' = 'desc') {
  const { data, error } = await supabase
    .from('ed01_empaques')
    .select('*')
    .order(ordenColumna, { ascending: ordenDireccion === 'asc' })
    .limit(10000);
  if (error) throw error;
  return data || [];
}

// === Transportes SD01 ===
export async function getTransportesSD01() {
  const url = `
    ${API_URL}/sd01_documentos?
    select=*,
      conductor:conductor_id(*),
      patente_principal:patente_principal_id(*),
      patente_adicional:patente_adicional_id(*),
      locales:sd01_documento_locales(*)
    &order=creado_en.desc
  `.replace(/\s+/g, '');
  return fetchWithCache<any[]>(url, undefined, 15000, 'transportes_sd01');
}

export async function getTransportesPendientesSinAsignar() {
  const url = `
    ${API_URL}/sd01_documentos?
    select=*,
      conductor:conductor_id(*),
      patente_principal:patente_principal_id(*),
      patente_adicional:patente_adicional_id(*),
      locales:sd01_documento_locales(*)
    &estado=eq.Pendiente&asignado_a=is.null&order=creado_en.desc
  `.replace(/\s+/g, '');
  return fetchWithCache<any[]>(url, undefined, 15000, 'transportes_pendientes_sin_asignar');
}

// === Notificaciones ===
export async function getNotificaciones(usuarioId: string) {
  const url = `
    ${API_URL}/ticket_notificaciones?
    select=*,
      ticket:ticket_id(*)
    &usuario_id=eq.${usuarioId}&visto=eq.false&order=creado_en.desc&limit=20
  `.replace(/\s+/g, '');
  return fetchWithCache<any[]>(url, undefined, TTL_SHORT, `notificaciones_${usuarioId}`);
}

// === Permisos (exportada correctamente) ===
export async function getPermisos(usuarioId: string) {
  const url = `${API_URL}/usuario_permisos?select=transaccion_id&usuario_id=eq.${usuarioId}&activo=eq.true`;
  const data = await fetchWithCache<any[]>(url, undefined, TTL_LIST, `permisos_${usuarioId}`);
  return data.map(p => p.transaccion_id);
}

// === Favoritos (exportada correctamente) ===
export async function getFavoritos(usuarioId: string) {
  const url = `${API_URL}/usuario_favoritos?select=transaccion_id&usuario_id=eq.${usuarioId}`;
  const data = await fetchWithCache<any[]>(url, undefined, TTL_LIST, `favoritos_${usuarioId}`);
  return data.map(f => f.transaccion_id);
}

// === Conductores y Patentes (opcionales) ===
export async function getConductores(activo: boolean = true) {
  const filter = activo ? '&activo=eq.true' : '';
  const url = `${API_URL}/conductores?select=*&order=nombre.asc${filter}`;
  return fetchWithCache<any[]>(url, undefined, TTL_MASTER, 'conductores_all');
}

export async function getConductorById(id: string) {
  const url = `${API_URL}/conductores?select=*&id=eq.${id}`;
  const data = await fetchWithCache<any[]>(url, undefined, TTL_MASTER, `conductor_${id}`);
  return data?.[0] || null;
}

export async function getPatentes(activo: boolean = true) {
  const filter = activo ? '&activo=eq.true' : '';
  const url = `${API_URL}/patentes?select=*&order=numero_patente.asc${filter}`;
  return fetchWithCache<any[]>(url, undefined, TTL_MASTER, 'patentes_all');
}

export async function getPatenteById(id: string) {
  const url = `${API_URL}/patentes?select=*&id=eq.${id}`;
  const data = await fetchWithCache<any[]>(url, undefined, TTL_MASTER, `patente_${id}`);
  return data?.[0] || null;
}

// === Invalidación de caché ===
export function invalidarTransportes() {
  cache.invalidatePrefix('transportes_sd01');
  cache.invalidatePrefix('transportes_pendientes_sin_asignar');
}

export function invalidarRegistrosED01() {
  cache.invalidatePrefix('registros_ed01');
}

export function invalidarMaestros() {
  cache.invalidate('usuarios_all');
  cache.invalidate('locales_all');
  cache.invalidate('lote_activo');
}
