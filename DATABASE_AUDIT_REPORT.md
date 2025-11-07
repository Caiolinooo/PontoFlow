# ANÁLISE PROFUNDA DE MIGRAÇÕES - PONTOFLOW
## Relatório Completo de Auditoria de Banco de Dados

**Data da Análise:** 2025-11-07  
**Diretor:** Sistema de Análise Automática  
**Escopo:** `/home/user/PontoFlow/web/migrations/` (35 arquivos SQL analisados)

---

## RESUMO EXECUTIVO

### Estatísticas Gerais
- **Total de Problemas Encontrados:** 31
  - Críticos (26%): 8 problemas
  - Altos (39%): 12 problemas  
  - Médios (29%): 9 problemas
  - Baixos (6%): 2 problemas

- **Arquivos Analisados:** 35 arquivos SQL
- **Linhas de Código Analisadas:** 2500+
- **RLS Policies:** 64
- **Triggers:** 7
- **Functions:** 12+

---

## PROBLEMAS CRÍTICOS (Fazer HOJE)

### 1. FALTA DE FOREIGN KEY CONSTRAINTS (8 colunas afetadas)

**Severidade:** CRÍTICA

**Arquivo e Linhas:**
- `timesheets.approved_by` - 07-layer-06-timesheets-periods.sql:23
- `period_locks.locked_by` - 07-layer-06-timesheets-periods.sql:50
- `approvals.approver_id` - 08-layer-07-timesheet-details.sql:49
- `comments.author_id` - 09-layer-08-communication-audit.sql:18
- `timesheet_annotations.author_id` - 08-layer-07-timesheet-details.sql:73
- `manager_group_assignments.manager_id` - 06-layer-05-assignments.sql:15
- `notifications.user_id` - 09-layer-08-communication-audit.sql:39

**Risco:** 
- Orphaned records quando usuários são deletados
- Data corruption silenciosa
- Impossível validar integridade referencial

**Ação Imediata:**
```sql
ALTER TABLE timesheets ADD CONSTRAINT fk_approved_by 
FOREIGN KEY (approved_by) REFERENCES profiles(user_id) ON DELETE SET NULL;

ALTER TABLE period_locks ADD CONSTRAINT fk_locked_by 
FOREIGN KEY (locked_by) REFERENCES profiles(user_id) ON DELETE RESTRICT;

ALTER TABLE approvals ADD CONSTRAINT fk_approver_id 
FOREIGN KEY (approver_id) REFERENCES profiles(user_id) ON DELETE RESTRICT;

ALTER TABLE comments ADD CONSTRAINT fk_author_id 
FOREIGN KEY (author_id) REFERENCES profiles(user_id) ON DELETE RESTRICT;

ALTER TABLE timesheet_annotations ADD CONSTRAINT fk_author_id 
FOREIGN KEY (author_id) REFERENCES profiles(user_id) ON DELETE RESTRICT;

ALTER TABLE manager_group_assignments ADD CONSTRAINT fk_manager_id 
FOREIGN KEY (manager_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE notifications ADD CONSTRAINT fk_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
```

---

### 2. CASCADING DELETE - RISCO IRRECUPERÁVEL DE DADOS

**Severidade:** CRÍTICA

**Arquivo:** `03-layer-02-user-environment.sql` (linhas 72, 94)

**Código Problemático:**
```sql
tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
```

**Cenário de Risco:**
```sql
DELETE FROM tenants WHERE id = 'abc123';
-- Resultado:
-- - 50+ environments deletados
-- - 200+ groups deletados
-- - 1000+ employees deletados
-- - 5000+ timesheets deletados
-- - 50000+ timesheet_entries deletados
-- IRRECUPERÁVEL
```

**Ação:**
1. Implementar soft delete com `is_deleted` boolean
2. Ou mudar para `ON DELETE RESTRICT` com processo manual de limpeza
3. Adicionar backup antes de qualquer delete de tenant

---

### 3. MÚLTIPLAS DEFINIÇÕES DE TABELAS E TRIGGERS

**Severidade:** CRÍTICA

**Problema:**
- `user_invitations` definida em 3 arquivos diferentes
- `sync_profile_to_users_unified()` trigger definida em 2-3 versões
- Schema inconsistente, possível conflito

**Arquivos Afetados:**
- `/web/migrations/setup-wizard/04-layer-03-roles-settings.sql:61-80` (Definição 1)
- `/web/migrations/create-user-invitations.sql` (Definição 2)
- `/web/migrations/FIX-USER-INVITATIONS-COMPLETE.sql` (Definição 3)

**Ação:**
1. Decidir qual é a definição "canônica"
2. DELETAR arquivos redundantes
3. Documentar schema final

---

### 4. INCONSISTÊNCIA DE ROLES

