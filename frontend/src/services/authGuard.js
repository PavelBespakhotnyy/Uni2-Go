import { auth } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth"; // 1. Importar signOut
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

onAuthStateChanged(auth, async(user) => {
  const currentPath = window.location.pathname;
  // Checking if current page is protected
  const isProtected = PROTECTED_PAGES.some(page => currentPath.endsWith(page));
  // Checking if current page is auth-related
  const isAuthPage = AUTH_PAGES.some(page => currentPath.endsWith(page));
  
            
            if (user) {
                const data = await getUserProfile(user.uid);
                // Si encontramos los datos, los ponemos
                document.getElementById('user-name').innerText = data.name || "Usuario";
                document.getElementById('user-lastname').innerText = data.surname || "";
            } else {
                // Si el usuario existe en Auth pero no en Firestore aún
                
                console.log("Perfil de Firestore no encontrado");
            }
  if (!user && isProtected) {
    // Not logged in -> go to login
    
    window.location.href = "/pages/login.html";
  } else if (user && isAuthPage) {
    // Already logged in -> skip login/register and go to calendar
    window.location.href = "/pages/calendar.html";
  }

  // 2. Si el usuario está autenticado, activamos el botón de cerrar sesión
  if (user) {
    //const data = await getUserProfile(user.uid);
        // Usamos .name y .surname (tal cual están en tu base de datos)
      
    initLogout();
  }
});

// 3. Función para manejar el evento del botón
function initLogout() {
  const logoutBtn = document.getElementById("btn-logout");
  
  if (logoutBtn) {
    // Usamos onclick o addEventListener
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        // No necesitas redireccionar aquí; onAuthStateChanged 
        // se ejecutará de nuevo, detectará que user es null 
        // y te enviará a login.html automáticamente.
        console.log("Sesión cerrada");
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        alert("Hubo un error al intentar cerrar sesión.");
      }
    });
  }
}