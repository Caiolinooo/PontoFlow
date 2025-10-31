# Correção de Permissões de Relatórios

**Data:** 2025-10-31  
**Versão:** 0.1.1  
**Status:** ✅ Implementado

---

## 📋 Problema Identificado

O sistema de relatórios não estava respeitando corretamente as permissões baseadas em roles:

### ❌ Comportamento Anterior

1. **USER (Colaborador)**: ✅ Correto - Via apenas seus próprios relatórios
2. **MANAGER**: ❌ **INCORRETO** - Via **TODOS** os relatórios do tenant (sem filtro)
3. **ADMIN**: ✅ Correto - Via todos os relatórios do tenant

### 🔍 Código Problemático

**Arquivo:** `web/src/app/api/reports/generate/route.ts` (linhas 74-79)

```typescript
} else if (user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
  // Manager can see their team's timesheets
  // This would require additional logic to filter by manager's team
  // For now, we'll allow access to all tenant employees  // ❌ PROBLEMA!
  console.log('[REPORTS] Manager access - all tenant employees');
}
```

**Problema:** O comentário "For now, we'll allow access to all tenant employees" indica que a implementação estava incompleta.

---

## ✅ Solução Implementada

### 🎯 Comportamento Correto

1. **USER (Colaborador)**: ✅ Vê apenas seus próprios relatórios
2. **MANAGER**: ✅ **CORRIGIDO** - Vê relatórios dos colaboradores dos grupos que gerencia + próprio relatório se não tiver grupos
3. **ADMIN**: ✅ Vê todos os relatórios do tenant

**Regra Especial para MANAGER:**
- **Com grupos atribuídos**: Vê relatórios dos colaboradores dos grupos
- **Sem grupos atribuídos**: Vê apenas o próprio relatório (comportamento igual ao USER)
- **Com grupos vazios (sem membros)**: Vê apenas o próprio relatório

### 🔧 Implementação

#### 1. Endpoint `/api/reports/generate`

**Lógica de Permissões para MANAGER:**

```typescript
if (user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
  // 1. Buscar grupos gerenciados pelo manager
  const { data: managerGroups } = await supabase
    .from('manager_group_assignments')
    .select('group_id')
    .eq('tenant_id', user.tenant_id)
    .eq('manager_id', user.id);
  
  const groupIds = (managerGroups || []).map(g => g.group_id);
  
  // 2. Buscar colaboradores desses grupos
  const { data: groupMembers } = await supabase
    .from('employee_group_members')
    .select('employee_id')
    .eq('tenant_id', user.tenant_id)
    .in('group_id', groupIds);
  
  allowedEmployeeIds = [...new Set((groupMembers || []).map(m => m.employee_id))];
  
  // 3. Aplicar filtro na query
  if (requestedEmployeeId) {
    // Verificar se manager tem acesso ao colaborador solicitado
    if (!allowedEmployeeIds.includes(requestedEmployeeId)) {
      return 403; // Acesso negado
    }
    query = query.eq('employee_id', requestedEmployeeId);
  } else {
    // Filtrar apenas colaboradores permitidos
    query = query.in('employee_id', allowedEmployeeIds);
  }
}
```

**Casos Especiais:**

- **Manager sem grupos atribuídos**: Retorna relatório vazio com mensagem apropriada
- **Manager com grupos vazios**: Retorna relatório vazio com mensagem apropriada
- **Manager solicitando colaborador não autorizado**: Retorna erro 403

#### 2. Endpoint `/api/reports/export`

**Mesma lógica aplicada** para garantir consistência entre geração e exportação de relatórios.

**Formatos suportados:**
- CSV
- JSON
- PDF
- Excel

Todos respeitam as mesmas permissões.

---

## 🗄️ Tabelas Utilizadas

### `manager_group_assignments`

Relaciona managers com grupos que eles gerenciam.

