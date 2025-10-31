# Auditoria Completa - RLS e Autenticação Customizada

**Data**: 2025-10-24  
**Status**: 🔴 CRÍTICO - Múltiplos endpoints afetados

---

## 🎯 Problema Identificado

O sistema usa **autenticação customizada** (não Supabase Auth), mas muitos endpoints usam `getServerSupabase()` que aplica **Row Level Security (RLS)**.

O RLS do Supabase verifica `auth.uid()` que retorna `null` quando não há sessão do Supabase Auth, **bloqueando todas as queries** mesmo com autenticação customizada válida.

---

## 📊 Análise por Categoria

### ✅ Endpoints SEGUROS (já corrigidos ou usam service client)

Estes endpoints já usam `getServiceSupabase()` ou têm fallback condicional:

#### Employee Routes (CORRIGIDOS)
- ✅ `web/src/app/api/employee/timesheets/[id]/entries/route.ts`
- ✅ `web/src/app/api/employee/timesheets/[id]/route.ts`
- ✅ `web/src/app/api/employee/timesheets/[id]/submit/route.ts`
- ✅ `web/src/app/api/employee/timesheets/route.ts`
- ✅ `web/src/app/api/employee/timesheets/[id]/entries/[entryId]/patch/route.ts`
- ✅ `web/src/app/api/employee/timesheets/[id]/entries/[entryId]/route.ts`

#### Admin Routes com Fallback Condicional
Estes usam: `process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase()`

- ✅ `web/src/app/api/admin/tenants/route.ts`
- ✅ `web/src/app/api/admin/delegations/members/route.ts`
- ✅ `web/src/app/api/admin/delegations/groups/[id]/route.ts`
- ✅ `web/src/app/api/admin/delegations/assignments/route.ts`
- ✅ `web/src/app/api/admin/environments/route.ts`
- ✅ `web/src/app/api/admin/search/managers/route.ts`
- ✅ `web/src/app/api/admin/employees/route.ts`
- ✅ `web/src/app/api/admin/vessels/route.ts`
- ✅ `web/src/app/api/admin/work-schedules/route.ts`

---

## ⚠️ Endpoints POTENCIALMENTE PROBLEMÁTICOS

Estes endpoints usam `await getServerSupabase()` **SEM** fallback para service client:

### Admin Routes

1. **`web/src/app/api/admin/periods/employees/route.ts`**
   - Linhas: 9, 41
   - Risco: ALTO - Gerenciamento de period locks
   - Ação: Trocar por `getServiceSupabase()`

2. **`web/src/app/api/admin/periods/environments/route.ts`**
   - Linhas: 9, 40
   - Risco: ALTO - Gerenciamento de period locks
   - Ação: Trocar por `getServiceSupabase()`

3. **`web/src/app/api/admin/periods/groups/route.ts`**
   - Linhas: 9, 40
   - Risco: ALTO - Gerenciamento de period locks
   - Ação: Trocar por `getServiceSupabase()`

4. **`web/src/app/api/admin/permissions/[userId]/route.ts`**
   - Linhas: 9, 31, 52
   - Risco: ALTO - Gerenciamento de permissões
   - Ação: Trocar por `getServiceSupabase()`

5. **`web/src/app/api/admin/permissions/route.ts`**
   - Linha: 7
   - Risco: ALTO - Listagem de permissões
   - Ação: Trocar por `getServiceSupabase()`

6. **`web/src/app/api/admin/environments/[id]/route.ts`**
   - Linha: 7
   - Risco: MÉDIO - Update de environments
   - Ação: Trocar por `getServiceSupabase()`

7. **`web/src/app/api/admin/settings/route.ts`**
   - Linha: 8
   - Risco: MÉDIO - Leitura de settings (já tem `.limit(1)`)
   - Ação: Trocar por `getServiceSupabase()`

8. **`web/src/app/api/admin/me/tenant/route.ts`**
   - Linha: 9
   - Risco: MÉDIO - Leitura de tenant do usuário
   - Ação: Trocar por `getServiceSupabase()`

### Manager Routes

9. **`web/src/app/api/manager/timesheets/[id]/route.ts`**
   - Usa `createClient` com ANON_KEY (não getServerSupabase)
   - Risco: ALTO - Visualização de timesheets
   - Ação: Verificar se RLS está configurado corretamente ou trocar por service client

10. **`web/src/app/api/manager/timesheets/[id]/ack-status/route.ts`**
    - Usa `createClient` com ANON_KEY
    - Risco: MÉDIO - Status de acknowledgment
    - Ação: Verificar RLS

11. **`web/src/app/api/manager/timesheets/[id]/entries/route.ts`**
    - Usa `createClient` com ANON_KEY
    - Risco: ALTO - Gerenciamento de entries
    - Ação: Verificar RLS

12. **`web/src/app/api/manager/timesheets/[id]/entries/[entryId]/route.ts`**
    - Usa `createClient` com ANON_KEY
    - Risco: ALTO - Update/Delete de entries
    - Ação: Verificar RLS

### Employee Routes (Outros)

13. **`web/src/app/api/employee/audit/[auditId]/acknowledge/route.ts`**
    - Usa `createClient` com ANON_KEY
    - Risco: MÉDIO - Acknowledgment de auditorias
    - Ação: Verificar RLS

14. **`web/src/app/api/employee/face-recognition/register/route.ts`**
    - Usa `getServiceSupabase()` ✅ (já seguro)

