import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { dispatchWebhookBatch } from '@/lib/integration/v1/webhooks';
import { purgeIdempotencyKeys } from '@/lib/integration/v1/idempotency';
import { purgeExpiredSsoTokens } from '@/lib/integration/v1/sso';

/**
 * Cron: drena integration_webhook_events (25/lote, backoff 2^n, dead após 8)
 * e faz higiene das tabelas de integração (idempotency keys > 24h, SSO expirado).
 * Authorization: Bearer $CRON_SECRET (Vercel Cron) ou ?secret= (legado).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'cron_secret_not_configured' }, { status: 500 });
  }
  const providedSecret = authHeader?.replace('Bearer ', '') || req.nextUrl.searchParams.get('secret');
  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getServiceSupabase();
    const dispatch = await dispatchWebhookBatch(supabase, 25);
    const purgedIdempotencyKeys = await purgeIdempotencyKeys(supabase);
    const purgedSsoTokens = await purgeExpiredSsoTokens(supabase);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      dispatch,
      purgedIdempotencyKeys,
      purgedSsoTokens,
    });
  } catch (e) {
    console.error('[cron/webhook-dispatch] error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
