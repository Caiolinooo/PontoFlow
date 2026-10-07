import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/service';
import { authenticateApiKey, hasScope } from '@/lib/integration/v1/auth';
import { apiError, apiOk } from '@/lib/integration/v1/http';
import { withIdempotency } from '@/lib/integration/v1/idempotency';
import { PunchError, recordPunch } from '@/lib/integration/v1/punches';

const BodySchema = z.object({
  externalId: z.string().min(1),
  kind: z.enum(['in', 'out']),
  at: z.string().min(1),
  source: z.enum(['portal', 'web']),
  geo: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
});

/** POST /api/integration/v1/punches — mesma batida do portal e do site. */
export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  const authResult = await authenticateApiKey(supabase, req.headers);
  if (!authResult.ok) return apiError(authResult.status, authResult.code, authResult.message);
  const canWrite = hasScope(authResult.auth, 'punches:write') || hasScope(authResult.auth, 'people:write');
  if (!canWrite) {
    return apiError(403, 'forbidden_scope', 'Scope punches:write or people:write is required');
  }

  const idempotencyKey = req.headers.get('idempotency-key');
  if (!idempotencyKey) {
    return apiError(400, 'idempotency_key_required', 'Idempotency-Key header is required on POST /punches');
  }

  const rawBody = await req.text();
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return apiError(400, 'invalid_body', 'Request body is not valid JSON');
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, 'invalid_body', 'Body does not match punch schema', parsed.error.issues);
  }

  const tenantId = authResult.auth.tenantId;
  try {
    const outcome = await withIdempotency(supabase, tenantId, idempotencyKey, rawBody, async () => {
      const result = await recordPunch(supabase, tenantId, parsed.data);
      return { status: 201, body: result };
    });
    if (outcome.kind === 'conflict') {
      return apiError(409, 'idempotency_conflict', 'Idempotency-Key already used with a different payload');
    }
    return apiOk(outcome.response.body, outcome.response.status, {
      ...(outcome.kind === 'replay' ? { 'Idempotency-Replayed': 'true' } : {}),
    });
  } catch (e) {
    if (e instanceof PunchError) return apiError(e.status, e.code, e.message);
    console.error('[integration/v1] POST /punches error:', e);
    return apiError(500, 'internal_error', 'Internal server error');
  }
}
