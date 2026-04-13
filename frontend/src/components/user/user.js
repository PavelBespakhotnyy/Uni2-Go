/**
 * user.js — Uni2Go · Página de perfil de usuario
 *
 * Gestiona las interacciones de la página:
 *   - Click en iconos de editar → abre el modal
 *   - Botones de info y privacidad
 */

iimport { openEditModal } from './editModal.js';

document.addEventListener('DOMContentLoaded', () => {

  // ── EDITAR NOMBRE / APELLIDO ─────────────────────────────
  const namePill     = document.getElementById('user-name');
  const lastnamePill = document.getElementById('user-lastname');

  if (namePill) {
    namePill.addEventListener('click', () => openEditModal('name'));
  }
  if (lastnamePill) {
    lastnamePill.addEventListener('click', () => openEditModal('lastname'));
  }

  // ── PANEL INFORMACIÓN PERSONAL ────────────────────────────
  const btnInfo = document.getElementById('btn-info');
  const panel = document.getElementById('info-panel');
  const closePanel = document.getElementById('close-panel');

  if (btnInfo && panel) {
    btnInfo.addEventListener('click', () => {
      panel.classList.add('active');
      loadUserData();
    });
  }

  if (closePanel) {
    closePanel.addEventListener('click', () => {
      panel.classList.remove('active');
    });
  }

  // ── PASSWORD SHOW/HIDE ────────────────────────────────────
  const togglePassword = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('edit-password');

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassword.classList.replace('bx-hide', 'bx-show');
      } else {
        passwordInput.type = 'password';
        togglePassword.classList.replace('bx-show', 'bx-hide');
      }
    });
  }

  // ── AVATAR INICIALES ─────────────────────────────────────
  loadUserAvatar();

  function loadUserAvatar() {
    const user = JSON.parse(localStorage.getItem("user")) || {};

    const name = user.name || "";
    const surname = user.surname || "";

    const initials = (name.charAt(0) + surname.charAt(0)).toUpperCase();

    const avatarContainer = document.querySelector(".user-profile");

    if (!avatarContainer) return;

    avatarContainer.innerHTML = "";

    const div = document.createElement("div");
    div.classList.add("user-avatar-initials");
    div.textContent = initials || "?";

    avatarContainer.appendChild(div);
  }

  // ── CARGAR DATOS EN PANEL ────────────────────────────────
  function loadUserData() {
    const user = JSON.parse(localStorage.getItem("user")) || {};

    document.getElementById("edit-name").value = user.name || "";
    document.getElementById("edit-surname").value = user.surname || "";
    document.getElementById("edit-username").value = user.username || "";
    document.getElementById("edit-email").value = user.email || "";
    document.getElementById("edit-phone").value = user.phone || "";
    document.getElementById("edit-password").value = user.password || "";
  }

});