// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value
  const pathname = request.nextUrl.pathname

  // Only protect /claim* and /recent* routes
  const isProtectedPath = pathname.startsWith('/claim') || pathname.startsWith('/recent')

  // If trying to access protected route without accessToken → redirect to landing
  if (isProtectedPath && !accessToken) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Only run middleware for /claim* and /recent* routes
     */
    '/claim/:path*',
    '/recent/:path*',
  ],
}