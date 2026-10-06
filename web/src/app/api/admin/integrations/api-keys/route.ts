import { NextRequest, NextResponse } from 'next/server';
import { createApiKey, listApiKeys } from '@/lib/integration/v1/admin';
import { requireIntegrationsAdmin, integrationsAdminError } from '../_shared';

const DEFAULT_SCOPES = ['people:write', 'timesheets:read', 'sso:create'];

/**
 * GET /api/admin/integrations/api-keys - List API keys for the current tenant
 * POST /api/admin/integrations/api-keys - Create API key (secret returned once)
 */
export async function GET() {
  const auth = await requireIntegrationsAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const keys = await listApiKeys(auth.tenantId);
    return NextResponse.json({ keys });
  } catch (err) {
    return integrationsAdminError(err, 'api-keys GET');
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireIntegrationsAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const label = String(body?.label ?? '').trim();
  if (!label) {
    return NextResponse.json({ error: 'label_required', message: 'Label is required' }, { status: 400 });
  }

  const scopes = Array.isArray(body?.scopes)
    ? body.scopes.filter((s: unknown): s is string => typeof s === 'string' && s.length > 0)
    : DEFAULT_SCOPES;
  const allowedCidrs = Array.isArray(body?.allowedCidrs)
    ? body.allowedCidrs.filter((s: unknown): s is string => typeof s === 'string' && s.length > 0)
    : undefined;

  try {
    const key = await createApiKey(auth.tenantId, { label, scopes, allowedCidrs });
    return NextResponse.json({ key }, { status: 201 });
  } catch (err) {
    return integrationsAdminError(err, 'api-keys POST');
  }
}
