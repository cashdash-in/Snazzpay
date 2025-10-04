
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Hardcoded Firebase configuration to definitively resolve API key loading issues.
const firebaseConfig = {
  apiKey: "AIzaSyAuDrR2rGznuMf1EZ1XW_2Ry1SeIm4HrfU",
  authDomain: "snazzpay-djsy0.firebaseapp.com",
  projectId: "snazzpay-djsy0",
  storageBucket: "snazzpay-djsy0.appspot.com",
  messagingSenderId: "594300598004",
  appId: "1:594300598004:web:2f22346cbfa62070fa10a1"
};

// Singleton pattern to initialize Firebase app
function getFirebaseApp(): FirebaseApp {
    if (!getApps().length) {
        return initializeApp(firebaseConfig);
    } else {
        return getApp();
    }
}

const app = getFirebaseApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
