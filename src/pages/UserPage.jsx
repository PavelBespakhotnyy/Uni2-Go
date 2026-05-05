import { useState, useEffect } from 'react';
import { signOut, updatePassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase.js';
import { getUserProfile, updateUserProfile, deleteUserAvatar } from '../services/userService.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { countries } from '../utils/countries.js';
import Layout from '../components/Layout.jsx';
import '../components/user/user.css';
import '../components/user/panel-lateral.css';

const PIXABAY_API_KEY = import.meta.env.VITE_PIXABAY_API_KEY || '';

// 20 standard emojis for profile pictures (matching the groups example)
const PROFILE_EMOJIS = ['👤','👨‍💻','👩‍💻','👨‍🎓','👩‍🎓','🦸‍♂️','🦸‍♀️','🕵️‍♂️','🕵️‍♀️','🧙‍♂️','🧙‍♀️','🧛‍♂️','🧛‍♀️','🧚‍♂️','🧚‍♀️','🧜‍♂️','🧜‍♀️','🤖','👽','👾'];

function getInitials(name, surname) {
  const n = (name || '').trim();
  const s = (surname || '').trim();
  if (n && s) return (n[0] + s[0]).toUpperCase();
  if (n) return n[0].toUpperCase();
  return '?';
}

export default function UserPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) refreshProfile();
  }, [user]);

  useEffect(() => {
    setAvatarBroken(false);
  }, [profile?.avatarUrl]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ text: '', ok: true });
  
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [pixabayQuery, setPixabayQuery] = useState('');
  const [pixabayImages, setPixabayImages] = useState([]);
  const [pixabayLoading, setPixabayLoading] = useState(false);

  const [fields, setFields] = useState({
    name: '', surname: '', username: '', email: '', phone: '', countryCode: '', countryISO: '', password: '',
  });

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
    if (fields.phone && !/^[0-9\s]{7,15}$/.test(fields.phone.trim())) {
      setSaveMsg({ text: 'Teléfono inválido (mín. 7 dígitos).', ok: false });
      return;
    }

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
        setSaveMsg({ text: 'Por seguridad, cierra sesión и vuelve a iniciarla para cambiar email o contraseña.', ok: false });
      } else {
        setSaveMsg({ text: 'Error al guardar. Intenta de nuevo.', ok: false });
      }
    } finally {
      setSaving(false);
    }
  };

  const searchPixabay = async () => {
    if (!pixabayQuery.trim()) return;
    if (!PIXABAY_API_KEY) {
      alert("La búsqueda de imágenes no está configurada.");
      return;
    }
    setPixabayLoading(true);
    setPixabayImages([]);
    try {
      const res = await fetch(`https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(pixabayQuery)}&image_type=photo&per_page=12`);
      if (!res.ok) throw new Error(`Error de Pixabay: ${res.status}`);
      const data = await res.json();
      setPixabayImages(data.hits || []);
    } catch (error) {
      console.error("Pixabay search error:", error);
      alert("Error al buscar imágenes: " + error.message);
    } finally {
      setPixabayLoading(false);
    }
  };

  const selectImage = async (url) => {
    if (!user || uploading) return;
    setUploading(true);
    try {
      await updateUserProfile(user.uid, { avatarUrl: url });
      await refreshProfile();
      setPhotoModalOpen(false);
      setSaveMsg({ text: 'Foto actualizada correctamente.', ok: true });
    } catch (error) {
      console.error("Error setting profile photo:", error);
      alert("No se pudo guardar la foto seleccionada: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!user || uploading) return;
    if (!confirm("¿Estás seguro de que quieres eliminar tu foto de perfil?")) return;
    setUploading(true);
    try {
      await deleteUserAvatar(user.uid);
      await refreshProfile();
      setPhotoModalOpen(false);
      setSaveMsg({ text: 'Foto eliminada correctamente.', ok: true });
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Error al eliminar la foto: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const initials = getInitials(profile?.name, profile?.surname);

  const isEmoji = (url) => {
    if (!url) return false;
    return PROFILE_EMOJIS.includes(url);
  };

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
            { id: 'phone',    label: 'Teléfono', type: 'tel',   readOnly: false },
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

      {/* Modal de selección de foto */}
      {photoModalOpen && (
        <div className="modal-overlay" onClick={() => setPhotoModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Elige tu avatar</h3>
              <span className="close-btn" onClick={() => setPhotoModalOpen(false)}>×</span>
            </div>
            <div className="modal-body">
              <div className="avatar-selection-section">
                <p>Iconos estándar:</p>
                <div className="avatar-emoji-grid">
                  {PROFILE_EMOJIS.map((emoji, idx) => (
                    <div
                      key={idx}
                      className={`avatar-emoji-btn${profile?.avatarUrl === emoji ? ' selected' : ''}`}
                      onClick={() => selectImage(emoji)}
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
              </div>

              {profile?.avatarUrl && (
                <button className="btn-delete-avatar" onClick={handleDeletePhoto} disabled={uploading}>
                  Eliminar foto actual
                </button>
              )}

              <div className="pixabay-search">
                <p className="pixabay-label">Buscar en Pixabay</p>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Ej: naturaleza, ciudad..."
                    value={pixabayQuery}
                    onChange={e => setPixabayQuery(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && searchPixabay()}
                  />
                  <button onClick={searchPixabay} disabled={pixabayLoading || uploading}>
                    {pixabayLoading ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-search" />}
                  </button>
                </div>
                <div className="pixabay-results">
                  {pixabayImages.length === 0 && !pixabayLoading && pixabayQuery && (
                    <p className="pixabay-empty">No se encontraron imágenes</p>
                  )}
                  {pixabayImages.map(img => (
                    <div
                      key={img.id}
                      className={`pixabay-result-item${uploading ? ' uploading' : ''}`}
                      onClick={() => !uploading && selectImage(img.webformatURL)}
                    >
                      <img src={img.previewURL} alt="" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="user-profile">
        <div className="avatar-container" onClick={() => setPhotoModalOpen(true)}>
          {profile?.avatarUrl && !avatarBroken ? (
            isEmoji(profile.avatarUrl) ? (
              <div className="user-avatar-emoji" style={{ fontSize: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                {profile.avatarUrl}
              </div>
            ) : (
              <img
                src={profile.avatarUrl}
                alt="Perfil"
                className="user-avatar-img"
                key={profile.avatarUrl}
                onError={() => setAvatarBroken(true)}
              />
            )
          ) : (
            <div className="user-avatar-initials">{initials}</div>
          )}
          <div className="avatar-overlay">
            <i className="bx bx-camera"></i>
          </div>
        </div>
      </div>

      <div className="user-content">
        <div>
          <p className="field-label">Nombre</p>
          <div className="field-pill">
            <span className="field-text">{profile?.name || ''}</span>
          </div>
        </div>
        <div>
          <p className="field-label">Apellido</p>
          <div className="field-pill">
            <span className="field-text">{profile?.surname || ''}</span>
          </div>
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
