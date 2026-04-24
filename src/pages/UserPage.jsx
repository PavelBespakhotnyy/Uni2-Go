import { useState, useEffect, useRef } from 'react';
import { signOut, updatePassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase.js';
import { getUserProfile, updateUserProfile, uploadUserAvatar, deleteUserAvatar } from '../services/userService.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { countries } from '../utils/countries.js';
import Layout from '../components/Layout.jsx';
import '../components/user/user.css';
import '../components/user/panel-lateral.css';

const PIXABAY_API_KEY = import.meta.env.VITE_PIXABAY_API_KEY || ''; // Use env variable

function getInitials(name, surname) {
  const n = (name || '').trim();
  const s = (surname || '').trim();
  if (n && s) return (n[0] + s[0]).toUpperCase();
  if (n) return n[0].toUpperCase();
  return '?';
}

function compressImage(file, maxWidth = 300, maxHeight = 300) {
  return new Promise((resolve, reject) => {
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      reject(new Error("El archivo seleccionado no es una imagen."));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("No se pudo obtener el contexto del canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) {
            console.log("Compresión completada:", blob.size);
            resolve(blob);
          } else {
            reject(new Error("Error al crear el Blob del canvas"));
          }
        }, 'image/jpeg', 0.8);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        console.error("Error durante la compresión:", err);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      console.error("Error al cargar la imagen en el objeto Image:", err);
      reject(new Error("Error al cargar la imagen. El archivo podría estar corrupto o no ser una imagen válida."));
    };

    img.src = objectUrl;
  });
}

export default function UserPage() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) refreshProfile();
  }, [user]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ text: '', ok: true });
  
  const [pixabayQuery, setPixabayQuery] = useState('');
  const [pixabayImages, setPixabayImages] = useState([]);
  const [pixabayLoading, setPixabayLoading] = useState(false);

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
    
    // Validar teléfono si se ha ingresado algo
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
        setSaveMsg({ text: 'Por seguridad, cierra sesión y vuelve a iniciarla para cambiar email o contraseña.', ok: false });
      } else {
        setSaveMsg({ text: 'Error al guardar. Intenta de nuevo.', ok: false });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    console.log("File selected:", file.name, file.size, file.type);
    setUploading(true);
    try {
      console.log("Compressing image...");
      const compressedBlob = await compressImage(file);
      console.log("Compressed size:", compressedBlob.size);
      
      console.log("Uploading to Firebase...");
      await uploadUserAvatar(user.uid, compressedBlob);
      console.log("Upload successful");
      
      await refreshProfile();
      setPhotoModalOpen(false);
      setSaveMsg({ text: 'Foto actualizada correctamente.', ok: true });
    } catch (error) {
      console.error("Detailed upload error:", error);
      alert("Error al procesar o subir la imagen: " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const searchPixabay = async () => {
    if (!pixabayQuery.trim()) return;
    
    if (!PIXABAY_API_KEY) {
      console.error("Pixabay API key is missing. Please set VITE_PIXABAY_API_KEY in your .env file.");
      alert("La búsqueda de imágenes no está configurada. Por favor, contacta al administrador.");
      return;
    }

    setPixabayLoading(true);
    setPixabayImages([]); // Clear previous results
    console.log("Searching Pixabay for:", pixabayQuery);
    
    try {
      const res = await fetch(`https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(pixabayQuery)}&image_type=photo&per_page=12`);
      
      if (!res.ok) {
        if (res.status === 400) {
          throw new Error("Error en la solicitud (posible clave API inválida).");
        }
        throw new Error(`Error de Pixabay: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Pixabay results:", data.hits?.length || 0);
      setPixabayImages(data.hits || []);
      
      if (!data.hits || data.hits.length === 0) {
        setSaveMsg({ text: 'No se encontraron imágenes para esta búsqueda.', ok: false });
      }
    } catch (error) {
      console.error("Pixabay search error:", error);
      alert("Error al buscar imágenes: " + error.message);
    } finally {
      setPixabayLoading(false);
    }
  };

  const selectPixabayImage = async (url) => {
    if (!user || uploading) return;
    
    setUploading(true);
    try {
      console.log("Saving selected photo URL...");
      await updateUserProfile(user.uid, { avatarUrl: url });
      
      console.log("Refreshing profile...");
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
              <h3>Cambiar foto de perfil</h3>
              <span className="close-btn" onClick={() => setPhotoModalOpen(false)}>×</span>
            </div>
            <div className="modal-body">
              <div className="photo-options" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn-secondary" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                  {uploading ? 'Procesando...' : 'Subir desde mi equipo'}
                </button>
                {profile?.avatarUrl && (
                  <button className="btn-tertiary" onClick={handleDeletePhoto} disabled={uploading} style={{ backgroundColor: '#ffcccc' }}>
                    Eliminar foto actual
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
              </div>

              <div className="pixabay-search">
                <p>O elige una foto libre de Pixabay:</p>
                <div className="search-box">
                  <input 
                    type="text" 
                    placeholder="Buscar fotos..." 
                    value={pixabayQuery} 
                    onChange={e => setPixabayQuery(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && searchPixabay()}
                  />
                  <button onClick={searchPixabay} disabled={pixabayLoading || uploading}>
                    {pixabayLoading ? '...' : 'Buscar'}
                  </button>
                </div>
                <div className="pixabay-results">
                  {pixabayImages.map(img => (
                    <img 
                      key={img.id} 
                      src={img.previewURL} 
                      alt="pixabay" 
                      onClick={() => !uploading && selectPixabayImage(img.webformatURL)}
                      style={{ opacity: uploading ? 0.5 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
                    />
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
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Perfil" className="user-avatar-img" key={profile.avatarUrl} />
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
