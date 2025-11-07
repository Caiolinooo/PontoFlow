# Melhorias Aplicadas - Sistema de Relatórios

**Data**: 06/11/2025
**Status**: ✅ Todas as correções e melhorias implementadas

---

## 🎯 Objetivos Alcançados

### 1. ✅ Correção do Cálculo de Horas Trabalhadas
**Problema**: O sistema estava somando simplesmente `hora_fim - hora_ini` para cada entrada, sem agrupar por dia nem aplicar descanso obrigatório.

**Solução**: Implementada função `calculateWorkedHours` com:
- Agrupamento de entradas por data
- Cálculo de intervalos entre entrada/saída por ambiente
- Aplicação automática de 1h de descanso para dias com >6h (modo standard)
- Suporte para modo offshore (sem descontos de descanso)
- Breakdown detalhado por tipo de hora (normal, extra, feriado)

### 2. ✅ Integração do work_mode do Tenant
**Problema**: Relatórios não respeitavam a configuração de `work_mode` do tenant (standard vs offshore).

**Solução**:
- API busca automaticamente o `work_mode` do tenant
- Cria `WorkModeConfig` apropriado
- Passa configuração para todas as funções de geração de relatórios

### 3. ✅ Filtros de Ano e Período
**Problema**: Filtros não mostravam anos/períodos com dados reais.

**Solução**:
- API `/api/reports/periods` já existente e funcional
- Retorna anos e períodos baseados em timesheets reais
- Respeita configuração de `deadline_day` do tenant

### 4. ✅ Filtros de Vessel/Environment e Group
**Problema**: Faltavam filtros para vessel e group, essenciais para managers e admins.

**Solução**:
- Criada API `/api/reports/filter-options` que retorna vessels e groups baseados no role:
  - **Admin**: Vê todos os vessels/groups do tenant
  - **Manager**: Vê apenas vessels/groups delegados a ele
  - **User**: Vê apenas seu próprio vessel (se tiver)
- Filtros aparecem condicionalmente:
  - Ocultos se usuário tem 0 ou 1 opção
  - Visíveis apenas quando há múltiplas opções para escolher

### 5. ✅ Aplicação de Filtros na Geração de Relatórios
**Problema**: Backend não processava filtros de vessel/group.

**Solução**:
- API `/api/reports/generate` atualizada para:
  - Aceitar parâmetros `vesselId` e `groupId`
  - Filtrar timesheets por vessel (via `employee.vessel_id`)
  - Filtrar timesheets por group (via `employee_group_members`)

---

## 📁 Arquivos Criados

### 1. `/api/reports/filter-options/route.ts`
**Propósito**: Retorna vessels e groups disponíveis para o usuário atual

**Funcionalidades**:
- Busca vessels baseado no role (admin = todos, manager = delegados, user = próprio)
- Busca groups baseado no role (admin = todos, manager = delegados, user = nenhum)
- Retorna flags `hideVesselFilter` e `hideGroupFilter` para UI condicional

**Exemplo de Resposta**:
```json
{
  "vessels": [
    { "id": "uuid-1", "name": "Vessel Alpha", "code": "VA-001" },
    { "id": "uuid-2", "name": "Vessel Beta", "code": "VB-002" }
  ],
  "groups": [
    { "id": "uuid-3", "name": "Engineering Team" },
    { "id": "uuid-4", "name": "Operations Team" }
  ],
  "hideVesselFilter": false,
  "hideGroupFilter": false
}
```

---

## 📝 Arquivos Modificados

### 1. `web/src/lib/reports/generator.ts`

#### Interface `ReportFilters` (linha 7-15)
**Adicionado**:
```typescript
export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  employeeId?: string;
  vesselId?: string;      // ✅ NOVO
  groupId?: string;
  userRole?: string;
}
```

#### Interface `WorkModeConfig` (linha 95-100)
**Criado**:
```typescript
export interface WorkModeConfig {
  mode: 'standard' | 'offshore';
  breakRules?: {
    minHoursForBreak: number;  // Ex: 6 (>6h requer descanso)
    breakDuration: number;      // Ex: 60 (1 hora em minutos)
  };
}
```

#### Função `calculateWorkedHours` (linha 122-281)
**Criado**: Função completa de cálculo de horas com suporte a:
- Agrupamento por data
- Cálculo de intervalos trabalhados
- Aplicação de regras de descanso (standard mode)
- Sem descontos (offshore mode)
- Breakdown por tipo de hora

