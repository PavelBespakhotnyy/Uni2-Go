/**
 * panel-lateral.js
 * Gestión de datos de usuario e iniciales en tiempo real
 */

export function loadUserAvatar() {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const name = (user.name || "").trim();
    const surname = (user.surname || "").trim();

    let initials = "";
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
    const btnInfo = document.getElementById('btn-info');
    const panel = document.getElementById('info-panel');
    const closePanel = document.getElementById('close-panel');
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('edit-password');

    const inputs = {
        name: document.getElementById('edit-name'),
        surname: document.getElementById('edit-surname'),
        username: document.getElementById('edit-username'),
        email: document.getElementById('edit-email'),
        phone: document.getElementById('edit-phone'),
        password: passwordInput
    };

    // Abrir panel
    btnInfo?.addEventListener('click', () => {
        panel.classList.add('active');
        loadDataToInputs();
    });

    // Cerrar panel
    closePanel?.addEventListener('click', () => {
        panel.classList.remove('active');
    });

    // Mostrar/Ocultar contraseña
    togglePassword?.addEventListener('click', () => {
        const isPass = passwordInput.type === 'password';
        passwordInput.type = isPass ? 'text' : 'password';
        togglePassword.className = isPass ? 'bx bx-show' : 'bx bx-hide';
    });

    // Guardar cambios y actualizar iniciales al escribir
    Object.keys(inputs).forEach(key => {
        inputs[key]?.addEventListener('input', () => {
            const user = JSON.parse(localStorage.getItem("user")) || {};
            user[key] = inputs[key].value;
            localStorage.setItem("user", JSON.stringify(user));

            // Actualizar la interfaz de la página de fondo
            syncMainUI(user);
        });
    });

    function loadDataToInputs() {
        const user = JSON.parse(localStorage.getItem("user")) || {};
        for (let key in inputs) {
            if (inputs[key]) inputs[key].value = user[key] || "";
        }
    }

    function syncMainUI(user) {
        // Actualizar textos en la pantalla principal
        const nameTxt = document.querySelector('#user-name .field-text');
        const surnameTxt = document.querySelector('#user-lastname .field-text');
        const usernameTxt = document.getElementById('user-username');

        if (nameTxt) nameTxt.textContent = user.name || "";
        if (surnameTxt) surnameTxt.textContent = user.surname || "";
        if (usernameTxt) usernameTxt.textContent = user.username || "";

        // Actualizar el círculo de iniciales
        loadUserAvatar();
    }
}