# 📅 Guia Completo: Configuração de CRON para Notificações

## O que é CRON?

CRON é um agendador de tarefas que roda comandos automaticamente em horários específicos.
É como um "despertador" que chama seu endpoint de notificações todos os dias.

---

## 🔐 Passo 1: Configurar CRON_SECRET

### 1.1 Gerar uma senha segura

```bash
# Opção 1: Usando openssl (Linux/Mac)
openssl rand -hex 32

# Opção 2: Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opção 3: Online (use com cuidado!)
# https://www.random.org/strings/
```

Isso gera algo como: `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`

### 1.2 Adicionar ao arquivo .env

```bash
cd /home/user/PontoFlow/web

# Se não existe, crie baseado no exemplo:
cp ../.env.example .env

# Edite o arquivo (use nano, vim ou seu editor preferido):
nano .env
```

**Adicione estas linhas:**

```bash
# Cron Jobs Security (OBRIGATÓRIO!)
CRON_SECRET=cole-aqui-a-string-gerada-acima

# URL base da aplicação
NEXT_PUBLIC_BASE_URL=https://seu-dominio.com  # Em produção
# OU
NEXT_PUBLIC_BASE_URL=http://localhost:3000    # Em desenvolvimento
```

**Salve o arquivo:**
- No nano: `Ctrl+O`, `Enter`, `Ctrl+X`
- No vim: `Esc`, `:wq`, `Enter`

---

## ⚙️ Passo 2: Escolher ONDE rodar o CRON

### Opção A: Vercel (Recomendado se usar Vercel) ⭐

**Vantagens**: Automático, não precisa configurar servidor

**Como funciona**: O Vercel roda automaticamente baseado no arquivo `vercel.json`

**Já configurado!** O arquivo `web/vercel.json` já foi criado com:
- `deadline-reminders`: Todo dia às 9h
- `lock-periods`: Primeiro dia do mês à meia-noite

**O que fazer:**
1. Faça commit e push do `vercel.json`
2. Configure o `CRON_SECRET` nas variáveis de ambiente do Vercel:
   - Acesse: https://vercel.com/seu-projeto/settings/environment-variables
   - Adicione: `CRON_SECRET` com o valor gerado

**IMPORTANTE**: No Vercel, você precisa passar o secret através de **headers do próprio Vercel**.
Atualize o código do cron para aceitar o header `x-vercel-signature` também:

```typescript
// Adicionar em deadline-reminders/route.ts
function validateCronAuth(request: NextRequest): boolean {
  // Vercel envia automaticamente este header
  const vercelSignature = request.headers.get('x-vercel-signature');
  if (vercelSignature) {
    return true; // Vercel valida automaticamente
  }

  // Resto do código de validação...
}
```

---

### Opção B: Servidor Linux/Mac Tradicional

**Vantagens**: Controle total, funciona em qualquer servidor

**Como configurar:**

```bash
# 1. Abra o editor de cron (vai abrir um arquivo de texto)
crontab -e

# 2. Se perguntar qual editor, escolha nano (mais fácil) digitando: 1

# 3. Adicione esta linha no final do arquivo:
0 9 * * * curl -X POST https://seu-dominio.com/api/cron/deadline-reminders -H "Authorization: Bearer SEU_CRON_SECRET_AQUI" -H "Content-Type: application/json" >> /var/log/cron-deadline.log 2>&1

# 4. Salve e feche:
# - No nano: Ctrl+O, Enter, Ctrl+X
# - No vim: Esc, :wq, Enter
```

**Sintaxe do CRON**: `minuto hora dia mês dia-da-semana comando`

```
 ┌─────────── minuto (0-59)
 │ ┌───────── hora (0-23)
 │ │ ┌─────── dia do mês (1-31)
 │ │ │ ┌───── mês (1-12)
 │ │ │ │ ┌─── dia da semana (0-7, 0=domingo, 7=domingo também)
 │ │ │ │ │
 * * * * * comando-a-executar
```

