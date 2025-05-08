import { FirebaseOptions, FirebaseApp, initializeApp, getApp } from 'firebase/app';

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  // storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
const defaultAppName = '[DEFAULT]'; // as per firebase docs.
export const getFirebaseApp = (name?: string, cf: FirebaseOptions = config) => {
  // handle HMR also, so to avoid emulator hang.
  // extending global type.
  // let globalE = global as typeof globalThis & { emulatorStarted?: boolean};
  // if(!isDev) {
  try {
    // Don't use ?? operator, as it will not work with '' string.
    app = getApp(name || defaultAppName);
  } catch {
    app = initializeApp(cf, name || defaultAppName);
    console.log('Firebase initialize app: ', cf);
  }

  return app;
};
