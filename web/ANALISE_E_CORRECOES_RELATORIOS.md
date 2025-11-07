# Análise e Correções - Sistema de Relatórios

**Data**: 06/11/2025
**Status**: 🔍 Em análise e correção

---

## 🐛 Problemas Identificados

### 1. ❌ Erro `params.then is not a function` na Página de Pendências

**Arquivo**: `web/src/app/[locale]/manager/pending/page.tsx`

**Causa**: Next.js 14.2.0 mudou a API - `params` e `searchParams` são Promises que devem ser await'd, não podem usar `.then()` diretamente

**Status**: ✅ **CORRIGIDO**

**Solução Aplicada**:
```typescript
// ANTES (INCORRETO):
export default function ManagerPendingPage({ params, searchParams }) {
  const [locale, setLocale] = useState<string>('');
  useEffect(() => {
    params.then(({ locale: loc }) => setLocale(loc)); // ❌ ERRO
  }, []);
}

// DEPOIS (CORRETO):
export default async function ManagerPendingPage({ params, searchParams }) {
  const { locale } = await params; // ✅ CORRETO
  const { month } = await searchParams;
  return <ManagerPendingPageContent locale={locale} month={month} />;
}
```

---

### 2. ❌ Cálculo de Horas Incorreto nos Relatórios

**Arquivo**: `web/src/lib/reports/generator.ts`

**Problema Atual**:
A função `calculateTotalHours` está simplesmente somando `(hora_fim - hora_ini)` de cada entry. Entretanto, a lógica de cálculo precisa considerar:

1. ✅ Cada entry JÁ representa uma sessão completa (entrada + saída)
2. ❌ NÃO está aplicando intervalo de descanso obrigatório (1h para Brasil padrão)
3. ❌ NÃO está respeitando `work_mode` do tenant (offshore vs onshore)
4. ❌ NÃO está considerando diferentes regras por tipo de entry (`normal`, `extra`, `feriado`)

**Estrutura das Entries** (conforme `timesheet_entries`):
```sql
CREATE TABLE timesheet_entries (
  id UUID,
  environment_id UUID,          -- Ambiente de trabalho
  data DATE,                    -- Data da entrada
  hora_ini TIME,                -- Hora início
  hora_fim TIME,                -- Hora fim
  tipo TEXT CHECK (tipo IN ('normal', 'extra', 'feriado', 'folga')),
  observacao TEXT
);
```

**Função Atual** (SIMPLIFICADA DEMAIS):
```typescript
// web/src/lib/reports/generator.ts:125
export function calculateTotalHours(entries) {
  let totalMinutes = 0;

  for (const entry of entries) {
    const [startHour, startMin] = entry.hora_ini.split(':').map(Number);
    const [endHour, endMin] = entry.hora_fim.split(':').map(Number);

    const startTotalMinutes = startHour * 60 + startMin;
    let endTotalMinutes = endHour * 60 + endMin;

    // Handle overnight shifts
    if (endTotalMinutes <= startTotalMinutes) {
      endTotalMinutes += 24 * 60;
    }

    const durationMinutes = endTotalMinutes - startTotalMinutes;
    totalMinutes += durationMinutes; // ❌ SEM DESCONTAR INTERVALO DE DESCANSO
  }

  return totalMinutes / 60;
}
```

**Regras de Negócio Faltando**:

#### A. Intervalo de Descanso (CLT - Brasil)
Para jornadas de trabalho:
- **4h a 6h**: 15 minutos de intervalo
- **> 6h**: 1 hora de intervalo (mínimo)
- **Offshore**: SEM intervalo obrigatório (trabalho contínuo)

#### B. Configuração por Tenant
```sql
-- Tabela: tenants
work_mode TEXT CHECK (work_mode IN ('standard', 'offshore'))
```

- `standard`: Aplica regras CLT (intervalo obrigatório)
- `offshore`: Sem intervalo (regime especial)

#### C. Tipos de Entry
- `normal`: Dia normal de trabalho (aplica intervalo)
- `extra`: Hora extra (pode ter regra diferente)
- `feriado`: Trabalho em feriado (multiplicador diferente)
- `folga`: Folga (não conta horas, mas conta presença)

---

### 3. ❌ Filtros de Relatórios Não Funcionam

