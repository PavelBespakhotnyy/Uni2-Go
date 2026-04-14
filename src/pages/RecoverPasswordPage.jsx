import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/firebase.js';
import '../components/reset_password/reset_password.css';

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ text: '', ok: true });
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setMessage({ text: 'Introduce tu correo electrónico.', ok: false });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage({ text: 'Correo enviado. Revisa tu bandeja de entrada.', ok: true });
      setEmail('');
    } catch (err) {
      const msgs = {
        'auth/user-not-found': 'Usuario no encontrado.',
        'auth/invalid-email': 'Correo inválido.',
        'auth/too-many-requests': 'Demasiados intentos. Inténtalo más tarde.',
      };
      setMessage({ text: msgs[err.code] || 'Error al enviar el correo.', ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="content" className="auth-page">
      <Link to="/login" className="back-link">
        <img src="/images/flecha 1.svg" alt="Volver" />
      </Link>

      <div className="auth-container">
        <img src="/images/logo_Uni2_Go.svg" className="main-logo" alt="Logo Uni2 Go" />

        <h1 className="auth-title">Recuperar contraseña</h1>

        <div className="auth-body">
          <p className="auth-description">
            Introduzca su correo electrónico. Le enviaremos un enlace para que pueda renovar su contraseña. Gracias
          </p>

          <div className="input-group">
            <label className="input-label">Correo electronico</label>
            <input
              type="email"
              id="email"
              className="input-field"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReset()}
            />
          </div>
        </div>

        <button className="btn-primary" onClick={handleReset} disabled={loading}>
          {loading ? 'Enviando...' : 'Recuperar'}
        </button>

        {message.text && (
          <p id="message" style={{ color: message.ok ? 'green' : 'red', marginTop: '1rem' }}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
