# 📅 Guia de Configuração CRON - Netlify

## 🎯 3 Passos Simples para Configurar no Netlify

---

## Passo 1: Gerar CRON_SECRET 🔐

```bash
# Gera uma senha aleatória segura
openssl rand -hex 32
```

Copie o resultado (vai ser algo como: `a1b2c3d4e5f6789...`)

---

## Passo 2: Configurar no Netlify 🌐

### 2.1 - No Painel do Netlify

1. Acesse: https://app.netlify.com/
2. Entre no seu site
3. Vá em: **Site settings** → **Environment variables**
4. Clique em **Add a variable**
5. Adicione:
   - **Key**: `CRON_SECRET`
   - **Value**: (cole a senha que você gerou no Passo 1)
   - **Scopes**: Production, Deploy Previews, Branch deploys
6. Clique em **Save**

### 2.2 - No arquivo .env local (para desenvolvimento)

```bash
cd /home/user/PontoFlow/web

# Crie ou edite o arquivo .env
nano .env

# Adicione:
CRON_SECRET=cole-aqui-a-mesma-senha
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Salve: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Passo 3: Instalar Dependência e Deploy 🚀

```bash
cd /home/user/PontoFlow/web

# Instala o pacote do Netlify Functions
npm install @netlify/functions

# Commit as mudanças
git add .
git commit -m "feat: add Netlify scheduled functions for cron jobs"
git push

# O Netlify vai fazer deploy automaticamente!
```

---

## ✅ Como Funciona

Após o deploy, o Netlify vai:

1. **Deadline Reminders**: Rodar **todo dia às 9h UTC** (6h BRT)
2. **Lock Periods**: Rodar **dia 1 de cada mês à meia-noite UTC**

---

## 🧪 Como Testar

### Teste Manual (antes do deploy automático)

```bash
# 1. Inicie o servidor local
cd /home/user/PontoFlow/web
npm run dev

# 2. Em outro terminal, teste:
curl -X POST http://localhost:3000/api/cron/deadline-reminders \
  -H "Authorization: Bearer SEU_CRON_SECRET_AQUI" \
  -H "Content-Type: application/json"
```

**Resultado esperado:**
```json
{
  "ok": true,
  "totalSentEmployees": 5,
  "totalSentManagers": 2,
  "tenantResults": {
    "tenant-uuid": {
      "ok": true,
      "sentEmployees": 5,
      "sentManagers": 2,
      "daysLeft": 4
    }
  }
}
```

### Verificar no Netlify (após deploy)

1. Vá em: **Functions** no menu do Netlify
2. Você vai ver:
   - `cron-deadline-reminders`
   - `cron-lock-periods`
3. Clique em uma delas para ver os logs

---

## 🔧 Alterar Horários

Edite os arquivos em `web/netlify/functions/`:

### Sintaxe Cron

```
 ┌─────────── minuto (0-59)
 │ ┌───────── hora (0-23, em UTC!)
 │ │ ┌─────── dia do mês (1-31)
 │ │ │ ┌───── mês (1-12)
 │ │ │ │ ┌─── dia da semana (0-7, 0=domingo)
 │ │ │ │ │
 * * * * * comando
```

**Exemplos:**

```typescript
// Todo dia às 9h UTC (6h BRT)
schedule('0 9 * * *', async () => { ... })

// A cada 6 horas
schedule('0 */6 * * *', async () => { ... })

// Às 9h e 18h UTC
schedule('0 9,18 * * *', async () => { ... })

// Só em dias de semana às 8h UTC
schedule('0 8 * * 1-5', async () => { ... })

