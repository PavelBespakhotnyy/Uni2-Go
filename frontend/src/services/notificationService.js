import { db } from '../firebase/firebase.js';
import { 
    collection, query, where, addDoc, 
    onSnapshot, orderBy, serverTimestamp, doc, updateDoc, deleteDoc 
} from "firebase/firestore";

class NotificationService {
    async createNotification(userId, type, senderName, action, data = {}) {
        console.log(`🚀 Tentative de création de notification pour ${userId}:`, { type, senderName, action });
        try {
            const docRef = await addDoc(collection(db, "notifications"), {
                userId,
                type,
                senderName,
                action,
                data,
                read: false,
                createdAt: serverTimestamp()
            });
            console.log("✅ Notification créée avec ID:", docRef.id);
        } catch (error) {
            console.error("❌ Erreur lors de la création de la notification:", error);
        }
    }

    listenMyNotifications(userId, callback) {
        console.log("👂 Démarrage de l'écoute des notifications pour:", userId);
        const q = query(
            collection(db, "notifications"), 
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );
        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`📥 Mise à jour des notifications (${notifications.length} reçues)`);
            callback(notifications);
        }, (error) => {
            console.error("❌ Erreur dans listenMyNotifications:", error);
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
            await updateDoc(ref, { read: false });
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
