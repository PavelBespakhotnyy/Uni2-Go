/**
 * Side-effect script that logs a Firebase connection test message.
 */
import { auth, db } from '../firebase/firebase';

console.log("Firebase connection test initialized.");
console.log("Auth initialized:", auth !== undefined);
console.log("Firestore initialized:", db !== undefined);
