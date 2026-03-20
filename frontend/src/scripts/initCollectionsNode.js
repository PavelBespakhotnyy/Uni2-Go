import 'dotenv/config';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function initializeFirebaseCollections() {
  console.log('🚀 Инициализация коллекций в Firebase через Node.js...');
  console.log('📁 Проект:', firebaseConfig.projectId);
  
  try {
    const testUserId = 'node-test-user-' + Date.now();
    
    // 1. Users
    console.log('📁 Создание users...');
    await setDoc(doc(db, 'users', testUserId), {
      name: 'Тест',
      surname: 'Node',
      email: 'node@uni2go.com',
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // 2. Events
    console.log('📁 Создание events...');
    await setDoc(doc(db, 'events', 'node-event-1'), {
      title: 'Событие из Node.js',
      userId: testUserId,
      attendees: [{ userId: testUserId, role: 'organizer', status: 'confirmed' }],
      createdAt: Timestamp.now(),
    });

    // 3. Chats
    console.log('📁 Создание chats...');
    const chatId = 'node-chat-1';
    await setDoc(doc(db, 'chats', chatId), {
      participants: [testUserId, 'user-2'],
      messageCount: 0,
      unreadCount: { [testUserId]: 0, 'user-2': 0 },
      createdAt: Timestamp.now(),
    });

    // 4. Messages
    console.log('📁 Создание messages...');
    await setDoc(doc(db, 'chats', chatId, 'messages', 'node-msg-1'), {
      senderId: testUserId,
      text: 'Привет из Node.js!',
      timestamp: Timestamp.now(),
    });

    console.log('\n✅ Все коллекции успешно созданы в проекте:', firebaseConfig.projectId);
  } catch (error) {
    console.error('❌ Ошибка при создании коллекций:', error);
  }
}

initializeFirebaseCollections();
