# 🎯 Lógica de Atribuição de Grupos no Sistema de Convites

## 📋 Visão Geral

Este documento explica como funciona a atribuição de grupos e grupos gerenciados no sistema de convites de usuários do PontoFlow.

---

## 🔑 Conceitos Fundamentais

### 1. **Grupos (Groups)**
- Representam agrupamentos de colaboradores dentro de um tenant
- Usados para organização e delegação de gerenciamento
- Cada grupo pertence a um único tenant (`tenant_id`)

### 2. **Membros de Grupo (Group Members)**
- Usuários que **pertencem** a um grupo
- Tabela: `employee_group_members`
- Campos: `employee_id`, `group_id`, `tenant_id`

### 3. **Gerentes de Grupo (Group Managers)**
- Usuários que **gerenciam** um grupo
- Tabela: `manager_group_assignments`
- Campos: `manager_id`, `group_id`, `tenant_id`

---

## 🎭 Roles e Permissões

### USER (Usuário Comum)
- ✅ Pode ser **membro** de múltiplos grupos
- ❌ **NÃO** pode gerenciar grupos
- ❌ Campo `managed_group_ids` deve estar vazio

### MANAGER_TIMESHEET (Gerente de Timesheet)
- ✅ Pode ser **membro** de múltiplos grupos
- ✅ Pode **gerenciar** múltiplos grupos
- ✅ Pode aprovar timesheets dos membros dos grupos que gerencia

### MANAGER (Gerente)
- ✅ Pode ser **membro** de múltiplos grupos
- ✅ Pode **gerenciar** múltiplos grupos
- ✅ Permissões adicionais de gerenciamento

### ADMIN (Administrador)
- ✅ Acesso total ao sistema
- ✅ Pode ser membro e gerente de grupos
- ✅ Pode gerenciar todos os recursos

---

## 🔄 Fluxo de Convite

### Passo 1: Admin Cria o Convite

```typescript
POST /api/admin/invitations
{
  "email": "usuario@example.com",
  "first_name": "João",
  "last_name": "Silva",
  "role": "MANAGER_TIMESHEET",
  "tenant_ids": ["tenant-uuid-1", "tenant-uuid-2"],
  "group_ids": ["group-uuid-1", "group-uuid-2"],        // Grupos onde será MEMBRO
  "managed_group_ids": ["group-uuid-1", "group-uuid-3"] // Grupos que irá GERENCIAR
}
```

**Validações:**
- ✅ `managed_group_ids` só pode ser preenchido se `role` for `MANAGER` ou `MANAGER_TIMESHEET`
- ✅ Todos os grupos devem pertencer aos tenants selecionados
- ✅ Email não pode estar duplicado

### Passo 2: Usuário Recebe Email

- Email contém link com token único
- Token válido por 7 dias
- Link: `https://app.com/auth/accept-invite?token=xxx`

### Passo 3: Usuário Aceita o Convite

```typescript
POST /api/auth/accept-invite
{
  "token": "invitation-token",
  "password": "senha-segura-123",
  "phone_number": "opcional",
  "position": "opcional",
  "department": "opcional"
}
```

**O que acontece:**

1. **Cria usuário** em `users_unified`
2. **Cria profile** em `profiles`
3. **Atribui tenants** em `tenant_user_roles`
4. **Cria employee** em `employees` (se necessário)
5. **Atribui como membro** dos grupos em `employee_group_members`
6. **Atribui como gerente** dos grupos em `manager_group_assignments` (se role for MANAGER/MANAGER_TIMESHEET)
7. **Marca convite** como `accepted`

---

## 📊 Estrutura de Dados

### Tabela: `employee_group_members`

```sql
CREATE TABLE employee_group_members (
  employee_id UUID NOT NULL,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, group_id)
);
```

**Significado:**
- O colaborador (`employee_id`) é **membro** do grupo (`group_id`)
- Usado para determinar quais colaboradores pertencem a um grupo
- Necessário para criar timesheets e atribuir trabalho

### Tabela: `manager_group_assignments`

```sql
CREATE TABLE manager_group_assignments (
  manager_id UUID NOT NULL,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (manager_id, group_id)
);
```

**Significado:**
- O gerente (`manager_id`) **gerencia** o grupo (`group_id`)
- Usado para determinar quais gerentes podem aprovar timesheets
- Gerentes podem ver e aprovar timesheets dos membros dos grupos que gerenciam

---

## 🎯 Exemplos Práticos

### Exemplo 1: Usuário Comum

**Convite:**
```json
{
  "role": "USER",
  "tenant_ids": ["tenant-abz"],
  "group_ids": ["grupo-ti", "grupo-rh"],
  "managed_group_ids": []
}
```

**Resultado:**
- ✅ Usuário criado com role `USER`
- ✅ Atribuído aos tenants: `tenant-abz`
- ✅ **Membro** dos grupos: `grupo-ti`, `grupo-rh`
- ❌ **NÃO gerencia** nenhum grupo

**Tabelas afetadas:**
- `users_unified`: 1 registro
- `tenant_user_roles`: 1 registro
- `employees`: 1 registro
- `employee_group_members`: 2 registros (TI e RH)
- `manager_group_assignments`: 0 registros

---

### Exemplo 2: Gerente de Timesheet

