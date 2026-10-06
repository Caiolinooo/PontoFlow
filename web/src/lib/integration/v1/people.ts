import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IntegrationErrorCode, PersonResult, PersonUpsert, WorkSchedule } from './types';
import { sendEmail } from '@/lib/notifications/email-service';
import { getBaseUrl } from '@/lib/base-url';
import { emitIntegrationEvent } from './webhooks';

export class PersonError extends Error {
  constructor(
    public code: IntegrationErrorCode,
    message: string,
    public status: number = 400,
    public details?: unknown
  ) {
    super(message);
  }
}

interface EmployeeRow {
  id: string;
  tenant_id: string;
  profile_id: string;
  name: string | null;
  external_id: string | null;
  cpf: string | null;
  active: boolean;
  deactivated_at: string | null;
  dados_pessoais_json?: Record<string, unknown> | null;
}

const SCHEDULE_ENUMS = ['7x7', '14x14', '21x21', '28x28'] as const;

function splitDisplayName(displayName: string): { first: string; last: string } {
  const parts = displayName.trim().split(/\s+/);
  return { first: parts[0] ?? displayName, last: parts.slice(1).join(' ') || parts[0] || displayName };
}

async function findEmployeeByEmail(
  supabase: SupabaseClient,
  tenantId: string,
  email: string
): Promise<EmployeeRow | null> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id')
    .ilike('email', email.toLowerCase());
  const profileIds = (profiles ?? []).map((p) => p.user_id as string);
  if (profileIds.length === 0) return null;
  const { data } = await supabase
    .from('employees')
    .select('id, tenant_id, profile_id, name, external_id, cpf, active, deactivated_at, dados_pessoais_json')
    .eq('tenant_id', tenantId)
    .in('profile_id', profileIds)
    .limit(1)
    .maybeSingle();
  return (data as EmployeeRow | null) ?? null;
}

function mergeAttributes(
  existing: Record<string, unknown> | null | undefined,
  attributes?: Record<string, string>
): Record<string, unknown> | undefined {
  if (!attributes) return undefined;
  return { ...(existing ?? {}), attributes };
}

async function upsertSchedule(
  supabase: SupabaseClient,
  employeeId: string,
  schedule: WorkSchedule
): Promise<void> {
  const row =
    schedule.kind === 'pattern'
      ? {
          work_schedule: (SCHEDULE_ENUMS as readonly string[]).includes(`${schedule.daysOn}x${schedule.daysOff}`)
            ? `${schedule.daysOn}x${schedule.daysOff}`
            : 'custom',
          days_on: schedule.daysOn,
          days_off: schedule.daysOff,
          start_date: schedule.anchor,
          end_date: null,
          notes: null as string | null,
        }
      : {
          work_schedule: 'custom',
          days_on: schedule.workdays.length,
          days_off: 7 - schedule.workdays.length,
          start_date: new Date().toISOString().slice(0, 10),
          end_date: null,
          notes: JSON.stringify({ kind: 'weekly', workdays: schedule.workdays }),
        };

  const { data: latest } = await supabase
    .from('employee_work_schedules')
    .select('work_schedule, days_on, days_off, start_date')
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    latest &&
    latest.work_schedule === row.work_schedule &&
    latest.days_on === row.days_on &&
    latest.days_off === row.days_off &&
    latest.start_date === row.start_date
  ) {
    return; // já está vigente
  }

  const { error } = await supabase.from('employee_work_schedules').insert({ employee_id: employeeId, ...row });
  if (error) {
    console.error('[integration/v1] schedule insert failed:', error.message);
    throw new PersonError('internal_error', 'Failed to upsert work schedule', 500, error.message);
  }
}

function applyActiveFields(active: boolean): { active: boolean; deactivated_at: string | null } {
  return { active, deactivated_at: active ? null : new Date().toISOString() };
}

/**
 * Cria login (users_unified com senha aleatória inutilizável) + profile + employee + role COLAB.
 * Usado em tenant sso_only (sem convite/senha) e como fallback quando o login já existe.
 */
