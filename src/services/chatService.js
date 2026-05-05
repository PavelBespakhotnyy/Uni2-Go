import { db } from '../firebase/firebase.js';
import {
    collection, query, where, getDocs, addDoc,
    onSnapshot, orderBy, serverTimestamp, doc, updateDoc, increment, getDoc, deleteDoc, limit
} from "firebase/firestore";
import { notificationService } from './notificationService.js';

class ChatService {
    async createChatByCode(friendCode, currentUser) {
        // 1. Find user by friend code
        const uQuery = query(collection(db, "users"), where("friend_code", "==", friendCode));
        const querySnapshot = await getDocs(uQuery);
        if (querySnapshot.empty) throw new Error("Código de amigo no encontrado");

        const friendDoc = querySnapshot.docs[0];
        const friendData = friendDoc.data();
        const friendId = friendDoc.id;

        // 2. Check if chat already exists
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

        // 3. Get sender name
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

        const friendFullName = `${friendData.name || ''} ${friendData.surname || ''}`.trim() || "Amigo";

        // 4. Create new chat
        const newChat = await addDoc(collection(db, "chats"), {
            participants: [currentUser.uid, friendId],
            participantNames: [senderName, friendFullName],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: null,
            messageCount: 0,
            unreadCount: { [currentUser.uid]: 0, [friendId]: 0 },
        });

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

    async sendMessage(chatId, text, senderId, participants, senderName, messageType = 'text', gifUrl = null) {
        console.log("Envoi de message au chat:", chatId, "Participants:", participants);
        const chatRef = doc(db, "chats", chatId);
        const messagesRef = collection(db, "chats", chatId, "messages");
        
        const timestamp = serverTimestamp();

        const newMessage = {
            senderId: senderId,
            text: text,
            messageText: text,
            timestamp: timestamp,
            messageType: messageType,
            isDelivered: true,
            isRead: false,
            deliveredAt: timestamp,
            sentAt: timestamp,
            readBy: [senderId],
            reactions: {}
        };

        if (messageType === 'gif' && gifUrl) {
            newMessage.gifUrl = gifUrl;
        }

        const msgRef = await addDoc(messagesRef, newMessage);

        const updateData = {
            lastMessage: {
                text: messageType === 'gif' ? 'Sent a GIF' : text,
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
            const notificationText = messageType === 'gif' 
                ? 'te envió un GIF' 
                : `te envió un mensaje: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`;

            notificationPromises.push(
                notificationService.createNotification(
                    pId, 
                    'new_message', 
                    senderName || 'Alguien', 
                    notificationText, 
                    { chatId, messageId: msgRef.id },
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

    async sendGif(chatId, gifUrl, senderId, participants, senderName) {
        return this.sendMessage(chatId, '[GIF]', senderId, participants, senderName, 'gif', gifUrl);
    }

    async markAsRead(chatId, userId) {
        const chatRef = doc(db, "chats", chatId);
        const updateData = {};
        updateData[`unreadCount.${userId}`] = 0;
        updateData[`lastReadAt.${userId}`] = serverTimestamp();
        await updateDoc(chatRef, updateData);
    }

    async findChatWithUser(myUid, otherUid) {
        const cQuery = query(
            collection(db, "chats"),
            where("participants", "array-contains", myUid)
        );
        const snapshot = await getDocs(cQuery);
        let chatId = null;
        snapshot.forEach(d => {
            if (d.data().participants.includes(otherUid)) chatId = d.id;
        });
        return chatId;
    }

    async deleteMessage(chatId, messageId, senderId, participants) {
        // Delete the message — this is the critical operation
        await deleteDoc(doc(db, "chats", chatId, "messages", messageId));

        // Cleanup independently — failures don't roll back the delete
        this._afterDeleteMessage(chatId, messageId, senderId, participants).catch(() => {});
    }

    async _afterDeleteMessage(chatId, messageId, senderId, participants) {
        const chatRef = doc(db, "chats", chatId);

        // Update lastMessage in chat
        const lastSnap = await getDocs(query(
            collection(db, "chats", chatId, "messages"),
            orderBy("timestamp", "desc"),
            limit(1)
        ));
        if (lastSnap.empty) {
            await updateDoc(chatRef, { lastMessage: null }).catch(() => {});
        } else {
            const d = lastSnap.docs[0].data();
            await updateDoc(chatRef, {
                lastMessage: {
                    text: d.text || d.messageText || '',
                    senderId: d.senderId,
                    timestamp: d.timestamp,
                    readBy: d.readBy || []
                }
            }).catch(() => {});
        }

        // Delete matching notifications — query by senderId so Firestore rule passes
        if (senderId) {
            try {
                const notifSnap = await getDocs(query(
                    collection(db, "notifications"),
                    where("senderId", "==", senderId)
                ));
                const toDelete = notifSnap.docs.filter(d => d.data().messageId === messageId);
                await Promise.all(toDelete.map(d => deleteDoc(d.ref)));
            } catch (_) {}
        }
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
