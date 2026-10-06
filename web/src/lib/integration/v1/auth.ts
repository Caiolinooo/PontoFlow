import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiKeyAuth, IntegrationScope } from './types';

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/** IPv4 em inteiro 32 bits; null se inválido/não-IPv4. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

/** Match simples de CIDR IPv4 (ex.: 203.0.113.0/24). Entradas sem "/" = host exato. */
export function ipAllowed(ip: string, cidrs: string[]): boolean {
  const ipInt = ipv4ToInt(ip);
  for (const raw of cidrs) {
    const cidr = raw.trim();
    if (!cidr) continue;
    if (ipInt === null) {
      // Sem parse IPv4: só aceita igualdade literal
      if (cidr === ip) return true;
      continue;
    }
    const [base, bitsStr] = cidr.split('/');
    const baseInt = ipv4ToInt(base);
    if (baseInt === null) continue;
    const bits = bitsStr === undefined ? 32 : Number(bitsStr);
    if (!Number.isInteger(bits) || bits < 0 || bits > 32) continue;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((ipInt & mask) === (baseInt & mask)) return true;
  }
  return false;
}

function clientIpFromHeaders(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('x-real-ip');
}

export type AuthResult =
  | { ok: true; auth: ApiKeyAuth }
  | { ok: false; status: 401 | 403; code: 'unauthorized' | 'forbidden_ip'; message: string };

/**
 * Autentica `X-API-Key: pf_live_…` por hash sha256 (lookup em integration_api_keys),
 * aplica allowlist de CIDR (se configurada) e atualiza last_used_at (best-effort).
 */
export async function authenticateApiKey(
  supabase: SupabaseClient,
  headers: Headers
): Promise<AuthResult> {
  const apiKey = headers.get('x-api-key');
  if (!apiKey) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Missing X-API-Key header' };
  }

  const keyHash = sha256Hex(apiKey);
  const { data: keyRow, error } = await supabase
    .from('integration_api_keys')
    .select('id, tenant_id, scopes, allowed_cidrs, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error) {
    console.error('[integration/v1] api key lookup error:', error.message);
    return { ok: false, status: 401, code: 'unauthorized', message: 'Invalid API key' };
  }
  if (!keyRow || keyRow.revoked_at) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Invalid or revoked API key' };
  }

  const cidrs: string[] | null = keyRow.allowed_cidrs;
  if (cidrs && cidrs.length > 0) {
    const ip = clientIpFromHeaders(headers);
    if (!ip || !ipAllowed(ip, cidrs)) {
      return { ok: false, status: 403, code: 'forbidden_ip', message: 'Client IP not allowed for this API key' };
    }
  }

  // last_used_at best-effort (não bloqueia a request)
  void supabase
    .from('integration_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id)
    .then(({ error: updErr }) => {
      if (updErr) console.warn('[integration/v1] last_used_at update failed:', updErr.message);
    });

  return { ok: true, auth: { keyId: keyRow.id, tenantId: keyRow.tenant_id, scopes: keyRow.scopes ?? [] } };
}

export function hasScope(auth: ApiKeyAuth, scope: IntegrationScope): boolean {
  return auth.scopes.includes(scope);
}
