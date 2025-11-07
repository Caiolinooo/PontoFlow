# ANÁLISE DE IMPACTO - MUDANÇAS PENDENTES

**Data:** 2025-11-07
**Status:** ⚠️ **ANÁLISE PRÉ-IMPLEMENTAÇÃO - AGUARDANDO APROVAÇÃO**

---

## 📋 RESUMO EXECUTIVO

Este documento analisa profundamente os **3 itens pendentes** de implementação, identificando:
- ✅ O que cada mudança fará
- ⚠️ Riscos e possíveis quebras
- 🔍 Dependências e impactos
- 📝 Recomendações de implementação

**IMPORTANTE:** Nenhuma mudança será feita sem aprovação explícita após análise de riscos.

---

## 1️⃣ ITEM 1: IMPLEMENTAR JWT COM HMAC-SHA256

### 📊 Estado Atual

**Arquivo Principal:** `web/src/lib/auth/custom-auth.ts`

**Sistema Atual de Tokens:**
```typescript
// Linha 209 e 305
const token = toBase64(`${userData.id}:${Date.now()}`);
```

**Problemas Identificados:**
- Token é apenas `base64(userId:timestamp)` - facilmente decodificável
- Sem assinatura criptográfica - pode ser forjado
- Sem validação de integridade
- CVSS Score: 9.8 (CRÍTICO)

### 🎯 Mudança Proposta

**Implementar JWT (JSON Web Tokens) com HMAC-SHA256:**
```typescript
import jwt from 'jsonwebtoken';

// Gerar token
const token = jwt.sign(
  {
    userId: userData.id,
    tenant_id: userData.tenant_id,
    role: userData.role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 dias
  },
  process.env.JWT_SECRET!, // Chave secreta obrigatória
  { algorithm: 'HS256' }
);

// Validar token
const decoded = jwt.verify(token, process.env.JWT_SECRET!);
```

### ⚠️ RISCOS E IMPACTOS

#### 🔴 **RISCO ALTO - Sessões Existentes Invalidadas**
- **Impacto:** TODOS os usuários logados serão desconectados
- **Razão:** Tokens antigos (base64) não serão mais válidos
- **Mitigação:** Implementar período de transição com suporte dual

#### 🟠 **RISCO MÉDIO - Dependência de JWT_SECRET**
- **Impacto:** Sistema não inicia sem `JWT_SECRET` configurado
- **Razão:** Chave é obrigatória para assinar tokens
- **Mitigação:** Gerar chave automaticamente em primeira execução

#### 🟡 **RISCO BAIXO - Aumento de Tamanho do Token**
- **Impacto:** Cookies maiores (de ~50 bytes para ~200 bytes)
- **Razão:** JWT contém header + payload + signature
- **Mitigação:** Aceitável - ainda bem abaixo do limite de 4KB

### 📁 Arquivos Afetados

| Arquivo | Tipo de Mudança | Risco de Quebra |
|---------|-----------------|-----------------|
| `web/src/lib/auth/custom-auth.ts` | **MODIFICAÇÃO CRÍTICA** | 🔴 ALTO |
| `web/src/lib/auth/server.ts` | Modificação | 🟡 BAIXO |
| `web/src/middleware.ts` | Modificação | 🟡 BAIXO |
| `.env.example` | Adição de JWT_SECRET | 🟢 NENHUM |
| `package.json` | Adição de `jsonwebtoken` | 🟢 NENHUM |

### 🔧 Funções Afetadas

1. **`signInWithCredentials()`** - Linha 143-266
   - Gera novo token JWT em vez de base64
   - **Risco:** Quebra se JWT_SECRET não estiver configurado

2. **`getUserFromToken()`** - Linha 305-616
   - Valida JWT em vez de decodificar base64
   - **Risco:** Tokens antigos param de funcionar

3. **`getApiUser()`** - Linha 648-661
   - Usa getUserFromToken() internamente
   - **Risco:** Indireto - depende de getUserFromToken()

