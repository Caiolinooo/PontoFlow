# 🎯 Sistema de Filtros do Modal de Convite

## 📋 Visão Geral

O modal de convite de usuários (`InviteUserModal.tsx`) implementa um sistema de filtros dinâmicos e hierárquicos para seleção de tenants, grupos e grupos gerenciados.

## 🔄 Lógica de Filtros

### 1. **Tenants** (Sempre Visível)

```
┌─────────────────────────────────┐
│ Tenants                         │
├─────────────────────────────────┤
│ ☐ ABZ Group                     │
│ ☐ Omega                         │
│ ☐ Outro Tenant                  │
└─────────────────────────────────┘
```

**Comportamento:**
- ✅ Sempre visível, independente da role selecionada
- ✅ Permite seleção múltipla
- ✅ Não tem filtros aplicados
- ✅ Mostra todos os tenants disponíveis no sistema

**Quando não há tenants:**
- Exibe mensagem: "Nenhum tenant disponível"

---

### 2. **Grupos** (Sempre Visível, Filtrado por Tenants)

```
┌─────────────────────────────────┐
│ Grupos    Filtrado por 2 tenant(s) │
├─────────────────────────────────┤
│ ☐ Grupo A (Tenant: ABZ Group)  │
│ ☐ Grupo B (Tenant: ABZ Group)  │
│ ☐ Grupo C (Tenant: Omega)      │
└─────────────────────────────────┘
```

**Comportamento:**
- ✅ Sempre visível, independente da role selecionada
- ✅ **Filtrado dinamicamente** pelos tenants selecionados
- ✅ Mostra apenas grupos que pertencem aos tenants selecionados
- ✅ Atualiza automaticamente quando tenants são selecionados/desmarcados
- ✅ Remove automaticamente grupos selecionados que não pertencem mais aos tenants ativos

**Quando nenhum tenant está selecionado:**
- Exibe mensagem: "Selecione um tenant para ver os grupos disponíveis"
- Mostra todos os grupos disponíveis (comportamento alternativo)

**Quando não há grupos para os tenants selecionados:**
- Exibe mensagem: "Nenhum grupo disponível para os tenants selecionados"

---

### 3. **Grupos Gerenciados** (Condicional, Filtrado por Tenants e Role)

```
┌─────────────────────────────────────────┐
│ 🛡️ Grupos Gerenciados                   │
│ Selecione os grupos que este gerente   │
│ irá gerenciar                           │
├─────────────────────────────────────────┤
│ ☐ Grupo A (Tenant: ABZ Group)          │
│ ☐ Grupo B (Tenant: ABZ Group)          │
└─────────────────────────────────────────┘
```

**Comportamento:**
- ✅ **Visível APENAS** quando role = `MANAGER` ou `MANAGER_TIMESHEET`
- ✅ **Filtrado dinamicamente** pelos tenants selecionados
- ✅ Mostra apenas grupos que pertencem aos tenants selecionados
- ✅ Mostra os mesmos grupos disponíveis na seção "Grupos"
- ✅ Atualiza automaticamente quando tenants ou role são alterados
- ✅ Remove automaticamente grupos gerenciados selecionados que não pertencem mais aos tenants ativos
- ✅ Design destacado com fundo roxo e ícone de escudo

**Quando role não é gerente:**
- Seção não é exibida

**Quando nenhum tenant está selecionado:**
- Exibe mensagem: "Selecione um tenant para ver os grupos disponíveis"

**Quando não há grupos para os tenants selecionados:**
- Exibe mensagem: "Nenhum grupo disponível para os tenants selecionados"

---

## 🔗 Fluxo de Dependências

```
┌──────────────┐
│   TENANTS    │ (Sempre visível)
└──────┬───────┘
       │
       ├─────────────────────────────┐
       │                             │
       ▼                             ▼
┌──────────────┐            ┌────────────────────┐
│    GRUPOS    │            │ GRUPOS GERENCIADOS │
│  (Filtrado)  │            │    (Condicional)   │
└──────────────┘            └────────────────────┘
                                     ▲
                                     │
                            ┌────────┴────────┐
                            │  ROLE = MANAGER │
                            │  ou MANAGER_TS  │
                            └─────────────────┘
```

---

## 💡 Exemplos de Uso

### Exemplo 1: Usuário Comum (USER)

**Seleções:**
- Role: `USER`
- Tenants: `ABZ Group`, `Omega`

**Resultado:**
- ✅ Seção "Tenants" visível com 2 selecionados
- ✅ Seção "Grupos" visível, mostrando apenas grupos de ABZ Group e Omega
- ❌ Seção "Grupos Gerenciados" **não visível**

---

### Exemplo 2: Gerente de Timesheet

**Seleções:**
- Role: `MANAGER_TIMESHEET`
- Tenants: `ABZ Group`

**Resultado:**
- ✅ Seção "Tenants" visível com 1 selecionado
- ✅ Seção "Grupos" visível, mostrando apenas grupos de ABZ Group
- ✅ Seção "Grupos Gerenciados" **visível**, mostrando os mesmos grupos de ABZ Group

