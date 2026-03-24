import { defineConfig } from "vite";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "./",
  plugins: [tailwindcss()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "pages/login.html"),
        registration: resolve(__dirname, "pages/registration.html"),
        recovery: resolve(__dirname, "pages/recover_password.html"),
        calendar: resolve(__dirname, "pages/calendar.html"),
        navbartest: resolve(__dirname, "pages/navbartest.html"),
        carpetas: resolve(__dirname, "pages/carpetas.html"),
        chat: resolve(__dirname, "pages/chat.html"),
        grupos: resolve(__dirname, "pages/grupos.html"),
        notifications: resolve(__dirname, "pages/notifications.html"),
        lista_de_compras: resolve(__dirname, "pages/lista_de_compras.html"),
        user: resolve(__dirname, "pages/user.html"),
        friends: resolve(__dirname, "pages/friends.html"),
        sobre_nosotros: resolve(__dirname, "pages/sobre_nosotros.html"),
      },
    },
  },
});
