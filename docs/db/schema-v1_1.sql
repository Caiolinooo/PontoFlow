-- Schema v1.1 — Timesheet Manager (multi-tenant) — Supabase/Postgres
-- Objetivo: modelagem com isolamento por tenant e delegação por grupos/gerentes

-- Tabelas base
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.environments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique(tenant_id, slug)
);

-- Perfil (separado do auth.users)
create table if not exists public.profiles (
  user_id uuid primary key,
  display_name text,
  email text,
  phone text,
  ativo boolean not null default true,
  locale text not null default 'pt-BR' check (locale in ('pt-BR','en-GB')),
  created_at timestamptz not null default now()
);

-- Roles por tenant
create table if not exists public.tenant_user_roles (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('COLAB','GERENTE','TENANT_ADMIN','ADMIN_GLOBAL')),
  primary key (tenant_id, user_id, role)
);

-- Grupos (por tenant/ambiente)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  environment_id uuid references public.environments(id) on delete set null,
  name text not null
);

-- Delegações
create table if not exists public.manager_group_assignments (
  manager_id uuid not null,
  group_id uuid not null references public.groups(id) on delete cascade,
  primary key (manager_id, group_id)
);

create table if not exists public.employee_group_members (
  employee_id uuid not null,
  group_id uuid not null references public.groups(id) on delete cascade,
  primary key (employee_id, group_id)
);

-- Embarcações
create table if not exists public.vessels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  code text
);

-- Employees
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  vessel_id uuid references public.vessels(id) on delete set null,
  cargo text,
  centro_custo text,
  dados_pessoais_json jsonb default '{}'::jsonb,
  documentos_json jsonb default '{}'::jsonb
);

-- Timesheets e entries
create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  periodo_ini date not null,
  periodo_fim date not null,
  status text not null check (status in ('rascunho','enviado','aprovado','recusado','bloqueado')),
  created_at timestamptz not null default now()
);

create table if not exists public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  tipo text not null check (tipo in ('EMBARQUE','DESEMBARQUE','TRANSLADO')),
  data date not null,
  hora_ini time,
  hora_fim time,
  comentario text
);

-- Aprovações, comentários, notificações
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  manager_id uuid not null,
  status text not null check (status in ('aprovado','recusado')),
  mensagem text,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  author_id uuid not null,
  texto text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null,
  canal text not null check (canal in ('email','in_app','push')),
  tipo text,
  payload jsonb default '{}'::jsonb,
  lido boolean default false,
  criado_em timestamptz not null default now()
);


-- Anotações (marcação de erros em campos/entradas do timesheet)
create table if not exists public.timesheet_annotations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  entry_id uuid references public.timesheet_entries(id) on delete cascade,
  field_path text,
  message text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_annotations_timesheet on public.timesheet_annotations(timesheet_id);

-- Índices úteis
create index if not exists idx_timesheets_employee on public.timesheets(employee_id);
create index if not exists idx_entries_timesheet on public.timesheet_entries(timesheet_id);
create index if not exists idx_groups_tenant on public.groups(tenant_id);

-- RLS (skeleton) — Supabase já vem com RLS ativável por tabela
alter table public.tenants enable row level security;
alter table public.environments enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_user_roles enable row level security;
alter table public.groups enable row level security;
alter table public.manager_group_assignments enable row level security;
alter table public.employee_group_members enable row level security;
alter table public.vessels enable row level security;
alter table public.employees enable row level security;
alter table public.timesheets enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.approvals enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

-- Helpers de prazo/fechamento mensal
create or replace function public.timesheet_deadline(periodo_ini date)
returns timestamptz language sql stable as $$
  select (date_trunc('month', periodo_ini)::date + interval '1 month')::timestamptz
$$;

create or replace function public.timesheet_past_deadline(periodo_ini date)
returns boolean language sql stable as $$
  select now() >= public.timesheet_deadline(periodo_ini)
$$;

alter table public.timesheet_annotations enable row level security;

