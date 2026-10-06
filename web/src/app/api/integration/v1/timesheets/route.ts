import { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { authenticateApiKey, hasScope } from '@/lib/integration/v1/auth';
import { apiError, apiOk } from '@/lib/integration/v1/http';
import { listTimesheetSummaries } from '@/lib/integration/v1/timesheets';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/integration/v1/timesheets?externalId&from&to — resumo derivado (read-only). */
export async function GET(req: NextRequest) {
  const supabase = getServiceSupabase();
  const authResult = await authenticateApiKey(supabase, req.headers);
  if (!authResult.ok) return apiError(authResult.status, authResult.code, authResult.message);
  if (!hasScope(authResult.auth, 'timesheets:read')) {
    return apiError(403, 'forbidden_scope', 'Scope timesheets:read is required');
  }

  const params = req.nextUrl.searchParams;
  const externalId = params.get('externalId');
  const from = params.get('from');
  const to = params.get('to');
  if (!externalId || !from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return apiError(400, 'invalid_body', 'Query params externalId, from e to (YYYY-MM-DD) são obrigatórios');
  }
  if (from > to) {
    return apiError(400, 'invalid_body', 'from must be <= to');
  }

  try {
    const summaries = await listTimesheetSummaries(supabase, authResult.auth.tenantId, externalId, from, to);
    if (summaries === null) return apiError(404, 'not_found', 'Person not found');
    return apiOk({ timesheets: summaries });
  } catch (e) {
    console.error('[integration/v1] GET /timesheets error:', e);
    return apiError(500, 'internal_error', 'Internal server error');
  }
}
