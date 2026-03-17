import { db } from '../firebase/firebase'; // Tu configuración de Firebase
import { 
    collection, query, where, getDocs, addDoc, 
    onSnapshot, orderBy, serverTimestamp, doc, getDoc 
} from "firebase/firestore";

class ChatService {
    // Busca un usuario por código y crea un chat si no existe
    async createChatByCode(friendCode, currentUser) {
        // 1. Buscar al usuario con ese código
        const uQuery = query(collection(db, "users"), where("friend_code", "==", friendCode));
        const querySnapshot = await getDocs(uQuery);

        if (querySnapshot.empty) throw new Error("Código no encontrado");

        const friendDoc = querySnapshot.docs[0];
        const friendData = friendDoc.data();
        const friendId = friendDoc.id;

        // 2. Verificar si ya existe un chat entre ambos
        const cQuery = query(
            collection(db, "chats"), 
            where("participants", "array-contains", currentUser.uid)
        );
        const existingChats = await getDocs(cQuery);
        let existingChatId = null;

        existingChats.forEach(doc => {
            if (doc.data().participants.includes(friendId)) {
                existingChatId = doc.id;
            }
        });

        if (existingChatId) return existingChatId;

        // 3. Si no existe, crear uno nuevo
        const newChat = await addDoc(collection(db, "chats"), {
            participants: [currentUser.uid, friendId],
            participantNames: [currentUser.displayName, friendData.name], // Útil para la UI
            createdAt: serverTimestamp()
        });

        return newChat.id;
    }
    
    listenMyChats(userId, callback) {
        
        const q = query(
            collection(db, "chats"), 
            where("participants", "array-contains", userId)
        );
        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(chats);
        });
    }

    // Escuchar mensajes en tiempo real
    listenMessages(chatId, callback) {
        const q = query(
            collection(db, `chats/${chatId}/messages`), 
            orderBy("timestamp", "asc")
        );
        return onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(msgs);
        });
    }

    async sendMessage(chatId, text, senderId) {
    const messagesRef = collection(db, "chats", chatId, "messages");
    
    await addDoc(messagesRef, {
        text: text,                // El texto que escribió el usuario
        senderId: senderId,        // El ID del usuario actual
        timestamp: serverTimestamp(), // Hora oficial del servidor de Google
        type: 'text'               // Por si luego quieres añadir fotos o audios
    });
}
}

export const chatService = new ChatService();