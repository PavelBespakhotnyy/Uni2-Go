/**
 * panel-lateral.js
 * Gestión de datos de usuario con Firestore
 */

import { auth } from '../../firebase/firebase.js';
import { getUserProfile, updateUserProfile } from '../../services/userService.js';
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

export function loadUserAvatar(name, surname) {
    let initials;
    if (name && surname) {
        initials = name.charAt(0) + surname.charAt(0);
    } else if (name) {
        initials = name.charAt(0);
    } else {
        initials = "?";
    }

    const avatarContainer = document.querySelector(".user-profile");
    if (avatarContainer) {
        avatarContainer.innerHTML = `<div class="user-avatar-initials">${initials.toUpperCase()}</div>`;
    }
}

export function initPanelLateral() {
    const btnInfo       = document.getElementById('btn-info');
    const panel         = document.getElementById('info-panel');
    const closePanel    = document.getElementById('close-panel');
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('edit-password');
    const btnSave       = document.getElementById('btn-save-profile');
    const saveMsg       = document.getElementById('panel-save-msg');

    const inputs = {
        name:     document.getElementById('edit-name'),
        surname:  document.getElementById('edit-surname'),
        username: document.getElementById('edit-username'),
        email:    document.getElementById('edit-email'),
        phone:    document.getElementById('edit-phone'),
    };

    // Abrir panel → cargar datos desde Firestore
    btnInfo?.addEventListener('click', async () => {
        panel.classList.add('active');
        await loadDataToInputs();
    });

    // Cerrar panel
    closePanel?.addEventListener('click', () => {
        panel.classList.remove('active');
        clearMsg();
    });

    // Mostrar/Ocultar contraseña
    togglePassword?.addEventListener('click', () => {
        const isPass = passwordInput.type === 'password';
        passwordInput.type = isPass ? 'text' : 'password';
        togglePassword.className = isPass ? 'bx bx-show' : 'bx bx-hide';
    });

    // Guardar cambios
    btnSave?.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            showMsg('No hay sesión activa.', true);
            return;
        }

        btnSave.disabled = true;
        clearMsg();

        try {
            // Datos para Firestore
            const firestoreData = {};
            for (const key of ['name', 'surname', 'username', 'phone']) {
                const val = inputs[key]?.value.trim();
                if (val !== undefined) firestoreData[key] = val;
            }

            await updateUserProfile(user.uid, firestoreData);

            // Actualizar email en Firebase Auth si cambió
            const newEmail = inputs.email?.value.trim();
            if (newEmail && newEmail !== user.email) {
                await updateEmail(user, newEmail);
                await updateUserProfile(user.uid, { email: newEmail });
            }

            // Cambiar contraseña si se introdujo una nueva
            const newPassword = passwordInput?.value;
            if (newPassword && newPassword.length >= 6) {
                await updatePassword(user, newPassword);
                if (passwordInput) passwordInput.value = '';
            } else if (newPassword && newPassword.length > 0) {
                showMsg('La contraseña debe tener al menos 6 caracteres.', true);
                btnSave.disabled = false;
                return;
            }

            // Actualizar la UI principal
            syncMainUI(firestoreData);
            loadUserAvatar(firestoreData.name, firestoreData.surname);

            showMsg('Cambios guardados correctamente.', false);
        } catch (err) {
            console.error('Error al guardar perfil:', err);
            if (err.code === 'auth/requires-recent-login') {
                showMsg('Por seguridad, cierra sesión y vuelve a iniciarla para cambiar email o contraseña.', true);
            } else {
                showMsg('Error al guardar. Intenta de nuevo.', true);
            }
        } finally {
            btnSave.disabled = false;
        }
    });

    async function loadDataToInputs() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const data = await getUserProfile(user.uid);
            if (!data) return;

            if (inputs.name)     inputs.name.value     = data.name     || '';
            if (inputs.surname)  inputs.surname.value  = data.surname  || '';
            if (inputs.username) inputs.username.value = data.username || '';
            if (inputs.email)    inputs.email.value    = user.email    || data.email || '';
            if (inputs.phone)    inputs.phone.value    = data.phone    || '';
            if (passwordInput)   passwordInput.value   = '';
        } catch (err) {
            console.error('Error al cargar datos del perfil:', err);
        }
    }

    function syncMainUI(data) {
        const nameTxt    = document.querySelector('#user-name .field-text');
        const surnameTxt = document.querySelector('#user-lastname .field-text');
        const usernameTxt = document.getElementById('user-username');

        if (nameTxt)     nameTxt.textContent    = data.name    || '';
        if (surnameTxt)  surnameTxt.textContent = data.surname || '';
        if (usernameTxt) usernameTxt.textContent = data.username ? `@${data.username}` : '—';
    }

    function showMsg(text, isError) {
        if (!saveMsg) return;
        saveMsg.textContent = text;
        saveMsg.style.color = isError ? '#c0392b' : '#27ae60';
    }

    function clearMsg() {
        if (saveMsg) saveMsg.textContent = '';
    }
}
