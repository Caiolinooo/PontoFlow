import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { getUserFromToken } from './lib/auth/custom-auth';

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/employee',
  '/manager',
  '/reports',
  '/settings',
  '/admin'
];

// Public routes that don't require authentication
const publicRoutes = [
  '/auth/signin',
  '/auth/signup',
  '/auth/reset',
  '/auth/callback'
];

// Create intl middleware
const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract locale from pathname (e.g., /pt-BR/dashboard -> pt-BR)
  const localeMatch = pathname.match(/^\/(pt-BR|en-GB)/);
  const locale = localeMatch ? localeMatch[1] : 'pt-BR';

  // Remove locale from pathname for route checking
  const pathnameWithoutLocale = localeMatch
    ? pathname.replace(`/${locale}`, '')
    : pathname;

  // Redirect old timesheet routes to new route
  if (pathnameWithoutLocale === '/employee/timesheets/current' ||
      pathnameWithoutLocale.startsWith('/employee/timesheets/new') ||
      pathnameWithoutLocale.match(/^\/employee\/timesheets\/[a-f0-9-]{36}$/)) {
    return NextResponse.redirect(new URL(`/${locale}/employee/timesheets`, request.url));
  }

  // First, handle i18n
  const intlResponse = intlMiddleware(request);

  // Handle root path - redirect based on authentication
  if (pathname === '/' || pathnameWithoutLocale === '' || pathnameWithoutLocale === '/') {
    const token = request.cookies.get('timesheet_session')?.value;
    const user = token ? await getUserFromToken(token) : null;

    if (user) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    } else {
      // Clear invalid token if exists
      if (token) {
        const response = NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url));
        response.cookies.set('timesheet_session', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          expires: new Date(0),
          path: '/',
        });
        return response;
      }
      return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url));
    }
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathnameWithoutLocale.startsWith(route)
  );

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route =>
    pathnameWithoutLocale.startsWith(route)
  );

  // If it's a protected route, check authentication and RBAC
  if (isProtectedRoute) {
    const token = request.cookies.get('timesheet_session')?.value;
    const user = token ? await getUserFromToken(token) : null;

    // If no user, redirect to signin
    if (!user) {
      const signInUrl = new URL(`/${locale}/auth/signin`, request.url);
      signInUrl.searchParams.set('redirect', pathname);
      
      // Clear invalid token if exists
      if (token) {
        const response = NextResponse.redirect(signInUrl);
        response.cookies.set('timesheet_session', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          expires: new Date(0),
          path: '/',
        });
        return response;
      }
      
      return NextResponse.redirect(signInUrl);
    }

    // RBAC: admin-only area
    if (pathnameWithoutLocale.startsWith('/admin') && user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }

    // RBAC: manager area (ADMIN, MANAGER, MANAGER_TIMESHEET)
    if (pathnameWithoutLocale.startsWith('/manager')) {
      const allowed = ['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET'];
      if (!allowed.includes(user.role as string)) {
        return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
      }
    }

    return intlResponse || NextResponse.next();
  }

  // If user is authenticated and trying to access signin/signup, redirect to dashboard
  if (isPublicRoute && (pathnameWithoutLocale === '/auth/signin' || pathnameWithoutLocale === '/auth/signup')) {
    const token = request.cookies.get('timesheet_session')?.value;
    const user = token ? await getUserFromToken(token) : null;

    if (user) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  // Return intl response for all other routes
  return intlResponse;
}

export const config = {
  matcher: ['/', '/(pt-BR|en-GB)/:path*']
};

