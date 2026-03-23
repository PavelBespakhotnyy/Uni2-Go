import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase.js"; // ← ВАЖНО: используем configNew.js

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

  console.log("🚀 Попытка создания пользователя в Firebase Auth:", email);
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = userCredential.user;
  console.log("✅ Пользователь создан в Auth, UID:", user.uid);

  const friend_code = generateFriendshipCode();

  console.log("📝 Запись данных в Firestore (коллекция users)...");
  try {
    await setDoc(doc(db, "users", user.uid), {
      name,
      surname,
      phone,
      dateOfBirth,
      email,
      friend_code,
      isActive: true,
      avatarUrl: "",
      bio: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("✅ Данные успешно записаны в Firestore!");
  } catch (fsError) {
    console.error("❌ Ошибка при записи в Firestore:", fsError);
    throw fsError;
  }

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