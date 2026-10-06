import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/service';
import { authenticateApiKey, hasScope } from '@/lib/integration/v1/auth';
import { apiError, apiOk } from '@/lib/integration/v1/http';
import { getPersonByExternalId, PersonError, setPersonActive } from '@/lib/integration/v1/people';

const PatchSchema = z.object({ active: z.boolean() });

type Ctx = { params: Promise<{ externalId: string }> };

export async function GET(req: NextRequest, context: Ctx) {
  const supabase = getServiceSupabase();
  const authResult = await authenticateApiKey(supabase, req.headers);
  if (!authResult.ok) return apiError(authResult.status, authResult.code, authResult.message);
  if (!hasScope(authResult.auth, 'people:write')) {
    return apiError(403, 'forbidden_scope', 'Scope people:write is required');
  }

  const { externalId } = await context.params;
  try {
    const person = await getPersonByExternalId(supabase, authResult.auth.tenantId, externalId);
    if (!person) return apiError(404, 'not_found', 'Person not found');
    return apiOk(person);
  } catch (e) {
    if (e instanceof PersonError) return apiError(e.status, e.code, e.message, e.details);
    console.error('[integration/v1] GET /people/[externalId] error:', e);
    return apiError(500, 'internal_error', 'Internal server error');
  }
}

export async function PATCH(req: NextRequest, context: Ctx) {
  const supabase = getServiceSupabase();
  const authResult = await authenticateApiKey(supabase, req.headers);
  if (!authResult.ok) return apiError(authResult.status, authResult.code, authResult.message);
  if (!hasScope(authResult.auth, 'people:write')) {
    return apiError(403, 'forbidden_scope', 'Scope people:write is required');
  }

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, 'invalid_body', 'Body must be { active: boolean }', parsed.error.issues);
  }

  const { externalId } = await context.params;
  try {
    const result = await setPersonActive(supabase, authResult.auth.tenantId, externalId, parsed.data.active);
    if (!result) return apiError(404, 'not_found', 'Person not found');
    return apiOk(result);
  } catch (e) {
    if (e instanceof PersonError) return apiError(e.status, e.code, e.message, e.details);
    console.error('[integration/v1] PATCH /people/[externalId] error:', e);
    return apiError(500, 'internal_error', 'Internal server error');
  }
}
