// src/firebase/tempConfig.js
// ВРЕМЕННЫЙ файл для Node.js скриптов
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Реальные значения из .env файла
const firebaseConfig = {
  apiKey: "AIzaSyCVYcnG6HDwJleglo24JgLfuLvwYOPXsZw",
  authDomain: "uni2-go.firebaseapp.com",
  projectId: "uni2-go",
  storageBucket: "uni2-go.firebasestorage.app",
  messagingSenderId: "113497798210",
  appId: "1:113497798210:web:1629b40cacf3c2eb645fdb"
  // measurementId не обязателен
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);