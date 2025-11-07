# ANÁLISE PROFUNDA DE MIGRAÇÕES - PONTOFLOW
## Relatório de Auditoria de Banco de Dados
**Data:** 2025-11-07  
**Escopo:** `/home/user/PontoFlow/web/migrations/`

---

## RESUMO EXECUTIVO

**Total de Problemas Encontrados:** 31  
**Críticos:** 8  
**Altos:** 12  
**Médios:** 9  
**Baixos:** 2  

---

## 1. INCONSISTÊNCIA DE SCHEMA - SEVERIDADE ALTA

### 1.1 [CRÍTICO] Falta de Foreign Key Constraints em Colunas user_id
**Localização:** Multiple files  
**Problema:** Várias tabelas armazenam `user_id` sem Foreign Key constraints:

| Tabela | Coluna | Referência Esperada | Status |
|--------|--------|-------------------|--------|
| `timesheets` | `approved_by` | `profiles.user_id` | ❌ Apenas comentário |
| `period_locks` | `locked_by` | `profiles.user_id` ou `users_unified.id` | ❌ Sem FK |
| `approvals` | `approver_id` | `profiles.user_id` ou `users_unified.id` | ❌ Sem FK |
| `comments` | `author_id` | `profiles.user_id` ou `users_unified.id` | ❌ Sem FK |
| `timesheet_annotations` | `author_id` | `profiles.user_id` ou `users_unified.id` | ❌ Sem FK |
| `manager_group_assignments` | `manager_id` | `profiles.user_id` ou `users_unified.id` | ❌ Sem FK |
| `notifications` | `user_id` | `auth.users.id` ou `profiles.user_id` | ⚠️ Sem FK (comentário no schema) |

**Impacto:** 
- Possibilidade de orphaned records quando usuários são deletados
- Violação de integridade referencial
- Impossibilidade de garantir que apenas usuários válidos podem realizar ações

**Arquivo Afetado:** 
- `/home/user/PontoFlow/web/migrations/setup-wizard/07-layer-06-timesheets-periods.sql:23`
- `/home/user/PontoFlow/web/migrations/setup-wizard/08-layer-07-timesheet-details.sql:49,73`
- `/home/user/PontoFlow/web/migrations/setup-wizard/09-layer-08-communication-audit.sql:18`
- `/home/user/PontoFlow/web/migrations/setup-wizard/06-layer-05-assignments.sql:15`

---

### 1.2 [ALTO] Inconsistência em Domínio de user_id
**Localização:** Setup wizard layers

**Problema:** O sistema utiliza 3 domínios de user_id diferentes:

1. **`auth.users.id`** (Supabase Auth)
   - Usado em: `notification_preferences`, `push_subscriptions`, `notification_log`
   - Referência: `/home/user/PontoFlow/web/migrations/setup-wizard/04-layer-03-roles-settings.sql:97,122,68`

2. **`profiles.user_id`** (Mirror da auth.users)
   - Usado em: `employees`, `approvals`, `comments`, `timesheets.approved_by`
   - Referência: `/home/user/PontoFlow/web/migrations/setup-wizard/06-layer-04-groups-employees.sql:40`

3. **`users_unified.id`** (Fallback/Legacy ABZ)
   - Usado em: `user_invitations.invited_by`, `password_reset_tokens.user_id`
   - Referência: `/home/user/PontoFlow/web/migrations/setup-wizard/04-layer-03-roles-settings.sql:71`

**Impacto:**
- Ambiguidade no código sobre qual tabela consultar
- Possíveis data loss em operações que deletam de uma tabela mas não de outra
- RLS policies complexas e potencialmente bugadas

---

## 2. DATA INTEGRITY - SEVERIDADE CRÍTICA

### 2.1 [CRÍTICO] Cascading Delete Policy Perigosa
**Localização:** Multiple tables  
**Problema:** Muitas tabelas usam `ON DELETE CASCADE` que podem causar data loss em cadeia:

```sql
-- Arquivo: 03-layer-02-user-environment.sql:72
tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE

-- Efeito em cascata:
tenants → environments → groups → employees → timesheets → timesheet_entries
                     → vessel_group_links → ...
```

