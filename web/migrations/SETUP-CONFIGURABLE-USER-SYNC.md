# 🎯 Setup: Sincronização Configurável de Usuários

## 📋 Visão Geral

Esta solução permite controlar a sincronização de usuários para `users_unified` através de:
1. **Configuração no Banco de Dados** - Tabela `system_config`
2. **Interface Admin** - Aba "Sincronização de Usuários" nas configurações
3. **Variável de Ambiente** - `ENABLE_USERS_UNIFIED_SYNC` (opcional)

---

## 🚀 Instalação Rápida

### Passo 1: Execute o Script SQL

Abra o **Supabase SQL Editor** e execute:

```sql
-- Arquivo: SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-CONFIGURABLE.sql
```

Este script irá:
- ✅ Criar tabela `system_config`
- ✅ Criar trigger configurável `on_profile_sync_to_users_unified`
- ✅ Criar função `set_users_unified_sync(enabled BOOLEAN)`
- ✅ Ativar sync por padrão (para ABZ Group)

### Passo 2: Execute o Script de Sync Universal

```sql
-- Arquivo: SYNC-AUTH-USERS-TO-PROFILES-TRIGGER.sql
```

Este script sincroniza `auth.users` → `profiles` (necessário para todos os clientes).

### Passo 3: Corrija a Foreign Key

```sql
-- Arquivo: FIX-USER-INVITATIONS-FK-TO-PROFILES.sql
```

Este script muda a FK de `users_unified` para `profiles`.

---

## ⚙️ Configuração

### Opção 1: Via Interface Admin (Recomendado)

1. Acesse: **Admin → Configurações → Sincronização de Usuários**
2. Use o toggle para ativar/desativar
3. Mudanças são aplicadas imediatamente

### Opção 2: Via SQL

```sql
-- Ativar sync
SELECT public.set_users_unified_sync(true);

-- Desativar sync
SELECT public.set_users_unified_sync(false);

-- Verificar status
SELECT * FROM public.system_config WHERE key = 'enable_users_unified_sync';
```

### Opção 3: Via Variável de Ambiente (Opcional)

Adicione ao `.env`:

```bash
# Para ABZ Group
ENABLE_USERS_UNIFIED_SYNC=true

# Para clientes futuros
ENABLE_USERS_UNIFIED_SYNC=false
```

**Nota:** A configuração do banco tem prioridade sobre a variável de ambiente.

---

## 🔍 Como Funciona

### Fluxo de Sincronização

```
┌─────────────┐
│ auth.users  │ (Supabase Auth - PRIMARY)
└──────┬──────┘
       │ Trigger: on_auth_user_created
       ↓
┌─────────────┐
│  profiles   │ (ACTIVE - Todos os clientes)
└──────┬──────┘
       │ Trigger: on_profile_sync_to_users_unified
       │ (CONDICIONAL - Verifica system_config)
       ↓
┌──────────────┐
│users_unified │ (LEGACY - Apenas ABZ Group)
└──────────────┘
```

### Lógica do Trigger

```sql
-- O trigger verifica a configuração antes de sincronizar
SELECT value FROM system_config WHERE key = 'enable_users_unified_sync';

-- Se value = 'true' → Sincroniza para users_unified
-- Se value = 'false' → Pula sincronização
-- Se tabela não existe → Pula sincronização (sem erro)
```

---

## ✅ Verificação

### 1. Verificar Triggers

```sql
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS enabled
FROM pg_trigger
WHERE tgname IN (
  'on_auth_user_created',
  'on_profile_sync_to_users_unified'
);
```

### 2. Verificar Configuração

```sql
SELECT * FROM system_config WHERE key = 'enable_users_unified_sync';
```

### 3. Testar Sincronização

```sql
-- Criar usuário de teste via Supabase Auth
-- Verificar se aparece em profiles
SELECT * FROM profiles WHERE email = 'teste@exemplo.com';

-- Se sync estiver ativado, verificar users_unified
SELECT * FROM users_unified WHERE email = 'teste@exemplo.com';
```

---

## 🎯 Cenários de Uso

### ABZ Group (Atual)

```sql
-- Manter sync ATIVADO
SELECT public.set_users_unified_sync(true);
```

- ✅ Integração com Painel ABZ funciona
- ✅ Convites funcionam sem erro de FK
- ✅ Usuários sincronizados automaticamente

### Clientes Futuros

```sql
-- DESATIVAR sync
SELECT public.set_users_unified_sync(false);
```

- ✅ Usa apenas Supabase Auth (`auth.users` + `profiles`)
- ✅ Sem dependência de `users_unified`
- ✅ Convites funcionam normalmente (FK aponta para `profiles`)

---

## 🔧 Troubleshooting

### Sync não está funcionando

```sql
-- Verificar se trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'on_profile_sync_to_users_unified';

-- Verificar configuração
SELECT * FROM system_config WHERE key = 'enable_users_unified_sync';

-- Reativar sync
SELECT public.set_users_unified_sync(true);
```

### Erro de FK ao criar convite

```sql
-- Verificar FK atual
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE conname = 'user_invitations_invited_by_fkey';

-- Deve apontar para profiles(user_id), não users_unified(id)
```

---

## 📝 Resumo

| Item | Status | Descrição |
|------|--------|-----------|
| ✅ Trigger Universal | Obrigatório | `auth.users` → `profiles` |
| ✅ Trigger Configurável | Opcional | `profiles` → `users_unified` |
| ✅ FK Corrigida | Obrigatório | `invited_by` → `profiles(user_id)` |
| ✅ Interface Admin | Disponível | Controle via UI |
| ✅ Configuração DB | Ativa | `system_config` table |

---

## 🚀 Próximos Passos

1. ✅ Execute os 3 scripts SQL
2. ✅ Acesse Admin → Configurações → Sincronização de Usuários
3. ✅ Verifique que o sync está ATIVADO (para ABZ)
4. ✅ Teste criar um convite
5. ✅ Confirme que funciona sem erro de FK

**Pronto! Seu sistema agora tem sincronização configurável! 🎉**