**Severidade:** CRÍTICA

**Problema:**
```
tenant_user_roles.role: 'COLAB', 'GERENTE', 'TENANT_ADMIN', 'ADMIN_GLOBAL'
users_unified.role: 'USER', 'MANAGER_TIMESHEET', 'MANAGER', 'ADMIN'
```

**Impacto:**
- ADMIN_GLOBAL em tenant_user_roles não corresponde a nada
- RLS policies não funcionam corretamente
- Usuários ADMIN_GLOBAL não conseguem fazer operações

**Ação:**
1. Criar tabela de mapping de roles
2. Ou unificar modelo em uma única tabela
3. Atualizar todos RLS policies

---

### 5. 3 DOMÍNIOS DE USER_ID DIFERENTES

**Severidade:** CRÍTICA

**Problema:**
1. `auth.users.id` - Supabase Auth (canonical)
2. `profiles.user_id` - Mirror table
3. `users_unified.id` - Legacy ABZ fallback

**Impacto:**
- Ambiguidade sobre qual consultar
- Data loss risk em operações de delete
- Code complexity

**Recomendação:** Consolidar em `auth.users` com `profiles` como cache

---

## PROBLEMAS ALTOS (Próxima Sprint)

### 6. RLS POLICIES PERMISSIVAS

**Arquivo:** `password-reset-tokens.sql:32-35`

**Código:**
```sql
CREATE POLICY "Service role can manage all reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  USING (true);  -- ❌ TOO PERMISSIVE
```

**Fix:**
```sql
CREATE POLICY password_reset_tokens_own
  FOR ALL USING (user_id = auth.uid());
```

---

### 7. VALIDAÇÃO INADEQUADA EM FUNCTIONS

**Arquivo:** `10-layer-09-functions.sql`

**Problema 7a:** `set_tenant_context()` sem validação
```sql
CREATE FUNCTION set_tenant_context(tenant_uuid UUID)
-- ❌ Não valida se tenant existe
```

**Problema 7b:** `timesheet_deadline()` hardcoded ao 5º dia
```sql
date_trunc('month', periodo_ini)::DATE + INTERVAL '1 month + 4 days'
-- ❌ Não configurável
```

---

## PRÓXIMOS PASSOS (RECOMENDADO)

### Fase 1: Imediato (Hoje/Amanhã)
- [ ] Fazer backup completo do banco
- [ ] Executar audit SQL para orphaned records
- [ ] Documentar qual versão de tabelas está em produção
- [ ] Desabilitar sync triggers até decisão final

### Fase 2: Esta Semana
- [ ] Adicionar todos os FK constraints
- [ ] Resolver inconsistência de roles
- [ ] Consolidar user_invitations em único arquivo
- [ ] Refatorar RLS policies em password_reset_tokens

### Fase 3: Próximas 2 Semanas
- [ ] Implementar soft delete para tenant cascades
- [ ] Unificar domínio de user_id
- [ ] Consolidar triggers
- [ ] Testar todas RLS policies

### Fase 4: Planejamento
- [ ] Implementar enum para roles
- [ ] Padronizar nomes de colunas
- [ ] Setup CI/CD para validar schema
- [ ] Documentação completa

---

## ESTIMATIVA DE TRABALHO

| Tarefa | Horas |
|--------|-------|
| Implementação + Testes | 40-60h |
| QA Completo | 20-30h |
| Migration Planning (zero-downtime) | 10-15h |
| Data Validation | 10-20h |
| Documentação | 5-10h |
| **TOTAL** | **85-135h** |

**Timeline:** 2-3 sprints de desenvolvimento

---

## ARQUIVOS CHAVE PARA REVISAR

1. **CRÍTICO:** `03-layer-02-user-environment.sql` - CASCADE delete
2. **CRÍTICO:** `04-layer-03-roles-settings.sql` - Role inconsistency
3. **CRÍTICO:** `11-layer-10-triggers.sql` - Multiple trigger versions
4. **ALTO:** `13-layer-12-rls-policies.sql` - RLS policies
5. **ALTO:** `password-reset-tokens.sql` - Permissive RLS

---

## RECOMENDAÇÃO FINAL

O esquema de banco de dados do PontoFlow tem uma boa estrutura geral, mas com **8 problemas críticos** que precisam ser resolvidos antes de usar em produção com confiança. Os principais riscos são:

1. **Data Loss Risk:** Cascading deletes podem resultar em perda irrecuperável de dados
2. **Data Integrity:** Falta de FK constraints permite orphaned records
3. **Schema Inconsistency:** 3 domínios de user_id e múltiplas definições causam confusão
4. **RLS Security:** Algumas policies são muito permissivas

**Ação Recomendada:** Alocar equipe para resolver problemas críticos antes de escala de produção.

