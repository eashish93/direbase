'use server';

import { eq } from 'drizzle-orm';
import initFirebaseAdmin from '@/lib/fireadmin-init';
import db from '@/lib/db';
import { appConfig, OWNER_SETUP_KEY } from '@/drizzle/schema/config'; // Adjust path if needed

interface ActionResult {
  success: boolean;
  message: string;
}

export async function completeOwnerSetup(uid: string | undefined | null): Promise<ActionResult> {
  let firebaseAdmin;
  try {
    firebaseAdmin = initFirebaseAdmin(); // Ensure Firebase Admin is initialized
  } catch (e) {
    console.error("Failed to initialize Firebase Admin in Server Action:", e);
    return { success: false, message: 'Server configuration error (Firebase Admin).' };
  }

  if (!uid || typeof uid !== 'string') {
    return { success: false, message: 'User ID (uid) is required.' };
  }

  try {
    const dbInstance = await db();
    // --- CRITICAL CHECK: Prevent running setup more than once ---
    const existingConfig = await dbInstance.select()
      .from(appConfig)
      .where(eq(appConfig.key, OWNER_SETUP_KEY))
      .limit(1);

    if (existingConfig.length > 0 && existingConfig[0].value === 'true') {
      console.warn(`Attempt to complete setup via action for uid ${uid} when already complete.`);
      return { success: false, message: 'Setup has already been completed.' };
    }
    // --- End Critical Check ---

    // 1. Set Custom Claim using Firebase Admin SDK
    await firebaseAdmin.setCustomUserClaims(uid, { role: 'owner' });
    console.log(`Custom claim { role: 'owner' } set for UID: ${uid}`);

    // 2. Mark setup as complete in D1 database using Drizzle
    // Using upsert logic ensures atomicity if somehow called concurrently (though unlikely here)
    await dbInstance.insert(appConfig)
      .values({ key: OWNER_SETUP_KEY, value: 'true' })
      .onConflictDoUpdate({
          target: appConfig.key,
          set: { value: 'true' }
      });

    console.log(`Owner setup marked as complete in DB for UID: ${uid}`);

    // Optional: Revalidate paths if the setup status affects other rendered pages immediately
    // revalidatePath('/admin/login');
    // revalidatePath('/admin/setup');

    return { success: true, message: 'Owner setup completed successfully.' };

  } catch (error: any) {
    console.error('Error during owner setup completion action:', error);
    let message = `Internal server error: ${error.message}`;
    if (error.code && error.code.startsWith('auth/')) {
        message = `Firebase Auth error: ${error.message}`;
    }
    // Consider trying to revert custom claim if DB update fails? Complex rollback logic.
    return { success: false, message };
  }
}
