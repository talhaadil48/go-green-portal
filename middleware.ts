import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const user = request.cookies.get('user')?.value;

  const hasAuth = refreshToken && user;

  const { pathname } = request.nextUrl;

  // 1. If user is NOT authenticated and trying to access protected routes
  if (!hasAuth) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If user IS authenticated and hits home "/", redirect them to dashboard
  if (hasAuth && pathname === '/') {
    const redirectUrl = new URL('/claim?view=active', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Allow everything else
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/claim/:path*',
    '/non-active-claim/:path*',
    '/long-claims/:path*',
    '/cars/:path*',
    '/invoice/:path*',
    '/recently-deleted-claims/:path*',
    '/' // important so "/" is evaluated
  ],
};