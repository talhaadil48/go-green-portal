import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Get the tokens from cookies
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const user = request.cookies.get('user')?.value;

  // 2. Check if the user is trying to access a protected route
  // (This is also handled by the matcher below, but we verify the tokens here)
  const hasAuth = refreshToken && user;

  // 3. If tokens are missing, redirect to the login page
  if (!hasAuth) {
    // You can change '/login' to wherever your authentication page is located
    const loginUrl = new URL('/', request.url);
    
    // Optional: Add the original URL as a redirect parameter so they return after logging in
    
    return NextResponse.redirect(loginUrl);
  }

  // 4. If they have the cookies, allow the request to proceed
  return NextResponse.next();
}

// 5. Configure which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths for the specific routes you want to protect.
     * The `/:path*` ensures it also protects any sub-routes 
     * (e.g., /claim/123, /cars/new, etc.)
     */
    '/claim/:path*',
    '/non-active-claim/:path*',
    '/long-claims/:path*',
    '/cars/:path*',
    '/invoice/:path*',
    '/recently-deleted-claims/:path*'
  ],
};