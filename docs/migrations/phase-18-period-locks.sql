-- Phase 18: Period Locks (monthly open/close control)
-- Creates table to control per-tenant monthly locks for timesheet edit/submit

create table if not exists public.period_locks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_month date not null, -- use first day of month as canonical value
  locked boolean not null default true,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, period_month)
);

-- Keep canonical value as first day of month (YYYY-MM-01)
create or replace function public.canonical_month(d date)
returns date language sql immutable as $$
  select date_trunc('month', d)::date
$$;

-- Trigger to normalize period_month and update updated_at
create or replace function public.period_locks_bu() returns trigger as $$
begin
  new.period_month := public.canonical_month(new.period_month);
  new.updated_at := now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_period_locks_bu on public.period_locks;
create trigger trg_period_locks_bu before insert or update on public.period_locks
for each row execute function public.period_locks_bu();

-- RLS (enable; policies to be refined as needed)
alter table public.period_locks enable row level security;
-- Example policy (read-only for all authenticated; writes via server API only):
-- create policy period_locks_select on public.period_locks for select using (true);


