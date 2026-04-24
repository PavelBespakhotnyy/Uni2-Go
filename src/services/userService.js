import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase/firebase";

const ALLOWED_PROFILE_FIELDS = [
    'name', 'surname', 'phone', 'countryCode', 'countryISO', 'dateOfBirth',
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
        // Usamos setDoc con merge: true para asegurar que el documento exista
        await setDoc(docRef, {
            ...safeData,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Error en updateUserProfile:", error);
        throw error;
    }
}

export async function uploadUserAvatar(uid, file) {
    try {
        const storageRef = ref(storage, `avatars/${uid}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        await updateUserProfile(uid, { avatarUrl: downloadURL });
        return downloadURL;
    } catch (error) {
        console.error("Error en uploadUserAvatar:", error);
        throw error;
    }
}

export async function deleteUserAvatar(uid) {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const currentUrl = docSnap.data().avatarUrl;
            
            // Удаляем из Storage только если это внутренняя ссылка Firebase
            if (currentUrl && currentUrl.includes('firebasestorage.googleapis.com')) {
                try {
                    const storageRef = ref(storage, `avatars/${uid}`);
                    await deleteObject(storageRef);
                } catch (e) {
                    console.log("Файл в Storage не найден или уже удален.");
                }
            }
        }

        await updateDoc(docRef, {
            avatarUrl: "",
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error en deleteUserAvatar:", error);
        throw error;
    }
}
