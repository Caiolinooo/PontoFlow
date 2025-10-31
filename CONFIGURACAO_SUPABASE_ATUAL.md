# Configurações Supabase Atuais - Timesheet Manager

## 📊 Visão Geral

O projeto Timesheet Manager atualmente possui **UM único projeto Supabase** em funcionamento, não dois projetos distintos (Painel vs Timesheet). Todas as configurações e dados estão concentrados em uma única instância.

### Projeto Principal: Timesheet Manager (Painel + Timesheet)

**URL Base:** `https://arzvingdtnttiejcvucs.supabase.co`

**Identificador do Projeto:** `arzvingdtnttiejcvucs`

---

## 🔐 Chaves de Acesso

### URLs Principais
```
SUPABASE URL: https://arzvingdtnttiejcvucs.supabase.co
REST API: https://arzvingdtnttiejcvucs.supabase.co/rest/v1
GRAPHQL: https://arzvingdtnttiejcvucs.supabase.co/graphql/v1
REALTIME: wss://arzvingdtnttiejcvucs.supabase.co/realtime/v1
```

### Chaves de Autenticação

#### Chave Pública (Anon Key)
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5NDY3MjksImV4cCI6MjA2MDUyMjcyOX0.8OYE8Dg3haAxQ7p3MUiLJE_wiy2rCKsWiszMVwwo1LI
```

#### Service Role Key (Admin)
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk
```

---

## 🌍 Configurações Regionais

### Timezone Padrão
- **Timezone Principal:** `America/Sao_Paulo`
- **Suporte Multi-Timezone:** Implementado via Migration Phase 23
- **Cada tenant pode ter sua própria timezone**

### Localização
- **Locale Padrão:** `pt-BR`
- **Suporte Internacional:** `pt-BR`, `en-GB`
- **i18n:** Implementado com `next-intl`

---

## 📧 Configurações de Email

### SMTP Configuration (Hub Standard)
```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=apiabz@groupabz.com
SMTP_PASS=Abz@2025
MAIL_FROM="PontoFlow" <apiabz@groupabz.com>
```

### Web Push Notifications
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKqeir0wqvsNEWKnKIuJoB644zx7TbxgatHXHDHKc7IqrLHDk-pendAOlrEixnlcdAhBBBMX30JgV-TsZd3Gnao
VAPID_PRIVATE_KEY=dncLwU0xnyyNSv_B3S8TgQ9KHUMmIazcAOzWfXI2VWI
```

---

## 🏗️ Arquitetura do Banco de Dados

### Schema Principal: `public`
O projeto utiliza um único schema `public` com **17 tabelas principais**:

1. **tenants** - Organizações/Clientes
2. **environments** - Ambientes de trabalho por tenant
3. **profiles** - Perfis de usuários (separado do auth.users)
4. **tenant_user_roles** - Roles por tenant
5. **groups** - Grupos de trabalho
6. **manager_group_assignments** - Delegações de gerência
7. **employee_group_members** - Membros de grupos
8. **vessels** - Embarcações
9. **employees** - Funcionários
10. **timesheets** - Folhas de ponto
11. **timesheet_entries** - Entradas das folhas
12. **approvals** - Aprovações
13. **comments** - Comentários
14. **notifications** - Notificações
15. **timesheet_annotations** - Anotações
16. **password_reset_tokens** - Tokens de reset de senha
17. **_migrations** - Controle de migrations

### Sistema Multi-Tenant
- **Separação por tenant_id** em todas as tabelas
- **RLS (Row Level Security)** ativado em todas as tabelas
- **Políticas baseadas em roles:** COLAB, GERENTE, TENANT_ADMIN, ADMIN_GLOBAL

---

## 🔒 Configurações de Segurança

### Row Level Security (RLS)
✅ **Habilitado em todas as 16+ tabelas principais**

### Políticas Implementadas
- **timesheets_employee_select/insert/update** - Controle por empleado
- **timesheets_manager_update** - Controle por gerentes
- **timesheets_tenant_admin_all** - Controle total por admin
- **timesheet_entries_view/modify** - Controle de entradas
- **approvals_select/insert** - Controle de aprovações
- **notifications** - Controle de notificações por usuário

### Funções de Segurança
- `timesheet_deadline()` - Cálculo de prazos
- `timesheet_past_deadline()` - Verificação de prazos
- `get_tenant_timezone()` - Timezone por tenant
- `convert_to_tenant_timezone()` - Conversão de timezone
- `get_user_tenants()` - Tenants do usuário
- `set_tenant_context()` - Contexto de tenant

---

## 📈 Configurações de Performance

### Índices Implementados (Performance Migration)
- **50+ índices especializados** para queries comuns
- **Índices parciais** para status específicos (rascunho, enviado)
- **Índices composite** para joins frequentes
- **Índices de timezone** para suporte multi-região

### Otimizações Next.js
- **Bundle splitting** por vendor/common
- **Image optimization** com WebP/AVIF
- **Compression** habilitada
- **Turbopack** para desenvolvimento
- **SWC compiler** com removal de console

---

## 🔄 Sistema de Migrations

### Migration System
- **Script automático:** `scripts/run-migrations.mjs`
- **Tracking:** Tabela `_migrations`
- **Idempotência:** IF NOT EXISTS em todos os statements
- **Status:** 24+ migrations implementadas

### Migrations Principais
1. **Phase 17:** Push notifications
2. **Phase 18:** Period locks
3. **Phase 19:** Profiles UI theme
4. **Phase 20:** Environment entries (environment_id)
5. **Phase 21:** Multi-tenant employees
6. **Phase 22:** Environment colors + auto-fill
7. **Phase 23:** Tenant timezone support
8. **Phase 24:** In-app notifications
9. **Performance:** Optimization indexes
10. **Password Reset:** Token management

---

## 📦 Storage Configuration

### Configuração de Storage
- **Bucket principal:** `public` (padrão Supabase)
- **Upload files:** Suporte a arquivos via Supabase Storage
- **RLS policies:** Aplicáveis a storage buckets

---

## 🌐 Edge Functions

### Status
- **Não implementadas** neste projeto
- **API Routes:** Next.js API routes como substituto
- **Future:** Possível migração para Edge Functions

---

## 📱 Real-time Subscriptions

### Configuração
- **WebSocket URL:** `wss://arzvingdtnttiejcvucs.supabase.co/realtime/v1`
- **Channels:** Timesheets, notifications, approvals
- **Status:** Configurado mas uso limitado

