# Esquema Completo do Banco de Dados - Timesheet Manager

## 📊 Visão Geral do Schema

O projeto Timesheet Manager utiliza **PostgreSQL 15+** com **17 tabelas principais** em um schema `public` multi-tenant com isolamento por `tenant_id` e Row Level Security (RLS) habilitado em todas as tabelas.

### Características Principais
- ✅ **Multi-tenant** com isolamento por `tenant_id`
- ✅ **RLS completo** em todas as tabelas
- ✅ **UUID como chave primária** em todas as tabelas
- ✅ **Timestamps** com timezone (timestamptz)
- ✅ **JSONB** para dados flexíveis
- ✅ **Constraints** de integridade referencial
- ✅ **Índices otimizados** para performance

---

## 🏗️ Estrutura Completa das Tabelas

### 1. **tenants**
Organizações/clientes do sistema (multi-tenant)

```sql
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Constraints
CONSTRAINT check_timezone_valid 
  CHECK (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+(-[A-Za-z_]+)*$');

-- Índices
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_timezone ON tenants(timezone);

-- RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY tenants_admin_access ON tenants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = tenants.id 
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
        AND tur.user_id = auth.uid()
    )
  );
```

**Funções Relacionadas:**
- `get_tenant_timezone(tenant_uuid UUID)` - Retorna timezone do tenant

---

### 2. **environments**
Ambientes de trabalho por tenant (escritório, offshore, etc.)

```sql
CREATE TABLE public.environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  color text DEFAULT '#3B82F6',
  auto_fill_enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- Índices
CREATE INDEX idx_environments_tenant ON environments(tenant_id);
CREATE INDEX idx_environments_tenant_slug ON environments(tenant_id, slug);

-- RLS
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY environments_tenant_access ON environments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = environments.tenant_id 
        AND tur.user_id = auth.uid()
    )
  );
```

---

### 3. **profiles**
Perfis de usuários (separado do auth.users Supabase)

```sql
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  display_name text,
  email text,
  phone text,
  ativo boolean NOT NULL DEFAULT true,
  locale text NOT NULL DEFAULT 'pt-BR' 
    CHECK (locale IN ('pt-BR','en-GB')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
CREATE INDEX idx_profiles_active_locale ON profiles(ativo, locale) WHERE ativo = true;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY profiles_self_access ON profiles
  FOR ALL USING (auth.uid() = user_id);
```

---

### 4. **tenant_user_roles**
Roles por tenant (COLAB, GERENTE, TENANT_ADMIN, ADMIN_GLOBAL)

```sql
CREATE TABLE public.tenant_user_roles (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL 
    CHECK (role IN ('COLAB','GERENTE','TENANT_ADMIN','ADMIN_GLOBAL')),
  PRIMARY KEY (tenant_id, user_id, role)
);

-- Índices
CREATE INDEX idx_tenant_user_roles_tenant ON tenant_user_roles(tenant_id);
CREATE INDEX idx_tenant_user_roles_user ON tenant_user_roles(user_id);

-- RLS
ALTER TABLE tenant_user_roles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY tenant_user_roles_access ON tenant_user_roles
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = tenant_user_roles.tenant_id
        AND tur.user_id = auth.uid()
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
    )
  );
```

---

### 5. **groups**
Grupos de trabalho por tenant/ambiente

```sql
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  environment_id uuid REFERENCES environments(id) ON DELETE SET NULL,
  name text NOT NULL
);

-- Índices
CREATE INDEX idx_groups_tenant ON groups(tenant_id);
CREATE INDEX idx_groups_tenant_name ON groups(tenant_id, name);
CREATE INDEX idx_groups_environment ON groups(environment_id);

-- RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY groups_tenant_access ON groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = groups.tenant_id 
        AND tur.user_id = auth.uid()
    )
  );
```

---

### 6. **manager_group_assignments**
Delegações de gerentes para grupos

```sql
CREATE TABLE public.manager_group_assignments (
  manager_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (manager_id, group_id)
);

-- Índices
CREATE INDEX idx_manager_group_assignments_manager ON manager_group_assignments(manager_id);
CREATE INDEX idx_manager_assignments_effective ON manager_group_assignments(manager_id, group_id);

-- RLS
ALTER TABLE manager_group_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY manager_assignments_access ON manager_group_assignments
  FOR ALL USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.tenant_user_roles tur ON tur.tenant_id = g.tenant_id
      WHERE g.id = manager_group_assignments.group_id
        AND tur.user_id = auth.uid()
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
    )
  );
```