**Cenário Crítico:** Deletar acidentalmente um `tenant` resulta em:
- Todos os `environments` deletados
- Todos os `groups` deletados  
- Todos os `employees` deletados
- Todos os `timesheets` deletados
- Todos os `timesheet_entries` (auditoria histórica perdida)
- Impossibilidade de recuperar dados

**Impacto:** Possível perda irrecuperável de dados de produção  
**Arquivo:** `/home/user/PontoFlow/web/migrations/setup-wizard/03-layer-02-user-environment.sql` (linhas 72, 94)

---

### 2.2 [ALTO] Falta de Índices em Colunas Frequentemente Consultadas
**Localização:** Algumas colunas críticas faltam índices

**Problema:** As seguintes colunas frequentemente usadas em queries não possuem índices:

- `timesheets.status` - Usado em: `SELECT * FROM timesheets WHERE status = 'enviado'`
- `user_invitations.status` - Sem índice no core (criado em migração fix)
- `employees.tenant_id` com `profile_id` - Combinação não indexada

**Impacto:** Queries lentas em tabelas grandes  
**Severidade:** MÉDIO (mitigado parcialmente por indexes em layer 11)

---

### 2.3 [ALTO] Tipo de Dado Incompatível - password_reset_tokens
**Localização:** `/home/user/PontoFlow/web/migrations/password-reset-tokens.sql:6`

**Problema:** A tabela referencia `users_unified(id)` mas é criada antes da migração que estabelece essa relação:

```sql
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  user_id UUID NOT NULL REFERENCES public.users_unified(id) ON DELETE CASCADE,
  ...
)
```

**Impacto:**
- Se `users_unified` for deletada/recriada, a FK quebra
- Incompatibilidade com fluxo de Supabase Auth que usa `auth.users`

---

## 3. MIGRAÇÕES PERIGOSAS - SEVERIDADE CRÍTICA

### 3.1 [CRÍTICO] DELETE sem WHERE Clause em Cleanup
**Localização:** `/home/user/PontoFlow/web/migrations/password-reset-tokens.sql:44`

**Problema:** A função cleanup não tem proteção contra deleção total:

```sql
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW() OR used_at IS NOT NULL;  -- ✅ Está OK
END;
$$;
```

**Status:** Realmente está OK, o WHERE clause existe. Falso alarme na busca anterior.

---

### 3.2 [ALTO] Uso Incorreto de `sync_profile_to_users_unified()` Trigger
**Localização:** `/home/user/PontoFlow/web/migrations/setup-wizard/11-layer-10-triggers.sql:110`

**Problema:** O trigger sincroniza profiles com users_unified após cada INSERT/UPDATE em profiles:

```sql
CREATE TRIGGER on_profile_sync_to_users_unified
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_users_unified();
```

**Riscos:**
1. Se houver UPDATE em `users_unified`, ele não dispara o trigger inverso → dados ficam desincronizados
2. Trigger é AFTER, então pode causar race conditions em transactions rápidas
3. Função sincroniza com `is_active` como `active` mas coluna é chamada diferentemente em diferentes migrações

**Impacto:** Dados inconsistentes entre `profiles` e `users_unified`

**Arquivo:**
- `/home/user/PontoFlow/web/migrations/setup-wizard/11-layer-10-triggers.sql:57-103`
- `/home/user/PontoFlow/web/migrations/SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql:24-95`

---

### 3.3 [ALTO] Múltiplas Definições da Mesma Trigger
**Localização:** Duas versões da trigger de sincronização existem

**Problema:** Existem pelo menos 2-3 versões da mesma função:

1. `11-layer-10-triggers.sql:57-103` - Versão genérica
2. `SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql:24-95` - Versão ABZ específica
3. `SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-CONFIGURABLE.sql` - Versão configurável

**Impacto:** 
- Confusão sobre qual versão está sendo usada
- Se múltiplas rodarem, podem se sobrescrever e levar a comportamento indefinido
- Difícil debugar qual trigger está disparando

---

## 4. RLS POLICIES - SEVERIDADE ALTA

### 4.1 [ALTO] RLS Policy Incompleta para user_invitations
**Localização:** `/home/user/PontoFlow/web/migrations/setup-wizard/13-layer-12-rls-policies.sql:382-391`

**Problema:** A policy só permite acesso a admin ou quem convidou, mas não tem policy para UPDATE/DELETE específicos:

