# Release Notes - v0.2.6

**Data de Lançamento:** 2025-10-31  
**Versão Anterior:** 0.2.5  
**Branch:** release/web-0.1.1  
**Commit:** d2f8c1c

---

## 🎉 Destaques da Versão

Esta versão traz o **sistema completo de notificações multi-canal**, permitindo que os usuários recebam notificações através de três canais diferentes: in-app, push no navegador e email.

### ✨ Principais Funcionalidades

1. **Sistema de Notificações Multi-Canal**
   - 📱 Notificações in-app com badge e modal
   - 🔔 Notificações push no navegador (Web Push API)
   - 📧 Notificações por email via SMTP

2. **Painel de Teste Completo**
   - Seleção de tipo de notificação
   - Escolha de canais de envio
   - Teste simultâneo em múltiplos canais
   - Feedback detalhado de sucesso/erro

3. **Gerenciamento de Subscrições**
   - Subscribe/unsubscribe funcional
   - Verificação automática de permissões
   - Persistência no banco de dados

---

## 📋 Changelog Detalhado

### Adicionado

#### Sistema de Notificações
- ✅ Notificações in-app com badge no header
- ✅ Modal de visualização de notificações
- ✅ Notificações push no navegador via Web Push API
- ✅ Notificações por email via SMTP configurável
- ✅ Painel de teste completo com seleção de tipo e canal
- ✅ Payloads realistas em português para todos os tipos de notificação

#### Gerenciamento de Subscrições Push
- ✅ Subscribe/unsubscribe funcional com persistência no banco
- ✅ Verificação automática de permissões do navegador
- ✅ Lógica manual de update/insert para compatibilidade com schema
- ✅ Endpoint DELETE para unsubscribe

#### Painel de Teste de Notificações
- ✅ Seleção de tipo de notificação (Aprovada, Rejeitada, Lembrete, Enviada)
- ✅ Checkboxes para escolher canais de envio (Email e/ou Navegador)
- ✅ Teste completo multi-canal simultâneo
- ✅ Teste rápido de email para verificar configuração SMTP
- ✅ Feedback detalhado de sucesso/erro por canal

#### Configurações do Tenant
- ✅ Carregamento automático das configurações atuais do tenant
- ✅ Campos pré-populados com dados existentes do banco
- ✅ Melhor experiência de usuário para edição de configurações

### Corrigido

#### Schema Mismatch nas Tabelas de Notificações
- ✅ Tabela `notifications`: Corrigido uso de `read_at` (timestamp) ao invés de `read` (boolean)
- ✅ Tabela `notifications`: Removido campo `event` que não existe no schema
- ✅ Tabela `notifications`: Adicionados campos `action_url` e `priority` conforme schema
- ✅ Tabela `push_subscriptions`: Removido campo `subscribed_at` inexistente

#### Constraint de push_subscriptions
- ✅ Implementada lógica manual de verificação e update/insert
- ✅ Corrigido erro "no unique or exclusion constraint matching the ON CONFLICT specification"
- ✅ Hook de unsubscribe atualizado para usar método DELETE correto

#### Permissões de Relatórios para MANAGER
- ✅ Manager sem grupos agora vê apenas próprio relatório (como USER)
- ✅ Manager com grupos vê relatórios dos colaboradores dos grupos que gerencia
- ✅ Lógica aplicada tanto em generate quanto em export

#### Mapeamento de Tipo de Dia em Timesheets
- ✅ "Folga" agora mapeia corretamente para "folga" ao invés de "férias"

### Documentação

- ✅ `docs/NOTIFICATIONS-COMPLETE-FIX.md` - Guia completo do sistema de notificações
- ✅ `docs/NOTIFICATIONS-FIX.md` - Detalhes das correções aplicadas
- ✅ `docs/REJECTED-TIMESHEET-NOTIFICATIONS.md` - Sistema de notificações de rejeição
- ✅ `docs/REPORTS-PERMISSIONS-FIX.md` - Correção de permissões de relatórios
- ✅ `docs/ADMIN-SETTINGS-FIX.md` - Correção de configurações do admin
- ✅ `CHANGELOG.md` - Atualizado com v0.2.6 e v0.2.5
- ✅ `README.md` - Adicionado seção "Known Issues" e changelog v0.2.6

---

## 🔧 Arquivos Modificados

### APIs
- `web/src/app/api/notifications/subscribe/route.ts` - Subscribe/unsubscribe
- `web/src/app/api/notifications/list/route.ts` - Listagem de notificações
- `web/src/app/api/notifications/create/route.ts` - Criação de notificações
- `web/src/app/api/admin/notifications/test/route.ts` - Teste de notificações
- `web/src/app/api/reports/generate/route.ts` - Geração de relatórios
- `web/src/app/api/reports/export/route.ts` - Exportação de relatórios
- `web/src/app/api/employee/timesheets/[id]/entries/route.ts` - Entradas de timesheet