-- Políticas detalhadas por papel para timesheets
-- Empregado: vê e edita seus próprios timesheets
create policy if not exists timesheets_employee_select on public.timesheets
  for select using (
    exists (
      select 1 from public.employees e
      where e.id = timesheets.employee_id
        and e.tenant_id = timesheets.tenant_id
        and e.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.manager_group_assignments mga
      join public.employee_group_members egm on egm.group_id = mga.group_id
      where mga.manager_id = auth.uid()
        and egm.employee_id = timesheets.employee_id
    )
    or exists (
      select 1 from public.tenant_user_roles tur
      where tur.user_id = auth.uid() and tur.role = 'TENANT_ADMIN' and tur.tenant_id = timesheets.tenant_id
    )
    or exists (
      select 1 from public.tenant_user_roles tur
      where tur.user_id = auth.uid() and tur.role = 'ADMIN_GLOBAL'
    )
  );

create policy if not exists timesheets_employee_insert on public.timesheets
  for insert with check (
    exists (
      select 1 from public.employees e
      where e.id = timesheets.employee_id
        and e.tenant_id = timesheets.tenant_id
        and e.profile_id = auth.uid()
    )
  );

create policy if not exists timesheets_employee_update on public.timesheets
  for update using (
    exists (
      select 1 from public.employees e
      where e.id = timesheets.employee_id
        and e.tenant_id = timesheets.tenant_id
        and e.profile_id = auth.uid()
    )
    and not public.timesheet_past_deadline(timesheets.periodo_ini)
  ) with check (
    exists (
      select 1 from public.employees e
      where e.id = timesheets.employee_id
        and e.tenant_id = timesheets.tenant_id
        and e.profile_id = auth.uid()
    )
    and not public.timesheet_past_deadline(timesheets.periodo_ini)
  );

-- Gerente: pode atualizar (aprovar/recusar) somente timesheets de colaboradores dos grupos delegados
create policy if not exists timesheets_manager_update on public.timesheets
  for update using (
    exists (
      select 1
      from public.manager_group_assignments mga
      join public.employee_group_members egm on egm.group_id = mga.group_id
      join public.employees e on e.id = egm.employee_id
      where mga.manager_id = auth.uid()
        and e.id = timesheets.employee_id
        and e.tenant_id = timesheets.tenant_id
    )
  ) with check (
    exists (
      select 1
      from public.manager_group_assignments mga
      join public.employee_group_members egm on egm.group_id = mga.group_id
      join public.employees e on e.id = egm.employee_id
      where mga.manager_id = auth.uid()
        and e.id = timesheets.employee_id
        and e.tenant_id = timesheets.tenant_id
    )
  );

-- Tenant admin/global: acesso total conforme escopo
create policy if not exists timesheets_tenant_admin_all on public.timesheets
  for all using (
    exists (
      select 1 from public.tenant_user_roles tur
      where tur.user_id = auth.uid() and tur.role = 'TENANT_ADMIN' and tur.tenant_id = timesheets.tenant_id
    ) or exists (
      select 1 from public.tenant_user_roles tur
      where tur.user_id = auth.uid() and tur.role = 'ADMIN_GLOBAL'
    )
  ) with check (
    exists (
      select 1 from public.tenant_user_roles tur
      where tur.user_id = auth.uid() and tur.role = 'TENANT_ADMIN' and tur.tenant_id = timesheets.tenant_id
    ) or exists (
      select 1 from public.tenant_user_roles tur
      where tur.user_id = auth.uid() and tur.role = 'ADMIN_GLOBAL'
    )
  );

-- Anotações: gerente cria/le seleciona; colaborador e participantes visualizam
create policy if not exists timesheet_annotations_select on public.timesheet_annotations
  for select using (
    exists (
      select 1 from public.timesheets t
      join public.employees e on e.id = t.employee_id
      where t.id = timesheet_annotations.timesheet_id
        and (
          e.profile_id = auth.uid()
          or exists (
            select 1 from public.manager_group_assignments mga
            join public.employee_group_members egm on egm.group_id = mga.group_id
            where mga.manager_id = auth.uid() and egm.employee_id = t.employee_id
          )
          or exists (
            select 1 from public.tenant_user_roles tur
            where tur.user_id = auth.uid() and tur.role in ('TENANT_ADMIN','ADMIN_GLOBAL')
          )
        )
    )
  );

