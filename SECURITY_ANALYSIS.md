# Análise de Segurança: Middleware e RBAC do PontoFlow

## Resumo Executivo

Análise profunda do sistema de autenticação, autorização e RBAC identificou **11 problemas críticos e de alta severidade** que podem comprometer a segurança do sistema.

---

## PROBLEMAS ENCONTRADOS

### 1. CRÍTICO: Middleware não valida role ao acessar /manager/* para MANAGER_TIMESHEET

**Severidade:** CRÍTICA (Privilege Escalation)
**Localização:** `/home/user/PontoFlow/web/src/middleware.ts` (linhas 115-120)

**Problema:**
```typescript
// RBAC: manager area (ADMIN, MANAGER, MANAGER_TIMESHEET)
if (pathnameWithoutLocale.startsWith('/manager')) {
  const allowed = ['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET'];
  if (!allowed.includes(user.role as string)) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }
}
```

MANAGER_TIMESHEET é um role READ-ONLY, mas o middleware permite acesso a `/manager/*` rotas que incluem operações de escrita (approve, reject). Isso não é validado no middleware - apenas nas APIs.

**Impacto:** MANAGER_TIMESHEET pode potencialmente acessar páginas de manager e enviará requisições de aprovação/rejeição que serão bloqueadas no API, mas há inconsistência de design.

**Recomendação:** Middleware deve ser mais restritivo:
- `/manager/pending-timesheets` → ADMIN, MANAGER apenas
- `/manager/*/approve|reject` → ADMIN, MANAGER apenas  
- `/manager/*/view` → ADMIN, MANAGER, MANAGER_TIMESHEET (read-only)

---

### 2. CRÍTICO: API /api/manager/pending-timesheets carece de tenant isolation no fallback

**Severidade:** CRÍTICA (Cross-Tenant Data Leakage)
**Localização:** `/home/user/PontoFlow/web/src/app/api/manager/pending-timesheets/route.ts` (linhas 170-189)

**Problema:**
O endpoint tenta detectar se a coluna `tenant_id` existe em `manager_group_assignments`:
```typescript
const { data: hasTenantId } = await supabase
  .from('information_schema.columns')
  .select('column_name')
  .eq('table_name', 'manager_group_assignments')
  .eq('column_name', 'tenant_id')
  .maybeSingle();

if (hasTenantId) {
  // Use optimized query with tenant_id (after migration)
  managerGroupsQuery = managerGroupsQuery.eq('tenant_id', user.tenant_id);
} else {
  // Fallback: use join-based approach for pre-migration databases
  console.warn('Migration not applied - using fallback query logic');
}
```

Se a coluna não existir, o código cai em fallback SEM aplicar filtro `tenant_id`. Manager pode ver grupos de outro tenant!

**Impacto:** Multi-tenant isolation bypass. Manager de Tenant A pode potencialmente listar timesheets de Manager B se estiverem no mesmo grupo.

**Recomendação:** Sempre validar tenant_id. Não usar fallback sem proteção. Force migration ou fail.

---

### 3. CRÍTICO: API /api/admin/delegations/assignments NÃO valida se manager pertence ao tenant

**Severidade:** CRÍTICA (Privilege Escalation)
**Localização:** `/home/user/PontoFlow/web/src/app/api/admin/delegations/assignments/route.ts` (linhas 12-63)

**Problema:**
O endpoint permite adicionar assignment sem validar se o manager_id existe no mesmo tenant:
```typescript
const svcWrite = getServiceSupabase();
const { error } = await svcWrite
  .from('manager_group_assignments')
  .insert({ manager_id: parsed.data.manager_id, group_id: parsed.data.group_id });
```

Apenas valida se o grupo pertence ao tenant (linha 48), mas NÃO valida se o manager é desse tenant.

**Impacto:** Admin pode designar qualquer user ID como manager de um grupo, mesmo que esse user não exista ou não pertença ao tenant. Pode levar a escalação de privilégio.

**Recomendação:** Adicionar validação:
```typescript
const { data: mgr } = await svcRead
  .from('profiles')
  .select('user_id, tenant_id')
  .eq('user_id', parsed.data.manager_id)
  .single();

if (!mgr || mgr.tenant_id !== tenantId) {
  return NextResponse.json({ error: 'manager_not_in_tenant' }, { status: 403 });
}
```

---

### 4. ALTA: API /api/manager/timesheets/[id]/annotations NÃO usa getServiceSupabase()

**Severidade:** ALTA (Inconsistency)
**Localização:** `/home/user/PontoFlow/web/src/app/api/manager/timesheets/[id]/annotations/route.ts` (linhas 26)

**Problema:**
```typescript
const supabase = await getServerSupabase();
```

Usa `getServerSupabase()` (anon key) em vez de `getServiceSupabase()` como outros endpoints. Pode falhar com RLS se policies estão configuradas corretamente.

