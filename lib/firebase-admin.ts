import { decode, JwtPayload } from '@tsndr/cloudflare-worker-jwt';

/**
 * Firebase Admin SDK minimal alternative for Cloudflare Workers.
 *
 * Provides functionality for verifying ID tokens and managing users via Firebase Auth REST API.
 *
 * @example
 * // In your worker's fetch handler (ensure env vars are set):
 * import { FirebaseAdmin, DecodedIdToken, FirebaseAuthError  } from './lib/firebase-admin';
 *
 * let firebaseAdmin: FirebaseAdmin; // Initialize once per instance
 *
 * async function handleRequest(request: Request, env: Env) {
 *   if (!firebaseAdmin) {
 *     try {
 *       const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
 *       firebaseAdmin = new FirebaseAdmin({ projectId: env.FIREBASE_PROJECT_ID, serviceAccount });
 *     } catch (e) {
 *       console.error('Failed to initialize Firebase Admin:', e);
 *       // Handle initialization error
 *     }
 *   }
 *
 *   // Use firebaseAdmin instance:
 *   // const decodedToken = await firebaseAdmin.verifyIdToken(idToken);
 *   // await firebaseAdmin.updateUser(uid, { displayName: 'New Name' });
 *   // await firebaseAdmin.revokeRefreshTokens(uid);
 * }
 */

// --- Configuration Interfaces ---

export interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

export interface FirebaseAdminConfig {
  /** Firebase Project ID */
  projectId: string;
  /** Service Account JSON contents */
  serviceAccount: ServiceAccount;
}

// --- Constants ---

const GOOGLE_JWK_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const FIREBASE_ISSUER = (projectId: string) => `https://securetoken.google.com/${projectId}`;
const GOOGLE_OAUTH2_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1';

// --- Error Handling ---

export class FirebaseAuthError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'FirebaseAuthError';
  }
}

// --- Minimal Header Type ---
interface JwtHeader {
  alg: string;
  typ?: string;
  kid?: string;
}

/**
 * Decoded Firebase ID token containing user information.
 */
export interface DecodedIdToken extends JwtPayload {
  auth_time?: number; // Seconds since epoch when authentication occurred
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  firebase: {
    identities: {
      [provider: string]: unknown;
    };
    sign_in_provider: string;
    sign_in_second_factor?: string;
    second_factor_identifier?: string;
    tenant?: string;
  };
  uid: string; // Always present
}

/** Properties to update for a user. */
export interface UpdateUserPayload {
  displayName?: string | null;
  email?: string;
  emailVerified?: boolean;
  password?: string;
  phoneNumber?: string | null;
  photoURL?: string | null;
  disabled?: boolean;
}

/** Structure of user data returned by the Admin API lookup */
interface FirebaseUserRecord {
  localId: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  disabled?: boolean;
  tokensValidAfterTime?: string; // Timestamp as seconds since epoch (string)
  // Add other fields as needed (e.g., providerUserInfo, customAttributes, etc.)
}

// --- JWK Fetching and Caching (Module Level) ---

interface JwkCacheEntry {
  keys: Map<string, CryptoKey>;
  expiry: number; // Timestamp in seconds
}
let jwkCache: JwkCacheEntry | null = null;

// --- OAuth 2.0 Token Generation for Service Account (Module Level Cache) ---

interface AccessToken {
  token: string;
  expiry: number; // Timestamp in seconds
}
let accessTokenCache: AccessToken | null = null;

// --- Utility Functions (Module Level) ---

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

