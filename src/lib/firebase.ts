
import { initializeApp, getApps, getApp, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// A function to safely initialize Firebase and export its services
function initializeFirebase() {
    const isConfigured =
        firebaseConfig.apiKey &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId;

    if (!isConfigured) {
        console.warn(`
        ********************************************************************************
        *                                                                              *
        *           FIREBASE IS NOT CONFIGURED!                                        *
        *                                                                              *
        *   Please add your Firebase project configuration to your .env file           *
        *   to enable authentication and database features.                            *
        *                                                                              *
        ********************************************************************************
        `);
        // Return nulls so the consuming hooks and components can handle the uninitialized state
        return { app: null, auth: null, db: null };
    }

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    return { app, auth, db };
}

const { app, auth, db } = initializeFirebase();

export { app, auth, db };
export type { FirebaseApp, Auth, Firestore };
