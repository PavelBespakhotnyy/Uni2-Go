import { db } from "../firebase/firebase.js";
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    onSnapshot,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    where,
    setDoc
} from "firebase/firestore";

const LISTS_COLLECTION = "shopping_lists";
const NOTES_COLLECTION = "user_notes";

export const shoppingService = {
    // Get all lists for a user
    async getUserLists(uid) {
        try {
            const q = query(collection(db, LISTS_COLLECTION), where("user_id", "==", uid));
            const querySnapshot = await getDocs(q);
            const lists = {};
            querySnapshot.forEach((doc) => {
                lists[doc.id] = { id: doc.id, ...doc.data() };
            });
            return lists;
        } catch (error) {
            console.error("Error getting user lists:", error);
            throw error;
        }
    },

    // Save or update a single list
    async saveList(uid, listId, listData) {
        try {
            const dataToSave = {
                ...listData,
                user_id: uid,
                updated_at: serverTimestamp()
            };
            
            if (!dataToSave.created_at) {
                dataToSave.created_at = serverTimestamp();
            }

            if (listId && listId.startsWith('list-')) {
                // It's a temporary local ID, create new doc
                const docRef = await addDoc(collection(db, LISTS_COLLECTION), dataToSave);
                return docRef.id;
            } else {
                // Update existing doc
                const docRef = doc(db, LISTS_COLLECTION, listId);
                await setDoc(docRef, dataToSave, { merge: true });
                return listId;
            }
        } catch (error) {
            console.error("Error saving list:", error);
            throw error;
        }
    },

    async deleteList(listId, uid) {
        try {
            const docRef = doc(db, LISTS_COLLECTION, listId);
            if (uid) {
                const snap = await getDoc(docRef);
                if (snap.exists() && snap.data().user_id !== uid) {
                    throw new Error("No autorizado para eliminar esta lista");
                }
            }
            await deleteDoc(docRef);
        } catch (error) {
            console.error("Error deleting list:", error);
            throw error;
        }
    },

    // Notes management (individual documents)
    async getUserNotes(uid) {
        try {
            const q = query(collection(db, NOTES_COLLECTION), where("user_id", "==", uid));
            const querySnapshot = await getDocs(q);
            const notes = {};
            querySnapshot.forEach((doc) => {
                notes[doc.id] = { id: doc.id, ...doc.data() };
            });
            return notes;
        } catch (error) {
            console.error("Error getting user notes:", error);
            throw error;
        }
    },

    async saveNote(uid, noteId, noteData) {
        try {
            
            const dataToSave = {
                ...noteData,
                user_id: uid,
                updated_at: serverTimestamp()
            };
            
            if (!dataToSave.created_at) {
                dataToSave.created_at = serverTimestamp();
            }

            if (noteId && noteId.startsWith('note-')) {
                const docRef = await addDoc(collection(db, NOTES_COLLECTION), dataToSave);
                return docRef.id;
            } else {
                const docRef = doc(db, NOTES_COLLECTION, noteId);
                await setDoc(docRef, dataToSave, { merge: true });
                return noteId;
            }
        } catch (error) {
            console.error("Error saving note:", error);
            throw error;
        }
    },

    async deleteNote(noteId, uid) {
        try {
            const docRef = doc(db, NOTES_COLLECTION, noteId);
            if (uid) {
                const snap = await getDoc(docRef);
                if (snap.exists() && snap.data().user_id !== uid) {
                    throw new Error("No autorizado para eliminar esta nota");
                }
            }
            await deleteDoc(docRef);
        } catch (error) {
            console.error("Error deleting note:", error);
            throw error;
        }
    }
};