// Todo dia 1º às 00h UTC
schedule('0 0 1 * *', async () => { ... })
```

**⚠️ IMPORTANTE**: Horários no Netlify são sempre em **UTC**!

**Conversão UTC → BRT (Brasil)**:
- UTC 09:00 = BRT 06:00 (UTC -3)
- UTC 12:00 = BRT 09:00
- UTC 15:00 = BRT 12:00

---

## 📊 Estrutura de Arquivos

```
web/
├── netlify/
│   └── functions/
│       ├── cron-deadline-reminders.ts  ← Todo dia 9h UTC
│       └── cron-lock-periods.ts        ← Dia 1 do mês 00h UTC
├── src/
│   └── app/
│       └── api/
│           └── cron/
│               ├── deadline-reminders/route.ts  ← Lógica real
│               └── lock-periods/route.ts        ← Lógica real
└── .env  ← CRON_SECRET aqui
```

---

## ⚠️ Problemas Comuns

### 1. "CRON_SECRET not configured"
❌ Problema: Variável não configurada no Netlify

✅ Solução:
1. Vá em Site Settings → Environment Variables
2. Adicione `CRON_SECRET` com o valor correto
3. Faça redeploy: **Deploys** → **Trigger deploy** → **Deploy site**

### 2. "unauthorized" (401)
❌ Problema: CRON_SECRET no Netlify diferente do esperado

✅ Solução:
- Verifique se o valor no Netlify é exatamente igual ao que você configurou
- Sem espaços extras ou caracteres especiais

### 3. Função não aparece no painel
❌ Problema: `@netlify/functions` não instalado ou deploy falhou

✅ Solução:
```bash
npm install @netlify/functions
git add package.json package-lock.json
git commit -m "fix: add @netlify/functions dependency"
git push
```

### 4. Horário errado
❌ Problema: Esqueceu que Netlify usa UTC

✅ Solução:
- Para 9h BRT → use `schedule('0 12 * * *')` (12h UTC)
- Para 6h BRT → use `schedule('0 9 * * *')` (9h UTC)

---

## 📱 Opção Alternativa: Serviço Externo

Se as Scheduled Functions do Netlify não funcionarem (plano gratuito pode ter limitações), use um serviço externo:

### cron-job.org (Gratuito) ⭐

1. Acesse: https://cron-job.org/
2. Crie uma conta
3. Crie um novo Cron Job:
   - **URL**: `https://seu-site.netlify.app/api/cron/deadline-reminders`
   - **Schedule**: `0 9 * * *` (todo dia 9h)
   - **Headers**:
     - `Authorization: Bearer SEU_CRON_SECRET`
     - `Content-Type: application/json`
4. Salve

### EasyCron (Gratuito até 2 jobs)

1. Acesse: https://www.easycron.com/
2. Crie uma conta
3. Add New Cron Job:
   - **URL**: `https://seu-site.netlify.app/api/cron/deadline-reminders`
   - **Cron Expression**: `0 9 * * *`
   - **Method**: POST
   - **Headers**: `Authorization: Bearer SEU_CRON_SECRET`

### GitHub Actions (Gratuito)

Crie `.github/workflows/cron-notifications.yml`:

```yaml
name: Cron - Deadline Reminders

on:
  schedule:
    - cron: '0 9 * * *'  # 9h UTC todo dia
  workflow_dispatch:

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Send deadline reminders
        run: |
          curl -X POST https://seu-site.netlify.app/api/cron/deadline-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Configure o secret `CRON_SECRET` no GitHub: Settings → Secrets → Actions

---

## 📝 Checklist Final

- [ ] CRON_SECRET gerado
- [ ] CRON_SECRET configurado no Netlify (Environment Variables)
- [ ] `@netlify/functions` instalado (`npm install`)
- [ ] Arquivos em `netlify/functions/` criados
- [ ] Commit e push feitos
- [ ] Deploy concluído no Netlify
- [ ] Funções aparecem no painel do Netlify (aba Functions)
- [ ] Teste manual funcionou
- [ ] Aguardar 24h para cron automático funcionar

---

## 🎓 Links Úteis

- [Netlify Scheduled Functions](https://docs.netlify.com/functions/scheduled-functions/)
- [Crontab Guru](https://crontab.guru/) - Testar expressões cron
- [World Time Buddy](https://www.worldtimebuddy.com/) - Converter UTC ↔ BRT

---

**Precisa de ajuda?** Verifique os logs no painel do Netlify: **Functions** → clique na função → **Function log**