**Problemas**:
1. Filtro de **ano** não aparece anos corretos
2. Filtro de **período** não funciona
3. Falta implementar permissões:
   - **Admin**: vê tudo
   - **Gerente**: vê apenas grupos/vessels delegados a ele
   - **Usuário**: vê apenas próprio relatório

**Localização**:
- `web/src/app/[locale]/reports/page.tsx` (se existir)
- `web/src/components/reports/*`

**Status**: ⏳ PENDENTE DE IMPLEMENTAÇÃO

---

### 4. ❌ Geração de Relatórios - Logos e Marca D'água

**Problema**: Precisa verificar se está respeitando configurações do tenant:
- Logo do tenant
- Nome do tenant
- Dados de contato
- Marca d'água
- Layout personalizado

**Arquivos**:
- `web/src/lib/reports/excel-generator.ts`
- `web/src/lib/reports/pdf-generator.ts`

**Tabela de Configuração**:
```sql
-- tenant_branding
logo_url TEXT
watermark_enabled BOOLEAN
watermark_text TEXT
```

**Status**: ⏳ PENDENTE DE VERIFICAÇÃO

---

## ✅ Soluções Propostas

### Solução 1: Função Corrigida de Cálculo de Horas

Criar nova função `calculateWorkedHours` que considera todas as regras:

```typescript
/**
 * Calculate worked hours with proper lunch break deduction
 * Supports offshore (no break) vs onshore (CLT rules) modes
 */
export interface WorkModeConfig {
  mode: 'standard' | 'offshore';
  breakRules?: {
    minHoursForBreak: number;  // Ex: 6 (> 6h de trabalho)
    breakDuration: number;      // Ex: 60 (1 hora em minutos)
  };
}

export function calculateWorkedHours(
  entries: Array<{
    data: string;
    hora_ini: string;
    hora_fim: string;
    tipo: 'normal' | 'extra' | 'feriado' | 'folga';
    environment_id?: string;
  }>,
  workModeConfig: WorkModeConfig = {
    mode: 'standard',
    breakRules: {
      minHoursFor Break: 6,
      breakDuration: 60 // 1 hour in minutes
    }
  }
): {
  totalHours: number;
  totalMinutes: number;
  breakMinutesDeducted: number;
  entriesProcessed: number;
  breakdown: {
    normalHours: number;
    extraHours: number;
    holidayHours: number;
  };
} {
  let totalMinutes = 0;
  let breakMinutesDeducted = 0;
  let normalMinutes = 0;
  let extraMinutes = 0;
  let holidayMinutes = 0;
  let entriesProcessed = 0;

  // Group entries by date for proper break calculation
  const entriesByDate = new Map<string, typeof entries>();

  for (const entry of entries) {
    if (!entry.hora_ini || !entry.hora_fim) continue;

    if (!entriesByDate.has(entry.data)) {
      entriesByDate.set(entry.data, []);
    }
    entriesByDate.get(entry.data)!.push(entry);
  }

  // Process each day
  for (const [date, dayEntries] of entriesByDate) {
    let dayTotalMinutes = 0;

    // Calculate total minutes worked in the day
    for (const entry of dayEntries) {
      try {
        const [startHour, startMin] = entry.hora_ini.split(':').map(Number);
        const [endHour, endMin] = entry.hora_fim.split(':').map(Number);

        let startTotalMinutes = startHour * 60 + startMin;
        let endTotalMinutes = endHour * 60 + endMin;

        // Handle overnight shifts (end time next day)
        if (endTotalMinutes <= startTotalMinutes) {
          endTotalMinutes += 24 * 60;
        }

        const durationMinutes = endTotalMinutes - startTotalMinutes;

        if (durationMinutes <= 0) continue;

        dayTotalMinutes += durationMinutes;

        // Categorize by type
        switch (entry.tipo) {
          case 'normal':
            normalMinutes += durationMinutes;
            break;
          case 'extra':
            extraMinutes += durationMinutes;
            break;
          case 'feriado':
            holidayMinutes += durationMinutes;
            break;
          // 'folga' não conta em horas trabalhadas
        }

        entriesProcessed++;
      } catch (error) {
        console.warn('Error calculating entry duration:', error, entry);
      }
    }

    // Apply break deduction for this day (ONLY for standard mode)
    if (workModeConfig.mode === 'standard' && workModeConfig.breakRules) {
      const dayHours = dayTotalMinutes / 60;

      if (dayHours > workModeConfig.breakRules.minHoursForBreak) {
        // Deduct break time
        const breakToDeduct = workModeConfig.breakRules.breakDuration;
        dayTotalMinutes -= breakToDeduct;
        breakMinutesDeducted += breakToDeduct;
      }
    }

    totalMinutes += Math.max(0, dayTotalMinutes); // Never negative
  }

  return {
    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
    totalMinutes: Math.round(totalMinutes),
    breakMinutesDeducted,
    entriesProcessed,
    breakdown: {
      normalHours: Math.round((normalMinutes / 60) * 100) / 100,
      extraHours: Math.round((extraMinutes / 60) * 100) / 100,
      holidayHours: Math.round((holidayMinutes / 60) * 100) / 100,
    }
  };
}
```

