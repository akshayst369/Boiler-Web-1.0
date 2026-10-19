import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAheDhPYjRP-yfiC0cDG-A4qLS56hSCfbE",
  authDomain: "smartboiler369.firebaseapp.com",
  projectId: "smartboiler369",
  storageBucket: "smartboiler369.firebasestorage.app",
  messagingSenderId: "879758797783",
  appId: "1:879758797783:web:f4ae62cf46525e71707992",
  measurementId: "G-RYBF9QVR63"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;