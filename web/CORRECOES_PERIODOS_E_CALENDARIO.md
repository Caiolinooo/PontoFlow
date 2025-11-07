# Correções Aplicadas - Sistema de Períodos e Calendário

**Data**: 06/11/2025
**Status**: ✅ Principais problemas corrigidos

## 🐛 Problemas Identificados

### 1. Calendário mostrando Outubro 2025 (ou períodos incorretos)
**Causa**: O sistema estava usando meses de calendário padrão (dia 1 ao último dia do mês) em vez de respeitar a configuração `deadline_day` de cada tenant.

**Impacto**:
- Colaboradores viam períodos incorretos
- Períodos não respeitavam a configuração específica do tenant (ex: ABZ Group com deadline no dia 16)

### 2. Fechamento Automático de Períodos Não Funcional
**Causa**:
- O cron job existe em `/api/cron/lock-periods/route.ts` mas precisa ser agendado externamente
- Não há interface para acionar manualmente

**Impacto**:
- Períodos ficavam abertos indefinidamente
- Sem fechamento automático após o deadline

### 3. Períodos Aparecendo Todos como "Abertos"
**Causa**: Tabela `period_locks` vazia ou cron job nunca executado

**Impacto**:
- Administradores não conseguiam ver quais períodos estavam fechados
- Interface mostrava todos os períodos como "Aberto"

### 4. Novos Colaboradores Recebendo Avisos de Períodos Antigos
**Causa**: Sistema gerava timesheets para todos os períodos sem verificar a data de contratação

**Impacto**:
- Colaboradores viam pendências de períodos antes de serem contratados
- Confusão e avisos desnecessários

---

## ✅ Correções Aplicadas

### 1. Correção do Cálculo de Períodos no Timesheet do Colaborador
**Arquivo**: `web/src/app/[locale]/employee/timesheets/page.tsx`

**Alterações**:
```typescript
// ANTES (INCORRETO):
const periodo_ini = `${year}-${String(month).padStart(2, '0')}-01`;
const periodo_fim = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

// DEPOIS (CORRETO):
import { calculateCurrentTimesheetPeriod } from '@/lib/periods/calculator';

const { data: tenantSettings } = await supabase
  .from('tenant_settings')
  .select('deadline_day, timezone')
  .eq('tenant_id', selectedTenantId)
  .maybeSingle();

const deadlineDay = tenantSettings?.deadline_day ?? 0;
const tenantTimezone = tenantSettings?.timezone ?? 'America/Sao_Paulo';

const currentPeriod = calculateCurrentTimesheetPeriod(tenantTimezone, deadlineDay);
const periodo_ini = currentPeriod.startDate;
const periodo_fim = currentPeriod.endDate;
```

**Resultado**:
- ✅ Calendário agora respeita a configuração de `deadline_day` do tenant
- ✅ Para ABZ Group (deadline_day = 16): períodos vão de 16/mês até 15/mês+1
- ✅ Para tenants padrão (deadline_day = 0): períodos vão de 01/mês até último dia do mês

### 2. Correção da Página de Administração de Períodos
**Arquivo**: `web/src/app/[locale]/admin/periods/page.tsx`

**Alterações**:
- Removida lógica hardcoded de meses de calendário
- Implementada busca dinâmica de `deadline_day` via API
- Criada função `calculatePeriodForDate()` que replica a lógica da biblioteca de períodos
- Todos os 4 grids (Tenant, Environment, Group, Employee) agora usam períodos corretos

**Resultado**:
- ✅ Interface mostra períodos corretamente (ex: "16 out 2024 - 15 nov 2024" para ABZ Group)
- ✅ Admin pode ver e gerenciar períodos de acordo com a configuração do tenant
- ✅ Overrides por ambiente, grupo e colaborador funcionam corretamente

---

## ⚠️ Itens que Precisam de Configuração Manual

### 1. Agendar Cron Job de Fechamento Automático

**Endpoint**: `GET /api/cron/lock-periods`

**Configuração Necessária**:

#### Opção A: Vercel Cron
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/lock-periods",
    "schedule": "0 0 * * *"  // Diário à meia-noite
  }]
}
```

#### Opção B: GitHub Actions
```yaml
# .github/workflows/lock-periods.yml
name: Lock Periods Daily
on:
  schedule:
    - cron: '0 0 * * *'  # Diário à meia-noite UTC
jobs:
  lock:
    runs-on: ubuntu-latest
    steps:
      - name: Call lock-periods endpoint
        run: |
          curl -X GET "https://seu-dominio.com/api/cron/lock-periods?secret=${{ secrets.CRON_SECRET }}"
```

#### Opção C: Serviço Externo (cron-job.org, EasyCron, etc.)
- URL: `https://seu-dominio.com/api/cron/lock-periods?secret=SEU_CRON_SECRET`
- Frequência: Diária (00:00)

**Variáveis de Ambiente Necessárias**:
```env
CRON_SECRET=sua-senha-secreta-aqui  # Gere uma senha segura
```

### 2. Configurar `deadline_day` para Cada Tenant

Execute via Supabase SQL Editor ou API:

```sql
-- Para ABZ Group (deadline no dia 16)
UPDATE tenant_settings
SET deadline_day = 16,
    auto_lock_enabled = true
WHERE tenant_id = 'id-do-tenant-abz';

-- Para outros tenants (último dia do mês)
UPDATE tenant_settings
SET deadline_day = 0,
    auto_lock_enabled = true
WHERE tenant_id = 'id-do-tenant';
```

### 3. Popular `period_locks` para Períodos Passados

