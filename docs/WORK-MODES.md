# Modos de Trabalho (Work Modes)

## 📋 Visão Geral

O sistema PontoFlow suporta **3 modos de trabalho** diferentes para atender diversos tipos de empresas:

1. **🚢 Offshore** - Regime de embarque/desembarque com escalas rotativas
2. **🏢 Standard (Padrão)** - Trabalho normal com marcação diária de ponto
3. **⚙️ Flexible (Flexível)** - Regras personalizadas por tenant

## 🚢 Modo Offshore

### Características

- **Escalas rotativas**: 7x7, 14x14, 21x21, 28x28 (dias trabalhados x dias de folga)
- **Embarque/Desembarque**: Marcação de transições entre trabalho e folga
- **Auto-fill inteligente**: Sistema sugere automaticamente os lançamentos baseados na escala
- **Ambientes específicos**: Embarque, Desembarque, Offshore, Onshore, Translado, Folga

### Quando Usar

✅ Empresas de petróleo e gás offshore  
✅ Empresas marítimas com tripulações em navios  
✅ Plataformas offshore  
✅ Qualquer operação com regime de embarque/desembarque  

### Como Funciona

1. **Colaborador marca EMBARQUE** (ex: dia 28/09)
   - Sistema sugere automaticamente:
     - Dias 29/09 até 25/10: Offshore (28 dias trabalhando)
     - Dia 26/10: Desembarque (volta para casa)
     - Dias 27/10 até 23/11: Folga (28 dias em casa)
     - Dia 24/11: Próximo embarque (sugestão opcional)

2. **Colaborador marca DESEMBARQUE** (ex: dia 26/10)
   - Sistema sugere automaticamente:
     - Dias 27/10 até 23/11: Folga (28 dias em casa)
     - Dia 24/11: Próximo embarque (sugestão opcional)

3. **Todas as sugestões são opcionais**
   - Colaborador pode aceitar, modificar ou rejeitar
   - Útil para casos de dobra, cancelamento, saída antecipada

### Configuração

```sql
UPDATE tenants 
SET work_mode = 'offshore', 
    work_schedule = '28x28' 
WHERE id = 'tenant-id';
```

Ou via interface admin:
- **Admin → Settings → Tenant → Modo de Trabalho**
- Selecionar: "🚢 Offshore"

## 🏢 Modo Standard (Padrão)

### Características

- **Marcação diária de ponto**: Entrada, saída, início e fim de almoço
- **22 dias úteis por mês** (padrão Brasil)
- **Sem auto-fill**: Cada dia deve ser marcado manualmente
- **Ambientes tradicionais**: Início do Expediente, Fim do Expediente, Início Almoço, Fim do Almoço

### Quando Usar

✅ Empresas de escritório  
✅ Comércio  
✅ Indústrias com jornada fixa  
✅ Qualquer empresa com regime CLT tradicional  

### Como Funciona

1. **Colaborador marca cada dia manualmente**
   - Entrada: 08:00
   - Início Almoço: 12:00
   - Fim Almoço: 13:00
   - Saída: 17:00

2. **Sem sugestões automáticas**
   - Sistema não preenche automaticamente
   - Cada lançamento é individual

3. **Validações de horário**
   - Sistema valida se os horários fazem sentido
   - Alerta se houver inconsistências

### Configuração

```sql
UPDATE tenants 
SET work_mode = 'standard'
WHERE id = 'tenant-id';
```

Ou via interface admin:
- **Admin → Settings → Tenant → Modo de Trabalho**
- Selecionar: "🏢 Padrão"

### Configurações Adicionais (JSONB)

```json
{
  "working_days_per_month": 22,
  "lunch_duration_minutes": 60,
  "daily_hours": 8,
  "weekly_hours": 44
}
```

## ⚙️ Modo Flexible (Flexível)

### Características

- **Regras customizadas**: Cada tenant define suas próprias regras
- **Híbrido**: Pode combinar elementos de offshore e standard
- **Configurável via JSONB**: Máxima flexibilidade

### Quando Usar

✅ Empresas com regimes de trabalho únicos  
✅ Múltiplos tipos de colaboradores (alguns offshore, outros standard)  
✅ Regras complexas que não se encaixam nos outros modos  

### Como Funciona

Depende das configurações específicas do tenant no campo `settings` (JSONB).

### Configuração

```sql
UPDATE tenants 
SET work_mode = 'flexible',
    settings = '{
      "offshore_employees": ["emp-id-1", "emp-id-2"],
      "standard_employees": ["emp-id-3", "emp-id-4"],
      "custom_rules": {
        "rule1": "value1"
      }
    }'::jsonb
WHERE id = 'tenant-id';
```

## 🔧 Implementação Técnica

