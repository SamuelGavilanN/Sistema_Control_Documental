// src/lib/api.ts

import { cache } from './cache';
import { auth } from './auth';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const API_KEY = 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G';
const HEADERS = {
  'apikey': API_KEY,
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

// TTL en milisegundos (60 segundos para listas, 5 minutos para maestros)
const TTL_LIST = 60000;
const TTL_MASTER = 300000;

// Función genérica para fetch con caché
async function fetchWithCache<T>(
  url: string,
  options?: RequestInit,
  ttl: number = TTL_LIST,
  cacheKey?: string
): Promise<T> {
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

// === Conductores ===
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

// === Patentes ===
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

// === Locales (maestro) ===
export async function getLocales(activo: boolean = true) {
  const filter = activo ? '&activo=eq.true' : '';
  const url = `${API_URL}/locales?select=*&order=codigo_local.asc${filter}`;
  return fetchWithCache<any[]>(url, undefined, TTL_MASTER, 'locales_all');
}

// === Usuarios (para nombres) ===
export async function getUsuarios() {
  const url = `${API_URL}/usuarios?select=id,nombre,apellido&activo=eq.true`;
  return fetchWithCache<any[]>(url, undefined, TTL_MASTER, 'usuarios_all');
}

// === Transportes SD01 con todos los detalles en una sola consulta ===
export async function getTransportesSD01() {
  // Consulta con joins anidados usando la sintaxis de Supabase REST
  // Incluye conductor, patente_principal, patente_adicional y locales
  const url = `
    ${API_URL}/sd01_documentos?
    select=*,
      conductor:conductor_id(*),
      patente_principal:patente_principal_id(*),
      patente_adicional:patente_adicional_id(*),
      locales:sd01_documento_locales(*)
    &order=creado_en.desc
  `.replace(/\s+/g, '');
  
  // No cacheamos esta lista porque cambia frecuentemente, pero usamos un TTL corto
  return fetchWithCache<any[]>(url, undefined, 15000, 'transportes_sd01');
}

// === Transportes pendientes sin asignar (para móvil) ===
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

// === Notificaciones (con usuario) ===
export async function getNotificaciones(usuarioId: string) {
  const url = `
    ${API_URL}/ticket_notificaciones?
    select=*,
      ticket:ticket_id(*)
    &usuario_id=eq.${usuarioId}&visto=eq.false&order=creado_en.desc&limit=20
  `.replace(/\s+/g, '');
  return fetchWithCache<any[]>(url, undefined, 10000, `notificaciones_${usuarioId}`);
}

// === Funciones para invalidar caché tras mutaciones ===
export function invalidarTransportes() {
  cache.invalidatePrefix('transportes_sd01');
  cache.invalidatePrefix('transportes_pendientes_sin_asignar');
}

export function invalidarMaestros() {
  cache.invalidate('conductores_all');
  cache.invalidate('patentes_all');
  cache.invalidate('locales_all');
  cache.invalidatePrefix('conductor_');
  cache.invalidatePrefix('patente_');
}
