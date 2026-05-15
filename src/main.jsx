import './style.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { initializeFirebaseCollections } from './scripts/initFirebaseCollections';
import { loadPalette } from './utils/theme.js';
import App from './App.jsx';

loadPalette();

// Enforce Spanish locale for the browser session where possible
try {
  Object.defineProperty(window.navigator, 'language', { value: 'es-ES', configurable: true });
  Object.defineProperty(window.navigator, 'languages', { value: ['es-ES', 'es'], configurable: true });
} catch (e) {
  console.warn("Could not override browser language preference");
}

initializeFirebaseCollections()
  .then(() => console.log('Firebase inicializado'))
  .catch(err => console.error('Error al inicializar Firebase:', err));

createRoot(document.getElementById('root')).render(<App />);
