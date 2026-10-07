import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sha256Hex } from './auth';
import { generateToken } from '@/lib/auth/jwt';
import { resolveAppRole, type AppRole } from '@/lib/auth/roles';
import { getBaseUrl } from '@/lib/base-url';

export const SSO_TOKEN_TTL_SECONDS = 60;

export class SsoError extends Error {
  constructor(
    public code: 'not_found' | 'employee_inactive' | 'session_unavailable',
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

/**
 * Cria token SSO de uso único (60s) para o employee ativo com o externalId dado.
 * Retorna a URL absoluta de consumo ({baseUrl}/sso?token=…).
 */
export async function createSsoLink(
  supabase: SupabaseClient,
  tenantId: string,
  externalId: string
): Promise<{ url: string; expiresAt: string }> {
  const { data: employee } = await supabase
    .from('employees')
    .select('id, active')
    .eq('tenant_id', tenantId)
    .eq('external_id', externalId)
    .maybeSingle();

  if (!employee) throw new SsoError('not_found', 'Person not found', 404);
  if (!employee.active) throw new SsoError('employee_inactive', 'Person is inactive', 404);

  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SSO_TOKEN_TTL_SECONDS * 1000);
  const { error } = await supabase.from('integration_sso_tokens').insert({
    token_hash: sha256Hex(token),
    tenant_id: tenantId,
    employee_id: employee.id,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new SsoError('session_unavailable', 'Failed to create SSO token', 500);

  const baseUrl = await getBaseUrl();
  return { url: `${baseUrl}/sso?token=${token}`, expiresAt: expiresAt.toISOString() };
}

export interface SsoSession {
  sessionToken: string;
  locale: string;
  userId: string;
}

/**
 * Papel real do usuário no ponto. SSO não pode carimbar USER em quem é admin,
 * senão o card de admin some na tela de ponto.
 */
export async function resolveSsoAppRole(supabase: SupabaseClient, profileId: string): Promise<AppRole> {
  const candidates: Array<string | null | undefined> = [];
  try {
    const { data: unified } = await supabase
      .from('users_unified')
      .select('role')
      .eq('id', profileId)
      .maybeSingle();
    candidates.push(unified?.role as string | undefined);

    const { data: tenantRoles } = await supabase
      .from('tenant_user_roles')
      .select('role')
      .eq('user_id', profileId);
    for (const row of tenantRoles ?? []) {
      candidates.push((row as { role?: string }).role);
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(profileId);
    const metaRole = authUser?.user?.user_metadata?.role;
    if (typeof metaRole === 'string') candidates.push(metaRole);
  } catch (err) {
    console.warn('[sso] role lookup failed, session stays USER:', err);
  }
  return resolveAppRole(...candidates);
}

/**
 * Consome o token (DELETE … RETURNING com expires_at > now(): uso único à prova de corrida)
 * e emite a sessão TS via generateToken existente. Null = inválido/expirado/já usado.
 */
export async function consumeSsoToken(supabase: SupabaseClient, token: string): Promise<SsoSession | null> {
  const { data: rows, error } = await supabase
    .from('integration_sso_tokens')
    .delete()
    .eq('token_hash', sha256Hex(token))
    .gt('expires_at', new Date().toISOString())
    .select('tenant_id, employee_id');

  if (error) {
    console.error('[integration/v1] sso consume error:', error.message);
    return null;
  }
  const consumed = rows?.[0];
  if (!consumed) return null;

  const { data: employee } = await supabase
    .from('employees')
    .select('id, profile_id, name, active')
    .eq('id', consumed.employee_id)
    .eq('tenant_id', consumed.tenant_id)
    .maybeSingle();
  if (!employee || !employee.active) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, display_name, locale')
    .eq('user_id', employee.profile_id)
    .maybeSingle();

  const sessionToken = await generateToken(employee.profile_id as string, {
    role: await resolveSsoAppRole(supabase, employee.profile_id as string),
    tenant_id: consumed.tenant_id as string,
    email: (profile?.email as string | undefined) ?? '',
    name: (employee.name as string | undefined) ?? (profile?.display_name as string | undefined) ?? '',
  });
  if (!sessionToken) {
    throw new SsoError('session_unavailable', 'JWT is not configured on this server', 500);
  }

  const locale = (profile?.locale as string | undefined) ?? 'pt-BR';
  return { sessionToken, locale, userId: employee.profile_id as string };
}

/** Remove tokens expirados (chamado pelo cron). */
export async function purgeExpiredSsoTokens(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from('integration_sso_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('token_hash');
  if (error) {
    console.error('[integration/v1] sso purge failed:', error.message);
    return 0;
  }
  return data?.length ?? 0;
}
