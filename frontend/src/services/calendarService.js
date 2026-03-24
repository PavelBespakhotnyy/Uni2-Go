import { db, auth } from '../firebase/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";

const COLLECTION_NAME = "events";

/**
 * Busca un usuario por su código de amigo.
 * @returns {{ id, name, surname }} o lanza error
 */
export async function findUserByFriendCode(friendCode) {
  const q = query(collection(db, "users"), where("friend_code", "==", friendCode.trim()));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("No se encontró ningún usuario con ese código");
  const d = snap.docs[0];
  const data = d.data();
  return { id: d.id, name: data.name || '', surname: data.surname || '' };
}

/**
 * Adds a new event to Firestore with the updated schema.
 * @param {Object} eventData - The data of the event to be added.
 */
export async function addEvent(eventData) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado");

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      title: eventData.title || "Sin título",
      description: eventData.description || "",
      start: eventData.start instanceof Date ? eventData.start : new Date(eventData.start),
      end: eventData.end instanceof Date ? eventData.end : new Date(eventData.end),
      allDay: eventData.allDay || false,
      userId: user.uid,
      location: eventData.location || "",
      eventType: eventData.eventType || "meeting",
      groupIds: eventData.groupIds || [],
      sharedWith: eventData.sharedWith || [],
      attendees: eventData.attendees || [
        {
          userId: user.uid,
          status: "confirmed",
          role: "organizer"
        }
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al añadir evento a Firebase:", error);
    throw error;
  }
}

/**
 * Updates an existing event in Firestore.
 * @param {string} id - The ID of the event to update.
 * @param {Object} updatedData - The data to update.
 */
export async function updateEvent(id, updatedData) {
  try {
    const eventRef = doc(db, COLLECTION_NAME, id);
    
    // Prepare update object, ensuring dates are converted if provided
    const updatePayload = {
      ...updatedData,
      updatedAt: serverTimestamp()
    };

    if (updatedData.start) {
      updatePayload.start = updatedData.start instanceof Date ? updatedData.start : new Date(updatedData.start);
    }
    if (updatedData.end) {
      updatePayload.end = updatedData.end instanceof Date ? updatedData.end : new Date(updatedData.end);
    }

    await updateDoc(eventRef, updatePayload);
  } catch (error) {
    console.error("Error al actualizar evento en Firebase:", error);
    throw error;
  }
}

/**
 * Deletes an event from Firestore.
 * @param {string} id - The ID of the event to delete.
 */
export async function deleteEvent(id) {
  try {
    const eventRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(eventRef);
  } catch (error) {
    console.error("Error al eliminar evento en Firebase:", error);
    throw error;
  }
}
