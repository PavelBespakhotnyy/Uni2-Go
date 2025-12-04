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
        initial: resolve(__dirname, 'index.html'),
        initial: resolve(__dirname, 'pages/initial_page.html')

      }
    }
  }
})
