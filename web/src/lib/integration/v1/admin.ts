import crypto from 'crypto';
import { getServiceSupabase } from '@/lib/supabase/service';
import { sha256Hex } from './auth';
import { encryptSecret } from './webhooks';

/**
 * Funções tenant-scoped para a UI admin (proxies em /api/admin/integrations/**)
 * e para as rotas da Integration API v1. Instanciam o service client internamente.
 */

// ===== API keys =====

export interface CreateApiKeyInput {
  label: string;
  scopes?: string[];
  allowedCidrs?: string[];
}

export async function createApiKey(tenantId: string, input: CreateApiKeyInput) {
  const supabase = getServiceSupabase();
  const secret = `pf_live_${crypto.randomBytes(24).toString('hex')}`;
  const key_prefix = secret.slice(0, 16);
  const { data, error } = await supabase
    .from('integration_api_keys')
    .insert({
      tenant_id: tenantId,
      label: input.label,
      key_prefix,
      key_hash: sha256Hex(secret),
      scopes: input.scopes ?? ['people:write', 'timesheets:read', 'sso:create'],
      allowed_cidrs: input.allowedCidrs ?? null,
    })
    .select('id, key_prefix, scopes, created_at')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'create_api_key_failed');
  // `secret` é retornado UMA única vez; só o hash fica persistido
  return { id: data.id, key_prefix: data.key_prefix, secret, scopes: data.scopes, created_at: data.created_at };
}

export async function listApiKeys(tenantId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('integration_api_keys')
    .select('id, label, key_prefix, scopes, last_used_at, revoked_at, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function revokeApiKey(tenantId: string, keyId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('integration_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('tenant_id', tenantId)
    .is('revoked_at', null)
    .select('id');
  if (error) throw new Error(error.message);
  return { revoked: (data?.length ?? 0) > 0 };
}

// ===== Webhook endpoints =====

export interface CreateWebhookEndpointInput {
  url: string;
  eventTypes: string[];
  enabled?: boolean;
}

export async function createWebhookEndpoint(tenantId: string, input: CreateWebhookEndpointInput) {
  const supabase = getServiceSupabase();
  const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
  const { data, error } = await supabase
    .from('integration_webhook_endpoints')
    .insert({
      tenant_id: tenantId,
      url: input.url,
      secret_enc: encryptSecret(secret),
      event_types: input.eventTypes,
      enabled: input.enabled ?? true,
    })
    .select('id, url, event_types, enabled, created_at')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'create_webhook_endpoint_failed');
  // `secret` (assinatura HMAC) é retornado UMA única vez
  return {
    id: data.id,
    url: data.url,
    secret,
    event_types: data.event_types,
    enabled: data.enabled,
    created_at: data.created_at,
  };
}

export async function listWebhookEndpoints(tenantId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('integration_webhook_endpoints')
    .select('id, url, event_types, enabled, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateWebhookEndpoint(
  tenantId: string,
  id: string,
  patch: { url?: string; eventTypes?: string[]; enabled?: boolean }
) {
  const supabase = getServiceSupabase();
  const update: Record<string, unknown> = {};
  if (patch.url !== undefined) update.url = patch.url;
  if (patch.eventTypes !== undefined) update.event_types = patch.eventTypes;
  if (patch.enabled !== undefined) update.enabled = patch.enabled;
  const { data, error } = await supabase
    .from('integration_webhook_endpoints')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('id, url, event_types, enabled, created_at')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteWebhookEndpoint(tenantId: string, id: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('integration_webhook_endpoints')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('id');
  if (error) throw new Error(error.message);
  return { deleted: (data?.length ?? 0) > 0 };
}

// ===== Eventos recentes =====

export async function listRecentWebhookEvents(
  tenantId: string,
  opts: { limit?: number; endpointId?: string } = {}
) {
  const supabase = getServiceSupabase();
  let query = supabase
    .from('integration_webhook_events')
    .select('id, endpoint_id, type, attempts, delivered_at, dead_at, last_error, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(opts.limit ?? 50, 1), 200));
  if (opts.endpointId) query = query.eq('endpoint_id', opts.endpointId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
