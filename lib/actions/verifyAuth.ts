import 'server-only';
import { headers } from 'next/headers';
import { cache } from 'react';
import initFirebaseAdmin from '@/lib/fireadmin-init';
import { FirebaseError } from 'firebase/app';

async function verifyAuth(checkRevoked: boolean = false) {
  const headerInstance = await headers();
  const token = headerInstance.get('authorization')?.split('Bearer ')?.[1];

  if (!token) throw new Error('User unauthorized - token not found');
  try {
    const firebaseAdmin = initFirebaseAdmin();
    // this is always cached for 24 hr by firebase.
    const decoded = await firebaseAdmin.verifyIdToken(token, checkRevoked);

    return decoded;
  } catch (err) {
    console.error('Error action [verifyAuth]: ', err);
    const e = err as FirebaseError;
    if (e.code !== 'auth/argument-error')
      console.error('Error action [verifyAuth]: ', e.code, e.message);
    throw new Error('User unauthorized - token invalid');
  }
}

// see : https://nextjs.org/blog/security-nextjs-server-components-actions
// cache is not required here though as it is already cached by firebase for 24hr.
export default cache(verifyAuth);
