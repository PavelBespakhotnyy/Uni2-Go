import { doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase.js";

const HEARTBEAT_MS = 60_000;
const STALE_MS = 3 * 60_000;

export const presenceService = {
  async setOnline(uid) {
    await setDoc(doc(db, "user_profiles", uid), {
      isOnline: true,
      lastSeenAt: serverTimestamp(),
    }, { merge: true });
  },

  async setOffline(uid) {
    await setDoc(doc(db, "user_profiles", uid), {
      isOnline: false,
      lastSeenAt: serverTimestamp(),
    }, { merge: true });
  },

  startHeartbeat(uid) {
    const id = setInterval(() => {
      setDoc(doc(db, "user_profiles", uid), { lastSeenAt: serverTimestamp() }, { merge: true }).catch(() => {});
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  },

  listenUserStatus(uid, callback) {
    return onSnapshot(doc(db, "user_profiles", uid), (snap) => {
      if (!snap.exists()) {
        callback({ isOnline: false, lastSeenAt: null });
        return;
      }
      const data = snap.data();
      const lastSeenAt = data.lastSeenAt?.toDate?.() ?? null;
      const rawOnline = data.isOnline === true;
      const stale = rawOnline && lastSeenAt && Date.now() - lastSeenAt.getTime() > STALE_MS;
      callback({ isOnline: rawOnline && !stale, lastSeenAt });
    });
  },
};
