import { registerUser } from "../../services/authService";

const form = document.getElementById("registroForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = {
    name: form.name.value,
    surname: form.surname.value,
    dateOfBirth: form.dateOfBirth.value,
    email: form.email.value,
    phone: form.phone.value,
    password: form.password.value,
    confirmPassword: form.confirmPassword.value,
  };

  try {
    await registerUser(formData);
    alert("Registro completado");
  } catch (err) {
    alert(err.message);
  }
});
