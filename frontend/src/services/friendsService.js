import { db } from '../firebase/firebase.js';
import {
    collection, query, where, getDocs, addDoc, onSnapshot,
    serverTimestamp, doc, getDoc, deleteDoc, updateDoc, setDoc
} from "firebase/firestore";
import { notificationService } from './notificationService.js';
import { getUserProfile } from './userService.js';

class FriendsService {

    // ── Username ──────────────────────────────────────────────

    async isUsernameTaken(username) {
        const snap = await getDoc(doc(db, "usernames", username.toLowerCase()));
        return snap.exists();
    }

    async reserveUsername(username, uid) {
        await setDoc(doc(db, "usernames", username.toLowerCase()), { uid });
    }

    async searchByUsername(username) {
        const snap = await getDoc(doc(db, "usernames", username.toLowerCase()));
        if (!snap.exists()) throw new Error("Usuario no encontrado");
        const uid = snap.data().uid;
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!userSnap.exists()) throw new Error("Usuario no encontrado");
        return { id: uid, ...userSnap.data() };
    }

    // ── Friend requests ───────────────────────────────────────

    async sendFriendRequest(fromUid, toUid) {
        // Check not already friends or pending
        const existing = await getDocs(query(
            collection(db, "contacts"),
            where("user_id", "==", fromUid),
            where("contact_user_id", "==", toUid)
        ));
        if (!existing.empty) {
            const status = existing.docs[0].data().status;
            if (status === "accepted") throw new Error("Ya sois amigos");
            if (status === "pending") throw new Error("Solicitud ya enviada");
        }

        const docRef = await addDoc(collection(db, "contacts"), {
            user_id: fromUid,
            contact_user_id: toUid,
            status: "pending",
            requested_by: fromUid,
            is_favorite: false,
            notes: "",
            category_ids: [],
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
        });

        // Get sender profile for name
        const sender = await getUserProfile(fromUid);
        const senderName = sender ? `${sender.name || ''} ${sender.surname || ''}`.trim() : 'Un usuario';

        console.log(`Creating notification for friend request from ${fromUid} to ${toUid}`);
        // Send notification
        await notificationService.createNotification(
            toUid,
            'friend_request',
            senderName,
            'te ha enviado una solicitud de amistad',
            { fromUid, contactDocId: docRef.id },
            fromUid
        );
    }

    async acceptFriendRequest(requestDocId, fromUid, toUid) {
        // Update the original request to accepted
        await updateDoc(doc(db, "contacts", requestDocId), {
            status: "accepted",
            updated_at: serverTimestamp(),
        });

        // Create mirror document for the recipient
        const mirrorExists = await getDocs(query(
            collection(db, "contacts"),
            where("user_id", "==", toUid),
            where("contact_user_id", "==", fromUid)
        ));
        if (mirrorExists.empty) {
            await addDoc(collection(db, "contacts"), {
                user_id: toUid,
                contact_user_id: fromUid,
                status: "accepted",
                requested_by: fromUid,
                is_favorite: false,
                notes: "",
                category_ids: [],
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
            });
        }

        // Get acceptor profile for name
        const acceptor = await getUserProfile(toUid);
        const acceptorName = acceptor ? `${acceptor.name || ''} ${acceptor.surname || ''}`.trim() : 'Un usuario';

        console.log(`Creating notification for friend acceptance from ${toUid} to ${fromUid}`);
        // Notify the person who sent the request
        await notificationService.createNotification(
            fromUid,
            'friend_accepted',
            acceptorName,
            'ha aceptado tu solicitud de amistad',
            { acceptorUid: toUid },
            toUid
        );
    }

    async declineFriendRequest(requestDocId) {
        await deleteDoc(doc(db, "contacts", requestDocId));
    }

    async removeFriend(currentUid, friendUid) {
        // Delete both directions
        const q1 = await getDocs(query(
            collection(db, "contacts"),
            where("user_id", "==", currentUid),
            where("contact_user_id", "==", friendUid)
        ));
        const q2 = await getDocs(query(
            collection(db, "contacts"),
            where("user_id", "==", friendUid),
            where("contact_user_id", "==", currentUid)
        ));
        await Promise.all([
            ...q1.docs.map(d => deleteDoc(d.ref)),
            ...q2.docs.map(d => deleteDoc(d.ref)),
        ]);
    }

    // ── Listeners ─────────────────────────────────────────────

    listenMyFriends(userId, callback) {
        const q = query(
            collection(db, "contacts"),
            where("user_id", "==", userId),
            where("status", "==", "accepted")
        );
        return onSnapshot(q, async (snapshot) => {
            const friends = await this._enrichContacts(snapshot.docs, userId);
            callback(friends);
        });
    }

    listenIncomingRequests(userId, callback) {
        const q = query(
            collection(db, "contacts"),
            where("contact_user_id", "==", userId),
            where("status", "==", "pending")
        );
        return onSnapshot(q, async (snapshot) => {
            const requests = await this._enrichContacts(snapshot.docs, userId);
            callback(requests);
        });
    }

    // ── Helpers ───────────────────────────────────────────────

    async _enrichContacts(docs, currentUserId) {
        const results = [];
        for (const d of docs) {
            const data = d.data();
            // Identificar el ID del OTRO usuario
            const otherUid = (data.user_id === currentUserId) ? data.contact_user_id : data.user_id;
            
            try {
                const userSnap = await getDoc(doc(db, "users", otherUid));
                const u = userSnap.exists() ? userSnap.data() : {};
                results.push({
                    contactDocId: d.id,
                    uid: otherUid,
                    name: u.name || '',
                    surname: u.surname || '',
                    username: u.username || '',
                    status: data.status,
                    requested_by: data.requested_by,
                });
            } catch (e) {
                console.error("Error enriching contact:", otherUid, e);
            }
        }
        return results;
    }

    // Get friends list once (for use in chat/grupos/calendar pickers)
    async getFriends(userId) {
        const q = query(
            collection(db, "contacts"),
            where("user_id", "==", userId),
            where("status", "==", "accepted")
        );
        const snap = await getDocs(q);
        return this._enrichContacts(snap.docs, userId);
    }
}

export const friendsService = new FriendsService();

