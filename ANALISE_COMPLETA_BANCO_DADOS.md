# Análise Completa do Banco de Dados - Time-Sheet Manager ABZ Group

**Data da Análise:** 31 de outubro de 2025  
**Versão do Projeto:** 0.2.9  
**Database:** Supabase/PostgreSQL  
**Multi-tenant:** Sim  

## 📋 Sumário Executivo

O Time-Sheet Manager é uma aplicação web Next.js com arquitetura multi-tenant baseada em Supabase. O sistema implementa um modelo de dados robusto com isolamento por tenant, delegação hierárquica através de grupos e uma estrutura completa de autenticação/autorização via RLS (Row Level Security).

---

## 🏗️ Configuração do Supabase

### Dependências Principais
```json
{
  "@supabase/auth-helpers-nextjs": "^0.10.0",
  "@supabase/ssr": "^0.7.0", 
  "@supabase/supabase-js": "^2.77.0"
}
```

### Variáveis de Ambiente
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM="PontoFlow <no-reply@yourdomain.com>"

# i18n
NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR
NEXT_PUBLIC_AVAILABLE_LOCALES=pt-BR,en-GB

# Web Push (VAPID)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

### Configuração Next.js
- **Framework:** Next.js 15.5.5
- **Turbopack:** Habilitado
- **i18n:** next-intl com suporte a pt-BR e en-GB
- **Build:** ESLint ignore em produção, TypeScript strict

---

## 🗄️ Esquema Principal do Banco (schema-v1_1.sql)

### Tabelas Fundamentais

#### 1. **tenants** (Multi-tenancy)
```sql
CREATE TABLE public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);
```

#### 2. **profiles** (Usuários)
```sql
CREATE TABLE public.profiles (
  user_id uuid primary key,
  display_name text,
  email text,
  phone text,
  ativo boolean not null default true,
  locale text not null default 'pt-BR' check (locale in ('pt-BR','en-GB')),
  ui_theme text check (ui_theme in ('light','dark')),
  created_at timestamptz not null default now()
);
```

#### 3. **employees** (Funcionários)
```sql
CREATE TABLE public.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  vessel_id uuid references public.vessels(id) on delete set null,
  cargo text,
  centro_custo text,
  dados_pessoais_json jsonb default '{}'::jsonb,
  documentos_json jsonb default '{}'::jsonb
);
```

#### 4. **timesheets** (Folhas de Ponto)
```sql
CREATE TABLE public.timesheets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  periodo_ini date not null,
  periodo_fim date not null,
  status text not null check (status in ('rascunho','enviado','aprovado','recusado','bloqueado')),
  created_at timestamptz not null default now()
);
```

#### 5. **timesheet_entries** (Entradas)
```sql
CREATE TABLE public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  tipo text not null check (tipo in ('EMBARQUE','DESEMBARQUE','TRANSLADO')),
  data date not null,
  hora_ini time,
  hora_fim time,
  comentario text
);
```

### Tabelas de Gestão

#### 6. **environments** (Ambientes/Departamentos)
```sql
CREATE TABLE public.environments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique(tenant_id, slug)
);
```

#### 7. **vessels** (Embarcações)
```sql
CREATE TABLE public.vessels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  code text
);
```

#### 8. **groups** (Grupos Organizacionais)
```sql
CREATE TABLE public.groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  environment_id uuid references public.environments(id) on delete set null,
  name text not null
);
```

### Sistema de Delegação

#### 9. **manager_group_assignments** (Delegação de Gestores)
```sql
CREATE TABLE public.manager_group_assignments (
  manager_id uuid not null,
  group_id uuid not null references public.groups(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  primary key (manager_id, group_id)
);
```

#### 10. **employee_group_members** (Membros de Grupo)
```sql
CREATE TABLE public.employee_group_members (
  employee_id uuid not null,
  group_id uuid not null references public.groups(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  primary key (employee_id, group_id)
);
```

#### 11. **tenant_user_roles** (Roles por Tenant)
```sql
CREATE TABLE public.tenant_user_roles (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('COLAB','GERENTE','TENANT_ADMIN','ADMIN_GLOBAL')),
  primary key (tenant_id, user_id, role)
);
```

### Sistema de Aprovações

