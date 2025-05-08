import { NextResponse } from 'next/server';
import { ZodIssue, z } from 'zod';

const isDev = process.env.NODE_ENV === 'development';

export default function errorHandler(e: unknown) {
  if (e instanceof z.ZodError) {
    // see : https://zod.dev/ERROR_HANDLING
    const flattenErr = e.flatten((issue: ZodIssue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      errorCode: issue.code,
    }));
    if (isDev) {
      return NextResponse.json(
        {
          error: flattenErr,
        },
        {
          status: 400,
        }
      );
    }
    return new Response('Invalid Request', { status: 400 });
  } else {
    const status =
      e instanceof Object && 'status' in e && typeof e.status === 'number' ? e.status : 500;
    const msg = e instanceof Error ? e.message : (e ?? 'Internal server error');
    return new Response(JSON.stringify(msg), {
      status,
    });
  }
}
