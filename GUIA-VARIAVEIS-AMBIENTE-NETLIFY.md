# 🔐 Guia de Configuração - Variáveis de Ambiente (Netlify)

## ❌ Problema: Login não funciona em produção

Se você consegue logar mas é redirecionado de volta para o login, o problema são **variáveis de ambiente faltando** no Netlify.

---

## ✅ Solução: Configurar Variáveis de Ambiente

### Passo 1: Acessar o Netlify Dashboard

1. Acesse: https://app.netlify.com/
2. Clique no seu site
3. Vá em: **Site settings** → **Environment variables**

---

### Passo 2: Adicionar Variáveis OBRIGATÓRIAS

**Copie e cole estas variáveis no painel do Netlify:**

#### 1. **Supabase (OBRIGATÓRIO)**

```bash
# URL do seu projeto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co

# Anon key (pública)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Service role key (CRÍTICA!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

**Onde encontrar**:
- Vá em: https://supabase.com/dashboard/project/SEU_PROJETO/settings/api
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **NÃO compartilhe!**

---

#### 2. **JWT Secret (OBRIGATÓRIO para segurança)**

```bash
# Gere um secret aleatório (mínimo 32 caracteres)
JWT_SECRET=
```

**Como gerar** (rode no terminal):
```bash
openssl rand -hex 32
```

Copie o resultado e cole no Netlify.

---

#### 3. **CRON Secret (já configurado)**

```bash
CRON_SECRET=e4d2134efbc41b898046abac5d0a9ff8c7e458e41d4dcf2b74a58a02b2bd1a0b
```

---

#### 4. **URL Base (opcional mas recomendado)**

```bash
# URL do seu site no Netlify
NEXT_PUBLIC_BASE_URL=https://seu-site.netlify.app
```

---

#### 5. **SMTP (opcional - para emails)**

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
MAIL_FROM="PontoFlow <no-reply@seu-dominio.com>"
```

---

#### 6. **VAPID (opcional - para push notifications)**

```bash
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

**Como gerar** (rode no projeto):
```bash
npx web-push generate-vapid-keys
```

---

### Passo 3: Variáveis de Ambiente Completas

Aqui está a lista completa para copiar no Netlify:

```bash
# Supabase (OBRIGATÓRIO)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# JWT (OBRIGATÓRIO)
JWT_SECRET=cole-aqui-32-chars-hex

# CRON (já configurado)
CRON_SECRET=e4d2134efbc41b898046abac5d0a9ff8c7e458e41d4dcf2b74a58a02b2bd1a0b

# Base URL
NEXT_PUBLIC_BASE_URL=https://seu-site.netlify.app

# SMTP (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
MAIL_FROM="PontoFlow <no-reply@dominio.com>"

# VAPID (opcional)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# i18n
NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR
NEXT_PUBLIC_AVAILABLE_LOCALES=pt-BR,en-GB
```

---

### Passo 4: Fazer Redeploy

Após adicionar as variáveis:

1. Vá em: **Deploys**
2. Clique em: **Trigger deploy** → **Deploy site**
3. Aguarde o build completar (~2 min)

---

## 🧪 Como Testar

### 1. Verificar se as variáveis foram aplicadas

Crie um arquivo de teste `web/src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: !!process.env.JWT_SECRET,
    cronSecret: !!process.env.CRON_SECRET,
  };

  const allOk = Object.values(checks).every(v => v);

  return NextResponse.json({
    status: allOk ? 'healthy' : 'unhealthy',
    checks,
    message: allOk
      ? 'All environment variables configured correctly'
      : 'Some environment variables are missing'
  });
}
```

Depois acesse: `https://seu-site.netlify.app/api/health`

**Resultado esperado:**
```json
{
  "status": "healthy",
  "checks": {
    "supabaseUrl": true,
    "supabaseAnon": true,
    "supabaseService": true,
    "jwtSecret": true,
    "cronSecret": true
  },
  "message": "All environment variables configured correctly"
}
```

### 2. Testar Login

1. Acesse: `https://seu-site.netlify.app/auth/signin`
2. Digite email e senha
3. Deve redirecionar para `/dashboard` e **não** voltar para login

---

## 🐛 Troubleshooting

### Ainda volta para o login?

**Verifique no console do navegador** (F12):

1. **Cookies**:
   - Vá em: Application → Cookies
   - Deve ter: `timesheet_session` com um valor

2. **Network**:
   - Vá em: Network
   - Faça login
   - Veja se `/api/auth/signin` retorna `200 OK`

3. **Console**:
   - Veja se há erros em vermelho

### Erro: "Missing SUPABASE_SERVICE_ROLE_KEY"

- Verifique se você copiou a **service_role** key (não a anon key!)
- Ela começa com `eyJhbGci...` e é MUITO longa

### Erro: "JWT_SECRET is not set"

- Gere um novo secret: `openssl rand -hex 32`
- Cole no Netlify
- Faça redeploy

### Cookie não é setado

- Verifique se o site usa **HTTPS** (Netlify sempre usa)
- Veja se não há bloqueador de cookies no navegador

---

## 📊 Checklist Final

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurado
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado ⚠️ **CRÍTICO**
- [ ] `JWT_SECRET` configurado (32+ chars)
- [ ] `CRON_SECRET` configurado
- [ ] Redeploy feito
- [ ] `/api/health` retorna "healthy"
- [ ] Login funciona sem voltar

---

## 🔒 Segurança

**NUNCA commit these secrets no código!**

Elas devem estar APENAS:
- No arquivo `.env` local (que está em `.gitignore`)
- No painel do Netlify (Environment Variables)

**Se você commitou por acidente**:
1. **REVOGUE** as keys no Supabase imediatamente
2. Gere novas keys
3. Atualize no Netlify
4. Remova do histórico Git (use `git filter-branch` ou BFG)

---

## 📞 Ainda com Problemas?

Se ainda não funcionar após seguir TODOS os passos:

1. Verifique os logs no Netlify:
   - **Deploys** → Clique no deploy → **Function logs**

2. Compartilhe os logs (SEM as keys!) para debug

---

**Última atualização**: 10/11/2025
