// Client-only Firebase initialization. Must be imported only from client code
// (useEffect, event handlers, or ClientOnly-wrapped components).
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

function getVal(envVal: unknown, defaultVal: string): string {
  const str = typeof envVal === "string" ? envVal.trim() : "";
  if (!str || str.startsWith("your-")) {
    return defaultVal;
  }
  return str;
}

const firebaseConfig = {
  apiKey: getVal(import.meta.env.VITE_FIREBASE_API_KEY, "AIzaSyBI-wchnFmTp87uvr99_opokr4mIKrvUYQ"),
  authDomain: getVal(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "e-salary-c8614.firebaseapp.com"),
  projectId: getVal(import.meta.env.VITE_FIREBASE_PROJECT_ID, "e-salary-c8614"),
  storageBucket: getVal(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "e-salary-c8614.firebasestorage.app"),
  messagingSenderId: getVal(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "1070339127404"),
  appId: getVal(import.meta.env.VITE_FIREBASE_APP_ID, "1:1070339127404:web:88b021a8bcbcf10c760049"),
  measurementId: getVal(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, "G-ERRPSS2WXT"),
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function getFirebase() {
  if (typeof window === "undefined") {
    throw new Error("Firebase is client-only");
  }
  if (!_app) {
    _app = getApps()[0] ?? initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    void setPersistence(_auth, browserLocalPersistence).catch(() => {});
    _db = getFirestore(_app);
  }
  return { app: _app!, auth: _auth!, db: _db! };
}
