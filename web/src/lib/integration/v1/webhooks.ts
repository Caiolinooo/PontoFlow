import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IntegrationEventInput } from './types';

export const WEBHOOK_MAX_ATTEMPTS = 8;

// ===== Segredo dos endpoints (AES-256-GCM; chave derivada de env) =====

function encryptionKey(): Buffer {
  const material =
    process.env.INTEGRATION_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'pontoflow-integration-dev-only';
  return crypto.createHash('sha256').update(material, 'utf8').digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${ct.toString('base64')}`;
}

export function decryptSecret(enc: string): string {
  const [version, ivB64, tagB64, ctB64] = enc.split('.');
  if (version !== 'v1' || !ivB64 || !tagB64 || !ctB64) throw new Error('invalid_secret_enc');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

// ===== Emissão (outbox) =====

/**
 * Grava 1 linha em integration_webhook_events por endpoint habilitado do tenant
 * que assina o tipo. Chamada imediatamente após a transição de estado no mesmo
 * handler; falha de emissão NUNCA derruba a operação de negócio (log only).
 * O `id` do evento (= id da linha) é o que o consumidor usa para dedup.
 */
export async function emitIntegrationEvent(
  supabase: SupabaseClient,
  tenantId: string,
  event: IntegrationEventInput
): Promise<void> {
  try {
    const { data: endpoints, error } = await supabase
      .from('integration_webhook_endpoints')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('enabled', true)
      .contains('event_types', [event.type]);

    if (error) {
      console.error('[integration/v1] webhook endpoint lookup failed:', error.message);
      return;
    }
    if (!endpoints || endpoints.length === 0) return;

    const rows = endpoints.map((ep) => {
      const id = crypto.randomUUID();
      return {
        id,
        tenant_id: tenantId,
        endpoint_id: ep.id,
        type: event.type,
        payload_json: { ...event, id },
      };
    });

    const { error: insertError } = await supabase.from('integration_webhook_events').insert(rows);
    if (insertError) {
      console.error('[integration/v1] webhook event insert failed:', insertError.message);
    }
  } catch (e) {
    console.error('[integration/v1] emitIntegrationEvent error:', e);
  }
}

// ===== Assinatura HMAC =====

/** `t=<unix>,v1=<hmac_sha256 hex de "<t>.<rawBody>">` */
export function signWebhookBody(rawBody: string, secret: string, timestampSec?: number): string {
  const t = timestampSec ?? Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`, 'utf8').digest('hex');
  return `t=${t},v1=${v1}`;
}

// ===== Dispatcher =====

export interface DispatchResult {
  claimed: number;
  delivered: number;
  retried: number;
  dead: number;
}

interface EndpointRow {
  id: string;
  url: string;
  secret_enc: string;
  enabled: boolean;
}

/**
 * Entrega até `limit` eventos pendentes (next_attempt_at vencido).
 * Backoff 2^n minutos (n = attempts após incremento); dead após WEBHOOK_MAX_ATTEMPTS.
 * Nota: skip-locked real exigiria função SQL; o cron é único e a entrega é
 * at-least-once (consumidor faz dedup por `id`), então overlap é benigno.
 */
export async function dispatchWebhookBatch(supabase: SupabaseClient, limit = 25): Promise<DispatchResult> {
  const now = new Date().toISOString();
  const { data: events, error } = await supabase
    .from('integration_webhook_events')
    .select('id, tenant_id, endpoint_id, type, payload_json, attempts')
    .is('delivered_at', null)
    .is('dead_at', null)
    .lte('next_attempt_at', now)
    .order('next_attempt_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[integration/v1] webhook dispatch fetch failed:', error.message);
    return { claimed: 0, delivered: 0, retried: 0, dead: 0 };
  }
  if (!events || events.length === 0) return { claimed: 0, delivered: 0, retried: 0, dead: 0 };

  const endpointIds = [...new Set(events.map((e) => e.endpoint_id as string))];
  const { data: endpoints } = await supabase
    .from('integration_webhook_endpoints')
    .select('id, url, secret_enc, enabled')
    .in('id', endpointIds);
  const endpointById: Record<string, EndpointRow> = {};
  for (const ep of (endpoints ?? []) as EndpointRow[]) {
    endpointById[ep.id] = ep;
  }

  const result: DispatchResult = { claimed: events.length, delivered: 0, retried: 0, dead: 0 };

  for (const event of events) {
    const endpoint = endpointById[event.endpoint_id as string];
    const rawBody = JSON.stringify(event.payload_json);

    let lastError: string | null = null;
    let ok = false;

    if (!endpoint || !endpoint.enabled) {
      lastError = 'endpoint_disabled_or_deleted';
    } else {
      try {
        const secret = decryptSecret(endpoint.secret_enc);
        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-pontoflow-signature': signWebhookBody(rawBody, secret),
          },
          body: rawBody,
          signal: AbortSignal.timeout(10_000),
        });
        ok = res.status >= 200 && res.status < 300;
        if (!ok) lastError = `http_${res.status}`;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }

    if (ok) {
      result.delivered++;
      await supabase
        .from('integration_webhook_events')
        .update({ delivered_at: new Date().toISOString(), last_error: null })
        .eq('id', event.id);
      continue;
    }

    const attempts = ((event.attempts as number | null) ?? 0) + 1;
    if (attempts >= WEBHOOK_MAX_ATTEMPTS) {
      result.dead++;
      await supabase
        .from('integration_webhook_events')
        .update({ attempts, dead_at: new Date().toISOString(), last_error: lastError })
        .eq('id', event.id);
    } else {
      result.retried++;
      const nextAttempt = new Date(Date.now() + 2 ** attempts * 60 * 1000).toISOString();
      await supabase
        .from('integration_webhook_events')
        .update({ attempts, next_attempt_at: nextAttempt, last_error: lastError })
        .eq('id', event.id);
    }
  }

  return result;
}