### Componentes
- `web/src/components/notifications/NotificationTestPanel.tsx` - Painel de teste
- `web/src/components/admin/AdminTenantSettings.tsx` - Configurações do tenant
- `web/src/app/[locale]/admin/settings/page.tsx` - Página de configurações

### Bibliotecas
- `web/src/lib/push/usePushNotifications.ts` - Hook de push notifications

### Configuração
- `web/package.json` - Versão atualizada para 0.2.6
- `README.md` - Changelog e Known Issues
- `CHANGELOG.md` - Histórico de versões

---

## 🐛 Issues Conhecidas

### Database Schema
- **Missing `notification_preferences` table**: Sistema usa fallback com preferências padrão. Não afeta funcionalidade.
- **Missing `tenant_id` in delegation tables**: Performance de queries pode ser afetada em tenants com muitos grupos. Migração disponível em `docs/migrations/phase-22-add-tenant-to-delegations.sql`.

### Notifications
- **VAPID keys configuration**: Push notifications requerem configuração manual de VAPID keys. Documentação em `docs/NOTIFICATIONS-COMPLETE-FIX.md`.
- **SMTP configuration required**: Email notifications requerem configuração SMTP válida no `.env.local`.

### Performance
- **Redis dependency optional**: Cache service funciona sem Redis, mas performance pode ser melhorada com Redis configurado.

### UI/UX
- **Service Worker registration**: Push notifications podem requerer reload da página após primeira instalação do service worker.

---

## 📦 Instalação e Atualização

### Para Novos Usuários

```bash
# Clone o repositório
git clone https://github.com/Caiolinooo/PontoFlow.git
cd PontoFlow

# Checkout da versão
git checkout v0.2.6

# Instale as dependências
cd web
npm install

# Configure o .env.local
cp .env.example .env.local
# Edite .env.local com suas configurações

# Execute o servidor de desenvolvimento
npm run dev
```

### Para Usuários Existentes

```bash
# Atualize o repositório
git fetch --all --tags

# Checkout da nova versão
git checkout v0.2.6

# Atualize as dependências
cd web
npm install

# Limpe o cache do Next.js
rm -rf .next

# Execute o servidor de desenvolvimento
npm run dev
```

---

## ⚙️ Configuração Necessária

### SMTP para Email Notifications

Adicione ao `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
MAIL_FROM="PontoFlow <seu-email@gmail.com>"
```

### VAPID Keys para Push Notifications

Gere as chaves VAPID e adicione ao `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=sua-chave-publica
VAPID_PRIVATE_KEY=sua-chave-privada
```

---

## 🧪 Como Testar

### 1. Teste de Notificações Completo

1. Acesse: `http://localhost:3000/pt-BR/admin/settings/notifications-test`
2. Selecione o tipo de notificação
3. Insira seu email
4. Marque os canais desejados (Email e/ou Navegador)
5. Clique em "Enviar Notificação de Teste"

### 2. Teste de Email Simples

1. Na mesma página, role até "Teste Rápido de Email"
2. Insira seu email
3. Clique em "Enviar Email de Teste Simples"

### 3. Teste de Push Notifications

1. Acesse: `http://localhost:3000/pt-BR/settings/notifications`
2. Clique em "Inscrever" na seção "Notificações Push"
3. Permita notificações quando o navegador solicitar

---

## 📊 Estatísticas da Release

- **Arquivos modificados:** 197
- **Linhas adicionadas:** 26,060
- **Linhas removidas:** 3,003
- **Novos arquivos:** 115
- **Arquivos deletados:** 3
- **Commits:** 1 (d2f8c1c)

---

## 👥 Contribuidores

- **Caio Correia** (@Caiolinooo) - Desenvolvimento completo

---

## 🔗 Links Úteis

- **Repositório:** https://github.com/Caiolinooo/PontoFlow
- **Issues:** https://github.com/Caiolinooo/PontoFlow/issues
- **Documentação:** `docs/` directory
- **Changelog:** `CHANGELOG.md`

---

## 📝 Notas Adicionais

Esta versão marca um marco importante no desenvolvimento do PontoFlow, trazendo um sistema completo de notificações que melhora significativamente a experiência do usuário e a comunicação dentro da plataforma.

As correções de permissões de relatórios e o sistema de notificações para timesheets rejeitados garantem que os usuários tenham visibilidade adequada e possam agir rapidamente quando necessário.

---

**Desenvolvido com ❤️ por Caio Correia**  
**Data:** 2025-10-31