---

### 7. **employee_group_members**
Membros de grupos (employees)

```sql
CREATE TABLE public.employee_group_members (
  employee_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, group_id)
);

-- Índices
CREATE INDEX idx_employee_group_members_employee ON employee_group_members(employee_id);
CREATE INDEX idx_employee_group_effective ON employee_group_members(employee_id, group_id);

-- RLS
ALTER TABLE employee_group_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY employee_group_members_access ON employee_group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.tenant_user_roles tur ON tur.tenant_id = g.tenant_id
      WHERE g.id = employee_group_members.group_id
        AND tur.user_id = auth.uid()
    )
  );
```

---

### 8. **vessels**
Embarcações por tenant

```sql
CREATE TABLE public.vessels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text
);

-- Índices
CREATE INDEX idx_vessels_tenant ON vessels(tenant_id);
CREATE INDEX idx_vessels_tenant_name ON vessels(tenant_id, name);

-- RLS
ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY vessels_tenant_access ON vessels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = vessels.tenant_id 
        AND tur.user_id = auth.uid()
    )
  );
```

---

### 9. **employees**
Funcionários (multi-tenant support)

```sql
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  vessel_id uuid REFERENCES vessels(id) ON DELETE SET NULL,
  cargo text,
  centro_custo text,
  dados_pessoais_json jsonb DEFAULT '{}'::jsonb,
  documentos_json jsonb DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_profile_tenant ON employees(profile_id, tenant_id); -- UNIQUE
CREATE INDEX idx_employees_tenant_profile ON employees(tenant_id, profile_id);
CREATE INDEX idx_employees_tenant_name ON employees(tenant_id, display_name);
CREATE INDEX idx_employees_tenant_active ON employees(tenant_id, profile_id) WHERE profile_id IS NOT NULL;

-- RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY employees_tenant_access ON employees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = employees.tenant_id 
        AND tur.user_id = auth.uid()
    ) OR
    profile_id = auth.uid()
  );

-- View para multi-tenant
CREATE OR REPLACE VIEW public.employee_tenants AS
SELECT 
  e.profile_id,
  e.id as employee_id,
  e.tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  e.cargo,
  e.centro_custo,
  e.created_at
FROM public.employees e
JOIN public.tenants t ON t.id = e.tenant_id
ORDER BY e.profile_id, t.name;

-- Função para buscar tenants do usuário
CREATE OR REPLACE FUNCTION public.get_user_tenants(user_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
  employee_id uuid,
  cargo text,
  centro_custo text
)
LANGUAGE sql
SECURITY DEFINER
STABLE AS $$
  SELECT 
    e.tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    e.id as employee_id,
    e.cargo,
    e.centro_custo
  FROM public.employees e
  JOIN public.tenants t ON t.id = e.tenant_id
  WHERE e.profile_id = user_id
  ORDER BY t.name;
$$;
```

---

### 10. **timesheets**
Folhas de ponto dos funcionários

