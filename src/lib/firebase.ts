
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// A function to safely initialize Firebase
function initializeFirebase() {
    // Check if all necessary environment variables are set.
    // This prevents the app from crashing on the server or client if the keys are missing.
    if (
        !firebaseConfig.apiKey ||
        !firebaseConfig.authDomain ||
        !firebaseConfig.projectId
    ) {
        console.warn(`
        ********************************************************************************
        *                                                                              *
        *           FIREBASE IS NOT CONFIGURED!                                        *
        *                                                                              *
        *   Please add your Firebase project configuration to your environment         *
        *   variables to enable authentication and database features.                  *
        *                                                                              *
        *   You can get these values from your Firebase project settings.              *
        *                                                                              *
        ********************************************************************************
        `);
        // Return nulls so the app doesn't crash
        return { app: null, auth: null, db: null };
    }

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    return { app, auth, db };
}

const { app, auth, db } = initializeFirebase();

export { app, auth, db };
