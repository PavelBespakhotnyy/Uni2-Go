import { db } from '../firebase/firebase.js';
import {
    collection, query, where,
    getDocs, addDoc, onSnapshot, serverTimestamp,
    doc, getDoc, deleteDoc, updateDoc, setDoc, arrayUnion, arrayRemove
} from "firebase/firestore";
import { notificationService } from './notificationService.js';
import { getUserProfile } from './userService.js';

class GruposService {
    listenMyGroups(userId, callback) {
        const q = query(
            collection(db, 'interest_groups'),
            where('member_ids', 'array-contains', userId)
        );

        return onSnapshot(q, (snapshot) => {
            const groups = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(groups);
        }, (error) => {
            console.error("Error en listenMyGroups:", error);
        });
    }

    async getGroupById(groupId) {
        const snap = await getDoc(doc(db, "interest_groups", groupId));
        if (snap.exists()) return { id: snap.id, ...snap.data() };
        return null;
    }

    /**
     * Crea grupo. Guarda member_ids (array para queries) y
     * subcolección members (para rol y fecha de entrada).
     */
    async createGroup(name, description, creatorId, emoji = '👥', memberIds = []) {
        console.log("Creando grupo:", name, "con miembros:", memberIds);
        const allMemberIds = Array.from(new Set([creatorId, ...memberIds]));
        const groupRef = await addDoc(collection(db, "interest_groups"), {
            name,
            description: description || '',
            emoji: emoji || '👥',
            created_by_user_id: creatorId,
            created_at: serverTimestamp(),
            is_private: false,
            cover_image_url: '',
            member_ids: allMemberIds
        });

        // Add creator as admin
        await setDoc(doc(db, "interest_groups", groupRef.id, "members", creatorId), {
            user_id: creatorId,
            role: 'admin',
            joined_at: serverTimestamp()
        });

        // Get creator profile for name
        let creatorName = 'Un usuario';
        try {
            const creatorProfile = await getUserProfile(creatorId);
            if (creatorProfile) {
                creatorName = `${creatorProfile.name || ''} ${creatorProfile.surname || ''}`.trim() || creatorName;
            }
        } catch (e) {
            console.warn("Error getting creator profile:", e);
        }

        // Add other selected members
        for (const mid of memberIds) {
            if (mid !== creatorId) {
                await setDoc(doc(db, "interest_groups", groupRef.id, "members", mid), {
                    user_id: mid,
                    role: 'member',
                    joined_at: serverTimestamp()
                });

                // Send notification
                console.log("Enviando notificación de grupo a:", mid);
                await notificationService.createNotification(
                    mid,
                    'group_invitation',
                    creatorName,
                    `te ha invitado al grupo "${name}"`,
                    { groupId: groupRef.id },
                    creatorId
                ).catch(err => console.error("Error creating group notification:", err));
            }
        }

        return groupRef.id;
    }

    async deleteGroup(groupId) {
        const membersSnap = await getDocs(
            collection(db, "interest_groups", groupId, "members")
        );
        await Promise.all(membersSnap.docs.map(d => deleteDoc(d.ref)));
        await deleteDoc(doc(db, "interest_groups", groupId));
    }

    async updateGroup(groupId, data) {
        await updateDoc(doc(db, "interest_groups", groupId), data);
    }

    /**
     * Devuelve documentos de la subcolección members
     * [{id, user_id, role, joined_at}]
     */
    async getGroupMembers(groupId) {
        const snap = await getDocs(
            collection(db, "interest_groups", groupId, "members")
        );
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    /**
     * Obtiene name/surname/friend_code desde 'users'
     * y thumbnail desde 'user_profiles'.
     */
    async getMemberDetails(userIds) {
        const results = [];
        for (const uid of userIds) {
            try {
                const [userSnap, profileSnap] = await Promise.all([
                    getDoc(doc(db, "users", uid)),
                    getDoc(doc(db, "user_profiles", uid))
                ]);

                const u = userSnap.exists() ? userSnap.data() : {};
                const p = profileSnap.exists() ? profileSnap.data() : {};

                results.push({
                    id: uid,
                    name: u.name || '',
                    surname: u.surname || '',
                    username: u.username || '',
                    thumbnail_url: p.thumbnail_url || p.image_url || ''
                });
            } catch (e) {
                console.error("Error al obtener usuario:", uid, e);
            }
        }
        return results;
    }

    /**
     * Añade miembro por friend_code.
     * Actualiza member_ids (array) y crea doc en subcolección.
     */
    async addMemberByCode(groupId, friendCode, currentUserId) {
        const q = query(collection(db, "users"), where("friend_code", "==", friendCode));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error("No se encontró ningún usuario con ese código");

        const userDoc = snapshot.docs[0];
        const userId = userDoc.id;

        const memberRef = doc(db, "interest_groups", groupId, "members", userId);
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists()) throw new Error("Este usuario ya es miembro del grupo");

        await Promise.all([
            updateDoc(doc(db, "interest_groups", groupId), {
                member_ids: arrayUnion(userId)
            }),
            setDoc(memberRef, {
                user_id: userId,
                role: 'member',
                joined_at: serverTimestamp()
            })
        ]);

        // Send notification
        const [groupSnap, senderProfile] = await Promise.all([
            getDoc(doc(db, "interest_groups", groupId)),
            getUserProfile(currentUserId)
        ]);
        const groupName = groupSnap.exists() ? groupSnap.data().name : 'un grupo';
        const senderName = senderProfile ? `${senderProfile.name || ''} ${senderProfile.surname || ''}`.trim() : 'Un usuario';

        await notificationService.createNotification(
            userId,
            'group_invitation',
            senderName,
            `te ha añadido al grupo "${groupName}"`,
            { groupId: groupId },
            currentUserId
        );

        return { id: userId, ...userDoc.data() };
    }

    async addMemberByUid(groupId, userId, currentUserId) {
        const memberRef = doc(db, "interest_groups", groupId, "members", userId);
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists()) throw new Error("Este usuario ya es miembro del grupo");

        const userSnap = await getDoc(doc(db, "users", userId));
        if (!userSnap.exists()) throw new Error("Usuario no encontrado");

        await Promise.all([
            updateDoc(doc(db, "interest_groups", groupId), { member_ids: arrayUnion(userId) }),
            setDoc(memberRef, { user_id: userId, role: 'member', joined_at: serverTimestamp() })
        ]);

        // Send notification
        const [groupSnap, senderProfile] = await Promise.all([
            getDoc(doc(db, "interest_groups", groupId)),
            getUserProfile(currentUserId)
        ]);
        const groupName = groupSnap.exists() ? groupSnap.data().name : 'un grupo';
        const senderName = senderProfile ? `${senderProfile.name || ''} ${senderProfile.surname || ''}`.trim() : 'Un usuario';

        await notificationService.createNotification(
            userId,
            'group_invitation',
            senderName,
            `te ha añadido al grupo "${groupName}"`,
            { groupId: groupId },
            currentUserId
        );

        return { id: userId, ...userSnap.data() };
    }

    /**
     * Elimina miembro: borra de member_ids y de la subcolección.
     */
    async removeMember(groupId, userId) {
        await Promise.all([
            updateDoc(doc(db, "interest_groups", groupId), {
                member_ids: arrayRemove(userId)
            }),
            deleteDoc(doc(db, "interest_groups", groupId, "members", userId))
        ]);
    }
}

export const gruposService = new GruposService();
