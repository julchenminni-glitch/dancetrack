import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZVzBHVnOJWd7Y-259Jfsj-Wg8a1JxEJk",
  authDomain: "dancetrack-13173.firebaseapp.com",
  projectId: "dancetrack-13173",
  storageBucket: "dancetrack-13173.firebasestorage.app",
  messagingSenderId: "1082378016928",
  appId: "1:1082378016928:web:734a9d6b4b409c846591c5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);



export default app;