```sql
CREATE TABLE public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  periodo_ini date NOT NULL,
  periodo_fim date NOT NULL,
  status text NOT NULL 
    CHECK (status IN ('rascunho','enviado','aprovado','recusado','bloqueado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_timesheets_employee ON timesheets(employee_id);
CREATE INDEX idx_timesheets_tenant_status_periodo ON timesheets(tenant_id, status, periodo_ini, periodo_fim);
CREATE INDEX idx_timesheets_employee_periodo ON timesheets(employee_id, periodo_ini, periodo_fim);
CREATE INDEX idx_timesheets_status_periodo ON timesheets(status, periodo_ini, periodo_fim);
CREATE INDEX idx_timesheets_manager_pending ON timesheets(tenant_id, status, created_at) WHERE status IN ('enviado', 'rascunho');
CREATE INDEX idx_timesheets_approval_workflow ON timesheets(tenant_id, employee_id, status, updated_at);
CREATE INDEX idx_timesheets_draft_active ON timesheets(tenant_id, employee_id, periodo_ini) WHERE status = 'rascunho';
CREATE INDEX idx_timesheets_submitted_active ON timesheets(tenant_id, employee_id, created_at) WHERE status = 'enviado';
CREATE INDEX idx_timesheets_current_month ON timesheets(tenant_id, periodo_ini, periodo_fim) WHERE periodo_ini >= date_trunc('month', CURRENT_DATE);

-- RLS
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY timesheets_employee_select ON timesheets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = timesheets.employee_id
        AND e.tenant_id = timesheets.tenant_id
        AND e.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.manager_group_assignments mga
      JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
      WHERE mga.manager_id = auth.uid()
        AND egm.employee_id = timesheets.employee_id
    )
    OR EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.user_id = auth.uid() 
        AND tur.role = 'TENANT_ADMIN' 
        AND tur.tenant_id = timesheets.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.user_id = auth.uid() 
        AND tur.role = 'ADMIN_GLOBAL'
    )
  );

CREATE POLICY timesheets_employee_insert ON timesheets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = timesheets.employee_id
        AND e.tenant_id = timesheets.tenant_id
        AND e.profile_id = auth.uid()
    )
  );

CREATE POLICY timesheets_employee_update ON timesheets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = timesheets.employee_id
        AND e.tenant_id = timesheets.tenant_id
        AND e.profile_id = auth.uid()
    )
    AND NOT public.timesheet_past_deadline(timesheets.periodo_ini, timesheets.tenant_id)
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = timesheets.employee_id
        AND e.tenant_id = timesheets.tenant_id
        AND e.profile_id = auth.uid()
    )
    AND NOT public.timesheet_past_deadline(timesheets.periodo_ini, timesheets.tenant_id)
  );

CREATE POLICY timesheets_manager_update ON timesheets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.manager_group_assignments mga
      JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
      JOIN public.employees e ON e.id = egm.employee_id
      WHERE mga.manager_id = auth.uid()
        AND e.id = timesheets.employee_id
        AND e.tenant_id = timesheets.tenant_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.manager_group_assignments mga
      JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
      JOIN public.employees e ON e.id = egm.employee_id
      WHERE mga.manager_id = auth.uid()
        AND e.id = timesheets.employee_id
        AND e.tenant_id = timesheets.tenant_id
    )
  );

CREATE POLICY timesheets_tenant_admin_all ON timesheets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.user_id = auth.uid() 
        AND tur.role = 'TENANT_ADMIN' 
        AND tur.tenant_id = timesheets.tenant_id
    ) OR EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.user_id = auth.uid() 
        AND tur.role = 'ADMIN_GLOBAL'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.user_id = auth.uid() 
        AND tur.role = 'TENANT_ADMIN' 
        AND tur.tenant_id = timesheets.tenant_id
    ) OR EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.user_id = auth.uid() 
        AND tur.role = 'ADMIN_GLOBAL'
    )
  );
```

---

### 11. **timesheet_entries**
Entradas das folhas de ponto