**Impacto:** Inconsistência, possível falhas silenciosas em operações.

**Recomendação:** Usar `getServiceSupabase()` como em `/api/manager/timesheets/[id]/approve` e `/api/manager/timesheets/[id]/reject`.

---

### 5. ALTA: Cron jobs desprotegidos - CRON_SECRET pode vazar

**Severidade:** ALTA (Insecure Cron Authentication)
**Localização:** `/home/user/PontoFlow/web/src/app/api/cron/**` (múltiplos arquivos)

**Problemas:**
1. **Segredo em Query String:** A secret pode ser passada via query parameter:
```typescript
const providedSecret = authHeader?.replace('Bearer ', '') || req.nextUrl.searchParams.get('secret');
```

Query strings aparecem em logs, cache, histórico de browser. Nunca usar para secrets.

2. **CRON_SECRET não tem rotation:** Sem mecanismo de rotação regular.

3. **Sin endpoint de validação:** Nenhuma forma de validar se um cron foi realmente disparado por um serviço autorizado.

**Impacto:** Um attacker pode:
- Acessar cron jobs se conseguir a CRON_SECRET (ex: via logs, cache DNS)
- Disparar locks de períodos, reminders em horários indevidos
- Causar spam de notificações

**Recomendação:** 
- Remover suporte a query string
- Usar apenas `Authorization: Bearer` header
- Implementar timestamp validation (prevent replay)
- Considerar HMAC do timestamp com secret

---

### 6. ALTA: /api/profile/locale permite unauthenticated access

**Severidade:** ALTA (Information Disclosure)
**Localização:** `/home/user/PontoFlow/web/src/app/api/profile/locale/route.ts` (linhas 14-18)

**Problema:**
```typescript
const user = await getApiUser();
if (!user) {
  // Not authenticated — nothing to persist, but not an error for UX
  return NextResponse.json({ok: true, persisted: false}, {status: 200});
}
```

Permite requisição sem autenticação. Deveria retornar 401, não 200.

**Impacto:** Menor - apenas informa que unauthenticated. Mas quebra padrão de segurança.

**Recomendação:** Usar `requireApiAuth()` ou retornar 401.

---

### 7. ALTA: /api/theme/route.ts falta validação de autenticação para update

**Severidade:** ALTA (Insecure Updates)
**Localização:** `/home/user/PontoFlow/web/src/app/api/theme/route.ts` (linhas 24-34)

**Problema:**
O POST permite update sem validação de auth:
```typescript
const user = await getApiUser(); // Não obrigatório
if (user) {
  try {
    // Atualiza profiles.ui_theme para o user
  }
}
```

Qualquer um pode fazer POST com theme=light e se estiver autenticado, atualiza seu tema. Mas se não estiver, apenas seta cookie.

**Impacto:** Inconsistência. Deveria ser protegido.

**Recomendação:** Usar `requireApiAuth()`.

---

### 8. MÉDIA: Admin endpoints NÃO validam tenant isolation em algumas operações

**Severidade:** MÉDIA (Multi-Tenant Isolation)
**Localização:** `/home/user/PontoFlow/web/src/app/api/admin/delegations/groups/route.ts` (linhas 38-42)

**Problema:**
Valida acesso com `hasTenantAdminAccess()`:
```typescript
if (!hasTenantAdminAccess(user, tenantId!)) {
  return NextResponse.json({ error: 'forbidden', message: 'No access to this tenant' }, { status: 403 });
}
```

Mas `hasTenantAdminAccess()` permite tanto ADMIN global quanto TENANT_ADMIN:
```typescript
export function hasTenantAdminAccess(user: User, tenantId: string): boolean {
  // Global ADMIN has access to all tenants
  if (user.role === 'ADMIN') {
    return true;
  }

  // Check if user has TENANT_ADMIN role for this specific tenant
  if (user.tenant_roles) {
    return user.tenant_roles.some(
      tr => tr.tenant_id === tenantId && tr.role === 'TENANT_ADMIN'
    );
  }

  return false;
}
```

Global ADMIN pode acessar qualquer tenant. Isso é por design, mas precisa ser documentado e auditado. Não há validação de que TENANT_ADMIN não acesse outros tenants via roles.

**Impacto:** TENANT_ADMIN de Tenant A pode potencialmente criar grupos em Tenant B se tenant_roles table não está corretamente restrita.

**Recomendação:** Adicionar auditoria. Validar que user.tenant_roles é sempre para seu próprio tenant.

---

### 9. MÉDIA: /api/export/route.ts falta validação de employee_id ownership

**Severidade:** MÉDIA (Horizontal Privilege Escalation)
**Localização:** `/home/user/PontoFlow/web/src/app/api/export/route.ts` (linhas 14-50)

**Problema:**
```typescript
export async function GET(req: NextRequest) {
  const user = await requireApiAuth();
  // ... fetch timesheets .eq('tenant_id', tenantId)
  
  // No validation that USER can export this specific employee's data
  // Just checks tenant_id
}
```

