import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

const ALLOWED_PROFILE_FIELDS = [
    'name', 'surname', 'phone', 'dateOfBirth',
    'email', 'username', 'avatarUrl', 'bio',
];

export async function getUserProfile(uid) {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.warn("El documento no existe en Firestore para el UID:", uid);
            return null;
        }
    } catch (error) {
        console.error("Error en getUserProfile:", error);
        throw error;
    }
}

export async function updateUserProfile(uid, data) {
    try {
        const safeData = Object.fromEntries(
            Object.entries(data).filter(([key]) => ALLOWED_PROFILE_FIELDS.includes(key))
        );
        if (Object.keys(safeData).length === 0) return;

        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, {
            ...safeData,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error en updateUserProfile:", error);
        throw error;
    }
}
