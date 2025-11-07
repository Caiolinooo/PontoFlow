# ANÁLISE DE SEGURANÇA - SISTEMA DE NOTIFICAÇÕES PONTOFLOW

## Resumo Executivo

Análise profunda do sistema de notificações do PontoFlow identificou **14 vulnerabilidades**, sendo **3 CRÍTICAS**, **7 ALTAS** e **4 MÉDIAS**.

---

## VULNERABILIDADES ENCONTRADAS

### CRÍTICAS (3)

#### 1. Missing Authentication em /api/notifications/test
**Localização**: `/home/user/PontoFlow/web/src/app/api/notifications/test/route.ts`
**Severidade**: CRÍTICA
**CVSS**: 9.8

**Problema**:
- O endpoint `/api/notifications/test` NÃO possui `requireApiAuth()` ou qualquer verificação de autorização
- Qualquer pessoa, autenticada ou não, pode enviar notificações de teste
- Pode ser explorado para spam massivo ou envio de emails phishing

**Código Vulnerável**:
```typescript
export async function POST(req: NextRequest) {
  try {
    // Sem verificação de autenticação!
    let body = {};
    try {
      body = await req.json();
    } catch (jsonError) {
      return NextResponse.json({
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }
    
    const { type, to, locale = 'pt-BR', data = {} } = body as any;
    // ... continua enviando email sem autenticação
```

**Impacto**:
- Spam de emails não autorizado
- Phishing attacks
- Abuso de recursos SMTP
- Roubo de credenciais via email phishing

**Remediação**:
```typescript
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth(); // ADICIONAR ISTO
    
    // Verificar permissão de ADMIN/MANAGER
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // ... resto do código
```

---

#### 2. Email Header Injection Vulnerability
**Localização**: `/home/user/PontoFlow/web/src/lib/notifications/email-service.ts` (linhas 92-141)
**Severidade**: CRÍTICA
**CVSS**: 8.7

**Problema**:
- O campo `to` (destinatário) NÃO é validado para newlines (`\n`, `\r`)
- Permite injeção de cabeçalhos SMTP adicionais (Cc, Bcc, etc)
- Sem sanitização do input `to`

**Código Vulnerável**:
```typescript
export async function sendEmail({
  to,                 // SEM VALIDAÇÃO!
  subject,
  html,
  tenantId
}: {
  to: string;        // String simples, sem validação
  subject: string;
  html: string;
  tenantId?: string;
}) {
  // ... código que usa `to` diretamente
  await transporter.sendMail({
    from: fromField,
    to,                // INJEÇÃO POSSÍVEL AQUI
    subject,
    html,
    headers: {
      'Message-ID': messageId,
      // ...
    }
  });
}
```

**Exemplo de Exploit**:
```
to = "victim@example.com\nCc: attacker@evil.com\nBcc: attacker@evil.com"
```

**Impacto**:
- Envio de emails para destinatários não autorizados (CC/BCC injection)
- Modificação de headers (Subject, Reply-To, etc)
- SMTP relay attack
- Phishing

**Remediação**:
```typescript
export async function sendEmail({
  to,
  subject,
  html,
  tenantId
}: {
  to: string;
  subject: string;
  html: string;
  tenantId?: string;
}) {
  // VALIDAR E SANITIZAR
  if (!to || /[\r\n]/.test(to)) {
    throw new Error('Invalid email address');
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
    throw new Error('Invalid email format');
  }
  
  const smtp = await getTenantSmtpConfig(tenantId);
  // ... resto do código
```

---

#### 3. Missing Tenant Isolation em /api/notifications/create
**Localização**: `/home/user/PontoFlow/web/src/app/api/notifications/create/route.ts` (linhas 16-66)
**Severidade**: CRÍTICA
**CVSS**: 9.1

**Problema**:
- API permite criar notificações para qualquer usuário (via `body.user_id`)
- Validação verifica apenas se é o próprio usuário OU ADMIN
- Um ADMIN pode criar notificações para usuários de QUALQUER tenant
- Sem verificação de isolamento de tenant