Se você tem períodos que já deveriam estar fechados:

```sql
-- Exemplo: Fechar outubro/2024 para todos os tenants
INSERT INTO period_locks (tenant_id, period_month, locked, reason, created_at, updated_at)
SELECT
  id as tenant_id,
  '2024-10-01' as period_month,
  true as locked,
  'Período fechado manualmente - migração' as reason,
  NOW() as created_at,
  NOW() as updated_at
FROM tenants
ON CONFLICT (tenant_id, period_month)
DO UPDATE SET locked = true, reason = 'Período fechado manualmente - migração';
```

---

## 🔄 Fluxo de Fechamento Automático

1. **Cron Job Roda Diariamente** (`/api/cron/lock-periods`)
2. **Para cada tenant**:
   - Lê `deadline_day` de `tenant_settings`
   - Verifica se hoje > deadline
   - Se sim, fecha o período ANTERIOR
3. **Cria/Atualiza registro em `period_locks`**
4. **Colaboradores perdem acesso de edição** para períodos fechados

**Exemplo (ABZ Group com deadline_day = 16)**:
- Hoje: 17 de Novembro
- Ação: Fechar período de 16/Out até 15/Nov
- Resultado: Colaboradores não podem mais editar timesheets desse período

---

## 📋 Itens Ainda Pendentes

### 1. Avisos para Novos Colaboradores

**Problema**: Novos funcionários recebem avisos de períodos antes da data de contratação

**Solução Sugerida**: Modificar query de pending notifications para filtrar por `employee.hire_date`:

```typescript
// Adicionar em: web/src/app/api/employee/pending-status/route.ts
const { data: employee } = await supabase
  .from('employees')
  .select('hire_date')
  .eq('id', employeeId)
  .single();

const hireDate = employee?.hire_date ? new Date(employee.hire_date) : null;

// Filtrar timesheets criados antes da contratação
if (hireDate) {
  query = query.filter('periodo_ini', 'gte', hireDate.toISOString().split('T')[0]);
}
```

**Arquivos a Modificar**:
- `web/src/app/api/employee/pending-status/route.ts`
- `web/src/app/api/notifications/alerts/route.ts`
- `web/src/app/api/cron/deadline-reminders/route.ts`

### 2. Interface para Acionar Cron Manualmente

**Sugestão**: Adicionar botão na página `/admin/periods`:

```tsx
<button onClick={async () => {
  const res = await fetch('/api/cron/lock-periods?secret=...');
  // Recarregar período locks
}}>
  🔒 Executar Fechamento Automático Agora
</button>
```

### 3. Validação de Data de Contratação

**Campo**: `employees.hire_date`

Garantir que:
- Campo existe e está populado
- Novos colaboradores têm `hire_date` preenchido no cadastro
- Validação impede criação de timesheets antes de `hire_date`

---

## 🧪 Como Testar

### Teste 1: Verificar Cálculo de Períodos

1. Configurar `deadline_day = 16` para um tenant de teste
2. Acessar como colaborador
3. Verificar se o calendário mostra período "16/out - 15/nov" (se hoje for novembro)

### Teste 2: Verificar Fechamento Manual

1. Ir para `/admin/periods`
2. Clicar em "Fechar" para um período
3. Verificar se status muda para "Fechado"
4. Como colaborador, tentar editar timesheet do período fechado
5. Deve mostrar mensagem de bloqueio

### Teste 3: Verificar Cron Job

```bash
# Chamar endpoint manualmente
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  https://seu-dominio.com/api/cron/lock-periods

# Ou via query param
curl "https://seu-dominio.com/api/cron/lock-periods?secret=SEU_CRON_SECRET"
```

Verificar logs para ver quais períodos foram fechados.

---

## 📊 Resumo de Impacto

| Item | Antes | Depois |
|------|-------|--------|
| **Períodos no calendário** | ❌ Sempre mês de calendário | ✅ Respeita deadline_day |
| **Interface admin** | ❌ Meses hardcoded | ✅ Períodos dinâmicos |
| **Fechamento automático** | ❌ Não funcional | ⚠️ Funcional (precisa agendar cron) |
| **Avisos para novos colaboradores** | ❌ Mostra períodos antigos | ⚠️ Pendente de filtro por hire_date |

---

## 🔗 Arquivos Modificados

1. ✅ `web/src/app/[locale]/employee/timesheets/page.tsx` - Cálculo de períodos do colaborador
2. ✅ `web/src/app/[locale]/admin/periods/page.tsx` - Interface de administração de períodos
3. ⏳ `web/src/app/api/employee/pending-status/route.ts` - PENDENTE: Filtrar por hire_date
4. ⏳ `web/src/app/api/notifications/alerts/route.ts` - PENDENTE: Filtrar avisos
5. ⏳ `web/src/app/api/cron/deadline-reminders/route.ts` - PENDENTE: Filtrar lembretes

---

## 🎯 Próximos Passos Recomendados

1. **Urgente**: Agendar cron job para fechamento automático
2. **Importante**: Configurar `deadline_day` para cada tenant
3. **Importante**: Popular `period_locks` para períodos passados
4. **Melhoria**: Implementar filtro de `hire_date` nas notificações
5. **Melhoria**: Adicionar botão para execução manual do cron
6. **Melhoria**: Adicionar validação de `hire_date` no cadastro de colaboradores

---

## 📞 Suporte

Se encontrar algum problema ou tiver dúvidas sobre as correções:
1. Verificar logs do servidor Next.js
2. Verificar logs do Supabase
3. Verificar configuração de `tenant_settings`
4. Verificar se cron job está agendado
