import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB7JDFjPSb2UNHZldQsiCLesjQt0hS3_fs",
  authDomain: "softstore-aac2d.firebaseapp.com",
  projectId: "softstore-aac2d",
  storageBucket: "softstore-aac2d.firebasestorage.app",
  messagingSenderId: "616685633752",
  appId: "1:616685633752:web:2dcc343dad3d6d2fac57ad",
  measurementId: "G-PX5SCYVQLX"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
