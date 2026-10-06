import { NextRequest, NextResponse } from 'next/server';
import { listRecentWebhookEvents } from '@/lib/integration/v1/admin';
import { requireIntegrationsAdmin, integrationsAdminError } from '../_shared';

/**
 * GET /api/admin/integrations/webhook-events?limit=25&endpointId=...
 * Recent webhook delivery events for the current tenant (newest first).
 */
export async function GET(req: NextRequest) {
  const auth = await requireIntegrationsAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const limitRaw = Number(searchParams.get('limit') ?? '25');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100) : 25;
  const endpointId = searchParams.get('endpointId') || undefined;

  try {
    const events = await listRecentWebhookEvents(auth.tenantId, { limit, endpointId });
    return NextResponse.json({ events });
  } catch (err) {
    return integrationsAdminError(err, 'webhook-events GET');
  }
}