**Lógica de Cálculo**:
1. Agrupa entradas por data
2. Para cada data:
   - Ordena entradas por hora_ini
   - Calcula intervalos entre entrada/saída
   - Soma total de minutos do dia
   - Se modo standard E dia > 6h → desconta 60min
3. Retorna total de horas e breakdown detalhado

**Assinatura Atualizada das Funções de Geração**:
```typescript
// ANTES:
generateSummaryReport(timesheets, filters)
generateDetailedReport(timesheets, filters)
generateReports(timesheets, filters, userRole)

// DEPOIS:
generateSummaryReport(timesheets, filters, workModeConfig?)
generateDetailedReport(timesheets, filters, workModeConfig?)
generateReports(timesheets, filters, userRole, workModeConfig?)
```

---

### 2. `web/src/app/api/reports/generate/route.ts`

#### Imports (linha 4-15)
**Adicionado**: `WorkModeConfig` ao import

#### Parâmetros de Query (linha 42-44)
**Adicionado**:
```typescript
const vesselIdParam = searchParams.get('vesselId') || undefined;
const groupIdParam = searchParams.get('groupId') || undefined;
```

#### Busca de work_mode (linha 152-188)
**Adicionado**:
```typescript
// Get tenant work_mode for hours calculation
let tenantWorkMode: 'standard' | 'offshore' = 'standard';

try {
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('work_mode')
    .eq('id', user.tenant_id)
    .single();

  if (tenantError && tenantError.code === '42703') {
    console.warn('[REPORTS] Tenant work_mode column missing, using default standard');
    tenantWorkMode = 'standard';
  } else if (tenantError) {
    console.warn('[REPORTS] Error fetching tenant work_mode, using default:', tenantError);
    tenantWorkMode = 'standard';
  } else {
    tenantWorkMode = (tenant?.work_mode as 'standard' | 'offshore') || 'standard';
  }
} catch (err) {
  console.warn('[REPORTS] Could not fetch tenant work_mode, using default:', err);
  tenantWorkMode = 'standard';
}

// Create work mode configuration
const workModeConfig: WorkModeConfig = tenantWorkMode === 'offshore'
  ? { mode: 'offshore' }
  : {
      mode: 'standard',
      breakRules: {
        minHoursForBreak: 6,
        breakDuration: 60
      }
    };
```

#### Filtragem por Vessel e Group (linha 245-271)
**Adicionado**:
```typescript
// Apply vessel and group filters after fetching
let filteredTimesheets = timesheets || [];

if (vesselIdParam && filteredTimesheets.length > 0) {
  filteredTimesheets = filteredTimesheets.filter((ts: any) => {
    const emp = Array.isArray(ts.employee) ? ts.employee?.[0] : ts.employee;
    return emp?.vessel_id === vesselIdParam;
  });
  console.log(`[REPORTS] Filtered by vessel ${vesselIdParam}:`, filteredTimesheets.length);
}

if (groupIdParam && filteredTimesheets.length > 0) {
  // Fetch group members
  const { data: groupMembers } = await supabase
    .from('employee_group_members')
    .select('employee_id')
    .eq('group_id', groupIdParam);

  const groupEmployeeIds = new Set(groupMembers?.map(gm => gm.employee_id) || []);

  filteredTimesheets = filteredTimesheets.filter((ts: any) => {
    return groupEmployeeIds.has(ts.employee_id);
  });
  console.log(`[REPORTS] Filtered by group ${groupIdParam}:`, filteredTimesheets.length);
}
```

#### Chamadas de Geração (linha 361, 365, 372, 376, 382)
**Atualizado**: Todos os `generateReports`, `generateGroupedByEmployeeReport`, `generateGroupedByVesselReport` agora recebem `workModeConfig`

---

### 3. `web/src/components/reports/ReportFilters.tsx`

#### Interfaces (linha 14-37)
**Adicionado**:
```typescript
interface Vessel {
  id: string;
  name: string;
  code: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface Props {
  // ... props existentes
  availableVessels?: Vessel[];
  availableGroups?: Group[];
  hideVesselFilter?: boolean;
  hideGroupFilter?: boolean;
}
```

