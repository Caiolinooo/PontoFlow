# Setup de Notificações - 100% GRATUITO

Este guia mostra como configurar o sistema de notificações automáticas **sem pagar nada**.

## ⚠️ IMPORTANTE: Não use Vercel Cron (é pago!)

O Vercel Cron requer plano Pro ($20/mês). **NÃO USE!**

## ✅ Opções 100% Gratuitas

### Opção 1: GitHub Actions (RECOMENDADO) ⭐

**Vantagens:**
- ✅ Totalmente gratuito
- ✅ Já está no repositório
- ✅ Fácil de configurar
- ✅ Logs integrados
- ✅ Execução confiável

**Limitações:**
- Executa no máximo a cada 5 minutos (mas nosso caso é diário, então OK)
- Pode ter atraso de até 10 minutos em horários de pico

#### Setup GitHub Actions

1. **Adicionar secrets no GitHub:**
   - Vá em: `Settings` → `Secrets and variables` → `Actions`
   - Clique em `New repository secret`
   - Adicione:
     - `APP_URL`: URL da sua aplicação (ex: `https://seu-app.vercel.app`)
     - `CRON_SECRET`: Uma string aleatória segura (opcional, para lock-periods)

2. **Gerar CRON_SECRET (se necessário):**
```bash
# No terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. **Ativar GitHub Actions:**
   - O arquivo `.github/workflows/cron-notifications.yml` já está criado
   - Faça commit e push
   - Vá em `Actions` no GitHub e verifique se o workflow aparece

4. **Testar manualmente:**
   - Vá em `Actions` → `Cron - Notificações e Travamento de Períodos`
   - Clique em `Run workflow` → `Run workflow`
   - Aguarde e veja os logs

**Pronto! As notificações serão enviadas automaticamente todos os dias às 9h UTC (6h BRT).**

---

### Opção 2: cron-job.org (Alternativa)

**Vantagens:**
- ✅ Totalmente gratuito
- ✅ Interface web simples
- ✅ Execução precisa

**Desvantagens:**
- ❌ Precisa criar conta em serviço externo
- ❌ Menos integrado com o projeto

#### Setup cron-job.org

1. **Criar conta:**
   - Acesse: https://cron-job.org
   - Crie uma conta gratuita

2. **Criar job de notificações:**
   - Clique em `Create cronjob`
   - **Title:** `Notificações de Deadline`
   - **URL:** `https://seu-app.vercel.app/api/cron/deadline-reminders`
   - **Schedule:** `0 9 * * *` (diariamente às 9h UTC)
   - **Request method:** `POST`
   - Salve

3. **Criar job de travamento de períodos:**
   - Clique em `Create cronjob`
   - **Title:** `Travar Períodos`
   - **URL:** `https://seu-app.vercel.app/api/cron/lock-periods`
   - **Schedule:** `0 2 * * *` (diariamente às 2h UTC)
   - **Request method:** `GET`
   - **Headers:** Adicione `Authorization: Bearer SEU_CRON_SECRET`
   - Salve

---

### Opção 3: EasyCron (Alternativa)

Similar ao cron-job.org, também gratuito:
- https://www.easycron.com
- Plano gratuito: até 100 execuções/mês (mais que suficiente)

---

### Opção 4: Supabase Edge Functions + pg_cron (Avançado)

Se você quiser algo totalmente integrado ao Supabase:

1. **Habilitar pg_cron no Supabase:**
```sql
-- No SQL Editor do Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar notificações diárias
SELECT cron.schedule(
  'send-deadline-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://seu-app.vercel.app/api/cron/deadline-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);

-- Agendar travamento de períodos
SELECT cron.schedule(
  'lock-periods',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://seu-app.vercel.app/api/cron/lock-periods',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

**Nota:** pg_cron está disponível apenas em planos pagos do Supabase. Use GitHub Actions se estiver no plano gratuito.

---

## 🔧 Endpoints Disponíveis

### 1. Notificações de Deadline
```bash
POST /api/cron/deadline-reminders
```

**O que faz:**
- Envia lembretes para colaboradores com timesheets pendentes
- Envia lista consolidada para gerentes
- Executa apenas em T-7, T-3, T-1 e T (dias antes do deadline)

**Resposta:**
```json
{
  "ok": true,
  "daysLeft": 3,
  "sentEmployees": 15,
  "sentManagers": 3
}
```

### 2. Travamento de Períodos
```bash
GET /api/cron/lock-periods
Authorization: Bearer SEU_CRON_SECRET
```

**O que faz:**
- Trava automaticamente períodos vencidos
- Baseado no `deadline_day` de cada tenant

**Resposta:**
```json
{
  "ok": true,
  "locked": 2,
  "tenants": ["tenant-1", "tenant-2"]
}
```

---

## 🧪 Testando Localmente

### Testar notificações:
```bash
# Forçar execução (ignora cadência de dias)
FORCE_CRON=true npm run dev

# Em outro terminal
curl -X POST http://localhost:3000/api/cron/deadline-reminders
```

### Testar travamento:
```bash
curl -X GET http://localhost:3000/api/cron/lock-periods \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

---

## 📊 Monitoramento

### GitHub Actions
- Vá em `Actions` no GitHub
- Veja histórico de execuções
- Logs detalhados de cada execução

### cron-job.org
- Dashboard mostra histórico
- Notificações por email em caso de falha

### Logs da Aplicação
Os endpoints de cron retornam informações úteis:
```json
{
  "ok": true,
  "daysLeft": 3,
  "sentEmployees": 15,
  "sentManagers": 3
}
```

---

## ❓ FAQ

### Posso usar múltiplas opções ao mesmo tempo?
Sim, mas não é recomendado. Escolha uma para evitar notificações duplicadas.

### E se eu esquecer de configurar?
As notificações simplesmente não serão enviadas. O sistema continuará funcionando normalmente, mas sem lembretes automáticos.

### Posso mudar o horário das notificações?
Sim! Edite o schedule no arquivo `.github/workflows/cron-notifications.yml`:
```yaml
schedule:
  - cron: '0 12 * * *'  # 12h UTC = 9h BRT
```

### Como desabilitar temporariamente?
**GitHub Actions:**
- Vá em `Actions` → `Cron - Notificações` → `...` → `Disable workflow`

**cron-job.org:**
- Desative o job no dashboard

### Quanto custa?
**NADA! Todas as opções são 100% gratuitas.**

---

## 🎯 Recomendação Final

**Use GitHub Actions** - é a opção mais simples, confiável e já está integrada ao projeto.

1. Adicione os secrets no GitHub
2. Faça commit e push
3. Pronto! Está funcionando.

Não precisa pagar nada, não precisa criar conta em serviço externo, não precisa configurar nada complexo.