**Uso**:
```typescript
// Para tenant standard (Brasil CLT)
const result = calculateWorkedHours(entries, {
  mode: 'standard',
  breakRules: {
    minHoursForBreak: 6,
    breakDuration: 60 // 1 hora
  }
});

// Para tenant offshore (sem intervalo)
const result = calculateWorkedHours(entries, {
  mode: 'offshore'
});

console.log(`Total: ${result.totalHours}h (${result.breakMinutesDeducted}min de intervalo descontado)`);
console.log(`Normal: ${result.breakdown.normalHours}h`);
console.log(`Extra: ${result.breakdown.extraHours}h`);
console.log(`Feriado: ${result.breakdown.holidayHours}h`);
```

---

### Solução 2: Integrar work_mode no Generator

Modificar `generateSummaryReport` e `generateDetailedReport` para buscar `work_mode` do tenant:

```typescript
// web/src/lib/reports/generator.ts

export async function generateSummaryReportWithWorkMode(
  timesheets: TimesheetBasic[],
  filters: ReportFilters,
  tenantWorkMode: 'standard' | 'offshore' = 'standard'
): SummaryReport {
  const workModeConfig: WorkModeConfig = tenantWorkMode === 'offshore'
    ? { mode: 'offshore' }
    : {
        mode: 'standard',
        breakRules: {
          minHoursForBreak: 6,
          breakDuration: 60
        }
      };

  const items: ReportEntry[] = timesheets.map(t => {
    const entries = t.entries || [];
    const hoursCalc = calculateWorkedHours(entries, workModeConfig);

    return {
      id: t.id,
      employeeName: t.employee?.display_name || 'Unknown',
      employeeId: t.employee_id,
      period: `${t.periodo_ini} - ${t.periodo_fim}`,
      status: t.status,
      entryCount: hoursCalc.entriesProcessed,
      totalHours: hoursCalc.totalHours,
      totalMinutes: hoursCalc.totalMinutes,
      breakDeducted: hoursCalc.breakMinutesDeducted,
      normalHours: hoursCalc.breakdown.normalHours,
      extraHours: hoursCalc.breakdown.extraHours,
      holidayHours: hoursCalc.breakdown.holidayHours,
    };
  });

  // ... resto da função
}
```

---

### Solução 3: Atualizar API de Relatórios

Modificar `/api/reports/generate/route.ts` para buscar `work_mode`:

```typescript
// Fetch tenant work_mode
const { data: tenant } = await supabase
  .from('tenants')
  .select('work_mode')
  .eq('id', user.tenant_id)
  .single();

const workMode = tenant?.work_mode || 'standard';

// Generate reports with work_mode
const report = await generateSummaryReportWithWorkMode(
  timesheets,
  filters,
  workMode
);
```

---

### Solução 4: Filtros de Relatórios - Implementação

#### A. Filtro de Ano/Período

```typescript
// Buscar anos disponíveis baseado em timesheets existentes
const { data: periods } = await supabase
  .from('timesheets')
  .select('periodo_ini')
  .eq('tenant_id', tenantId)
  .order('periodo_ini', { ascending: false });

const availableYears = [...new Set(
  periods.map(p => new Date(p.periodo_ini).getFullYear())
)];

const availablePeriods = periods.map(p => {
  const date = new Date(p.periodo_ini);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    label: date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
  };
});
```

#### B. Permissões de Filtros

