import { db } from '../firebase/firebase.js';
import { 
    collection, query, where, getDocs, addDoc, 
    onSnapshot, orderBy, serverTimestamp, doc, updateDoc, increment, getDoc 
} from "firebase/firestore";
import { notificationService } from './notificationService.js';

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

        const senderName = currentUser.displayName || currentUser.email;

        const newChat = await addDoc(collection(db, "chats"), {
            participants: [currentUser.uid, friendId],
            participantNames: [senderName, friendData.name],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: null,
            messageCount: 0,
            unreadCount: initialUnreadCount
        });

        console.log("📨 Envoi de notification de nuevo chat à:", friendId);
        await notificationService.createNotification(
            friendId, 
            'new_chat', 
            senderName, 
            'te ha añadido a un nuevo chat', 
            { chatId: newChat.id }
        );

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

    async sendMessage(chatId, text, senderId, participants, senderName) {
        console.log("📤 Envoi de message au chat:", chatId, "Participants:", participants);
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

        const notificationPromises = [];
        const targetParticipants = (participants && participants.length > 0) ? participants : [];

        targetParticipants.forEach(pId => {
            // ВРЕМЕННО: Убрал проверку (pId !== senderId), чтобы вы видели уведомление сами
            updateData[`unreadCount.${pId}`] = increment(1);
            
            console.log(`🔔 Создание уведомления для пользователя: ${pId}`);
            notificationPromises.push(
                notificationService.createNotification(
                    pId, 
                    'new_message', 
                    senderName || 'Alguien', 
                    `te envió un mensaje: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`, 
                    { chatId }
                )
            );
        });

        await Promise.all([
            updateDoc(chatRef, updateData),
            ...notificationPromises
        ]);
        console.log("✅ Message et notifications traités.");
    }

    async markAsRead(chatId, userId) {
        const chatRef = doc(db, "chats", chatId);
        const updateData = {};
        updateData[`unreadCount.${userId}`] = 0;
        await updateDoc(chatRef, updateData);
    }
}

export const chatService = new ChatService();
