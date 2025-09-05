
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/firebase'; // Assuming admin SDK is not used here for roles

// Helper to get user from token might be needed if we check roles from token claims
// For now, we'll handle redirects on the client/login page and protect routes here.

const ADMIN_EMAIL = "admin@snazzpay.com";

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebaseAuthToken');
  const { pathname } = request.nextUrl;

  const publicPaths = ['/auth/login', '/auth/signup', '/secure-cod', '/secure-cod-info', '/faq', '/terms-and-conditions', '/terms/customer', '/terms/partner-pay', '/terms/logistics', '/customer/login', '/partner-pay/login', '/partner-pay/signup', '/logistics-secure/login', '/logistics-secure/signup'];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path)) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.');

  // Allow access to public paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // If there's no auth token, redirect to the login page for any protected route
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Note: We cannot easily check the user's email or role from the middleware
  // without a backend call or a more advanced session management with custom claims.
  // The redirection logic based on role is now handled on the client-side
  // in the login page and the root page. This middleware primarily protects routes.
  
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
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
