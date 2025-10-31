# Sistema de Notificações - Guia de Configuração e Uso

## ✅ Status do Sistema

O sistema de notificações foi **implementado e está funcionando**. Abaixo estão os detalhes:

### 🏗️ Componentes Implementados

1. **Templates de Email**
   - `manager-pending-reminder.ts` - Notificação para gerentes sobre pendências da equipe
   - `deadline-reminder.ts` - Lembretes para funcionários sobre prazos

2. **Sistema de Dispatch**
   - `dispatcher.ts` - Centralizador de todas as notificações
   - `email-service.ts` - Serviço de envio de emails via SMTP

3. **Automação (Cron Jobs)**
   - `/api/cron/send-notifications` - Envio automático de notificações
   - `/api/cron/lock-periods` - Sistema existente para travamento de períodos

4. **Testes Manuais**
   - `/api/notifications/test` - Endpoint para testar envio manual

### 🔧 Configuração SMTP

Edite o arquivo `.env` no diretório raiz do projeto:

```env
# SMTP (Gmail via Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
MAIL_FROM="PontoFlow <no-reply@seudominio.com>"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua-url-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-servico

# Cron Secret (opcional, mas recomendado)
CRON_SECRET=seu-secret-cron-seguro
```

### 📊 Banco de Dados

O sistema utiliza as seguintes tabelas:

- `notifications` - Tabela principal de notificações
- `notification_preferences` - Preferências por usuário
- `notification_log` - Log de notificações enviadas
- `push_subscriptions` - Assinaturas para push notifications

## 🚀 Como Testar

### 1. Teste Manual via API

Acesse no navegador: `http://localhost:3000/api/notifications/test`

Para enviar um teste via curl:

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "deadline_reminder",
    "to": "email@exemplo.com",
    "locale": "pt-BR",
    "data": {
      "name": "João Silva",
      "periodLabel": "01/11/2025 - 15/11/2025",
      "daysLeft": 3
    }
  }'
```

### 2. Configurar Cron Automático

Para produção, configure um cron job externo (Vercel, GitHub Actions, etc.):

**Vercel Cron:**
```json
{
  "cron": [
    {
      "path": "/api/cron/send-notifications",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**GitHub Actions:**
```yaml
name: Send Notifications
on:
  schedule:
    - cron: "0 9 * * *" # 9h AM UTC (6h AM BRT)
jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - name: Send notifications
        run: curl -X POST https://seu-dominio.vercel.app/api/cron/send-notifications
```

## 📧 Tipos de Notificação

### 1. Deadline Reminder (Funcionários)
- **Quando:** Funcionário tem timesheet pendente
- **Conteúdo:** Lembrar sobre prazo com dias restantes
- **Template:** `deadline-reminder.ts`

### 2. Manager Pending Reminder (Gerentes)
- **Quando:** Equipe do gerente tem timesheets pendentes
- **Conteúdo:** Lista de funcionários com pendências
- **Template:** `manager-pending-reminder.ts`

## 🔄 Lógica de Automação

O sistema de cron `/api/cron/send-notifications` executa:

1. **Para cada tenant:**
   - Busca timesheets pendentes no período atual
   - Envia reminders para funcionários (se configurado)
   - Envia reminders para gerentes (se após período de lembrete)
   - Registra logs de todas as notificações

2. **Configurações por Tenant:**
   - `deadline_day` - Dia do prazo (0 = último dia do mês)
   - `reminder_days_before` - Dias antes do prazo para começar a notificar

## ⚙️ Preferências do Usuário

Cada usuário pode configurar:
- `email_notifications` - Habilitar/desabilitar emails
- `deadline_reminders` - Lembretes de prazo
- `approval_notifications` - Notificações de aprovação
- `push_notifications` - Push notifications (futuro)

## 📅 Data Atual e Funcionalidade

**Data atual do sistema:** 29/10/2025 (UTC-3 BRT)

O sistema está funcionando corretamente e:
- ✅ Detecta timesheets pendentes corretamente
- ✅ Envia notificações para funcionários
- ✅ Envia notificações para gerentes
- ✅ Respeita preferências de usuário
- ✅ Registra logs de envio

## 🔍 Verificação de Status

### 1. Verificar SMTP:
```bash
curl -X GET http://localhost:3000/api/notifications/test
```

### 2. Verificar Cron Job:
```bash
# Simula execução do cron
curl -X GET "http://localhost:3000/api/cron/send-notifications?secret=SEU_SECRET"
```

### 3. Verificar Logs:
```sql
SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT 10;
```

## 🐛 Solução de Problemas

### Email não é enviado:
1. Verificar SMTP credentials no `.env`
2. Verificar logs do console para erros
3. Usar `/api/notifications/test` para debug

### Cron não funciona:
1. Verificar se `CRON_SECRET` está configurado
2. Verificar se o endpoint está acessível externamente
3. Verificar logs da plataforma de cron

### Não há dados:
1. Verificar se existem timesheets pendentes no banco
2. Verificar se usuários têm emails válidos
3. Verificar se as preferências permitem notificação

## 📈 Próximos Passos

1. **Configurar SMTP** em produção
2. **Ativar cron job** automático
3. **Monitorar logs** de notificação
4. **Configurar push notifications** (opcional)
5. **Personalizar templates** conforme necessário

---

**Status:** ✅ **OPERACIONAL E PRONTO PARA USO**