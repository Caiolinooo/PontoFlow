-- Integration API v1 (PontoFlow) — idempotente
-- Contrato: docs PLANO-IMPLEMENTACAO.md §7.1
alter table public.employees
  add column if not exists external_id text,
  add column if not exists cpf text,
  add column if not exists active boolean not null default true,
  add column if not exists deactivated_at timestamptz;
create unique index if not exists employees_tenant_external_uidx
  on public.employees (tenant_id, external_id) where external_id is not null;

alter table public.tenants
  add column if not exists auth_mode text not null default 'password' check (auth_mode in ('password','sso_only'));

create table if not exists public.integration_api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  label text not null, key_prefix text not null,
  key_hash text not null unique,                     -- sha256; segredo mostrado 1x
  scopes text[] not null default '{people:write,timesheets:read,sso:create}',
  allowed_cidrs text[], revoked_at timestamptz, last_used_at timestamptz,
  created_at timestamptz not null default now());

create table if not exists public.integration_idempotency_keys (
  tenant_id uuid not null, key text not null, request_hash text not null,
  response_json jsonb not null, created_at timestamptz not null default now(),
  primary key (tenant_id, key));                     -- TTL 24h (limpeza no cron)

create table if not exists public.integration_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  url text not null, secret_enc text not null, event_types text[] not null,
  enabled boolean not null default true, created_at timestamptz not null default now());

create table if not exists public.integration_webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, endpoint_id uuid not null references public.integration_webhook_endpoints(id) on delete cascade,
  type text not null, payload_json jsonb not null,
  attempts int not null default 0, next_attempt_at timestamptz not null default now(),
  delivered_at timestamptz, dead_at timestamptz, last_error text,
  created_at timestamptz not null default now());
create index if not exists iwe_pending_idx on public.integration_webhook_events (next_attempt_at)
  where delivered_at is null and dead_at is null;

create table if not exists public.integration_sso_tokens (
  token_hash text primary key, tenant_id uuid not null, employee_id uuid not null,
  expires_at timestamptz not null);                  -- consumo: DELETE … RETURNING, expires_at > now()