### 📝 Estratégia de Implementação Segura

#### **OPÇÃO A: Migração Gradual (RECOMENDADO)**
```typescript
// Suporta ambos formatos durante período de transição
function getUserFromToken(token: string) {
  // Tenta JWT primeiro
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return getUserFromJWT(decoded);
  } catch (jwtError) {
    // Fallback para formato antigo (base64) por 7 dias
    console.warn('[AUTH] Using legacy token format - will expire soon');
    return getUserFromLegacyToken(token);
  }
}
```

**Vantagens:**
- ✅ Usuários atuais permanecem logados
- ✅ Novos logins usam JWT
- ✅ Tokens antigos expiram naturalmente em 7 dias

**Desvantagens:**
- ⚠️ Código duplicado temporário
- ⚠️ Precisa remover fallback após período de transição

#### **OPÇÃO B: Migração Imediata (RISCO ALTO)**
```typescript
// Remove completamente suporte a base64
function getUserFromToken(token: string) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET!);
  return getUserFromJWT(decoded);
}
```

**Vantagens:**
- ✅ Código mais limpo
- ✅ Sem dívida técnica

**Desvantagens:**
- 🔴 TODOS os usuários são deslogados IMEDIATAMENTE
- 🔴 Pode causar confusão/reclamações
- 🔴 Não há rollback fácil

### 📊 Estimativa de Esforço

| Tarefa | Tempo Estimado | Complexidade |
|--------|----------------|--------------|
| Implementar JWT básico | 2h | Média |
| Adicionar fallback (Opção A) | 1h | Baixa |
| Testes manuais | 1h | Baixa |
| Documentação | 30min | Baixa |
| **TOTAL (Opção A)** | **4.5h** | - |
| **TOTAL (Opção B)** | **3.5h** | - |

### ✅ Checklist Pré-Implementação

- [ ] Gerar `JWT_SECRET` forte (256 bits)
- [ ] Adicionar `JWT_SECRET` em `.env.example`
- [ ] Instalar `jsonwebtoken` e `@types/jsonwebtoken`
- [ ] Decidir: Opção A (gradual) ou Opção B (imediata)
- [ ] Criar testes para validação de tokens
- [ ] Documentar em CLAUDE.md

---

## 2️⃣ ITEM 2: AJUSTAR EXPORT DE USUÁRIOS (MATRIZ + FILIAIS)

### 📊 Estado Atual

**Arquivo:** `web/src/app/api/admin/sync/users/export/route.ts`

**Código Atual:**
```typescript
// Linha 27-28
const { data, error } = await svc.from('users_unified').select('*');
return NextResponse.json({ users: data ?? [] });
```

**Problema Identificado:**
- Retorna TODOS os usuários de TODOS os tenants sem filtro
- Violação de isolamento multi-tenant
- CVSS Score: 9.8 (CRÍTICO)

### 🤔 DÚVIDA CRÍTICA - PRECISA ESCLARECIMENTO

**Você mencionou:**
> "o export é para exportar tudo mesmo, a ideia é que cada empresa terá a possibilidade de fazer o seu export da sua matriz e filial"

**Interpretações Possíveis:**

#### **INTERPRETAÇÃO A: Tenant = Empresa, Sem Hierarquia**
- Cada tenant representa uma empresa independente
- Ao exportar, retorna apenas usuários do `tenant_id` do admin
- **Não há conceito de matriz/filial** - são tenants separados

**SQL Resultante:**
```sql
SELECT * FROM users_unified WHERE tenant_id = 'xxx'
```

#### **INTERPRETAÇÃO B: Hierarquia de Tenants (Matriz → Filiais)**
- Existe um tenant "matriz" que possui múltiplos tenants "filiais"
- Ao exportar da matriz, retorna matriz + todas as filiais
- **Requer estrutura de relacionamento no banco**

