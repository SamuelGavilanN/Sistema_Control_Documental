// src/lib/generarIdTransporte.ts

import { supabase } from './supabase';

export async function generarIdTransporte(fechaProgramacion: string): Promise<string> {
  // fechaProgramacion debe venir en formato YYYY-MM-DD
  const partes = fechaProgramacion.split('-');
  if (partes.length !== 3) throw new Error('Fecha inválida');

  const dia = partes[2];
  const mes = partes[1];
  const anio = partes[0];

  // Prefijo: SD + DDMMYYYY
  const prefijo = `SD${dia}${mes}${anio}`;

  // Consultar el último ID con ese prefijo
  const { data, error } = await supabase
    .from('sd01_documentos')
    .select('id_documento')
    .like('id_documento', `${prefijo}%`)
    .order('id_documento', { ascending: false })
    .limit(1);

  if (error) throw error;

  let correlativo = 1;
  if (data && data.length > 0) {
    const ultimoId = data[0].id_documento;
    const ultimoCorrelativo = parseInt(ultimoId.slice(prefijo.length), 10);
    if (!isNaN(ultimoCorrelativo)) {
      correlativo = ultimoCorrelativo + 1;
    }
  }

  const correlativoStr = correlativo.toString().padStart(6, '0');
  return `${prefijo}${correlativoStr}`;
}