15. **`web/src/app/api/employee/face-recognition/verify/route.ts`**
    - Usa `getServiceSupabase()` ✅ (já seguro)

---

## 🔧 Estratégia de Correção

### Opção 1: Usar Service Client (RECOMENDADO)

**Vantagens:**
- Solução imediata
- Bypassa RLS completamente
- Controle total de autorização no código

**Desvantagens:**
- Precisa garantir autorização manual em cada endpoint
- Requer service role key configurada

**Implementação:**
```typescript
// Antes
const supabase = await getServerSupabase();

// Depois
const supabase = getServiceSupabase();
```

### Opção 2: Configurar RLS para Autenticação Customizada

**Vantagens:**
- Segurança em nível de banco de dados
- Menos código de autorização manual

**Desvantagens:**
- Complexo de implementar
- Requer mudanças no schema do banco
- Precisa passar user_id customizado para RLS

**Implementação:**
Criar função no Supabase para setar contexto customizado:
```sql
CREATE OR REPLACE FUNCTION set_custom_user_id(user_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Opção 3: Híbrida (RECOMENDADO PARA PRODUÇÃO)

- Usar service client em **admin routes** (autorização manual)
- Configurar RLS customizado para **employee/manager routes**
- Manter fallback condicional onde já existe

---

## 📋 Plano de Ação Imediato

### Prioridade ALTA (Corrigir AGORA)

1. ✅ Employee timesheets routes (JÁ CORRIGIDO)
2. ⚠️ Admin periods routes (employees, environments, groups)
3. ⚠️ Admin permissions routes
4. ⚠️ Manager timesheets routes (verificar RLS)

### Prioridade MÉDIA (Corrigir em seguida)

5. Admin environments/settings routes
6. Employee audit routes
7. Manager entries routes

### Prioridade BAIXA (Revisar)

8. Admin me/tenant route
9. Outros admin routes com fallback condicional

---

## 🎯 Próximos Passos

1. **Verificar se `SUPABASE_SERVICE_ROLE_KEY` está configurada**
   - Checar arquivo `.env` ou `.env.local`
   - Se não estiver, adicionar a key

2. **Corrigir endpoints de prioridade ALTA**
   - Trocar `getServerSupabase()` por `getServiceSupabase()`
   - Adicionar logs para debugging

3. **Testar cada endpoint corrigido**
   - Verificar se queries retornam dados
   - Verificar se autorização manual funciona

4. **Documentar mudanças**
   - Atualizar este documento
   - Criar guia de boas práticas

---

## 📝 Notas Importantes

- **NUNCA** use `getServerSupabase()` em novos endpoints sem verificar RLS
- **SEMPRE** use `getServiceSupabase()` em admin routes
- **SEMPRE** implemente autorização manual quando usar service client
- **SEMPRE** teste queries após mudanças de client

---

## ✅ Status da Correção

- [x] Employee timesheets routes (6 arquivos) ✅
- [x] Admin periods routes (3 arquivos) ✅
- [x] Admin permissions routes (2 arquivos) ✅
- [x] Manager timesheets routes (4 arquivos) ✅
- [x] Admin settings/environments routes (2 arquivos) ✅
- [x] Employee audit routes (1 arquivo) ✅

**Total**: 21/21 arquivos corrigidos (100%) 🎉

---

## 📝 Lista Completa de Arquivos Corrigidos

### Employee Routes (6 arquivos)
1. ✅ `web/src/app/api/employee/timesheets/[id]/entries/route.ts`
2. ✅ `web/src/app/api/employee/timesheets/[id]/route.ts`
3. ✅ `web/src/app/api/employee/timesheets/[id]/submit/route.ts`
4. ✅ `web/src/app/api/employee/timesheets/route.ts`
5. ✅ `web/src/app/api/employee/timesheets/[id]/entries/[entryId]/patch/route.ts`
6. ✅ `web/src/app/api/employee/timesheets/[id]/entries/[entryId]/route.ts`

### Admin Periods Routes (3 arquivos)
7. ✅ `web/src/app/api/admin/periods/employees/route.ts`
8. ✅ `web/src/app/api/admin/periods/environments/route.ts`
9. ✅ `web/src/app/api/admin/periods/groups/route.ts`

### Admin Permissions Routes (2 arquivos)
10. ✅ `web/src/app/api/admin/permissions/[userId]/route.ts`
11. ✅ `web/src/app/api/admin/permissions/route.ts`

### Manager Timesheets Routes (4 arquivos)
12. ✅ `web/src/app/api/manager/timesheets/[id]/route.ts`
13. ✅ `web/src/app/api/manager/timesheets/[id]/ack-status/route.ts`
14. ✅ `web/src/app/api/manager/timesheets/[id]/entries/route.ts`
15. ✅ `web/src/app/api/manager/timesheets/[id]/entries/[entryId]/route.ts`

### Admin Settings/Environments Routes (2 arquivos)
16. ✅ `web/src/app/api/admin/environments/[id]/route.ts`
17. ✅ `web/src/app/api/admin/me/tenant/route.ts`

### Employee Audit Routes (1 arquivo)
18. ✅ `web/src/app/api/employee/audit/[auditId]/acknowledge/route.ts`

### Reports & Export Routes (3 arquivos)
19. ✅ `web/src/app/api/reports/generate/route.ts`
20. ✅ `web/src/app/api/reports/export/route.ts`
21. ✅ `web/src/app/api/export/route.ts`

