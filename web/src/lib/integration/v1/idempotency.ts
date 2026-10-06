import type { SupabaseClient } from '@supabase/supabase-js';
import { sha256Hex } from './auth';

export interface StoredResponse {
  status: number;
  body: unknown;
}

export type IdempotencyOutcome =
  | { kind: 'replay'; response: StoredResponse }
  | { kind: 'conflict' }
  | { kind: 'executed'; response: StoredResponse };

/**
 * Executa `fn` sob a chave de idempotência (tenant, key).
 * - Mesma key + mesmo request_hash => replay da resposta armazenada (não reexecuta).
 * - Mesma key + hash diferente => conflict (caller responde 409).
 * TTL de 24h: limpeza feita no cron webhook-dispatch (purgeIdempotencyKeys).
 */
export async function withIdempotency(
  supabase: SupabaseClient,
  tenantId: string,
  key: string,
  rawBody: string,
  fn: () => Promise<StoredResponse>
): Promise<IdempotencyOutcome> {
  const requestHash = sha256Hex(rawBody);

  const { data: existing } = await supabase
    .from('integration_idempotency_keys')
    .select('request_hash, response_json')
    .eq('tenant_id', tenantId)
    .eq('key', key)
    .maybeSingle();

  if (existing) {
    if (existing.request_hash !== requestHash) return { kind: 'conflict' };
    return { kind: 'replay', response: existing.response_json as StoredResponse };
  }

  const response = await fn();

  const { error: insertError } = await supabase.from('integration_idempotency_keys').insert({
    tenant_id: tenantId,
    key,
    request_hash: requestHash,
    response_json: response,
  });

  if (insertError) {
    // Corrida: outra request gravou primeiro — relê e devolve o armazenado
    const { data: winner } = await supabase
      .from('integration_idempotency_keys')
      .select('request_hash, response_json')
      .eq('tenant_id', tenantId)
      .eq('key', key)
      .maybeSingle();
    if (winner) {
      if (winner.request_hash !== requestHash) return { kind: 'conflict' };
      return { kind: 'replay', response: winner.response_json as StoredResponse };
    }
    console.error('[integration/v1] idempotency insert failed:', insertError.message);
  }

  return { kind: 'executed', response };
}

/** Remove chaves com mais de 24h (chamado pelo cron). */
export async function purgeIdempotencyKeys(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('integration_idempotency_keys')
    .delete()
    .lt('created_at', cutoff)
    .select('key');
  if (error) {
    console.error('[integration/v1] idempotency purge failed:', error.message);
    return 0;
  }
  return data?.length ?? 0;
}
