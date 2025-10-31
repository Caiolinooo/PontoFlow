# Cron Jobs - PontoFlow

## Travamento Automático de Períodos

### Endpoint
`GET /api/cron/lock-periods`

### Descrição
Job executado diariamente para travar automaticamente os períodos de timesheet com base na configuração de `deadline_day` de cada tenant.

### Configuração

#### 1. Variável de Ambiente
Adicione no `.env.local` ou nas variáveis de ambiente do Vercel:

```bash
CRON_SECRET=your-secure-random-string-here
```

Para gerar um secret seguro, use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2. Vercel Cron (Produção)
O arquivo `web/vercel.json` já está configurado para executar o job diariamente às 2h da manhã (UTC):

```json
{
  "crons": [
    {
      "path": "/api/cron/lock-periods",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Nota**: Vercel Cron está disponível apenas em planos Pro e Enterprise. Para planos Hobby, use uma alternativa como GitHub Actions ou cron-job.org.

#### 3. GitHub Actions (Alternativa)
Crie o arquivo `.github/workflows/cron-lock-periods.yml`:

```yaml
name: Lock Periods Cron Job

on:
  schedule:
    # Runs daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allows manual trigger

jobs:
  lock-periods:
    runs-on: ubuntu-latest
    steps:
      - name: Call lock periods endpoint
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.vercel.app/api/cron/lock-periods
```

Adicione o `CRON_SECRET` nos secrets do repositório GitHub.

#### 4. cron-job.org (Alternativa Gratuita)
1. Acesse https://cron-job.org
2. Crie uma conta gratuita
3. Adicione um novo cron job:
   - **URL**: `https://your-domain.vercel.app/api/cron/lock-periods?secret=YOUR_CRON_SECRET`
   - **Schedule**: `0 2 * * *` (diariamente às 2h UTC)
   - **Method**: GET

### Lógica do Job

1. **Busca todos os tenants** do sistema
2. Para cada tenant:
   - Busca a configuração `deadline_day` em `tenant_settings`
   - Se não configurado, usa `0` (último dia do mês)
3. **Calcula a data de fechamento**:
   - `deadline_day = 0`: Último dia do mês atual
   - `deadline_day = 1-31`: Dia específico do mês atual
4. **Verifica se hoje passou do deadline**:
   - Se sim: Trava o período do **mês anterior**
   - Se não: Não faz nada
5. **Cria ou atualiza** o registro em `period_locks`:
   - Se não existe: Cria com `locked = true`
   - Se existe e está `locked = false`: Atualiza para `locked = true`
   - Se já está `locked = true`: Não faz nada

### Exemplo de Resposta

```json
{
  "message": "Period lock check completed",
  "timestamp": "2025-10-27T02:00:00.000Z",
  "locked": 2,
  "results": [
    {
      "tenant": "Omega",
      "status": "locked",
      "period": "2025-09-01",
      "deadline": 0
    },
    {
      "tenant": "Luz Marítima",
      "status": "already_locked",
      "period": "2025-09-01"
    },
    {
      "tenant": "ABZ Group",
      "status": "not_yet",
      "deadline": 15,
      "deadlineDate": "2025-10-15"
    }
  ]
}
```

### Status Possíveis

- **`locked`**: Período foi travado nesta execução
- **`updated`**: Período existente foi atualizado para travado
- **`already_locked`**: Período já estava travado
- **`not_yet`**: Ainda não passou do deadline
- **`error`**: Erro ao processar o tenant

### Teste Manual

Para testar o job manualmente:

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/lock-periods
```

Ou acesse diretamente no navegador:
```
http://localhost:3000/api/cron/lock-periods?secret=YOUR_CRON_SECRET
```

### Configuração do Deadline Day

Os administradores podem configurar o dia de fechamento em:
**Admin → Configurações → Configurações da Empresa → Dia de Fechamento do Mês**

Opções:
- **0** (padrão): Último dia do mês
- **1-31**: Dia específico do mês

### Monitoramento

Para monitorar a execução do cron job:

1. **Vercel Logs**: Acesse o dashboard do Vercel → Logs
2. **GitHub Actions**: Acesse Actions → Lock Periods Cron Job
3. **cron-job.org**: Acesse o dashboard e veja o histórico de execuções

### Troubleshooting

#### Job não está executando
- Verifique se o `CRON_SECRET` está configurado
- Verifique se o schedule está correto (formato cron)
- Verifique os logs do Vercel/GitHub Actions

#### Períodos não estão sendo travados
- Verifique se o `deadline_day` está configurado corretamente
- Verifique se a data atual está após o deadline
- Verifique os logs da API para erros

#### Erro 401 Unauthorized
- Verifique se o `CRON_SECRET` está correto
- Verifique se está passando o secret no header ou query param

### Segurança

⚠️ **IMPORTANTE**: 
- Nunca commite o `CRON_SECRET` no código
- Use variáveis de ambiente
- Gere um secret forte e aleatório
- Rotacione o secret periodicamente

### Próximos Passos

Futuros cron jobs que podem ser adicionados:
- Envio de lembretes de timesheet pendente
- Limpeza de notificações antigas
- Backup automático de dados
- Relatórios mensais automáticos