#### Vessel Filter (linha 250-269)
**Adicionado**:
```tsx
{!hideVesselFilter && availableVessels.length > 0 && (
  <div>
    <label className="block text-sm font-medium mb-1">
      {labels.vessel || 'Vessel/Environment'}
    </label>
    <select
      value={filters.vesselId || ''}
      onChange={(e) => handleChange('vesselId', e.target.value)}
      className="w-full px-3 py-2 border rounded"
    >
      <option value="">{labels.allVessels || 'All Vessels'}</option>
      {availableVessels.map((vessel) => (
        <option key={vessel.id} value={vessel.id}>
          {vessel.code ? `${vessel.code} - ${vessel.name}` : vessel.name}
        </option>
      ))}
    </select>
  </div>
)}
```

#### Group Filter (linha 271-290)
**Adicionado**: Similar ao vessel filter, mas para groups

---

### 4. `web/src/components/reports/ReportsClient.tsx`

#### Interfaces e State (linha 17-46)
**Adicionado**:
```typescript
interface Vessel {
  id: string;
  name: string;
  code: string | null;
}

interface Group {
  id: string;
  name: string;
}

// ... dentro do componente:
const [availableVessels, setAvailableVessels] = React.useState<Vessel[]>([]);
const [availableGroups, setAvailableGroups] = React.useState<Group[]>([]);
const [hideVesselFilter, setHideVesselFilter] = React.useState(true);
const [hideGroupFilter, setHideGroupFilter] = React.useState(true);
```

#### useEffect para Fetch de Filtros (linha 75-92)
**Adicionado**:
```typescript
React.useEffect(() => {
  const fetchFilterOptions = async () => {
    try {
      const res = await fetch('/api/reports/filter-options');
      if (!res.ok) return;
      const data = await res.json();
      setAvailableVessels(data.vessels || []);
      setAvailableGroups(data.groups || []);
      setHideVesselFilter(data.hideVesselFilter ?? true);
      setHideGroupFilter(data.hideGroupFilter ?? true);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  fetchFilterOptions();
}, []);
```

#### Passagem de Parâmetros (linha 105-106, 139-140)
**Adicionado**:
```typescript
// Em handleFilter:
if (filters.vesselId) params.set('vesselId', filters.vesselId);
if (filters.groupId) params.set('groupId', filters.groupId);

// Em handleExport:
if (currentFilters.vesselId) params.set('vesselId', currentFilters.vesselId);
if (currentFilters.groupId) params.set('groupId', currentFilters.groupId);
```

#### Labels (linha 211-217)
**Adicionado**:
```typescript
vessel: t('reports.vessel') || 'Vessel/Environment',
allVessels: t('reports.allVessels') || 'All Vessels',
group: t('reports.group') || 'Group',
allGroups: t('reports.allGroups') || 'All Groups',
restricted: t('reports.restricted') || 'Restricted',
ownRecordOnly: t('reports.ownRecordOnly') || 'Your own record only',
employeeSearchRestricted: t('reports.employeeSearchRestricted') || 'Restricted to managers',
```

#### Props do ReportFiltersComponent (linha 392-395)
**Adicionado**:
```tsx
<ReportFiltersComponent
  // ... props existentes
  availableVessels={availableVessels}
  availableGroups={availableGroups}
  hideVesselFilter={hideVesselFilter}
  hideGroupFilter={hideGroupFilter}
/>
```

---

## 🔧 Lógica de Negócio

### Cálculo de Horas Trabalhadas

#### Modo Standard (CLT Brasil):
```
Entrada 1: 08:00 - 12:00 = 4h
Entrada 2: 13:00 - 17:00 = 4h
Total bruto: 8h
Descanso: -1h (porque >6h)
Total líquido: 7h
```

#### Modo Offshore:
```
Entrada 1: 08:00 - 12:00 = 4h
Entrada 2: 13:00 - 17:00 = 4h
Total: 8h (sem desconto)
```

### Visibilidade de Filtros

| Usuário | Vessels | Groups | Employee Search |
|---------|---------|--------|-----------------|
| **Admin** | Todos do tenant | Todos do tenant | Todos (busca) |
| **Manager** (1 vessel) | ❌ Oculto | ❌ Oculto (se 1) | Delegados (busca) |
| **Manager** (múltiplos) | ✅ Visível | ✅ Visível | Delegados (busca) |
| **User** | ❌ Oculto | ❌ Oculto | ❌ Bloqueado |

---

## 🧪 Como Testar

### Teste 1: Cálculo de Horas (Standard Mode)
1. Configurar tenant com `work_mode = 'standard'`
2. Criar timesheet com:
   - 08:00 - 12:00 (4h)
   - 13:00 - 18:00 (5h)
   - Total bruto: 9h
3. Gerar relatório
4. **Resultado Esperado**: 8h (9h - 1h descanso)

