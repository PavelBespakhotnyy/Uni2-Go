import 'dotenv/config';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function generateFriendshipCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

async function register(email, password, name) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const friend_code = generateFriendshipCode();

    await setDoc(doc(db, "users", user.uid), {
      name,
      surname: "Tester",
      phone: "123-456-789",
      dateOfBirth: "2000-01-01",
      email,
      friend_code,
      isActive: true,
      avatarUrl: "",
      bio: "Test user",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`User created: ${name} (${email}), UID: ${user.uid}, Friend Code: ${friend_code}`);
    return { uid: user.uid, friend_code };
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log(`User ${email} already exists.`);
    } else {
      console.error(`Error creating user ${email}:`, error.message);
    }
  }
}

async function main() {
  const userA = await register("usera@example.com", "Password123!", "User A");
  const userB = await register("userb@example.com", "Password123!", "User B");
}

main().catch(console.error);
