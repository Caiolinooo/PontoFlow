# Correções - Sistema de Ambientes

## Resumo das Mudanças Implementadas

### 1. ✅ Migration SQL (Phase 22)
**Arquivo:** `docs/migrations/phase-22-environment-colors-autofill.sql`

**Mudanças:**
- Adicionado campo `color` (TEXT) na tabela `environments`
- Adicionado campo `auto_fill_enabled` (BOOLEAN) na tabela `environments`
- Adicionado campo `auto_fill_enabled` (BOOLEAN) na tabela `tenant_settings`
- Adicionado campo `auto_fill_past_days` (BOOLEAN) na tabela `tenant_settings`
- Adicionado campo `auto_fill_future_days` (BOOLEAN) na tabela `tenant_settings`

**Executar no Supabase SQL Editor:**
```sql
-- Copiar e executar o conteúdo de docs/migrations/phase-22-environment-colors-autofill.sql
```

---

### 2. ✅ Formulário de Criação de Ambientes
**Arquivo:** `web/src/app/[locale]/admin/environments/new/page.tsx`

**Mudanças:**
- Adicionado campo de cor (color picker + input text)
- Adicionado checkbox para habilitar/desabilitar auto-fill
- Valores padrão: `color = #3B82F6`, `auto_fill_enabled = true`

---

### 3. ✅ API de Ambientes
**Arquivos:**
- `web/src/app/api/admin/environments/route.ts` (GET e POST)
- `web/src/app/api/admin/environments/[id]/route.ts` (PATCH)

**Mudanças:**
- GET: Retorna campos `color` e `auto_fill_enabled`
- POST: Aceita e salva campos `color` e `auto_fill_enabled`
- PATCH: Permite atualizar campos `color` e `auto_fill_enabled`

---

### 4. ✅ Configurações do Tenant
**Arquivo:** `web/src/components/admin/AdminTenantSettings.tsx`

**Mudanças:**
- Adicionada nova seção "Configurações de Preenchimento Automático"
- 3 novos campos:
  - `auto_fill_enabled`: Habilitar/desabilitar globalmente
  - `auto_fill_past_days`: Permitir preencher dias anteriores
  - `auto_fill_future_days`: Permitir preencher dias futuros

---

### 5. ✅ API de Settings
**Arquivo:** `web/src/app/api/admin/settings/route.ts`

**Mudanças:**
- Adicionado parsing e salvamento dos 3 novos campos de auto-fill
- Valores padrão:
  - `auto_fill_enabled = true`
  - `auto_fill_past_days = false`
  - `auto_fill_future_days = true`

---

### 6. ✅ Traduções
**Arquivos:**
- `web/messages/pt-BR/common.json`
- `web/messages/en-GB/common.json`

**Mudanças:**
- Adicionada seção `autoFillSettings` com 6 novas chaves de tradução

---

## Mudanças Pendentes (Próximos Passos)

### 7. ⏳ Remover Tipos Hardcoded do TimesheetCalendar
**Arquivo:** `web/src/components/employee/TimesheetCalendar.tsx`

**O que fazer:**
1. Remover o objeto `tipoColors` (linhas 239-246) que mapeia tipos hardcoded para cores
2. Remover o objeto `tipoLabels` (linhas 248-255) que mapeia tipos para labels
3. Modificar o formulário de criação de lançamento:
   - Remover o select de "Tipo de Lançamento"
   - Usar apenas o select de "Ambiente de Trabalho"
   - Buscar a cor do ambiente selecionado para exibir no calendário
4. Modificar a função `handleCreateEntry` para:
   - Não verificar mais `form.tipo === 'embarque' || form.tipo === 'desembarque'`
   - Verificar se o ambiente selecionado tem `auto_fill_enabled = true`
   - Verificar as configurações do tenant (`auto_fill_enabled`, `auto_fill_past_days`, `auto_fill_future_days`)
5. Modificar a função `calculateSuggestedEntries` para:
   - Receber `environment_id` ao invés de `tipo`
   - Respeitar as configurações de `auto_fill_past_days` e `auto_fill_future_days`
   - Não criar mais lançamentos de "offshore/onshore/folga" automaticamente
   - Criar apenas lançamentos do ambiente selecionado
6. Modificar a exibição de lançamentos no calendário:
   - Buscar a cor do ambiente associado ao lançamento
   - Exibir o nome do ambiente ao invés do tipo

---

### 8. ⏳ Atualizar Validações de API
**Arquivos:**
- `web/src/app/api/employee/timesheets/[id]/entries/route.ts`
- `web/src/app/api/employee/timesheets/[id]/entries/[entryId]/route.ts`
- `web/src/app/api/manager/timesheets/[id]/entries/route.ts`
- `web/src/app/api/manager/timesheets/[id]/entries/[entryId]/route.ts`

**O que fazer:**
1. Remover validação de `tipo` com enum hardcoded
2. Tornar `environment_id` obrigatório (não mais opcional)
3. Validar que o `environment_id` existe e pertence ao tenant do usuário
4. Remover campo `tipo` do schema de validação