#### 12. **approvals** (Aprovações)
```sql
CREATE TABLE public.approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  manager_id uuid not null,
  status text not null check (status in ('aprovado','recusado')),
  mensagem text,
  created_at timestamptz not null default now()
);
```

#### 13. **timesheet_annotations** (Anotações)
```sql
CREATE TABLE public.timesheet_annotations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  entry_id uuid references public.timesheet_entries(id) on delete cascade,
  field_path text,
  message text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
```

### Sistema de Notificações

#### 14. **notifications** (Notificações)
```sql
CREATE TABLE public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null,
  canal text not null check (canal in ('email','in_app','push')),
  tipo text,
  payload jsonb default '{}'::jsonb,
  lido boolean default false,
  criado_em timestamptz not null default now()
);
```

#### 15. **comments** (Comentários)
```sql
CREATE TABLE public.comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  author_id uuid not null,
  texto text not null,
  created_at timestamptz not null default now()
);
```

### Tabelas de Segurança

#### 16. **password_reset_tokens** (Reset de Senha)
```sql
CREATE TABLE public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_unified(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔄 Migrations Catalogadas

### Migrations Principais

#### **Phase 17: Web Push Notifications** (`phase-17-push-notifications.sql`)
- **Tabelas criadas:**
  - `push_subscriptions` - Assinaturas push dos usuários
  - `notification_preferences` - Preferências de notificação
  - `notification_log` - Log de auditoria de notificações
- **RLS:** Implementado para cada tabela
- **Índices:** Performance otimizada

#### **Phase 18: Period Locks** (`phase-18-period-locks.sql`)
- **Tabela criada:** `period_locks` - Controle de abertura/fechamento mensal
- **Features:**
  - Controle por tenant e mês
  - Função `canonical_month()` para normalização
  - Trigger automático para `updated_at`

#### **Phase 19: Profiles UI Theme** (`phase-19-profiles-ui-theme.sql`)
- **Alteração:** Adicionado campo `ui_theme` na tabela `profiles`
- **Validação:** check constraint para 'light' ou 'dark'

#### **Phase 21: Multi-Tenant Employees** (`phase-21-multi-tenant-employees.sql`)
- **Funcionalidades:**
  - Suporte a múltiplos tenants por usuário
  - View `employee_tenants` para consulta unificada
  - Função `get_user_tenants()` para listar tenants do usuário
  - Função `set_tenant_context()` para seleção de contexto
  - Função `get_tenant_context()` para consulta do contexto atual

#### **Phase 22: Add Tenant to Delegations** (`phase-22-add-tenant-to-delegations.sql`)
- **Otimizações:**
  - Adicionado `tenant_id` em `manager_group_assignments`
  - Adicionado `tenant_id` em `employee_group_members`
  - Triggers automáticos para população do `tenant_id`
  - RLS otimizada usando `tenant_id` direto

#### **Phase 24: In-App Notifications** (`phase-24-in-app-notifications.sql`)
- **Tabela criada:** `notifications` - Sistema de notificações in-app
- **Features:**
  - Triggers para tracking de leitura
  - Suporte a expiração de notificações
  - Dados JSON para contexto adicional

### Migrations de Correção e Otimização

#### **Performance Optimization Indexes** (`performance-optimization-indexes.sql`)
- **244 linhas** de índices otimizados
- **Categorias:**
  - Timesheets: 6 índices principais
  - Employees: 3 índices
  - Profiles: 3 índices
  - Entries: 4 índices
  - Groups: 3 índices
  - Approvals: 4 índices
  - Notifications: 3 índices
  - **Índices parciais** para casos específicos (draft, submitted, current month)

#### **Password Reset Tokens** (`password-reset-tokens.sql`)
- **Funcionalidade:** Sistema completo de reset de senha
- **Segurança:** Tokens com expiração
- **Limpeza:** Função `cleanup_expired_reset_tokens()`

### Migrations de Fix

#### **Tipo Constraints Fixes** (múltiplos arquivos)
- `fix-tipo-check-constraint.sql`
- `fix-tipo-constraint-complete.sql`
- `fix-tipo-constraint-drop-and-recreate.sql`
- `fix-tipo-constraint-include-all-values.sql`
- `fix-tipo-column-nullable.sql`
- `fix-existing-tipo-values.sql`

#### **Environment Migrations**
- `migrate-environments-from-tipos.sql`
- `phase-20-environment-entries.sql`
- `phase-22-environment-colors-autofill.sql`

---

## 🔐 Sistema de Autenticação e Autorização

### Row Level Security (RLS)

**Todas as tabelas** possuem RLS habilitado:
```sql
ALTER TABLE public.[TABELA] ENABLE ROW LEVEL SECURITY;
```

### Políticas de Timesheets

#### 1. **Empregado: Acesso Próprio**
```sql
-- SELECT: Vê seus próprios timesheets
create policy timesheets_employee_select on public.timesheets
  for select using (
    exists (
      select 1 from public.employees e
      where e.id = timesheets.employee_id
        and e.tenant_id = timesheets.tenant_id
        and e.profile_id = auth.uid()
    )
    -- + condições para gerente e admin
  );