**Exemplos práticos:**

```bash
# Todo dia às 9h
0 9 * * * curl ...

# A cada 6 horas (00h, 06h, 12h, 18h)
0 */6 * * * curl ...

# Às 9h e às 18h
0 9,18 * * * curl ...

# Só em dias de semana (segunda a sexta) às 8h
0 8 * * 1-5 curl ...

# Todo dia 1º do mês às 00h (para lock-periods)
0 0 1 * * curl -X POST https://seu-dominio.com/api/cron/lock-periods ...
```

**Verificar se está ativo:**

```bash
# Ver todas as tarefas agendadas
crontab -l

# Ver logs (se configurou com >> /var/log/...)
tail -f /var/log/cron-deadline.log
```

---

### Opção C: GitHub Actions (Grátis!)

**Vantagens**: Gratuito, fácil de configurar, funciona com qualquer hospedagem

**Como configurar:**

Crie o arquivo `.github/workflows/cron-notifications.yml`:

```yaml
name: Cron - Deadline Reminders

on:
  schedule:
    # Roda todo dia às 9h UTC (ajuste conforme seu timezone)
    - cron: '0 9 * * *'
  workflow_dispatch: # Permite rodar manualmente

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Send deadline reminders
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/deadline-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

**Configurar secrets no GitHub:**
1. Vá em: Settings > Secrets and variables > Actions
2. Adicione:
   - `APP_URL`: `https://seu-dominio.com`
   - `CRON_SECRET`: o secret que você gerou

---

### Opção D: Railway, Render, Heroku

Estas plataformas geralmente usam **addons** ou **cron jobs nativos**.

**Railway:**
```bash
# No railway.toml
[deploy.cron]
  [[deploy.cron.jobs]]
    schedule = "0 9 * * *"
    command = "curl -X POST $APP_URL/api/cron/deadline-reminders -H 'Authorization: Bearer $CRON_SECRET'"
```

**Render:**
- Crie um "Cron Job" no dashboard
- Configure: `0 9 * * *`
- Comando: `curl -X POST https://seu-app.onrender.com/api/cron/deadline-reminders ...`

---

## 🧪 Passo 3: Testar o CRON

### 3.1 Teste Manual (IMPORTANTE fazer primeiro!)

```bash
# Em desenvolvimento (servidor rodando em localhost:3000)
curl -X POST http://localhost:3000/api/cron/deadline-reminders \
  -H "Authorization: Bearer $(grep CRON_SECRET web/.env | cut -d '=' -f2)" \
  -H "Content-Type: application/json" \
  -H "FORCE_CRON: true"

# Em produção
curl -X POST https://seu-dominio.com/api/cron/deadline-reminders \
  -H "Authorization: Bearer SEU_CRON_SECRET_AQUI" \
  -H "Content-Type: application/json"
```

**Forçar execução (ignora o filtro de T-7, T-5, etc):**

```bash
# Adicione a variável de ambiente antes:
FORCE_CRON=true npm run dev

# Depois teste:
curl -X POST http://localhost:3000/api/cron/deadline-reminders \
  -H "Authorization: Bearer SEU_SECRET"
```

### 3.2 Verificar resposta

**Sucesso** (200 OK):
```json
{
  "ok": true,
  "totalSentEmployees": 5,
  "totalSentManagers": 2,
  "tenantResults": {
    "tenant-uuid-123": {
      "ok": true,
      "sentEmployees": 5,
      "sentManagers": 2,
      "daysLeft": 4
    }
  }
}
```

**Erro comum** (401 Unauthorized):
```json
{"ok": false, "error": "unauthorized"}
```
→ Verifique se o `CRON_SECRET` está correto!

**Pulado** (período não está na janela):
```json
{
  "ok": true,
  "tenantResults": {
    "tenant-uuid-123": {
      "skipped": true,
      "daysLeft": 8
    }
  }
}
```
→ Normal! Só envia nos dias T-7, T-5, T-3, T-2, T-1, T-0

