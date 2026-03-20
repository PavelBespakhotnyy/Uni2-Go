import 'dotenv/config';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

// Настройка для Node.js: берем переменные из process.env
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

async function testConnection() {
  try {
    console.log('🔍 Проверка подключения к Firebase (через Node.js)...');
    console.log('Project ID:', firebaseConfig.projectId);
    
    if (!firebaseConfig.apiKey) {
      throw new Error("API Key не найден. Проверьте ваш файл .env");
    }

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Пробуем получить любую коллекцию (лимит 1 для скорости)
    const testRef = query(collection(db, 'users'), limit(1));
    const snapshot = await getDocs(testRef);
    
    console.log('✅ Подключение успешно!');
    console.log('📊 Коллекция "users" доступна:', !snapshot.empty);
    
  } catch (error) {
    console.error('❌ Ошибка подключения:');
    if (error.code) console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
  }
}

testConnection();
