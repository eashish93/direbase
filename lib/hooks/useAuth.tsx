'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  onIdTokenChanged,
  UserMetadata,
  ParsedToken,
  Auth,
} from 'firebase/auth';
import React from 'react';
import { getFirebaseApp } from '../firebase-client';

export type IUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  token: string | null;
  emailVerified: boolean;
  metadata: UserMetadata;
  claims: ParsedToken;
};

type IContext = {
  user: IUser;
  loadingUser: boolean;
  auth: Auth | null;
};

const AuthContext = createContext<IContext>({
  user: {} as IUser,
  loadingUser: true,
  auth: null,
});

/** NOTE: check for auth routes will be done from server side. */

export function AuthProvider({
  children,
  tenantId = null,
}: {
  children: React.ReactNode;
  tenantId?: string | null;
}) {
  const [user, setUser] = useState<IUser>({} as IUser);
  const [loadingUser, setLoadingUser] = useState(true);
  // force refresh token, when reload=true. Handy way to propagate new custom claims to client.
  // see this: https://github.com/vercel/next.js/discussions/61654#discussioncomment-8423042
  // const reload = !!searchParams?.get('reload'); // do not use, otherwise we have to use suspense boundary.

  // app name is same as tenantId. Make sure service worker also has same tenantId and app name.
  // [DEFAULT] is default name of app by firebase. App name can't be null.
  // Don't use ?? operator, as it will not work with '' string.
  const app = getFirebaseApp(tenantId || '[DEFAULT]');
  const auth = getAuth(app);
  // Using multi-tenant. Default is [DEFAULT] tenant, if null provided.
  auth.tenantId = tenantId;

  useEffect(() => {
    const params = new URLSearchParams(document.location.search);
    const reload = !!params.get('reload');
    // init firebase here, as this will be used as a provider.
    // Using onIdTokenChanged instead of onAuthStateChanged, as it will also trigger on token refresh + sign/signout event.
    const unsub = onIdTokenChanged(auth, async (user) => {
      try {
        if (!user) {
          setUser({} as IUser);
          return;
        }
        console.log('User [useAuth]:', user?.toJSON());

        const result = await user.getIdTokenResult(reload);

        // console.log('Result: ', result);
        setUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          token: result.token,
          emailVerified: user.emailVerified,
          metadata: user.metadata,
          claims: result.claims,
        });
      } catch (e) {
        console.error('Error [onAuthStateChanged]: ', e);
      } finally {
        setLoadingUser(false);
      }
    });

    // Unsubscribe auth listener on unmount
    return () => unsub();
  }, [auth]);

  return (
    <AuthContext.Provider value={{ user, loadingUser, auth }}>{children}</AuthContext.Provider>
  );
}

const useAuth = () => {
  return useContext(AuthContext);
};

export default useAuth;
