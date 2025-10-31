# Correção: Sistema de Notificações

## 📋 Problemas Identificados

1. **Erro "Failed to subscribe"** - Ao tentar se inscrever para notificações push
   - Causa: `Could not find the 'subscribed_at' column of 'push_subscriptions'`
2. **Erro na API `/api/notifications/list`** - `column notifications.read does not exist`
3. **Erro na API `/api/notifications/create`** - `Could not find the 'event' column`
4. **Notificações de teste não chegam** - Nem no navegador nem no email

---

## 🔍 Causa Raiz

A tabela `notifications` no banco de dados tem uma estrutura diferente da que o código esperava:

### Estrutura Real da Tabela:
```sql
notifications (
  id UUID,
  user_id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  data JSONB,
  read_at TIMESTAMP,      -- ✅ Existe (timestamp quando foi lida)
  action_url TEXT,
  priority TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP
)
```

### O que o código esperava:
- ❌ `read` (boolean) - **NÃO EXISTE**
- ❌ `event` (string) - **NÃO EXISTE**

---

## ✅ Correções Implementadas

### 1. API `/api/notifications/list/route.ts`

**Antes:**
```typescript
if (unreadOnly) {
  query = query.eq('read', false);  // ❌ Coluna não existe
}

const { count: unreadCount } = await supabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('read', false);  // ❌ Coluna não existe
```

**Depois:**
```typescript
if (unreadOnly) {
  query = query.is('read_at', null);  // ✅ Usa read_at
}

const { count: unreadCount } = await supabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .is('read_at', null);  // ✅ Usa read_at
```

### 2. API `/api/notifications/create/route.ts`

**Antes:**
```typescript
interface NotificationPayload {
  user_id: string;
  type: string;
  event: string;  // ❌ Não existe na tabela
  title: string;
  message: string;
  data?: Record<string, any>;
  expires_at?: string;
}

const notification = {
  user_id: body.user_id,
  type: body.type,
  event: body.event,  // ❌ Não existe
  title: body.title,
  message: body.message,
  data: body.data || {},
  expires_at: body.expires_at || null,
  read: false,  // ❌ Não existe
  created_at: new Date().toISOString()
};
```

**Depois:**
```typescript
interface NotificationPayload {
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  action_url?: string;  // ✅ Existe na tabela
  priority?: 'low' | 'normal' | 'high';  // ✅ Existe na tabela
  expires_at?: string;
}

const notification = {
  user_id: body.user_id,
  type: body.type,
  title: body.title,
  message: body.message,
  data: body.data || {},
  action_url: body.action_url || null,  // ✅ Correto
  priority: body.priority || 'normal',  // ✅ Correto
  expires_at: body.expires_at || null,
  read_at: null,  // ✅ Usa read_at
  created_at: new Date().toISOString()
};
```

### 3. Endpoint de Teste de Email

Adicionado suporte para teste simples de email em `/api/admin/notifications/test`:

```typescript
// Teste simples de email
if (testEmail) {
  await sendEmail({
    to,
    subject: '🧪 Teste de Email - PontoFlow',
    html: `...`
  });
  return NextResponse.json({ success: true, message: 'Email enviado!' });
}
```

### 4. API `/api/notifications/subscribe/route.ts`

**Antes:**
```typescript
const { error } = await supabase.from('push_subscriptions').upsert(
  {
    user_id: user.id,
    endpoint: subscription.endpoint,
    auth: subscription.keys?.auth,
    p256dh: subscription.keys?.p256dh,
    subscribed_at: new Date().toISOString(),  // ❌ Coluna não existe
  },
  { onConflict: 'user_id' }
);
```

**Depois:**
```typescript
const { error } = await supabase.from('push_subscriptions').upsert(
  {
    user_id: user.id,
    endpoint: subscription.endpoint,
    auth: subscription.keys?.auth,
    p256dh: subscription.keys?.p256dh,
    // ✅ Removido subscribed_at - created_at é automático
  },
  { onConflict: 'user_id' }
);
```

**Estrutura Real da Tabela `push_subscriptions`:**
```sql
push_subscriptions (
  id UUID,
  user_id UUID,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMP  -- ✅ Automático (default now())
)
```

### 5. Painel de Teste de Notificações

Atualizado `NotificationTestPanel.tsx` para incluir:
- ✅ Campo de input para email de teste
- ✅ Botão "Enviar Email de Teste"
- ✅ Feedback visual de sucesso/erro

---

## 🧪 Como Testar

### Teste 1: Email

1. **Acesse:** `http://localhost:3000/pt-BR/admin/settings/notifications-test`
2. **Insira seu email** no campo "Email de destino"
3. **Clique em** "📧 Enviar Email de Teste"
4. **Verifique sua caixa de entrada** - Deve receber um email com assunto "🧪 Teste de Email - PontoFlow"

