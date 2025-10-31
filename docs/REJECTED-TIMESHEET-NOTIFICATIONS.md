# Sistema de Notificações para Timesheets Rejeitados

## 📋 Visão Geral

Implementação completa de um sistema de notificações para alertar colaboradores quando seus timesheets forem rejeitados, permitindo correção e reenvio dentro do prazo.

---

## ✅ Funcionalidades Implementadas

### 1. **Alertas Visuais no Dashboard**

**Arquivo:** `web/src/app/api/notifications/alerts/route.ts`

**Comportamento:**
- ✅ Detecta timesheets rejeitados automaticamente
- ✅ Verifica se o prazo de reenvio ainda está válido
- ✅ Mostra o motivo da rejeição
- ✅ Calcula a data limite baseada no `deadline_day` do tenant
- ✅ Diferencia alertas dentro do prazo vs. prazo expirado

**Lógica de Prazo:**
```typescript
// Prazo = Último dia do período + deadline_day do mês seguinte
const periodEnd = new Date(ts.periodo_fim);
const deadlineDate = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, deadlineDay);
const isWithinDeadline = now <= deadlineDate;
```

**Tipos de Alerta:**
1. **Dentro do prazo** (warning):
   - Mensagem: "⚠️ Sua folha de ponto de {month} foi RECUSADA e precisa ser corrigida até {deadline}. Motivo: {reason}"
   - Ação: "Corrigir agora"
   - Link: `/employee/timesheets?m={month}`

2. **Prazo expirado** (warning):
   - Mensagem: "❌ Sua folha de ponto de {month} foi RECUSADA (prazo expirado em {deadline}). Motivo: {reason}"
   - Ação: "Visualizar"
   - Link: `/employee/timesheets?m={month}`

---

### 2. **Banner de Alerta no Timesheet**

**Arquivo:** `web/src/components/employee/TimesheetCalendar.tsx`

**Implementação:**
- ✅ Banner vermelho destacado quando `status === 'rejected'`
- ✅ Ícone de alerta visual
- ✅ Mensagem clara sobre a rejeição
- ✅ Orientação para verificar detalhes no dashboard

**Código:**
```tsx
{status === 'rejected' && (
  <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 rounded-lg text-xs sm:text-sm border-2 border-red-300 dark:border-red-700 animate-scale-in">
    <div className="flex items-start gap-2">
      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div className="flex-1">
        <p className="font-bold mb-1">❌ TIMESHEET RECUSADO</p>
        <p className="text-xs opacity-90">
          Seu timesheet foi recusado pelo gestor. Por favor, corrija os problemas apontados e reenvie.
          Verifique os alertas no dashboard para mais detalhes sobre o motivo da recusa.
        </p>
      </div>
    </div>
  </div>
)}
```

---

### 3. **Permissão de Edição para Timesheets Rejeitados**

**Arquivo:** `web/src/components/employee/TimesheetCalendar.tsx`

**Mudança:**
```typescript
// ANTES:
const canEditTimesheet = status === 'draft' || isAfterDeadline();

// DEPOIS:
const canEditTimesheet = status === 'draft' || status === 'rejected' || isAfterDeadline();
```

**Comportamento:**
- ✅ Timesheets com status `rejected` são **SEMPRE editáveis**
- ✅ Colaborador pode corrigir os erros apontados
- ✅ Colaborador pode reenviar o timesheet após correção
- ✅ Verificação de prazo é feita apenas para alertas, não para bloqueio de edição

---

### 4. **Traduções (i18n)**

**Arquivos:**
- `web/messages/pt-BR/common.json`
- `web/messages/en-GB/common.json`

**Chaves Adicionadas:**

**Português (pt-BR):**
```json
{
  "dashboard": {
    "alerts": {
      "employee": {
        "rejectedWithinDeadline": "⚠️ Sua folha de ponto de {month} foi RECUSADA e precisa ser corrigida até {deadline}. Motivo: {reason}",
        "rejectedPastDeadline": "❌ Sua folha de ponto de {month} foi RECUSADA (prazo expirado em {deadline}). Motivo: {reason}"
      },
      "cta": {
        "correctNow": "Corrigir agora",
        "view": "Visualizar"
      }
    }
  }
}
```

**Inglês (en-GB):**
```json
{
  "dashboard": {
    "alerts": {
      "employee": {
        "rejectedWithinDeadline": "⚠️ Your timesheet for {month} was REJECTED and needs correction by {deadline}. Reason: {reason}",
        "rejectedPastDeadline": "❌ Your timesheet for {month} was REJECTED (deadline expired on {deadline}). Reason: {reason}"
      },
      "cta": {
        "correctNow": "Correct now",
        "view": "View"
      }
    }
  }
}
```

---

## 🔄 Fluxo Completo

### **Cenário 1: Timesheet Rejeitado Dentro do Prazo**

1. **Gerente rejeita timesheet** via `/api/manager/timesheets/[id]/reject`
   - Status muda para `rejected`
   - Motivo é salvo na tabela `approvals`
   - Notificação por email é enviada (já existente)

