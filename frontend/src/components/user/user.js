/**
 * user.js — Uni2Go · Página de perfil de usuario
 *
 * Gestiona las interacciones de la página:
 *   - Click en iconos de editar → abre el modal
 *   - Botones de info y privacidad
 */
import { openEditModal } from './editModal.js';
import { initPanelLateral, loadUserAvatar } from './panel-lateral.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Panel Lateral (Edición y Control)
    initPanelLateral();

    // 2. Cargar Avatar con iniciales al entrar
    loadUserAvatar();

    // 3. Sincronizar datos iniciales en la pantalla principal
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const nameTxt = document.querySelector('#user-name .field-text');
    const surnameTxt = document.querySelector('#user-lastname .field-text');
    const usernameTxt = document.getElementById('user-username');

    if (nameTxt) nameTxt.textContent = user.name || "";
    if (surnameTxt) surnameTxt.textContent = user.surname || "";
    if (usernameTxt) usernameTxt.textContent = user.username || "";

    // 4. Mantener funcionalidad de tus modales pequeños (opcional si ya usas el panel)
    document.getElementById('user-name')?.addEventListener('click', () => openEditModal('name'));
    document.getElementById('user-lastname')?.addEventListener('click', () => openEditModal('lastname'));
});