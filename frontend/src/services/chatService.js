import { db } from '../firebase/firebase';
import { 
    collection, query, where, getDocs, addDoc, 
    onSnapshot, orderBy, serverTimestamp, doc, getDoc, deleteDoc, writeBatch 
} from "firebase/firestore";

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

    if (friendId === currentUser.uid) throw new Error("No puedes chatear contigo mismo");

    // 2. BUSCAR MI PROPIO NOMBRE en la colección 'users' (Para evitar el "Usuario")
    const myDocRef = doc(db, "users", currentUser.uid);
    const myDocSnap = await getDoc(myDocRef);
    let myRealName = "Usuario";

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

    if (existingChatId) return existingChatId;

    // 4. CREACIÓN DEL CHAT CON NOMBRES REALES
    const friendName = friendData.name || "Amigo";

    try {
        const newChatData = {
            participants: [currentUser.uid, friendId],
            participantNames: [myRealName, friendName], // <--- Ahora myRealName tendrá tu nombre de Firestore
            createdAt: serverTimestamp(),
            lastMessage: ""
        };

        const docRef = await addDoc(collection(db, "chats"), newChatData);
        console.log(" Chat creado con ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error al crear documento en Firestore:", error);
        throw error;
    }
}
listenMyChats(userId, callback) {
        // Importante: Asegúrate de tener acceso a 'db' y las funciones de firestore aquí
        const q = query(
            collection(db, "chats"), 
            where("participants", "array-contains", userId)
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

   async sendMessage(chatId, text, senderId) {
    // 1. Validaciones de seguridad para evitar el error de 'undefined'
    if (!chatId) {
        console.error("Error: chatId es undefined");
        return;
    }
    if (!senderId) {
        console.error("Error: senderId es undefined");
        return;
    }
    if (!text || text.trim() === "") {
        console.error("Error: El texto está vacío");
        return;
    }

    try {
        const messagesRef = collection(db, "chats", chatId, "messages");
        
        // 2. Solo enviamos datos si estamos seguros de que existen
        await addDoc(messagesRef, {
            text: text,
            senderId: senderId,
            timestamp: serverTimestamp() // Usar siempre el del servidor
        });
        
        console.log("Mensaje guardado correctamente en Firebase");
    } catch (e) {
        console.error("Error al ejecutar addDoc:", e);
    }
}
    async deleteChat(chatId) {
        if (!chatId) return;

        try {
            // 1. Opcional: Borrar la subcolección de mensajes primero
            // Nota: Firestore no borra subcolecciones automáticamente al borrar el padre
            const messagesRef = collection(db, "chats", chatId, "messages");
            const messagesSnap = await getDocs(messagesRef);
            
            const batch = writeBatch(db);
            messagesSnap.forEach((msgDoc) => {
                batch.delete(msgDoc.ref);
            });
            await batch.commit();

            // 2. Borrar el documento principal del chat
            const chatRef = doc(db, "chats", chatId);
            await deleteDoc(chatRef);
            
            console.log(`Chat ${chatId} y sus mensajes eliminados.`);
        } catch (error) {
            console.error("Error al eliminar el chat de Firebase:", error);
            throw error;
        }
    }



}

export const chatService = new ChatService();