-- INSERT: Só cria seus próprios timesheets
create policy timesheets_employee_insert on public.timesheets
  for insert with check (
    exists (
      select 1 from public.employees e
      where e.id = timesheets.employee_id
        and e.tenant_id = timesheets.tenant_id
        and e.profile_id = auth.uid()
    )
  );

-- UPDATE: Só edita antes do deadline
create policy timesheets_employee_update on public.timesheets
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
```

#### 2. **Gerente: Delegação por Grupos**
```sql
create policy timesheets_manager_update on public.timesheets
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
  );
```

#### 3. **Admin: Acesso Total**
```sql
create policy timesheets_tenant_admin_all on public.timesheets
  for all using (
    exists (
      select 1 from public.tenant_user_roles tur
      where tur.user_id = auth.uid() 
        and tur.role = 'TENANT_ADMIN' 
        and tur.tenant_id = timesheets.tenant_id
    ) or exists (
      select 1 from public.tenant_user_roles tur
      where tur.user_id = auth.uid() 
        and tur.role = 'ADMIN_GLOBAL'
    )
  );
```

### Sistema de Roles

```sql
-- Roles disponíveis
role text not null check (role in ('COLAB','GERENTE','TENANT_ADMIN','ADMIN_GLOBAL'))

-- COLAB: Colaborador (empregado)
-- GERENTE: Gestor (pode aprovar timesheets)
-- TENANT_ADMIN: Admin do tenant
-- ADMIN_GLOBAL: Super admin
```

### Funções de Segurança

#### **Deadline Control**
```sql
create or replace function public.timesheet_deadline(periodo_ini date)
returns timestamptz language sql stable as $$
  select (date_trunc('month', periodo_ini)::date + interval '1 month')::timestamptz
$$;

create or replace function public.timesheet_past_deadline(periodo_ini date)
returns boolean language sql stable as $$
  select now() >= public.timesheet_deadline(periodo_ini)
$$;
```

---

## 📊 Tipos TypeScript (packages/types)

### Enums Principais

#### **TimesheetStatus**
```typescript
export enum TimesheetStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted', 
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
```

#### **EntryType** 
```typescript
export enum EntryType {
  BOARDING = 'embarque',
  DISEMBARKING = 'desembarque',
  TRANSFER = 'translado',
}
```

#### **UserRole**
```typescript
export enum UserRole {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  ADMIN = 'admin',
}
```

#### **NotificationEvent**
```typescript
export enum NotificationEvent {
  TIMESHEET_SUBMITTED = 'timesheet_submitted',
  TIMESHEET_APPROVED = 'timesheet_approved',
  TIMESHEET_REJECTED = 'timesheet_rejected',
  DEADLINE_REMINDER = 'deadline_reminder',
  ANNOTATION_ADDED = 'annotation_added',
}
```

### Interfaces Principais

#### **Timesheet**
```typescript
export interface Timesheet {
  id: string;
  employee_id: string;
  tenant_id: string;
  periodo_ini: string; // YYYY-MM-DD
  periodo_fim: string; // YYYY-MM-DD
  status: TimesheetStatus;
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations
  entries?: TimesheetEntry[];
  employee?: EmployeeInfo;
  vessel?: VesselInfo;
}
```

#### **TimesheetEntry**
```typescript
export interface TimesheetEntry {
  id: string;
  timesheet_id: string;
  entry_date: string; // YYYY-MM-DD
  tipo: EntryType;
  hora_ini?: string | null; // HH:MM
  hora_fim?: string | null; // HH:MM
  observacao?: string | null;
  hours_regular?: number;
  hours_overtime?: number;
  created_at: string;
  updated_at: string;
}
```

#### **Employee**
```typescript
export interface Employee {
  id: string;
  tenant_id: string;
  user_id?: string | null;
  display_name: string;
  full_name?: string | null;
  email?: string | null;
  position?: string | null;
  vessel_id?: string | null;
  hourly_rate?: number | null;
  daily_rate?: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}
