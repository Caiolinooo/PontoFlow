import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/service';
import { authenticateApiKey, hasScope } from '@/lib/integration/v1/auth';
import { apiError, apiOk } from '@/lib/integration/v1/http';
import { createSsoLink, SsoError } from '@/lib/integration/v1/sso';

const BodySchema = z.object({ externalId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  const authResult = await authenticateApiKey(supabase, req.headers);
  if (!authResult.ok) return apiError(authResult.status, authResult.code, authResult.message);
  if (!hasScope(authResult.auth, 'sso:create')) {
    return apiError(403, 'forbidden_scope', 'Scope sso:create is required');
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, 'invalid_body', 'Body must be { externalId: string }', parsed.error.issues);
  }

  try {
    const link = await createSsoLink(supabase, authResult.auth.tenantId, parsed.data.externalId);
    return apiOk(link, 201);
  } catch (e) {
    if (e instanceof SsoError) {
      return apiError(e.status, e.code === 'session_unavailable' ? 'internal_error' : e.code, e.message);
    }
    console.error('[integration/v1] POST /sso error:', e);
    return apiError(500, 'internal_error', 'Internal server error');
  }
}
