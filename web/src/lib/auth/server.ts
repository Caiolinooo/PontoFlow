import { cookies } from 'next/headers';
import { getUserFromToken, type User } from './custom-auth';

/**
 * Get the current authenticated user from the session cookie
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;
  
  if (!token) {
    return null;
  }
  
  return getUserFromToken(token);
}

/**
 * Require authentication - throws redirect if not authenticated
 */
export async function requireAuth(locale: string): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect(`/${locale}/auth/signin`);
  }

  // TypeScript doesn't know that redirect() throws, so we need to assert
  return user as User;
}

/**
 * Require specific role - throws redirect if not authorized
 */
export async function requireRole(
  locale: string,
  allowedRoles: Array<'ADMIN' | 'MANAGER' | 'MANAGER_TIMESHEET' | 'USER'>
): Promise<User> {
  const user = await requireAuth(locale);

  if (!allowedRoles.includes(user.role)) {
    const { redirect } = await import('next/navigation');
    redirect(`/${locale}/dashboard`);
  }

  // TypeScript doesn't know that redirect() throws, so we need to assert
  return user as User;
}

/**
 * Get authenticated user from API request
 * Returns user or null if not authenticated
 */
export async function getApiUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;

  if (!token) {
    return null;
  }

  return getUserFromToken(token);
}

/**
 * Require authentication in API route
 * Returns user or throws error response
 */
export async function requireApiAuth(): Promise<User> {
  const user = await getApiUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Require specific role in API route
 * Returns user or throws error response
 */
export async function requireApiRole(
  allowedRoles: Array<'ADMIN' | 'MANAGER' | 'MANAGER_TIMESHEET' | 'USER'>
): Promise<User> {
  const user = await requireApiAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden');
  }

  return user;
}
