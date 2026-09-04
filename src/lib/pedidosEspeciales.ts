// src/lib/pedidosEspeciales.ts
import { supabase } from './supabase';

export async function registrarPedidoEspecial(datos: {
  tipo_pedido: string;
  numero_tarea: string;
  codigo_local?: string;
  nombre_local?: string;
  fecha_pedido?: string;
  creado_por?: string;
}) {
  const { data, error } = await supabase
    .from('pedidos_especiales')
    .insert([{
      tipo_pedido: datos.tipo_pedido,
      numero_tarea: datos.numero_tarea,
      codigo_local: datos.codigo_local || null,
      nombre_local: datos.nombre_local || null,
      fecha_pedido: datos.fecha_pedido || new Date().toISOString().slice(0, 10),
      creado_por: datos.creado_por || null,
      estado: 'Pendiente'
    }]);
  if (error) throw error;
  return data;
}

export async function marcarEtiquetaGenerada(numero_tarea: string) {
  const { error } = await supabase
    .from('pedidos_especiales')
    .update({ 
      estado: 'Listo para cargar', 
      etiqueta_generada: true, 
      actualizado_en: new Date().toISOString() 
    })
    .eq('numero_tarea', numero_tarea);
  if (error) throw error;
}