```

#### **Tenant**
```typescript
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

### DTOs de API

#### **CreateTimesheetEntryRequest**
```typescript
export interface CreateTimesheetEntryRequest {
  data: string; // YYYY-MM-DD
  tipo: EntryType;
  hora_ini?: string | null;
  hora_fim?: string | null;
  observacao?: string | null;
}
```

#### **ApproveTimesheetRequest**
```typescript
export interface ApproveTimesheetRequest {
  timesheet_id: string;
  message?: string;
}
```

#### **RejectTimesheetRequest**
```typescript
export interface RejectTimesheetRequest {
  timesheet_id: string;
  message: string;
  annotations?: Array<{
    entry_id?: string;
    field_name?: string;
    comment: string;
  }>;
}
```

#### **Notification Preferences**
```typescript
export interface UpdateNotificationPreferencesRequest {
  email_enabled?: boolean;
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  events?: {
    [key: string]: boolean;
  };
}
```

---

## 🚀 Sistema de Notificações

### Tipos de Notificação

1. **Email** - via Nodemailer/SMTP
2. **Push** - Web Push API
3. **In-App** - Notificações na aplicação

### Tabelas de Notificação

#### **notifications** (schema principal)
- Multi-tenant por `tenant_id`
- Suporte a payload JSON
- Tracking de leitura (`lido`, `lido_em`)
- Tipos: `'email'`, `'in_app'`, `'push'`

#### **push_subscriptions** (Phase 17)
- Gerenciamento de assinaturas push
- Suporte VAPID keys
- Triggers automáticos para `updated_at`

#### **notification_preferences** (Phase 17)
- Preferências granulares por usuário
- Booleans para diferentes tipos
- Acompanhamento por usuário (1:1)

#### **notification_log** (Phase 17)
- Auditoria completa de envios
- Tracking de leitura
- Dados JSON para contexto

### Sistema de In-App Notifications (Phase 24)

#### **notifications** (nova tabela)
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    event VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## ⚡ Otimizações de Performance

### Índices Principais

#### **Timesheets**
```sql
-- Tenant + Status + Período (consultas mais comuns)
CREATE INDEX idx_timesheets_tenant_status_periodo 
ON timesheets(tenant_id, status, periodo_ini, periodo_fim);

-- Funcionário + Período
CREATE INDEX idx_timesheets_employee_periodo 
ON timesheets(employee_id, periodo_ini, periodo_fim);

-- Status + Período (relatórios)
CREATE INDEX idx_timesheets_status_periodo 
ON timesheets(status, periodo_ini, periodo_fim);

-- Timesheets rascunho (parcial)
CREATE INDEX idx_timesheets_draft_active 
ON timesheets(tenant_id, employee_id, periodo_ini) 
WHERE status = 'rascunho';

-- Timesheets enviadas (parcial)
CREATE INDEX idx_timesheets_submitted_active 
ON timesheets(tenant_id, employee_id, created_at) 
WHERE status = 'enviado';
```

#### **Entries**
```sql
-- Por timesheet + data (joins mais comuns)
CREATE INDEX idx_timesheet_entries_timesheet 
ON timesheet_entries(timesheet_id, data);

-- Por data + tipo
CREATE INDEX idx_timesheet_entries_date_tipo 
ON timesheet_entries(data, tipo);
```

#### **Employees**
```sql
-- Tenant + Profile (multi-tenant)
CREATE INDEX idx_employees_tenant_profile 
ON employees(tenant_id, profile_id);
```

