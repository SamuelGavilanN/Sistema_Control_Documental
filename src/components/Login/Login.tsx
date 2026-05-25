import React, { useState, useEffect } from 'react';
import { auth } from '../../lib/auth';
import logoPath from '../../assets/fashions-park-logo2.png';
import backlogin0 from '../../assets/Carrusel/Backlogin.jpeg';
import backlogin1 from '../../assets/Carrusel/Backlogin1.jpeg';
import backlogin2 from '../../assets/Carrusel/Backlogin2.jpeg';
import backlogin3 from '../../assets/Carrusel/Backlogin3.jpeg';
import './Login.css';

const imagenesCarrusel = [
  backlogin0,
  backlogin1,
  backlogin2,
  backlogin3,
];

interface LoginProps {
  onLogin: (usuario: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [imagenActual, setImagenActual] = useState(0);
  const [transicion, setTransicion] = useState(false);

  useEffect(() => {
    if (imagenesCarrusel.length <= 1) return;
    const intervalo = setInterval(() => {
      setTransicion(true);
      setTimeout(() => {
        setImagenActual((prev) => (prev + 1) % imagenesCarrusel.length);
        setTransicion(false);
      }, 500);
    }, 5000);
    return () => clearInterval(intervalo);
  }, []);

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
    <div className={`login-container ${transicion ? 'fade-out' : 'fade-in'}`} style={{ backgroundImage: `url(${imagenesCarrusel[imagenActual]})` }}>
      <div className="login-card">
        <div className="login-logo-area"><img src={logoPath} alt="FASHIONSPARK" className="login-logo-img" /></div>
        <div className="login-subtitle"><p>Sistema de Gestion · Portico</p></div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Usuario</label>
            <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Ingresa tu usuario" autoFocus required />
          </div>
          <div className="login-field">
            <label>Contraseña</label>
            <div className="login-input-wrapper">
              <input type={mostrarPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingresa tu contraseña" required />
              <button type="button" className="login-toggle-password" onClick={() => setMostrarPassword(!mostrarPassword)}>
                {mostrarPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={cargando}>{cargando ? 'Ingresando...' : 'Iniciar Sesion'}</button>
        </form>
        <div className="login-footer"><p>© 2026 Fashions Park</p></div>
      </div>
    </div>
  );
};

export default Login;