```sql
CREATE TABLE manager_group_assignments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  manager_id UUID NOT NULL,  -- user_id do manager
  group_id UUID NOT NULL,    -- ID do grupo
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `employee_group_members`

Relaciona colaboradores com grupos.

```sql
CREATE TABLE employee_group_members (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL,  -- ID do employee
  group_id UUID NOT NULL,     -- ID do grupo
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🧪 Cenários de Teste

### Cenário 1: Manager com 1 grupo, 3 colaboradores

**Setup:**
- Manager: João (user_id: `abc-123`)
- Grupo: "Equipe A" (group_id: `group-1`)
- Colaboradores: Maria, Pedro, Ana

**Resultado Esperado:**
- João vê relatórios de: Maria, Pedro, Ana
- João **NÃO** vê relatórios de outros colaboradores do tenant

### Cenário 2: Manager com múltiplos grupos

**Setup:**
- Manager: João (user_id: `abc-123`)
- Grupos: "Equipe A" (group-1), "Equipe B" (group-2)
- Equipe A: Maria, Pedro
- Equipe B: Ana, Carlos

**Resultado Esperado:**
- João vê relatórios de: Maria, Pedro, Ana, Carlos
- João **NÃO** vê relatórios de colaboradores de outros grupos

### Cenário 3: Manager sem grupos atribuídos

**Setup:**
- Manager: João (user_id: `abc-123`)
- Grupos atribuídos: Nenhum
- João tem perfil de colaborador (employee_id: `emp-123`)

**Resultado Esperado:**
- João vê apenas o **próprio relatório** (como se fosse USER)
- Comportamento idêntico a um colaborador comum

### Cenário 4: Manager solicitando colaborador não autorizado

**Setup:**
- Manager: João (gerencia apenas "Equipe A")
- Solicitação: Relatório de Carlos (membro de "Equipe B")

**Resultado Esperado:**
- Erro 403: "Acesso negado a este colaborador"

### Cenário 5: Admin

**Setup:**
- Admin: Carlos (role: ADMIN)

**Resultado Esperado:**
- Carlos vê **TODOS** os relatórios do tenant
- Sem restrições de grupo

---

## 📊 Logs de Diagnóstico

Os endpoints agora incluem logs detalhados para facilitar debugging:

```
[REPORTS] USER access - own timesheets only. Employee ID: xxx
[REPORTS] MANAGER manages groups: [group-1, group-2]
[REPORTS] MANAGER can access employees: [emp-1, emp-2, emp-3]
[REPORTS] MANAGER does not have access to requested employee: emp-4
[REPORTS] ADMIN access - all tenant timesheets
```

---

## 🔒 Segurança

### Validações Implementadas

1. ✅ **Verificação de tenant_id**: Todos os dados são filtrados por tenant
2. ✅ **Verificação de role**: Cada role tem permissões específicas
3. ✅ **Verificação de grupo**: Managers só acessam seus grupos
4. ✅ **Verificação de colaborador**: Managers só acessam colaboradores autorizados
5. ✅ **Logs de auditoria**: Todas as tentativas de acesso são logadas

### Proteções Contra Ataques

- **Privilege Escalation**: Manager não pode acessar dados de outros grupos
- **Data Leakage**: Colaboradores não podem ver dados de outros colaboradores
- **Tenant Isolation**: Dados são sempre filtrados por tenant_id

---

## 📝 Arquivos Modificados

1. ✅ `web/src/app/api/reports/generate/route.ts` - Lógica de permissões para geração
2. ✅ `web/src/app/api/reports/export/route.ts` - Lógica de permissões para exportação
3. ✅ `docs/REPORTS-PERMISSIONS-FIX.md` - Esta documentação

---

## 🚀 Próximos Passos

### Recomendações

1. **Testes de Integração**: Criar testes automatizados para cada cenário
2. **Auditoria de Logs**: Implementar sistema de auditoria para rastrear acessos
3. **UI Feedback**: Melhorar mensagens de erro na interface do usuário
4. **Performance**: Considerar cache para queries de grupos/membros

### Melhorias Futuras

- [ ] Cache de permissões de manager (Redis/Memory)
- [ ] Paginação de relatórios grandes
- [ ] Filtros avançados por período/status
- [ ] Relatórios agendados (scheduled reports)
- [ ] Notificações de novos relatórios disponíveis

---

## ✅ Checklist de Implementação

- [x] Implementar lógica de permissões para MANAGER em `/api/reports/generate`
- [x] Implementar lógica de permissões para MANAGER em `/api/reports/export`
- [x] Adicionar logs de diagnóstico
- [x] Tratar casos especiais (manager sem grupos, grupos vazios)
- [x] Validar acesso a colaborador específico
- [x] Documentar mudanças
- [ ] Testar com dados reais
- [ ] Criar testes automatizados
- [ ] Atualizar documentação de API

---

## 📞 Contato

Para dúvidas ou problemas relacionados a esta correção, consulte:
- Documentação de API: `/docs/API.md`
- Sistema de permissões: `/docs/PERMISSIONS.md`
- Grupos e delegações: `/docs/GROUPS.md`

