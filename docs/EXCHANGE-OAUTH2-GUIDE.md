# 🔐 Exchange OAuth2 vs SMTP - Guia Completo

**Data**: 2025-10-27  
**Versão**: 1.0.0  
**Status**: 📚 Guia de Implementação (NÃO IMPLEMENTADO)

---

## 🎯 COMPARAÇÃO: SMTP vs OAuth2

### SMTP com Senha (Implementado Atualmente)

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  PontoFlow  │ ─────> │   Exchange   │ ─────> │ Destinatário│
│   (SMTP)    │  587   │    Server    │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
      │
      └─ Credenciais: email + senha
```

**Como funciona:**
1. PontoFlow conecta ao Exchange via SMTP (porta 587)
2. Autentica com email + senha (ou App Password)
3. Envia email diretamente

**Vantagens:**
- ✅ Simples de configurar (5 minutos)
- ✅ Funciona imediatamente
- ✅ Não requer registro no Azure
- ✅ Código já implementado

**Desvantagens:**
- ⚠️ Senha armazenada em variável de ambiente
- ⚠️ Se a senha mudar, precisa reconfigurar
- ⚠️ Menos seguro (senha pode vazar)
- ⚠️ Pode ser bloqueado por políticas de segurança

---

### OAuth2 (NÃO Implementado)

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  PontoFlow  │ ─────> │   Azure AD   │         │   Exchange  │
│             │  Token │              │ ─────> │   Server    │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │
      └─ Client ID + Secret    └─ Access Token (temporário)
```

**Como funciona:**
1. PontoFlow registrado como "App" no Azure AD
2. Obtém token de acesso temporário (válido por 1 hora)
3. Usa token para enviar email via Microsoft Graph API
4. Token expira e é renovado automaticamente

**Vantagens:**
- ✅ Mais seguro (sem senha armazenada)
- ✅ Tokens temporários (expiram em 1 hora)
- ✅ Permissões granulares (só enviar email)
- ✅ Auditoria completa no Azure AD
- ✅ Não afetado por mudança de senha
- ✅ Recomendado pela Microsoft

**Desvantagens:**
- ⚠️ Complexo de configurar (30-60 minutos)
- ⚠️ Requer acesso ao Azure AD
- ⚠️ Requer registro de aplicação
- ⚠️ Código novo precisa ser implementado
- ⚠️ Mais difícil de debugar

---

## 🔄 O QUE MUDARIA NO CÓDIGO

### 1. Dependências (package.json)

**Atual (SMTP):**
```json
{
  "dependencies": {
    "nodemailer": "^6.9.7"
  }
}
```

**Com OAuth2:**
```json
{
  "dependencies": {
    "nodemailer": "^6.9.7",
    "@azure/identity": "^4.0.0",
    "@microsoft/microsoft-graph-client": "^3.0.7",
    "isomorphic-fetch": "^3.0.0"
  }
}
```

---

### 2. Variáveis de Ambiente

**Atual (SMTP):**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=seu-email@empresa.com
SMTP_PASS=sua-senha
MAIL_FROM="PontoFlow <seu-email@empresa.com>"
```

**Com OAuth2:**
```env
# Azure AD App Registration
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email Configuration
MAIL_FROM="PontoFlow <seu-email@empresa.com>"
GRAPH_API_SCOPE=https://graph.microsoft.com/.default
```

---

### 3. Código de Envio de Email

**Atual (SMTP) - `web/src/lib/notifications/email-service.ts`:**
```typescript
import nodemailer from 'nodemailer';

export async function sendEmail({ to, subject, html }: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html
  });
}
```

**Com OAuth2 (NOVO):**
```typescript
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import 'isomorphic-fetch';

// Criar cliente autenticado
function getGraphClient() {
  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID!,
    process.env.AZURE_CLIENT_ID!,
    process.env.AZURE_CLIENT_SECRET!
  );

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken(
          'https://graph.microsoft.com/.default'
        );
        return token.token;
      }
    }
  });
}

