
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebaseAuthToken');
  let { pathname } = request.nextUrl;

  // STRICT URL NORMALIZATION: Prevents SecurityError on client-side replaceState
  // This catches cases like //admin/inventory and redirects to /admin/inventory
  // We use a more aggressive regex and new URL construction for stability
  if (pathname.startsWith('//') || pathname.includes('//')) {
    const safePath = pathname.replace(/\/+/g, '/');
    // Ensure we don't redirect to an empty string or just / if there's content
    const redirectUrl = new URL(safePath || '/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  const publicPaths = [
    '/',
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password', 
    '/seller',
    '/seller/login',
    '/vendor/login',
    '/secure-cod', 
    '/secure-cod-info', 
    '/faq', 
    '/terms-and-conditions', 
    '/customer/login', 
    '/partner-pay/login', 
    '/partner-pay/signup', 
    '/logistics-secure/login', 
    '/logistics-secure/signup',
    '/collaborator/login',
    '/collaborator/signup',
    '/catalogue',
    '/smart-magazine',
  ];

  const publicPrefixes = ['/guest-fulfillment', '/terms', '/wholesale-request', '/collection', '/site'];

  const isPublic =
    publicPaths.includes(pathname) ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (
    isPublic ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    // Sanitize redirectedFrom path for the query string as well
    const safeRedirectPath = pathname.replace(/\/+/g, '/');
    loginUrl.searchParams.set('redirectedFrom', safeRedirectPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
