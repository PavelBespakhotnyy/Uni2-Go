import 'dotenv/config';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// Note: listCollections is only available in Admin SDK.
// In Client SDK we have to know collection names.
// Let's try some common ones.

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

const commonCollections = ['users', 'user_profiles', 'categories', 'registrations', 'pending_users', 'profiles', 'accounts'];

async function searchAllCollections(email) {
    console.log(`🔍 Searching for ${email} in common collections...`);
    for (const colName of commonCollections) {
        try {
            const colRef = collection(db, colName);
            const snapshot = await getDocs(colRef);
            console.log(`Checking collection: ${colName} (${snapshot.size} docs)`);
            snapshot.forEach(doc => {
                const data = doc.data();
                const dataStr = JSON.stringify(data);
                if (dataStr.includes(email)) {
                    console.log(`✅ FOUND in ${colName}! Doc ID: ${doc.id}`);
                    console.log(data);
                }
            });
        } catch (e) {
            console.log(`❌ Error checking ${colName}: ${e.message}`);
        }
    }
}

searchAllCollections("alla140377@mail.ru").catch(console.error);
