import { db, auth } from '../firebase/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { notificationService } from './notificationService.js';

const COLLECTION_NAME = "events";

/**
 * Obtiene datos de un usuario por UID.
 * @returns {{ id, name, surname, username }}
 */
export async function getUserById(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) throw new Error("Usuario no encontrado");
  const data = snap.data();
  return { id: snap.id, name: data.name || '', surname: data.surname || '', username: data.username || '' };
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
    if (eventData.sharedWith && eventData.sharedWith.length > 0) {
      let senderName = user.displayName || user.email;
      try {
        const sender = await getUserById(user.uid);
        senderName = `${sender.name} ${sender.surname}`.trim() || senderName;
      } catch (e) {}

      const eventDate = eventData.start instanceof Date ? eventData.start : new Date(eventData.start);

      for (const uid of eventData.sharedWith) {
        await notificationService.createNotification(
          uid,
          'calendar_share',
          senderName,
          `ha compartido un evento contigo: "${eventData.title || 'Sin título'}"`,
          { eventId: docRef.id, eventDate: eventDate.toISOString() },
          user.uid
        );
      }
    }

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
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado");

  try {
    const eventRef = doc(db, COLLECTION_NAME, id);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error("Evento no encontrado");
    if (eventSnap.data().userId !== user.uid) throw new Error("No autorizado");

    // Detect changes in sharedWith
    const prevShared = eventSnap.data().sharedWith || [];
    const newShared = updatedData.sharedWith !== undefined ? updatedData.sharedWith : prevShared;
    const addedUids = newShared.filter(uid => !prevShared.includes(uid));
    const removedUids = prevShared.filter(uid => !newShared.includes(uid));

    if (addedUids.length > 0 || removedUids.length > 0) {
      let senderName = user.displayName || user.email;
      try {
        const sender = await getUserById(user.uid);
        senderName = `${sender.name} ${sender.surname}`.trim() || senderName;
      } catch (_) {}

      const eventTitle = eventSnap.data().title || 'Sin título';
      const eventDate = eventSnap.data().start?.toDate
        ? eventSnap.data().start.toDate().toISOString()
        : updatedData.start instanceof Date
          ? updatedData.start.toISOString()
          : null;

      for (const uid of addedUids) {
        notificationService.createNotification(
          uid,
          'calendar_share',
          senderName,
          `ha compartido un evento contigo: "${eventTitle}"`,
          { eventId: id, eventDate },
          user.uid
        ).catch(() => {});
      }

      for (const uid of removedUids) {
        notificationService.createNotification(
          uid,
          'event_removed',
          senderName,
          `te ha eliminado del evento "${eventTitle}"`,
          {},
          user.uid
        ).catch(() => {});
      }
    }

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
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado");
  if (!id || typeof id !== 'string') throw new Error("ID de evento no válido");

  try {
    const eventRef = doc(db, COLLECTION_NAME, id);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error("Evento no encontrado");
    if (eventSnap.data().userId !== user.uid) throw new Error("No autorizado");

    await deleteDoc(eventRef);
  } catch (error) {
    console.error("Error al eliminar evento en Firebase:", error);
    throw error;
  }
}
