import 'dotenv/config';
import { initializeApp } from "firebase/app";
import { getAuth, fetchSignInMethodsForEmail } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function checkEmail(email) {
  console.log(`🔍 Проверка email в Firebase Auth: ${email}`);
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    if (methods.length > 0) {
      console.log(`✅ Email найден в Firebase Auth. Методы входа:`, methods);
    } else {
      console.log(`❌ Email НЕ найден в Firebase Auth.`);
    }
  } catch (error) {
    if (error.code === 'auth/admin-restricted-operation') {
        console.log('⚠️ Включена защита от перечисления email. Невозможно проверить существование email этим способом.');
    } else {
        console.error('❌ Ошибка при проверке:', error.message);
    }
  }
}

const emailToCheck = "kolchan7714@gmail.com";
checkEmail(emailToCheck).catch(console.error);
