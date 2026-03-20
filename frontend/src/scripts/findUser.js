import 'dotenv/config';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findUser(searchTerm) {
  console.log(`🔍 Поиск пользователя по запросу: ${searchTerm}`);
  const usersCol = collection(db, 'users');
  const userSnapshot = await getDocs(usersCol);
  
  const found = userSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(user => 
        (user.email && user.email.includes(searchTerm)) || 
        (user.name && user.name.includes(searchTerm))
    );

  if (found.length === 0) {
    console.log("❌ Пользователь не найден в коллекции 'users'.");
  } else {
    console.log("✅ Найденные пользователи:", JSON.stringify(found, null, 2));
  }
}

findUser("alla140377").catch(console.error);
