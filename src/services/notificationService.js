import { db } from '../firebase/firebase.js';
import { 
    collection, query, where, addDoc, 
    onSnapshot, orderBy, serverTimestamp, doc, updateDoc, deleteDoc 
} from "firebase/firestore";

class NotificationService {
    async createNotification(userId, type, senderName, action, data = {}, senderId = null) {
        // No enviar notificaciones a uno mismo
        if (senderId && userId === senderId) {
            return;
        }

        try {
            const docRef = await addDoc(collection(db, "notifications"), {
                userId,
                senderId: senderId || null,
                type,
                senderName,
                action,
                data,
                messageId: data.messageId || null,
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Erreur lors de la création de la notification:", error);
        }
    }

    listenMyNotifications(userId, callback) {
        const q = query(
            collection(db, "notifications"), 
            where("userId", "==", userId)
            // orderBy removed to avoid needing a composite index for now
        );
        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(notifications);
        }, (error) => {
            console.error("Erreur dans listenMyNotifications:", error);
        });
    }

    async markAsRead(notificationId) {
        try {
            const ref = doc(db, "notifications", notificationId);
            await updateDoc(ref, { read: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    }

    async markAsUnread(notificationId) {
        try {
            const ref = doc(db, "notifications", notificationId);
            await updateDoc(ref, { read: false, interacted: true });
        } catch (error) {
            console.error("Error marking notification as unread:", error);
        }
    }

    async deleteNotification(notificationId) {
        try {
            const ref = doc(db, "notifications", notificationId);
            await deleteDoc(ref);
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    }
}

export const notificationService = new NotificationService();