async function createEmployeeWithLogin(
  supabase: SupabaseClient,
  tenantId: string,
  input: PersonUpsert
): Promise<string> {
  const email = input.email.toLowerCase();
  const { first, last } = splitDisplayName(input.displayName);

  // Reusa users_unified existente ou cria um novo (senha = hash de segredo aleatório)
  const { data: existingUser } = await supabase
    .from('users_unified')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  let userId: string;
  if (existingUser) {
    userId = existingUser.id as string;
  } else {
    const password_hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const now = new Date().toISOString();
    const { data: newUser, error: userError } = await supabase
      .from('users_unified')
      .insert({
        email,
        password_hash,
        first_name: first,
        last_name: last,
        role: 'USER',
        active: true,
        email_verified: true,
        failed_login_attempts: 0,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();
    if (userError || !newUser) {
      throw new PersonError('internal_error', 'Failed to create user login', 500, userError?.message);
    }
    userId = newUser.id as string;
  }

  // Profile (idempotente por user_id)
  await supabase.from('profiles').upsert(
    {
      user_id: userId,
      display_name: input.displayName,
      email,
      ativo: true,
      locale: 'pt-BR',
    },
    { onConflict: 'user_id' }
  );

  // Papel COLAB no tenant (ignora duplicado)
  const { error: roleError } = await supabase
    .from('tenant_user_roles')
    .insert({ tenant_id: tenantId, user_id: userId, role: 'COLAB' });
  if (roleError && roleError.code !== '23505') {
    console.warn('[integration/v1] tenant role insert warning:', roleError.message);
  }

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .insert({
      tenant_id: tenantId,
      profile_id: userId,
      name: input.displayName,
      external_id: input.externalId,
      cpf: input.cpf ?? null,
      ...applyActiveFields(input.active),
      dados_pessoais_json: mergeAttributes(null, input.attributes) ?? {},
    })
    .select('id')
    .single();
  if (empError || !employee) {
    throw new PersonError('internal_error', 'Failed to create employee', 500, empError?.message);
  }
  return employee.id as string;
}

/** Convite pelo fluxo existente (tenant auth_mode='password'). */
async function createInvitation(
  supabase: SupabaseClient,
  tenantId: string,
  input: PersonUpsert
): Promise<void> {
  const email = input.email.toLowerCase();

  const { data: existingUser } = await supabase.from('users_unified').select('id').eq('email', email).maybeSingle();
  if (existingUser) {
    throw new PersonError('email_conflict', 'A login with this email already exists outside this tenant', 409);
  }
  const { data: pending } = await supabase
    .from('user_invitations')
    .select('id')
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();
  if (pending) return; // convite já pendente: idempotente

  // invited_by é NOT NULL no fluxo existente: usa um TENANT_ADMIN do tenant (ou qualquer ADMIN)
  const { data: tenantAdmin } = await supabase
    .from('tenant_user_roles')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'TENANT_ADMIN')
    .limit(1)
    .maybeSingle();
  let inviterId = tenantAdmin?.user_id as string | undefined;
  if (!inviterId) {
    const { data: globalAdmin } = await supabase
      .from('users_unified')
      .select('id')
      .eq('role', 'ADMIN')
      .limit(1)
      .maybeSingle();
    inviterId = globalAdmin?.id as string | undefined;
  }
  if (!inviterId) {
    throw new PersonError('no_inviter', 'No admin user available to own the invitation', 500);
  }

  const { first, last } = splitDisplayName(input.displayName);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: inviteError } = await supabase.from('user_invitations').insert({
    email,
    first_name: first,
    last_name: last,
    role: 'USER',
    invited_by: inviterId,
    token,
    expires_at: expiresAt,
    status: 'pending',
    tenant_ids: [tenantId],
    metadata: { external_id: input.externalId, source: 'integration_api_v1' },
  });
  if (inviteError) {
    throw new PersonError('internal_error', 'Failed to create invitation', 500, inviteError.message);
  }

  try {
    const baseUrl = await getBaseUrl();
    const inviteUrl = `${baseUrl}/pt-BR/auth/accept-invite?token=${token}`;
    await sendEmail({
      to: email,
      subject: 'Convite para Timesheet Manager',
      html: `
        <h2>Convite para Timesheet Manager</h2>
        <p>Você foi convidado para se juntar ao Timesheet Manager.</p>
        <p><a href="${inviteUrl}" style="background-color:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px">Aceitar Convite</a></p>
        <p>Este link expira em: ${expiresAt}</p>`,
      tenantId,
    });
  } catch (e) {
    // Convite criado; e-mail é best-effort (admin pode reenviar pela UI)
    console.error('[integration/v1] invitation email failed:', e);
  }
}