**Código Vulnerável**:
```typescript
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const body: NotificationPayload = await req.json();

    // ...validações...

    // Problema: Permite qualquer user_id se for ADMIN
    if (body.user_id !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notification = {
      user_id: body.user_id,  // Sem verificação de tenant!
      // ...
    };
    
    // Insere sem verificar se user_id é do mesmo tenant
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();
```

**Cenário de Ataque**:
1. ADMIN de Tenant A envia POST /api/notifications/create
2. Define `user_id` como qualquer usuário de Tenant B
3. Cria notificações não autorizadas para outro tenant

**Impacto**:
- Cross-tenant data access
- Criação de notificações não autorizadas
- Privacidade violada
- Compliance (LGPD, GDPR) violation

**Remediação**:
```typescript
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const body: NotificationPayload = await req.json();

    // Validar que user_id é do mesmo tenant (exceto admins globais)
    if (body.user_id !== user.id) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      // Se ADMIN, verificar que target user é do mesmo tenant
      const { data: targetUser } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('id', body.user_id)
        .single();
      
      if (!targetUser || targetUser.tenant_id !== user.tenant_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    // ... resto do código
```

---

### ALTAS (7)

#### 4. HTML/JavaScript Injection em Email Templates
**Localização**: 
- `/home/user/PontoFlow/web/src/lib/notifications/templates/timesheet-rejected.ts` (linhas 34-68)
- `/home/user/PontoFlow/web/src/lib/notifications/templates/timesheet-adjusted.ts` (linhas 37-54)
- `/home/user/PontoFlow/web/src/lib/notifications/templates/deadline-reminder.ts` (linhas 38-60)
- `/home/user/PontoFlow/web/src/lib/notifications/templates/manager-pending-reminder.ts` (linhas 43-61)

**Severidade**: ALTA
**CVSS**: 7.5

**Problema**:
- Dados de usuário inseridos diretamente em HTML sem escaping
- Exemplos: `${data.employeeName}`, `${data.reason}`, `${data.justification}`, `${data.managerName}`
- Se dados contiverem HTML/JS, será renderizado no email client
- Alguns email clients executam JavaScript

**Código Vulnerável** (timesheet-rejected.ts):
```typescript
const content = `
    <p>${t.greeting} ${data.employeeName},</p>  // SEM ESCAPING!
    <p>${t.message}</p>

    <div class="email-highlight">
      <p style="margin: 8px 0;"><strong>${t.period}:</strong> ${data.period}</p>
      <p style="margin: 8px 0;"><strong>${t.manager}:</strong> ${data.managerName}</p>
    </div>

    <p><strong>${t.reason}:</strong></p>
    <p style="background-color: #fef3c7; padding: 12px; border-radius: 4px; border-left: 4px solid #f59e0b;">
      ${data.reason}  // SEM ESCAPING!
    </p>

    ${annotationsHtml}

    <p style="margin-top: 30px; color: #666; font-size: 13px;">
      Por favor, revise as correções necessárias e reenvie seu timesheet assim que possível.
    </p>

    <p style="margin-top: 20px; color: #666; font-size: 13px;">
      ${t.regards},<br>
      <strong>PontoFlow - Timesheet Manager</strong>
    </p>
  `;
```

**Exemplo de Payload**:
```
employeeName = "<img src=x onerror='alert(1)'>"
reason = "<script>alert('XSS')</script>"
managerName = "<a href='javascript:alert(1)'>click</a>"
```

**Impacto**:
- XSS em email clients
- Roubo de cookies/tokens
- Phishing via email
- Malware distribution

**Remediação**:
```typescript
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

const content = `
    <p>${t.greeting} ${escapeHtml(data.employeeName)},</p>
    <p>${t.message}</p>

    <div class="email-highlight">
      <p style="margin: 8px 0;"><strong>${t.period}:</strong> ${escapeHtml(data.period)}</p>
      <p style="margin: 8px 0;"><strong>${t.manager}:</strong> ${escapeHtml(data.managerName)}</p>
    </div>

    <p><strong>${t.reason}:</strong></p>
    <p style="background-color: #fef3c7; padding: 12px; border-radius: 4px; border-left: 4px solid #f59e0b;">
      ${escapeHtml(data.reason)}
    </p>
    // ... resto
