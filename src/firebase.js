// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Basic runtime validation to help diagnose auth/invalid-credential due to bad env vars.
if (process.env.NODE_ENV === 'development') {
  try {
    const missing = Object.entries(firebaseConfig)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length) {
      // eslint-disable-next-line no-console
      console.warn('[Firebase Config] Missing env vars for:', missing.join(', '));
    }
    // eslint-disable-next-line no-console
    console.log('[Firebase Config] Loaded config:', firebaseConfig);
    if (firebaseConfig.authDomain && firebaseConfig.projectId && !firebaseConfig.authDomain.includes(firebaseConfig.projectId)) {
      // eslint-disable-next-line no-console
      console.warn('[Firebase Config] authDomain does not include projectId; verify .env values.');
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[Firebase Config] Debug logging failed:', e);
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { db, auth };