**SQL Resultante:**
```sql
SELECT * FROM users_unified
WHERE tenant_id = 'matriz-id'
   OR tenant_id IN (
     SELECT id FROM tenants WHERE parent_tenant_id = 'matriz-id'
   )
```

**PROBLEMA:** Não encontrei coluna `parent_tenant_id` na tabela `tenants`!

#### **INTERPRETAÇÃO C: Configuração no JSONB `settings`**
- Relacionamento armazenado em `tenants.settings` (JSONB)
- Exemplo: `settings: { company_group: 'ABC123', subsidiaries: ['filial1-id', 'filial2-id'] }`
- **Requer parsing de JSONB**

**SQL Resultante:**
```sql
SELECT * FROM users_unified
WHERE tenant_id IN (
  SELECT id FROM tenants
  WHERE settings->'company_group' = '"ABC123"'
)
```

### ⚠️ ANÁLISE DE RISCOS POR INTERPRETAÇÃO

| Interpretação | Risco de Quebra | Requer Mudanças no Banco | Complexidade |
|---------------|-----------------|--------------------------|--------------|
| **A** (Simples) | 🟢 BAIXO | ❌ Não | Baixa |
| **B** (Parent FK) | 🟠 MÉDIO | ✅ Sim (Migration) | Média |
| **C** (JSONB) | 🟡 BAIXO-MÉDIO | ❌ Não | Média |

### 📝 Implementação Proposta (INTERPRETAÇÃO A - MAIS SEGURA)

**Mudança Mínima e Segura:**
```typescript
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.ADMIN_SYNC_SECRET;
    if (!secret) return NextResponse.json({ error: 'sync_disabled' }, { status: 403 });

    const raw = await req.text();
    const sig = req.headers.get('x-sync-signature');
    if (!verifyHmac(raw, sig, secret)) return NextResponse.json({ error: 'invalid_signature' }, { status: 403 });

    // NOVO: Autenticar e obter tenant do admin
    const user = await getApiUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const svc = getServiceSupabase();

    // SECURITY: Filtrar por tenant do admin
    const { data, error } = await svc
      .from('users_unified')
      .select('*')
      .eq('tenant_id', user.tenant_id); // ← MUDANÇA CRÍTICA

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      users: data ?? [],
      tenant_id: user.tenant_id, // Metadado para confirmar filtro
      exported_at: new Date().toISOString()
    });
  } catch (e) {
    // ...
  }
}
```

**Arquivos Afetados:**
- `web/src/app/api/admin/sync/users/export/route.ts` (MODIFICAÇÃO)

**Risco de Quebra:** 🟢 **BAIXO** - Apenas adiciona filtro

### ❓ PERGUNTAS PARA O USUÁRIO

**ANTES de implementar, preciso saber:**

1. **Existe hierarquia matriz/filial no sistema?**
   - [ ] SIM - Tenants têm relacionamento pai/filho
   - [ ] NÃO - Cada tenant é independente

2. **Se SIM, como é armazenado?**
   - [ ] Coluna `parent_tenant_id` na tabela tenants (precisa criar migration)
   - [ ] No campo `settings` JSONB (qual estrutura?)
   - [ ] Outra forma (qual?)

3. **Comportamento esperado do export:**
   - [ ] Admin exporta apenas seu próprio tenant
   - [ ] Admin da matriz exporta matriz + todas filiais
   - [ ] Admin exporta qualquer tenant (mantém comportamento atual)

### ✅ Checklist Pré-Implementação

- [ ] **AGUARDANDO RESPOSTA DO USUÁRIO**
- [ ] Confirmar interpretação correta
- [ ] Verificar se precisa migration de banco
- [ ] Decidir estrutura de dados (se aplicável)
- [ ] Criar testes para validação

---

## 3️⃣ ITEM 10: SOFT DELETE PARA CASCADING DELETES

### 📊 Estado Atual

**Problema Identificado na Análise:**
- Cascading deletes em `tenants` apagam 50.000+ registros IRREVERSIVELMENTE
- Sem auditoria ou possibilidade de recuperação
- CVSS Score: 8.5 (ALTO)

