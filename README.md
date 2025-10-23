# ABZ Group Timesheet Manager (Standalone)

Timesheet management system para colaboradores embarcados com fluxo de aprovação por gerente, prazos mensais com bloqueio e notificações bi‑idioma (pt‑BR/en‑GB). Projeto standalone com arquitetura preparada para integração futura ao Employee Hub.

## Principais recursos
- i18n completo (next-intl) com rotas localizadas `/[locale]/...` (pt‑BR padrão e en‑GB)
- Persistência da preferência de idioma em `profiles.locale`
- Autenticação e dados com Supabase (PostgreSQL + Auth + Storage)
- Fluxo de aprovação individual por gerente, com anotações por campo/entrada
- Notificações por e‑mail (envio, recusa com anotações, aprovado, lembretes de prazo, pendências do gerente)
- Cron de lembretes com cadência T‑7/T‑3/T‑1/T e suporte a “sem timesheet criado” e “recusados”
- Bloqueio visual e por RLS após o prazo mensal para o colaborador; gerente pode ajustar com aviso

## Stack
- Next.js 15 (App Router, RSC) + React 19 + TypeScript + Tailwind CSS
- next-intl para i18n
- Supabase (Postgres + Auth) com RLS
- Nodemailer para e‑mails

## Estrutura (parcial)
- `web/` aplicação Next.js
  - `src/app/[locale]/manager/...` UI de gerente (pendências, revisão)
  - `src/app/[locale]/employee/...` UI de colaborador (editor)
  - `src/app/api/...` endpoints (gerente, colaborador, cron, profile)
  - `src/lib/notifications/...` dispatcher e templates de e‑mail
  - `src/lib/supabase/...` clientes SSR e service role (server‑only)
  - `messages/{pt-BR|en-GB}/common.json` traduções
- `docs/db/schema-v1_1.sql` schema do banco

## i18n
- Locales suportados: `pt-BR` (padrão) e `en-GB`
- Preferência do usuário persistida em `profiles.locale`
- Middleware redireciona `/` → `/pt-BR`

## Variáveis de ambiente (web/.env.local)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR`
- `NEXT_PUBLIC_AVAILABLE_LOCALES=pt-BR,en-GB`
- SMTP (opcionais para e‑mail): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
- Cron (server): `SUPABASE_SERVICE_ROLE_KEY` (NÃO público) e opcional `FORCE_CRON=true` para rodar fora da cadência
- Opcional: `NEXT_PUBLIC_BASE_URL` para compor links absolutos nos e‑mails

## Endpoints principais
- Gerente:
  - `GET /api/manager/pending-timesheets` → timesheets com `status='enviado'`
  - `GET /api/manager/timesheets/[id]` → detalhes + entries + annotations + approvals
  - `POST /api/manager/timesheets/[id]/approve`
  - `POST /api/manager/timesheets/[id]/reject` body: `{reason, annotations?}`
  - `POST /api/manager/timesheets/[id]/annotations` body: `{annotations}`
- Colaborador:
  - `GET /api/employee/timesheets/[id]`
  - `POST /api/employee/timesheets/[id]/entries`
  - `PATCH/DELETE /api/employee/timesheets/[id]/entries/[entryId]`
  - `POST /api/employee/timesheets/[id]/submit` → muda para `enviado` e notifica gerentes
- Perfil:
  - `POST /api/profile/locale` body: `{locale: 'pt-BR'|'en-GB'}`
- Cron:
  - `POST /api/cron/deadline-reminders` → lembretes T‑7/T‑3/T‑1/T (requer `SUPABASE_SERVICE_ROLE_KEY`)

## Fluxos de e‑mail
- timesheet_submitted → gerentes do(s) grupo(s)
- timesheet_rejected → colaborador (com motivo e anotações)
- timesheet_approved → colaborador
- deadline_reminder → colaborador (período pendente)
- manager_pending_reminder → gerente (lista consolidada)

Todos respeitam o locale do destinatário (pt‑BR/en‑GB).

## Rodando localmente
1. Configure `.env.local` em `web/`
2. Instale deps: `npm i`
3. Build: `npm run build`
4. Dev: `npm run dev`

## Observações de segurança
- NUNCA exponha `SUPABASE_SERVICE_ROLE_KEY` no cliente (`NEXT_PUBLIC_`).
- RLS no banco isola tenant e delegação de gerente por grupo. Os endpoints gerenciais dependem disso.

## Próximos passos sugeridos
- Padronizar layout corporativo de e‑mails (logo ABZ, cabeçalho/rodapé, tom formal, i18n)
- Destaque visual das anotações por campo também na tela do gerente
- Edição inline das entradas no editor do colaborador
- Migrations automatizadas com Supabase CLI



## UI/UX atualizado (Meta)
- Cabeçalhos no estilo Meta (MetaPageHeader) com breadcrumbs opcionais
- Chip de acesso rápido ao Dashboard no Header (aparece apenas fora do Dashboard)
- AdminNav com TenantSwitcher integrado
- Remoção da antiga barra fixa de Voltar/Início; navegação centralizada no Header e breadcrumbs

## Boas práticas Next.js 15
- Páginas cliente sob `app/[locale]/...` que usam `params` passaram a tratar `params` como Promise e a usar `React.use(params)`
- Layouts de páginas protegidas passam o usuário carregado no servidor (`initialUser`) ao Header para evitar flicker

## Segurança
- `.env`, `.env.*` ignorados por padrão no Git; não comitar chaves sensíveis
- Service Role do Supabase só no servidor; nunca expor `SUPABASE_SERVICE_ROLE_KEY` no cliente

## Changelog

### 1.0.1 (2025-10-23)
- feat(ui): Cabeçalhos Meta com breadcrumbs opcionais (Delegações, Funcionários, Edição de Grupo)
- feat(nav): Chip “Dashboard” no Header (estilo Meta), removendo barra antiga de Voltar/Início
- fix(header): Evita flicker ao navegar (Header recebe `initialUser` pelo servidor em Dashboard, Employee, Manager, Reports e Settings)
- fix(admin/delegations): Mensagens de erro mais claras ao abrir Grupo (exibe tenant_required, forbidden, etc.)
- chore: `.gitignore` já ignora `.env*`; sem dados sensíveis nos commits
- docs: README atualizado e adicionado LICENSE-COMMERCIAL.md

### 1.0.0
- Primeira versão pública do módulo web standalone