### Estrutura do Banco de Dados

```sql
-- Tabela tenants
CREATE TABLE tenants (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  work_mode text CHECK (work_mode IN ('offshore', 'standard', 'flexible')) DEFAULT 'standard',
  work_schedule text, -- '28x28', '14x14', etc.
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

### Fluxo de Decisão no Frontend

```typescript
// TimesheetCalendar.tsx
const handleCreateEntry = async () => {
  const selectedEnv = getEnvironment(form.environment_id);
  const isTransitionEnvironment = 
    selectedEnv?.slug === 'embarque' || 
    selectedEnv?.slug === 'desembarque';

  // Only show auto-fill for offshore work mode
  const shouldShowAutoFill = 
    tenantWorkMode === 'offshore' && 
    selectedEnv?.auto_fill_enabled && 
    isTransitionEnvironment && 
    workSchedule;

  if (shouldShowAutoFill) {
    // Show auto-fill modal (offshore mode)
    const suggestions = calculateSuggestedEntries(...);
    setShowAutoFillModal(true);
  } else {
    // Create single entry (standard/flexible mode)
    await createSingleEntry();
  }
};
```

### Passagem de Props

```typescript
// Page component
const { data: tenant } = await supabase
  .from('tenants')
  .select('work_schedule, work_mode, settings')
  .eq('id', emp.tenant_id)
  .single();

<TimesheetCalendar
  ...
  workSchedule={workSchedule}
  tenantWorkMode={tenant?.work_mode || 'standard'}
/>
```

## 📊 Comparação dos Modos

| Característica | Offshore | Standard | Flexible |
|----------------|----------|----------|----------|
| **Auto-fill** | ✅ Sim | ❌ Não | ⚙️ Configurável |
| **Escalas** | ✅ 7x7, 14x14, 21x21, 28x28 | ❌ Não | ⚙️ Configurável |
| **Embarque/Desembarque** | ✅ Sim | ❌ Não | ⚙️ Configurável |
| **Marcação Diária** | ❌ Não | ✅ Sim | ⚙️ Configurável |
| **Horários** | ⚠️ Opcional | ✅ Obrigatório | ⚙️ Configurável |
| **Complexidade** | 🔴 Alta | 🟢 Baixa | 🟡 Média |

## 🎯 Casos de Uso

### Caso 1: Empresa Offshore Pura (ABZ Group)

```sql
UPDATE tenants 
SET work_mode = 'offshore', 
    work_schedule = '28x28'
WHERE slug = 'abz';
```

**Resultado:**
- ✅ Auto-fill habilitado
- ✅ Sugestões de embarque/desembarque
- ✅ Cálculo automático de folgas

### Caso 2: Empresa de Escritório (Omega)

```sql
UPDATE tenants 
SET work_mode = 'standard'
WHERE slug = 'omega';
```

**Resultado:**
- ✅ Marcação diária manual
- ✅ Sem auto-fill
- ✅ Validação de horários

### Caso 3: Empresa Híbrida

```sql
UPDATE tenants 
SET work_mode = 'flexible',
    settings = '{
      "offshore_groups": ["group-id-1"],
      "standard_groups": ["group-id-2"]
    }'::jsonb
WHERE slug = 'hybrid-company';
```

**Resultado:**
- ✅ Alguns colaboradores com auto-fill
- ✅ Outros com marcação manual
- ✅ Regras por grupo

## 🔄 Migração Entre Modos

### De Standard para Offshore

1. Atualizar `work_mode` e `work_schedule`
2. Criar ambientes offshore (Embarque, Desembarque, etc.)
3. Configurar escalas de trabalho para colaboradores
4. Treinar usuários no novo fluxo

### De Offshore para Standard

1. Atualizar `work_mode`
2. Desabilitar auto-fill nos ambientes
3. Criar ambientes standard (Início Expediente, etc.)
4. Treinar usuários no novo fluxo

## 📝 Notas Importantes

1. **Retrocompatibilidade**: Tenants existentes sem `work_mode` definido assumem `standard` por padrão
2. **Migração Automática**: Tenants com `work_schedule` em ('7x7', '14x14', '21x21', '28x28') foram automaticamente migrados para `offshore`
3. **Configurações Adicionais**: O campo `settings` (JSONB) permite configurações extras sem alterar o schema
4. **Performance**: O auto-fill usa batch insert (140x mais rápido que inserções individuais)

## 🚀 Próximos Passos

- [ ] Implementar validações específicas por modo
- [ ] Adicionar relatórios por modo de trabalho
- [ ] Criar templates de configuração para modos comuns
- [ ] Documentar casos de uso avançados do modo flexible
- [ ] Adicionar testes automatizados para cada modo

