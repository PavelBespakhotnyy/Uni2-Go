import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));

  if (!snap.exists()) {
    throw new Error("User not found");
  }

  return snap.data();
}