```sql
CREATE TABLE public.timesheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  timesheet_id uuid NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  environment_id uuid REFERENCES environments(id) ON DELETE SET NULL,
  tipo text NOT NULL 
    CHECK (tipo IN ('EMBARQUE','DESEMBARQUE','TRANSLADO')),
  data date NOT NULL,
  hora_ini time,
  hora_fim time,
  comentario text
);

-- Índices
CREATE INDEX idx_timesheet_entries_timesheet ON timesheet_entries(timesheet_id, data);
CREATE INDEX idx_timesheet_entries_tenant ON timesheet_entries(tenant_id, timesheet_id);
CREATE INDEX idx_timesheet_entries_date_tipo ON timesheet_entries(data, tipo);
CREATE INDEX idx_timesheet_entries_tipo_data ON timesheet_entries(tipo, data);
CREATE INDEX idx_entries_environment ON timesheet_entries(environment_id);

-- RLS
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY timesheet_entries_view ON timesheet_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      JOIN public.employees e ON e.id = t.employee_id
      WHERE t.id = timesheet_entries.timesheet_id
        AND (
          e.profile_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.manager_group_assignments mga
            JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
            WHERE mga.manager_id = auth.uid() 
              AND egm.employee_id = t.employee_id
          )
          OR EXISTS (
            SELECT 1 FROM public.tenant_user_roles tur
            WHERE tur.user_id = auth.uid() 
              AND tur.role IN ('TENANT_ADMIN','ADMIN_GLOBAL') 
              AND tur.tenant_id = t.tenant_id
          )
        )
    )
  );

CREATE POLICY timesheet_entries_employee_modify ON timesheet_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      JOIN public.employees e ON e.id = t.employee_id
      WHERE t.id = timesheet_entries.timesheet_id
        AND e.profile_id = auth.uid()
        AND NOT public.timesheet_past_deadline(t.periodo_ini, t.tenant_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      JOIN public.employees e ON e.id = t.employee_id
      WHERE t.id = timesheet_entries.timesheet_id
        AND e.profile_id = auth.uid()
        AND NOT public.timesheet_past_deadline(t.periodo_ini, t.tenant_id)
    )
  );

CREATE POLICY timesheet_entries_manager_modify ON timesheet_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      JOIN public.employees e ON e.id = t.employee_id
      JOIN public.manager_group_assignments mga ON mga.manager_id = auth.uid()
      JOIN public.employee_group_members egm ON egm.group_id = mga.group_id 
        AND egm.employee_id = e.id
      WHERE t.id = timesheet_entries.timesheet_id
    )
    OR EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.user_id = auth.uid() 
        AND tur.role IN ('TENANT_ADMIN','ADMIN_GLOBAL')
    )
  ) WITH CHECK (true);
```

---

### 12. **approvals**
Aprovações de timesheets

```sql
CREATE TABLE public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  timesheet_id uuid NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL,
  status text NOT NULL 
    CHECK (status IN ('aprovado','recusado')),
  mensagem text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_approvals_timesheet_manager ON approvals(timesheet_id, manager_id, status);
CREATE INDEX idx_approvals_tenant_created ON approvals(tenant_id, created_at);

-- RLS
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY approvals_select ON approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      JOIN public.employees e ON e.id = t.employee_id
      WHERE t.id = approvals.timesheet_id
        AND (
          e.profile_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.manager_group_assignments mga
            JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
            WHERE mga.manager_id = auth.uid() 
              AND egm.employee_id = t.employee_id
          )
          OR EXISTS (
            SELECT 1 FROM public.tenant_user_roles tur
            WHERE tur.user_id = auth.uid() 
              AND tur.role IN ('TENANT_ADMIN','ADMIN_GLOBAL') 
              AND tur.tenant_id = t.tenant_id
          )
        )
    )
  );

CREATE POLICY approvals_insert ON approvals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      JOIN public.employees e ON e.id = t.employee_id
      JOIN public.manager_group_assignments mga ON mga.manager_id = auth.uid()
      JOIN public.employee_group_members egm ON egm.group_id = mga.group_id 
        AND egm.employee_id = e.id
      WHERE t.id = approvals.timesheet_id
        AND e.tenant_id = approvals.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.user_id = auth.uid() 
        AND tur.role IN ('TENANT_ADMIN','ADMIN_GLOBAL')
    )
  );
```

---

### 13. **comments**
Comentários em entidades

```sql
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  author_id uuid NOT NULL,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_tenant_created ON comments(tenant_id, created_at);

-- RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY comments_tenant_access ON comments
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_user_roles 
      WHERE user_id = auth.uid()
    )
    OR author_id = auth.uid()
  );
```

---

### 14. **notifications**
Sistema de notificações

```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  canal text NOT NULL 
    CHECK (canal IN ('email','in_app','push')),
  tipo text,
  payload jsonb DEFAULT '{}'::jsonb,
  lido boolean DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_notifications_user_lido ON notifications(user_id, lido, criado_em);
CREATE INDEX idx_notifications_tenant_tipo ON notifications(tenant_id, tipo, criado_em);
CREATE INDEX idx_notifications_unread ON notifications(user_id, lido, criado_em) WHERE lido = false;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY notifications_user_access ON notifications
  FOR ALL USING (auth.uid() = user_id);
```

---

### 15. **timesheet_annotations**
Anotações em timesheets (marcação de erros)

