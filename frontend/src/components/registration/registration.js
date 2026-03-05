import { registerUser } from "../../services/authService";

const form = document.getElementById("registroForm");
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

  const formData = {
    name: form.name.value.trim(),
    surname: form.surname.value.trim(),
    dateOfBirth: form.dateOfBirth.value,
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    password: form.contrasena.value,
    confirmPassword: form.confirmPassword.value,
  };

  let hasError = false;

  // Валидация полей
  if (!formData.name) { showFieldError("name", "Introduzca su nombre."); hasError = true; }
  if (!formData.surname) { showFieldError("surname", "Introduzca su apellido."); hasError = true; }
  if (!formData.dateOfBirth) { showFieldError("dateOfBirth", "Introduzca su fecha de nacimiento."); hasError = true; }
  
  if (!formData.email) {
    showFieldError("email", "Introduzca su correo.");
    hasError = true;
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showFieldError("email", "Introduzca un correo válido.");
      hasError = true;
    }
  }

  if (!formData.phone) {
    showFieldError("phone", "Introduzca su teléfono.");
    hasError = true;
  } else {
    const phoneRegex = /^[0-9]{3}-[0-9]{3}-[0-9]{3}$/;
    if (!phoneRegex.test(formData.phone)) {
      showFieldError("phone", "Formato: 123-456-789.");
      hasError = true;
    }
  }

  if (!formData.password) {
    showFieldError("contrasena", "Introduzca una contraseña.");
    hasError = true;
  } else {
    if (formData.password.length < 8) { showFieldError("contrasena", "Mínimo 8 caracteres."); hasError = true; }
    else if (!/[A-Z]/.test(formData.password)) { showFieldError("contrasena", "Falta una mayúscula."); hasError = true; }
    else if (!/[a-z]/.test(formData.password)) { showFieldError("contrasena", "Falta una minúscula."); hasError = true; }
    else if (!/[0-9]/.test(formData.password)) { showFieldError("contrasena", "Falta un número."); hasError = true; }
  }

  if (formData.password !== formData.confirmPassword) {
    showFieldError("confirmPassword", "Las contraseñas no coinciden.");
    hasError = true;
  }

  if (hasError) return;

  try {
    await registerUser(formData);
    window.location.href = "./login.html"; 
  } catch (err) {
    let message = "Error al crear la cuenta.";
    if (err.code === 'auth/email-already-in-use') message = "Este correo ya está registrado.";
    showGlobalError(message);
  }
});
