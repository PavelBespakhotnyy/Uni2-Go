import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

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
        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error en updateUserProfile:", error);
        throw error;
    }
}
