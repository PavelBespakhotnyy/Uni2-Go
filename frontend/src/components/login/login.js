import { loginUser } from "../../services/authService";

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const user = await loginUser(
      form.email.value,
      form.password.value
    );

    console.log("Logged in:", user.uid);
  } catch (err) {
    alert(err.message);
  }
});
