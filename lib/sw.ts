/// <reference lib="webworker" />
declare let clients: Clients;
declare let self: ServiceWorkerGlobalScope;

import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  onAuthStateChanged,
  getIdToken,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
} from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

/** Initialize Firebase App */
const app = initializeApp(config);

// reduce bloating. customized version.
/** https://github.com/TomokiMiyauci/me/blob/next/src/workers/util/firebase_init.ts */
const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

/**
 * Returns a promise that resolves with an ID token if available.
 * @return {!Promise<?string>} The promise that resolves with an ID token if
 *     available. Otherwise, the promise resolves with null.
 */
const getIdTokenPromise = (): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        getIdToken(user).then(
          (idToken) => {
            resolve(idToken);
          },
          (error) => {
            resolve(null);
          }
        );
      } else {
        resolve(null);
      }
    });
  });
};

// Send Request with token.
const makeAuthRequest = (req: Request, idToken: string): Request => {
  try {
    const headers = new Headers();
    req.headers.forEach((val, key) => {
      headers.append(key, val);
    });
    headers.append('Authorization', `Bearer ${idToken}`);
    const request = new Request(req, {
      headers,
      mode: 'same-origin',
    });
    return request;
  } catch (e) {
    // This will fail for CORS requests. We just continue with the
    // fetch caching logic below and do not pass the ID token.
    // simply return the original request.
    return req;
  }
};

// extra whitelist urls.
// const whitelist = ['https://firestore.googleapis.com'];
// NOTE: Using \ (escape) character for . (dot) in regex here important, otherwise, it will also skip route like this: /foo/barjsf . (note: js inside `barjsf` here).
// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match#a_non-regexp_as_the_parameter
const regexExclude =
  /\/((?!_next|[^.]*\.(?:png|webp|avif|svg|jpeg|jpg|ico|gif|pdf|txt|json|xml|htm|html|css|scss|js|woff2|woff)).*)/;

self.addEventListener('fetch', (ev: FetchEvent) => {
  const url = new URL(ev.request.url);
  let req = ev.request;
  // Exclude regex. (with exclude all paths starting with _next, and all static files)
  if (!url.pathname.match(regexExclude) || url.pathname.startsWith('/_next')) return;
  // exclude all other origins
  if (self.location.origin !== url.origin) return;

  const requestProcessor = (idToken: string | null): Promise<Response> => {
    // must be from same origin, include localhost and https.
    if (
      self.location.origin == url.origin &&
      idToken &&
      (self.location.protocol == 'https:' || self.location.hostname == 'localhost')
    ) {
      // console.log('Sending Token...', idToken?.substring(0, 10));
      const request = makeAuthRequest(req, idToken);
      req = request;
    }
    return fetch(req);
  };

  // Fetch the resource after checking for the ID token.
  // This can also be integrated with existing logic to serve cached files
  // in offline mode.
  ev.respondWith(getIdTokenPromise().then(requestProcessor, requestProcessor));
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(clients.claim());
});

// We update service worker immediately on receiving this `skipWaiting` message.
// Install listener only called once and may fail. In that case, we use this alternative approach.
self.addEventListener('message', (ev) => {
  if (ev.data === 'SKIP_WAITING') return self.skipWaiting();
});