**Localização:** `web/migrations/03-layer-02-user-environment.sql:72,94`

**Código Atual:**
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ...
);

CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ...
);

-- E mais 20+ tabelas com ON DELETE CASCADE
```

### 🎯 Mudança Proposta

**Implementar Soft Delete:**

#### **Opção 1: Flag `deleted_at`**
```sql
-- Migration: Add soft delete support
ALTER TABLE tenants ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE employees ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE timesheets ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
-- ... para todas as tabelas relevantes

-- Criar índices para performance
CREATE INDEX idx_tenants_deleted_at ON tenants(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_deleted_at ON employees(deleted_at) WHERE deleted_at IS NULL;

-- Modificar RLS policies para ignorar deleted
CREATE POLICY "tenants_select" ON tenants FOR SELECT
  USING (deleted_at IS NULL AND ...);

-- Função helper para soft delete
CREATE OR REPLACE FUNCTION soft_delete_tenant(tenant_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE tenants SET deleted_at = NOW() WHERE id = tenant_uuid;
  UPDATE employees SET deleted_at = NOW() WHERE tenant_id = tenant_uuid;
  UPDATE timesheets SET deleted_at = NOW() WHERE tenant_id = tenant_uuid;
  -- ... etc
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### **Opção 2: Flag `active` (Mais Simples)**
```sql
ALTER TABLE tenants ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE employees ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
-- ...

-- Índices
CREATE INDEX idx_tenants_active ON tenants(active) WHERE active = true;

-- RLS
CREATE POLICY "tenants_select" ON tenants FOR SELECT
  USING (active = true AND ...);
```

### ⚠️ RISCOS E IMPACTOS

#### 🔴 **RISCO ALTO - Mudança de Schema em TODAS as Tabelas**
- **Impacto:** 25+ tabelas precisam ser alteradas
- **Razão:** Precisa adicionar coluna em cada tabela
- **Tempo de Migration:** ~1-2 minutos em produção (pode causar lock)

#### 🔴 **RISCO ALTO - RLS Policies Precisam Atualização**
- **Impacto:** 64 policies precisam incluir filtro `deleted_at IS NULL` ou `active = true`
- **Razão:** Sem isso, registros deletados aparecem nas queries
- **Mitigação:** Usar funções helper consistentes

#### 🟠 **RISCO MÉDIO - Queries Existentes Precisam Adaptação**
- **Impacto:** Queries que não usam RLS (service role) verão dados deletados
- **Razão:** Service role bypassa RLS
- **Mitigação:** Adicionar filtro manualmente em queries admin

#### 🟡 **RISCO BAIXO - Aumento de Espaço em Disco**
- **Impacto:** Dados deletados permanecem no banco
- **Razão:** Não há DELETE real
- **Mitigação:** Implementar job de limpeza após X meses

### 📁 Arquivos Afetados

| Tipo | Quantidade | Risco |
|------|------------|-------|
| Migrations SQL | 1 nova | 🔴 ALTO |
| Tabelas modificadas | ~25 | 🔴 ALTO |
| RLS Policies | ~64 | 🔴 ALTO |
| API routes | ~15 | 🟠 MÉDIO |

### 📝 Estratégia de Implementação Segura

#### **FASE 1: Preparação (Baixo Risco)**
1. Criar migration para adicionar colunas
2. Popular `deleted_at = NULL` ou `active = true` para todos registros existentes
3. **NÃO alterar comportamento ainda**

#### **FASE 2: Atualizar RLS (Médio Risco)**
1. Modificar policies para filtrar por deleted_at/active
2. Testar queries em ambiente de desenvolvimento
3. Validar que nada quebra

#### **FASE 3: Criar Função de Soft Delete (Baixo Risco)**
1. Implementar função `soft_delete_tenant()`
2. Testar em dev com dados fake
3. **NÃO expor em API ainda**

#### **FASE 4: Modificar APIs (Alto Risco)**
1. Trocar DELETE real por chamada para soft_delete
2. Adicionar endpoint de "undelete" (recuperação)
3. Testar exaustivamente

#### **FASE 5: Remover CASCADE (Crítico)**
1. Alterar FK constraints de `ON DELETE CASCADE` para `ON DELETE RESTRICT`
2. **Garante que DELETE acidental não causa dano**

### 📊 Estimativa de Esforço

| Fase | Tempo | Complexidade | Risco |
|------|-------|--------------|-------|
| Fase 1 | 2h | Baixa | 🟢 BAIXO |
| Fase 2 | 4h | Média | 🟠 MÉDIO |
| Fase 3 | 2h | Baixa | 🟢 BAIXO |
| Fase 4 | 3h | Média | 🔴 ALTO |
| Fase 5 | 2h | Média | 🔴 ALTO |
| **TOTAL** | **13h** | - | - |

### ✅ Checklist Pré-Implementação

- [ ] Fazer backup completo do banco antes de qualquer migration
- [ ] Testar migration em ambiente de desenvolvimento primeiro
- [ ] Validar que queries existentes ainda funcionam
- [ ] Criar testes automatizados para soft delete
- [ ] Documentar comportamento de "delete" vs "soft delete"
- [ ] Implementar endpoint de admin para "undelete"
- [ ] Configurar job de limpeza (opcional - após 90 dias)

---

## 🎯 RECOMENDAÇÕES FINAIS

### Ordem de Implementação Sugerida

1. **🟢 ITEM 2 (Export de Usuários) - IMPLEMENTAR PRIMEIRO**
   - Risco: BAIXO
   - Esforço: 1h
   - Benefício: ALTO (resolve vulnerabilidade crítica)
   - **⚠️ AGUARDANDO ESCLARECIMENTO DO USUÁRIO**

2. **🟡 ITEM 1 (JWT) - IMPLEMENTAR SEGUNDO**
   - Risco: MÉDIO (com Opção A - fallback)
   - Esforço: 4.5h
   - Benefício: MUITO ALTO (resolve vulnerabilidade crítica)
   - **Usar Opção A (migração gradual) para minimizar impacto**

3. **🔴 ITEM 10 (Soft Delete) - IMPLEMENTAR POR ÚLTIMO**
   - Risco: ALTO
   - Esforço: 13h
   - Benefício: ALTO (previne perda de dados)
   - **Implementar em 5 fases incrementais**

### Decisões Necessárias ANTES de Implementar

#### ITEM 1 (JWT):
- [ ] Aprovar Opção A (gradual) ou Opção B (imediata)?
- [ ] Gerar e configurar `JWT_SECRET` forte

#### ITEM 2 (Export):
- [ ] **RESPONDER PERGUNTAS SOBRE MATRIZ/FILIAIS**
- [ ] Confirmar interpretação correta

#### ITEM 10 (Soft Delete):
- [ ] Aprovar implementação em fases?
- [ ] Escolher `deleted_at` (Opção 1) ou `active` (Opção 2)?
- [ ] Definir política de retenção de dados deletados

---

## 📞 PRÓXIMOS PASSOS

**Para prosseguir com segurança:**

1. **Revisar este documento completamente**
2. **Responder perguntas marcadas com ❓**
3. **Aprovar ou rejeitar cada mudança proposta**
4. **Escolher opções de implementação preferidas**

**Após aprovação, proceder em ordem:**
- Item 2 → Item 1 → Item 10

**Cada item terá:**
- ✅ Commit separado com testes
- ✅ Documentação atualizada
- ✅ Validação antes de push

---

**⚠️ IMPORTANTE:** Nenhuma linha de código será modificada até que você aprove explicitamente cada mudança após revisar os riscos.

**Status:** 🔴 **AGUARDANDO APROVAÇÃO E ESCLARECIMENTOS**
