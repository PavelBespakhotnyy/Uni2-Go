import 'dotenv/config';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";

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

async function createChatByCode(friendCode, currentUserUid, currentUserName) {
    const uQuery = query(collection(db, "users"), where("friend_code", "==", friendCode));
    const querySnapshot = await getDocs(uQuery);

    if (querySnapshot.empty) throw new Error("Código no encontrado");

    const friendDoc = querySnapshot.docs[0];
    const friendData = friendDoc.data();
    const friendId = friendDoc.id;

    const cQuery = query(
        collection(db, "chats"), 
        where("participants", "array-contains", currentUserUid)
    );
    const existingChats = await getDocs(cQuery);
    let existingChatId = null;

    existingChats.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(friendId)) {
            existingChatId = doc.id;
        }
    });

    if (existingChatId) return { chatId: existingChatId, friendId, friendName: friendData.name };

    const initialUnreadCount = {};
    initialUnreadCount[currentUserUid] = 0;
    initialUnreadCount[friendId] = 0;

    const newChat = await addDoc(collection(db, "chats"), {
        participants: [currentUserUid, friendId],
        participantNames: [currentUserName, friendData.name],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: null,
        messageCount: 0,
        unreadCount: initialUnreadCount
    });

    return { chatId: newChat.id, friendId, friendName: friendData.name };
}

async function sendMessage(chatId, text, senderId, participants) {
    const chatRef = doc(db, "chats", chatId);
    const messagesRef = collection(db, "chats", chatId, "messages");
    
    const timestamp = serverTimestamp();

    const newMessage = {
        senderId: senderId,
        text: text,
        messageText: text,
        timestamp: timestamp,
        messageType: 'text',
        isDelivered: true,
        isRead: false,
        deliveredAt: timestamp,
        sentAt: timestamp,
        readBy: [senderId],
        reactions: {}
    };

    await addDoc(messagesRef, newMessage);

    const updateData = {
        lastMessage: {
            text: text,
            senderId: senderId,
            timestamp: timestamp,
            readBy: [senderId]
        },
        updatedAt: timestamp,
        messageCount: increment(1)
    };

    participants.forEach(pId => {
        if (pId !== senderId) {
            updateData[`unreadCount.${pId}`] = increment(1);
        }
    });

    await updateDoc(chatRef, updateData);
}

async function test() {
    console.log("Signing in User A...");
    const userCredential = await signInWithEmailAndPassword(auth, "usera@example.com", "Password123!");
    const userA = userCredential.user;
    
    console.log("Searching for User B (friend code: 14277774)...");
    const { chatId, friendId } = await createChatByCode("14277774", userA.uid, "User A");
    console.log("Chat ID:", chatId);

    console.log("Sending message from User A to User B...");
    await sendMessage(chatId, "¡Hola User B! ¿Cómo estás?", userA.uid, [userA.uid, friendId]);
    console.log("Message sent!");

    console.log("Chat test complete.");
}

test().catch(console.error);
