import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

export async function getUserProfile(uid) {
    try {
        const docRef = doc(db, "users", uid); // Asegúrate que sea "users"
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data(); 
        } else {
            // En lugar de lanzar un error que bloquee todo, devolvemos null
            console.warn("El documento no existe en Firestore para el UID:", uid);
            return null; 
        }
    } catch (error) {
        console.error("Error en getUserProfile:", error);
        throw error;
    }
}
