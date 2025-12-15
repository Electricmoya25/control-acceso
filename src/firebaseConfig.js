import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// PEGA AQUÍ LO QUE COPIASTE DE LA WEB DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBYk67toyrDHTdYOS5tcs8duIeqE90WSdk",
  authDomain: "club-acceso.firebaseapp.com",
  projectId: "club-acceso",
  storageBucket: "club-acceso.firebasestorage.app",
  messagingSenderId: "1086283434634",
  appId: "1:1086283434634:web:7edf1dc05da31f9763bb73"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);