`;
```

---

#### 5. Sensitive Data Logging in Push Subscriptions
**Localização**: `/home/user/PontoFlow/web/src/app/api/notifications/subscribe/route.ts` (linhas 22-23, 85)
**Severidade**: ALTA
**CVSS**: 7.2

**Problema**:
- Dados de subscription (endpoint, auth keys) são logados em console.log
- User ID e email também são logados
- Logs podem ser expostos em arquivos de log público
- Endpoints de subscription Push Notifications podem ser usados para rastrear usuários

**Código Vulnerável**:
```typescript
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const subscription = await req.json();
    const supabase = getSupabase();

    console.log('[SUBSCRIBE] User:', user.id, user.email);  // EXPOSED!
    console.log('[SUBSCRIBE] Subscription:', subscription);  // EXPOSED!

    if (!subscription.endpoint) {
      console.log('[SUBSCRIBE] ERROR: No endpoint provided');
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    
    // ... database operations ...
    
    console.log('[SUBSCRIBE] Success!');  // OK
  } catch (err) {
    console.log('[SUBSCRIBE] Caught error:', err);  // Pode expor stacks
    // ...
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const supabase = getSupabase();

    console.log('[UNSUBSCRIBE] User:', user.id, user.email);  // EXPOSED!
    // ...
  }
}
```

**Impacto**:
- Exposição de IDs de usuário em logs públicos
- Rastreamento de push subscriptions
- Privacy violation
- Endpoints de subscription podem ser usados para fingerprinting

**Remediação**:
```typescript
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const subscription = await req.json();
    const supabase = getSupabase();

    // REMOVER ou usar apenas em development
    if (process.env.NODE_ENV === 'development') {
      console.log('[SUBSCRIBE] User ID:', user.id.substring(0, 8) + '***');
      console.log('[SUBSCRIBE] Subscription endpoint hash:', 
        require('crypto').createHash('sha256').update(subscription.endpoint).digest('hex'));
    }

    if (!subscription.endpoint) {
      console.warn('[SUBSCRIBE] Invalid subscription provided');
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    // ... resto do código
```

---

#### 6. Unvalidated Redirect in Email URLs
**Localização**: 
- `/home/user/PontoFlow/web/src/lib/notifications/email-layout.ts` (linha 80)
- `/home/user/PontoFlow/web/src/lib/notifications/templates/*.ts` (múltiplos `ctaUrl`)

**Severidade**: ALTA
**CVSS**: 7.0

**Problema**:
- URLs em emails (ctaUrl) não são validadas
- Se URLs forem construídas a partir de input de usuário ou banco de dados comprometido, pode-se fazer phishing
- Email clients confiam em links de emails

**Código Vulnerável** (email-layout.ts):
```typescript
const ctaButton = ctaUrl && ctaText ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${ctaUrl}" style="
        display: inline-block;
        background-color: ${emailConfig.primaryColor};
        color: white;
        text-decoration: none;
        padding: 12px 30px;
        border-radius: 6px;
        font-weight: bold;
        font-size: 16px;
      ">${ctaText}</a>  // URL não validada!
    </div>
  ` : '';
```

**Exemplo de Payload**:
```
ctaUrl = "javascript:alert(1)"
ctaUrl = "https://attacker.com/phishing"
ctaUrl = "data:text/html,<script>...</script>"
```

**Impacto**:
- Phishing attacks
- Roubo de credenciais
- Redirecionamento para sites maliciosos
- Execução de código (javascript:)

**Remediação**:
```typescript
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

const ctaButton = ctaUrl && ctaText && isValidUrl(ctaUrl) ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(ctaUrl)}" style="
        display: inline-block;
        background-color: ${emailConfig.primaryColor};
        color: white;
        text-decoration: none;
        padding: 12px 30px;
        border-radius: 6px;
        font-weight: bold;
        font-size: 16px;
      ">${escapeHtml(ctaText)}</a>
    </div>
  ` : '';
```

---

#### 7. Insufficient Push Subscription Validation
**Localização**: `/home/user/PontoFlow/web/src/app/api/notifications/subscribe/route.ts` (linhas 25-28)
**Severidade**: ALTA
**CVSS**: 6.8

