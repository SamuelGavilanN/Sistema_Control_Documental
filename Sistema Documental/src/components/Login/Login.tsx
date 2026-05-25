import React, { useState } from 'react';
import { auth } from '../../lib/auth';
import logoPath from '../../assets/fashions-park-logo2.png';
import './Login.css';

interface LoginProps {
  onLogin: (usuario: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const userData = await auth.login(usuario, password);
      onLogin(userData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo-area"><img src={logoPath} alt="FASHIONSPARK" className="login-logo-img" /></div>
        <div className="login-subtitle"><p>Sistema de Gestión · Portico</p></div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Usuario</label>
            <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Ingresa tu usuario" autoFocus required />
          </div>
          <div className="login-field">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingresa tu contraseña" required />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={cargando}>{cargando ? 'Ingresando...' : 'Iniciar Sesión'}</button>
        </form>
        <div className="login-footer"><p>© 2026 Fashions Park</p></div>
      </div>
    </div>
  );
};

export default Login;
