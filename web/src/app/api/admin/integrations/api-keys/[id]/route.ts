import { NextResponse } from 'next/server';
import { revokeApiKey } from '@/lib/integration/v1/admin';
import { requireIntegrationsAdmin, integrationsAdminError } from '../../_shared';

/**
 * DELETE /api/admin/integrations/api-keys/[id] - Revoke an API key
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireIntegrationsAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 });
  }

  try {
    await revokeApiKey(auth.tenantId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return integrationsAdminError(err, 'api-keys DELETE');
  }
}