**Problema**:
- Apenas verifica se `endpoint` existe
- Sem validação de formato ou origem da URL
- `auth` e `p256dh` não são validados
- Pode permitir injeção de dados malformados

**Código Vulnerável**:
```typescript
if (!subscription.endpoint) {
  console.log('[SUBSCRIBE] ERROR: No endpoint provided');
  return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
}

// Nenhuma validação além de existência!

// Insert new subscription
const { error: insertError } = await supabase
  .from('push_subscriptions')
  .insert({
    user_id: user.id,
    endpoint: subscription.endpoint,      // SEM VALIDAÇÃO
    auth: subscription.keys?.auth,        // SEM VALIDAÇÃO
    p256dh: subscription.keys?.p256dh,   // SEM VALIDAÇÃO
  });
```

**Impacto**:
- Armazenamento de dados inválidos
- Possível exploitation via injeção SQL (se não houver tipagem no Supabase)
- DoS via armazenamento de muitos endpoints inválidos

**Remediação**:
```typescript
function isValidSubscription(subscription: any): boolean {
  if (!subscription || typeof subscription !== 'object') return false;
  
  const { endpoint, keys } = subscription;
  
  // Validar endpoint
  if (!endpoint || typeof endpoint !== 'string') return false;
  if (!endpoint.startsWith('https://')) return false;
  if (endpoint.length > 500) return false; // tamanho razoável
  
  // Validar keys
  if (!keys || typeof keys !== 'object') return false;
  if (!keys.auth || typeof keys.auth !== 'string') return false;
  if (!keys.p256dh || typeof keys.p256dh !== 'string') return false;
  if (keys.auth.length > 100 || keys.p256dh.length > 100) return false;
  
  return true;
}

if (!isValidSubscription(subscription)) {
  return NextResponse.json({ error: 'Invalid subscription format' }, { status: 400 });
}
```

---

#### 8. Missing Rate Limiting on Notification APIs
**Localização**: 
- `/home/user/PontoFlow/web/src/app/api/notifications/create/route.ts`
- `/home/user/PontoFlow/web/src/app/api/notifications/test/route.ts`
- `/home/user/PontoFlow/web/src/app/api/notifications/subscribe/route.ts`
- `/home/user/PontoFlow/web/src/app/api/notifications/send/route.ts`

**Severidade**: ALTA
**CVSS**: 6.5

**Problema**:
- Sem rate limiting em qualquer endpoint de notificação
- Usuários podem fazer spam de requisições
- `/api/notifications/test` sem auth é particularmente explorado
- Possível DoS enviando muitos emails

**Cenários de Ataque**:
1. Spam ilimitado via `/api/notifications/test` (unauthenticated)
2. Spam de criação de notificações via `/api/notifications/create`
3. Spam de subscriptions via `/api/notifications/subscribe`
4. Spam de push notifications via `/api/notifications/send`

**Impacto**:
- Email/SMTP overload
- Database DoS
- Resource exhaustion
- Service unavailability

**Remediação**:
Implementar rate limiting middleware:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  analytics: true,
});

