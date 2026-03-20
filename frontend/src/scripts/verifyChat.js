import 'dotenv/config';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, orderBy, query } from "firebase/firestore";

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

async function verify(chatId) {
    console.log(`Verifying chat: ${chatId}`);
    
    // 1. Check chat document
    const chatDoc = await getDoc(doc(db, "chats", chatId));
    if (!chatDoc.exists()) {
        console.error("Chat not found!");
        return;
    }
    const chatData = chatDoc.data();
    console.log("Chat Data:", JSON.stringify(chatData, null, 2));

    // 2. Check messages
    const q = query(collection(db, `chats/${chatId}/messages`), orderBy("timestamp", "asc"));
    const messagesSnapshot = await getDocs(q);
    console.log(`Found ${messagesSnapshot.size} messages.`);
    
    messagesSnapshot.forEach(doc => {
        const msg = doc.data();
        console.log(`- [${msg.senderId === 's3dwI37o2XQZYkXi72NjcdTrp2q2' ? 'User A' : 'User B'}] ${msg.text}`);
    });
}

const chatId = "d6tXspP2J8NoYdGRFXvu";
verify(chatId).catch(console.error);
