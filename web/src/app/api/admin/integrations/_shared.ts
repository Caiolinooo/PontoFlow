import { NextResponse } from 'next/server';
import { requireApiRole, hasTenantAdminAccess } from '@/lib/auth/server';
import type { User } from '@/lib/auth/custom-auth';

export type IntegrationsAdminAuth = { user: User; tenantId: string };

/**
 * Shared guard for /api/admin/integrations/* proxies.
 * Accepts global ADMIN or TENANT_ADMIN (tenant-scoped) sessions and resolves
 * the tenant used to scope the integration v1 admin functions.
 * Returns either the auth context or a ready NextResponse error.
 */
export async function requireIntegrationsAdmin(): Promise<IntegrationsAdminAuth | NextResponse> {
  let user: User;
  try {
    user = await requireApiRole(['ADMIN', 'TENANT_ADMIN']);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    const status = msg === 'Unauthorized' ? 401 : 403;
    return NextResponse.json({ error: status === 401 ? 'unauthorized' : 'forbidden' }, { status });
  }

  const tenantId = user.tenant_id;
  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenant_required', message: 'No tenant resolved for the current user' },
      { status: 400 }
    );
  }

  if (!hasTenantAdminAccess(user, tenantId)) {
    return NextResponse.json(
      { error: 'forbidden', message: 'No admin access to this tenant' },
      { status: 403 }
    );
  }

  return { user, tenantId };
}

export function integrationsAdminError(err: unknown, tag: string): NextResponse {
  console.error(`[api/admin/integrations/${tag}]`, err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
}