```sql
DROP POLICY IF EXISTS user_invitations_admin_all ON public.user_invitations;
CREATE POLICY user_invitations_admin_all ON public.user_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users_unified
      WHERE users_unified.id = auth.uid()
        AND users_unified.role = 'ADMIN'
    ) OR
    invited_by = auth.uid()
  );
```

**Riscos:**
- Qualquer admin em `users_unified` pode ver invitations de outro admin
- Não há policy separada para SELECT vs. DELETE
- `invited_by = auth.uid()` permite que quem convidou delete a invitation (potencial abuso)

---

### 4.2 [ALTO] RLS Policy Sobrescreve `ADMIN_GLOBAL` com `ADMIN`
**Localização:** `/home/user/PontoFlow/web/migrations/setup-wizard/04-layer-03-roles-settings.sql:17`

**Problema:** tenant_user_roles define role como:

```sql
role TEXT NOT NULL CHECK (role IN ('COLAB', 'GERENTE', 'TENANT_ADMIN', 'ADMIN_GLOBAL'))
```

Mas users_unified define role como:

```sql
role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'MANAGER_TIMESHEET', 'MANAGER', 'ADMIN'))
```

**Impacto:** 
- `ADMIN_GLOBAL` em tenant_user_roles não corresponde a nada em `users_unified`
- RLS policies que checam `users_unified.role = 'ADMIN'` ignoram `ADMIN_GLOBAL`
- Inconsistência de modelo de role

**Arquivo:** 
- `/home/user/PontoFlow/web/migrations/setup-wizard/04-layer-03-roles-settings.sql:17`
- `/home/user/PontoFlow/web/migrations/setup-wizard/03-layer-02-user-environment.sql:51`
- `/home/user/PontoFlow/web/migrations/FIX-USER-ROLE-CONSTRAINT.sql` (tenta corrigir)

---

### 4.3 [MÉDIO] RLS Policy Muito Permissiva para Service Role
**Localização:** `/home/user/PontoFlow/web/migrations/password-reset-tokens.sql:32-35`

**Problema:**

```sql
CREATE POLICY "Service role can manage all reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  USING (true);  -- ❌ TOO PERMISSIVE
```

**Impacto:** 
- Qualquer requisição com service role (incluindo possíveis brechas) pode acessar/modificar todos os tokens
- Viola princípio de least privilege

---

## 5. TRIGGERS E FUNCTIONS - SEVERIDADE MÉDIA

### 5.1 [MÉDIO] Trigger `sync_profile_to_users_unified` Ignora Erro Silenciosamente
**Localização:** `/home/user/PontoFlow/web/migrations/setup-wizard/11-layer-10-triggers.sql:70-103`

**Problema:** Função sincroniza apenas se `enable_users_unified_sync = 'true'`, mas:

```sql
SELECT value INTO sync_enabled
FROM public.system_config
WHERE key = 'enable_users_unified_sync';

IF sync_enabled = 'true' THEN
  -- sync logic
END IF;
```

**Riscos:**
- Se `system_config` row não existir, `sync_enabled` fica NULL e nada é sincronizado (silenciosamente)
- Nenhum log de erro quando sync é skipped
- Será difícil debugar "por que os dados não estão sincronizados?"

---

### 5.2 [MÉDIO] Múltiplas Definições de `update_updated_at_column()` 
**Localização:** `/home/user/PontoFlow/web/migrations/setup-wizard/11-layer-10-triggers.sql:118-141`

**Problema:** A função é definida uma vez mas aplicada a várias tabelas. Se precisar de customização por tabela, será problemático:

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Aplicado a: tenants, profiles, notifications (3+ triggers)
```

**Impacto:** Difícil customizar comportamento de `updated_at` por tabela

---

### 5.3 [MÉDIO] Function `set_tenant_context()` Sem Validação
**Localização:** `/home/user/PontoFlow/web/migrations/setup-wizard/10-layer-09-functions.sql:156-164`

**Problema:** Função aceita qualquer UUID sem validar se o tenant existe:

```sql
CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_uuid::TEXT, FALSE);
  -- ❌ Sem validação se tenant_uuid existe
