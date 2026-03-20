import 'dotenv/config';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

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
const db = getFirestore(app);

async function markAsRead(chatId, userId) {
    const chatRef = doc(db, "chats", chatId);
    const updateData = {};
    updateData[`unreadCount.${userId}`] = 0;
    await updateDoc(chatRef, updateData);
    console.log(`Chat ${chatId} marked as read for user ${userId}`);
}

async function test() {
    console.log("Signing in User B...");
    const userCredential = await signInWithEmailAndPassword(auth, "userb@example.com", "Password123!");
    const userB = userCredential.user;
    
    const chatId = "d6tXspP2J8NoYdGRFXvu";
    await markAsRead(chatId, userB.uid);
}

test().catch(console.error);
