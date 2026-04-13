import { db } from '../firebase/firebase.js';
import { 
    collection, query, where, getDocs, addDoc, 
    onSnapshot, orderBy, serverTimestamp, doc, updateDoc, increment, getDoc, deleteDoc 
} from "firebase/firestore";
import { notificationService } from './notificationService.js';

class ChatService {
    async createChatByCode(friendCode, currentUser) {
    console.log("Buscando amigo con código:", friendCode);

    // 1. Buscar al usuario amigo con ese código
    const uQuery = query(collection(db, "users"), where("friend_code", "==", friendCode));
    const querySnapshot = await getDocs(uQuery);

    if (querySnapshot.empty) throw new Error("Código de amigo no encontrado");

    const friendDoc = querySnapshot.docs[0];
    const friendData = friendDoc.data();
    const friendId = friendDoc.id;

        existingChats.forEach(doc => {
            const data = doc.data();
            if (data.participants.includes(friendId)) {
                existingChatId = doc.id;
            }
        });

    if (myDocSnap.exists()) {
        myRealName = myDocSnap.data().name; // Sacamos tu nombre real de tu perfil
    } else {
        // Si no hay perfil en Firestore, intentamos el de Auth
        myRealName = currentUser.displayName || "Usuario";
    }

    // 3. Verificar si ya existe un chat entre ambos
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

        // 3. Si no existe, crear uno nuevo con el esquema actualizado
        const initialUnreadCount = {};
        initialUnreadCount[currentUser.uid] = 0;
        initialUnreadCount[friendId] = 0;

        // Obtener perfil del remitente para nombre completo
        let senderName = currentUser.displayName || currentUser.email;
        try {
            const senderDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (senderDoc.exists()) {
                const sData = senderDoc.data();
                senderName = `${sData.name || ''} ${sData.surname || ''}`.trim() || senderName;
            }
        } catch (e) {
            console.warn("No se pudo obtener el perfil del remitente:", e);
        }

        const friendFullName = `${friendData.name || ''} ${friendData.surname || ''}`.trim() || friendData.name || "Amigo";

        const newChat = await addDoc(collection(db, "chats"), {
            participants: [currentUser.uid, friendId],
            participantNames: [senderName, friendFullName],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: null,
            messageCount: 0,
            unreadCount: initialUnreadCount
        });

        console.log("Envoi de notification de nuevo chat a:", friendId);
        await notificationService.createNotification(
            friendId, 
            'new_chat', 
            senderName, 
            'te ha añadido a un nuevo chat', 
            { chatId: newChat.id },
            currentUser.uid
        );

        return newChat.id;
    }

    async createChatWithUser(friendId, currentUser) {
        // Check if chat already exists
        const cQuery = query(
            collection(db, "chats"),
            where("participants", "array-contains", currentUser.uid)
        );
        const existingChats = await getDocs(cQuery);
        let existingChatId = null;
        existingChats.forEach(d => {
            if (d.data().participants.includes(friendId)) existingChatId = d.id;
        });
        if (existingChatId) return existingChatId;

        const [senderSnap, friendSnap] = await Promise.all([
            getDoc(doc(db, "users", currentUser.uid)),
            getDoc(doc(db, "users", friendId)),
        ]);

        const sData = senderSnap.exists() ? senderSnap.data() : {};
        const fData = friendSnap.exists() ? friendSnap.data() : {};
        const senderName = `${sData.name || ''} ${sData.surname || ''}`.trim() || currentUser.email;
        const friendName = `${fData.name || ''} ${fData.surname || ''}`.trim() || "Amigo";

        const initialUnreadCount = { [currentUser.uid]: 0, [friendId]: 0 };

        const newChat = await addDoc(collection(db, "chats"), {
            participants: [currentUser.uid, friendId],
            participantNames: [senderName, friendName],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: null,
            messageCount: 0,
            unreadCount: initialUnreadCount,
        });

        await notificationService.createNotification(
            friendId, 'new_chat', senderName, 'te ha añadido a un nuevo chat',
            { chatId: newChat.id }, currentUser.uid
        );

        return newChat.id;
    }

    async getChatInfo(chatId) {
        try {
            console.log('Obteniendo informacion del chat:', chatId);
            const chatRef = doc(db, "chats", chatId);
            const chatSnap = await getDoc(chatRef);
            
            if (!chatSnap.exists()) {
                console.log('Chat no encontrado');
                return null;
            }
            
            const chatData = chatSnap.data();
            console.log('Chat encontrado:', chatData);
            
            return {
                id: chatSnap.id,
                ...chatData
            };
        } catch (error) {
            console.error('Error en getChatInfo:', error);
            throw error;
        }
    }
    
    listenMyChats(userId, callback) {
        const q = query(
            collection(db, "chats"), 
            where("participants", "array-contains", userId),
            orderBy("updatedAt", "desc")
        );

        // Retornamos el unsubscribe para poder cerrar la escucha si fuera necesario
        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            callback(chats);
        }, (error) => {
            console.error("Error en listenMyChats:", error);
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
        console.log("Envoi de message au chat:", chatId, "Participants:", participants);
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
            // No enviar notificaciones ni incrementar contador para el remitente
            if (pId === senderId) return;

            updateData[`unreadCount.${pId}`] = increment(1);
            
            console.log(`Creacion de notificacion para el usuario: ${pId}`);
            notificationPromises.push(
                notificationService.createNotification(
                    pId, 
                    'new_message', 
                    senderName || 'Alguien', 
                    `te envió un mensaje: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`, 
                    { chatId },
                    senderId
                )
            );
        });

        await Promise.all([
            updateDoc(chatRef, updateData),
            ...notificationPromises
        ]);
        console.log("Message et notifications traites.");
    }

    async markAsRead(chatId, userId) {
        const chatRef = doc(db, "chats", chatId);
        const updateData = {};
        updateData[`unreadCount.${userId}`] = 0;
        await updateDoc(chatRef, updateData);
    }

    async deleteChat(chatId) {
        console.log("Eliminando chat:", chatId);
        
        // 1. Eliminar mensajes de la subcolección
        const messagesRef = collection(db, "chats", chatId, "messages");
        const messagesSnap = await getDocs(messagesRef);
        const deletePromises = messagesSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        
        // 2. Eliminar el documento del chat
        await deleteDoc(doc(db, "chats", chatId));
        console.log("Chat eliminado por completo");
    }
}

export const chatService = new ChatService();
