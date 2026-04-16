import { useState, useEffect } from 'react';
import { signOut, updatePassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase.js';
import { getUserProfile, updateUserProfile } from '../services/userService.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { countries } from '../utils/countries.js';
import Layout from '../components/Layout.jsx';
import '../components/user/user.css';
import '../components/user/panel-lateral.css';

function getInitials(name, surname) {
  const n = (name || '').trim();
  const s = (surname || '').trim();
  if (n && s) return (n[0] + s[0]).toUpperCase();
  if (n) return n[0].toUpperCase();
  return '?';
}

export default function UserPage() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) refreshProfile();
  }, [user]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ text: '', ok: true });

  const [fields, setFields] = useState({
    name: '', surname: '', username: '', email: '', phone: '', countryCode: '', countryISO: '', password: '',
  });

  // Load data into panel when opened
  const openPanel = async () => {
    if (!user) return;
    try {
      const data = await getUserProfile(user.uid);
      setFields({
        name: data?.name || '',
        surname: data?.surname || '',
        username: data?.username || '',
        email: user.email || data?.email || '',
        phone: data?.phone || '',
        countryCode: data?.countryCode || '+34',
        countryISO: data?.countryISO || 'ES',
        password: '',
      });
    } catch {
      // use profile fallback
      setFields(f => ({
        ...f,
        name: profile?.name || '',
        surname: profile?.surname || '',
        username: profile?.username || '',
        email: user.email || '',
        phone: profile?.phone || '',
        countryCode: profile?.countryCode || '+34',
        countryISO: profile?.countryISO || 'ES',
        password: '',
      }));
    }
    setPanelOpen(true);
  };

  const handleCountryChange = (e) => {
    const iso = e.target.value;
    const country = countries.find(c => c.code === iso);
    if (country) {
      setFields(f => ({ ...f, countryISO: iso, countryCode: country.dialCode }));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveMsg({ text: '', ok: true });
    try {
      await updateUserProfile(user.uid, {
        name: fields.name.trim(),
        surname: fields.surname.trim(),
        phone: fields.phone.trim(),
        countryCode: fields.countryCode,
        countryISO: fields.countryISO,
      });

      if (fields.password) {
        if (fields.password.length < 6) {
          setSaveMsg({ text: 'La contraseña debe tener al menos 6 caracteres.', ok: false });
          setSaving(false);
          return;
        }
        await updatePassword(user, fields.password);
        setFields(f => ({ ...f, password: '' }));
      }

      await refreshProfile();
      setSaveMsg({ text: 'Cambios guardados correctamente.', ok: true });
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        setSaveMsg({ text: 'Por seguridad, cierra sesión y vuelve a iniciarla para cambiar email o contraseña.', ok: false });
      } else {
        setSaveMsg({ text: 'Error al guardar. Intenta de nuevo.', ok: false });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const initials = getInitials(profile?.name, profile?.surname);

  return (
    <Layout contentClass="user-wrapper">
      {/* Panel lateral */}
      <div className={`info-panel${panelOpen ? ' active' : ''}`} id="info-panel">
        <div className="info-panel-header">
          <span className="close-btn" onClick={() => { setPanelOpen(false); setSaveMsg({ text: '', ok: true }); }}>×</span>
          <h2>Información personal</h2>
        </div>

        <div className="info-panel-content">
          {[
            { id: 'name',     label: 'Nombre',   type: 'text',  readOnly: false },
            { id: 'surname',  label: 'Apellido', type: 'text',  readOnly: false },
            { id: 'username', label: 'Usuario',  type: 'text',  readOnly: true  },
            { id: 'email',    label: 'Email',    type: 'email', readOnly: true  },
            { id: 'phone',    label: 'Teléfono', type: 'text',  readOnly: false },
          ].map(({ id, label, type, readOnly }) => (
            <div className="field" key={id}>
              <label>{label}</label>
              <div className="field-box">
                {id === 'phone' && (
                  <div style={{ position: 'relative', width: '80px', flexShrink: 0 }}>
                    <select
                      value={fields.countryISO}
                      onChange={handleCountryChange}
                      style={{ width: '100%', appearance: 'none', border: 'none', background: 'transparent', padding: '12px 5px', textAlign: 'left', color: 'transparent' }}
                    >
                      {countries.map(c => (
                        <option key={`${c.code}-${c.dialCode}`} value={c.code} style={{ color: '#333' }}>
                          {c.dialCode} {c.native}
                        </option>
                      ))}
                    </select>
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      pointerEvents: 'none',
                      background: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      paddingLeft: '12px',
                      fontSize: '14px',
                      color: '#333',
                      borderRight: '1px solid #cccccc'
                    }}>
                      {fields.countryCode}
                    </div>
                  </div>
                )}
                <input
                  type={type}
                  value={fields[id]}
                  onChange={(e) => !readOnly && setFields(f => ({ ...f, [id]: e.target.value }))}
                  readOnly={readOnly}
                  className={readOnly ? 'readonly-field' : ''}
                />
                {!readOnly && <i className="bx bx-pencil" />}
              </div>
            </div>
          ))}

          <div className="field">
            <label>Nueva contraseña (dejar vacío para no cambiar)</label>
            <div className="field-box">
              <input
                type={showPassword ? 'text' : 'password'}
                value={fields.password}
                onChange={(e) => setFields(f => ({ ...f, password: e.target.value }))}
                placeholder="Nueva contraseña"
              />
              <i
                className={`bx ${showPassword ? 'bx-show' : 'bx-hide'}`}
                onClick={() => setShowPassword(v => !v)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        <div className="info-panel-footer">
          {saveMsg.text && (
            <span className="panel-save-msg" style={{ color: saveMsg.ok ? '#27ae60' : '#c0392b' }}>
              {saveMsg.text}
            </span>
          )}
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="user-profile">
        <div className="user-avatar-initials">{initials}</div>
      </div>

      <div className="user-content">
        <div>
          <h1>Nombre</h1>
          <h1 id="user-name"><span className="field-text">{profile?.name || ''}</span></h1>
        </div>
        <div>
          <h1>Apellido</h1>
          <h1 id="user-lastname"><span className="field-text">{profile?.surname || ''}</span></h1>
        </div>
      </div>

      <div className="friend-code-container">
        <p className="friend-code-label">Tu nombre de perfil</p>
        <div className="friend-code-box">
          <span id="user-username">{profile?.username ? `@${profile.username}` : '—'}</span>
        </div>
      </div>

      <div className="info-container">
        <div className="info-item">
          <button type="button" className="btn-primary" onClick={openPanel}>
            Información personal
          </button>
        </div>
      </div>

      <div className="button-sign-out">
        <button type="button" className="btn-tertiary" onClick={handleLogout}>
          <img className="icon-logout" src="/images/cerrar-sesion.png" alt="Cerrar sesión" />
          Cerrar Sesión
        </button>
      </div>
    </Layout>
  );
}