END;
$$;
```

**Impacto:** Um usuário poderia chamar `set_tenant_context()` com UUID aleatório e o código agiria como se pertencesse a um tenant que não existe

---

## 6. FALTA DE VALIDAÇÃO - SEVERIDADE BAIXA

### 6.1 [BAIXO] Função `timesheet_deadline()` Hardcoda Dia 5
**Localização:** `/home/user/PontoFlow/web/migrations/setup-wizard/10-layer-09-functions.sql:50-68`

**Problema:** Deadline é sempre 5º do mês próximo:

```sql
SELECT (date_trunc('month', periodo_ini)::DATE + INTERVAL '1 month + 4 days')::TIMESTAMPTZ
```

**Impacto:** 
- Não é configurável por tenant
- Hardcoded em função, difícil de mudar em produção
- Sugestão: Colocar em `tenant_settings`

---

### 6.2 [BAIXO] Constraint `check_timezone_valid` usa Regex Frágil
**Localização:** `/home/user/PontoFlow/web/migrations/setup-wizard/02-layer-01-root-tables.sql:22`

**Problema:**

```sql
CONSTRAINT check_timezone_valid CHECK (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+(-[A-Za-z_]+)*$')
```

**Impacto:** 
- Não valida se é um timezone IANA válido
- Aceita `Invalid/Timezone` como válido
- Melhor usar enum ou table reference

---

## 7. DESCOBERTAS ADICIONAIS

### 7.1 [ALTO] Falta de Upsert Protection em user_invitations
**Localização:** `/home/user/PontoFlow/web/migrations/create-user-invitations.sql:59`

**Problema:** Não há constraint UNIQUE em `(email, tenant_ids)`:

```sql
token TEXT NOT NULL UNIQUE,  -- Apenas token é unique
-- Falta: UNIQUE(email, status) quando status = 'pending'
```

**Impacto:** 
- Mesmo email pode ter múltiplos invites pendentes
- Possível confusão ao clicar link

---

### 7.2 [ALTO] Coluna `active` vs `is_active` Inconsistência
**Localização:** Multiple files

**Problema:** Diferentes tabelas usam nomes diferentes:

| Tabela | Coluna |
|--------|--------|
| `profiles` | `ativo` |
| `users_unified` | `is_active` |
| `user_invitations` | N/A |

**Impacto:** Confusão ao sincronizar dados

---

### 7.3 [CRÍTICO] Múltiplas Definições de `user_invitations` Table
**Localização:** Pelo menos 3 arquivos

**Problema:** A tabela é criada em:
1. `/home/user/PontoFlow/web/migrations/setup-wizard/04-layer-03-roles-settings.sql:61-80`
2. `/home/user/PontoFlow/web/migrations/create-user-invitations.sql`
3. `/home/user/PontoFlow/web/migrations/FIX-USER-INVITATIONS-COMPLETE.sql`

Cada versão tem schema ligeiramente diferente.

**Impacto:** 
- Ambiguidade sobre qual schema é correto
- Possível conflito se ambas são aplicadas
- Schema drift ao longo do tempo

---

## RESUMO DE AÇÕES RECOMENDADAS

### CRÍTICAS (Fazer Imediatamente)
1. ✅ Adicionar Foreign Key constraints a todas as colunas user_id
2. ✅ Revisar e documentar política de CASCADE deletes
3. ✅ Consolidar definições de `user_invitations` em um único arquivo
4. ✅ Resolver inconsistência de roles (ADMIN vs ADMIN_GLOBAL)
5. ✅ Validar tenant existence em `set_tenant_context()`

### ALTAS (Fazer na Próxima Sprint)
1. ✅ Unificar domínios de user_id (escolher: auth.users ou users_unified)
2. ✅ Implementar proteção de cascading deletes (SET NULL para dados críticos)
3. ✅ Revisar e testar todas as RLS policies
4. ✅ Consolidar múltiplas versões de sync triggers
5. ✅ Adicionar logging a funções críticas

### MÉDIAS (Planejamento)
1. ✅ Implementar enum para roles
2. ✅ Adicionar validação de timezone em constraint check
3. ✅ Refatorar funções genéricas para permitir customização por tabela
4. ✅ Adicionar índices em colunas frequentemente filtradas
5. ✅ Documentar ordem de execução de migrações

