import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp, runTransaction } from "firebase/firestore";
import { auth, db } from "../firebase/firebase.js";

export async function registerUser(formData) {
  const {
    email,
    password,
    confirmPassword,
    name,
    surname,
    phone,
    countryCode,
    countryISO,
    dateOfBirth,
    username,
  } = formData;

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  if (!username || !username.trim()) throw new Error("username-required");
  const normalizedUsername = username.toLowerCase().trim();
  if (!/^[a-z0-9_\.]{3,20}$/.test(normalizedUsername)) throw new Error("username-invalid");

  sessionStorage.setItem('registering', '1');
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  try {
    // Atomic transaction: check username not taken + reserve it + create user doc
    await runTransaction(db, async (transaction) => {
      const usernameRef = doc(db, "usernames", normalizedUsername);
      const usernameSnap = await transaction.get(usernameRef);
      if (usernameSnap.exists()) {
        throw new Error("username-already-taken");
      }
      transaction.set(usernameRef, { uid: user.uid });
      transaction.set(doc(db, "users", user.uid), {
        name,
        surname,
        phone,
        countryCode,
        countryISO,
        dateOfBirth,
        email,
        username: normalizedUsername,
        isActive: true,
        avatarUrl: "",
        bio: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (fsError) {
    sessionStorage.removeItem('registering');
    // Delete the Auth user to avoid orphaned accounts
    await user.delete().catch(() => {});
    throw fsError;
  }

  sessionStorage.removeItem('registering');
  return user;
}

export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return userCredential.user;
}

export async function logoutUser() {
  await auth.signOut();
}