
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebaseAuthToken');
  const { pathname } = request.nextUrl;

  const publicPaths = ['/auth/login', '/auth/signup', '/secure-cod', '/secure-cod-info', '/faq', '/terms-and-conditions', '/terms/customer', '/terms/partner-pay', '/terms/logistics', '/customer/login', '/partner-pay/login', '/partner-pay/signup', '/logistics-secure/login', '/logistics-secure/signup'];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path)) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.'); // for static files like favicon.ico, images etc.

  // If trying to access a public path, let them through.
  if (isPublicPath) {
    return NextResponse.next();
  }

  // If there's no auth token and they are trying to access a protected route, redirect to login.
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If the user is logged in and tries to access the root, redirect to the seller dashboard
  if (token && pathname === '/') {
      return NextResponse.redirect(new URL('/seller/dashboard', request.url));
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