export async function POST(req: NextRequest) {
  const identifier = req.headers.get('x-forwarded-for') || 'unknown';
  
  const { success } = await ratelimit.limit(identifier);
  
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  
  // ... resto do código
}
```

---

#### 9. Insecure Push Notification Logging
**Localização**: `/home/user/PontoFlow/web/src/app/api/notifications/send/route.ts` (linhas 71-74)
**Severidade**: ALTA
**CVSS**: 6.5

**Problema**:
- Endpoint de push subscriptions é logado em formato legível
- Chaves de encriptação (auth, p256dh) podem ser expostas em logs
- Informações sensíveis podem ser armazenadas em logs públicos

**Código Vulnerável**:
```typescript
async function sendPushNotification(
  subscription: { endpoint: string },
  payload: { title: string; body: string; data: Record<string, unknown> }
): Promise<boolean> {
  try {
    // In production, use web-push library
    // For now, just log
    console.log('Sending push notification:', {
      endpoint: subscription.endpoint,    // EXPOSED!
      payload,                             // Pode conter dados sensíveis
    });

    return true;
  } catch (err) {
    console.error('Error sending push notification:', err);
    return false;
  }
}
```

**Impacto**:
- Exposição de endpoints em logs
- Exposição de dados de notificação
- Privacy violation
- Information disclosure

**Remediação**:
```typescript
async function sendPushNotification(
  subscription: { endpoint: string },
  payload: { title: string; body: string; data: Record<string, unknown> }
): Promise<boolean> {
  try {
    // Usar web-push library
    const webpush = require('web-push');
    
    await webpush.sendNotification(subscription, JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/icon-192x192.png',
    }));

    // Log apenas em desenvolvimento e sem dados sensíveis
    if (process.env.NODE_ENV === 'development') {
      const endpointHash = require('crypto')
        .createHash('sha256')
        .update(subscription.endpoint)
        .digest('hex')
        .substring(0, 8);
      console.log(`[PUSH] Notification sent to ${endpointHash}`);
    }

    return true;
  } catch (err) {
    console.error('[PUSH] Error sending notification:', 
      err instanceof Error ? err.message : 'Unknown error');
    return false;
  }
}
```

---

### MÉDIAS (4)

#### 10. Missing SMTP Password Validation
**Localização**: `/home/user/PontoFlow/web/src/lib/notifications/email-service.ts` (linhas 64-71)
**Severidade**: MÉDIA
**CVSS**: 5.3

**Problema**:
- Erro de decryption com tenantId é logado
- Sem timeout/retry limit para decryption
- Falha de decryption cai silenciosamente para default SMTP

**Código Vulnerável**:
```typescript
// Decrypt password
let decryptedPassword: string;
try {
  decryptedPassword = decryptSmtpPassword(password_encrypted);
} catch (decryptError) {
  console.error(`[email-service] Failed to decrypt SMTP password for tenant ${tenantId}:`, decryptError);
  return defaultSmtp;  // Cai silenciosamente!
}
```

**Impacto**:
- Exposição de tenantId em logs de erro
- Falha silenciosa pode ocultar problemas
- Emails podem ir para default SMTP sem aviso
- Debugging difícil

**Remediação**:
```typescript
let decryptedPassword: string;
try {
  decryptedPassword = decryptSmtpPassword(password_encrypted);
  if (!decryptedPassword || decryptedPassword.trim().length === 0) {
    throw new Error('Decrypted password is empty');
  }
} catch (decryptError) {
  // Log apenas error type, não tenantId
  console.error('[email-service] Failed to decrypt tenant SMTP configuration');
  // Alert admin ou enviar métrica de erro
  return defaultSmtp;
}
```

---

#### 11. XSS Risk in Annotation Messages
**Localização**: `/home/user/PontoFlow/web/src/lib/notifications/templates/timesheet-rejected.ts` (linhas 43-50)
**Severidade**: MÉDIA
**CVSS**: 5.5

**Problema**:
- Annotation messages são inseridas sem escaping em email
- Campo `message` pode conter HTML/JS
- Embora menos provável, ainda é vulnerável

**Código Vulnerável**:
```typescript
const annotationsHtml = data.annotations?.length
    ? `
      <div class="email-highlight">
        <strong>${t.corrections}:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${data.annotations
            .map(a => `
              <li style="margin: 8px 0; font-size: 14px;">
                ${a.field ? `<strong>[${a.field}]</strong> ` : ''}${a.message}  // SEM ESCAPING!
              </li>
            `)
            .join('')}
        </ul>
      </div>
    `
    : '';
```

**Impacto**:
- Possível XSS se messages vierem de source não confiável
- Menos provável que nomes de usuário, mas ainda risco

**Remediação**:
Usar função de escaping em todas as anotações:
```typescript
const annotationsHtml = data.annotations?.length
    ? `
      <div class="email-highlight">
        <strong>${t.corrections}:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${data.annotations
            .map(a => `
              <li style="margin: 8px 0; font-size: 14px;">
                ${a.field ? `<strong>[${escapeHtml(a.field)}]</strong> ` : ''}${escapeHtml(a.message)}
              </li>
            `)
            .join('')}
        </ul>
      </div>
    `
    : '';