**Convite:**
```json
{
  "role": "MANAGER_TIMESHEET",
  "tenant_ids": ["tenant-abz"],
  "group_ids": ["grupo-ti"],
  "managed_group_ids": ["grupo-ti", "grupo-dev"]
}
```

**Resultado:**
- ✅ Usuário criado com role `MANAGER_TIMESHEET`
- ✅ Atribuído aos tenants: `tenant-abz`
- ✅ **Membro** do grupo: `grupo-ti`
- ✅ **Gerencia** os grupos: `grupo-ti`, `grupo-dev`

**Tabelas afetadas:**
- `users_unified`: 1 registro
- `tenant_user_roles`: 1 registro
- `employees`: 1 registro
- `employee_group_members`: 1 registro (TI)
- `manager_group_assignments`: 2 registros (TI e DEV)

**Permissões:**
- Pode aprovar timesheets de todos os membros de `grupo-ti` e `grupo-dev`
- É membro apenas de `grupo-ti` (pode ter seu próprio timesheet)

---

### Exemplo 3: Gerente de Múltiplos Tenants

**Convite:**
```json
{
  "role": "MANAGER",
  "tenant_ids": ["tenant-abz", "tenant-omega"],
  "group_ids": ["grupo-ti-abz", "grupo-ti-omega"],
  "managed_group_ids": ["grupo-ti-abz", "grupo-dev-abz", "grupo-ti-omega"]
}
```

**Resultado:**
- ✅ Usuário criado com role `MANAGER`
- ✅ Atribuído aos tenants: `tenant-abz`, `tenant-omega`
- ✅ **Membro** dos grupos: `grupo-ti-abz`, `grupo-ti-omega`
- ✅ **Gerencia** os grupos: `grupo-ti-abz`, `grupo-dev-abz`, `grupo-ti-omega`

**Tabelas afetadas:**
- `users_unified`: 1 registro
- `tenant_user_roles`: 2 registros (ABZ e Omega)
- `employees`: 1 registro (tenant principal)
- `employee_group_members`: 2 registros
- `manager_group_assignments`: 3 registros

---

## 🔍 Queries Úteis

### Verificar membros de um grupo

```sql
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  u.role
FROM employee_group_members egm
JOIN employees e ON e.id = egm.employee_id
JOIN users_unified u ON u.id = e.profile_id
WHERE egm.group_id = 'group-uuid'
  AND egm.tenant_id = 'tenant-uuid';
```

### Verificar gerentes de um grupo

```sql
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  u.role
FROM manager_group_assignments mga
JOIN users_unified u ON u.id = mga.manager_id
WHERE mga.group_id = 'group-uuid'
  AND mga.tenant_id = 'tenant-uuid';
```

### Verificar grupos de um usuário

```sql
-- Grupos onde é membro
SELECT g.name, g.id
FROM employee_group_members egm
JOIN groups g ON g.id = egm.group_id
JOIN employees e ON e.id = egm.employee_id
WHERE e.profile_id = 'user-uuid';

-- Grupos que gerencia
SELECT g.name, g.id
FROM manager_group_assignments mga
JOIN groups g ON g.id = mga.group_id
WHERE mga.manager_id = 'user-uuid';
```

---

## ✅ Validações Implementadas

### No Frontend (InviteUserModal.tsx)
- ✅ Seção "Grupos Gerenciados" só aparece para MANAGER e MANAGER_TIMESHEET
- ✅ Grupos são filtrados pelos tenants selecionados
- ✅ Limpeza automática ao desmarcar tenants

### No Backend (POST /api/admin/invitations)
- ✅ Valida que `managed_group_ids` só pode ser preenchido para gerentes
- ✅ Valida formato de email
- ✅ Verifica duplicidade de email e convites pendentes

### No Aceite (POST /api/auth/accept-invite)
- ✅ Valida força da senha (mínimo 8 caracteres)
- ✅ Verifica status e expiração do convite
- ✅ Busca `tenant_id` de cada grupo para popular corretamente
- ✅ Valida role antes de criar `manager_group_assignments`
- ✅ Cria employee se necessário antes de atribuir grupos

---

## 🐛 Correções Implementadas

### Problema 1: Grupos não apareciam no modal ✅
**Causa:** API incorreta (`/api/admin/groups` não existe)  
**Solução:** Alterado para `/api/admin/delegations/groups` e campo `items` ao invés de `groups`

### Problema 2: Campo tenant_id faltando ✅
**Causa:** Migração phase-22 adicionou `tenant_id` obrigatório  
**Solução:** Buscar `tenant_id` de cada grupo antes de inserir em `employee_group_members` e `manager_group_assignments`

### Problema 3: Validação de role ✅
**Causa:** Não havia validação se role era gerente  
**Solução:** Adicionada validação no POST de convite e no aceite

---

## 📝 Notas Importantes

1. **Multi-tenant**: Um usuário pode pertencer a múltiplos tenants
2. **Multi-group**: Um usuário pode ser membro de múltiplos grupos
3. **Multi-managed**: Um gerente pode gerenciar múltiplos grupos
4. **Independência**: Ser membro de um grupo não significa gerenciá-lo
5. **Hierarquia**: Um gerente pode gerenciar grupos dos quais não é membro

---

**Última atualização**: 2025-01-04  
**Versão**: 1.0.0  
**Autor**: Sistema de Convites PontoFlow

