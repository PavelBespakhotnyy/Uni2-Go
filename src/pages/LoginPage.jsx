import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/authService.js';
import '../components/login/login.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [fields, setFields] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const e = {};
    if (!fields.email) {
      e.email = 'Por favor, introduzca su correo.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      e.email = 'Por favor, introduzca un correo válido.';
    }
    if (!fields.password) {
      e.password = 'Por favor, introduzca su contraseña.';
    } else if (fields.password.length < 8) {
      e.password = 'La contraseña debe tener al menos 8 caracteres.';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await loginUser(fields.email, fields.password);
      navigate('/calendar');
    } catch (err) {
      let msg = 'Error al iniciar sesión.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.message?.includes('invalid-credential')) {
        msg = 'Correo o contraseña incorrectos.';
      }
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setFields(f => ({ ...f, [field]: e.target.value }));

  return (
    <div id="content">
      <Link to="/"><img src="/images/flecha 1.svg" alt="Volver" /></Link>
      <form id="loginForm" onSubmit={handleSubmit} noValidate>
        <Link to="/"><img src="/images/logo_Uni2_Go.svg" alt="Uni2Go" /></Link>
        <h1>Inicia Sesión</h1>

        <div>
          <label>Correo electronico</label><br />
          <input 
            type="email" 
            name="email" 
            placeholder="Email" 
            value={fields.email} 
            onChange={set('email')} 
            autoComplete="username"
          />
          <p className={`field-error${errors.email ? ' visible' : ''}`}>{errors.email || ''}</p>
        </div>

        <div>
          <label>Contraseña</label><br />
          <div className="password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={fields.password}
              onChange={set('password')}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
            >
              <i className={`bx bx-sm ${showPassword ? 'bx-hide' : 'bx-show'}`} />
            </button>
          </div>
          <p className={`field-error${errors.password ? ' visible' : ''}`}>{errors.password || ''}</p>
        </div>

        <Link to="/recover-password">Has olvidado tu contraseña?</Link>
        <input type="submit" value={loading ? 'Cargando...' : 'Iniciar Sesión'} disabled={loading} />

        <div className="error-container">
          <p className={`error-text${globalError ? ' visible' : ''}`}>{globalError}</p>
        </div>
      </form>
    </div>
  );
}
