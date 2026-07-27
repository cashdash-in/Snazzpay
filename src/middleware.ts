import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebaseAuthToken');
  const { pathname } = request.nextUrl;

  // STRICT URL NORMALIZATION: 
  // Prevents SecurityError: A history state object with URL 'https://admin/...' cannot be created.
  // This catches cases like //admin/inventory and redirects to /admin/inventory
  if (pathname.startsWith('//') || pathname.includes('//')) {
    const safePath = pathname.replace(/\/+/g, '/');
    const url = new URL(safePath || '/', request.url);
    return NextResponse.redirect(url);
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
    // Sanitize redirectedFrom path for the query string to prevent protocol-relative redirects
    const safeRedirectPath = pathname.replace(/\/+/g, '/');
    loginUrl.searchParams.set('redirectedFrom', safeRedirectPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Catch everything except static assets
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