```sql
CREATE TABLE public.timesheet_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  timesheet_id uuid NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES timesheet_entries(id) ON DELETE CASCADE,
  field_path text,
  message text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_annotations_timesheet ON timesheet_annotations(timesheet_id);
CREATE INDEX idx_annotations_created_by ON timesheet_annotations(created_by, created_at);

-- RLS
ALTER TABLE timesheet_annotations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY timesheet_annotations_select ON timesheet_annotations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      JOIN public.employees e ON e.id = t.employee_id
      WHERE t.id = timesheet_annotations.timesheet_id
        AND (
          e.profile_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.manager_group_assignments mga
            JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
            WHERE mga.manager_id = auth.uid() 
              AND egm.employee_id = t.employee_id
          )
          OR EXISTS (
            SELECT 1 FROM public.tenant_user_roles tur
            WHERE tur.user_id = auth.uid() 
              AND tur.role IN ('TENANT_ADMIN','ADMIN_GLOBAL')
          )
        )
    )
  );

CREATE POLICY timesheet_annotations_insert ON timesheet_annotations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      JOIN public.employees e ON e.id = t.employee_id
      JOIN public.manager_group_assignments mga ON mga.manager_id = auth.uid()
      JOIN public.employee_group_members egm ON egm.group_id = mga.group_id 
        AND egm.employee_id = e.id
      WHERE t.id = timesheet_annotations.timesheet_id
        AND e.tenant_id = timesheet_annotations.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.user_id = auth.uid() 
        AND tur.role IN ('TENANT_ADMIN','ADMIN_GLOBAL')
    )
  );
```

---

### 16. **password_reset_tokens**
Tokens para reset de senha

```sql
CREATE TABLE public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own reset tokens" ON password_reset_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all reset tokens" ON password_reset_tokens
  FOR ALL USING (true);

-- Função para limpeza
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW() OR used_at IS NOT NULL;
END;
$$;
```

---

### 17. **_migrations**
Controle de migrations

