// src/lib/api.ts
//
// Capa de acceso a datos con cache en memoria.
// Usa apiFetch (que inyecta el token de Supabase Auth).
// Migrado a Supabase Auth en Fase 3.
import { cache } from './cache';
import { apiFetch } from './apiClient';
import { supabase } from './supabase';

const TTL_LIST = 60000;      // 1 minuto
const TTL_MASTER = 300000;   // 5 minutos
const TTL_SHORT = 10000;     // 10 segundos

async function fetchWithCache<T>(
  path: string,
  ttl: number = TTL_LIST,
  cacheKey?: string
): Promise<T> {
  const key = cacheKey || path;
  const cached = cache.get<T>(key);
  if (cached) return cached;

  const data = await apiFetch<T>(path);
  cache.set(key, data, ttl);
  return data;
}

// === Usuarios ===
export async function getUsuarios() {
  return fetchWithCache<any[]>(
    '/usuarios?select=id,nombre,apellido,rol&activo=eq.true',
    TTL_MASTER,
    'usuarios_all'
  );
}

// === Locales ===
export async function getLocales() {
  return fetchWithCache<any[]>(
    '/locales?select=*&activo=eq.true&order=codigo_local.asc',
    TTL_MASTER,
    'locales_all'
  );
}

// === Lote activo ===
export async function getLoteActivo() {
  const url = '/ed04_lotes?select=*&activo=eq.true&order=creado_en.desc&limit=1';
  const data = await fetchWithCache<any[]>(url, TTL_SHORT, 'lote_activo');
  return data && data.length > 0 ? data[0] : null;
}

// === Registros ED01 ===
// Este usa el SDK de Supabase (ya migrado automáticamente por el nuevo supabase.ts)
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
  const url =
    '/sd01_documentos?' +
    'select=*,' +
    'conductor:conductor_id(*),' +
    'patente_principal:patente_principal_id(*),' +
    'patente_adicional:patente_adicional_id(*),' +
    'locales:sd01_documento_locales(*)' +
    '&order=creado_en.desc';
  return fetchWithCache<any[]>(url, 15000, 'transportes_sd01');
}

export async function getTransportesPendientesSinAsignar() {
  const url =
    '/sd01_documentos?' +
    'select=*,' +
    'conductor:conductor_id(*),' +
    'patente_principal:patente_principal_id(*),' +
    'patente_adicional:patente_adicional_id(*),' +
    'locales:sd01_documento_locales(*)' +
    '&estado=eq.Pendiente' +
    '&asignado_a=is.null' +
    '&order=creado_en.desc';
  return fetchWithCache<any[]>(url, 15000, 'transportes_pendientes_sin_asignar');
}

// === Notificaciones ===
export async function getNotificaciones(usuarioId: string) {
  const url =
    '/ticket_notificaciones?' +
    'select=*,' +
    'ticket:ticket_id(*)' +
    '&usuario_id=eq.' + usuarioId +
    '&visto=eq.false' +
    '&order=creado_en.desc' +
    '&limit=20';
  return fetchWithCache<any[]>(url, TTL_SHORT, `notificaciones_${usuarioId}`);
}

// === Permisos ===
export async function getPermisos(usuarioId: string) {
  const url = '/usuario_permisos?select=transaccion_id&usuario_id=eq.' + usuarioId + '&activo=eq.true';
  const data = await fetchWithCache<any[]>(url, TTL_LIST, `permisos_${usuarioId}`);
  return data.map(p => p.transaccion_id);
}

// === Favoritos ===
export async function getFavoritos(usuarioId: string) {
  const url = '/usuario_favoritos?select=transaccion_id&usuario_id=eq.' + usuarioId;
  const data = await fetchWithCache<any[]>(url, TTL_LIST, `favoritos_${usuarioId}`);
  return data.map(f => f.transaccion_id);
}

// === Conductores y Patentes ===
export async function getConductores(activo: boolean = true) {
  const filter = activo ? '&activo=eq.true' : '';
  const url = '/conductores?select=*&order=nombre.asc' + filter;
  return fetchWithCache<any[]>(url, TTL_MASTER, 'conductores_all');
}

export async function getConductorById(id: string) {
  const url = '/conductores?select=*&id=eq.' + id;
  const data = await fetchWithCache<any[]>(url, TTL_MASTER, `conductor_${id}`);
  return data?.[0] || null;
}

export async function getPatentes(activo: boolean = true) {
  const filter = activo ? '&activo=eq.true' : '';
  const url = '/patentes?select=*&order=numero_patente.asc' + filter;
  return fetchWithCache<any[]>(url, TTL_MASTER, 'patentes_all');
}

export async function getPatenteById(id: string) {
  const url = '/patentes?select=*&id=eq.' + id;
  const data = await fetchWithCache<any[]>(url, TTL_MASTER, `patente_${id}`);
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