/**
 * Upsert de pessoa por (tenant, externalId).
 * Ordem de busca: external_id → cpf → email. Vínculo por email/cpf quando sem external_id;
 * 409 email_conflict quando o email pertence a outro external_id.
 */
export async function upsertPerson(
  supabase: SupabaseClient,
  tenantId: string,
  input: PersonUpsert,
  opts: { dryRun?: boolean } = {}
): Promise<PersonResult> {
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, auth_mode')
    .eq('id', tenantId)
    .maybeSingle();
  if (tenantError || !tenant) {
    throw new PersonError('tenant_not_found', 'Tenant not found for this API key', 404);
  }

  // 1) external_id
  const { data: byExternal } = await supabase
    .from('employees')
    .select('id, tenant_id, profile_id, name, external_id, cpf, active, deactivated_at, dados_pessoais_json')
    .eq('tenant_id', tenantId)
    .eq('external_id', input.externalId)
    .maybeSingle();
  let employee = (byExternal as EmployeeRow | null) ?? null;

  if (employee) {
    // Email novo pertence a outro employee do tenant? => 409
    const emailOwner = await findEmployeeByEmail(supabase, tenantId, input.email);
    if (emailOwner && emailOwner.id !== employee.id) {
      throw new PersonError('email_conflict', 'Email belongs to another employee in this tenant', 409, {
        email: input.email,
      });
    }
  } else {
    // 2) cpf
    if (input.cpf) {
      const { data: byCpf } = await supabase
        .from('employees')
        .select('id, tenant_id, profile_id, name, external_id, cpf, active, deactivated_at, dados_pessoais_json')
        .eq('tenant_id', tenantId)
        .eq('cpf', input.cpf)
        .maybeSingle();
      if (byCpf) {
        const row = byCpf as EmployeeRow;
        if (row.external_id && row.external_id !== input.externalId) {
          throw new PersonError('cpf_conflict', 'CPF belongs to another external_id in this tenant', 409);
        }
        employee = row; // vínculo por CPF
      }
    }
    // 3) email
    if (!employee) {
      const byEmail = await findEmployeeByEmail(supabase, tenantId, input.email);
      if (byEmail) {
        if (byEmail.external_id && byEmail.external_id !== input.externalId) {
          throw new PersonError('email_conflict', 'Email belongs to another external_id in this tenant', 409, {
            email: input.email,
          });
        }
        employee = byEmail; // vínculo por email
      }
    }
  }

  if (opts.dryRun) {
    return {
      employeeId: employee?.id ?? null,
      externalId: input.externalId,
      state: !input.active ? 'inactive' : employee ? 'active' : tenant.auth_mode === 'sso_only' ? 'active' : 'invited',
      created: !employee,
    };
  }

  const now = new Date().toISOString();
  let created = false;
  let invited = false;
  let employeeId: string | null = employee?.id ?? null;
  const wasActive = employee?.active ?? false;

  if (employee) {
    // Atualiza employee existente (inclui vínculo de external_id/cpf quando achado por email/cpf)
    const merged = mergeAttributes(employee.dados_pessoais_json, input.attributes);
    const { error: updError } = await supabase
      .from('employees')
      .update({
        name: input.displayName,
        external_id: input.externalId,
        cpf: input.cpf ?? employee.cpf,
        ...applyActiveFields(input.active),
        ...(merged ? { dados_pessoais_json: merged } : {}),
      })
      .eq('id', employee.id);
    if (updError) {
      throw new PersonError('internal_error', 'Failed to update employee', 500, updError.message);
    }

    // Sincroniza email/display_name no profile (e email de login, best-effort)
    await supabase
      .from('profiles')
      .update({ display_name: input.displayName, email: input.email.toLowerCase() })
      .eq('user_id', employee.profile_id);
    const { error: loginEmailError } = await supabase
      .from('users_unified')
      .update({ email: input.email.toLowerCase(), updated_at: now })
      .eq('id', employee.profile_id);
    if (loginEmailError && loginEmailError.code === '23505') {
      throw new PersonError('email_conflict', 'Email already used by another login', 409, { email: input.email });
    }
  } else if (tenant.auth_mode === 'sso_only') {
    employeeId = await createEmployeeWithLogin(supabase, tenantId, input);
    created = true;
  } else {
    // Tenant 'password': convite pelo fluxo existente; o vínculo do external_id
    // acontece no próximo PUT (lookup por email) após o aceite.
    await createInvitation(supabase, tenantId, input);
    created = true;
    invited = true;
  }

  if (employeeId && input.schedule) {
    await upsertSchedule(supabase, employeeId, input.schedule);
  }

  // Eventos de saída (nunca derrubam o upsert)
  if (created && !invited) {
    await emitIntegrationEvent(supabase, tenantId, {
      type: 'person.provisioned',
      externalId: input.externalId,
      at: now,
    });
  }
  if (wasActive && !input.active) {
    await emitIntegrationEvent(supabase, tenantId, {
      type: 'person.deactivated',
      externalId: input.externalId,
      at: now,
    });
  }

  return {
    employeeId,
    externalId: input.externalId,
    state: !input.active ? 'inactive' : invited ? 'invited' : 'active',
    created,
  };
}

