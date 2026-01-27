import { defineConfig } from 'vite'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: './', 
  plugins: [    tailwindcss(),  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'pages/login.html'),
        registration: resolve(__dirname, 'pages/registration.html'),
        recovery: resolve(__dirname, 'pages/recover_password.html'),
        recovery: resolve(__dirname, 'pages/recover_code.html'),
      }
    }
  }
})
