/**
 * user.js — Uni2Go · Página de perfil de usuario
 *
 * Gestiona las interacciones de la página:
 *   - Click en iconos de editar → abre el modal
 *   - Botones de info y privacidad
 */

import { openEditModal } from './editModal.js';

document.addEventListener('DOMContentLoaded', () => {

  // ── Iconos de editar nombre y apellido ─────────────────────────────────
  // Hacer clicable tanto el pill entero como solo el icono
  const namePill     = document.getElementById('user-name');
  const lastnamePill = document.getElementById('user-lastname');

  if (namePill) {
    namePill.addEventListener('click', () => openEditModal('name'));
  }
  if (lastnamePill) {
    lastnamePill.addEventListener('click', () => openEditModal('lastname'));
  }

  // ── Botón "Información personal" ───────────────────────────────────────
  const btnInfo = document.getElementById('btn-info');
  if (btnInfo) {
    btnInfo.addEventListener('click', () => {
      // TODO: navegar o abrir modal de info personal
      console.log('Información personal');
    });
  }

  // ── Botón "Datos y Privacidad" ──────────────────────────────────────────
  const btnPrivacy = document.getElementById('btn-privacy');
  if (btnPrivacy) {
    btnPrivacy.addEventListener('click', () => {
      // TODO: navegar o abrir modal de privacidad
      console.log('Datos y privacidad');
    });
  }

});