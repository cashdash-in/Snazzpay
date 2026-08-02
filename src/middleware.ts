import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebaseAuthToken');
  const userRole = request.cookies.get('userRole')?.value;
  const { pathname } = request.nextUrl;

  // STRICT URL NORMALIZATION: 
  if (pathname.startsWith('//')) {
    const safePath = pathname.replace(/\/+/g, '/');
    const url = new URL(safePath || '/', request.url);
    return NextResponse.redirect(url);
  }

  const publicPaths = [
    '/',
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password', 
    '/staff/login', // ALLOW STAFF LOGIN
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

  // PROTECT STAFF ROUTES
  if (pathname.startsWith('/staff') && !pathname.startsWith('/staff/login')) {
      if (!token || userRole !== 'staff') {
          return NextResponse.redirect(new URL('/staff/login', request.url));
      }
      return NextResponse.next();
  }

  // PROTECT ADMIN ROUTES
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
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