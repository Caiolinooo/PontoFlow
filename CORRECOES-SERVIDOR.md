# Correções de Problemas no Servidor

## Data: 2025-10-28

## Problemas Identificados e Corrigidos

### 1. ERR_TOO_MANY_REDIRECTS - Loop Infinito de Redirecionamento

**Problema:**
- A página `/employee/bootstrap` estava criando um loop infinito de redirecionamentos
- Quando havia erro na criação do employee, redirecionava para `/employee/timesheets`
- `/employee/timesheets` verificava se o employee existia e redirecionava de volta para `/employee/bootstrap`
- Isso criava um loop infinito causando o erro `ERR_TOO_MANY_REDIRECTS`

**Causa Raiz (Descoberta após testes):**
- A tabela `employees` tem um campo `name` que é obrigatório (NOT NULL)
- O código de bootstrap não estava enviando o campo `name` na criação do employee
- Erro SQL: `null value in column "name" of relation "employees" violates not-null constraint`
- Falta de tratamento de erro adequado na página bootstrap
- Redirecionamento automático mesmo quando havia falha na criação do employee

**Solução Implementada:**
- Modificado `web/src/app/[locale]/employee/bootstrap/page.tsx`
- Adicionado campo `name` na criação do employee (usando display_name do profile)
- Adicionado tratamento de erro que exibe uma página de erro ao invés de redirecionar
- Agora quando há erro na criação do employee, o usuário vê uma mensagem clara com detalhes técnicos
- Evita o loop de redirecionamento mostrando o erro diretamente

**Arquivos Modificados:**
- `web/src/app/[locale]/employee/bootstrap/page.tsx` (linhas 91-159)

---

### 2. Erro na Criação de Grupos - RLS Bloqueando Queries

**Problema:**
- Criação de novos grupos falhava silenciosamente
- Operações de UPDATE e DELETE em grupos também falhavam

**Causa Raiz:**
- O sistema usa **autenticação customizada** (não Supabase Auth)
- As rotas estavam usando `getServerSupabase()` que aplica **Row Level Security (RLS)**
- O RLS do Supabase verifica `auth.uid()` que retorna `null` quando não há sessão do Supabase Auth
- Isso bloqueava todas as queries mesmo com autenticação customizada válida

**Solução Implementada:**
- Modificadas as rotas de API para usar `getServiceSupabase()` ao invés de `getServerSupabase()`
- O service client bypassa o RLS, permitindo que a autorização seja feita manualmente no código
- Adicionado logging de erros para facilitar debugging futuro

**Arquivos Modificados:**
1. `web/src/app/api/admin/delegations/groups/route.ts` (POST - linhas 56-120)
2. `web/src/app/api/admin/delegations/groups/[id]/route.ts` (PATCH - linhas 148-180)
3. `web/src/app/api/admin/delegations/groups/[id]/route.ts` (DELETE - linhas 182-212)
4. `web/src/app/api/employee/tenants/route.ts` (GET - linhas 12-77)
5. `web/src/app/api/employee/environments/route.ts` (GET - linhas 1-55)

**Mudanças Específicas:**
```typescript
// ANTES (com RLS que bloqueava)
const supabase = await getServerSupabase();

// DEPOIS (bypassa RLS)
const supabase = getServiceSupabase();
```

---

### 3. Erro de Relacionamento Ambíguo - Employee Tenants

**Problema:**
- Erro ao buscar tenants do employee: `Could not embed because more than one relationship was found`
- Existem dois foreign keys entre `employees` e `tenants`:
  - `employees_tenant_fk`
  - `employees_tenant_id_fkey`
- O PostgREST não sabia qual relacionamento usar

**Causa Raiz:**
- Query usando embed syntax: `tenants:tenant_id (...)` com múltiplos relacionamentos
- Supabase não consegue resolver automaticamente qual FK usar

**Solução Implementada:**
- Modificado `/api/employee/tenants` para buscar employees e tenants separadamente
- Usa queries independentes e faz o join manualmente no código
- Evita o erro de relacionamento ambíguo