#### **Delegações (Phase 22)**
```sql
-- Tenant + Manager (otimizada)
CREATE INDEX idx_manager_group_assignments_tenant_manager 
ON manager_group_assignments(tenant_id, manager_id);

-- Tenant + Employee (otimizada)
CREATE INDEX idx_employee_group_members_tenant_employee 
ON employee_group_members(tenant_id, employee_id);
```

### Índices Parciais
- Draft timesheets: Menores e mais rápidos
- Submitted timesheets: Para aprovações
- Unread notifications: Para badge counts
- Current month: Para dashboards

---

## 🔧 Funcionalidades Avançadas

### Multi-Tenancy (Phase 21)

#### **Abordagem: Um Employee por Tenant**
- Mantém isolamento de dados
- Simplifica políticas RLS
- Cada relação employee-tenant = 1 registro

#### **Funções Utilitárias**
```sql
-- View para listar todos os tenants de um usuário
create or replace view public.employee_tenants as
select 
  e.profile_id,
  e.id as employee_id,
  e.tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  e.cargo,
  e.centro_custo,
  e.created_at
from public.employees e
join public.tenants t on t.id = e.tenant_id;

-- Get user tenants
create or replace function public.get_user_tenants(user_id uuid)
returns table (...) as $$ ... $$;

-- Set tenant context
create or replace function public.set_tenant_context(tenant_id uuid)
returns void as $$ ... $$;

-- Get tenant context  
create or replace function public.get_tenant_context()
returns uuid as $$ ... $$;
```

### Controle de Períodos (Phase 18)

#### **Period Locks**
```sql
create table if not exists public.period_locks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_month date not null, -- YYYY-MM-01
  locked boolean not null default true,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, period_month)
);

-- Normalização automática
create or replace function public.canonical_month(d date)
returns date language sql immutable as $$
  select date_trunc('month', d)::date
$$;
```

### Sistema de Anotações

#### **Timesheet Annotations**
```sql
create table if not exists public.timesheet_annotations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  entry_id uuid references public.timesheet_entries(id) on delete cascade,
  field_path text, -- Campo específico anotado
  message text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
```

---

## 🔍 Análise de Integridade

### Constraints de Dados

#### **Check Constraints**
```sql
-- Status de timesheets
status text not null check (status in ('rascunho','enviado','aprovado','recusado','bloqueado'))

-- Tipos de entrada
tipo text not null check (tipo in ('EMBARQUE','DESEMBARQUE','TRANSLADO'))

-- Roles de usuário
role text not null check (role in ('COLAB','GERENTE','TENANT_ADMIN','ADMIN_GLOBAL'))

-- Canais de notificação
canal text not null check (canal in ('email','in_app','push'))

-- Status de aprovação
status text not null check (status in ('aprovado','recusado'))

-- Locales válidos
locale text not null default 'pt-BR' check (locale in ('pt-BR','en-GB'))

-- UI Theme
ui_theme text check (ui_theme in ('light','dark'))
```

#### **Foreign Keys**
- Todas as tabelas principais têm FKs com `CASCADE` ou `SET NULL`
- `tenant_id` presente em todas as tabelas multi-tenant
- `employee_id` sempre referenciando `employees.id`

#### **Unique Constraints**
```sql
-- Tenants
slug text unique not null

-- Environments
unique(tenant_id, slug)

-- Delegations
primary key (manager_id, group_id)
primary key (employee_id, group_id)

-- Employee multi-tenant
unique(profile_id, tenant_id)

-- Reset tokens
token TEXT NOT NULL UNIQUE

-- Period locks
unique(tenant_id, period_month)
```

### Triggers

#### **Auto-população de Tenant ID (Phase 22)**
```sql
-- Manager assignments
create trigger trg_set_manager_group_assignment_tenant_id
  before insert on public.manager_group_assignments
  for each row
  when (new.tenant_id is null)
  execute function public.set_manager_group_assignment_tenant_id();

-- Employee members
create trigger trg_set_employee_group_member_tenant_id
  before insert on public.employee_group_members
  for each row
  when (new.tenant_id is null)
  execute function public.set_employee_group_member_tenant_id();
```

#### **Period Locks (Phase 18)**
```sql
create trigger trg_period_locks_bu 
  before insert or update on public.period_locks
  for each row execute function public.period_locks_bu();
```