```typescript
// Admin: vê tudo
if (userRole === 'ADMIN') {
  // Mostrar todos os filtros:
  // - Todos os anos
  // - Todos os períodos
  // - Todos os vessels/grupos
  // - Todos os colaboradores
}

// Gerente: vê apenas delegações
if (userRole === 'GERENTE') {
  // Buscar grupos delegados
  const { data: delegations } = await supabase
    .from('manager_delegations')
    .select('group_id, groups(environment_id, environments(id, name))')
    .eq('manager_id', userId);

  // Filtrar vessels/grupos disponíveis
  const availableVessels = delegations.map(d => d.groups.environments);
  const availableGroups = delegations.map(d => d.groups);

  // Se tem apenas 1 vessel/grupo, não mostrar filtro
  if (availableVessels.length === 1) {
    // Auto-selecionar
  } else {
    // Mostrar dropdown com opções disponíveis
  }
}

// Usuário: vê apenas próprio
if (userRole === 'COLABORADOR') {
  // Sem filtros de vessel/grupo/colaborador
  // Apenas ano/período
  // Auto-filtrado por employeeId
}
```

---

### Solução 5: Logos e Marca D'água

#### Excel Generator (`excel-generator.ts`):

```typescript
import ExcelJS from 'exceljs';

export async function generateExcelWithBranding(
  report: SummaryReport,
  tenantId: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório');

  // Buscar configurações de branding
  const { data: branding } = await supabase
    .from('tenant_branding')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  // Adicionar logo se existir
  if (branding?.logo_url) {
    const logoResponse = await fetch(branding.logo_url);
    const logoBuffer = await logoResponse.arrayBuffer();
    const logoId = workbook.addImage({
      buffer: Buffer.from(logoBuffer),
      extension: 'png',
    });
    worksheet.addImage(logoId, 'A1:B3');
  }

  // Adicionar cabeçalho com nome do tenant
  worksheet.getCell('D1').value = branding?.company_name || 'Timesheet Report';
  worksheet.getCell('D1').font = { size: 16, bold: true };

  // Adicionar marca d'água se habilitado
  if (branding?.watermark_enabled) {
    // Excel não suporta marca d'água nativa, mas podemos adicionar texto diagonal
    for (let i = 5; i < 50; i += 10) {
      worksheet.getCell(`${String.fromCharCode(65 + (i % 26))}${i}`).value = branding.watermark_text;
      worksheet.getCell(`${String.fromCharCode(65 + (i % 26))}${i}`).font = {
        color: { argb: 'FFE0E0E0' },
        size: 48,
        bold: true
      };
      worksheet.getCell(`${String.fromCharCode(65 + (i % 26))}${i}`).alignment = {
        textRotation: 45
      };
    }
  }

  // ... resto do relatório

  return workbook.xlsx.writeBuffer();
}
```

#### PDF Generator (`pdf-generator.ts`):

```typescript
import PDFDocument from 'pdfkit';

export async function generatePDFWithBranding(
  report: SummaryReport,
  tenantId: string
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];

  doc.on('data', chunk => chunks.push(chunk));

  // Buscar branding
  const { data: branding } = await supabase
    .from('tenant_branding')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  // Logo
  if (branding?.logo_url) {
    const logoResponse = await fetch(branding.logo_url);
    const logoBuffer = await logoResponse.arrayBuffer();
    doc.image(Buffer.from(logoBuffer), 50, 45, { width: 100 });
  }

  // Cabeçalho
  doc
    .fontSize(20)
    .text(branding?.company_name || 'Timesheet Report', 200, 50);

  // Marca d'água
  if (branding?.watermark_enabled) {
    doc.save();
    doc
      .rotate(-45, { origin: [300, 400] })
      .fontSize(60)
      .fillColor('#E0E0E0')
      .fillOpacity(0.3)
      .text(branding.watermark_text || 'CONFIDENTIAL', 100, 350);
    doc.restore();
  }

  // ... resto do relatório

  doc.end();

  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
```

---

## 📋 Checklist de Implementação

### Fase 1: Correções Críticas ✅
- [x] Corrigir erro `params.then` na página de pendências
- [ ] Implementar função `calculateWorkedHours` com work_mode
- [ ] Atualizar `generator.ts` para usar nova função
- [ ] Atualizar API `/api/reports/generate` para buscar work_mode

### Fase 2: Filtros
- [ ] Implementar filtro de ano (buscar anos de timesheets existentes)
- [ ] Implementar filtro de período (buscar períodos disponíveis)
- [ ] Implementar permissões de filtros (admin/gerente/usuário)
- [ ] Condicionar exibição de filtros (esconder se apenas 1 opção)