export async function sendEmail({ to, subject, html }: {
  to: string;
  subject: string;
  html: string;
}) {
  const client = getGraphClient();

  const message = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: html
      },
      toRecipients: [
        {
          emailAddress: {
            address: to
          }
        }
      ]
    },
    saveToSentItems: true
  };

  // Enviar email usando a conta configurada
  const fromEmail = process.env.MAIL_FROM?.match(/<(.+)>/)?.[1] 
    || process.env.MAIL_FROM;

  await client
    .api(`/users/${fromEmail}/sendMail`)
    .post(message);
}
```

---

### 4. Tratamento de Erros

**Com OAuth2, novos erros possíveis:**

```typescript
export async function sendEmail({ to, subject, html }: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const client = getGraphClient();
    // ... código de envio
  } catch (error: any) {
    // Erros específicos do OAuth2
    if (error.code === 'InvalidAuthenticationToken') {
      console.error('[email-service] Token inválido ou expirado');
      // Token será renovado automaticamente na próxima tentativa
    } else if (error.code === 'MailboxNotEnabledForRESTAPI') {
      console.error('[email-service] Mailbox não habilitado para API');
    } else if (error.code === 'ErrorAccessDenied') {
      console.error('[email-service] Permissões insuficientes');
    } else {
      console.error('[email-service] Erro ao enviar email:', error);
    }
    throw error;
  }
}
```

---

### 5. Configuração no Painel Admin

**Atual (SMTP):**
```typescript
// web/src/components/admin/AdminSystemConfig.tsx
<select value={emailProvider} onChange={(e) => setEmailProvider(e.target.value)}>
  <option value="gmail">Gmail (SMTP)</option>
  <option value="smtp">SMTP Genérico</option>
  <option value="sendgrid">SendGrid</option>
  <option value="ses">Amazon SES</option>
</select>
```

**Com OAuth2 (NOVO):**
```typescript
<select value={emailProvider} onChange={(e) => setEmailProvider(e.target.value)}>
  <option value="gmail">Gmail (SMTP)</option>
  <option value="smtp">SMTP Genérico</option>
  <option value="exchange-oauth2">Exchange (OAuth2)</option> {/* NOVO */}
  <option value="sendgrid">SendGrid</option>
  <option value="ses">Amazon SES</option>
</select>

{emailProvider === 'exchange-oauth2' && (
  <div className="space-y-3">
    <div>
      <label className="block text-sm font-medium mb-1">AZURE_TENANT_ID</label>
      <input
        type="text"
        value={azureTenantId}
        onChange={(e) => setAzureTenantId(e.target.value)}
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        className="w-full rounded border p-2 bg-[var(--input)]"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">AZURE_CLIENT_ID</label>
      <input
        type="text"
        value={azureClientId}
        onChange={(e) => setAzureClientId(e.target.value)}
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        className="w-full rounded border p-2 bg-[var(--input)]"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">AZURE_CLIENT_SECRET</label>
      <input
        type="password"
        value={azureClientSecret}
        onChange={(e) => setAzureClientSecret(e.target.value)}
        placeholder="Client Secret"
        className="w-full rounded border p-2 bg-[var(--input)]"
      />
    </div>
    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
      <p className="text-sm text-blue-800 dark:text-blue-200">
        ℹ️ Para obter essas credenciais, registre o PontoFlow como aplicação no Azure AD.
        <a href="/docs/EXCHANGE-OAUTH2-SETUP.md" className="underline ml-1">
          Ver guia completo
        </a>
      </p>
    </div>
  </div>
)}
```

---

## 🛠️ PASSOS PARA IMPLEMENTAR OAuth2

### Fase 1: Registro no Azure AD (30 min)

1. **Acessar Azure Portal**
   - URL: https://portal.azure.com
   - Login com conta admin do Microsoft 365

2. **Registrar Aplicação**
   - Azure Active Directory > App registrations > New registration
   - Nome: "PontoFlow Email Service"
   - Supported account types: "Single tenant"
   - Redirect URI: Não necessário (daemon app)

3. **Obter Credenciais**
   - Copiar **Application (client) ID**
   - Copiar **Directory (tenant) ID**
   - Certificates & secrets > New client secret
   - Copiar **Client Secret** (só aparece uma vez!)

4. **Configurar Permissões**
   - API permissions > Add a permission
   - Microsoft Graph > Application permissions
   - Adicionar: `Mail.Send` (enviar email como qualquer usuário)
   - **IMPORTANTE**: Clicar em "Grant admin consent"

5. **Habilitar Mailbox**
   - Exchange Admin Center
   - Recipients > Mailboxes
   - Selecionar mailbox que enviará emails
   - Verificar que está habilitado para API

### Fase 2: Implementação no Código (2-3 horas)

1. **Instalar Dependências**
```bash
cd web
npm install @azure/identity @microsoft/microsoft-graph-client isomorphic-fetch
```

2. **Criar Novo Serviço**
```bash
# Criar arquivo
touch src/lib/notifications/email-service-oauth2.ts
```

3. **Implementar Código** (ver seção "Código de Envio de Email" acima)

4. **Atualizar Dispatcher**
```typescript
// web/src/lib/notifications/dispatcher.ts
import { sendEmail as sendEmailSMTP } from './email-service';
import { sendEmail as sendEmailOAuth2 } from './email-service-oauth2';