2. **Colaborador faz login**
   - Dashboard mostra alerta vermelho: "⚠️ Sua folha de ponto de 2025-10 foi RECUSADA..."
   - Alerta inclui motivo da rejeição e prazo para correção
   - Botão "Corrigir agora" redireciona para o timesheet

3. **Colaborador acessa o timesheet**
   - Banner vermelho no topo: "❌ TIMESHEET RECUSADO"
   - Timesheet está **editável** (status = 'rejected')
   - Colaborador pode adicionar/editar/remover entradas

4. **Colaborador corrige e reenvia**
   - Faz as correções necessárias
   - Clica em "Enviar para Aprovação"
   - Status muda para `submitted`
   - Alerta de rejeição desaparece

---

### **Cenário 2: Timesheet Rejeitado Após o Prazo**

1. **Gerente rejeita timesheet** (mesmo fluxo)

2. **Colaborador faz login após o prazo**
   - Dashboard mostra alerta: "❌ Sua folha de ponto de 2025-10 foi RECUSADA (prazo expirado em 16 de novembro)"
   - Botão "Visualizar" (não "Corrigir agora")

3. **Colaborador acessa o timesheet**
   - Banner vermelho: "❌ TIMESHEET RECUSADO"
   - Timesheet ainda está **editável** (para correção)
   - Colaborador pode corrigir, mas precisa contatar gestor para reabrir prazo

---

## 📊 Dados Consultados

### **Tabelas Utilizadas:**

1. **`timesheets`**
   - `id`, `employee_id`, `periodo_ini`, `periodo_fim`, `status`
   - Filtro: `status = 'rejected'`

2. **`approvals`**
   - `timesheet_id`, `status`, `mensagem`, `created_at`
   - Busca o motivo da rejeição

3. **`tenants`**
   - `deadline_day`
   - Usado para calcular prazo de reenvio

4. **`employees`**
   - `id`, `profile_id`, `tenant_id`
   - Link entre usuário e colaborador

---

## 🎨 Componentes Visuais

### **AlertBanner (Dashboard)**
- Componente: `web/src/components/AlertBanner.tsx`
- Renderiza alertas retornados por `/api/notifications/alerts`
- Suporta tipos: `warning`, `info`
- Inclui botões de ação (CTA)

### **TimesheetCalendar (Timesheet Page)**
- Componente: `web/src/components/employee/TimesheetCalendar.tsx`
- Banner de rejeição com animação `animate-scale-in`
- Cores: vermelho para rejeição, azul para período fechado, amarelo para bloqueado

---

## 🧪 Testes Recomendados

### **Teste 1: Rejeição Dentro do Prazo**
1. Login como gerente
2. Rejeitar timesheet de um colaborador com motivo "Falta lançamento do dia 15"
3. Login como colaborador
4. Verificar alerta no dashboard
5. Acessar timesheet e verificar banner vermelho
6. Editar timesheet e reenviar
7. Verificar que alerta desaparece

### **Teste 2: Rejeição Após o Prazo**
1. Criar timesheet de mês anterior
2. Rejeitar como gerente
3. Login como colaborador
4. Verificar alerta com mensagem de prazo expirado
5. Verificar que timesheet ainda é editável

### **Teste 3: Múltiplos Timesheets Rejeitados**
1. Rejeitar 3 timesheets de meses diferentes
2. Login como colaborador
3. Verificar que todos os 3 alertas aparecem no dashboard
4. Verificar ordem (mais recente primeiro)

---

## 📝 Notas Importantes

1. **Notificação por Email:** Já existia e continua funcionando via `dispatchEnhancedNotification`
2. **Notificação In-App:** Sistema de notificações persistentes já existe, mas não foi integrado nesta implementação
3. **Prazo de Reenvio:** Calculado como `último dia do período + deadline_day do mês seguinte`
4. **Edição Sempre Permitida:** Timesheets rejeitados são sempre editáveis, independente do prazo
5. **Múltiplos Alertas:** Sistema suporta múltiplos timesheets rejeitados simultaneamente

---

## 🚀 Próximos Passos (Opcional)

1. **Integrar com sistema de notificações persistentes** (`notifications` table)
2. **Adicionar contador de timesheets rejeitados** no badge de notificações
3. **Criar página dedicada** para listar todos os timesheets rejeitados
4. **Adicionar filtro** na página de timesheets para mostrar apenas rejeitados
5. **Implementar notificação push** quando timesheet for rejeitado
6. **Adicionar histórico de rejeições** (quantas vezes foi rejeitado)

---

## ✅ Status Final

| Item | Status | Observações |
|------|--------|-------------|
| Alerta no Dashboard | ✅ Implementado | Com verificação de prazo |
| Banner no Timesheet | ✅ Implementado | Visual destacado em vermelho |
| Permissão de Edição | ✅ Implementado | Rejeitados sempre editáveis |
| Traduções PT/EN | ✅ Implementado | Mensagens completas |
| Verificação de Prazo | ✅ Implementado | Baseado em deadline_day |
| Motivo da Rejeição | ✅ Implementado | Consultado de approvals |
| Documentação | ✅ Completo | Este arquivo |

---

**Data de Implementação:** 2025-10-31  
**Versão:** 1.0  
**Autor:** Augment Agent

