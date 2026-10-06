import { NextRequest, NextResponse } from 'next/server';
import { createWebhookEndpoint, listWebhookEndpoints } from '@/lib/integration/v1/admin';
import { requireIntegrationsAdmin, integrationsAdminError } from '../_shared';

const DEFAULT_EVENT_TYPES = [
  'person.created',
  'person.updated',
  'person.deactivated',
  'timesheet.submitted',
  'timesheet.approved',
  'timesheet.rejected',
  'timesheet.locked',
];

/**
 * GET /api/admin/integrations/webhook-endpoints - List webhook endpoints for the current tenant
 * POST /api/admin/integrations/webhook-endpoints - Create endpoint (secret returned once)
 */
export async function GET() {
  const auth = await requireIntegrationsAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const endpoints = await listWebhookEndpoints(auth.tenantId);
    return NextResponse.json({ endpoints });
  } catch (err) {
    return integrationsAdminError(err, 'webhook-endpoints GET');
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireIntegrationsAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const url = String(body?.url ?? '').trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: 'url_invalid', message: 'A valid http(s):// URL is required' },
      { status: 400 }
    );
  }

  const eventTypes = Array.isArray(body?.eventTypes)
    ? body.eventTypes.filter((s: unknown): s is string => typeof s === 'string' && s.length > 0)
    : DEFAULT_EVENT_TYPES;
  const enabled = typeof body?.enabled === 'boolean' ? body.enabled : true;

  try {
    const endpoint = await createWebhookEndpoint(auth.tenantId, { url, eventTypes, enabled });
    return NextResponse.json({ endpoint }, { status: 201 });
  } catch (err) {
    return integrationsAdminError(err, 'webhook-endpoints POST');
  }
}