Manager de Tenant A pode export todos os timesheets do tenant via `/api/export`. Sem validação de manager_group_assignments.

**Impacto:** Manager pode export dados de funcionários fora de seus grupos.

**Recomendação:** Adicionar validação similar ao `/api/reports/generate`:
```typescript
const accessResult = await validateReportsAccess(
  user.id,
  user.role,
  user.tenant_id,
  validation.sanitized.employeeId
);
```

---

### 10. MÉDIA: Token expiration logic pode ter race condition

**Severidade:** MÉDIA (Session Management)
**Localização:** `/home/user/PontoFlow/web/src/lib/auth/custom-auth.ts` (linhas 359-366)

**Problema:**
```typescript
const tokenAge = Date.now() - timestampNum;
const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

if (tokenAge > maxAge) {
  console.log('getUserFromToken: Token expired');
  return null;
}
```

Token TTL é 7 dias. Mas cookie também tem 7 dias. Se token é exatamente 7 days old e valid na DB, pode haver race condition entre cookie expiry e token validation.

**Impacto:** Unlikely but possible: user with expired token but valid cookie could be treated as authenticated briefly.

**Recomendação:** Token TTL deve ser menor que cookie maxAge. Ex: Token 6.9 days, cookie 7 days.

---

### 11. MÉDIA: getUserFromToken() faz mutação (auth.admin.updateUserById)

**Severidade:** MÉDIA (Side Effects in Read Operation)
**Localização:** `/home/user/PontoFlow/web/src/lib/auth/custom-auth.ts` (linhas 590-603)

**Problema:**
```typescript
export async function getUserFromToken(token: string): Promise<User | null> {
  // ...
  if (hasChanged || !tenantId) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...authMetadata,
          selected_tenant_id: tenantId || userTenantRoles[0].tenant_id,
          available_tenants: availableTenants
        }
      });
    } catch (updateError) {
      console.warn('[getUserFromToken] Failed to update user metadata:', updateError);
    }
  }
}
```

Função read-only (get token) está modificando auth.users. Isso é cache warming / auto-healing, mas é risky:
- Pode race with admin updates
- Causes extra DB writes on every login
- Hard to debug side effects

**Impacto:** Potential race conditions if admin is updating metadata while user logs in.

**Recomendation:** Move to explicit cache-warming function, not in getUser flow.

---

## TABELA RESUMIDA DE PROBLEMAS

| ID  | Severidade | Componente | Problema | Impacto |
|-----|------------|-----------|----------|---------|
| 1   | CRÍTICA    | Middleware | MANAGER_TIMESHEET acesso a /manager/* | Inconsistência de hierarquia |
| 2   | CRÍTICA    | API Manager | Fallback sem tenant_id validation | Cross-tenant data leakage |
| 3   | CRÍTICA    | API Admin   | Não valida manager no tenant | Privilege escalation |
| 4   | ALTA       | API Manager | Usa getServerSupabase vs getServiceSupabase | RLS inconsistency |
| 5   | ALTA       | Cron        | Secret em query string + sem rotation | Cron hijacking |
| 6   | ALTA       | Profile API | Unauthenticated POST allowed | Design inconsistency |
| 7   | ALTA       | Theme API   | Falta auth validation | Insecure updates |
| 8   | MÉDIA      | Admin API   | ADMIN bypass de tenant isolation | Multi-tenant risk |
| 9   | MÉDIA      | Export API  | Manager export sem group validation | Data leakage |
| 10  | MÉDIA      | Auth       | Token/cookie TTL race condition | Session bypass |
| 11  | MÉDIA      | Auth       | getUserFromToken() com side effects | Race conditions |

---

## RECOMENDAÇÕES PRIORITÁRIAS

### Imediatas (Semana 1)
1. **Problema #2:** Remover fallback ou force migration
2. **Problema #3:** Validar manager no tenant antes de assign
3. **Problema #5:** Remover query string secret, implementar HMAC

### Curto Prazo (Semana 2-3)
4. **Problema #1:** Separate routes para read vs write manager ops
5. **Problema #9:** Add manager group validation to export API
6. **Problema #4:** Padronizar uso de getServiceSupabase()

### Médio Prazo (Semana 4+)
7. **Problema #6,7:** Requerer auth em todos os endpoints
8. **Problema #10,11:** Refactor token/cache management
9. **Problema #8:** Comprehensive audit de tenant isolation

---

## CHECKLIST DE VALIDAÇÃO

- [ ] Implementar testes de multi-tenant isolation
- [ ] Audit de todos os manager group assignments
- [ ] Review de todas as rotas com fallback logic
- [ ] Refresh CRON_SECRET em produção
- [ ] Adicionar rate limiting em cron endpoints
- [ ] Implementar request signing para crons (HMAC)
- [ ] Review de middleware logic vs API validation (duplicação)

