
'use server';

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebaseAuthToken');
  const { pathname } = request.nextUrl;

  // Paths that are publicly accessible without login
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

  // Prefixes for public paths that have dynamic sub-routes (e.g., /terms/customer)
  const publicPrefixes = ['/guest-fulfillment', '/terms'];

  const isPublic =
    publicPaths.includes(pathname) ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix));

  // Allow access to public paths, API routes, and static files
  if (
    isPublic ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.') // for static files like favicon.ico, images etc.
  ) {
    return NextResponse.next();
  }

  // If there's no auth token for a private path, redirect to the login page
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If a token exists, let the request through.
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     *
     * We want the middleware to run on most paths to check for the token.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
