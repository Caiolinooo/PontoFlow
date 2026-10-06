import { NextRequest, NextResponse } from 'next/server';
import { updateWebhookEndpoint, deleteWebhookEndpoint } from '@/lib/integration/v1/admin';
import { requireIntegrationsAdmin, integrationsAdminError } from '../../_shared';

/**
 * PATCH /api/admin/integrations/webhook-endpoints/[id] - Update url/eventTypes/enabled
 * DELETE /api/admin/integrations/webhook-endpoints/[id] - Remove endpoint
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireIntegrationsAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const update: { url?: string; eventTypes?: string[]; enabled?: boolean } = {};

  if (body?.url !== undefined) {
    const url = String(body.url ?? '').trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json(
        { error: 'url_invalid', message: 'A valid http(s):// URL is required' },
        { status: 400 }
      );
    }
    update.url = url;
  }
  if (Array.isArray(body?.eventTypes)) {
    update.eventTypes = body.eventTypes.filter(
      (s: unknown): s is string => typeof s === 'string' && s.length > 0
    );
  }
  if (typeof body?.enabled === 'boolean') {
    update.enabled = body.enabled;
  }

  try {
    const endpoint = await updateWebhookEndpoint(auth.tenantId, id, update);
    return NextResponse.json({ endpoint });
  } catch (err) {
    return integrationsAdminError(err, 'webhook-endpoints PATCH');
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireIntegrationsAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 });
  }

  try {
    await deleteWebhookEndpoint(auth.tenantId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return integrationsAdminError(err, 'webhook-endpoints DELETE');
  }
}
