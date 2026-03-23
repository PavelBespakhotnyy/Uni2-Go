/**
 * editModal.js — Uni2Go · Modal de edición de perfil
 *
 * El modal se monta como hijo DIRECTO de <body> para que
 * position:fixed funcione siempre, sin importar el layout.
 */

// ─── Configuración ────────────────────────────────────────────────────────────
const FIELD_CONFIG = {
  name: {
    spanSelector:    '#user-name .field-text',
    title:           'Editar nombre de usuario',
    label:           'Nombre usuario',
    footerLabel:     'Guardar nuevo nombre de usuario',
    localStorageKey: 'user_name',
  },
  lastname: {
    spanSelector:    '#user-lastname .field-text',
    title:           'Editar apellido de usuario',
    label:           'Apellido usuario',
    footerLabel:     'Guardar nuevo apellido de usuario',
    localStorageKey: 'user_lastname',
  },
};

let activeField = null;

// ─── Inyectar estilos críticos directamente en <head> ────────────────────────
// Esto garantiza que el CSS del modal funcione aunque haya conflictos externos
function injectCriticalStyles() {
  if (document.getElementById('edit-modal-critical-styles')) return;

  const style = document.createElement('style');
  style.id = 'edit-modal-critical-styles';
  style.textContent = `
    /* OVERLAY — cubre todo el viewport sin excepciones */
    #edit-modal-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      margin: 0 !important;
      padding: 1rem !important;
      box-sizing: border-box !important;
      background: rgba(0, 0, 0, 0.52) !important;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    #edit-modal-overlay.modal-visible {
      opacity: 1 !important;
      pointer-events: all !important;
    }

    /* MODAL BOX */
    #edit-modal-box {
      position: relative !important;
      width: 100% !important;
      max-width: 400px !important;
      background: #ffffff !important;
      border-radius: 14px !important;
      box-shadow: 0 24px 64px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12) !important;
      padding: 1.75rem 1.75rem 1.5rem !important;
      box-sizing: border-box !important;
      transform: scale(0.9) translateY(10px);
      opacity: 0;
      transition:
        transform 0.25s cubic-bezier(0.34, 1.26, 0.64, 1),
        opacity   0.2s ease;
    }

    #edit-modal-overlay.modal-visible #edit-modal-box {
      transform: scale(1) translateY(0) !important;
      opacity: 1 !important;
    }

    .modal-header {
      display: flex !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      gap: 1rem !important;
      margin-bottom: 1.25rem !important;
    }

    .modal-title {
      font-size: 1rem !important;
      font-weight: 700 !important;
      color: #1a1a1a !important;
      margin: 0 !important;
      line-height: 1.4 !important;
      flex: 1 !important;
    }

    .modal-close-x {
      flex-shrink: 0 !important;
      width: 28px !important;
      height: 28px !important;
      background: #f0f0f0 !important;
      border: none !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 0.8rem !important;
      color: #666 !important;
      padding: 0 !important;
      transition: background 0.15s ease, color 0.15s ease !important;
    }

    .modal-close-x:hover {
      background: #e0e0e0 !important;
      color: #111 !important;
    }

    .modal-body {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.4rem !important;
      margin-bottom: 1.25rem !important;
    }

    .modal-label {
      font-size: 0.78rem !important;
      font-weight: 700 !important;
      color: #666 !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
    }

    .modal-input {
      width: 100% !important;
      padding: 0.65rem 0.9rem !important;
      border: 2px solid #e0e0e0 !important;
      border-radius: 8px !important;
      font-size: 1rem !important;
      font-weight: 500 !important;
      color: #1a1a1a !important;
      background: #fafafa !important;
      outline: none !important;
      box-sizing: border-box !important;
      transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
    }

    .modal-input:focus {
      border-color: #7b2d3e !important;
      box-shadow: 0 0 0 3px rgba(123, 45, 62, 0.12) !important;
      background: #fff !important;
    }

    .modal-input.modal-input-error {
      border-color: #4D67AF !important;
      box-shadow: 0 0 0 3px rgba(77, 103, 175, 0.12) !important;
    }

    .modal-error-msg {
      font-size: 0.76rem !important;
      color: #4D67AF !important;
      min-height: 1rem !important;
    }

    .modal-footer-label {
      font-size: 0.78rem !important;
      font-weight: 700 !important;
      color: #666 !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
      margin: 0 0 0.75rem 0 !important;
    }

    .modal-actions {
      display: flex !important;
      gap: 0.75rem !important;
    }

    .modal-btn-confirm {
      flex: 1 !important;
      padding: 0.7rem 1rem !important;
      border: none !important;
      border-radius: 8px !important;
      font-size: 0.95rem !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      background-color: #7b2d3e !important;
      color: #fff !important;
      transition: background-color 0.18s ease !important;
    }

    .modal-btn-confirm:hover { background-color: #9b3a4f !important; }

    .modal-btn-cancel {
      flex: 1 !important;
      padding: 0.7rem 1rem !important;
      border: 2px solid #d0d0d0 !important;
      border-radius: 8px !important;
      font-size: 0.95rem !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      background: transparent !important;
      color: #555 !important;
      transition: border-color 0.18s ease, color 0.18s ease !important;
    }

    .modal-btn-cancel:hover { border-color: #999 !important; color: #222 !important; }

    @media (max-width: 480px) {
      #edit-modal-box { padding: 1.4rem 1.25rem 1.2rem !important; }
      .modal-actions  { flex-direction: column-reverse !important; }
    }
  `;

  // Añadir al <head>, NO dentro de ningún contenedor del layout
  document.head.appendChild(style);
}

