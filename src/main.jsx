import './style.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { initializeFirebaseCollections } from './scripts/initFirebaseCollections';
import { loadPalette } from './utils/theme.js';
import App from './App.jsx';

loadPalette();

initializeFirebaseCollections()
  .then(() => console.log('Firebase inicializado'))
  .catch(err => console.error('Error al inicializar Firebase:', err));

createRoot(document.getElementById('root')).render(<App />);