#### **Notifications (Phase 24)**
```sql
-- Update timestamp
create trigger update_notifications_updated_at 
    before update on notifications 
    for each row 
    execute function update_updated_at_column();

-- Mark as read
create trigger mark_notification_read_trigger
    before update on notifications
    for each row
    execute function mark_notification_read();
```

---

## 📋 Recomendações para Sistema de Validação

### 1. **Validação de Esquema**
```sql
-- Verificar se todas as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- Verificar índices
SELECT 
    schemaname,
    tablename, 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

### 2. **Validação de RLS**
```sql
-- Verificar RLS habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public';

-- Contar políticas RLS
SELECT 
    schemaname,
    tablename,
    count(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
```

### 3. **Validação de Dados**
```sql
-- Verificar integridade referencial
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_def
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public'
  AND c.contype = 'f';

-- Verificar valores nulos críticos
SELECT 
    'employees' as table_name,
    count(*) as total_records,
    count(profile_id) as with_profile_id,
    count(tenant_id) as with_tenant_id
FROM public.employees
UNION ALL
SELECT 
    'timesheets' as table_name,
    count(*) as total_records,
    count(employee_id) as with_employee_id,
    count(tenant_id) as with_tenant_id
FROM public.timesheets;
```

### 4. **Monitoramento de Performance**
```sql
-- Estatísticas de índices
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Estatísticas de tabelas
SELECT 
    schemaname,
    tablename,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### 5. **Backup e Recovery**
```sql
-- Função para backup de schema
CREATE OR REPLACE FUNCTION backup_schema()
RETURNS void AS $$
BEGIN
  -- Gerar backup dos schemas
  PERFORM pg_dump('public');
END;
$$ LANGUAGE plpgsql;

-- Verificar integridade do banco
CREATE OR REPLACE FUNCTION check_database_integrity()
RETURNS TABLE(
    check_name text,
    status text,
    details text
) AS $$
BEGIN
  -- Verificar RLS em todas as tabelas
  RETURN QUERY
  SELECT 
    'RLS_ENABLED'::text,
    CASE WHEN rowsecurity THEN 'OK' ELSE 'FAIL' END::text,
    'Table: ' || tablename
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND rowsecurity = false;
    
  -- Mais verificações...
END;
$$ LANGUAGE plpgsql;
```

---

## 📈 Métricas e Monitoramento

### Dashboard de Saúde do Banco

```sql
-- Saúde geral do banco
SELECT 
    'database_health' as metric,
    json_build_object(
        'total_tables', (
            SELECT count(*) FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ),
        'total_indexes', (
            SELECT count(*) FROM pg_indexes 
            WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
        ),
        'total_policies', (
            SELECT count(*) FROM pg_policies 
            WHERE schemaname = 'public'
        ),
        'rls_enabled_tables', (
            SELECT count(*) FROM pg_tables 
            WHERE schemaname = 'public' AND rowsecurity = true
        )
    ) as data;
```

---

## 🏁 Conclusões

### Pontos Fortes
1. **Arquitetura Multi-tenant Robusta** - Isolamento completo por tenant
2. **RLS Implementado** - Segurança em nível de linha em todas as tabelas
3. **Sistema de Delegação** - Hierarquia clara com grupos e managers
4. **Performance Otimizada** - Índices estratégicos e parciais
5. **Tipos TypeScript** - Tipagem completa para frontend/backend
6. **Sistema de Notificações** - Múltiplos canais (email, push, in-app)
7. **Controle de Períodos** - Locks automáticos por mês
8. **Auditoria Completa** - Logs de todas as operações

### Pontos de Atenção
1. **Complexidade de RLS** - Políticas complexas podem afetar performance
2. **Multi-tenant overhead** - Queries sempre filtrando por tenant
3. **Múltiplas migrations** - Necessário controle rigoroso de ordem
4. **Triggers de segurança** - Dependências complexas entre triggers

### Recomendações
1. **Implementar validação automática** do schema ao inicializar
2. **Monitorar performance** das políticas RLS
3. **Backup regular** de dados críticos
4. **Logs de auditoria** para todas as operações administrativas
5. **Testes de integridade** automatizados
6. **Documentação viva** das políticas de segurança

---

**Relatório gerado em:** 31 de outubro de 2025  
**Versão do Documento:** 1.0  
**Próxima Revisão:** Conforme implementação do sistema de validação