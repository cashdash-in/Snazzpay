
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/request'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebaseAuthToken');
  let { pathname } = request.nextUrl;

  // Normalize pathname to prevent double-slashes which cause SecurityError on redirect
  if (pathname.startsWith('//')) {
    pathname = '/' + pathname.replace(/\/+/g, '/').replace(/^\//, '');
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
    // Sanitize redirectedFrom to prevent protocol-relative URLs (//admin/...)
    const safePath = pathname.replace(/\/+/g, '/');
    loginUrl.searchParams.set('redirectedFrom', safePath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