---

### Exemplo 3: Gerente sem Tenants Selecionados

**Seleções:**
- Role: `MANAGER`
- Tenants: (nenhum)

**Resultado:**
- ✅ Seção "Tenants" visível
- ✅ Seção "Grupos" visível com mensagem: "Selecione um tenant para ver os grupos disponíveis"
- ✅ Seção "Grupos Gerenciados" **visível** com mensagem: "Selecione um tenant para ver os grupos disponíveis"

---

### Exemplo 4: Mudança Dinâmica de Tenants

**Ação do usuário:**
1. Seleciona tenant `ABZ Group`
2. Seleciona grupos: `Grupo A`, `Grupo B` (ambos de ABZ Group)
3. Seleciona grupos gerenciados: `Grupo A`
4. **Desmarca** tenant `ABZ Group`

**Resultado:**
- ✅ Grupos `Grupo A` e `Grupo B` são **automaticamente desmarcados**
- ✅ Grupo gerenciado `Grupo A` é **automaticamente desmarcado**
- ✅ Lista de grupos fica vazia ou mostra mensagem

---

## 🔧 Implementação Técnica

### Estado do Componente

```typescript
const [tenants, setTenants] = useState<any[]>([]);
const [groups, setGroups] = useState<any[]>([]);
const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
const [selectedManagedGroups, setSelectedManagedGroups] = useState<string[]>([]);
```

### Filtro de Grupos

```typescript
// Filter groups based on selected tenants
const filteredGroups = selectedTenants.length > 0
  ? groups.filter(group => selectedTenants.includes(group.tenant_id))
  : groups;
```

### Limpeza Automática

```typescript
// When tenants change, remove groups that are no longer valid
useEffect(() => {
  if (selectedTenants.length > 0) {
    const validGroupIds = filteredGroups.map(g => g.id);
    setSelectedGroups(prev => prev.filter(id => validGroupIds.includes(id)));
    setSelectedManagedGroups(prev => prev.filter(id => validGroupIds.includes(id)));
  }
}, [selectedTenants]);
```

### Renderização Condicional

```typescript
// Grupos Gerenciados - apenas para gerentes
{(selectedRole === 'MANAGER' || selectedRole === 'MANAGER_TIMESHEET') && (
  <div className="space-y-2 bg-purple-50 ...">
    {/* Conteúdo */}
  </div>
)}
```

---

## 🎨 Design Visual

### Tenants
- Fundo: Padrão (card background)
- Borda: Padrão (border color)
- Hover: Fundo levemente destacado

### Grupos
- Fundo: Padrão (card background)
- Borda: Padrão (border color)
- Hover: Fundo levemente destacado
- Badge: "Filtrado por X tenant(s)" quando aplicável

### Grupos Gerenciados
- Fundo: Roxo claro (`bg-purple-50 dark:bg-purple-900/10`)
- Borda: Roxo (`border-purple-200 dark:border-purple-800`)
- Ícone: Escudo roxo
- Hover: Fundo roxo mais intenso
- Checkbox: Cor roxa (`text-purple-600`)

---

## ✅ Validações

1. **Tenant Obrigatório para Grupos**: Grupos só são exibidos se houver tenants selecionados (ou todos se nenhum selecionado)
2. **Limpeza Automática**: Grupos e grupos gerenciados são automaticamente desmarcados quando seus tenants são removidos
3. **Sincronização**: Grupos gerenciados sempre mostram o mesmo conjunto de grupos disponíveis na seção "Grupos"
4. **Visibilidade Condicional**: Grupos gerenciados só aparecem para roles de gerente

---

## 🐛 Troubleshooting

### Grupos não aparecem
**Causa**: Nenhum tenant selecionado  
**Solução**: Selecione pelo menos um tenant

### Grupos gerenciados não aparecem
**Causa**: Role não é MANAGER ou MANAGER_TIMESHEET  
**Solução**: Selecione uma role de gerente

### Grupos desaparecem ao desmarcar tenant
**Comportamento esperado**: Grupos são automaticamente removidos quando seus tenants são desmarcados

### Grupos gerenciados mostram grupos diferentes
**Causa**: Filtro por tenant está aplicado  
**Solução**: Grupos gerenciados sempre mostram apenas grupos dos tenants selecionados

---

## 📊 Resumo da Lógica

| Seção | Visibilidade | Filtro | Atualização Dinâmica |
|-------|-------------|--------|---------------------|
| **Tenants** | Sempre | Nenhum | N/A |
| **Grupos** | Sempre | Por tenants selecionados | Sim, ao mudar tenants |
| **Grupos Gerenciados** | Apenas gerentes | Por tenants selecionados | Sim, ao mudar tenants ou role |

---

**Última atualização**: 2025-01-04  
**Versão**: 1.0.0  
**Componente**: `InviteUserModal.tsx`

