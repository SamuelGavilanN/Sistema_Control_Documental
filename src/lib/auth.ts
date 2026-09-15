// src/lib/auth.ts
//
// Autenticación basada en Supabase Auth.
// - login: supabase.auth.signInWithPassword con email sintético
// - Sesión manejada por Supabase (JWT)
// - El registro en public.usuarios se consulta por auth_user_id
//
// API mantenida compatible con el código existente:
//   auth.login(usuario, password)  → Promise<Usuario>
//   auth.logout()                  → Promise<void>
//   auth.getUsuario()              → Usuario | null
//   auth.isAuthenticated()         → boolean

import { supabase } from './supabase';

const EMAIL_DOMAIN = 'docxentra.internal';

export interface Usuario {
  id: string;
  auth_user_id: string | null;
  nombre: string;
  apellido: string;
  usuario: string;
  rol: string;
  activo: boolean;
  creado_en?: string;
}

function toEmail(usuario: string): string {
  return `${usuario.toLowerCase().trim()}@${EMAIL_DOMAIN}`;
}

function traducirError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Usuario o contraseña incorrectos';
  }
  if (message.includes('Email not confirmed')) {
    return 'Usuario no confirmado. Contacte a soporte.';
  }
  if (message.includes('User not found')) {
    return 'Usuario no encontrado';
  }
  if (message.includes('rate limit')) {
    return 'Demasiados intentos. Espere un momento.';
  }
  return message;
}

export const auth = {
  async login(usuario: string, password: string): Promise<Usuario> {
    // 1. Autenticar con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: toEmail(usuario),
      password,
    });

    if (authError) {
      throw new Error(traducirError(authError.message));
    }
    if (!authData.user) {
      throw new Error('Error desconocido al iniciar sesión');
    }

    // 2. Obtener el registro completo de public.usuarios
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (userError || !userData) {
      // Fallback: si no hay registro espejo, cerrar sesión y avisar
      await supabase.auth.signOut();
      throw new Error('Usuario no configurado. Contacte a soporte.');
    }

    if (!userData.activo) {
      await supabase.auth.signOut();
      throw new Error('Usuario desactivado');
    }

    // 3. Guardar en localStorage (compatibilidad con código existente)
    localStorage.setItem('usuario', JSON.stringify(userData));

    return userData as Usuario;
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    localStorage.removeItem('usuario');
  },

  getUsuario(): Usuario | null {
    const data = localStorage.getItem('usuario');
    if (!data) return null;
    try {
      return JSON.parse(data) as Usuario;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getUsuario();
  },

  // Nuevas funciones para el resto del código
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};