**Se não receber:**
- Verifique as variáveis de ambiente no `.env.local`:
  ```env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=seu-email@gmail.com
  SMTP_PASS=sua-senha-de-app
  MAIL_FROM="PontoFlow <seu-email@gmail.com>"
  ```
- Verifique os logs do servidor para ver o erro específico

### Teste 2: Notificações Push

1. **Acesse:** `http://localhost:3000/pt-BR/settings/notifications`
2. **Clique em "Inscrever"** na seção "Notificações Push"
3. **Permita notificações** quando o navegador solicitar
4. **Verifique:**
   - ✅ Não deve mostrar "Failed to subscribe"
   - ✅ Botão deve mudar para "Desinscrever"
   - ✅ Status deve mostrar "granted"

**Se mostrar "Failed to subscribe":**
- Abra o console do navegador (F12)
- Verifique os logs do servidor
- O erro específico deve aparecer nos logs

### Teste 3: Notificações In-App

1. **Acesse:** `http://localhost:3000/pt-BR/admin/settings/notifications-test`
2. **Clique em qualquer botão de teste:**
   - ✅ Test Approval Notification
   - ❌ Test Rejection Notification
   - ⏰ Test Deadline Reminder
   - 📋 Test Submission Notification
3. **Verifique:**
   - ✅ Toast deve aparecer no canto inferior direito
   - ✅ Badge de notificações no header deve atualizar
   - ✅ Notificação deve aparecer no modal de notificações

---

## 📊 Status das Correções

| Item | Status | Arquivo |
|------|--------|---------|
| Corrigir coluna `read` → `read_at` | ✅ | `web/src/app/api/notifications/list/route.ts` |
| Remover campo `event` | ✅ | `web/src/app/api/notifications/create/route.ts` |
| Adicionar campos `action_url`, `priority` | ✅ | `web/src/app/api/notifications/create/route.ts` |
| Remover campo `subscribed_at` | ✅ | `web/src/app/api/notifications/subscribe/route.ts` |
| Endpoint de teste de email | ✅ | `web/src/app/api/admin/notifications/test/route.ts` |
| Painel de teste de email | ✅ | `web/src/components/notifications/NotificationTestPanel.tsx` |
| Verificar estrutura da tabela | ✅ | `web/check-notifications-table.mjs` |
| Verificar estrutura push_subscriptions | ✅ | `web/check-push-subscriptions-structure.mjs` |

---

## 🔧 Arquivos Modificados

1. `web/src/app/api/notifications/list/route.ts` - Corrigido para usar `read_at`
2. `web/src/app/api/notifications/create/route.ts` - Corrigido para usar estrutura correta
3. `web/src/app/api/notifications/subscribe/route.ts` - Removido campo `subscribed_at`
4. `web/src/app/api/admin/notifications/test/route.ts` - Adicionado teste de email
5. `web/src/components/notifications/NotificationTestPanel.tsx` - Adicionado UI de teste de email

---

## 📝 Arquivos de Diagnóstico Criados

1. `web/check-notifications-table.mjs` - Verifica estrutura da tabela `notifications`
2. `web/check-push-subscriptions.mjs` - Verifica tabela `push_subscriptions`
3. `web/check-push-subscriptions-structure.mjs` - Verifica estrutura detalhada de `push_subscriptions`
4. `web/check-tenant-settings.mjs` - Verifica configurações do tenant

---

## ⚠️ Problemas Pendentes

### 1. Configuração SMTP

**Verificar se as variáveis de ambiente estão configuradas:**

```bash
# No terminal, dentro da pasta web:
node -e "console.log('SMTP_HOST:', process.env.SMTP_HOST); console.log('SMTP_USER:', process.env.SMTP_USER); console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***' : 'NOT SET');"
```

**Se não estiverem configuradas:**
- Edite o arquivo `.env.local`
- Adicione as variáveis SMTP
- Reinicie o servidor

### 2. Service Worker para Push Notifications

**Verificar se o service worker está registrado:**

1. Abra o DevTools (F12)
2. Vá para a aba "Application" → "Service Workers"
3. Deve aparecer `/service-worker.js` como "activated and running"

**Se não estiver:**
- Verifique se o arquivo `public/service-worker.js` existe
- Verifique se há erros no console

### 3. VAPID Keys para Push Notifications

**Verificar se as chaves VAPID estão configuradas:**

```bash
# Verificar no código:
grep -r "VAPID" web/src/lib/push/
```

**Se não estiverem:**
- Gere as chaves VAPID
- Configure no `.env.local`

---

## 🚀 Próximos Passos

1. **Testar email** usando o novo painel de teste
2. **Verificar logs** do servidor para erros específicos
3. **Configurar SMTP** se ainda não estiver configurado
4. **Testar push notifications** após corrigir o subscribe
5. **Testar notificações in-app** usando o painel de teste

---

**Data:** 2025-10-31  
**Autor:** Augment Agent  
**Status:** ✅ CORREÇÕES APLICADAS - AGUARDANDO TESTES

