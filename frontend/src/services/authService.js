import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

function generateFriendshipCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

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

  const friend_code = generateFriendshipCode();

  await setDoc(doc(db, "users", user.uid), {
    name,
    surname,
    phone,
    dateOfBirth,
    email,
    friend_code,
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