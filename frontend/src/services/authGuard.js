import { auth } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getUserProfile } from "./userService.js";

const PROTECTED_PAGES = [
  "calendar.html",
  "carpetas.html",
  "chat.html",
  "grupos.html",
  "lista_de_compras.html",
  "notifications.html",
  "user.html",
  "navbartest.html",
];

const AUTH_PAGES = [
  "login.html",
  "registration.html",
  "recover_password.html"
];

onAuthStateChanged(auth, async (user) => {
  const currentPath = window.location.pathname;
  const isProtected = PROTECTED_PAGES.some(page => currentPath.endsWith(page));
  const isAuthPage  = AUTH_PAGES.some(page => currentPath.endsWith(page));

  if (!user && isProtected) {
    window.location.href = "/pages/login.html";
    return;
  }

  if (user && isAuthPage) {
    window.location.href = "/pages/calendar.html";
    return;
  }

  if (user) {
    const data = await getUserProfile(user.uid);

    // ✅ Rellenar solo el <span> de texto, sin tocar el <img> del icono
    const nameSpan     = document.querySelector('#user-name .field-text');
    const lastnameSpan = document.querySelector('#user-lastname .field-text');

    const name    = data.name    || "Usuario";
    const surname = data.surname || "";

    if (nameSpan)     nameSpan.textContent     = name;
    if (lastnameSpan) lastnameSpan.textContent  = surname;

    // ✅ Generar avatar con las iniciales reales del usuario
    updateAvatar(name, surname);

    initLogout();
  }
});

/**
 * Actualiza el avatar con las iniciales del usuario autenticado.
 * Funciona con cualquier nombre y apellido, en mayúsculas o minúsculas.
 * @param {string} name
 * @param {string} surname
 */
function updateAvatar(name, surname) {
  const avatar = document.getElementById('user-avatar');
  if (!avatar) return;

  // Primera letra de cada campo, siempre en mayúsculas
  const i1 = (name.trim().charAt(0)    || '?').toUpperCase();
  const i2 = (surname.trim().charAt(0) || '?').toUpperCase();

  avatar.src = `https://ui-avatars.com/api/?name=${i1}+${i2}&background=7b2d3e&color=fff&bold=true&size=180`;
  avatar.alt = `Avatar de ${name} ${surname}`;
}

/**
 * Inicializa el botón de cerrar sesión.
 */
function initLogout() {
  const logoutBtn = document.getElementById("btn-logout");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      console.log("Sesión cerrada");
      // onAuthStateChanged detectará user=null y redirigirá a login
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("Hubo un error al intentar cerrar sesión.");
    }
  });
}