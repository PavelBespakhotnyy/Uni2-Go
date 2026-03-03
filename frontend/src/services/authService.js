import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export async function registerUser(formData) {
  const {
    email,
    password,
    confirmPassword,
    name,
    surname,
    phone,
    dateOfBirth,
  } = formData;

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    name,
    surname,
    phone,
    dateOfBirth,
    email,
    createdAt: new Date(),
  });

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