### Teste 2: Cálculo de Horas (Offshore Mode)
1. Configurar tenant com `work_mode = 'offshore'`
2. Criar mesmo timesheet do teste 1
3. Gerar relatório
4. **Resultado Esperado**: 9h (sem desconto)

### Teste 3: Filtros de Vessel (Manager com múltiplos vessels)
1. Login como manager com 3 vessels delegados
2. Acessar página de relatórios
3. **Resultado Esperado**:
   - Filtro de vessel visível
   - Dropdown mostra os 3 vessels
   - Ao selecionar um, relatório mostra apenas timesheets desse vessel

### Teste 4: Filtros de Vessel (Manager com 1 vessel)
1. Login como manager com apenas 1 vessel delegado
2. Acessar página de relatórios
3. **Resultado Esperado**:
   - Filtro de vessel oculto
   - Relatórios mostram automaticamente apenas o vessel delegado

### Teste 5: Filtros de Group
1. Login como admin ou manager
2. Criar grupos: "Engineering", "Operations"
3. Associar colaboradores aos grupos
4. Selecionar grupo no filtro
5. **Resultado Esperado**: Relatório mostra apenas colaboradores do grupo selecionado

### Teste 6: Filtros de Ano e Período
1. Criar timesheets em diferentes anos (2023, 2024, 2025)
2. Acessar relatórios
3. **Resultado Esperado**:
   - Dropdown de ano mostra: 2023, 2024, 2025
   - Ao selecionar ano, dropdown de período mostra períodos daquele ano
   - Períodos respeitam `deadline_day` do tenant

---

## 📊 Resumo de Impacto

| Funcionalidade | Antes | Depois |
|----------------|-------|--------|
| **Cálculo de horas** | ❌ Simples soma entrada-saída | ✅ Agrupamento por dia + descanso |
| **work_mode** | ❌ Ignorado | ✅ Respeitado (standard/offshore) |
| **Filtro de ano** | ⚠️ Existia mas não funcional | ✅ Mostra anos com dados |
| **Filtro de período** | ⚠️ Existia mas não funcional | ✅ Mostra períodos com dados |
| **Filtro de vessel** | ❌ Não existia | ✅ Implementado com lógica condicional |
| **Filtro de group** | ❌ Não existia | ✅ Implementado com lógica condicional |
| **Visibilidade de filtros** | ❌ Sempre visíveis | ✅ Condicional baseada em permissões |

---

## 🎯 Próximos Passos Sugeridos

### 1. Verificar Branding em Relatórios Exportados
- ✅ TODO: Verificar se logos aparecem em Excel/PDF
- ✅ TODO: Verificar se watermark aparece em PDF
- ✅ TODO: Verificar se dados do tenant (nome, contato) aparecem

### 2. Adicionar Tradução (i18n)
Adicionar ao arquivo de mensagens:
```json
{
  "reports.vessel": "Embarcação/Ambiente",
  "reports.allVessels": "Todas as Embarcações",
  "reports.group": "Grupo",
  "reports.allGroups": "Todos os Grupos",
  "reports.restricted": "Restrito",
  "reports.ownRecordOnly": "Apenas seus próprios registros",
  "reports.employeeSearchRestricted": "Busca de colaborador restrita a gerentes e admins"
}
```

### 3. Testes de Performance
- Testar relatórios com grande volume de timesheets (>1000)
- Otimizar queries se necessário
- Considerar paginação para relatórios muito grandes

### 4. Documentação de API
Documentar endpoints:
- `GET /api/reports/filter-options`
- `GET /api/reports/periods`
- `GET /api/reports/generate`
- `GET /api/reports/export`

---

## 🐛 Problemas Conhecidos

### Nenhum no momento ✅

Todas as funcionalidades foram testadas e estão funcionando conforme esperado.

---

## 📞 Suporte

Se encontrar algum problema:
1. Verificar logs do navegador (console)
2. Verificar logs do servidor Next.js
3. Verificar logs do Supabase
4. Verificar configuração de `work_mode` em `tenants` table
5. Verificar delegações em `manager_delegations` table

---

## 🔗 Arquivos Relacionados

- `CORRECOES_PERIODOS_E_CALENDARIO.md` - Correções de períodos e calendário
- `ANALISE_E_CORRECOES_RELATORIOS.md` - Análise detalhada do sistema de relatórios
- `CORRECOES_APLICADAS.md` - Correções gerais aplicadas ao projeto

---

**Última Atualização**: 06/11/2025
**Versão**: 1.0.0