class Base64Url {
  static encode(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // Use fetch with data URL for robust decoding in Workers
  static async decode(encoded: string): Promise<ArrayBuffer> {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Padding is generally handled by fetch, but ensuring correct length might be safer
    // const padLength = (4 - (base64.length % 4)) % 4;
    // const padded = base64 + '='.repeat(padLength);
    const dataUrl = `data:application/octet-stream;base64,${base64}`;
    try {
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch data URL: ${response.statusText}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error decoding Base64Url with fetch:', error);
      throw new Error(
        `Failed to decode Base64Url string: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers/footers and line breaks
  const pemFormatted = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryDer = await Base64Url.decode(pemFormatted);

  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, // not extractable
    ['sign']
  );
}

// --- FirebaseAdmin Class ---

export class FirebaseAdmin {
  readonly #config: FirebaseAdminConfig;

  constructor(config: FirebaseAdminConfig) {
    if (!config || !config.projectId || !config.serviceAccount) {
      throw new FirebaseAuthError(
        'FirebaseAdmin initialization requires projectId and serviceAccount.',
        'initialization-error'
      );
    }
    if (!config.serviceAccount.private_key || !config.serviceAccount.client_email) {
      throw new FirebaseAuthError(
        'Service account must contain private_key and client_email.',
        'initialization-error'
      );
    }
    this.#config = config;
  }

  // --- Private Helper Methods ---

  async #fetchGooglePublicKeys(): Promise<Map<string, CryptoKey>> {
    const now = Math.floor(Date.now() / 1000);

    if (jwkCache && now < jwkCache.expiry) {
      return jwkCache.keys;
    }

    try {
      const response = await fetch(GOOGLE_JWK_URL);
      if (!response.ok) {
        throw new FirebaseAuthError(
          `Failed to fetch Google public keys: ${response.statusText}`,
          'jwk-fetch-failed'
        );
      }

      const cacheControl = response.headers.get('cache-control');
      const maxAgeMatch = cacheControl?.match(/max-age=(\d+)/);
      const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600; // Default to 1 hour

      const jwks = await response.json<{ keys: (JsonWebKey & { kid: string })[] }>();

      const keyMap = new Map<string, CryptoKey>();
      await Promise.all(
        jwks.keys.map(async (jwk: JsonWebKey & { kid: string }) => {
          if (jwk.kty !== 'RSA' || !jwk.alg || !jwk.kid || !jwk.n || !jwk.e) {
            console.warn('Received potentially invalid JWK format from Google:', jwk);
            throw new FirebaseAuthError('Invalid JWK format received from Google.', 'invalid-jwk');
          }
          const key = await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            false, // not extractable
            ['verify']
          );
          keyMap.set(jwk.kid, key);
        })
      );

      if (keyMap.size === 0) {
        throw new FirebaseAuthError(
          'No valid JWKs found in response from Google.',
          'no-valid-jwks'
        );
      }

      jwkCache = { keys: keyMap, expiry: now + maxAge };
      return keyMap;
    } catch (error: unknown) {
      if (error instanceof FirebaseAuthError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new FirebaseAuthError(
        `Error fetching or importing Google public keys: ${message}`,
        'jwk-processing-error'
      );
    }
  }

  async #createSignedJwt(): Promise<string> {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour expiry for the assertion JWT

    const claims = {
      iss: this.#config.serviceAccount.client_email,
      sub: this.#config.serviceAccount.client_email,
      aud: GOOGLE_OAUTH2_TOKEN_URL,
      iat: now,
      exp: expiry,
      scope: [
        'https://www.googleapis.com/auth/identitytoolkit',
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/firebase.database',
        'https://www.googleapis.com/auth/firebase.messaging',
        'https://www.googleapis.com/auth/firebase.storage',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };

    const encodedHeader = Base64Url.encode(str2ab(JSON.stringify(header)));
    const encodedClaims = Base64Url.encode(str2ab(JSON.stringify(claims)));
    const unsignedToken = `${encodedHeader}.${encodedClaims}`;

    const privateKey = await importPrivateKey(this.#config.serviceAccount.private_key);
    const signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      privateKey,
      str2ab(unsignedToken)
    );

    const encodedSignature = Base64Url.encode(signature);
    return `${unsignedToken}.${encodedSignature}`;
  }

  async #fetchAccessToken(): Promise<AccessToken> {
    const now = Math.floor(Date.now() / 1000);
    if (accessTokenCache && now < accessTokenCache.expiry) {
      return accessTokenCache;
    }

    const signedJwt = await this.#createSignedJwt();

    const response = await fetch(GOOGLE_OAUTH2_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedJwt,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new FirebaseAuthError(
        `Failed to fetch access token: ${response.status} ${response.statusText} - ${errorBody}`,
        'token-fetch-failed'
      );
    }

    const tokenData = await response.json<{ access_token: string; expires_in: number }>();
    const expiryTime = now + tokenData.expires_in - 60; // Subtract 60s buffer

    accessTokenCache = { token: tokenData.access_token, expiry: expiryTime };
    return accessTokenCache;
  }

  async #makeFirebaseAdminApiRequest<T>(endpoint: string, body: object): Promise<T> {
    const accessToken = await this.#fetchAccessToken();
    const url = `${IDENTITY_TOOLKIT_URL}/${endpoint}?key=${this.#config.projectId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.token}`,
        'X-Goog-User-Project': this.#config.projectId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorDetails = {};
      try {
        errorDetails = await response.json();
      } catch {
        // Ignore if response is not JSON
      }
      throw new FirebaseAuthError(
        `Firebase Admin API request to ${endpoint} failed: ${response.status} ${response.statusText}`,
        JSON.stringify(errorDetails)
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    return {} as T;
  }

  /** Fetches user data using the Admin API. */
  async #getUserRecord(uid: string): Promise<FirebaseUserRecord | null> {
    try {
      // The API returns an object with a `users` array containing the user record(s).
      const response = await this.#makeFirebaseAdminApiRequest<{ users?: FirebaseUserRecord[] }>(
        'accounts:lookup',
        { localId: [uid] } // Lookup by UID
      );
      // Return the first user found, or null if no user or array is empty
      return response?.users?.[0] || null;
    } catch (error: unknown) {
      // Handle specific errors, e.g., USER_NOT_FOUND, differently if needed
      // For now, rethrow as a generic error or return null
      if (error instanceof FirebaseAuthError) {
        // Optionally check error.code here (e.g., if it contains USER_NOT_FOUND)
        console.warn(`Failed to lookup user ${uid}: ${error.message} (${error.code})`);
      } else {
        console.error(`Unknown error during user lookup for ${uid}:`, error);
      }
      // Returning null indicates lookup failed or user not found
      return null;
    }
  }

  // --- Public API Methods ---

  /**
   * Verifies a Firebase ID token (JWT).
   *
   * @param idToken The JWT token string to verify.
   * @param checkRevoked Optional. If true, checks if the token has been revoked.
   * @returns A promise that resolves with the decoded token payload if verification is successful.
   * @throws {FirebaseAuthError} If the token is invalid, expired, revoked, or verification fails.
   */
  async verifyIdToken(idToken: string, checkRevoked: boolean = false): Promise<DecodedIdToken> {
    if (!idToken) {
      throw new FirebaseAuthError('ID token must be a non-empty string.', 'invalid-argument');
    }

    // Decode (without verification first)
    const decoded = decode(idToken);
    const header = decoded.header as JwtHeader;
    const payload = decoded.payload as DecodedIdToken;

    if (!header || !payload) {
      throw new FirebaseAuthError('Invalid ID token format.', 'invalid-id-token');
    }

    // 1. Algorithm Check
    if (header.alg !== 'RS256') {
      throw new FirebaseAuthError(
        `Invalid ID token algorithm. Expected "RS256" but got "${header.alg}".`,
        'invalid-algorithm'
      );
    }
    // 2. Key ID (kid) Check
    if (!header.kid) {
      throw new FirebaseAuthError('ID token has no "kid" claim.', 'missing-kid');
    }

    // 3. Standard Claims Checks (aud, iss, sub, iat, exp)
    const projectId = this.#config.projectId;
    const expectedAudience = projectId;
    const expectedIssuer = FIREBASE_ISSUER(projectId);
    const now = Math.floor(Date.now() / 1000);

    if (payload.aud !== expectedAudience) {
      throw new FirebaseAuthError(
        `Invalid ID token audience. Expected "${expectedAudience}" but got "${payload.aud}".`,
        'invalid-audience'
      );
    }
    if (payload.iss !== expectedIssuer) {
      throw new FirebaseAuthError(
        `Invalid ID token issuer. Expected "${expectedIssuer}" but got "${payload.iss}".`,
        'invalid-issuer'
      );
    }
    if (
      !payload.sub ||
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      payload.sub.length > 128
    ) {
      throw new FirebaseAuthError('ID token has invalid "sub" (subject) claim.', 'invalid-subject');
    }
    // Check auth_time *before* iat/exp for revocation check consistency
    const authTime = payload.auth_time;
    if (checkRevoked && typeof authTime !== 'number') {
      throw new FirebaseAuthError(
        'ID token lacks "auth_time" claim required for revocation check.',
        'missing-auth-time'
      );
    }
    if (typeof payload.iat !== 'number') {
      throw new FirebaseAuthError('ID token has no "iat" (issued-at) claim.', 'missing-iat');
    }
    const maxIssuedAt = now + 300;
    if (payload.iat > maxIssuedAt) {
      throw new FirebaseAuthError(
        'ID token "iat" (issued-at) claim is in the future.',
        'iat-in-future'
      );
    }
    if (typeof payload.exp !== 'number') {
      throw new FirebaseAuthError(
        'ID token has no "exp" (expiration) claim.',
        'missing-expiration'
      );
    }
    if (payload.exp <= now) {
      throw new FirebaseAuthError('ID token has expired.', 'token-expired');
    }

    // 4. Verify Signature
    try {
      const publicKeysMap = await this.#fetchGooglePublicKeys();
      const publicKey = publicKeysMap.get(header.kid);
      if (!publicKey) {
        throw new FirebaseAuthError(
          `No public key found matching the ID token's "kid" claim ("${header.kid}").`,
          'no-matching-kid'
        );
      }

      // Explicitly prepare signature and data buffers
      const signaturePart = idToken.split('.')[2];
      if (!signaturePart) {
        throw new FirebaseAuthError(
          'ID token is missing signature part.',
          'invalid-id-token-format'
        );
      }
      const signatureBuffer = await Base64Url.decode(signaturePart); // Should be ArrayBuffer

      const dataPart = idToken.split('.').slice(0, 2).join('.');
      if (!dataPart) {
        throw new FirebaseAuthError(
          'ID token is missing header/payload part.',
          'invalid-id-token-format'
        );
      }
      const dataBuffer = new TextEncoder().encode(dataPart); // Should be Uint8Array, compatible with ArrayBuffer needed by verify

      const isValid = await crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        publicKey,
        signatureBuffer, // Use the pre-prepared buffer
        dataBuffer // Use the pre-prepared buffer
      );
      if (!isValid) {
        throw new FirebaseAuthError('ID token signature is invalid.', 'invalid-signature');
      }
    } catch (error: unknown) {
      if (error instanceof FirebaseAuthError) throw error;
      // Catch errors from buffer preparation or verify
      const message = error instanceof Error ? error.message : String(error);
      throw new FirebaseAuthError(
        `Failed to verify ID token signature: ${message}`,
        'signature-verification-failed'
      );
    }

    // Standardize uid
    payload.uid = payload.sub;

    // 5. Check Revocation Status (if requested)
    if (checkRevoked) {
      const userRecord = await this.#getUserRecord(payload.uid);

      if (!userRecord) {
        // Could indicate user deleted after token issuance but before verification
        throw new FirebaseAuthError(
          `User record not found for uid: ${payload.uid}. Cannot check revocation status.`,
          'user-not-found'
        );
      }

      // Check if tokensValidAfterTime exists and is a valid timestamp string
      if (userRecord.tokensValidAfterTime) {
        const validSinceTimestampSeconds = parseInt(userRecord.tokensValidAfterTime, 10);

        if (!isNaN(validSinceTimestampSeconds)) {
          // Get auth_time (we already checked it exists if checkRevoked is true)
          const tokenAuthTimeSeconds = authTime as number;

          // Check if the token's auth time is before the user's valid time
          if (tokenAuthTimeSeconds < validSinceTimestampSeconds) {
            throw new FirebaseAuthError('ID token has been revoked.', 'id-token-revoked');
          }
        } else {
          console.warn(
            `Invalid tokensValidAfterTime format for user ${payload.uid}: ${userRecord.tokensValidAfterTime}`
          );
          // Decide whether to throw an error or allow if format is invalid
          // Throwing might be safer, as revocation status is uncertain
          throw new FirebaseAuthError(
            `Could not check revocation status due to invalid tokensValidAfterTime format for user ${payload.uid}.`,
            'invalid-revocation-format'
          );
        }
      } // else: No tokensValidAfterTime set, user tokens were never revoked
    }

    return payload;
  }

  /**
   * Updates an existing user's properties.
   *
   * @param uid The UID of the user to update.
   * @param properties The properties to update.
   * @returns A promise that resolves when the update is complete.
   * @throws {FirebaseAuthError} If the update fails.
   */
  async updateUser(uid: string, properties: UpdateUserPayload): Promise<void> {
    // Check if properties object is empty or undefined
    if (!properties || Object.keys(properties).length === 0) {
      // No actual update requested, maybe log a warning or return early?
      // For now, let's keep the original behavior which throws later if only localId remains.
      // console.warn("updateUser called with empty properties object.");
    }

    const payload: Record<string, unknown> = {
      localId: uid,
      // Use || null to ensure null is passed if property is undefined but key exists
      ...(properties.displayName !== undefined && { displayName: properties.displayName }),
      ...(properties.email !== undefined && { email: properties.email }),
      ...(properties.emailVerified !== undefined && { emailVerified: properties.emailVerified }),
      ...(properties.password !== undefined && { password: properties.password }),
      ...(properties.phoneNumber !== undefined && { phoneNumber: properties.phoneNumber }),
      ...(properties.photoURL !== undefined && { photoUrl: properties.photoURL }),
      ...(properties.disabled !== undefined && { disableUser: properties.disabled }),
    };

    const deleteAttribute: string[] = [];
    // Explicitly check for null to trigger deletion
    if (properties.displayName === null) deleteAttribute.push('DISPLAY_NAME');
    if (properties.phoneNumber === null) deleteAttribute.push('PHONE_NUMBER');
    if (properties.photoURL === null) deleteAttribute.push('PHOTO_URL');

    if (deleteAttribute.length > 0) {
      payload.deleteAttribute = deleteAttribute;
      // Remove the null properties from the main payload to avoid sending conflicting instructions
      if (properties.displayName === null) delete payload.displayName;
      if (properties.phoneNumber === null) delete payload.phoneNumber;
      if (properties.photoURL === null) delete payload.photoUrl;
    }

    // Check if any actual update properties remain besides localId and deleteAttribute
    const updateKeys = Object.keys(payload).filter(
      (k) => k !== 'localId' && k !== 'deleteAttribute'
    );
    if (updateKeys.length === 0 && deleteAttribute.length === 0) {
      throw new FirebaseAuthError(
        'updateUser called with no valid properties to update or delete.',
        'invalid-argument'
      );
    }

    await this.#makeFirebaseAdminApiRequest('accounts:update', payload);
  }

  /**
   * Revokes all refresh tokens for a given user.
   *
   * @param uid The UID of the user whose tokens should be revoked.
   * @returns A promise that resolves when the tokens are revoked.
   * @throws {FirebaseAuthError} If the operation fails.
   */
  async revokeRefreshTokens(uid: string): Promise<void> {
    const payload = {
      localId: uid,
      validSince: Math.floor(Date.now() / 1000).toString(),
    };
    await this.#makeFirebaseAdminApiRequest('accounts:update', payload);
  }

  /** Reserved OIDC claims that cannot be used as custom claim keys. */
  #RESERVED_CLAIMS = [
    'acr',
    'amr',
    'at_hash',
    'aud',
    'auth_time',
    'azp',
    'cnf',
    'c_hash',
    'exp',
    'firebase',
    'iat',
    'iss',
    'jti',
    'nbf',
    'nonce',
    'sub',
    'email',
    'email_verified',
    'phone_number',
    'name',
    'picture',
    'given_name',
    'family_name',
    'middle_name',
    'nickname',
    'preferred_username',
    'profile',
    'zoneinfo',
    'locale',
    'address',
    'gender',
    'birthdate',
    'updated_at',
    // Add any other claims you know are reserved by Google Identity Platform or your specific setup
  ];

  /** Max size for custom claims payload in bytes. */
  #MAX_CLAIMS_PAYLOAD_SIZE = 1000;

  /**
   * Sets custom user claims for a given user.
   *
   * Note: This overwrites any existing custom claims.
   *
   * @param uid The UID of the user to set claims for.
   * @param claims The custom claims object (key-value pairs). Pass null or an empty object to remove all claims.
   * @returns A promise that resolves when the claims are set.
   * @throws {FirebaseAuthError} If the operation fails or claims are invalid.
   */
  async setCustomUserClaims(uid: string, claims: Record<string, unknown> | null): Promise<void> {
    let claimsToSet: Record<string, unknown>;

    if (claims === null || Object.keys(claims).length === 0) {
      // To remove claims, set customAttributes to an empty JSON object string
      claimsToSet = {};
    } else {
      claimsToSet = claims;
      // Validate claims
      for (const key of Object.keys(claimsToSet)) {
        if (this.#RESERVED_CLAIMS.includes(key)) {
          throw new FirebaseAuthError(
            `Claim key "${key}" is reserved and cannot be used.`,
            'invalid-claims'
          );
        }
      }
    }

    const claimsJsonString = JSON.stringify(claimsToSet);

    // Validate payload size
    const payloadSizeBytes = new TextEncoder().encode(claimsJsonString).length;
    if (payloadSizeBytes > this.#MAX_CLAIMS_PAYLOAD_SIZE) {
      throw new FirebaseAuthError(
        `Custom claims payload exceeds the maximum size of ${this.#MAX_CLAIMS_PAYLOAD_SIZE} bytes. Actual size: ${payloadSizeBytes} bytes.`,
        'claims-too-large'
      );
    }

    const payload = {
      localId: uid,
      customAttributes: claimsJsonString,
    };

    await this.#makeFirebaseAdminApiRequest('accounts:update', payload);

    // Important: After setting claims, the user's ID token won't have them
    // until it's refreshed or a new one is issued. You might need to force
    // a token refresh on the client-side or revoke existing tokens.
    // Consider adding a call to revokeRefreshTokens here if immediate propagation is critical.
    // await this.revokeRefreshTokens(uid); // Optional: uncomment if needed
  }
}

/*
Example Usage - Detailed (in your Worker):

import { FirebaseAdmin, DecodedIdToken, FirebaseAuthError } from './lib/firebase-admin';

let firebaseAdmin: FirebaseAdmin; // Initialize once

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Initialize Admin SDK (only once)
    if (!firebaseAdmin) {
        const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
        const projectId = env.FIREBASE_PROJECT_ID;

        if (!serviceAccountJson || !projectId) {
            console.error('Firebase Admin configuration missing in environment variables.');
            return new Response('Server configuration error.', { status: 500 });
        }

        try {
            const serviceAccount = JSON.parse(serviceAccountJson);
            firebaseAdmin = new FirebaseAdmin({ projectId, serviceAccount });
            console.log('Firebase Admin initialized successfully.');
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('Failed to initialize Firebase Admin:', message);
            return new Response('Server configuration error.', { status: 500 });
        }
    }

    // --- Now use the initialized admin instance ---

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized: Missing or invalid Authorization header', { status: 401 });
    }
    const idToken = authHeader.substring(7);

    try {
      // Example: verifyIdToken(idToken, true) // To check for revocation
      const decodedToken: DecodedIdToken = await firebaseAdmin.verifyIdToken(idToken);
      console.log('Successfully verified ID token for user:', decodedToken.uid);

      // --- Example: Update User ---
      try {
        await firebaseAdmin.updateUser(decodedToken.uid, { displayName: 'Worker Updated Name', photoURL: null });
        console.log('User updated successfully');
      } catch (updateError: unknown) {
        if (updateError instanceof FirebaseAuthError) {
             console.error(`Failed to update user (${updateError.code}): ${updateError.message}`);
        } else {
             console.error('Unknown error updating user:', updateError);
        }
      }

      // --- Example: Revoke Tokens ---
      try {
        await firebaseAdmin.revokeRefreshTokens(decodedToken.uid);
        console.log('Tokens revoked successfully');
      } catch (revokeError: unknown) {
         if (revokeError instanceof FirebaseAuthError) {
             console.error(`Failed to revoke tokens (${revokeError.code}): ${revokeError.message}`);
        } else {
             console.error('Unknown error revoking tokens:', revokeError);
        }
      }

      return new Response(`Hello ${decodedToken.name || decodedToken.uid}!`);

    } catch (error: unknown) {
        if (error instanceof FirebaseAuthError) {
            console.error(`Firebase Auth Error (${error.code}): ${error.message}`);
            return new Response(`Authentication Error: ${error.message}`, { status: 403 });
        } else {
            const message = error instanceof Error ? error.message : String(error);
            console.error('Unknown error during token verification:', message);
            return new Response('Internal Server Error', { status: 500 });
        }
    }
  }
}

interface Env {
    FIREBASE_SERVICE_ACCOUNT_JSON: string;
    FIREBASE_PROJECT_ID: string;
    // Add other bindings if needed
}
*/