**Arquivos Modificados:**
- `web/src/app/api/employee/tenants/route.ts` (linhas 12-77)

---

### 4. Erro 404 em Employee Environments

**Problema:**
- Rota `/api/employee/environments` retornando 404
- Employee não encontrado devido ao RLS bloqueando a query

**Causa Raiz:**
- Mesma causa do problema #2: RLS bloqueando queries com autenticação customizada

**Solução Implementada:**
- Modificado para usar `getServiceSupabase()` ao invés de `getServerSupabase()`
- Adicionado logging de erros para debugging

**Arquivos Modificados:**
- `web/src/app/api/employee/environments/route.ts` (linhas 1-55)

---

## Verificações Necessárias

### 1. Variáveis de Ambiente
Certifique-se de que as seguintes variáveis estão configuradas no servidor:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # CRÍTICO para as correções
```

**IMPORTANTE:** A variável `SUPABASE_SERVICE_ROLE_KEY` é essencial para que as correções funcionem corretamente.

### 2. Teste de Criação de Grupos
Após o deploy, teste:
1. Acesse a área de administração
2. Vá para Delegações > Grupos
3. Tente criar um novo grupo
4. Verifique se o grupo é criado com sucesso
5. Tente editar e deletar o grupo

### 3. Teste de Bootstrap de Employee
Teste o fluxo de criação de employee:
1. Crie um novo usuário sem employee associado
2. Acesse `/employee/timesheets`
3. Deve ser redirecionado para `/employee/bootstrap`
4. Se houver erro, deve ver uma mensagem de erro clara (não loop infinito)

---

## Logs e Debugging

### Logs Adicionados
Os seguintes logs foram adicionados para facilitar debugging:

1. **Criação de Grupos:**
   - `console.error('Failed to create group:', error)`
   - `console.error('POST /api/admin/delegations/groups error:', e)`

2. **Atualização de Grupos:**
   - `console.error('Failed to update group:', error)`
   - `console.error('PATCH /api/admin/delegations/groups/[id] error:', e)`

3. **Deleção de Grupos:**
   - `console.error('Failed to delete group:', error)`
   - `console.error('DELETE /api/admin/delegations/groups/[id] error:', e)`

4. **Bootstrap de Employee:**
   - `console.error('Failed to create employee:', insertErr)`

### Como Verificar Logs no Servidor
```bash
# Se estiver usando PM2
pm2 logs

# Se estiver usando Docker
docker logs <container-name>

# Se estiver usando Vercel
vercel logs
```

---

## Próximos Passos

1. **Deploy das Correções:**
   - Fazer commit das mudanças
   - Fazer push para o repositório
   - Deploy no servidor de produção

2. **Testes Pós-Deploy:**
   - Testar criação de grupos
   - Testar edição de grupos
   - Testar deleção de grupos
   - Testar fluxo de bootstrap de employee

3. **Monitoramento:**
   - Verificar logs do servidor após deploy
   - Monitorar erros no console do navegador
   - Verificar se não há mais loops de redirecionamento

---

## Notas Técnicas

### Por que usar getServiceSupabase()?
- O `getServiceSupabase()` usa a chave de serviço (service role key) do Supabase
- Essa chave bypassa todas as políticas de RLS
- Permite que o código do servidor faça autorização manual
- É seguro porque só é usado no servidor, nunca exposto ao cliente

### Autenticação Customizada vs Supabase Auth
- O sistema usa autenticação customizada com JWT próprio
- O Supabase Auth não é usado, então `auth.uid()` sempre retorna `null`
- Por isso, as políticas de RLS que dependem de `auth.uid()` não funcionam
- A solução é usar o service client e fazer autorização manual no código

### Segurança
- A autorização ainda é feita manualmente no código
- Verificamos `requireApiRole(['ADMIN'])` antes de qualquer operação
- Verificamos se o grupo pertence ao tenant do usuário
- O service client só é usado no servidor, nunca exposto ao cliente

---

## Referências

- [Documentação Supabase - Service Role Key](https://supabase.com/docs/guides/api/api-keys)
- [Documentação Supabase - Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js - Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)