```sql
CREATE TABLE public._migrations (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 🔧 Funções do Sistema

### Funções de Prazo e Timezone

```sql
-- Cálculo de prazos por timezone
CREATE OR REPLACE FUNCTION public.timesheet_deadline(
  periodo_ini date, 
  tenant_uuid UUID DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE sql
STABLE AS $$
  SELECT (date_trunc('month', periodo_ini)::date + interval '1 month + 4 days')::timestamptz
  AT TIME ZONE COALESCE(
    CASE 
      WHEN tenant_uuid IS NOT NULL THEN public.get_tenant_timezone(tenant_uuid)
      ELSE 'America/Sao_Paulo'
    END,
    'UTC'
  );
$$;

-- Verificação de prazos vencidos
CREATE OR REPLACE FUNCTION public.timesheet_past_deadline(
  periodo_ini date, 
  tenant_uuid UUID DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE AS $$
  SELECT NOW() AT TIME ZONE COALESCE(
    CASE 
      WHEN tenant_uuid IS NOT NULL THEN public.get_tenant_timezone(tenant_uuid)
      ELSE 'America/Sao_Paulo'
    END,
    'UTC'
  ) >= public.timesheet_deadline(periodo_ini, tenant_uuid);
$$;

-- Conversão de timezone
CREATE OR REPLACE FUNCTION public.convert_to_tenant_timezone(
  timestamp_value timestamptz,
  tenant_uuid UUID
)
RETURNS timestamptz
LANGUAGE sql
STABLE AS $$
  SELECT timestamp_value AT TIME ZONE 'UTC' 
         AT TIME ZONE COALESCE(
           public.get_tenant_timezone(tenant_uuid),
           'America/Sao_Paulo'
         );
$$;

-- Timestamp atual no timezone do tenant
CREATE OR REPLACE FUNCTION public.now_in_tenant_timezone(tenant_uuid UUID)
RETURNS timestamptz
LANGUAGE sql
STABLE AS $$
  SELECT NOW() AT TIME ZONE COALESCE(
    public.get_tenant_timezone(tenant_uuid),
    'America/Sao_Paulo'
  );
$$;
```

### Funções de Contexto Multi-tenant

```sql
-- Definir contexto de tenant
CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  user_id uuid;
  has_access boolean;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM public.employees
    WHERE profile_id = user_id 
      AND employees.tenant_id = set_tenant_context.tenant_id
  ) INTO has_access;
  
  IF NOT has_access THEN
    RAISE EXCEPTION 'User does not have access to this tenant';
  END IF;
  
  PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
$$;

-- Obter contexto atual
CREATE OR REPLACE FUNCTION public.get_tenant_context()
RETURNS uuid
LANGUAGE sql
STABLE AS $$
  SELECT nullif(current_setting('app.current_tenant_id', true), '')::uuid;
$$;
```

### Triggers e Funções de Atualização

```sql
-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para marcar notification como lida
CREATE OR REPLACE FUNCTION mark_notification_read()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.read = FALSE AND NEW.read = TRUE THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📈 Índices de Performance

### Resumo dos Índices (50+ índices)

**Timesheets (8 índices):**
- `idx_timesheets_employee` - Busca por employee
- `idx_timesheets_tenant_status_periodo` - Filtro tenant+status+período
- `idx_timesheets_employee_periodo` - Periodo do employee
- `idx_timesheets_status_periodo` - Relatórios por status
- `idx_timesheets_manager_pending` - Pendências do gerente
- `idx_timesheets_approval_workflow` - Workflow de aprovação
- `idx_timesheets_draft_active` - Apenas rascunhos
- `idx_timesheets_submitted_active` - Apenas enviados
- `idx_timesheets_current_month` - Apenas mês atual

**Employees (4 índices):**
- `idx_employees_tenant` - Filtro por tenant
- `idx_employees_profile_tenant` - UNIQUE (profile, tenant)
- `idx_employees_tenant_profile` - Join tenant+profile
- `idx_employees_tenant_name` - Busca por nome

**Timesheet Entries (5 índices):**
- `idx_timesheet_entries_timesheet` - Join com timesheet
- `idx_timesheet_entries_tenant` - Filtro tenant
- `idx_timesheet_entries_date_tipo` - Busca por data+tipo
- `idx_timesheet_entries_tipo_data` - Relatórios por tipo
- `idx_entries_environment` - Filtro por ambiente

**Groups e Assignments (4 índices):**
- `idx_groups_tenant` - Grupos por tenant
- `idx_employee_group_members_employee` - Membros por employee
- `idx_manager_group_assignments_manager` - Gerentes
- `idx_manager_assignments_effective` - Assignments ativos

**Notifications (3 índices):**
- `idx_notifications_user_lido` - Notificações do usuário
- `idx_notifications_tenant_tipo` - Filtro tenant+tipo
- `idx_notifications_unread` - Apenas não lidas

**Outros (26+ índices):**
- Environments, Vessels, Approvals, Annotations
- Profiles, Tenant roles, Comments
- Password reset tokens, Migrations

---

## 🔄 Ordem de Execução das Migrations

### Ordem Recomendada para Criação

1. **Schema Base** (`docs/db/schema-v1_1.sql`)
   - Criação de todas as tabelas principais
   - Constraints básicas
   - RLS inicial

2. **Performance Indexes** (`docs/migrations/performance-optimization-indexes.sql`)
   - 50+ índices para performance
   - Otimizações de query

3. **Environment Entries** (`docs/migrations/phase-20-environment-entries.sql`)
   - Adiciona `environment_id` aos timesheet_entries

4. **Multi-tenant Employees** (`docs/migrations/phase-21-multi-tenant-employees.sql`)
   - Suporte a employees multi-tenant
   - Funções de contexto

5. **Environment Colors** (`docs/migrations/phase-22-environment-colors-autofill.sql`)
   - Cores e configurações de auto-fill

6. **Tenant Timezone** (`docs/migrations/phase-23-tenant-timezone.sql`)
   - Suporte multi-timezone
   - Funções de timezone

7. **In-app Notifications** (`docs/migrations/phase-24-in-app-notifications.sql`)
   - Sistema de notificações in-app

8. **Password Reset** (`web/migrations/password-reset-tokens.sql`)
   - Tokens de reset de senha

### Migrations de Correção (se necessário)

- `fix-tipo-constraint-complete.sql` - Correção constraint tipo
- `migrate-environments-from-tipos.sql` - Migração de tipos
- `fix-tipo-check-constraint.sql` - Constraint tipo corrigida

---

## 🔒 Sumário das Políticas RLS

### Padrão das Políticas
Todas as tabelas possuem RLS habilitado com políticas baseadas em:

1. **Tenant Isolation** - Acesso restrito ao tenant do usuário
2. **Role-based Access** - COLAB, GERENTE, TENANT_ADMIN, ADMIN_GLOBAL
3. **Employee Self-access** - Funcionários veem próprios dados
4. **Manager Delegation** - Gerentes veem dados dos grupos delegados
5. **Admin Override** - Admins têm acesso total ao escopo

### Exemplos de Políticas por Role

**COLAB (Colaborador):**
- ✅ Próprios timesheets e entries
- ✅ Próprias notificações
- ✅ Próprio perfil
- ❌ Timesheets de outros

**GERENTE:**
- ✅ Timesheets dos grupos delegados
- ✅ Entries dos colaboradores
- ✅ Aprovações dos timesheets
- ❌ Dados de outros tenants

**TENANT_ADMIN:**
- ✅ Todos os dados do tenant
- ✅ Gerenciamento de usuários
- ✅ Configurações do tenant
- ❌ Outros tenants

**ADMIN_GLOBAL:**
- ✅ Todos os dados de todos os tenants
- ✅ Acesso total ao sistema

---

## 📊 Dependências e Relacionamentos

### Diagrama de Relacionamentos (UML)

```
tenants (1) ────< (N) environments
tenants (1) ────< (N) vessels  
tenants (1) ────< (N) groups
tenants (1) ────< (N) employees
tenants (1) ────< (N) timesheets
tenants (1) ────< (N) approvals
tenants (1) ────< (N) notifications
tenants (1) ────< (N) comments
tenants (1) ────< (N) timesheet_annotations

employees (1) ────< (N) timesheets
timesheets (1) ────< (N) timesheet_entries
timesheets (1) ────< (N) approvals
timesheets (1) ────< (N) timesheet_annotations

groups (1) ────< (N) manager_group_assignments
groups (1) ────< (N) employee_group_members

employees (N) ────< (N) groups (via employee_group_members)
profiles (1) ────< (N) employees

environments (1) ────< (N) timesheet_entries
vessels (1) ────< (N) employees
```

### Cascades e Constraints

**CASCADE DELETE:**
- `environments`, `vessels`, `groups` → `tenants`
- `timesheet_entries`, `approvals`, `annotations` → `timesheets`
- `timesheets`, `employees` → `tenants`
- `manager_group_assignments`, `employee_group_members` → `groups`
- `employees` → `profiles`

**SET NULL:**
- `employees` → `vessels`
- `timesheet_entries` → `environments`

---

## 🎯 Considerações para Migração

### Checklist para Novo Projeto

1. **✅ Criar projeto Supabase**
2. **✅ Executar schema base** (`docs/db/schema-v1_1.sql`)
3. **✅ Aplicar índices de performance** (`performance-optimization-indexes.sql`)
4. **✅ Executar migrations na ordem:**
   - Phase 20 (environments)
   - Phase 21 (multi-tenant)
   - Phase 22 (colors)
   - Phase 23 (timezone)
   - Phase 24 (notifications)
5. **✅ Configurar environment variables**
6. **✅ Configurar SMTP email**
7. **✅ Configurar VAPID keys para push**
8. **✅ Testar RLS policies**
9. **✅ Criar tenant admin inicial**

### Configurações Pós-Migração

```sql
-- Criar tenant inicial
INSERT INTO tenants (name, slug) VALUES ('Minha Organização', 'minha-org');

-- Criar usuário admin
INSERT INTO profiles (user_id, display_name, email) 
VALUES ('uuid-do-usuario', 'Admin', 'admin@empresa.com');

-- Atribuir role de admin
INSERT INTO tenant_user_roles (tenant_id, user_id, role) 
SELECT id, 'uuid-do-usuario', 'TENANT_ADMIN' FROM tenants WHERE slug = 'minha-org';

-- Criar employee para o admin
INSERT INTO employees (tenant_id, profile_id, cargo) 
SELECT t.id, 'uuid-do-usuario', 'Administrador' 
FROM tenants t WHERE t.slug = 'minha-org';
```

---

**Última atualização:** 2025-10-31  
**Versão:** 1.0.0  
**Status:** ✅ Schema Completo e Testado  
**Total de Tabelas:** 17  
**Total de Índices:** 50+  
**Total de Policies RLS:** 40+  
**Total de Funções:** 15+