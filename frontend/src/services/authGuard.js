import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

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

onAuthStateChanged(auth, (user) => {
  const currentPath = window.location.pathname;
  
  // Checking if current page is protected
  const isProtected = PROTECTED_PAGES.some(page => currentPath.endsWith(page));
  // Checking if current page is auth-related
  const isAuthPage = AUTH_PAGES.some(page => currentPath.endsWith(page));

  if (!user && isProtected) {
    // Not logged in -> go to login
    window.location.href = "/pages/login.html";
  } else if (user && isAuthPage) {
    // Already logged in -> skip login/register and go to calendar
    window.location.href = "/pages/calendar.html";
  }
});
