import { loginUser } from "../../services/authService";
import { initializeFirebaseCollections } from "../../scripts/initFirebaseCollections";
import "../../scripts/testConnection";

// Запуск инициализации коллекций
initializeFirebaseCollections()
  .then(() => console.log('✅ Инициализация Firebase завершена'))
  .catch(err => console.error('❌ Ошибка инициализации:', err));

const form = document.getElementById("loginForm");
const globalErrorText = document.getElementById("errorText");

function showFieldError(field, message) {
  const errorElement = document.getElementById(`error-${field}`);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add("visible");
  }
}

function showGlobalError(message) {
  globalErrorText.textContent = message;
  globalErrorText.classList.add("visible");
}

function hideErrors() {
  const errors = document.querySelectorAll(".field-error, .error-text");
  errors.forEach(el => el.classList.remove("visible"));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideErrors();

  const email = form.email.value.trim();
  const password = form.password.value.trim();
  let hasError = false;

  // Валидация
  if (!email) {
    showFieldError("email", "Por favor, introduzca su correo.");
    hasError = true;
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showFieldError("email", "Por favor, introduzca un correo válido.");
      hasError = true;
    }
  }

  if (!password) {
    showFieldError("password", "Por favor, introduzca su contraseña.");
    hasError = true;
  } else if (password.length < 8) {
    showFieldError("password", "La contraseña debe tener al menos 8 caracteres.");
    hasError = true;
  }

  if (hasError) return;

  try {
    const user = await loginUser(email, password);
    window.location.href = "/pages/calendar.html";
  } catch (err) {
    let message = "Error al iniciar sesión.";
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.message.includes("invalid-credential")) {
        message = "Correo o contraseña incorrectos.";
    }
    showGlobalError(message);
  }
});
