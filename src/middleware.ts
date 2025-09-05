
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebaseAuthToken');
  const { pathname } = request.nextUrl;

  const publicPaths = ['/auth/login', '/auth/signup', '/secure-cod', '/secure-cod-info', '/faq', '/terms-and-conditions', '/terms/customer', '/terms/partner-pay', '/terms/logistics', '/customer/login', '/partner-pay/login', '/partner-pay/signup', '/logistics-secure/login', '/logistics-secure/signup', '/seller'];

  // Allow access to public paths, API routes, and static files
  if (
    publicPaths.some(path => pathname.startsWith(path)) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.') // for static files like favicon.ico, images etc.
  ) {
    return NextResponse.next();
  }

  // If there's no auth token, redirect to the login page
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     *
     * This is a common pattern but we will handle it in the middleware logic above.
     * We want the middleware to run on most paths to check for the token.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