const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

export async function dispatchNotification(event: Event) {
  const sendEmail = emailProvider === 'oauth2' 
    ? sendEmailOAuth2 
    : sendEmailSMTP;
  
  // ... resto do código
}
```

5. **Adicionar Variáveis de Ambiente**
```env
EMAIL_PROVIDER=oauth2
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
```

### Fase 3: Testes (1 hora)

1. **Teste Unitário**
```typescript
// web/src/__tests__/notifications/oauth2-email.test.ts
import { sendEmail } from '@/lib/notifications/email-service-oauth2';

describe('OAuth2 Email Service', () => {
  it('should send email via Microsoft Graph', async () => {
    await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });
    // Verificar que não lançou erro
  });
});
```

2. **Teste de Integração**
```bash
# Enviar email de teste
curl -X POST http://localhost:3000/api/admin/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"to":"seu-email@example.com","type":"test"}'
```

3. **Verificar Logs**
```bash
# Procurar por:
[email-service] Using OAuth2 provider
[email-service] Email sent successfully via Graph API
```

---

## 📊 COMPARAÇÃO TÉCNICA DETALHADA

| Aspecto | SMTP | OAuth2 |
|---------|------|--------|
| **Segurança** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Facilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Manutenção** | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Auditoria** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Escalabilidade** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Custo** | Grátis | Grátis |
| **Tempo Setup** | 5 min | 30-60 min |
| **Código Novo** | 0 linhas | ~200 linhas |
| **Dependências** | 1 | 4 |

---

## 🎯 QUANDO USAR CADA UM?

### Use SMTP quando:
- ✅ Precisa de algo rápido e simples
- ✅ Está em desenvolvimento/teste
- ✅ Não tem acesso ao Azure AD
- ✅ Volume baixo de emails (< 1000/dia)
- ✅ Segurança não é crítica

### Use OAuth2 quando:
- ✅ Está em produção enterprise
- ✅ Tem políticas de segurança rígidas
- ✅ Precisa de auditoria completa
- ✅ Volume alto de emails (> 1000/dia)
- ✅ Quer permissões granulares
- ✅ Tem equipe de TI para configurar Azure

---

## 💰 CUSTO DE IMPLEMENTAÇÃO

### SMTP (Atual)
- **Tempo**: 0 horas (já implementado)
- **Custo**: R$ 0
- **Manutenção**: Baixa

### OAuth2 (Novo)
- **Tempo**: 4-5 horas
  - 30 min: Registro no Azure
  - 2-3 horas: Implementação
  - 1 hora: Testes
  - 30 min: Documentação
- **Custo**: R$ 0 (Microsoft Graph é grátis)
- **Manutenção**: Média (renovação de secrets a cada 2 anos)

---

## ✅ RECOMENDAÇÃO

### Para a maioria dos casos: **USE SMTP** ✅

**Motivos:**
1. Já está implementado e funcionando
2. Simples de configurar (5 minutos)
3. Suficiente para 99% dos casos
4. Fácil de debugar
5. Sem dependências extras

### Considere OAuth2 apenas se:
- Sua empresa **exige** OAuth2 por política de segurança
- Você precisa de **auditoria detalhada** no Azure AD
- Você tem **volume muito alto** de emails (> 10.000/dia)
- Você tem **equipe de TI** para gerenciar Azure AD

---

## 📞 PRÓXIMOS PASSOS

Se você decidir implementar OAuth2:

1. **Leia este guia completo**
2. **Registre app no Azure AD** (30 min)
3. **Implemente o código** (2-3 horas)
4. **Teste extensivamente** (1 hora)
5. **Documente para sua equipe**

Se você ficar com SMTP:

1. **Configure Exchange SMTP** (5 min)
2. **Teste** (5 min)
3. **Pronto!** ✅

---

## 🎉 CONCLUSÃO

**OAuth2 é mais seguro, mas SMTP é suficiente para a maioria dos casos.**

Para o PontoFlow, **recomendo continuar com SMTP** a menos que você tenha requisitos específicos de segurança enterprise.

Se precisar de ajuda para implementar OAuth2, posso criar o código completo! 🚀


