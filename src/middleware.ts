

'use server';

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebaseAuthToken');
  const role = request.cookies.get('userRole')?.value;
  const { pathname } = request.nextUrl;

  const publicPaths = [
    '/auth/login', 
    '/seller/login',
    '/vendor/login',
    '/auth/signup', 
    '/secure-cod', 
    '/secure-cod-info', 
    '/faq', 
    '/terms-and-conditions', 
    '/terms/customer', 
    '/terms/partner-pay', 
    '/terms/logistics',
    '/terms/seller',
    '/customer/login', 
    '/partner-pay/login', 
    '/partner-pay/signup', 
    '/logistics-secure/login', 
    '/logistics-secure/signup', 
    '/seller',
  ];

  // Allow access to public paths, API routes, and static files
  if (
    publicPaths.some(path => pathname === path || (path !== '/' && pathname.startsWith(path + '/'))) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.') // for static files like favicon.ico, images etc.
  ) {
    return NextResponse.next();
  }

  // If there's no auth token, redirect to the default login page
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If a token exists, let the request through.
  // Role-based redirection will be handled on the client-side in the AppShell.
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
