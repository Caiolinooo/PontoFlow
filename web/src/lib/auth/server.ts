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
  allowedRoles: Array<'ADMIN' | 'MANAGER' | 'MANAGER_TIMESHEET' | 'USER' | 'TENANT_ADMIN'>
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
    console.error('getApiUser: No session token found in cookies');
    return null;
  }

  const user = await getUserFromToken(token);
  if (!user) {
    console.error('getApiUser: getUserFromToken returned null');
  }

  return user;
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
  allowedRoles: Array<'ADMIN' | 'MANAGER' | 'MANAGER_TIMESHEET' | 'USER' | 'TENANT_ADMIN'>
): Promise<User> {
  const user = await requireApiAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden');
  }

  return user;
}

/**
 * Check if user has TENANT_ADMIN role for a specific tenant
 * Returns true if user is global ADMIN or has TENANT_ADMIN role for the tenant
 */
export function hasTenantAdminAccess(user: User, tenantId: string): boolean {
  // Global ADMIN has access to all tenants
  if (user.role === 'ADMIN') {
    return true;
  }

  // Check if user has TENANT_ADMIN role for this specific tenant
  if (user.tenant_roles) {
    return user.tenant_roles.some(
      tr => tr.tenant_id === tenantId && tr.role === 'TENANT_ADMIN'
    );
  }

  return false;
}