export async function getPersonByExternalId(
  supabase: SupabaseClient,
  tenantId: string,
  externalId: string
): Promise<{
  employeeId: string;
  externalId: string;
  email: string | null;
  displayName: string | null;
  cpf: string | null;
  state: 'active' | 'inactive';
  deactivatedAt: string | null;
} | null> {
  const { data } = await supabase
    .from('employees')
    .select('id, profile_id, name, external_id, cpf, active, deactivated_at')
    .eq('tenant_id', tenantId)
    .eq('external_id', externalId)
    .maybeSingle();
  if (!data) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, display_name')
    .eq('user_id', data.profile_id)
    .maybeSingle();
  return {
    employeeId: data.id as string,
    externalId: data.external_id as string,
    email: (profile?.email as string | null) ?? null,
    displayName: (data.name as string | null) ?? (profile?.display_name as string | null) ?? null,
    cpf: (data.cpf as string | null) ?? null,
    state: data.active ? 'active' : 'inactive',
    deactivatedAt: (data.deactivated_at as string | null) ?? null,
  };
}

/** PATCH active: liga/desliga sem deletar; emite person.deactivated na transição. */
export async function setPersonActive(
  supabase: SupabaseClient,
  tenantId: string,
  externalId: string,
  active: boolean
): Promise<PersonResult | null> {
  const { data: employee } = await supabase
    .from('employees')
    .select('id, active')
    .eq('tenant_id', tenantId)
    .eq('external_id', externalId)
    .maybeSingle();
  if (!employee) return null;

  const { error } = await supabase
    .from('employees')
    .update(applyActiveFields(active))
    .eq('id', employee.id);
  if (error) {
    throw new PersonError('internal_error', 'Failed to update employee', 500, error.message);
  }

  if (employee.active && !active) {
    await emitIntegrationEvent(supabase, tenantId, {
      type: 'person.deactivated',
      externalId,
      at: new Date().toISOString(),
    });
  }

  return {
    employeeId: employee.id as string,
    externalId,
    state: active ? 'active' : 'inactive',
    created: false,
  };
}

export async function listPeople(
  supabase: SupabaseClient,
  tenantId: string,
  opts: { active?: boolean; limit?: number; offset?: number } = {}
): Promise<{ people: unknown[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);

  let query = supabase
    .from('employees')
    .select('id, profile_id, name, external_id, cpf, active, deactivated_at', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .not('external_id', 'is', null)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);
  if (opts.active !== undefined) query = query.eq('active', opts.active);

  const { data, count, error } = await query;
  if (error) {
    throw new PersonError('internal_error', 'Failed to list people', 500, error.message);
  }

  const profileIds = [...new Set((data ?? []).map((e) => e.profile_id as string))];
  const emailByProfile: Record<string, string> = {};
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, email').in('user_id', profileIds);
    for (const p of profiles ?? []) {
      emailByProfile[p.user_id as string] = p.email as string;
    }
  }

  const people = (data ?? []).map((e) => ({
    employeeId: e.id,
    externalId: e.external_id,
    email: emailByProfile[e.profile_id as string] ?? null,
    displayName: e.name,
    cpf: e.cpf,
    state: e.active ? 'active' : 'inactive',
    deactivatedAt: e.deactivated_at,
  }));

  return { people, total: count ?? people.length };
}
