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

  // ADMIN REDIRECTION: If an authenticated Admin lands on the root page, take them to the SnazzPay Dashboard
  if (pathname === '/' && token && userRole === 'admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  const publicPaths = [
    '/', // ZipTally AI Public Landing Page
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password', 
    '/staff/login',
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
    '/magic-mirror/widget',
    '/ziptally', // Also allow /ziptally for legacy redirects
    '/ziptally/login',
    '/ziptally/register',
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

  // PROTECT PARTNER ROUTES
  if (pathname.startsWith('/ziptally') && !pathname.startsWith('/ziptally/login') && !pathname.startsWith('/ziptally/register')) {
    if (!token) {
        return NextResponse.redirect(new URL('/ziptally/login', request.url));
    }
    return NextResponse.next();
  }

  // PROTECT SELLER ROUTES
  if (pathname.startsWith('/seller') && !pathname.startsWith('/seller/login')) {
      if (!token) {
          return NextResponse.redirect(new URL('/seller/login', request.url));
      }
      return NextResponse.next();
  }

  // PROTECT VENDOR ROUTES
  if (pathname.startsWith('/vendor') && !pathname.startsWith('/vendor/login')) {
      if (!token) {
          return NextResponse.redirect(new URL('/vendor/login', request.url));
      }
      return NextResponse.next();
  }

  // PROTECT STAFF ROUTES
  if (pathname.startsWith('/staff') && !pathname.startsWith('/staff/login')) {
      if (!token || userRole !== 'staff') {
          return NextResponse.redirect(new URL('/staff/login', request.url));
      }
      return NextResponse.next();
  }

  // PROTECT ADMIN ROUTES (Anything else that requires auth)
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
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