---

## 📊 Passo 4: Monitorar

### Logs no servidor

```bash
# Ver logs do Next.js (se estiver rodando com PM2)
pm2 logs

# Ver logs do cron (se configurou com >>)
tail -f /var/log/cron-deadline.log
```

### No código

Os logs aparecem no console do servidor quando o cron roda:

```
[CRON] Starting deadline reminders job
[CRON] Processing tenant ABZ Group (uuid) - timezone: America/Sao_Paulo, deadline_day: 15
[CRON] Tenant ABZ Group: Period 2025-10-15 to 2025-11-14, 4 days until deadline
[CRON] Tenant ABZ Group: 5 pending employees (2 draft, 1 rejected, 2 missing)
[CRON] Tenant ABZ Group: Sent 5 employee reminders
[CRON] Tenant ABZ Group: Sent 2 manager reminders
[CRON] Deadline reminders complete: 5 employees, 2 managers
```

---

## ⚠️ Problemas Comuns

### 1. "unauthorized" (401)
❌ Problema: CRON_SECRET incorreto ou não configurado

✅ Solução:
```bash
# Verifique se está configurado
grep CRON_SECRET web/.env

# Se vazio, gere um novo:
echo "CRON_SECRET=$(openssl rand -hex 32)" >> web/.env
```

### 2. "service_key_missing" (500)
❌ Problema: SUPABASE_SERVICE_ROLE_KEY não configurado

✅ Solução:
```bash
# Adicione no .env
SUPABASE_SERVICE_ROLE_KEY=seu-service-role-key-do-supabase
```

### 3. Nenhuma notificação enviada
❌ Problema: Não há employees pendentes ou não está na janela de tempo

✅ Solução:
```bash
# Force a execução para testar:
FORCE_CRON=true curl ...

# Verifique se há pendências no banco de dados
```

### 4. Cron não roda automaticamente
❌ Problema: Cron não foi configurado ou está com sintaxe errada

✅ Solução:
```bash
# Verifique se o cron está ativo
crontab -l

# Veja logs do sistema
grep CRON /var/log/syslog  # Ubuntu/Debian
grep CRON /var/log/messages  # CentOS/RedHat
```

---

## 📝 Checklist de Configuração

- [ ] CRON_SECRET gerado e adicionado ao `.env`
- [ ] NEXT_PUBLIC_BASE_URL configurado
- [ ] SUPABASE_SERVICE_ROLE_KEY configurado
- [ ] Escolhida a plataforma de CRON (Vercel/GitHub/Server)
- [ ] CRON configurado e ativo
- [ ] Teste manual executado com sucesso
- [ ] Logs verificados (sem erros)
- [ ] Aguardar 24h para ver cron automático funcionando

---

## 🚀 Comandos Rápidos

```bash
# 1. Gerar CRON_SECRET
openssl rand -hex 32

# 2. Adicionar ao .env
echo "CRON_SECRET=$(openssl rand -hex 32)" >> web/.env

# 3. Testar localmente
curl -X POST http://localhost:3000/api/cron/deadline-reminders \
  -H "Authorization: Bearer $(grep CRON_SECRET web/.env | cut -d '=' -f2)"

# 4. Ver logs
tail -f web/.next/server/app/api/cron/deadline-reminders/route.log

# 5. Configurar cron tradicional (servidor Linux)
crontab -e
# Adicionar: 0 9 * * * curl -X POST https://seu-dominio.com/api/cron/deadline-reminders -H "Authorization: Bearer SEU_SECRET"
```

---

## 📚 Recursos Adicionais

- [Crontab Guru](https://crontab.guru/) - Ferramenta para criar expressões cron
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) - Documentação oficial
- [GitHub Actions Schedule](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

---

**Precisa de ajuda?** Verifique os logs e consulte a seção de "Problemas Comuns" acima.