---

## 🔍 Diferenças: Painel vs Timesheet

### ⚠️ DESCOBERTA IMPORTANTE
**NÃO EXISTEM DOIS PROJETOS SUPABASE DISTINTOS!**

O projeto Timesheet Manager é **UMA ÚNICA APLICAÇÃO** que serve como:
- ✅ **Painel Administrativo** (gerentes, admins)
- ✅ **Interface Timesheet** (empregados, lançamentos)

### Estrutura Unificada
```
📱 Frontend: Next.js (aplicação única)
🗄️ Database: Supabase (projeto único)
🔐 Auth: Supabase Auth (usuários únicos)
📧 Email: Hub Standard SMTP
🔔 Notifications: In-app + Email + Push
```

### Roles e Permissões
- **COLAB:** Visualiza/gerencia próprios timesheets
- **GERENTE:** Visualiza/gerencia timesheets da equipe
- **TENANT_ADMIN:** Controle total do tenant
- **ADMIN_GLOBAL:** Controle total do sistema

---

## 🚀 Configurações de Deploy

### Vercel Configuration
- **Framework:** Next.js 15.5.5
- **Build:** Turbopack opcional
- **Output:** Standalone
- **Analytics:** Vercel Analytics habilitado

### Environment Variables (Production)
```env
NEXT_PUBLIC_SUPABASE_URL=https://arzvingdtnttiejcvucs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]
NEXT_PUBLIC_VAPID_PUBLIC_KEY=[VAPID_PUBLIC_KEY]
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=apiabz@groupabz.com
SMTP_PASS=Abz@2025
MAIL_FROM=PontoFlow <apiabz@groupabz.com>
```

---

## 📊 Resumo Executivo

### Arquitetura Atual
- ✅ **Projeto Supabase único** (não dois projetos)
- ✅ **Aplicação unificada** (Painel + Timesheet)
- ✅ **Multi-tenant** com isolamento por tenant_id
- ✅ **RLS completo** em todas as tabelas
- ✅ **17+ tabelas** bem estruturadas
- ✅ **Performance otimizada** com 50+ índices
- ✅ **24+ migrations** implementadas
- ✅ **Sistema completo** de notificações

### Para Migração (Se Necessário)
Para replicar esta configuração em outro projeto Supabase:

1. **Criar novo projeto** Supabase
2. **Aplicar migrations** na ordem correta
3. **Configurar RLS policies**
4. **Importar configuração** de environment variables
5. **Configurar SMTP** e push notifications
6. **Aplicar índices** de performance

---

**Última atualização:** 2025-10-31  
**Versão:** 1.0.0  
**Status:** ✅ Configuração Completa e Testada