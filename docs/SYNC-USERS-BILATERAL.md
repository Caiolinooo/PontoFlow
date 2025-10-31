# Guia de Sincronização Bilateral de Usuários (Time‑Sheet Manager ⇄ EmployeeHub)

Este documento descreve como configurar a sincronização bilateral e como executar uma migração (cópia idêntica) da tabela `users_unified` entre os dois projetos. Não executaremos a migração agora; este guia serve como referência completa para quando for o momento.

## Visão Geral

- Sincronização “eventual consistente” entre Time‑Sheet Manager e EmployeeHub.
- Autenticação dos endpoints via HMAC SHA‑256 no header `x-sync-signature` com formato `sha256=<hex>`.
- Dois modos:
  - Incremental (eventos): upsert/disable unitários.
  - Full copy (bulk): export/import da tabela inteira.

## Variáveis de Ambiente necessárias

Definir as mesmas chaves em ambos os projetos (ambiente local e produção):

- `ADMIN_SYNC_SECRET` — segredo HMAC compartilhado entre os dois sistemas
- `EMPLOYEEHUB_SYNC_URL` — URL do endpoint receptor no EmployeeHub (para eventos vindos do Time‑Sheet)
- `TIMESHEET_SYNC_URL` — URL do endpoint receptor no Time‑Sheet (para eventos vindos do EmployeeHub)

Geração de segredo (exemplos):

```
openssl rand -hex 32
# ou
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Endpoints no Time‑Sheet Manager (já implementados)

1) Inbound (eventos unitários)
- `POST /api/admin/sync/user`
  - Header: `x-sync-signature: sha256=<hex>`
  - Body (JSON):
    ```json
    { "action": "upsert|disable", "user": { "id": "uuid", "email": "opcional", "tenant_id": "opcional" } }
    ```
  - Ação `upsert`: `users_unified` é atualizado/inserido por `id` (via service role)
  - Ação `disable`: reservado (ajustar quando definirmos a regra de desativação)

2) Bulk Export (tabela inteira)
- `POST /api/admin/sync/users/export`
  - Header: `x-sync-signature`
  - Resposta: `{ users: [...] }` com todos os registros de `users_unified`

3) Bulk Import (tabela inteira)
- `POST /api/admin/sync/users/import`
  - Header: `x-sync-signature`
  - Body: `{ users: [...] }` — array completo a ser upsertado (onConflict: id)

Observação: Todos usam `ADMIN_SYNC_SECRET` para conferir/gerar a assinatura HMAC.

## Endpoints equivalentes esperados no EmployeeHub

Replicar os mesmos 3 endpoints com a mesma semântica e autenticação HMAC. Basta utilizar o mesmo `ADMIN_SYNC_SECRET` e equivalentes de service role para upsert.

- `POST /api/admin/sync/user`
- `POST /api/admin/sync/users/export`
- `POST /api/admin/sync/users/import`

## Assinatura HMAC

- Assinatura calculada sobre o corpo bruto da requisição (string JSON sem alteração).
- Exemplo (Node):
  ```js
  const sig = createHmac('sha256', ADMIN_SYNC_SECRET).update(rawBody).digest('hex');
  // header: x-sync-signature: `sha256=${sig}`
  ```
- No receptor: comparar valor recebido com o esperado usando comparação constante (timing-safe).

## Fluxo de sincronização incremental (eventos)

- Gatilhos para enviar `upsert` ao sistema remoto (a serem plugados nos pontos que você decidir):
  - Criação de usuário
  - Edição de usuário (e.g., email, tenant_id)
  - Desativação/remoção → `disable`
- Helper no Time‑Sheet (já pronto): `web/src/lib/sync/outbound.ts` → `sendUserSyncEvent(action, user)`
  - Recomendação: registrar retries e logs em caso de falha de rede

## Fluxo de migração (cópia idêntica) — recomendado

1) Escolher a fonte da verdade (A) e o destino (B) para a primeira passagem.
2) Em (A): chamar `POST /api/admin/sync/users/export` com HMAC.
3) Em (B): chamar `POST /api/admin/sync/users/import` com o `users` exportado.
4) Opcionalmente, repetir no sentido inverso para comparar contagens/chaves (dry‑run) ou consolidar campos faltantes.
5) Após a migração inicial, ativar os eventos incrementais nos dois lados.

Boas práticas:
- Executar fora do horário crítico.
- Registrar logs de contagem (total exportado, total importado, conflitos).
- Testar previamente em ambiente de staging com chaves diferentes.

## Esquema mínimo de `users_unified` (campos relevantes para sync)

- `id` (uuid) — chave primária
- `email` (text) — opcional no evento, mas recomendado
- `tenant_id` (uuid, nullable) — manter alinhado entre sistemas quando aplicável
- Demais colunas podem existir e não precisam participar da sincronização se não forem necessárias no outro lado.

## Segurança e Resiliência

- Segredo único por par de sistemas (`ADMIN_SYNC_SECRET`).
- Considere allowlist de IPs no WAF/Firewall.
- Em produção, habilitar logs e métricas de latência/erros.
- Proteção contra replay: opcionalmente, incluir timestamp/nonce no payload e recusar mensagens fora de janela.
- Rate limit básico nos endpoints de sync.

## Testes

Check-list mínimo:
- [ ] Assinatura inválida → 403 invalid_signature
- [ ] Export com segredo correto → 200 e payload com `users`
- [ ] Import com segredo correto → 200 e `count` esperado
- [ ] Evento `upsert` com novo id → cria usuário
- [ ] Evento `upsert` com id existente → atualiza usuário
- [ ] Evento `disable` (quando especificarmos a regra) → reflete no destino
- [ ] Erros são logados (status, body) e há retry/backoff no emissor

## Operação

- Para pausar a sincronização em um dos lados, basta remover `ADMIN_SYNC_SECRET` ou mudar o segredo (o endpoint começará a responder 403 sync_disabled/invalid_signature).
- Para manutenção planejada, desligar apenas os eventos e manter os endpoints de export/import para emergências.

---

Anexos técnicos relevantes no repositório:
- Helper de saída: `web/src/lib/sync/outbound.ts`
- Endpoints de sync: `web/src/app/api/admin/sync/...`
- Rotas de seleção de tenant: `web/src/app/api/admin/me/tenant`
- Padrão de UI para tenant: `web/src/components/admin/TenantSelectorModal.tsx`

