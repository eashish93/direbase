import { NextResponse, URLPattern } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from '@/lib/utils';
import apiError from '@/lib/apiError';
import initFirebaseAdmin from '@/lib/fireadmin-init';
import { DecodedIdToken, FirebaseAdmin, FirebaseAuthError } from './lib/firebase-admin';
import db from '@/lib/db';
import { appConfig, OWNER_SETUP_KEY } from '@/drizzle/schema/config';
import { eq } from 'drizzle-orm';

function redirect(req: NextRequest, path: string) {
  // see: https://nextjs.org/docs/messages/middleware-relative-urls
  return NextResponse.redirect(new URL(path, req.url));
}

const localHostnames = ['localhost', '0.0.0.0', '127.0.0.1'];

let firebaseAdmin: FirebaseAdmin | undefined;



// Helper to check D1 Setup Status
async function checkSetupComplete(): Promise<boolean> {
  try {
    const dbInstance = await db();  
    const config = await dbInstance.select({ value: appConfig.value })
      .from(appConfig)
      .where(eq(appConfig.key, OWNER_SETUP_KEY))
      .limit(1);
    return config.length > 0 && config[0].value === 'true';
  } catch (error) {
    console.error("[Middleware] Error checking D1 setup status:", error);
    // If the DB check fails (e.g., D1 not provisioned/accessible), assume setup is NOT complete
    // to allow the user to potentially reach the setup page.
    // Log the error for investigation.
    return false;
  }
}

export async function middleware(req: NextRequest) {
  // Because cloud run terminate TLS to container service which means we can't use https://localhost:{port}. So we need to use `http`. Upto next v13.4.12, it's all good and we can directly use `req.nextUrl.origin` for baseUrl. But after that, next.js has unsolved bug which if we used via proxy (via cloudflare tunnel or in production), it out `req.url` with `https://`.
  // I've mentioned this bug here (closed now but not fixed): https://github.com/vercel/next.js/issues/54961
  // Watch for these issues:
  // <https://github.com/vercel/next.js/issues/54450>
  const hostname = req.nextUrl.hostname;
  const isLocal = localHostnames.includes(hostname);
  const baseUrl = isLocal ? `http://${req.nextUrl.host}` : req.nextUrl.origin;
  const pathname = req.nextUrl.pathname;
  // production checklist: <https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy>
  // Disable iframe (better alt to X-Frame-Options)
  const cspHeader = `
    frame-ancestors 'self';  
  `;
  // Replace newline characters and spaces
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, ' ').trim();

  const res = NextResponse.next();

  // set security headers
  res.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);

  const excludedRoutes = ['/api/hc'].map(
    (r) => new URLPattern({ pathname: r, baseURL: baseUrl, search: '*', hash: '*' })
  );

  // skip these routes.
  // Don't use r.test(req.url), otherwise we will not be able to use cloudflare tunnel for testing webhook locally.
  // check here: console.log('Pathname: ', pathname, baseUrl, req.url, req.nextUrl.origin);
  if (excludedRoutes.some((r) => r.test(pathname, baseUrl))) return res;

  console.log(`<Called Middleware: ${req.url}>`);


  // --- Initialize Firebase Admin --- Try/catch block for robust error handling
  try {
    firebaseAdmin = initFirebaseAdmin();
  } catch (initError: unknown) {
    const message = initError instanceof Error ? initError.message : 'Initialization failed';
    return NextResponse.json(
      { error: 'Server configuration error', details: message },
      { status: 500 }
    );
  }

  // token verification
  const token = getToken(req.headers);
  let decoded: DecodedIdToken | null = null;
  let verificationError: Error | null = null;

  if (token && firebaseAdmin) {
    // Check if admin is initialized
    try {
      decoded = await firebaseAdmin.verifyIdToken(token); // Set checkRevoked if needed
    } catch (error: unknown) {
      console.error('[Middleware] Token verification failed:', error);
      if (error instanceof FirebaseAuthError) {
        verificationError = error;
      } else {
        verificationError = new Error('Unknown verification error');
      }
    }
  } else if (!token) {
    verificationError = new Error('No token provided');
  } else {
    // firebaseAdmin not initialized
    verificationError = new Error('Firebase Admin not initialized');
  }

  const isTokenValid = !!decoded && !verificationError;

  if (pathname.startsWith('/api')) {
    if (!isTokenValid) {
      const status =
        verificationError instanceof FirebaseAuthError &&
        (verificationError.code === 'id-token-expired' ||
          verificationError.code === 'id-token-revoked')
          ? 401
          : 403;
      return apiError({ status: status, message: verificationError?.message || 'Unauthorized' });
    }
    // skipping email verification for now.
    // if (!isEmailVerified) {
    //   console.log('[Middleware] Token revoked[api] (email not verified): ', decodedToken.uid);
    //   // Directly revoke tokens if email is not verified
    //   try {
    //     await firebaseAdmin.revokeRefreshTokens(decodedToken.uid);
    //   } catch (revokeErr) {
    //     console.error('[Middleware] Failed to revoke token during API email check:', revokeErr);
    //     // Decide if failure to revoke should block the request - likely not
    //   }
    //   return apiError({ status: 401, message: 'Email not verified' });
    // }

    // Add uid
    if(decoded) {
      res.headers.set('x-uid', decoded.uid);
    }
    return res;
  } else {
    // Page routes
    const isSetupComplete = await checkSetupComplete(); // Check DB if initial owner setup is done
    const isAdminPath = pathname.startsWith('/admin');
    const isLoginPage = pathname === '/admin/login';
    const isSetupPage = pathname === '/admin/setup';

    // --- Handle Setup Incomplete ---
    if (!isSetupComplete) {
      if (isSetupPage) {
        // Allow access to the setup page if setup is not complete
        return res;
      } else {
        // Redirect *any* other request (admin or not) to the setup page
        console.log(`[Middleware] Setup incomplete, redirecting ${pathname} to /admin/setup`);
        return redirect(req, '/admin/setup');
      }
    }

    // --- Handle Setup Complete ---
    // At this point, isSetupComplete is true

    // Redirect away from setup page if accessed directly after completion
    if (isSetupPage) {
      console.log('[Middleware] Setup complete, redirecting away from /admin/setup');
      return redirect(req, '/admin');
    }

    // Handle Authentication for Admin Routes
    if (isAdminPath) {
      if (isTokenValid) {
        // Logged in: Redirect away from login page
        if (isLoginPage) {
          console.log('[Middleware] Logged in, redirecting away from /admin/login');
          return redirect(req, '/admin');
        }
        // Logged in: Allow access to other admin pages
        console.log(`[Middleware] Logged in, allowing access to ${pathname}`);
        if (decoded) { // Add uid header if decoded token exists
             res.headers.set('x-uid', decoded.uid);
        }
        return res;
      } else {
        // Not logged in: Redirect non-login admin paths to login page
        if (!isLoginPage) {
          console.log(`[Middleware] Not logged in, redirecting ${pathname} to /admin/login`);
          return redirect(req, '/admin/login');
        }
        // Not logged in: Allow access to login page
        console.log('[Middleware] Not logged in, allowing access to /admin/login');
        return res;
      }
    }

    // Non-admin routes are allowed regardless of login state (if setup is complete)
    console.log(`[Middleware] Allowing access to non-admin route: ${pathname}`);
    return res;
  }
}

export const config = {
  matcher: [
    '/admin',
    '/admin/(.*)',
    // see this for double parentheses: https://nextjs.org/docs/messages/invalid-route-source
    '/api/(.*)',
  ],
};
