# Setup Rápido - Notificações Automáticas (GRATUITO)

## 🚀 Setup em 3 Passos (5 minutos)

### 1️⃣ Adicionar Secrets no GitHub

1. Vá no seu repositório no GitHub
2. Clique em `Settings` (configurações)
3. No menu lateral: `Secrets and variables` → `Actions`
4. Clique em `New repository secret`
5. Adicione estes 2 secrets:

**Secret 1: APP_URL**
- Name: `APP_URL`
- Value: `https://seu-app.vercel.app` (substitua pela URL real)

**Secret 2: CRON_SECRET**
- Name: `CRON_SECRET`
- Value: Gere uma string aleatória:
  ```bash
  # Cole isso no terminal:
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Copie o resultado e cole como valor do secret.

### 2️⃣ Fazer Commit e Push

```bash
git add .
git commit -m "feat: adicionar sistema de notificações gratuito via GitHub Actions"
git push
```

### 3️⃣ Testar

1. Vá em `Actions` no GitHub
2. Clique em `Cron - Notificações e Travamento de Períodos`
3. Clique em `Run workflow` → `Run workflow`
4. Aguarde ~30 segundos
5. Veja os logs - deve aparecer "✅ Notificações enviadas com sucesso"

## ✅ Pronto!

As notificações serão enviadas automaticamente:
- **9h UTC (6h BRT)**: Lembretes de deadline para colaboradores e gerentes
- **2h UTC (23h BRT)**: Travamento automático de períodos vencidos

## 🔍 Verificar se Está Funcionando

### No GitHub:
- Vá em `Actions`
- Veja o histórico de execuções
- Logs detalhados de cada execução

### Na Aplicação:
- Faça login como gerente
- Acesse `/manager/pending`
- Você deve ver os timesheets pendentes dos colaboradores

### Emails:
- Colaboradores receberão lembretes em T-7, T-3, T-1 e T (dias antes do deadline)
- Gerentes receberão lista consolidada de pendências

## ❓ Problemas?

### "Workflow não aparece no Actions"
- Certifique-se de ter feito commit do arquivo `.github/workflows/cron-notifications.yml`
- Faça push para o GitHub

### "Erro 404 ao executar"
- Verifique se o secret `APP_URL` está correto
- Não coloque `/` no final da URL

### "Notificações não chegam"
- Verifique se os emails estão configurados no Supabase
- Teste manualmente: `/admin/settings/notifications-test`

## 📚 Documentação Completa

- **Setup detalhado**: `docs/SETUP-NOTIFICACOES-GRATUITO.md`
- **Correções aplicadas**: `docs/BUGFIX-MANAGER-PENDING-TIMESHEETS.md`

## 💰 Custo

**R$ 0,00** - Totalmente gratuito usando GitHub Actions!

