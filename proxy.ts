import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  contentSecurityPolicy,
  isPrivatePath,
} from '@/lib/security-policy';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const isPrivate = isPrivatePath(request.nextUrl.pathname);

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set(
    'Content-Security-Policy',
    contentSecurityPolicy(isPrivate),
  );

  if (isPrivate) {
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};