```

---

#### 12. Missing Error Handling in Notification Dispatcher
**Localização**: `/home/user/PontoFlow/web/src/lib/notifications/dispatcher.ts` (linhas 20-116)
**Severidade**: MÉDIA
**CVSS**: 5.0

**Problema**:
- Função `dispatchNotification()` não tem try-catch
- Se `getTenantBranding()` falhar, exception bubbles up sem tratamento
- Múltiplos try-catch aninhados com fallback vago

**Código Vulnerável**:
```typescript
export async function dispatchNotification(event: Event) {
  switch (event.type) {
    case 'timesheet_rejected': {
      let companyName: string | undefined;
      let logoUrl: string | undefined;
      const anyPayload: any = (event as any).payload;
      try {
        if (anyPayload?.tenantId) {
          const branding = await getTenantBranding(anyPayload.tenantId);
          companyName = branding.companyNameOverride || branding.tenantName;
          logoUrl = branding.logoUrl;
        }
      } catch {}  // Silenciosamente ignora erros!
      // ... continua mesmo se branding falhar
```

**Impacto**:
- Falha silenciosa pode occultar problemas
- Notificações podem ser enviadas com dados incompletos
- Debugging difícil
- Sem observabilidade de falhas

**Remediação**:
```typescript
export async function dispatchNotification(event: Event) {
  try {
    switch (event.type) {
      case 'timesheet_rejected': {
        let companyName: string | undefined;
        let logoUrl: string | undefined;
        const anyPayload: any = (event as any).payload;
        try {
          if (anyPayload?.tenantId) {
            const branding = await getTenantBranding(anyPayload.tenantId);
            companyName = branding.companyNameOverride || branding.tenantName;
            logoUrl = branding.logoUrl;
          }
        } catch (brandingError) {
          console.warn('[dispatcher] Failed to fetch tenant branding, using defaults', 
            { tenantId: anyPayload?.tenantId });
          // Continua com defaults
        }
        // ... resto
      }
      // ...
    }
  } catch (err) {
    console.error('[dispatcher] Fatal error dispatching notification', err);
    throw err;  // Propagar para caller
  }
}
```

---

#### 13. Weak Validation in In-App Notification
**Localização**: `/home/user/PontoFlow/web/src/lib/notifications/in-app-dispatcher.ts` (linhas 50-57)
**Severidade**: MÉDIA
**CVSS**: 4.8

**Problema**:
- Payload inteiro é passado para notificação persistente sem validação
- Pode conter dados inesperados
- Sem schema validation

**Código Vulnerável**:
```typescript
// Also create persistent notification
await this.createPersistentNotification(userId, {
  type: 'in_app',
  event,
  title,
  message: body,
  data: event.payload  // PAYLOAD NÃO VALIDADO!
});
```

**Impacto**:
- Armazenamento de dados inválidos
- Possível exploitation via payload injection
- Data integrity issues

**Remediação**:
```typescript
// Schema validation
const validPayloadSchema = {
  type: 'object',
  properties: {
    // Whitelist campos esperados
    employeeName: { type: 'string' },
    period: { type: 'string' },
    managerName: { type: 'string' },
    // ...
  },
  additionalProperties: false,
};

// Validar antes de armazenar
const validatedPayload = validatePayload(event.payload, validPayloadSchema);

await this.createPersistentNotification(userId, {
  type: 'in_app',
  event,
  title,
  message: body,
  data: validatedPayload  // Validado!
});
```

---

#### 14. Potential ReDoS in In-App Notifications
**Localização**: `/home/user/PontoFlow/web/src/lib/notifications/in-app-notifications.ts` (linhas 179-194)
**Severidade**: MÉDIA
**CVSS**: 4.6

**Problema**:
- Retry logic com exponential backoff pode causar cascading failures
- Sem limite máximo de retry duration
- Se todos os clientes retentarem simultaneamente = DoS

**Código Vulnerável**:
```typescript
const loadUnreadCount = React.useCallback(async (retryCount = 0) => {
    try {
      setIsLoading(true);
      setError(null);
      const count = await notificationManager.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn('Failed to load unread count:', errorMessage);
      setError(errorMessage);

      // Retry logic for network errors (max 3 retries with exponential backoff)
      if (retryCount < 3 && errorMessage.includes('fetch')) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        setTimeout(() => loadUnreadCount(retryCount + 1), delay);  // Potencial ReDoS
      }
    } finally {
      setIsLoading(false);
    }
  }, []);
```

**Impacto**:
- Cascading failures durante network outages
- Thundering herd problem
- DoS em API de notificações

**Remediação**:
```typescript
const loadUnreadCount = React.useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const MAX_RETRY_DELAY = 32000; // 32 segundos max
    
    try {
      setIsLoading(true);
      setError(null);
      const count = await notificationManager.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn('Failed to load unread count:', errorMessage);
      setError(errorMessage);

      // Retry logic with jitter
      if (retryCount < MAX_RETRIES && errorMessage.includes('fetch')) {
        const delay = Math.min(
          Math.pow(2, retryCount) * 1000 + Math.random() * 1000,
          MAX_RETRY_DELAY
        );
        setTimeout(() => loadUnreadCount(retryCount + 1), delay);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);
```

---

## RESUMO DE VULNERABILIDADES

| # | Tipo | Severidade | Localização | Status |
|---|------|-----------|------------|--------|
| 1 | Missing Auth - /api/notifications/test | CRÍTICA | test/route.ts | Não remediado |
| 2 | Email Header Injection | CRÍTICA | email-service.ts | Não remediado |
| 3 | Missing Tenant Isolation | CRÍTICA | notifications/create | Não remediado |
| 4 | HTML/JS Injection em Templates | ALTA | templates/*.ts | Não remediado |
| 5 | Sensitive Data Logging | ALTA | subscribe/route.ts | Não remediado |
| 6 | Unvalidated Redirect | ALTA | email-layout.ts | Não remediado |
| 7 | Weak Subscription Validation | ALTA | subscribe/route.ts | Não remediado |
| 8 | Missing Rate Limiting | ALTA | api/notifications/* | Não remediado |
| 9 | Insecure Push Logging | ALTA | send/route.ts | Não remediado |
| 10 | SMTP Password Handling | MÉDIA | email-service.ts | Não remediado |
| 11 | Annotation XSS | MÉDIA | timesheet-rejected.ts | Não remediado |
| 12 | Error Handling | MÉDIA | dispatcher.ts | Não remediado |
| 13 | Payload Validation | MÉDIA | in-app-dispatcher.ts | Não remediado |
| 14 | Retry Logic ReDoS | MÉDIA | in-app-notifications.ts | Não remediado |

---

## RECOMENDAÇÕES PRIORITÁRIAS

### Imediato (24 horas):
1. **Adicionar `requireApiAuth()` em `/api/notifications/test`**
2. **Validar campo `to` para Email Header Injection**
3. **Adicionar tenant isolation check em `/api/notifications/create`**

### Curto Prazo (1 semana):
4. Implementar função `escapeHtml()` em todos os templates
5. Remover console.log() com dados sensíveis
6. Validar URLs em emails (ctaUrl, resetUrl)
7. Melhorar validação de subscriptions

### Médio Prazo (2 semanas):
8. Implementar rate limiting
9. Melhorar error handling
10. Adicionar schema validation
11. Melhorar retry logic

---

## COMPLIANCE IMPACT

- **GDPR**: Violação Artigo 32 (security measures) - Vulnerabilidades de auth
- **LGPD**: Violação Artigo 46 (security) - Logging de dados sensíveis
- **PCI-DSS**: Não aplicável (sem dados de cartão)
- **ISO 27001**: Múltiplas violações em controles de acesso e criptografia

---

## CONCLUSÃO

O sistema de notificações do PontoFlow possui vulnerabilidades significativas, especialmente nas áreas de:
- Autenticação e autorização
- Sanitização de entrada
- Isolamento de tenant
- Validação de dados

**Recomendação**: Priorizar remediação das vulnerabilidades CRÍTICAS imediatamente, seguida das ALTAS em uma semana.

