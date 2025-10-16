# ADR 0001 — Integração ao Employee Hub (módulo Next)

Status: Aceito
Data: 2025-10-15

## Contexto
O solicitante confirmou que o Timesheet Manager deve iniciar integrado ao Employee Hub. O Hub utiliza Next.js 15 + TypeScript + Tailwind + Supabase (Auth/DB), e-mail via Gmail (Nodemailer apiabz) e web-push. O produto precisa ser multi-tenant (clientes/ambientes), com delegação de grupos por gerente e exportação compatível com o gerador de invoice.

Alternativas consideradas:
- A) Standalone agora, integrar depois
- B) Integrado desde o início (módulo Next no Hub)

## Decisão
Adotar B) Integrado desde o início, como módulo Next.js dentro do Employee Hub, compartilhando Auth/DB/tema. Manter contratos (DTOs, serviços) desacoplados para permitir execução isolada no futuro via feature flag, se necessário.

## Consequências
- Prós: UX consistente; reutilização de auth/DB; menor atrito de integração; menor duplicação de infra.
- Contras: Acoplamento ao release do Hub; pipelines compartilhados; necessidade de seguir padrões do painel.

## Itens de implementação
- UI/Next: criar rotas/páginas do módulo “Timesheet” com layout do Hub.
- Supabase: schema v1.1 multi-tenant e RLS por tenant/grupos; migrações versionadas.
- Notificações: usar Gmail/Nodemailer (apiabz); in-app via realtime; web-push opcional.
- Export/Import: contrato v1 com `tenant_id`/ambiente alinhado ao gerador de invoice.
- Observabilidade: logs/auditoria por tenant.

## Riscos e mitigação
- Risco: políticas RLS complexas. Mitigar: começar com políticas simples e testes unitários/SQL.
- Risco: impacto no Hub. Mitigar: PRs pequenos, feature flags e toggles de menu.

