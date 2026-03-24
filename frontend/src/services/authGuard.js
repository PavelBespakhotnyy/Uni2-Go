import { auth } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getUserProfile } from "./userService.js";

const PROTECTED_PAGES = [
  "calendar.html",
  "chat.html",
  "grupos.html",
  "friends.html",
  "lista_de_compras.html",
  "notifications.html",
  "user.html",
];

const AUTH_PAGES = [
  "login.html",
  "registration.html",
  "recover_password.html"
];

// Actualiza la interfaz con los datos del perfil del usuario
function updateUserUI(data) {
  const nameSpan     = document.querySelector('#user-name .field-text');
  const surnameSpan  = document.querySelector('#user-lastname .field-text');
  const usernameEl   = document.getElementById('user-username');

  if (nameSpan)    nameSpan.textContent    = data?.name    || "Usuario";
  if (surnameSpan) surnameSpan.textContent = data?.surname || "";
  if (usernameEl)  usernameEl.textContent  = data?.username ? `@${data.username}` : "—";
}

// Функция для редиректа
function redirectIfNeeded(user, currentPath, isProtected, isAuthPage) {
  if (!user && isProtected) {
    // Не залогинен -> на страницу входа
    window.location.href = "/pages/login.html";
    return true;
  } else if (user && isAuthPage) {
    if (sessionStorage.getItem('registering')) return false;
    window.location.href = "/pages/calendar.html";
    return true;
  }
  return false;
}

// Основная функция
async function handleAuthState(user) {
  const currentPath = window.location.pathname;
  const isProtected = PROTECTED_PAGES.some(page => currentPath.endsWith(page));
  const isAuthPage = AUTH_PAGES.some(page => currentPath.endsWith(page));
  
  // Сначала проверяем, нужно ли редиректить
  const redirected = redirectIfNeeded(user, currentPath, isProtected, isAuthPage);
  if (redirected) return;
  
  // Если пользователь залогинен, получаем его данные
  if (user) {
    try {
      const data = await getUserProfile(user.uid);
      updateUserUI(data);
      initLogout();
    } catch (error) {
      console.error("Error al obtener perfil:", error);
    }
  } else {
    console.log("Usuario no autenticado");
  }
}

// Запускаем слушатель
onAuthStateChanged(auth, handleAuthState);

// Функция для кнопки выхода
function initLogout() {
  const logoutBtn = document.getElementById("btn-logout");
  
  if (logoutBtn) {
    // Удаляем старые обработчики, чтобы не было дубликатов
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    
    newLogoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        console.log("Sesión cerrada");
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        alert("Hubo un error al intentar cerrar sesión.");
      }
    });
  }
}