create policy if not exists timesheet_annotations_insert on public.timesheet_annotations
  for insert with check (
    exists (
      select 1 from public.timesheets t
      join public.employees e on e.id = t.employee_id
      join public.manager_group_assignments mga on mga.manager_id = auth.uid()
      join public.employee_group_members egm on egm.group_id = mga.group_id and egm.employee_id = e.id
      where t.id = timesheet_annotations.timesheet_id
        and e.tenant_id = timesheet_annotations.tenant_id
    )
    or exists (
      select 1 from public.tenant_user_roles tur
      where tur.user_id = auth.uid() and tur.role in ('TENANT_ADMIN','ADMIN_GLOBAL')
    )
  );



-- Entries: visualização por empregado/gerente/admin
create policy if not exists timesheet_entries_view on public.timesheet_entries
  for select using (
    exists (
      select 1 from public.timesheets t
      join public.employees e on e.id = t.employee_id
      where t.id = timesheet_entries.timesheet_id
        and (
          e.profile_id = auth.uid()
          or exists (
            select 1 from public.manager_group_assignments mga
            join public.employee_group_members egm on egm.group_id = mga.group_id
            where mga.manager_id = auth.uid() and egm.employee_id = t.employee_id
          )
          or exists (
            select 1 from public.tenant_user_roles tur
            where tur.user_id = auth.uid() and tur.role in ('TENANT_ADMIN','ADMIN_GLOBAL') and tur.tenant_id = t.tenant_id
          )
        )
    )
  );

-- Approvals: gerente insere e todos envolvidos veem
create policy if not exists approvals_select on public.approvals
  for select using (
    exists (
      select 1 from public.timesheets t
      join public.employees e on e.id = t.employee_id
      where t.id = approvals.timesheet_id
        and (
          e.profile_id = auth.uid()
          or exists (
            select 1 from public.manager_group_assignments mga
            join public.employee_group_members egm on egm.group_id = mga.group_id
            where mga.manager_id = auth.uid() and egm.employee_id = t.employee_id
          )
          or exists (
            select 1 from public.tenant_user_roles tur
            where tur.user_id = auth.uid() and tur.role in ('TENANT_ADMIN','ADMIN_GLOBAL') and tur.tenant_id = t.tenant_id
          )
        )
    )
  );

create policy if not exists approvals_insert on public.approvals
  for insert with check (
    exists (
      select 1 from public.timesheets t
      join public.employees e on e.id = t.employee_id
      join public.manager_group_assignments mga on mga.manager_id = auth.uid()
      join public.employee_group_members egm on egm.group_id = mga.group_id and egm.employee_id = e.id
      where t.id = approvals.timesheet_id
        and e.tenant_id = approvals.tenant_id
    )
    or exists (
      select 1 from public.tenant_user_roles tur
      where tur.user_id = auth.uid() and tur.role in ('TENANT_ADMIN','ADMIN_GLOBAL')
    )
  );

-- Entries: funcionário só modifica antes do prazo; gerente pode modificar sempre (com auditoria no app)
create policy if not exists timesheet_entries_employee_modify on public.timesheet_entries
  for all using (
    exists (
      select 1 from public.timesheets t
      join public.employees e on e.id = t.employee_id
      where t.id = timesheet_entries.timesheet_id
        and e.profile_id = auth.uid()
        and not public.timesheet_past_deadline(t.periodo_ini)
    )
  ) with check (
    exists (
      select 1 from public.timesheets t
      join public.employees e on e.id = t.employee_id
      where t.id = timesheet_entries.timesheet_id
        and e.profile_id = auth.uid()
        and not public.timesheet_past_deadline(t.periodo_ini)
    )
  );

create policy if not exists timesheet_entries_manager_modify on public.timesheet_entries
  for all using (
    exists (
      select 1 from public.timesheets t
      join public.employees e on e.id = t.employee_id
      join public.manager_group_assignments mga on mga.manager_id = auth.uid()
      join public.employee_group_members egm on egm.group_id = mga.group_id and egm.employee_id = e.id
      where t.id = timesheet_entries.timesheet_id
    )
    or exists (
      select 1 from public.tenant_user_roles tur
      where tur.user_id = auth.uid() and tur.role in ('TENANT_ADMIN','ADMIN_GLOBAL')
    )
  ) with check (
    true
  );
