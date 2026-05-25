import { supabase } from './supabase';

export const auth = {
  async login(usuario: string, password: string) {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('usuario', usuario);

    const userData = data && data.length > 0 ? data[0] : null;

    if (!userData) throw new Error('Usuario no encontrado');
    if (userData.password !== password) throw new Error('Contraseña incorrecta');

    localStorage.setItem('usuario', JSON.stringify(userData));
    return userData;
  },

  logout() {
    localStorage.removeItem('usuario');
  },

  getUsuario() {
    const data = localStorage.getItem('usuario');
    return data ? JSON.parse(data) : null;
  },

  isAuthenticated() {
    return !!this.getUsuario();
  }
};