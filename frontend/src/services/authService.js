import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase.js";
import { friendsService } from "./friendsService.js";

export async function registerUser(formData) {
  const {
    email,
    password,
    confirmPassword,
    name,
    surname,
    phone,
    dateOfBirth,
    username,
  } = formData;

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  if (!username || !username.trim()) throw new Error("username-required");
  const normalizedUsername = username.toLowerCase().trim();
  if (!/^[a-z0-9_\.]{3,20}$/.test(normalizedUsername)) throw new Error("username-invalid");

  const taken = await friendsService.isUsernameTaken(normalizedUsername);
  if (taken) throw new Error("username-already-taken");

  sessionStorage.setItem('registering', '1');
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  try {
    await Promise.all([
      setDoc(doc(db, "users", user.uid), {
        name,
        surname,
        phone,
        dateOfBirth,
        email,
        username: normalizedUsername,
        isActive: true,
        avatarUrl: "",
        bio: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      friendsService.reserveUsername(normalizedUsername, user.uid),
    ]);
  } catch (fsError) {
    sessionStorage.removeItem('registering');
    await signOut(auth);
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