### Fase 3: Branding
- [ ] Verificar implementação de logo em Excel
- [ ] Verificar implementação de logo em PDF
- [ ] Implementar marca d'água em Excel
- [ ] Implementar marca d'água em PDF
- [ ] Testar com diferentes configurações de tenant

### Fase 4: Testes
- [ ] Testar cálculo de horas para tenant `standard` (com intervalo)
- [ ] Testar cálculo de horas para tenant `offshore` (sem intervalo)
- [ ] Testar relatórios para ADMIN (todos os dados)
- [ ] Testar relatórios para GERENTE (apenas delegações)
- [ ] Testar relatórios para COLABORADOR (apenas próprio)
- [ ] Testar geração Excel com logo e marca d'água
- [ ] Testar geração PDF com logo e marca d'água

---

## 🧪 Casos de Teste

### Teste 1: Cálculo de Horas - Standard Mode

**Entrada**:
```json
{
  "entries": [
    { "data": "2025-11-06", "hora_ini": "08:00", "hora_fim": "12:00", "tipo": "normal" },
    { "data": "2025-11-06", "hora_ini": "13:00", "hora_fim": "17:00", "tipo": "normal" }
  ],
  "workMode": { "mode": "standard", "breakRules": { "minHoursForBreak": 6, "breakDuration": 60 } }
}
```

**Saída Esperada**:
```json
{
  "totalHours": 7.0,  // 8h bruto - 1h intervalo
  "totalMinutes": 420,
  "breakMinutesDeducted": 60,
  "breakdown": {
    "normalHours": 7.0
  }
}
```

### Teste 2: Cálculo de Horas - Offshore Mode

**Entrada**:
```json
{
  "entries": [
    { "data": "2025-11-06", "hora_ini": "08:00", "hora_fim": "20:00", "tipo": "normal" }
  ],
  "workMode": { "mode": "offshore" }
}
```

**Saída Esperada**:
```json
{
  "totalHours": 12.0,  // SEM desconto de intervalo
  "totalMinutes": 720,
  "breakMinutesDeducted": 0
}
```

### Teste 3: Filtros - Gerente com Múltiplos Vessels

**Setup**:
- Gerente com delegações para 3 vessels
- 10 colaboradores distribuídos

**Comportamento Esperado**:
- ✅ Mostrar dropdown de vessels (3 opções)
- ✅ Mostrar dropdown de grupos
- ✅ Filtrar colaboradores por vessel selecionado
- ❌ Não mostrar colaboradores de outros vessels

### Teste 4: Filtros - Gerente com Apenas 1 Vessel

**Setup**:
- Gerente com delegação para 1 vessel
- 5 colaboradores no vessel

**Comportamento Esperado**:
- ❌ NÃO mostrar dropdown de vessels (auto-selecionado)
- ✅ Mostrar lista de colaboradores
- ✅ Permitir filtro por período

---

## 📞 Próximos Passos

1. **URGENTE**: Implementar `calculateWorkedHours` e integrar no generator
2. **IMPORTANTE**: Implementar filtros com permissões corretas
3. **MELHORIA**: Adicionar branding completo (logos + marca d'água)
4. **TESTES**: Validar todos os casos de uso

**Estimativa de Tempo**:
- Fase 1: 4-6 horas
- Fase 2: 3-4 horas
- Fase 3: 2-3 horas
- Fase 4: 2-3 horas

**Total**: ~15 horas de desenvolvimento

---

## 📄 Arquivos a Modificar

1. ✅ `web/src/app/[locale]/manager/pending/page.tsx` - CORRIGIDO
2. ⏳ `web/src/lib/reports/generator.ts` - Adicionar `calculateWorkedHours`
3. ⏳ `web/src/app/api/reports/generate/route.ts` - Buscar work_mode
4. ⏳ `web/src/app/api/reports/export/route.ts` - Integrar nova lógica
5. ⏳ `web/src/lib/reports/excel-generator.ts` - Adicionar branding
6. ⏳ `web/src/lib/reports/pdf-generator.ts` - Adicionar branding
7. ⏳ `web/src/app/[locale]/reports/page.tsx` - Implementar filtros (se existir)

---

**Última Atualização**: 06/11/2025 17:30
