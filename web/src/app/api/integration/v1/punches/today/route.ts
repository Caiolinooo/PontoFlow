import { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { authenticateApiKey, hasScope } from '@/lib/integration/v1/auth';
import { apiError, apiOk } from '@/lib/integration/v1/http';
import { PunchError, todayPunch } from '@/lib/integration/v1/punches';

/** GET /api/integration/v1/punches/today?externalId= — última batida do dia. */
export async function GET(req: NextRequest) {
  const supabase = getServiceSupabase();
  const authResult = await authenticateApiKey(supabase, req.headers);
  if (!authResult.ok) return apiError(authResult.status, authResult.code, authResult.message);
  const canRead = hasScope(authResult.auth, 'timesheets:read') || hasScope(authResult.auth, 'punches:write');
  if (!canRead) {
    return apiError(403, 'forbidden_scope', 'Scope timesheets:read is required');
  }

  const externalId = req.nextUrl.searchParams.get('externalId');
  if (!externalId) {
    return apiError(400, 'invalid_body', 'Query param externalId is required');
  }

  try {
    const today = await todayPunch(supabase, authResult.auth.tenantId, externalId);
    return apiOk(today);
  } catch (e) {
    if (e instanceof PunchError) return apiError(e.status, e.code, e.message);
    console.error('[integration/v1] GET /punches/today error:', e);
    return apiError(500, 'internal_error', 'Internal server error');
  }
}
