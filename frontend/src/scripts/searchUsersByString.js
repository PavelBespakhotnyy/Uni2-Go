import 'dotenv/config';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function listUsers() {
  const usersCol = collection(db, 'users');
  const userSnapshot = await getDocs(usersCol);
  const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const searchStr = "alla";
  const found = userList.filter(user => JSON.stringify(user).toLowerCase().includes(searchStr.toLowerCase()));
  
  if (found.length > 0) {
      console.log(`✅ Found users with '${searchStr}':`, JSON.stringify(found, null, 2));
  } else {
      console.log(`❌ No users with '${searchStr}' found.`);
  }
}

listUsers().catch(console.error);
