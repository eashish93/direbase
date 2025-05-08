import { FirebaseAdmin, FirebaseAuthError, DecodedIdToken } from '@/lib/firebase-admin';

let firebaseAdmin: FirebaseAdmin;

function initFirebaseAdmin() {
  if (firebaseAdmin) {
    return firebaseAdmin; // Already initialized
  }
  console.log('[Middleware] Attempting Firebase Admin initialization...');
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.error('[Middleware] Firebase Admin environment variables missing.');
    throw new Error('Firebase Admin configuration missing in environment variables.');
  }
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;
    firebaseAdmin = new FirebaseAdmin({ projectId, serviceAccount });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Server configuration error during Firebase init: ${message}`);
  }
  return firebaseAdmin;
}


export default initFirebaseAdmin;