// ─── Crear el modal como hijo directo de <body> ───────────────────────────────
function createModal() {
  if (document.getElementById('edit-modal-overlay')) return;

  injectCriticalStyles();

  // Crear el nodo y añadirlo directamente a <body>
  // Así escapa de cualquier contenedor con overflow/transform
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="edit-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title-text">
      <div id="edit-modal-box">
        <div class="modal-header">
          <p class="modal-title" id="modal-title-text"></p>
          <button class="modal-close-x" id="modal-close-x" aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-body">
          <label class="modal-label" id="modal-input-label" for="modal-input"></label>
          <input
            class="modal-input"
            id="modal-input"
            type="text"
            maxlength="25"
            autocomplete="off"
            spellcheck="false"
          />
          <span class="modal-error-msg" id="modal-error-msg"></span>
        </div>
        <p class="modal-footer-label" id="modal-footer-label"></p>
        <div class="modal-actions">
          <button class="modal-btn-confirm" id="modal-btn-confirm">SI</button>
          <button class="modal-btn-cancel"  id="modal-btn-cancel">NO</button>
        </div>
      </div>
    </div>
  `;

  // ✅ appendChild a <body> directamente — el portal manual
  document.body.appendChild(wrapper.firstElementChild);

  // Eventos
  document.getElementById('modal-btn-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-close-x').addEventListener('click', closeModal);
  document.getElementById('modal-btn-confirm').addEventListener('click', handleConfirm);
  document.getElementById('edit-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal-overlay') closeModal();
  });
  document.getElementById('modal-input').addEventListener('input', clearError);
  document.addEventListener('keydown', handleKeydown);
}

// ─── Abrir ────────────────────────────────────────────────────────────────────
export function openEditModal(field) {
  if (!FIELD_CONFIG[field]) return;
  activeField = field;

  createModal();

  const cfg = FIELD_CONFIG[field];
  document.getElementById('modal-title-text').textContent   = cfg.title;
  document.getElementById('modal-input-label').textContent  = cfg.label;
  document.getElementById('modal-footer-label').textContent = cfg.footerLabel;

  const currentValue = document.querySelector(cfg.spanSelector)?.textContent?.trim() || '';
  const input = document.getElementById('modal-input');
  input.value = currentValue;
  clearError();

  const overlay = document.getElementById('edit-modal-overlay');
  requestAnimationFrame(() => {
    overlay.classList.add('modal-visible');
    requestAnimationFrame(() => { input.focus(); input.select(); });
  });
}

// ─── Cerrar ───────────────────────────────────────────────────────────────────
function closeModal() {
  document.getElementById('edit-modal-overlay')?.classList.remove('modal-visible');
  activeField = null;
}

// ─── Confirmar ────────────────────────────────────────────────────────────────
function handleConfirm() {
  const input     = document.getElementById('modal-input');
  const validated = validate(input.value);

  if (!validated.ok) {
    showError(validated.msg);
    input.classList.add('modal-input-error');
    input.focus();
    return;
  }

  const cfg = FIELD_CONFIG[activeField];
  const span = document.querySelector(cfg.spanSelector);
  if (span) span.textContent = validated.value;

  localStorage.setItem(cfg.localStorageKey, validated.value);
  updateAvatar();
  closeModal();
}

// ─── Validación ───────────────────────────────────────────────────────────────
function validate(raw) {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed)            return { ok: false, msg: 'El campo no puede estar vacío.' };
  if (trimmed.length > 25) return { ok: false, msg: 'Máximo 25 caracteres.' };
  if (/\d/.test(trimmed))  return { ok: false, msg: 'No se permiten números.' };
  return { ok: true, value: trimmed.charAt(0).toUpperCase() + trimmed.slice(1) };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function updateAvatar() {
  const name    = document.querySelector('#user-name .field-text')?.textContent?.trim()     || '';
  const surname = document.querySelector('#user-lastname .field-text')?.textContent?.trim() || '';
  const i1 = (name.charAt(0)    || '?').toUpperCase();
  const i2 = (surname.charAt(0) || '?').toUpperCase();
  const avatar = document.getElementById('user-avatar');
  if (avatar) {
    avatar.src = `https://ui-avatars.com/api/?name=${i1}+${i2}&background=7b2d3e&color=fff&bold=true&size=180`;
    avatar.alt = `Avatar de ${name} ${surname}`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('modal-error-msg');
  if (el) el.textContent = msg;
}

function clearError() {
  const el    = document.getElementById('modal-error-msg');
  const input = document.getElementById('modal-input');
  if (el)    el.textContent = '';
  if (input) input.classList.remove('modal-input-error');
}

function handleKeydown(e) {
  const overlay = document.getElementById('edit-modal-overlay');
  if (!overlay?.classList.contains('modal-visible')) return;
  if (e.key === 'Escape') { e.preventDefault(); closeModal();    }
  if (e.key === 'Enter')  { e.preventDefault(); handleConfirm(); }
}