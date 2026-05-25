import React, { useState, useEffect } from 'react';
import { auth } from '../../lib/auth';
import logoPath from '../../assets/fashions-park-logo2.png';
import docxentraLogo from '../../assets/Carrusel/docxentra-logo.png';
import backlogin0 from '../../assets/Carrusel/Backlogin.jpeg';
import backlogin1 from '../../assets/Carrusel/Backlogin1.jpeg';
import backlogin2 from '../../assets/Carrusel/Backlogin2.jpeg';
import backlogin3 from '../../assets/Carrusel/Backlogin3.jpeg';
import './Login.css';

const imagenesCarrusel = [
  backlogin0, backlogin1, backlogin2, backlogin3,
];

interface LoginProps { onLogin: (usuario: any) => void; }

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
    e.preventDefault(); setError(''); setCargando(true);
    try { const userData = await auth.login(usuario, password); onLogin(userData); }
    catch (err: any) { setError(err.message); }
    finally { setCargando(false); }
  };

  return (
    <div className={`login-container ${transicion ? 'fade-out' : 'fade-in'}`} style={{ backgroundImage: `url(${imagenesCarrusel[imagenActual]})` }}>
      <div className="login-card">
        <div className="login-logo-area">
          <img src={logoPath} alt="FASHIONSPARK" className="login-logo-img" />
        </div>
        <div className="login-subtitle">
          <p>Sistema de Gestion Documental</p>
        </div>
        <div className="login-powered">
          <span>Powered by</span>
          <img src={docxentraLogo} alt="Docxentra" className="login-docxentra-logo" />
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Usuario</label>
            <div className="login-input-wrapper">
              <svg className="login-input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="6" r="3.5" stroke="#94a3b8" strokeWidth="1.5"/>
                <path d="M2 16C2 12.6863 5.13401 10 9 10C12.866 10 16 12.6863 16 16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Ingresa tu usuario" autoFocus required />
            </div>
          </div>
          <div className="login-field">
            <label>Contraseña</label>
            <div className="login-input-wrapper">
              <svg className="login-input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="3" y="7" width="12" height="9" rx="1.5" stroke="#94a3b8" strokeWidth="1.5"/>
                <path d="M6 7V5C6 3.34315 7.34315 2 9 2C10.6569 2 12 3.34315 12 5V7" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="9" cy="11.5" r="0.8" fill="#94a3b8"/>
              </svg>
              <input type={mostrarPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingresa tu contraseña" required />
              <button type="button" className="login-toggle-password" onClick={() => setMostrarPassword(!mostrarPassword)}>
                {mostrarPassword ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 5C5.5 5 2.5 9 2.5 9C2.5 9 5.5 13 9 13C12.5 13 15.5 9 15.5 9C15.5 9 12.5 5 9 5Z" stroke="#94a3b8" strokeWidth="1.5"/><circle cx="9" cy="9" r="2" stroke="#94a3b8" strokeWidth="1.5"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 5C5.5 5 2.5 9 2.5 9C2.5 9 5.5 13 9 13C12.5 13 15.5 9 15.5 9C15.5 9 12.5 5 9 5Z" stroke="#94a3b8" strokeWidth="1.5"/><line x1="2" y1="2" x2="16" y2="16" stroke="#94a3b8" strokeWidth="1.5"/></svg>
                )}
              </button>
            </div>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={cargando}>{cargando ? 'Ingresando...' : 'Iniciar Sesion'}</button>
        </form>
        <div className="login-footer"><p>© 2026 Docxentra · Control Documental Inteligente</p></div>
      </div>
    </div>
  );
};

export default Login;
