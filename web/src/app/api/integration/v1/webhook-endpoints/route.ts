import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/service';
import { authenticateApiKey, hasScope } from '@/lib/integration/v1/auth';
import { apiError, apiOk } from '@/lib/integration/v1/http';
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  listWebhookEndpoints,
} from '@/lib/integration/v1/admin';

const EVENT_TYPES = [
  'person.provisioned',
  'person.deactivated',
  'timesheet.submitted',
  'timesheet.approved',
  'timesheet.rejected',
  'period.locked',
] as const;

const CreateSchema = z.object({
  url: z.string().url(),
  eventTypes: z.array(z.enum(EVENT_TYPES)).min(1),
  enabled: z.boolean().optional(),
});

async function requireWebhooksScope(req: NextRequest) {
  const supabase = getServiceSupabase();
  const authResult = await authenticateApiKey(supabase, req.headers);
  if (!authResult.ok) return { error: apiError(authResult.status, authResult.code, authResult.message) };
  if (!hasScope(authResult.auth, 'webhooks:manage')) {
    return { error: apiError(403, 'forbidden_scope', 'Scope webhooks:manage is required') };
  }
  return { tenantId: authResult.auth.tenantId };
}

export async function POST(req: NextRequest) {
  const gate = await requireWebhooksScope(req);
  if ('error' in gate) return gate.error;

  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, 'invalid_body', 'Body must be { url, eventTypes[], enabled? }', parsed.error.issues);
  }

  try {
    const endpoint = await createWebhookEndpoint(gate.tenantId, parsed.data);
    return apiOk(endpoint, 201); // `secret` aparece somente nesta resposta
  } catch (e) {
    console.error('[integration/v1] POST /webhook-endpoints error:', e);
    return apiError(500, 'internal_error', 'Internal server error');
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireWebhooksScope(req);
  if ('error' in gate) return gate.error;

  try {
    const endpoints = await listWebhookEndpoints(gate.tenantId);
    return apiOk({ endpoints });
  } catch (e) {
    console.error('[integration/v1] GET /webhook-endpoints error:', e);
    return apiError(500, 'internal_error', 'Internal server error');
  }
}

export async function DELETE(req: NextRequest) {
  const gate = await requireWebhooksScope(req);
  if ('error' in gate) return gate.error;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return apiError(400, 'invalid_body', 'Query param id is required');

  try {
    const { deleted } = await deleteWebhookEndpoint(gate.tenantId, id);
    if (!deleted) return apiError(404, 'not_found', 'Endpoint not found');
    return apiOk({ deleted: true });
  } catch (e) {
    console.error('[integration/v1] DELETE /webhook-endpoints error:', e);
    return apiError(500, 'internal_error', 'Internal server error');
  }
}
