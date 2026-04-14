import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services/authService.js';
import '../components/registration/registration.css';

const INITIAL = {
  name: '', surname: '', username: '', dateOfBirth: '',
  email: '', phone: '', password: '', confirmPassword: '',
};

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [fields, setFields] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setFields(f => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!fields.name) e.name = 'Introduzca su nombre.';
    if (!fields.surname) e.surname = 'Introduzca su apellido.';
    if (!fields.username) {
      e.username = 'Introduzca un nombre de perfil.';
    } else if (!/^[a-z0-9_\.]{3,20}$/.test(fields.username.toLowerCase())) {
      e.username = 'Solo letras, números, _ y . (3-20 caracteres).';
    }
    if (!fields.dateOfBirth) e.dateOfBirth = 'Introduzca su fecha de nacimiento.';
    if (!fields.email) {
      e.email = 'Introduzca su correo.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      e.email = 'Introduzca un correo válido.';
    }
    if (!fields.phone) {
      e.phone = 'Introduzca su teléfono.';
    } else if (!/^[0-9]{3}-[0-9]{3}-[0-9]{3}$/.test(fields.phone)) {
      e.phone = 'Formato: 123-456-789.';
    }
    if (!fields.password) {
      e.password = 'Introduzca una contraseña.';
    } else if (fields.password.length < 8) {
      e.password = 'Mínimo 8 caracteres.';
    } else if (!/[A-Z]/.test(fields.password)) {
      e.password = 'Falta una mayúscula.';
    } else if (!/[a-z]/.test(fields.password)) {
      e.password = 'Falta una minúscula.';
    } else if (!/[0-9]/.test(fields.password)) {
      e.password = 'Falta un número.';
    }
    if (fields.password !== fields.confirmPassword) {
      e.confirmPassword = 'Las contraseñas no coinciden.';
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
      await registerUser(fields);
      navigate('/login');
    } catch (err) {
      let msg = 'Error al crear la cuenta.';
      if (err.code === 'auth/email-already-in-use') msg = 'Este correo ya está registrado.';
      if (err.message === 'username-already-taken') msg = 'Este nombre de perfil ya está en uso.';
      if (err.message === 'username-required') msg = 'El nombre de perfil es obligatorio.';
      if (err.message === 'username-invalid') msg = 'Nombre de perfil inválido (3-20 caracteres).';
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="content">
      <Link to="/"><img src="/images/flecha 1.svg" alt="Volver" /></Link>
      <form id="registroForm" onSubmit={handleSubmit} noValidate>
        <img src="/images/logo_Uni2_Go.svg" alt="Logo Uni2 Go" />
        <h1>Regístrate</h1>

        <div>
          <label>Nombre de usuario</label><br />
          <input type="text" name="name" value={fields.name} onChange={set('name')} />
          <p className={`field-error${errors.name ? ' visible' : ''}`}>{errors.name || ''}</p>
        </div>

        <div>
          <label>Nombre de perfil (@username)</label><br />
          <input type="text" name="username" placeholder="ej: maria_uni" value={fields.username} onChange={set('username')} />
          <p className={`field-error${errors.username ? ' visible' : ''}`}>{errors.username || ''}</p>
        </div>

        <div>
          <label>Apellido de usuario</label><br />
          <input type="text" name="surname" value={fields.surname} onChange={set('surname')} />
          <p className={`field-error${errors.surname ? ' visible' : ''}`}>{errors.surname || ''}</p>
        </div>

        <div>
          <label>Fecha de nacimiento</label><br />
          <input type="date" name="dateOfBirth" value={fields.dateOfBirth} onChange={set('dateOfBirth')} />
          <p className={`field-error${errors.dateOfBirth ? ' visible' : ''}`}>{errors.dateOfBirth || ''}</p>
        </div>

        <div>
          <label>Correo Electrónico</label><br />
          <input type="email" name="email" placeholder="Email" value={fields.email} onChange={set('email')} />
          <p className={`field-error${errors.email ? ' visible' : ''}`}>{errors.email || ''}</p>
        </div>

        <div>
          <label>Teléfono</label><br />
          <input type="tel" name="phone" placeholder="123-456-789" value={fields.phone} onChange={set('phone')} />
          <p className={`field-error${errors.phone ? ' visible' : ''}`}>{errors.phone || ''}</p>
        </div>

        <div>
          <label>Contraseña</label><br />
          <input type="password" name="contrasena" value={fields.password} onChange={set('password')} />
          <p className={`field-error${errors.password ? ' visible' : ''}`}>{errors.password || ''}</p>
        </div>

        <div>
          <label>Confirmar contraseña</label><br />
          <input type="password" name="confirmPassword" value={fields.confirmPassword} onChange={set('confirmPassword')} />
          <p className={`field-error${errors.confirmPassword ? ' visible' : ''}`}>{errors.confirmPassword || ''}</p>
        </div>

        <input type="submit" value={loading ? 'Registrando...' : 'Crear cuenta'} disabled={loading} />

        <div className="error-container">
          <p className={`error-text${globalError ? ' visible' : ''}`}>{globalError}</p>
        </div>
      </form>
    </div>
  );
}
