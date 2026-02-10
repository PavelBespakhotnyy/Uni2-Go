import { auth } from "../../firebase/firebase.js";
import { sendPasswordResetEmail } from "firebase/auth";

document.addEventListener("DOMContentLoaded", () => {
    const emailInput = document.getElementById("email");
    const resetBtn = document.getElementById("resetBtn");
    const message = document.getElementById("message");

    resetBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();

        if (!email) {
            message.textContent = "Enter your email";
            message.style.color = "red";
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            message.textContent = "Email sent";
            message.style.color = "green";
            emailInput.value = "";
        } catch (error) {
            let text = "Error";

            switch (error.code) {
                case "auth/user-not-found":
                    text = "User not found";
                    break;
                case "auth/invalid-email":
                    text = "Invalid email";
                    break;
                case "auth/too-many-requests":
                    text = "Too many requests, try again later";
                    break;
            }

            message.textContent = text;
            message.style.color = "red";
            console.error(error);
        }
    });
});
