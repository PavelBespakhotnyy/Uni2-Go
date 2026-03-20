import { db } from '../firebase/firebase';
import { 
    collection, query, where, getDocs, addDoc, 
    onSnapshot, orderBy, serverTimestamp, doc, updateDoc, increment, getDoc 
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
            const data = doc.data();
            if (data.participants.includes(friendId)) {
                existingChatId = doc.id;
            }
        });

        if (existingChatId) return existingChatId;

        // 3. Si no existe, crear uno nuevo con el esquema actualizado
        const initialUnreadCount = {};
        initialUnreadCount[currentUser.uid] = 0;
        initialUnreadCount[friendId] = 0;

        const newChat = await addDoc(collection(db, "chats"), {
            participants: [currentUser.uid, friendId],
            participantNames: [currentUser.displayName || currentUser.email, friendData.name],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: null,
            messageCount: 0,
            unreadCount: initialUnreadCount
        });

        return newChat.id;
    }

    async getChatInfo(chatId) {
        try {
            console.log('🔍 Obteniendo información del chat:', chatId);
            const chatRef = doc(db, "chats", chatId);
            const chatSnap = await getDoc(chatRef);
            
            if (!chatSnap.exists()) {
                console.log('❌ Chat no encontrado');
                return null;
            }
            
            const chatData = chatSnap.data();
            console.log('✅ Chat encontrado:', chatData);
            
            return {
                id: chatSnap.id,
                ...chatData
            };
        } catch (error) {
            console.error('❌ Error en getChatInfo:', error);
            throw error;
        }
    }
    
    listenMyChats(userId, callback) {
        const q = query(
            collection(db, "chats"), 
            where("participants", "array-contains", userId),
            orderBy("updatedAt", "desc")
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

    async sendMessage(chatId, text, senderId, participants) {
        const chatRef = doc(db, "chats", chatId);
        const messagesRef = collection(db, "chats", chatId, "messages");
        
        const timestamp = serverTimestamp();

        // 1. Add the message to the subcollection with the full schema
        const newMessage = {
            senderId: senderId,
            text: text, // Existing field
            messageText: text, // New duplicate field as requested
            timestamp: timestamp, // Existing field
            messageType: 'text',
            isDelivered: true,
            isRead: false,
            deliveredAt: timestamp,
            sentAt: timestamp,
            readBy: [senderId],
            reactions: {}
        };

        await addDoc(messagesRef, newMessage);

        // 2. Update the parent chat document
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

        // Update unreadCount for all participants except the sender
        participants.forEach(pId => {
            if (pId !== senderId) {
                updateData[`unreadCount.${pId}`] = increment(1);
            }
        });

        await updateDoc(chatRef, updateData);
    }

    async markAsRead(chatId, userId) {
        const chatRef = doc(db, "chats", chatId);
        const updateData = {};
        updateData[`unreadCount.${userId}`] = 0;
        
        // Note: You might also want to update readBy in lastMessage if the user is not in it
        // and potentially update readBy in individual messages, but this is a good start.
        await updateDoc(chatRef, updateData);
    }
}

export const chatService = new ChatService();