---

### 9. ⏳ Atualizar Componentes de Manager
**Arquivos:**
- `web/src/components/manager/EntryEditModal.tsx`
- `web/src/components/manager/ManagerAddEntry.tsx`

**O que fazer:**
1. Remover select de "Tipo" hardcoded
2. Adicionar select de "Ambiente de Trabalho"
3. Buscar lista de ambientes do tenant
4. Atualizar chamadas de API para enviar `environment_id` ao invés de `tipo`

---

### 10. ⏳ Atualizar Tabela de Lançamentos
**Arquivo:** `web/src/components/manager/ManagerTimesheetDetail.tsx` (se existir)

**O que fazer:**
1. Exibir nome do ambiente ao invés do tipo
2. Exibir cor do ambiente como badge/indicador visual

---

### 11. ⏳ Migração de Dados Existentes
**Criar script SQL:**

```sql
-- Criar ambientes padrão baseados nos tipos existentes
INSERT INTO public.environments (tenant_id, name, slug, color, auto_fill_enabled)
SELECT DISTINCT 
  t.id as tenant_id,
  CASE 
    WHEN te.tipo = 'embarque' THEN 'Embarque'
    WHEN te.tipo = 'desembarque' THEN 'Desembarque'
    WHEN te.tipo = 'translado' THEN 'Translado'
    WHEN te.tipo = 'onshore' THEN 'Onshore'
    WHEN te.tipo = 'offshore' THEN 'Offshore'
    WHEN te.tipo = 'folga' THEN 'Folga'
    ELSE te.tipo
  END as name,
  te.tipo as slug,
  CASE 
    WHEN te.tipo = 'embarque' THEN '#3B82F6'
    WHEN te.tipo = 'desembarque' THEN '#6366F1'
    WHEN te.tipo = 'translado' THEN '#F59E0B'
    WHEN te.tipo = 'onshore' THEN '#10B981'
    WHEN te.tipo = 'offshore' THEN '#0EA5E9'
    WHEN te.tipo = 'folga' THEN '#6B7280'
    ELSE '#3B82F6'
  END as color,
  true as auto_fill_enabled
FROM public.timesheet_entries te
JOIN public.timesheets ts ON te.timesheet_id = ts.id
JOIN public.tenants t ON ts.tenant_id = t.id
WHERE te.environment_id IS NULL
ON CONFLICT DO NOTHING;

-- Atualizar lançamentos existentes para usar os ambientes criados
UPDATE public.timesheet_entries te
SET environment_id = e.id
FROM public.environments e
JOIN public.timesheets ts ON te.timesheet_id = ts.id
WHERE te.environment_id IS NULL
  AND e.tenant_id = ts.tenant_id
  AND e.slug = te.tipo;

-- Verificar se todos os lançamentos têm ambiente
SELECT COUNT(*) as entries_without_environment
FROM public.timesheet_entries
WHERE environment_id IS NULL;
-- Deve retornar 0
```

---

## Ordem de Implementação Recomendada

1. ✅ **Executar Migration SQL** (Phase 22)
2. ✅ **Testar criação de novos ambientes** com cor e auto-fill
3. ✅ **Testar configurações de tenant** para auto-fill
4. ⏳ **Executar script de migração de dados** para criar ambientes baseados em tipos existentes
5. ⏳ **Atualizar TimesheetCalendar** para usar ambientes
6. ⏳ **Atualizar validações de API** para exigir environment_id
7. ⏳ **Atualizar componentes de Manager**
8. ⏳ **Testar fluxo completo** de criação/edição de lançamentos
9. ⏳ **Remover campo `tipo` da tabela** `timesheet_entries` (opcional, pode manter para histórico)

---

## Notas Importantes

### Sobre o Campo `tipo`
- **Opção 1 (Recomendada):** Manter o campo `tipo` na tabela por enquanto para não quebrar queries existentes, mas torná-lo opcional e deprecated
- **Opção 2:** Remover completamente o campo `tipo` após migração de dados e atualização de todos os componentes

### Sobre Auto-fill
- A lógica de auto-fill deve respeitar 3 níveis de configuração:
  1. **Tenant:** `auto_fill_enabled` global
  2. **Ambiente:** `auto_fill_enabled` por ambiente
  3. **Período:** `auto_fill_past_days` e `auto_fill_future_days`

### Sobre Cores
- Usar cores em formato hexadecimal (#RRGGBB)
- Validar formato no frontend e backend
- Fornecer color picker no formulário para melhor UX

---

## Testes Necessários

1. ✅ Criar novo ambiente com cor personalizada
2. ✅ Editar ambiente existente
3. ✅ Configurar auto-fill nas configurações do tenant
4. ⏳ Criar lançamento usando ambiente (não tipo)
5. ⏳ Verificar cor do lançamento no calendário
6. ⏳ Testar auto-fill com diferentes configurações
7. ⏳ Testar auto-fill respeitando past_days e future_days
8. ⏳ Verificar que ambientes com auto_fill_enabled=false não aparecem no auto-fill

