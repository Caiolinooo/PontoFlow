import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/service';
import { authenticateApiKey, hasScope } from '@/lib/integration/v1/auth';
import { apiError, apiOk } from '@/lib/integration/v1/http';
import { withIdempotency } from '@/lib/integration/v1/idempotency';
import { listPeople, PersonError, upsertPerson } from '@/lib/integration/v1/people';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WorkdaySchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4),
  z.literal(5), z.literal(6), z.literal(7),
]);

const PersonUpsertSchema = z.object({
  externalId: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  cpf: z.string().regex(/^\d{11}$/).optional(),
  active: z.boolean(),
  schedule: z
    .discriminatedUnion('kind', [
      z.object({
        kind: z.literal('pattern'),
        daysOn: z.number().int().positive(),
        daysOff: z.number().int().positive(),
        anchor: z.string().regex(DATE_RE),
      }),
      z.object({
        kind: z.literal('weekly'),
        workdays: z.array(WorkdaySchema).min(1).max(7),
      }),
    ])
    .optional(),
  managerExternalId: z.string().optional(),
  attributes: z.record(z.string()).optional(),
});

export async function PUT(req: NextRequest) {
  const supabase = getServiceSupabase();
  const authResult = await authenticateApiKey(supabase, req.headers);
  if (!authResult.ok) return apiError(authResult.status, authResult.code, authResult.message);
  if (!hasScope(authResult.auth, 'people:write')) {
    return apiError(403, 'forbidden_scope', 'Scope people:write is required');
  }

  const idempotencyKey = req.headers.get('idempotency-key');
  if (!idempotencyKey) {
    return apiError(400, 'idempotency_key_required', 'Idempotency-Key header is required on PUT /people');
  }

  const rawBody = await req.text();
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return apiError(400, 'invalid_body', 'Request body is not valid JSON');
  }
  const parsed = PersonUpsertSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, 'invalid_body', 'Body does not match PersonUpsert schema', parsed.error.issues);
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true';
  const tenantId = authResult.auth.tenantId;

  try {
    const outcome = await withIdempotency(supabase, tenantId, idempotencyKey, rawBody, async () => {
      const result = await upsertPerson(supabase, tenantId, parsed.data, { dryRun });
      return { status: result.created ? 201 : 200, body: result };
    });

    if (outcome.kind === 'conflict') {
      return apiError(409, 'idempotency_conflict', 'Idempotency-Key already used with a different payload');
    }
    return apiOk(outcome.response.body, outcome.response.status, {
      ...(outcome.kind === 'replay' ? { 'Idempotency-Replayed': 'true' } : {}),
      ...(dryRun ? { 'X-PontoFlow-Dry-Run': 'true' } : {}),
    });
  } catch (e) {
    if (e instanceof PersonError) return apiError(e.status, e.code, e.message, e.details);
    console.error('[integration/v1] PUT /people error:', e);
    return apiError(500, 'internal_error', 'Internal server error');
  }
}

export async function GET(req: NextRequest) {
  const supabase = getServiceSupabase();
  const authResult = await authenticateApiKey(supabase, req.headers);
  if (!authResult.ok) return apiError(authResult.status, authResult.code, authResult.message);
  if (!hasScope(authResult.auth, 'people:write')) {
    return apiError(403, 'forbidden_scope', 'Scope people:write is required');
  }

  const params = req.nextUrl.searchParams;
  const activeParam = params.get('active');
  try {
    const { people, total } = await listPeople(supabase, authResult.auth.tenantId, {
      active: activeParam === null ? undefined : activeParam === 'true',
      limit: params.get('limit') ? Number(params.get('limit')) : undefined,
      offset: params.get('offset') ? Number(params.get('offset')) : undefined,
    });
    return apiOk({ people, total });
  } catch (e) {
    if (e instanceof PersonError) return apiError(e.status, e.code, e.message, e.details);
    console.error('[integration/v1] GET /people error:', e);
    return apiError(500, 'internal_error', 'Internal server error');
  }
}
